"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit";
import { countActiveSuperAdmins, isEmailTaken } from "@/lib/services/user";
import {
  userCreateSchema,
  userFormSchema,
  type UserFormValues,
} from "@/lib/validations/user";
import {
  isAnnualFeeRole,
  subscriptionFieldsForRole,
} from "@/lib/services/user-subscription";
import type { ActionResult } from "@/app/customers/actions";

export async function createUser(input: UserFormValues): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePermission("users.create");
    const parsed = userCreateSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = parsed.data;

    if (await isEmailTaken(data.email)) {
      return { success: false, error: "Email is already in use" };
    }

    const passwordHash = await bcrypt.hash(data.password!, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email.trim().toLowerCase(),
        password: passwordHash,
        name: data.name.trim(),
        phone: data.phone || null,
        role: data.role,
        status: data.status,
        ...subscriptionFieldsForRole(data.role),
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entityType: "User",
      entityId: user.id,
      details: { email: user.email, role: user.role },
    });

    revalidatePath("/users");
    return { success: true, data: { id: user.id }, message: "User created successfully" };
  } catch (error) {
    console.error("createUser:", error);
    return { success: false, error: "Failed to create user" };
  }
}

export async function updateUser(id: string, input: UserFormValues): Promise<ActionResult> {
  try {
    const session = await requirePermission("users.edit");
    const parsed = userFormSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = parsed.data;
    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return { success: false, error: "User not found" };

    if (await isEmailTaken(data.email, id)) {
      return { success: false, error: "Email is already in use" };
    }

    if (
      existing.role === "SUPER_ADMIN" &&
      existing.status === "ACTIVE" &&
      (data.role !== "SUPER_ADMIN" || data.status !== "ACTIVE")
    ) {
      const remaining = await countActiveSuperAdmins(id);
      if (remaining === 0) {
        return { success: false, error: "Cannot deactivate or demote the last active Super Admin" };
      }
    }

    if (existing.id === session.user.id && data.status === "INACTIVE") {
      return { success: false, error: "You cannot deactivate your own account" };
    }

    const activating =
      existing.status === "INACTIVE" && data.status === "ACTIVE" && isAnnualFeeRole(data.role);
    const roleChangedToFee = !isAnnualFeeRole(existing.role) && isAnnualFeeRole(data.role);
    const roleLeftFee = isAnnualFeeRole(existing.role) && !isAnnualFeeRole(data.role);

    await prisma.user.update({
      where: { id },
      data: {
        email: data.email.trim().toLowerCase(),
        name: data.name.trim(),
        phone: data.phone || null,
        role: data.role,
        status: data.status,
        ...(data.password ? { password: await bcrypt.hash(data.password, 12) } : {}),
        ...(activating || roleChangedToFee ? subscriptionFieldsForRole(data.role) : {}),
        ...(roleLeftFee ? { subscriptionExpiresAt: null, annualFeeNotifiedAt: null } : {}),
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "User",
      entityId: id,
      details: { email: data.email, role: data.role, status: data.status },
    });

    revalidatePath("/users");
    revalidatePath(`/users/${id}/edit`);
    return { success: true, message: "User updated successfully" };
  } catch (error) {
    console.error("updateUser:", error);
    return { success: false, error: "Failed to update user" };
  }
}

export async function deactivateUser(id: string): Promise<ActionResult> {
  try {
    const session = await requirePermission("users.edit");

    if (id === session.user.id) {
      return { success: false, error: "You cannot deactivate your own account" };
    }

    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return { success: false, error: "User not found" };

    if (existing.role === "SUPER_ADMIN" && existing.status === "ACTIVE") {
      const remaining = await countActiveSuperAdmins(id);
      if (remaining === 0) {
        return { success: false, error: "Cannot deactivate the last active Super Admin" };
      }
    }

    await prisma.user.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      entityType: "User",
      entityId: id,
      details: { email: existing.email },
    });

    revalidatePath("/users");
    return { success: true, message: "User deactivated" };
  } catch (error) {
    console.error("deactivateUser:", error);
    return { success: false, error: "Failed to deactivate user" };
  }
}

export async function activateUserAfterPayment(id: string): Promise<ActionResult> {
  try {
    const session = await requirePermission("users.edit");
    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return { success: false, error: "User not found" };

    if (!isAnnualFeeRole(existing.role)) {
      return { success: false, error: "Only Manager and Staff accounts use the annual fee" };
    }

    await prisma.user.update({
      where: { id },
      data: {
        status: "ACTIVE",
        ...subscriptionFieldsForRole(existing.role),
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "User",
      entityId: id,
      details: { email: existing.email, annualFee: "paid", status: "ACTIVE" },
    });

    revalidatePath("/users");
    revalidatePath(`/users/${id}/edit`);
    return {
      success: true,
      message: `${existing.name} activated for one year after payment`,
    };
  } catch (error) {
    console.error("activateUserAfterPayment:", error);
    return { success: false, error: "Failed to activate user" };
  }
}
