import { prisma } from "@/lib/db";
import { generateCode, decimalToNumber } from "@/lib/utils";
import type {
  VehicleSearchParams,
  DocumentExpirySearchParams,
} from "@/lib/validations/vehicle";
import type {
  OwnershipType,
  VehicleStatus,
  VehicleType,
  Prisma,
  DocumentType,
} from "@prisma/client";
import { addDays, startOfDay, endOfDay } from "date-fns";

export async function generateVehicleCode(): Promise<string> {
  const [count, last] = await Promise.all([
    prisma.vehicle.count(),
    prisma.vehicle.findFirst({
      orderBy: { vehicleCode: "desc" },
      select: { vehicleCode: true },
    }),
  ]);

  let next = count + 1;
  if (last?.vehicleCode) {
    const match = last.vehicleCode.match(/(\d+)$/);
    if (match) {
      const lastSeq = parseInt(match[1], 10);
      if (!isNaN(lastSeq)) {
        next = Math.max(next, lastSeq + 1);
      }
    }
  }

  while (true) {
    const code = generateCode("VEH", next);
    const existing = await prisma.vehicle.findUnique({
      where: { vehicleCode: code },
      select: { id: true },
    });
    if (!existing) {
      return code;
    }
    next++;
  }
}

export async function getVehicles(params: VehicleSearchParams) {
  const { search, status, ownershipType, vehicleType, page, limit, sortBy, sortOrder } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.VehicleWhereInput = {
    deletedAt: null,
    ...(status && status !== "ALL" ? { status: status as VehicleStatus } : {}),
    ...(ownershipType && ownershipType !== "ALL"
      ? { ownershipType: ownershipType as OwnershipType }
      : {}),
    ...(vehicleType && vehicleType !== "ALL" ? { vehicleType: vehicleType as VehicleType } : {}),
    ...(search
      ? {
          OR: [
            { registrationNumber: { contains: search } },
            { make: { contains: search } },
            { model: { contains: search } },
            { vehicleCode: { contains: search } },
          ],
        }
      : {}),
  };

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, ownerCode: true } },
        rentals: {
          where: { status: { in: ["CONFIRMED", "ACTIVE"] } },
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            pickupDate: true,
            pickupTime: true,
            returnDate: true,
            returnTime: true,
            customer: { select: { id: true, fullName: true } },
          },
          orderBy: { pickupDate: "asc" },
          take: 1,
        },
        _count: { select: { rentals: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.vehicle.count({ where }),
  ]);

  return { vehicles, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getVehicleById(id: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, deletedAt: null },
    include: {
      owner: true,
      documents: { orderBy: { expiryDate: "asc" } },
      unavailablePeriods: { orderBy: { startDate: "desc" } },
      maintenance: { orderBy: { date: "desc" }, take: 10 },
      rentals: {
        include: {
          customer: { select: { fullName: true, customerCode: true } },
        },
        orderBy: { pickupDate: "desc" },
        take: 20,
      },
      damages: {
        include: {
          customer: { select: { fullName: true } },
          rental: { select: { bookingNumber: true } },
        },
        orderBy: { damageDate: "desc" },
        take: 10,
      },
    },
  });

  if (!vehicle) return null;

  const currentHire = await prisma.rental.findFirst({
    where: {
      vehicleId: id,
      status: { in: ["CONFIRMED", "ACTIVE"] },
    },
    select: {
      id: true,
      bookingNumber: true,
      status: true,
      pickupDate: true,
      pickupTime: true,
      returnDate: true,
      returnTime: true,
      customer: { select: { id: true, fullName: true, phone: true } },
    },
    orderBy: { pickupDate: "asc" },
  });

  return { ...vehicle, currentHire };
}

export async function getVehicleStats(vehicleId: string) {
  const [rentalStats, revenueStats, maintenanceCost] = await Promise.all([
    prisma.rental.count({
      where: { vehicleId, status: { in: ["COMPLETED", "ACTIVE", "RETURNED"] } },
    }),
    prisma.rental.aggregate({
      where: { vehicleId, status: "COMPLETED" },
      _sum: { finalTotal: true },
    }),
    prisma.vehicleMaintenance.aggregate({
      where: { vehicleId },
      _sum: { cost: true },
    }),
  ]);

  return {
    totalRentals: rentalStats,
    totalRevenue: decimalToNumber(revenueStats._sum.finalTotal),
    maintenanceCost: decimalToNumber(maintenanceCost._sum.cost),
  };
}

