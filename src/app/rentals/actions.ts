"use server";

import { revalidatePath } from "next/cache";
import { invalidateOperationalCaches } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { Prisma, type RentalStatus } from "@prisma/client";
import { requirePermission } from "@/lib/auth/session";
import type { Permission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/services/audit";
import { checkCustomerBlacklistWarning } from "@/app/customers/actions";
import {
    generateBookingNumber,
  getRentalById,
  buildRentalPricingFromVehicle,
  canTransition,
  checkVehicleAvailability,
  syncVehicleStatusForRental,
  releaseVehicleForRental,
  computeRentalPricing,
  markRentalCompleted,
} from "@/lib/services/rental";
import { calculatePricing, calculateBalance } from "@/lib/services/pricing";
import { createPaymentRecord, syncRentalPaymentTotals } from "@/lib/services/payment";
import { createSettlementsForCompletedRental } from "@/lib/services/settlement";
import { rentalCommissionFieldsFromForm } from "@/lib/services/commission-calculator";
import {
  rentalFormSchema,
  assignVehicleSchema,
  handoverSchema,
  returnSchema,
  pricingPreviewSchema,
  type RentalFormValues,
  type HandoverFormValues,
  type ReturnFormValues,
  type EndingOdometerRecordValues,
  endingOdometerRecordSchema,
  type UpdateEndingOdometerValues,
  updateEndingOdometerSchema,
  type PricingPreviewInput,
} from "@/lib/validations/rental";
import type { ActionResult } from "@/app/customers/actions";
import { getSystemSettings } from "@/lib/services/settings";
import {
  buildHandoverWhatsAppPayload,
  rentalToHandoverWhatsAppInput,
  type HandoverWhatsAppPayload,
} from "@/lib/whatsapp/handover-message";

function parseDate(value: string): Date {
  return new Date(value);
}

async function getVehicleOwnerMeta(vehicleId: string | null | undefined) {
  if (!vehicleId) return { ownershipType: null, ownerId: null };
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { ownershipType: true, ownerId: true },
  });
  return {
    ownershipType: vehicle?.ownershipType ?? null,
    ownerId: vehicle?.ownerId ?? null,
  };
}

async function validateCustomerForRental(customerId: string): Promise<ActionResult> {
  const blacklist = await checkCustomerBlacklistWarning(customerId);
  if (blacklist?.isBlacklisted && blacklist.shouldBlock) {
    return {
      success: false,
      error: `Customer ${blacklist.fullName} is blacklisted. Booking is blocked by system settings.`,
    };
  }
  return { success: true };
}

export async function previewRentalPricing(input: PricingPreviewInput & { vehicleId?: string }) {
  await requirePermission("rentals.view");
  const parsed = pricingPreviewSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "Invalid pricing input" };

  const { pricing } = await buildRentalPricingFromVehicle(input.vehicleId, parsed.data);
  return { success: true as const, data: pricing };
}

