"use server";

import { revalidatePath, updateTag } from "next/cache";
import bcrypt from "bcryptjs";
import { CACHE_TAGS } from "@/lib/cache";
import { requirePermission } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit";
import { prisma } from "@/lib/db";
import { canManageAnnualAccountFee } from "@/lib/permissions";
import {
  ANNUAL_FEE_SETTING_KEYS,
  getSystemSettings,
  hideAnnualFeeSettings,
  updateSystemSettings,
} from "@/lib/services/settings";
import { settingsFormSchema, type SettingsFormValues } from "@/lib/validations/settings";
import { changePasswordSchema, type ChangePasswordValues } from "@/lib/validations/user";
import type { ActionResult } from "@/app/customers/actions";

export async function getSettingsForForm(): Promise<SettingsFormValues> {
  const session = await requirePermission("settings.view");
  const settings = await getSystemSettings();
  return canManageAnnualAccountFee(session.user.role) ? settings : hideAnnualFeeSettings(settings);
}

export async function updateSettings(input: SettingsFormValues): Promise<ActionResult> {
  try {
    const session = await requirePermission("settings.edit");
    const parsed = settingsFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data: Partial<SettingsFormValues> = { ...parsed.data };
    if (!canManageAnnualAccountFee(session.user.role)) {
      for (const key of ANNUAL_FEE_SETTING_KEYS) {
        delete data[key];
      }
    }

    await updateSystemSettings(data);

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "SystemSetting",
      entityId: "global",
      details: { keys: Object.keys(data) },
    });

    revalidatePath("/settings");
    updateTag(CACHE_TAGS.settings);
    updateTag(CACHE_TAGS.dashboard);
    updateTag(CACHE_TAGS.profitability);
    return { success: true, message: "Settings saved successfully" };
  } catch (error) {
    console.error("updateSettings:", error);
    return { success: false, error: "Failed to save settings" };
  }
}

export async function changeOwnPassword(input: ChangePasswordValues): Promise<ActionResult> {
  try {
    const session = await requirePermission("settings.view");
    const parsed = changePasswordSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const user = await prisma.user.findFirst({
      where: { id: session.user.id, deletedAt: null },
      select: { id: true, email: true, password: true, status: true },
    });
    if (!user || user.status !== "ACTIVE") {
      return { success: false, error: "Account not found" };
    }

    const matches = await bcrypt.compare(parsed.data.currentPassword, user.password);
    if (!matches) {
      return { success: false, error: "Current password is incorrect" };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(parsed.data.newPassword, 12) },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "User",
      entityId: user.id,
      details: { passwordChanged: true, email: user.email },
    });

    revalidatePath("/settings");
    return { success: true, message: "Password updated" };
  } catch (error) {
    console.error("changeOwnPassword:", error);
    return { success: false, error: "Failed to update password" };
  }
}
