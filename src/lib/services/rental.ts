import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";
import {
  calculatePricing,
  calculateRentalDays,
  combineDateAndTime,
  getRentalDayStartTime,
  getDefaultIncludedKmPolicy,
  calculateBalance,
} from "@/lib/services/pricing";
import { checkVehicleAvailability } from "@/lib/services/vehicle";
import type { RentalSearchParams } from "@/lib/validations/rental";
import type { PricingPreviewInput } from "@/lib/validations/rental";
import type { RentalStatus, Prisma, RatePlanType } from "@prisma/client";

export async function generateBookingNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const [count, last] = await Promise.all([
    prisma.rental.count({
      where: {
        OR: [
          { bookingNumber: { startsWith: `RK-${year}-` } },
          { bookingNumber: { startsWith: `RC-${year}-` } },
        ],
      },
    }),
    prisma.rental.findFirst({
      where: {
        OR: [
          { bookingNumber: { startsWith: `RK-${year}-` } },
          { bookingNumber: { startsWith: `RC-${year}-` } },
        ],
      },
      orderBy: { bookingNumber: "desc" },
      select: { bookingNumber: true },
    }),
  ]);

  let next = count + 1;
  if (last?.bookingNumber) {
    const match = last.bookingNumber.match(/(\d+)$/);
    if (match) {
      const lastSeq = parseInt(match[1], 10);
      if (!isNaN(lastSeq)) {
        next = Math.max(next, lastSeq + 1);
      }
    }
  }

  while (true) {
    const bookingNumber = `RK-${year}-${String(next).padStart(5, "0")}`;
    const existing = await prisma.rental.findUnique({
      where: { bookingNumber },
      select: { id: true },
    });
    if (!existing) {
      return bookingNumber;
    }
    next++;
  }
}

export const VALID_STATUS_TRANSITIONS: Record<RentalStatus, RentalStatus[]> = {
  INQUIRY: ["QUOTED", "CANCELLED"],
  QUOTED: ["CONFIRMED", "INQUIRY", "CANCELLED"],
  CONFIRMED: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["RETURNED", "CANCELLED"],
  RETURNED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: RentalStatus, to: RentalStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Cash collected after the vehicle is returned closes the hire. */
export function shouldCompleteHireOnPayment(input: {
  rentalStatus: RentalStatus;
  paymentMethod: string;
}): boolean {
  return input.rentalStatus === "RETURNED" && input.paymentMethod === "CASH";
}

export async function markRentalCompleted(
  rentalId: string,
  userId: string
): Promise<{ completed: boolean; alreadyCompleted: boolean }> {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    select: { id: true, status: true, vehicleId: true },
  });
  if (!rental) {
    throw new Error("Rental not found");
  }
  if (rental.status === "COMPLETED") {
    return { completed: true, alreadyCompleted: true };
  }
  if (rental.status !== "RETURNED") {
    return { completed: false, alreadyCompleted: false };
  }

  try {
    await prisma.rental.update({
      where: { id: rentalId },
      data: { status: "COMPLETED", updatedById: userId },
    });
  } catch (error) {
    console.error("completeRental status update:", error);
    const latest = await prisma.rental.findUnique({
      where: { id: rentalId },
      select: { status: true },
    });
    if (latest?.status !== "COMPLETED") {
      throw error instanceof Error ? error : new Error("Failed to update status");
    }
  }

  if (rental.vehicleId) {
    try {
      await syncVehicleStatusForRental(rental.vehicleId, "COMPLETED");
    } catch (error) {
      console.error("syncVehicleStatusForRental after complete:", error);
    }
  }

  return { completed: true, alreadyCompleted: false };
}