export async function createRental(input: RentalFormValues): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePermission("rentals.create");
    const parsed = rentalFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const customerCheck = await validateCustomerForRental(parsed.data.customerId);
    if (!customerCheck.success) return customerCheck;

    const data = parsed.data;
    const status = (data.status || "INQUIRY") as RentalStatus;
    if (status === "CONFIRMED" && !data.vehicleId) {
      return { success: false, error: "Select a vehicle to confirm the hire" };
    }
    if (status === "CONFIRMED" && data.startingOdometer == null) {
      return { success: false, error: "Starting odometer is required for a confirmed hire" };
    }

    if (data.vehicleId) {
      const { available, conflicts } = await checkVehicleAvailability(
        data.vehicleId,
        parseDate(data.pickupDate),
        parseDate(data.returnDate)
      );
      if (!available) {
        return { success: false, error: `Vehicle not available: ${conflicts.map((c) => c.label).join(", ")}` };
      }
    }

    const { pricing, dailyRate, includedKm, includedKmExtraDay, extraKmRate } = await buildRentalPricingFromVehicle(
      data.vehicleId || null,
      {
        pickupDate: data.pickupDate,
        pickupTime: data.pickupTime,
        returnDate: data.returnDate,
        returnTime: data.returnTime,
        ratePlanType: data.ratePlanType,
        dailyRate: data.dailyRate,
        includedKm: data.includedKm,
        includedKmExtraDay: data.includedKmExtraDay,
        extraKmRate: data.extraKmRate,
        deliveryCharge: data.deliveryCharge ?? 0,
        driverCharge: data.driverCharge ?? 0,
        otherCharges: data.otherCharges ?? 0,
        discount: data.discount ?? 0,
      }
    );

    const advancePayment = data.advancePayment ?? 0;
    const estimatedTotal = pricing.finalTotal;
    const vehicleOwner = await getVehicleOwnerMeta(data.vehicleId || null);
    const commissionFields = rentalCommissionFieldsFromForm({
      brokerId: data.brokerId || null,
      brokerCommissionPerDay: data.brokerCommissionPerDay,
      brokerCommissionPerExtraKm: data.brokerCommissionPerExtraKm,
      vehicleOwnershipType: vehicleOwner.ownershipType,
      ownerId: vehicleOwner.ownerId,
      ownerDailyRate: data.ownerDailyRate,
      ownerExtraKmRate: data.ownerExtraKmRate,
    });

    const rental = await prisma.$transaction(async (tx) => {
      const created = await tx.rental.create({
        data: {
          bookingNumber: await generateBookingNumber(),
          customerId: data.customerId,
          vehicleId: data.vehicleId || null,
          rentalType: data.rentalType,
          ratePlanType: data.ratePlanType,
          pickupDate: parseDate(data.pickupDate),
          pickupTime: data.pickupTime,
          returnDate: parseDate(data.returnDate),
          returnTime: data.returnTime,
          pickupLocation: data.pickupLocation || null,
          returnLocation: data.returnLocation || null,
          rentalDays: pricing.rentalDays,
          dailyRate,
          includedKm,
          extraKmRate,
          estimatedTotal,
          deliveryCharge: data.deliveryCharge ?? 0,
          driverCharge: data.driverCharge ?? 0,
          otherCharges: data.otherCharges ?? 0,
          discount: data.discount ?? 0,
          securityDeposit: data.securityDeposit ?? 0,
          advancePayment,
          finalTotal: estimatedTotal,
          totalPaid: 0,
          balance: estimatedTotal,
          status,
          driverId: data.driverId || null,
          brokerId: data.brokerId || null,
          brokerCommissionPerDay: commissionFields.brokerCommissionPerDay,
          brokerCommissionPerExtraKm: commissionFields.brokerCommissionPerExtraKm,
          ownerDailyRate: commissionFields.ownerDailyRate,
          ownerExtraKmRate: commissionFields.ownerExtraKmRate,
          startingOdometer: data.startingOdometer ?? null,
          notes: data.notes || null,
          createdById: session.user.id,
        },
      });

      if (advancePayment > 0) {
        await createPaymentRecord(tx, {
          rentalId: created.id,
          customerId: data.customerId,
          amount: advancePayment,
          paymentMethod: "CASH",
          paymentType: "ADVANCE",
          paymentDate: new Date(),
          notes: "Advance payment on rental creation",
          recordedById: session.user.id,
        });
        await syncRentalPaymentTotals(created.id, tx);
      }

      return created;
    });

    if (data.vehicleId && status === "CONFIRMED") {
      await syncVehicleStatusForRental(data.vehicleId, "CONFIRMED");
    }

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entityType: "Rental",
      entityId: rental.id,
      details: { bookingNumber: rental.bookingNumber, status },
    });

    revalidatePath("/rentals");
    invalidateOperationalCaches();
    return {
      success: true,
      data: { id: rental.id },
      message:
        status === "CONFIRMED"
          ? "Hire confirmed. Record handover when the customer picks up the vehicle."
          : "Rental created successfully",
    };
  } catch (error) {
    console.error("createRental:", error);
    return { success: false, error: "Failed to create rental" };
  }
}

