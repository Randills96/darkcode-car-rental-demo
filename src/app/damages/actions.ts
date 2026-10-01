"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit";
import { createPaymentRecord, syncRentalPaymentTotals } from "@/lib/services/payment";
import {
  generateDamageCode,
  getDamageById,
  isDamageEditable,
  resolveDamagePaymentStatus,
} from "@/lib/services/damage";
import { decimalToNumber } from "@/lib/utils";
import {
  damageFormSchema,
  damageUpdateSchema,
  damagePaymentSchema,
  type DamageFormValues,
  type DamageUpdateValues,
  type DamagePaymentFormValues,
} from "@/lib/validations/damage";
import type { ActionResult } from "@/app/customers/actions";

function parseDate(value: string): Date {
  return new Date(value);
}

export async function createDamage(input: DamageFormValues): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePermission("damages.create");
    const parsed = damageFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = parsed.data;
    const rental = await prisma.rental.findUnique({
      where: { id: data.rentalId },
      select: { id: true, vehicleId: true, customerId: true, bookingNumber: true, status: true },
    });

    if (!rental) return { success: false, error: "Rental not found" };
    if (!rental.vehicleId) return { success: false, error: "Rental has no vehicle assigned" };
    if (!["ACTIVE", "RETURNED", "COMPLETED"].includes(rental.status)) {
      return { success: false, error: "Damages can only be recorded for active, returned, or completed rentals" };
    }

    const damage = await prisma.rentalDamage.create({
      data: {
        damageCode: await generateDamageCode(),
        rentalId: data.rentalId,
        vehicleId: rental.vehicleId,
        customerId: rental.customerId,
        damageType: data.damageType,
        description: data.description,
        estimatedCost: data.estimatedCost,
        customerCharge: data.customerCharge,
        damageDate: parseDate(data.damageDate),
        status: data.status || "REPORTED",
        paymentStatus: data.customerCharge > 0 ? "UNPAID" : "PAID",
        notes: data.notes || null,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entityType: "RentalDamage",
      entityId: damage.id,
      details: { damageCode: damage.damageCode, rentalId: data.rentalId },
    });

    revalidatePath("/damages");
    revalidatePath(`/rentals/${data.rentalId}`);
    return { success: true, data: { id: damage.id }, message: "Damage recorded successfully" };
  } catch (error) {
    console.error("createDamage:", error);
    return { success: false, error: "Failed to record damage" };
  }
}

export async function updateDamage(id: string, input: DamageUpdateValues): Promise<ActionResult> {
  try {
    const session = await requirePermission("damages.edit");
    const parsed = damageUpdateSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    const existing = await getDamageById(id);
    if (!existing) return { success: false, error: "Damage not found" };
    if (!isDamageEditable(existing)) {
      return { success: false, error: "This damage cannot be edited after payment is completed" };
    }

    const data = parsed.data;

    const paidTotal = await prisma.payment.findMany({
      where: {
        rentalId: existing.rentalId,
        paymentType: "DAMAGE_PAYMENT",
        notes: { contains: existing.damageCode },
      },
      select: { amount: true },
    }).then((payments) =>
      payments.reduce((sum, payment) => sum + decimalToNumber(payment.amount), 0)
    );

    const customerCharge = data.customerCharge;
    const paymentStatus =
      data.paymentStatus ??
      (customerCharge <= 0
        ? "PAID"
        : resolveDamagePaymentStatus(customerCharge, paidTotal));

    await prisma.rentalDamage.update({
      where: { id },
      data: {
        damageType: data.damageType,
        description: data.description,
        estimatedCost: data.estimatedCost,
        customerCharge: data.customerCharge,
        damageDate: parseDate(data.damageDate),
        status: data.status,
        paymentStatus,
        notes: data.notes || null,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "RentalDamage",
      entityId: id,
      details: { damageCode: existing.damageCode },
    });

    revalidatePath("/damages");
    revalidatePath(`/damages/${id}`);
    revalidatePath(`/damages/${id}/edit`);
    revalidatePath(`/rentals/${existing.rentalId}`);
    return { success: true, message: "Damage updated successfully" };
  } catch (error) {
    console.error("updateDamage:", error);
    return { success: false, error: "Failed to update damage" };
  }
}

export async function recordDamagePayment(
  damageId: string,
  input: DamagePaymentFormValues
): Promise<ActionResult> {
  try {
    const session = await requirePermission("payments.create");
    const parsed = damagePaymentSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    const damage = await getDamageById(damageId);
    if (!damage) return { success: false, error: "Damage not found" };
    if (decimalToNumber(damage.customerCharge) <= 0) {
      return { success: false, error: "No customer charge set for this damage" };
    }

    const data = parsed.data;

    await createPaymentRecord(prisma, {
      rentalId: damage.rentalId,
      customerId: damage.customerId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      paymentType: "DAMAGE_PAYMENT",
      paymentDate: parseDate(data.paymentDate),
      referenceNumber: data.referenceNumber || null,
      notes: data.notes
        ? `${damage.damageCode}: ${data.notes}`
        : `Damage payment for ${damage.damageCode}`,
      recordedById: session.user.id,
    });

    await syncRentalPaymentTotals(damage.rentalId);

    const payments = await prisma.payment.findMany({
      where: {
        rentalId: damage.rentalId,
        paymentType: "DAMAGE_PAYMENT",
        notes: { contains: damage.damageCode },
      },
    });

    const paidTotal = payments.reduce((sum, p) => sum + decimalToNumber(p.amount), 0);
    const paymentStatus = resolveDamagePaymentStatus(
      decimalToNumber(damage.customerCharge),
      paidTotal
    );

    await prisma.rentalDamage.update({
      where: { id: damageId },
      data: {
        paymentStatus,
        status: paymentStatus === "PAID" ? "RESOLVED" : damage.status,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "PAYMENT",
      entityType: "RentalDamage",
      entityId: damageId,
      details: { amount: data.amount, damageCode: damage.damageCode },
    });

    revalidatePath("/payments");
    revalidatePath("/damages");
    revalidatePath(`/damages/${damageId}`);
    revalidatePath(`/rentals/${damage.rentalId}`);
    return { success: true, message: "Damage payment recorded" };
  } catch (error) {
    console.error("recordDamagePayment:", error);
    return { success: false, error: "Failed to record damage payment" };
  }
}
