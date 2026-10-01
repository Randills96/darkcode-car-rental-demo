"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit";
import { generateDriverCode, isDriverNicTaken } from "@/lib/services/driver";
import {
  driverFormSchema,
  driverPaymentSchema,
  driverExpenseSchema,
  type DriverFormValues,
  type DriverPaymentFormValues,
  type DriverExpenseFormValues,
} from "@/lib/validations/driver";
import type { ActionResult } from "@/app/customers/actions";

function parseDate(value: string): Date {
  return new Date(value);
}

export async function createDriver(input: DriverFormValues): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePermission("drivers.create");
    const parsed = driverFormSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }

    const data = parsed.data;
    const nic = data.nic.trim().toUpperCase();
    if (await isDriverNicTaken(nic)) {
      return { success: false, error: "A driver with this NIC already exists" };
    }

    const driver = await prisma.driver.create({
      data: {
        driverCode: await generateDriverCode(),
        name: data.name.trim(),
        nic,
        phone: data.phone.trim(),
        whatsapp: data.whatsapp || null,
        address: data.address || null,
        drivingLicence: data.drivingLicence.trim(),
        licenceExpiry: parseDate(data.licenceExpiry),
        dailyPayment: data.dailyPayment,
        status: data.status,
        notes: data.notes || null,
      },
    });

    await createAuditLog({ userId: session.user.id, action: "CREATE", entityType: "Driver", entityId: driver.id, details: { driverCode: driver.driverCode } });
    revalidatePath("/drivers");
    return { success: true, data: { id: driver.id }, message: "Driver created successfully" };
  } catch (error) {
    console.error("createDriver:", error);
    return { success: false, error: "Failed to create driver" };
  }
}

export async function updateDriver(id: string, input: DriverFormValues): Promise<ActionResult> {
  try {
    const session = await requirePermission("drivers.edit");
    const parsed = driverFormSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    const existing = await prisma.driver.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return { success: false, error: "Driver not found" };

    const data = parsed.data;
    const nic = data.nic.trim().toUpperCase();
    if (await isDriverNicTaken(nic, id)) {
      return { success: false, error: "A driver with this NIC already exists" };
    }

    await prisma.driver.update({
      where: { id },
      data: {
        name: data.name.trim(),
        nic,
        phone: data.phone.trim(),
        whatsapp: data.whatsapp || null,
        address: data.address || null,
        drivingLicence: data.drivingLicence.trim(),
        licenceExpiry: parseDate(data.licenceExpiry),
        dailyPayment: data.dailyPayment,
        status: data.status,
        notes: data.notes || null,
      },
    });

    await createAuditLog({ userId: session.user.id, action: "UPDATE", entityType: "Driver", entityId: id, details: { name: data.name } });
    revalidatePath("/drivers");
    revalidatePath(`/drivers/${id}`);
    return { success: true, message: "Driver updated successfully" };
  } catch (error) {
    console.error("updateDriver:", error);
    return { success: false, error: "Failed to update driver" };
  }
}

export async function deleteDriver(id: string): Promise<ActionResult> {
  try {
    const session = await requirePermission("drivers.edit");
    const existing = await prisma.driver.findFirst({
      where: { id, deletedAt: null },
      include: { rentals: { where: { status: "ACTIVE" }, take: 1 } },
    });
    if (!existing) return { success: false, error: "Driver not found" };
    if (existing.rentals.length > 0) {
      return { success: false, error: "Cannot delete driver with active rentals" };
    }

    await prisma.driver.update({ where: { id }, data: { deletedAt: new Date(), status: "INACTIVE" } });
    await createAuditLog({ userId: session.user.id, action: "DELETE", entityType: "Driver", entityId: id, details: { driverCode: existing.driverCode } });
    revalidatePath("/drivers");
    return { success: true, message: "Driver deleted successfully" };
  } catch (error) {
    console.error("deleteDriver:", error);
    return { success: false, error: "Failed to delete driver" };
  }
}

export async function recordDriverPayment(
  driverId: string,
  input: DriverPaymentFormValues
): Promise<ActionResult> {
  try {
    const session = await requirePermission("drivers.edit");
    const parsed = driverPaymentSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    const driver = await prisma.driver.findFirst({ where: { id: driverId, deletedAt: null } });
    if (!driver) return { success: false, error: "Driver not found" };

    const data = parsed.data;

    await prisma.$transaction(async (tx) => {
      await tx.driverPayment.create({
        data: {
          driverId,
          rentalId: data.rentalId || null,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          paymentDate: parseDate(data.paymentDate),
          referenceNumber: data.referenceNumber || null,
          notes: data.notes || null,
        },
      });
    });

    await createAuditLog({
      userId: session.user.id,
      action: "PAYMENT",
      entityType: "DriverPayment",
      entityId: driverId,
      details: { amount: data.amount },
    });

    revalidatePath(`/drivers/${driverId}`);
    return { success: true, message: "Driver payment recorded" };
  } catch (error) {
    console.error("recordDriverPayment:", error);
    return { success: false, error: "Failed to record payment" };
  }
}

export async function recordDriverExpense(
  driverId: string,
  input: DriverExpenseFormValues
): Promise<ActionResult> {
  try {
    const session = await requirePermission("drivers.edit");
    const parsed = driverExpenseSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    const driver = await prisma.driver.findFirst({ where: { id: driverId, deletedAt: null } });
    if (!driver) return { success: false, error: "Driver not found" };

    const data = parsed.data;

    await prisma.driverExpense.create({
      data: {
        driverId,
        rentalId: data.rentalId || null,
        expenseType: data.expenseType,
        amount: data.amount,
        expenseDate: parseDate(data.expenseDate),
        description: data.description || null,
        notes: data.notes || null,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entityType: "DriverExpense",
      entityId: driverId,
      details: { amount: data.amount, expenseType: data.expenseType },
    });

    revalidatePath(`/drivers/${driverId}`);
    return { success: true, message: "Driver expense recorded" };
  } catch (error) {
    console.error("recordDriverExpense:", error);
    return { success: false, error: "Failed to record expense" };
  }
}
