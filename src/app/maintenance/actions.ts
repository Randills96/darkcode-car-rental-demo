"use server";

import { revalidatePath } from "next/cache";
import { invalidateOperationalCaches } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit";
import { generateMaintenanceCode } from "@/lib/services/maintenance";
import { createMaintenanceExpense } from "@/lib/services/expense";
import {
  maintenanceFormSchema,
  type MaintenanceFormValues,
} from "@/lib/validations/maintenance";
import type { ActionResult } from "@/app/customers/actions";

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  return new Date(value);
}

export async function createMaintenance(
  input: MaintenanceFormValues
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePermission("maintenance.create");
    const parsed = maintenanceFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = parsed.data;
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: data.vehicleId, deletedAt: null },
    });
    if (!vehicle) return { success: false, error: "Vehicle not found" };

    const record = await prisma.vehicleMaintenance.create({
      data: {
        maintenanceCode: await generateMaintenanceCode(),
        vehicleId: data.vehicleId,
        maintenanceType: data.maintenanceType,
        date: parseDate(data.date)!,
        odometer: data.odometer ? Number(data.odometer) : null,
        description: data.description,
        serviceProvider: data.serviceProvider || null,
        cost: data.cost,
        nextServiceDate: parseDate(data.nextServiceDate),
        nextServiceKm: data.nextServiceKm ? Number(data.nextServiceKm) : null,
        notes: data.notes || null,
        createdById: session.user.id,
      },
    });

    if (data.odometer && Number(data.odometer) > vehicle.currentOdometer) {
      await prisma.vehicle.update({
        where: { id: data.vehicleId },
        data: { currentOdometer: Number(data.odometer) },
      });
    }

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entityType: "VehicleMaintenance",
      entityId: record.id,
      details: {
        maintenanceCode: record.maintenanceCode,
        vehicleId: data.vehicleId,
        cost: data.cost,
      },
    });

    try {
      await createMaintenanceExpense({
        maintenanceId: record.id,
        vehicleId: data.vehicleId,
        maintenanceType: data.maintenanceType,
        amount: Number(data.cost) || 0,
        date: parseDate(data.date)!,
        description: data.description,
        createdById: session.user.id,
      });
    } catch (error) {
      console.error("createMaintenanceExpense:", error);
    }

    revalidatePath("/maintenance");
    revalidatePath("/expenses");
    revalidatePath(`/vehicles/${data.vehicleId}`);
    invalidateOperationalCaches();
    return { success: true, data: { id: record.id }, message: "Maintenance record created" };
  } catch (error) {
    console.error("createMaintenance:", error);
    return { success: false, error: "Failed to create maintenance record" };
  }
}
