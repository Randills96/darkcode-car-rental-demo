"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit";
import {
  generateVehicleCode,
  isRegistrationTaken,
  checkVehicleAvailability,
} from "@/lib/services/vehicle";
import {
  vehicleFormSchema,
  vehicleDocumentSchema,
  unavailablePeriodSchema,
  type VehicleFormValues,
  type VehicleDocumentFormValues,
  type UnavailablePeriodFormValues,
} from "@/lib/validations/vehicle";
import { syncSystemNotifications } from "@/lib/services/notification";
import type { ActionResult } from "@/app/customers/actions";

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function parseOptionalNumber(value: number | "" | undefined): number | null {
  if (value === "" || value === undefined || value === null) return null;
  return Number(value);
}

async function syncVehicleQuickDocuments(vehicleId: string, data: VehicleFormValues) {
  // 1. Insurance document
  const insPolicy = data.insurancePolicyNumber?.trim();
  const insExpiry = parseDate(data.insuranceExpiryDate);
  if (insPolicy || insExpiry) {
    const existingIns = await prisma.vehicleDocument.findFirst({
      where: { vehicleId, documentType: "INSURANCE" },
    });
    if (existingIns) {
      await prisma.vehicleDocument.update({
        where: { id: existingIns.id },
        data: {
          documentNumber: insPolicy || null,
          expiryDate: insExpiry,
        },
      });
    } else {
      await prisma.vehicleDocument.create({
        data: {
          vehicleId,
          documentType: "INSURANCE",
          documentNumber: insPolicy || null,
          expiryDate: insExpiry,
        },
      });
    }
  }

  // 2. Revenue Licence document
  const revNumber = data.revenueLicenceNumber?.trim();
  const revExpiry = parseDate(data.revenueLicenceExpiryDate);
  if (revNumber || revExpiry) {
    const existingRev = await prisma.vehicleDocument.findFirst({
      where: { vehicleId, documentType: "REVENUE_LICENCE" },
    });
    if (existingRev) {
      await prisma.vehicleDocument.update({
        where: { id: existingRev.id },
        data: {
          documentNumber: revNumber || null,
          expiryDate: revExpiry,
        },
      });
    } else {
      await prisma.vehicleDocument.create({
        data: {
          vehicleId,
          documentType: "REVENUE_LICENCE",
          documentNumber: revNumber || null,
          expiryDate: revExpiry,
        },
      });
    }
  }
}

export async function createVehicle(
  input: VehicleFormValues
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePermission("vehicles.create");
    const parsed = vehicleFormSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = parsed.data;

    if (await isRegistrationTaken(data.registrationNumber)) {
      return { success: false, error: "A vehicle with this registration number already exists" };
    }

    if ((Boolean(data.ownerId) || data.ownershipType !== "COMPANY_OWNED") && !data.ownerId) {
      return { success: false, error: "Owner is required when this vehicle pays an owner" };
    }

    const vehicleCode = await generateVehicleCode();

    const vehicle = await prisma.vehicle.create({
      data: {
        vehicleCode,
        registrationNumber: data.registrationNumber,
        vehicleType: data.vehicleType,
        make: data.make.trim(),
        model: data.model.trim(),
        year: data.year,
        colour: data.colour.trim(),
        fuelType: data.fuelType,
        transmission: data.transmission,
        seatingCapacity: data.seatingCapacity,
        currentOdometer: data.currentOdometer,
        dailyRate: data.dailyRate,
        includedKm: data.includedKm,
        extraKmRate: data.extraKmRate,
        ownerDailyRate: parseOptionalNumber(data.ownerDailyRate as number | "" | undefined),
        ownerExtraKmRate: parseOptionalNumber(data.ownerExtraKmRate as number | "" | undefined),
        weeklyRate: parseOptionalNumber(data.weeklyRate),
        monthlyRate: parseOptionalNumber(data.monthlyRate),
        ownershipType: data.ownershipType,
        ownerId: data.ownerId || null,
        status: data.status,
        notes: data.notes || null,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entityType: "Vehicle",
      entityId: vehicle.id,
      details: { vehicleCode, registrationNumber: vehicle.registrationNumber },
    });

    await syncVehicleQuickDocuments(vehicle.id, data);
    await syncSystemNotifications().catch(() => {});

    revalidatePath("/vehicles");
    revalidatePath("/vehicles/documents");
    revalidatePath("/notifications");
    revalidatePath("/");
    return { success: true, data: { id: vehicle.id }, message: "Vehicle created successfully" };
  } catch (error) {
    console.error("createVehicle:", error);
    return { success: false, error: "Failed to create vehicle" };
  }
}