export async function updateRental(id: string, input: RentalFormValues): Promise<ActionResult> {
  try {
    const session = await requirePermission("rentals.edit");
    const parsed = rentalFormSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    const existing = await getRentalById(id);
    if (!existing) return { success: false, error: "Rental not found" };
    if (!["INQUIRY", "QUOTED", "CONFIRMED"].includes(existing.status)) {
      return { success: false, error: "Cannot edit rental in current status" };
    }

    const customerCheck = await validateCustomerForRental(parsed.data.customerId);
    if (!customerCheck.success) return customerCheck;

    const data = parsed.data;
    const vehicleId = data.vehicleId || null;

    if (vehicleId) {
      const { available, conflicts } = await checkVehicleAvailability(
        vehicleId,
        parseDate(data.pickupDate),
        parseDate(data.returnDate),
        id
      );
      if (!available) {
        return { success: false, error: `Vehicle not available: ${conflicts.map((c) => c.label).join(", ")}` };
      }
    }

    const { pricing, dailyRate, includedKm, includedKmExtraDay, extraKmRate } = await buildRentalPricingFromVehicle(vehicleId, {
      pickupDate: data.pickupDate,
      pickupTime: data.pickupTime,
      returnDate: data.returnDate,
      returnTime: data.returnTime,
      ratePlanType: data.ratePlanType,
      dailyRate: data.dailyRate,
      includedKm: data.includedKm,
      includedKmExtraDay: data.includedKmExtraDay,
      extraKmRate: data.extraKmRate,
      deliveryCharge: data.deliveryCharge ?? 0,
      driverCharge: data.driverCharge ?? 0,
      otherCharges: data.otherCharges ?? 0,
      discount: data.discount ?? 0,
    });

    const finalTotal = pricing.finalTotal;
    const balance = calculateBalance(finalTotal, Number(existing.totalPaid));
    const vehicleOwner = await getVehicleOwnerMeta(vehicleId);
    const commissionFields = rentalCommissionFieldsFromForm({
      brokerId: data.brokerId || null,
      brokerCommissionPerDay: data.brokerCommissionPerDay,
      brokerCommissionPerExtraKm: data.brokerCommissionPerExtraKm,
      vehicleOwnershipType: vehicleOwner.ownershipType,
      ownerId: vehicleOwner.ownerId,
      ownerDailyRate: data.ownerDailyRate,
      ownerExtraKmRate: data.ownerExtraKmRate,
    });

    await prisma.rental.update({
      where: { id },
      data: {
        customerId: data.customerId,
        vehicleId,
        rentalType: data.rentalType,
        ratePlanType: data.ratePlanType,
        pickupDate: parseDate(data.pickupDate),
        pickupTime: data.pickupTime,
        returnDate: parseDate(data.returnDate),
        returnTime: data.returnTime,
        pickupLocation: data.pickupLocation || null,
        returnLocation: data.returnLocation || null,
        rentalDays: pricing.rentalDays,
        dailyRate,
        includedKm,
        extraKmRate,
        estimatedTotal: finalTotal,
        deliveryCharge: data.deliveryCharge ?? 0,
        driverCharge: data.driverCharge ?? 0,
        otherCharges: data.otherCharges ?? 0,
        discount: data.discount ?? 0,
        securityDeposit: data.securityDeposit ?? 0,
        finalTotal,
        balance,
        driverId: data.driverId || null,
        brokerId: data.brokerId || null,
        brokerCommissionPerDay: commissionFields.brokerCommissionPerDay,
        brokerCommissionPerExtraKm: commissionFields.brokerCommissionPerExtraKm,
        ownerDailyRate: commissionFields.ownerDailyRate,
        ownerExtraKmRate: commissionFields.ownerExtraKmRate,
        startingOdometer: existing.handover ? undefined : (data.startingOdometer ?? null),
        notes: data.notes || null,
        updatedById: session.user.id,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "Rental",
      entityId: id,
      details: { bookingNumber: existing.bookingNumber },
    });

    revalidatePath("/rentals");
    revalidatePath(`/rentals/${id}`);
    invalidateOperationalCaches();
    return { success: true, message: "Rental updated successfully" };
  } catch (error) {
    console.error("updateRental:", error);
    return { success: false, error: "Failed to update rental" };
  }
}

function refreshRentalStatusViews(id: string) {
  try {
    revalidatePath("/rentals");
    revalidatePath(`/rentals/${id}`);
    revalidatePath("/settlements");
    revalidatePath("/owners");
    revalidatePath("/brokers");
    revalidatePath("/expenses");
    revalidatePath("/reports");
    invalidateOperationalCaches();
  } catch (error) {
    console.error("refreshRentalStatusViews:", error);
  }
}

export async function updateRentalStatus(
  id: string,
  newStatus: RentalStatus,
  permission: Permission = "rentals.edit"
): Promise<ActionResult> {
  try {
    const session = await requirePermission(permission);
    const rental = await prisma.rental.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        vehicleId: true,
        pickupDate: true,
        returnDate: true,
        handover: { select: { id: true } },
        returnRecord: { select: { id: true } },
      },
    });
    if (!rental) return { success: false, error: "Rental not found" };

    if (newStatus === "COMPLETED") {
      if (rental.status !== "COMPLETED" && rental.status !== "RETURNED") {
        return { success: false, error: `Cannot change status from ${rental.status} to COMPLETED` };
      }

      try {
        await markRentalCompleted(id, session.user.id);
      } catch (error) {
        console.error("completeRental status update:", error);
        return { success: false, error: "Failed to update status" };
      }

      try {
        await createSettlementsForCompletedRental(id);
      } catch (error) {
        console.error("createSettlementsForCompletedRental:", error);
      }

      try {
        await createAuditLog({
          userId: session.user.id,
          action: "STATUS_CHANGE",
          entityType: "Rental",
          entityId: id,
          details: { from: rental.status, to: "COMPLETED" },
        });
      } catch (error) {
        console.error("createAuditLog:", error);
      }

      refreshRentalStatusViews(id);
      return { success: true, message: "Rental status updated to COMPLETED" };
    }

    if (!canTransition(rental.status, newStatus)) {
      return { success: false, error: `Cannot change status from ${rental.status} to ${newStatus}` };
    }

    if (newStatus === "CONFIRMED") {
      if (!rental.vehicleId) {
        return { success: false, error: "Assign a vehicle before confirming the rental" };
      }
      const { available, conflicts } = await checkVehicleAvailability(
        rental.vehicleId,
        rental.pickupDate,
        rental.returnDate,
        id
      );
      if (!available) {
        return { success: false, error: `Vehicle not available: ${conflicts.map((c) => c.label).join(", ")}` };
      }
    }

    if (newStatus === "ACTIVE" && !rental.handover) {
      return { success: false, error: "Record vehicle handover before activating the rental" };
    }

    if (newStatus === "RETURNED" && !rental.returnRecord) {
      return { success: false, error: "Record vehicle return before marking as returned" };
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.rental.update({
          where: { id },
          data: { status: newStatus, updatedById: session.user.id },
        });

        if (rental.vehicleId) {
          if (newStatus === "CANCELLED") {
            await releaseVehicleForRental(rental.vehicleId, id, tx);
          } else {
            await syncVehicleStatusForRental(rental.vehicleId, newStatus, tx);
          }
        }
      },
      { timeout: 10000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
    );

    if (newStatus === "RETURNED") {
      try {
        await createSettlementsForCompletedRental(id);
      } catch (error) {
        console.error("createSettlementsForCompletedRental:", error);
      }
    }

    try {
      await createAuditLog({
        userId: session.user.id,
        action: "STATUS_CHANGE",
        entityType: "Rental",
        entityId: id,
        details: { from: rental.status, to: newStatus },
      });
    } catch (error) {
      console.error("createAuditLog:", error);
    }

    refreshRentalStatusViews(id);
    return { success: true, message: `Rental status updated to ${newStatus}` };
  } catch (error) {
    console.error("updateRentalStatus:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2028" || error.code === "P2034") {
        return { success: false, error: "Complete timed out. Please try again." };
      }
    }
    if (error instanceof Error && /transaction/i.test(error.message)) {
      return { success: false, error: "Could not complete this hire. Please try Complete Rental again." };
    }
    return { success: false, error: "Failed to update status" };
  }
}