export async function getRentals(params: RentalSearchParams) {
  const { search, status, page, limit, sortBy, sortOrder } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.RentalWhereInput = {
    ...(status && status !== "ALL" ? { status: status as RentalStatus } : {}),
    ...(search
      ? {
          OR: [
            { bookingNumber: { contains: search } },
            { customer: { fullName: { contains: search } } },
            { customer: { nic: { contains: search } } },
            { customer: { phone: { contains: search } } },
            { vehicle: { registrationNumber: { contains: search } } },
          ],
        }
      : {}),
  };

  const [rentals, total] = await Promise.all([
    prisma.rental.findMany({
      where,
      include: {
        customer: { select: { id: true, fullName: true, status: true } },
        vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } },
        driver: { select: { name: true } },
        broker: { select: { name: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.rental.count({ where }),
  ]);

  return { rentals, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getRentalById(id: string) {
  return prisma.rental.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: { include: { owner: { select: { name: true } } } },
      driver: true,
      broker: true,
      createdBy: { select: { name: true } },
      updatedBy: { select: { name: true } },
      handover: true,
      returnRecord: true,
      payments: { orderBy: { paymentDate: "desc" } },
      charges: { orderBy: { createdAt: "desc" } },
      securityDeposits: { orderBy: { receivedDate: "desc" } },
      damages: { orderBy: { damageDate: "desc" } },
      ownerSettlement: { include: { owner: { select: { id: true, name: true, ownerCode: true, email: true } } } },
      brokerCommission: { include: { broker: { select: { id: true, name: true, brokerCode: true, email: true } } } },
    },
  });
}

export async function computeRentalPricing(input: PricingPreviewInput & {
  weeklyRate?: number;
  monthlyRate?: number;
}) {
  const dayBoundary = await getRentalDayStartTime();
  const pickupDate = new Date(input.pickupDate);
  const returnDate = new Date(input.returnDate);

  const rentalDays = calculateRentalDays(
    pickupDate,
    returnDate,
    input.pickupTime,
    input.returnTime,
    dayBoundary
  );

  return calculatePricing({
    dailyRate: input.dailyRate,
    rentalDays,
    includedKmPerDay: input.includedKm,
    includedKmExtraDay: input.includedKmExtraDay ?? input.includedKm,
    extraKmRate: input.extraKmRate,
    ratePlanType: input.ratePlanType as RatePlanType,
    weeklyRate: input.weeklyRate,
    monthlyRate: input.monthlyRate,
    deliveryCharge: input.deliveryCharge ?? 0,
    driverCharge: input.driverCharge ?? 0,
    otherCharges: input.otherCharges ?? 0,
    discount: input.discount ?? 0,
  });
}

export async function buildRentalPricingFromVehicle(
  vehicleId: string | null | undefined,
  formInput: PricingPreviewInput
) {
  let dailyRate = formInput.dailyRate;
  let includedKm = formInput.includedKm;
  let includedKmExtraDay = formInput.includedKmExtraDay ?? formInput.includedKm;
  let extraKmRate = formInput.extraKmRate;
  let weeklyRate = formInput.weeklyRate;
  let monthlyRate = formInput.monthlyRate;

  if (vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (vehicle) {
      // Use form rates when provided; fall back to vehicle defaults for empty values.
      if (!dailyRate) dailyRate = decimalToNumber(vehicle.dailyRate);
      if (!includedKm) includedKm = vehicle.includedKm;
      if (formInput.includedKmExtraDay == null) {
        includedKmExtraDay = vehicle.includedKm;
      }
      if (!extraKmRate) extraKmRate = decimalToNumber(vehicle.extraKmRate);
      weeklyRate = weeklyRate || (vehicle.weeklyRate ? decimalToNumber(vehicle.weeklyRate) : undefined);
      monthlyRate = monthlyRate || (vehicle.monthlyRate ? decimalToNumber(vehicle.monthlyRate) : undefined);
    }
  } else {
    const policy = await getDefaultIncludedKmPolicy();
    if (!includedKm) includedKm = policy.firstDayKm;
    if (formInput.includedKmExtraDay == null) includedKmExtraDay = policy.extraDayKm;
  }

  const pricing = await computeRentalPricing({
    ...formInput,
    dailyRate,
    includedKm,
    includedKmExtraDay,
    extraKmRate,
    weeklyRate,
    monthlyRate,
  });

  return { pricing, dailyRate, includedKm, includedKmExtraDay, extraKmRate, weeklyRate, monthlyRate };
}

export async function getActiveRentalsForEndingOdometer() {
  const rentals = await prisma.rental.findMany({
    where: {
      status: "ACTIVE",
      handover: { isNot: null },
      returnRecord: null,
    },
    select: {
      id: true,
      bookingNumber: true,
      startingOdometer: true,
      rentalDays: true,
      includedKm: true,
      extraKmRate: true,
      dailyRate: true,
      ratePlanType: true,
      deliveryCharge: true,
      driverCharge: true,
      otherCharges: true,
      discount: true,
      customer: { select: { fullName: true } },
      vehicle: { select: { registrationNumber: true, make: true, model: true } },
      handover: { select: { startingOdometer: true } },
    },
    orderBy: { returnDate: "asc" },
  });

  return rentals.map((rental) => ({
    id: rental.id,
    bookingNumber: rental.bookingNumber,
    startingOdometer: rental.startingOdometer ?? rental.handover?.startingOdometer ?? null,
    rentalDays: rental.rentalDays,
    includedKm: rental.includedKm,
    includedKmExtraDay: rental.includedKm,
    extraKmRate: decimalToNumber(rental.extraKmRate),
    dailyRate: decimalToNumber(rental.dailyRate),
    ratePlanType: rental.ratePlanType,
    deliveryCharge: decimalToNumber(rental.deliveryCharge),
    driverCharge: decimalToNumber(rental.driverCharge),
    otherCharges: decimalToNumber(rental.otherCharges),
    discount: decimalToNumber(rental.discount),
    customer: rental.customer,
    vehicle: rental.vehicle,
  }));
}

export async function releaseVehicleForRental(
  vehicleId: string,
  rentalId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma
) {
  const otherActive = await tx.rental.count({
    where: {
      vehicleId,
      id: { not: rentalId },
      status: { in: ["CONFIRMED", "ACTIVE", "QUOTED"] },
    },
  });

  if (otherActive === 0) {
    await tx.vehicle.update({
      where: { id: vehicleId },
      data: { status: "AVAILABLE" },
    });
  }
}

export async function syncVehicleStatusForRental(
  vehicleId: string,
  rentalStatus: RentalStatus,
  tx: Prisma.TransactionClient | typeof prisma = prisma
) {
  const statusMap: Partial<Record<RentalStatus, "AVAILABLE" | "RESERVED" | "RENTED">> = {
    CONFIRMED: "RESERVED",
    ACTIVE: "RENTED",
    RETURNED: "AVAILABLE",
    COMPLETED: "AVAILABLE",
    CANCELLED: "AVAILABLE",
  };

  const vehicleStatus = statusMap[rentalStatus];
  if (vehicleStatus) {
    await tx.vehicle.update({
      where: { id: vehicleId },
      data: { status: vehicleStatus },
    });
  }
}

export { checkVehicleAvailability };

export async function getRentalFormOptions() {
  const [customers, drivers, brokers, vehicles] = await Promise.all([
    prisma.customer.findMany({
      where: { deletedAt: null },
      select: { id: true, fullName: true, customerCode: true, nic: true, status: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.driver.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      select: { id: true, name: true, driverCode: true },
      orderBy: { name: "asc" },
    }),
    prisma.broker.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        brokerCode: true,
        defaultCommissionPerDay: true,
        defaultCommissionPerExtraKm: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.vehicle.findMany({
      where: { deletedAt: null, status: { notIn: ["INACTIVE"] } },
      select: {
        id: true,
        registrationNumber: true,
        make: true,
        model: true,
        dailyRate: true,
        includedKm: true,
        extraKmRate: true,
        ownerDailyRate: true,
        ownerExtraKmRate: true,
        ownershipType: true,
        ownerId: true,
        weeklyRate: true,
        monthlyRate: true,
        currentOdometer: true,
        status: true,
      },
      orderBy: { registrationNumber: "asc" },
    }),
  ]);

  return {
    customers,
    drivers,
    brokers: brokers.map((broker) => ({
      id: broker.id,
      name: broker.name,
      brokerCode: broker.brokerCode,
      defaultCommissionPerDay: decimalToNumber(broker.defaultCommissionPerDay),
      defaultCommissionPerExtraKm: decimalToNumber(broker.defaultCommissionPerExtraKm),
    })),
    vehicles: vehicles.map((vehicle) => ({
      id: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      make: vehicle.make,
      model: vehicle.model,
      dailyRate: decimalToNumber(vehicle.dailyRate),
      includedKm: vehicle.includedKm,
      includedKmExtraDay: vehicle.includedKm,
      extraKmRate: decimalToNumber(vehicle.extraKmRate),
      ownerDailyRate:
        vehicle.ownerDailyRate != null ? decimalToNumber(vehicle.ownerDailyRate) : null,
      ownerExtraKmRate:
        vehicle.ownerExtraKmRate != null ? decimalToNumber(vehicle.ownerExtraKmRate) : null,
      ownershipType: vehicle.ownershipType,
      ownerId: vehicle.ownerId,
      weeklyRate: vehicle.weeklyRate != null ? decimalToNumber(vehicle.weeklyRate) : null,
      monthlyRate: vehicle.monthlyRate != null ? decimalToNumber(vehicle.monthlyRate) : null,
      currentOdometer: vehicle.currentOdometer,
      status: vehicle.status,
    })),
  };
}