export async function isRegistrationTaken(
  registrationNumber: string,
  excludeId?: string
): Promise<boolean> {
  const normalized = registrationNumber.trim().toUpperCase();
  const existing = await prisma.vehicle.findFirst({
    where: {
      registrationNumber: normalized,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
  return !!existing;
}

export async function getDocumentExpiryReport(params: DocumentExpirySearchParams) {
  const { days, documentType, page, limit } = params;
  const skip = (page - 1) * limit;
  const now = new Date();
  const threshold = addDays(now, days);

  const where: Prisma.VehicleDocumentWhereInput = {
    expiryDate: { not: null },
    vehicle: { deletedAt: null },
    ...(documentType && documentType !== "ALL"
      ? { documentType: documentType as DocumentType }
      : {}),
  };

  const documents = await prisma.vehicleDocument.findMany({
    where,
    include: {
      vehicle: { select: { id: true, registrationNumber: true, make: true, model: true, status: true } },
    },
    orderBy: { expiryDate: "asc" },
  });

  const filtered = documents
    .map((doc) => {
      const expiry = doc.expiryDate!;
      let severity: "expired" | "critical" | "warning" | "ok" = "ok";
      if (expiry < now) severity = "expired";
      else if (expiry <= addDays(now, 7)) severity = "critical";
      else if (expiry <= addDays(now, 30)) severity = "warning";

      return { ...doc, severity };
    })
    .filter((doc) => doc.expiryDate! <= threshold || doc.severity === "expired");

  const total = filtered.length;
  const paginated = filtered.slice(skip, skip + limit);

  return { documents: paginated, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export { getDocumentExpiryStatus } from "@/lib/utils";

export type AvailabilityConflict = {
  type: "rental" | "maintenance" | "unavailable" | "status";
  label: string;
  startDate: Date;
  endDate: Date;
};

export async function checkVehicleAvailability(
  vehicleId: string,
  startDate: Date,
  endDate: Date,
  excludeRentalId?: string
): Promise<{ available: boolean; conflicts: AvailabilityConflict[] }> {
  const conflicts: AvailabilityConflict[] = [];
  const rangeStart = startOfDay(startDate);
  const rangeEnd = endOfDay(endDate);

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, deletedAt: null },
  });

  if (!vehicle) {
    return { available: false, conflicts: [{ type: "status", label: "Vehicle not found", startDate: rangeStart, endDate: rangeEnd }] };
  }

  if (vehicle.status === "INACTIVE" || vehicle.status === "MAINTENANCE" || vehicle.status === "UNAVAILABLE") {
    conflicts.push({
      type: "status",
      label: `Vehicle status: ${vehicle.status}`,
      startDate: rangeStart,
      endDate: rangeEnd,
    });
  }

  const overlappingRentals = await prisma.rental.findMany({
    where: {
      vehicleId,
      status: { in: ["CONFIRMED", "ACTIVE", "QUOTED"] },
      ...(excludeRentalId ? { NOT: { id: excludeRentalId } } : {}),
      pickupDate: { lte: rangeEnd },
      returnDate: { gte: rangeStart },
    },
    select: { id: true, bookingNumber: true, pickupDate: true, returnDate: true, status: true },
  });

  for (const rental of overlappingRentals) {
    conflicts.push({
      type: "rental",
      label: `Rental ${rental.bookingNumber} (${rental.status})`,
      startDate: rental.pickupDate,
      endDate: rental.returnDate,
    });
  }

  const overlappingUnavailable = await prisma.vehicleUnavailablePeriod.findMany({
    where: {
      vehicleId,
      startDate: { lte: rangeEnd },
      endDate: { gte: rangeStart },
    },
  });

  for (const period of overlappingUnavailable) {
    conflicts.push({
      type: "unavailable",
      label: period.reason || "Unavailable period",
      startDate: period.startDate,
      endDate: period.endDate,
    });
  }

  return { available: conflicts.length === 0, conflicts };
}

export async function getAvailableVehicles(params: {
  startDate: Date;
  endDate: Date;
  vehicleType?: VehicleType | "ALL";
}) {
  const { startDate, endDate, vehicleType } = params;

  const vehicles = await prisma.vehicle.findMany({
    where: {
      deletedAt: null,
      status: { in: ["AVAILABLE", "RESERVED", "RENTED"] },
      ...(vehicleType && vehicleType !== "ALL" ? { vehicleType } : {}),
    },
    include: {
      owner: { select: { name: true } },
      documents: {
        where: { documentType: "INSURANCE" },
        orderBy: { expiryDate: "desc" },
        take: 1,
      },
    },
    orderBy: { registrationNumber: "asc" },
  });

  const results = await Promise.all(
    vehicles.map(async (vehicle) => {
      const { available, conflicts } = await checkVehicleAvailability(
        vehicle.id,
        startDate,
        endDate
      );
      return { vehicle, available, conflicts };
    })
  );

  return results;
}

export async function getVehicleAvailabilityCalendar(vehicleId: string, month: Date) {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);

  const [rentals, unavailable, maintenance] = await Promise.all([
    prisma.rental.findMany({
      where: {
        vehicleId,
        status: { in: ["CONFIRMED", "ACTIVE", "QUOTED"] },
        pickupDate: { lte: monthEnd },
        returnDate: { gte: monthStart },
      },
      select: {
        bookingNumber: true,
        pickupDate: true,
        returnDate: true,
        status: true,
        customer: { select: { fullName: true } },
      },
    }),
    prisma.vehicleUnavailablePeriod.findMany({
      where: {
        vehicleId,
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
    }),
    prisma.vehicleMaintenance.findMany({
      where: {
        vehicleId,
        date: { gte: monthStart, lte: monthEnd },
      },
      select: { maintenanceCode: true, date: true, maintenanceType: true },
    }),
  ]);

  return { rentals, unavailable, maintenance };
}