export async function assignVehicleToRental(
  rentalId: string,
  vehicleId: string
): Promise<ActionResult> {
  try {
    const session = await requirePermission("rentals.edit");
    const parsed = assignVehicleSchema.safeParse({ vehicleId });
    if (!parsed.success) return { success: false, error: "Vehicle is required" };

    const rental = await getRentalById(rentalId);
    if (!rental) return { success: false, error: "Rental not found" };
    if (!["INQUIRY", "QUOTED", "CONFIRMED"].includes(rental.status)) {
      return { success: false, error: "Cannot assign vehicle in current status" };
    }

    const { available, conflicts } = await checkVehicleAvailability(
      vehicleId,
      rental.pickupDate,
      rental.returnDate,
      rentalId
    );
    if (!available) {
      return { success: false, error: `Vehicle not available: ${conflicts.map((c) => c.label).join(", ")}` };
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return { success: false, error: "Vehicle not found" };

    const pricing = await computeRentalPricing({
      pickupDate: rental.pickupDate.toISOString().split("T")[0],
      pickupTime: rental.pickupTime,
      returnDate: rental.returnDate.toISOString().split("T")[0],
      returnTime: rental.returnTime,
      ratePlanType: rental.ratePlanType,
      dailyRate: Number(vehicle.dailyRate),
      weeklyRate: vehicle.weeklyRate ? Number(vehicle.weeklyRate) : undefined,
      monthlyRate: vehicle.monthlyRate ? Number(vehicle.monthlyRate) : undefined,
      includedKm: vehicle.includedKm,
      includedKmExtraDay: vehicle.includedKm,
      extraKmRate: Number(vehicle.extraKmRate),
      deliveryCharge: Number(rental.deliveryCharge),
      driverCharge: Number(rental.driverCharge),
      otherCharges: Number(rental.otherCharges),
      discount: Number(rental.discount),
    });

    const finalTotal = pricing.finalTotal;
    const balance = calculateBalance(finalTotal, Number(rental.totalPaid));
    const commissionFields = rentalCommissionFieldsFromForm({
      brokerId: rental.brokerId,
      brokerCommissionPerDay:
        rental.brokerCommissionPerDay != null ? Number(rental.brokerCommissionPerDay) : null,
      brokerCommissionPerExtraKm:
        rental.brokerCommissionPerExtraKm != null
          ? Number(rental.brokerCommissionPerExtraKm)
          : null,
      vehicleOwnershipType: vehicle.ownershipType,
      ownerId: vehicle.ownerId,
      ownerDailyRate: vehicle.ownerDailyRate != null ? Number(vehicle.ownerDailyRate) : null,
      ownerExtraKmRate:
        vehicle.ownerExtraKmRate != null ? Number(vehicle.ownerExtraKmRate) : null,
    });

    await prisma.$transaction(async (tx) => {
      if (rental.vehicleId && rental.vehicleId !== vehicleId) {
        await releaseVehicleForRental(rental.vehicleId, rentalId, tx);
      }

      await tx.rental.update({
        where: { id: rentalId },
        data: {
          vehicleId,
          dailyRate: vehicle.dailyRate,
          includedKm: vehicle.includedKm,
          extraKmRate: vehicle.extraKmRate,
          rentalDays: pricing.rentalDays,
          estimatedTotal: finalTotal,
          finalTotal,
          balance,
          ownerDailyRate: commissionFields.ownerDailyRate,
          ownerExtraKmRate: commissionFields.ownerExtraKmRate,
          updatedById: session.user.id,
        },
      });

      if (rental.status === "CONFIRMED") {
        await tx.vehicle.update({ where: { id: vehicleId }, data: { status: "RESERVED" } });
      }
    });

    await createAuditLog({
      userId: session.user.id,
      action: "ASSIGN",
      entityType: "Rental",
      entityId: rentalId,
      details: { vehicleId, registrationNumber: vehicle.registrationNumber },
    });

    revalidatePath(`/rentals/${rentalId}`);
    invalidateOperationalCaches();
    return { success: true, message: "Vehicle assigned successfully" };
  } catch (error) {
    console.error("assignVehicleToRental:", error);
    return { success: false, error: "Failed to assign vehicle" };
  }
}

export async function recordHandover(
  rentalId: string,
  input: HandoverFormValues
): Promise<ActionResult<{ whatsapp: HandoverWhatsAppPayload }>> {
  try {
    const session = await requirePermission("rentals.handover");
    const parsed = handoverSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    const rental = await getRentalById(rentalId);
    if (!rental) return { success: false, error: "Rental not found" };
    if (!rental.vehicleId) return { success: false, error: "No vehicle assigned" };
    if (!["CONFIRMED", "ACTIVE"].includes(rental.status)) {
      return { success: false, error: "Handover only allowed for confirmed rentals" };
    }
    if (rental.handover) return { success: false, error: "Handover already recorded" };

    const data = parsed.data;

    const startingOdometer =
      rental.startingOdometer ?? rental.vehicle?.currentOdometer ?? null;
    if (startingOdometer == null) {
      return {
        success: false,
        error: "Set the starting odometer when creating the rental before handover.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.rentalHandover.create({
        data: {
          rentalId,
          handoverDate: parseDate(data.handoverDate),
          handoverTime: data.handoverTime,
          startingOdometer,
          startingFuelLevel: data.startingFuelLevel,
          vehicleCondition: data.vehicleCondition || null,
          existingDamage: data.existingDamage || null,
          notes: data.notes || null,
          customerAcknowledged: data.customerAcknowledged ?? false,
        },
      });

      await tx.vehicle.update({
        where: { id: rental.vehicleId! },
        data: { currentOdometer: startingOdometer, status: "RENTED" },
      });

      await tx.rental.update({
        where: { id: rentalId },
        data: { status: "ACTIVE", updatedById: session.user.id },
      });
    });

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entityType: "RentalHandover",
      entityId: rentalId,
      details: { startingOdometer },
    });

    const settings = await getSystemSettings();
    const whatsapp = buildHandoverWhatsAppPayload(
      rentalToHandoverWhatsAppInput(rental, {
        companyName: settings.company_name,
        currencySymbol: settings.currency_symbol,
        pickupDate: parseDate(data.handoverDate),
        pickupTime: data.handoverTime,
        startingOdometer,
        startingFuelLevel: data.startingFuelLevel,
      })
    );

    revalidatePath(`/rentals/${rentalId}`);
    revalidatePath("/vehicles");
    invalidateOperationalCaches();
    return {
      success: true,
      message: whatsapp.url
        ? "Handover recorded. Opening WhatsApp with the rental details."
        : "Handover recorded. Add a customer WhatsApp number to send the details.",
      data: { whatsapp },
    };
  } catch (error) {
    console.error("recordHandover:", error);
    return { success: false, error: "Failed to record handover" };
  }
}

