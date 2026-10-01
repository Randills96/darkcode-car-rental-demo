import { prisma } from "@/lib/db";
import { generateCode, decimalToNumber } from "@/lib/utils";
import type { OwnerSearchParams } from "@/lib/validations/owner";
import type { EntityStatus, Prisma } from "@prisma/client";

export async function generateOwnerCode(): Promise<string> {
  const [count, last] = await Promise.all([
    prisma.vehicleOwner.count(),
    prisma.vehicleOwner.findFirst({
      orderBy: { ownerCode: "desc" },
      select: { ownerCode: true },
    }),
  ]);

  let next = count + 1;
  if (last?.ownerCode) {
    const match = last.ownerCode.match(/(\d+)$/);
    if (match) {
      const lastSeq = parseInt(match[1], 10);
      if (!isNaN(lastSeq)) {
        next = Math.max(next, lastSeq + 1);
      }
    }
  }

  while (true) {
    const code = generateCode("OWN", next);
    const existing = await prisma.vehicleOwner.findUnique({
      where: { ownerCode: code },
      select: { id: true },
    });
    if (!existing) {
      return code;
    }
    next++;
  }
}

export async function getOwners(params: OwnerSearchParams) {
  const { search, status, page, limit, sortBy, sortOrder } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.VehicleOwnerWhereInput = {
    deletedAt: null,
    ...(status && status !== "ALL" ? { status: status as EntityStatus } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { ownerCode: { contains: search } },
            { nic: { contains: search } },
          ],
        }
      : {}),
  };

  const [owners, total] = await Promise.all([
    prisma.vehicleOwner.findMany({
      where,
      include: {
        _count: { select: { vehicles: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.vehicleOwner.count({ where }),
  ]);

  return { owners, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getOwnerById(id: string) {
  return prisma.vehicleOwner.findFirst({
    where: { id, deletedAt: null },
    include: {
      vehicles: {
        where: { deletedAt: null },
        orderBy: { registrationNumber: "asc" },
      },
      settlements: {
        include: { rental: { select: { id: true, bookingNumber: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}

export async function getOwnerStats(ownerId: string) {
  const vehicles = await prisma.vehicle.findMany({
    where: { ownerId, deletedAt: null },
    select: { id: true },
  });
  const vehicleIds = vehicles.map((v) => v.id);

  const [rentalCount, settlements] = await Promise.all([
    prisma.rental.count({
      where: { vehicleId: { in: vehicleIds }, status: { in: ["COMPLETED", "ACTIVE", "RETURNED"] } },
    }),
    prisma.ownerSettlement.aggregate({
      where: { ownerId },
      _sum: { rentalRevenue: true, companyCommission: true, ownerPayable: true, paidAmount: true },
    }),
  ]);

  const rentalRevenue = decimalToNumber(settlements._sum.rentalRevenue);
  const companyCommission = decimalToNumber(settlements._sum.companyCommission);
  const ownerPayable = decimalToNumber(settlements._sum.ownerPayable);
  const paidAmount = decimalToNumber(settlements._sum.paidAmount);

  return {
    vehicleCount: vehicles.length,
    rentalCount,
    rentalRevenue,
    companyCommission,
    ownerPayable,
    paidAmount,
    pendingAmount: ownerPayable - paidAmount,
  };
}

export async function getActiveOwners() {
  return prisma.vehicleOwner.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    select: { id: true, name: true, ownerCode: true },
    orderBy: { name: "asc" },
  });
}
