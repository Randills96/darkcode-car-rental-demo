"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit";
import { generateOwnerCode } from "@/lib/services/owner";
import { ownerFormSchema, type OwnerFormValues } from "@/lib/validations/owner";
import type { ActionResult } from "@/app/customers/actions";

export async function createOwner(input: OwnerFormValues): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePermission("owners.create");
    const parsed = ownerFormSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = parsed.data;
    const ownerCode = await generateOwnerCode();

    const owner = await prisma.vehicleOwner.create({
      data: {
        ownerCode,
        name: data.name.trim(),
        nic: data.nic || null,
        phone: data.phone.trim(),
        whatsapp: data.whatsapp || null,
        email: data.email?.trim() || null,
        address: data.address || null,
        bankName: data.bankName || null,
        bankAccount: data.bankAccount || null,
        bankBranch: data.bankBranch || null,
        notes: data.notes || null,
        status: data.status,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entityType: "VehicleOwner",
      entityId: owner.id,
      details: { ownerCode, name: owner.name },
    });

    revalidatePath("/owners");
    return { success: true, data: { id: owner.id }, message: "Owner created successfully" };
  } catch (error) {
    console.error("createOwner:", error);
    return { success: false, error: "Failed to create owner" };
  }
}

export async function updateOwner(id: string, input: OwnerFormValues): Promise<ActionResult> {
  try {
    const session = await requirePermission("owners.edit");
    const parsed = ownerFormSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const existing = await prisma.vehicleOwner.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return { success: false, error: "Owner not found" };

    const data = parsed.data;

    await prisma.vehicleOwner.update({
      where: { id },
      data: {
        name: data.name.trim(),
        nic: data.nic || null,
        phone: data.phone.trim(),
        whatsapp: data.whatsapp || null,
        email: data.email?.trim() || null,
        address: data.address || null,
        bankName: data.bankName || null,
        bankAccount: data.bankAccount || null,
        bankBranch: data.bankBranch || null,
        notes: data.notes || null,
        status: data.status,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "VehicleOwner",
      entityId: id,
      details: { name: data.name },
    });

    revalidatePath("/owners");
    revalidatePath(`/owners/${id}`);
    return { success: true, message: "Owner updated successfully" };
  } catch (error) {
    console.error("updateOwner:", error);
    return { success: false, error: "Failed to update owner" };
  }
}

export async function deleteOwner(id: string): Promise<ActionResult> {
  try {
    const session = await requirePermission("owners.edit");

    const existing = await prisma.vehicleOwner.findFirst({
      where: { id, deletedAt: null },
      include: { vehicles: { where: { deletedAt: null }, take: 1 } },
    });

    if (!existing) return { success: false, error: "Owner not found" };
    if (existing.vehicles.length > 0) {
      return { success: false, error: "Cannot delete owner with assigned vehicles" };
    }

    await prisma.vehicleOwner.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      entityType: "VehicleOwner",
      entityId: id,
      details: { ownerCode: existing.ownerCode },
    });

    revalidatePath("/owners");
    return { success: true, message: "Owner deleted successfully" };
  } catch (error) {
    console.error("deleteOwner:", error);
    return { success: false, error: "Failed to delete owner" };
  }
}