export async function getHandoverWhatsAppDetails(
  rentalId: string
): Promise<ActionResult<{ whatsapp: HandoverWhatsAppPayload }>> {
  try {
    await requirePermission("rentals.handover");
    const rental = await getRentalById(rentalId);
    if (!rental) return { success: false, error: "Rental not found" };
    if (!rental.handover) return { success: false, error: "Record handover first" };

    const settings = await getSystemSettings();
    const whatsapp = buildHandoverWhatsAppPayload(
      rentalToHandoverWhatsAppInput(rental, {
        companyName: settings.company_name,
        currencySymbol: settings.currency_symbol,
        pickupDate: rental.handover.handoverDate,
        pickupTime: rental.handover.handoverTime,
        startingOdometer: rental.handover.startingOdometer,
        startingFuelLevel: rental.handover.startingFuelLevel,
      })
    );

    return { success: true, data: { whatsapp } };
  } catch (error) {
    console.error("getHandoverWhatsAppDetails:", error);
    return { success: false, error: "Failed to prepare WhatsApp message" };
  }
}

export async function recordEndingOdometer(
  input: EndingOdometerRecordValues
): Promise<ActionResult<{ finalTotal: number; balance: number }>> {
  try {
    const session = await requirePermission("rentals.return");
    const parsed = endingOdometerRecordSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = parsed.data;
    const rental = await getRentalById(data.rentalId);
    if (!rental) return { success: false, error: "Rental not found" };
    if (!rental.handover) return { success: false, error: "Handover must be recorded first" };
    if (rental.returnRecord) return { success: false, error: "Return already recorded for this booking" };
    if (rental.status !== "ACTIVE") {
      return { success: false, error: "Only active rentals awaiting return can be updated" };
    }

    const startingOdometer =
      rental.startingOdometer ?? rental.handover.startingOdometer;

    if (data.endingOdometer < startingOdometer) {
      return { success: false, error: "Ending odometer cannot be less than starting odometer" };
    }

    const returnPricing = calculatePricing({
      dailyRate: Number(rental.dailyRate),
      rentalDays: rental.rentalDays,
      includedKmPerDay: rental.includedKm,
      includedKmExtraDay: rental.includedKm,
      extraKmRate: Number(rental.extraKmRate),
      ratePlanType: rental.ratePlanType,
      deliveryCharge: Number(rental.deliveryCharge),
      driverCharge: Number(rental.driverCharge),
      otherCharges: Number(rental.otherCharges),
      discount: Number(rental.discount),
      startingOdometer,
      endingOdometer: data.endingOdometer,
    });

    const finalTotal = returnPricing.finalTotal;
    const balance = calculateBalance(finalTotal, Number(rental.totalPaid));

    await prisma.$transaction(async (tx) => {
      await tx.rentalReturn.create({
        data: {
          rentalId: data.rentalId,
          returnDate: parseDate(data.returnDate),
          returnTime: data.returnTime,
          endingOdometer: data.endingOdometer,
          endingFuelLevel: "FULL",
          totalKm: returnPricing.totalKm,
          freeKm: returnPricing.includedKm,
          extraKm: returnPricing.extraKm,
          extraKmCharge: returnPricing.extraKmCharge,
          cleaningStatus: "CLEAN",
        },
      });

      if (rental.vehicleId) {
        await tx.vehicle.update({
          where: { id: rental.vehicleId },
          data: { currentOdometer: data.endingOdometer },
        });
      }

      await tx.rental.update({
        where: { id: data.rentalId },
        data: {
          status: "RETURNED",
          endingOdometer: data.endingOdometer,
          finalTotal,
          balance,
          extraKm: returnPricing.extraKm,
          extraKmCharge: returnPricing.extraKmCharge,
          updatedById: session.user.id,
        },
      });
    });

    try {
      await createSettlementsForCompletedRental(data.rentalId);
    } catch (error) {
      console.error("createSettlementsForCompletedRental:", error);
    }

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entityType: "RentalReturn",
      entityId: data.rentalId,
      details: {
        endingOdometer: data.endingOdometer,
        totalKm: returnPricing.totalKm,
        extraKm: returnPricing.extraKm,
        extraKmCharge: returnPricing.extraKmCharge,
        finalTotal,
      },
    });

    revalidatePath(`/rentals/${data.rentalId}`);
    revalidatePath("/rentals/record-ending-odometer");
    revalidatePath("/rentals");
    revalidatePath("/payments");
    invalidateOperationalCaches();
    return {
      success: true,
      data: { finalTotal, balance },
      message: "Ending odometer recorded. Final bill calculated — record cash received to complete the hire.",
    };
  } catch (error) {
    console.error("recordEndingOdometer:", error);
    return { success: false, error: "Failed to record ending odometer" };
  }
}

