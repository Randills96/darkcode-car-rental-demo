"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit";
import { generateBrokerCode } from "@/lib/services/broker";
import { brokerFormSchema, type BrokerFormValues } from "@/lib/validations/broker";
import type { ActionResult } from "@/app/customers/actions";

export async function createBroker(input: BrokerFormValues): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePermission("brokers.create");
    const parsed = brokerFormSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }

    const data = parsed.data;
    const broker = await prisma.broker.create({
      data: {
        brokerCode: await generateBrokerCode(),
        name: data.name.trim(),
        nic: data.nic || null,
        phone: data.phone.trim(),
        whatsapp: data.whatsapp || null,
        email: data.email?.trim() || null,
        address: data.address || null,
        notes: data.notes || null,
        defaultCommissionPerDay: data.defaultCommissionPerDay,
        defaultCommissionPerExtraKm: data.defaultCommissionPerExtraKm,
        status: data.status,
      },
    });

    await createAuditLog({ userId: session.user.id, action: "CREATE", entityType: "Broker", entityId: broker.id, details: { brokerCode: broker.brokerCode } });
    revalidatePath("/brokers");
    return { success: true, data: { id: broker.id }, message: "Broker created successfully" };
  } catch (error) {
    console.error("createBroker:", error);
    return { success: false, error: "Failed to create broker" };
  }
}

export async function updateBroker(id: string, input: BrokerFormValues): Promise<ActionResult> {
  try {
    const session = await requirePermission("brokers.edit");
    const parsed = brokerFormSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    const existing = await prisma.broker.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return { success: false, error: "Broker not found" };

    const data = parsed.data;
    await prisma.broker.update({
      where: { id },
      data: {
        name: data.name.trim(),
        nic: data.nic || null,
        phone: data.phone.trim(),
        whatsapp: data.whatsapp || null,
        email: data.email?.trim() || null,
        address: data.address || null,
        notes: data.notes || null,
        defaultCommissionPerDay: data.defaultCommissionPerDay,
        defaultCommissionPerExtraKm: data.defaultCommissionPerExtraKm,
        status: data.status,
      },
    });

    await createAuditLog({ userId: session.user.id, action: "UPDATE", entityType: "Broker", entityId: id, details: { name: data.name } });
    revalidatePath("/brokers");
    revalidatePath(`/brokers/${id}`);
    return { success: true, message: "Broker updated successfully" };
  } catch (error) {
    console.error("updateBroker:", error);
    return { success: false, error: "Failed to update broker" };
  }
}

export async function deleteBroker(id: string): Promise<ActionResult> {
  try {
    const session = await requirePermission("brokers.edit");
    const existing = await prisma.broker.findFirst({
      where: { id, deletedAt: null },
      include: {
        commissions: { where: { status: { in: ["PENDING", "PARTIALLY_PAID"] } }, take: 1 },
      },
    });
    if (!existing) return { success: false, error: "Broker not found" };
    if (existing.commissions.length > 0) {
      return { success: false, error: "Cannot delete broker with pending commissions" };
    }

    await prisma.broker.update({ where: { id }, data: { deletedAt: new Date(), status: "INACTIVE" } });
    await createAuditLog({ userId: session.user.id, action: "DELETE", entityType: "Broker", entityId: id, details: { brokerCode: existing.brokerCode } });
    revalidatePath("/brokers");
    return { success: true, message: "Broker deleted successfully" };
  } catch (error) {
    console.error("deleteBroker:", error);
    return { success: false, error: "Failed to delete broker" };
  }
}