export async function updateVehicle(id: string, input: VehicleFormValues): Promise<ActionResult> {
  try {
    const session = await requirePermission("vehicles.edit");
    const parsed = vehicleFormSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const existing = await prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return { success: false, error: "Vehicle not found" };

    const data = parsed.data;

    if (await isRegistrationTaken(data.registrationNumber, id)) {
      return { success: false, error: "A vehicle with this registration number already exists" };
    }

    if ((Boolean(data.ownerId) || data.ownershipType !== "COMPANY_OWNED") && !data.ownerId) {
      return { success: false, error: "Owner is required when this vehicle pays an owner" };
    }

    await prisma.vehicle.update({
      where: { id },
      data: {
        registrationNumber: data.registrationNumber,
        vehicleType: data.vehicleType,
        make: data.make.trim(),
        model: data.model.trim(),
        year: data.year,
        colour: data.colour.trim(),
        fuelType: data.fuelType,
        transmission: data.transmission,
        seatingCapacity: data.seatingCapacity,
        currentOdometer: data.currentOdometer,
        dailyRate: data.dailyRate,
        includedKm: data.includedKm,
        extraKmRate: data.extraKmRate,
        ownerDailyRate: parseOptionalNumber(data.ownerDailyRate as number | "" | undefined),
        ownerExtraKmRate: parseOptionalNumber(data.ownerExtraKmRate as number | "" | undefined),
        weeklyRate: parseOptionalNumber(data.weeklyRate),
        monthlyRate: parseOptionalNumber(data.monthlyRate),
        ownershipType: data.ownershipType,
        ownerId: data.ownershipType === "COMPANY_OWNED" ? data.ownerId || null : data.ownerId || null,
        status: data.status,
        notes: data.notes || null,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "Vehicle",
      entityId: id,
      details: { registrationNumber: data.registrationNumber },
    });

    await syncVehicleQuickDocuments(id, data);
    await syncSystemNotifications().catch(() => {});

    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${id}`);
    revalidatePath("/vehicles/documents");
    revalidatePath("/notifications");
    revalidatePath("/");
    return { success: true, message: "Vehicle updated successfully" };
  } catch (error) {
    console.error("updateVehicle:", error);
    return { success: false, error: "Failed to update vehicle" };
  }
}

export async function deleteVehicle(id: string): Promise<ActionResult> {
  try {
    const session = await requirePermission("vehicles.delete");

    const existing = await prisma.vehicle.findFirst({
      where: { id, deletedAt: null },
      include: { rentals: { where: { status: "ACTIVE" }, take: 1 } },
    });

    if (!existing) return { success: false, error: "Vehicle not found" };
    if (existing.rentals.length > 0) {
      return { success: false, error: "Cannot delete vehicle with active rentals" };
    }

    await prisma.vehicle.update({
      where: { id },
      data: { deletedAt: new Date(), status: "INACTIVE" },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      entityType: "Vehicle",
      entityId: id,
      details: { registrationNumber: existing.registrationNumber },
    });

    revalidatePath("/vehicles");
    return { success: true, message: "Vehicle deleted successfully" };
  } catch (error) {
    console.error("deleteVehicle:", error);
    return { success: false, error: "Failed to delete vehicle" };
  }
}

export async function addVehicleDocument(
  vehicleId: string,
  input: VehicleDocumentFormValues
): Promise<ActionResult> {
  try {
    const session = await requirePermission("vehicles.edit");
    const parsed = vehicleDocumentSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, error: "Validation failed" };
    }

    const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, deletedAt: null } });
    if (!vehicle) return { success: false, error: "Vehicle not found" };

    const data = parsed.data;

    await prisma.vehicleDocument.create({
      data: {
        vehicleId,
        documentType: data.documentType,
        documentNumber: data.documentNumber || null,
        issueDate: parseDate(data.issueDate),
        expiryDate: parseDate(data.expiryDate),
        filePath: data.filePath || null,
        notes: data.notes || null,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entityType: "VehicleDocument",
      entityId: vehicleId,
      details: { documentType: data.documentType },
    });

    revalidatePath(`/vehicles/${vehicleId}`);
    revalidatePath("/vehicles/documents");
    return { success: true, message: "Document added successfully" };
  } catch (error) {
    console.error("addVehicleDocument:", error);
    return { success: false, error: "Failed to add document" };
  }
}

export async function deleteVehicleDocument(
  documentId: string,
  vehicleId: string
): Promise<ActionResult> {
  try {
    const session = await requirePermission("vehicles.edit");
    await prisma.vehicleDocument.delete({ where: { id: documentId } });

    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      entityType: "VehicleDocument",
      entityId: vehicleId,
      details: { documentId },
    });

    revalidatePath(`/vehicles/${vehicleId}`);
    revalidatePath("/vehicles/documents");
    return { success: true, message: "Document deleted successfully" };
  } catch (error) {
    console.error("deleteVehicleDocument:", error);
    return { success: false, error: "Failed to delete document" };
  }
}

export async function addUnavailablePeriod(
  vehicleId: string,
  input: UnavailablePeriodFormValues
): Promise<ActionResult> {
  try {
    const session = await requirePermission("vehicles.edit");
    const parsed = unavailablePeriodSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || "Validation failed",
      };
    }

    const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, deletedAt: null } });
    if (!vehicle) return { success: false, error: "Vehicle not found" };

    const startDate = parseDate(parsed.data.startDate)!;
    const endDate = parseDate(parsed.data.endDate)!;

    const { available, conflicts } = await checkVehicleAvailability(vehicleId, startDate, endDate);
    if (!available) {
      return {
        success: false,
        error: `Period conflicts with: ${conflicts.map((c) => c.label).join(", ")}`,
      };
    }

    await prisma.vehicleUnavailablePeriod.create({
      data: {
        vehicleId,
        startDate,
        endDate,
        reason: parsed.data.reason || null,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entityType: "VehicleUnavailablePeriod",
      entityId: vehicleId,
      details: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    });

    revalidatePath(`/vehicles/${vehicleId}`);
    revalidatePath("/vehicles/availability");
    return { success: true, message: "Unavailable period added" };
  } catch (error) {
    console.error("addUnavailablePeriod:", error);
    return { success: false, error: "Failed to add unavailable period" };
  }
}

export async function deleteUnavailablePeriod(
  periodId: string,
  vehicleId: string
): Promise<ActionResult> {
  try {
    const session = await requirePermission("vehicles.edit");
    await prisma.vehicleUnavailablePeriod.delete({ where: { id: periodId } });

    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      entityType: "VehicleUnavailablePeriod",
      entityId: vehicleId,
      details: { periodId },
    });

    revalidatePath(`/vehicles/${vehicleId}`);
    revalidatePath("/vehicles/availability");
    return { success: true, message: "Unavailable period removed" };
  } catch (error) {
    console.error("deleteUnavailablePeriod:", error);
    return { success: false, error: "Failed to remove unavailable period" };
  }
}

export async function checkAvailabilityAction(
  vehicleId: string,
  startDate: string,
  endDate: string,
  excludeRentalId?: string
) {
  await requirePermission("vehicles.view");
  return checkVehicleAvailability(
    vehicleId,
    new Date(startDate),
    new Date(endDate),
    excludeRentalId
  );
}