export async function updateEndingOdometer(
  input: UpdateEndingOdometerValues
): Promise<ActionResult<{ finalTotal: number; balance: number; previousEndingOdometer: number }>> {
  try {
    const session = await requirePermission("rentals.return");
    const parsed = updateEndingOdometerSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = parsed.data;
    const rental = await getRentalById(data.rentalId);
    if (!rental) return { success: false, error: "Rental not found" };
    if (!rental.handover) return { success: false, error: "Handover must be recorded first" };
    if (!rental.returnRecord) {
      return { success: false, error: "No ending odometer recorded yet — use Record ending odometer first" };
    }
    if (!["RETURNED", "COMPLETED"].includes(rental.status)) {
      return {
        success: false,
        error: "Ending odometer can only be corrected after the vehicle has been returned",
      };
    }

    const startingOdometer =
      rental.startingOdometer ?? rental.handover.startingOdometer;
    const previousEndingOdometer = rental.returnRecord.endingOdometer;

    if (data.endingOdometer < startingOdometer) {
      return { success: false, error: "Ending odometer cannot be less than starting odometer" };
    }

    if (data.endingOdometer === previousEndingOdometer) {
      return { success: false, error: "New ending odometer is the same as the current reading" };
    }

    const returnRecord = rental.returnRecord;
    const returnPricing = calculatePricing({
      dailyRate: Number(rental.dailyRate),
      rentalDays: rental.rentalDays,
      includedKmPerDay: rental.includedKm,
      includedKmExtraDay: rental.includedKm,
      extraKmRate: Number(rental.extraKmRate),
      ratePlanType: rental.ratePlanType,
      deliveryCharge: Number(rental.deliveryCharge),
      driverCharge: Number(rental.driverCharge),
      otherCharges:
        Number(rental.otherCharges) +
        Number(returnRecord.lateReturnCharge) +
        Number(returnRecord.additionalCharges),
      discount: Number(rental.discount),
      startingOdometer,
      endingOdometer: data.endingOdometer,
    });

    const finalTotal = returnPricing.finalTotal;
    const balance = calculateBalance(finalTotal, Number(rental.totalPaid));

    await prisma.$transaction(async (tx) => {
      await tx.rentalReturn.update({
        where: { rentalId: data.rentalId },
        data: {
          returnDate: parseDate(data.returnDate),
          returnTime: data.returnTime,
          endingOdometer: data.endingOdometer,
          totalKm: returnPricing.totalKm,
          freeKm: returnPricing.includedKm,
          extraKm: returnPricing.extraKm,
          extraKmCharge: returnPricing.extraKmCharge,
        },
      });

      if (rental.vehicleId) {
        await tx.vehicle.update({
          where: { id: rental.vehicleId },
          data: { currentOdometer: data.endingOdometer },
        });
      }

      await tx.rental.update({
        where: { id: data.rentalId },
        data: {
          endingOdometer: data.endingOdometer,
          finalTotal,
          balance,
          extraKm: returnPricing.extraKm,
          extraKmCharge: returnPricing.extraKmCharge,
          updatedById: session.user.id,
        },
      });
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "RentalReturn",
      entityId: data.rentalId,
      details: {
        previousEndingOdometer,
        endingOdometer: data.endingOdometer,
        previousFinalTotal: Number(rental.finalTotal),
        finalTotal,
        previousBalance: Number(rental.balance),
        balance,
        totalKm: returnPricing.totalKm,
        extraKm: returnPricing.extraKm,
        extraKmCharge: returnPricing.extraKmCharge,
      },
    });

    revalidatePath(`/rentals/${data.rentalId}`);
    revalidatePath("/rentals");
    revalidatePath("/payments");
    invalidateOperationalCaches();

    const message =
      Number(rental.totalPaid) > 0
        ? "Ending odometer corrected and final bill recalculated. Review balance — payments already recorded may need adjustment."
        : "Ending odometer corrected and final bill recalculated.";

    return {
      success: true,
      data: { finalTotal, balance, previousEndingOdometer },
      message,
    };
  } catch (error) {
    console.error("updateEndingOdometer:", error);
    return { success: false, error: "Failed to update ending odometer" };
  }
}

export async function recordReturn(
  rentalId: string,
  input: ReturnFormValues
): Promise<ActionResult> {
  try {
    const session = await requirePermission("rentals.return");
    const parsed = returnSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    const rental = await getRentalById(rentalId);
    if (!rental) return { success: false, error: "Rental not found" };
    if (!rental.handover) return { success: false, error: "Handover must be recorded first" };
    if (rental.returnRecord) return { success: false, error: "Return already recorded" };
    if (rental.status !== "ACTIVE") {
      return { success: false, error: "Return only allowed for active rentals" };
    }

    const data = parsed.data;
    const startingOdometer = rental.handover.startingOdometer;

    if (data.endingOdometer < startingOdometer) {
      return { success: false, error: "Ending odometer cannot be less than starting odometer" };
    }

    const returnPricing = calculatePricing({
      dailyRate: Number(rental.dailyRate),
      rentalDays: rental.rentalDays,
      includedKmPerDay: rental.includedKm,
      includedKmExtraDay: rental.includedKm,
      extraKmRate: Number(rental.extraKmRate),
      ratePlanType: rental.ratePlanType,
      deliveryCharge: Number(rental.deliveryCharge),
      driverCharge: Number(rental.driverCharge),
      otherCharges: Number(rental.otherCharges) + (data.additionalCharges ?? 0) + (data.lateReturnCharge ?? 0),
      discount: Number(rental.discount),
      startingOdometer,
      endingOdometer: data.endingOdometer,
    });

    const finalTotal = returnPricing.finalTotal;
    const balance = calculateBalance(finalTotal, Number(rental.totalPaid));

    await prisma.$transaction(async (tx) => {
      await tx.rentalReturn.create({
        data: {
          rentalId,
          returnDate: parseDate(data.returnDate),
          returnTime: data.returnTime,
          endingOdometer: data.endingOdometer,
          endingFuelLevel: data.endingFuelLevel,
          totalKm: returnPricing.totalKm,
          freeKm: returnPricing.includedKm,
          extraKm: returnPricing.extraKm,
          extraKmCharge: returnPricing.extraKmCharge,
          vehicleCondition: data.vehicleCondition || null,
          newDamage: data.newDamage || null,
          cleaningStatus: data.cleaningStatus,
          isLateReturn: data.isLateReturn ?? false,
          lateReturnCharge: data.lateReturnCharge ?? 0,
          additionalCharges: data.additionalCharges ?? 0,
          inspectionNotes: data.inspectionNotes || null,
        },
      });

      if (rental.vehicleId) {
        await tx.vehicle.update({
          where: { id: rental.vehicleId },
          data: { currentOdometer: data.endingOdometer },
        });
      }

      await tx.rental.update({
        where: { id: rentalId },
        data: {
          status: "RETURNED",
          finalTotal,
          balance,
          extraKm: returnPricing.extraKm,
          extraKmCharge: returnPricing.extraKmCharge,
          updatedById: session.user.id,
        },
      });
    });

    try {
      await createSettlementsForCompletedRental(rentalId);
    } catch (error) {
      console.error("createSettlementsForCompletedRental:", error);
    }

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entityType: "RentalReturn",
      entityId: rentalId,
      details: {
        totalKm: returnPricing.totalKm,
        extraKm: returnPricing.extraKm,
        extraKmCharge: returnPricing.extraKmCharge,
        finalTotal,
      },
    });

    revalidatePath(`/rentals/${rentalId}`);
    invalidateOperationalCaches();
    return { success: true, message: "Return recorded. Final amount calculated server-side." };
  } catch (error) {
    console.error("recordReturn:", error);
    return { success: false, error: "Failed to record return" };
  }
}

export async function completeRental(rentalId: string): Promise<ActionResult> {
  return updateRentalStatus(rentalId, "COMPLETED");
}

export async function cancelRental(rentalId: string): Promise<ActionResult> {
  return updateRentalStatus(rentalId, "CANCELLED", "rentals.cancel");
}

export async function quoteRental(rentalId: string): Promise<ActionResult> {
  return updateRentalStatus(rentalId, "QUOTED");
}

export async function confirmRental(rentalId: string): Promise<ActionResult> {
  return updateRentalStatus(rentalId, "CONFIRMED");
}
