import { prisma } from "@/lib/db";
import { generateCode, decimalToNumber, normalizeNic } from "@/lib/utils";
import type { DriverSearchParams } from "@/lib/validations/driver";
import type { EntityStatus, Prisma } from "@prisma/client";

export async function generateDriverCode(): Promise<string> {
  const [count, last] = await Promise.all([
    prisma.driver.count(),
    prisma.driver.findFirst({
      orderBy: { driverCode: "desc" },
      select: { driverCode: true },
    }),
  ]);

  let next = count + 1;
  if (last?.driverCode) {
    const match = last.driverCode.match(/(\d+)$/);
    if (match) {
      const lastSeq = parseInt(match[1], 10);
      if (!isNaN(lastSeq)) {
        next = Math.max(next, lastSeq + 1);
      }
    }
  }

  while (true) {
    const code = generateCode("DRV", next);
    const existing = await prisma.driver.findUnique({
      where: { driverCode: code },
      select: { id: true },
    });
    if (!existing) {
      return code;
    }
    next++;
  }
}

export async function getDrivers(params: DriverSearchParams) {
  const { search, status, page, limit, sortBy, sortOrder } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.DriverWhereInput = {
    deletedAt: null,
    ...(status && status !== "ALL" ? { status: status as EntityStatus } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { nic: { contains: search } },
            { phone: { contains: search } },
            { driverCode: { contains: search } },
          ],
        }
      : {}),
  };

  const [drivers, total] = await Promise.all([
    prisma.driver.findMany({
      where,
      include: { _count: { select: { rentals: true } } },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.driver.count({ where }),
  ]);

  return { drivers, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getDriverById(id: string) {
  return prisma.driver.findFirst({
    where: { id, deletedAt: null },
    include: {
      rentals: {
        include: {
          customer: { select: { fullName: true } },
          vehicle: { select: { registrationNumber: true, make: true, model: true } },
        },
        orderBy: { pickupDate: "desc" },
      },
      payments: {
        include: {
          rental: { select: { bookingNumber: true } },
        },
        orderBy: { paymentDate: "desc" },
      },
      expenses: {
        include: {
          rental: { select: { bookingNumber: true } },
        },
        orderBy: { expenseDate: "desc" },
      },
    },
  });
}

export async function getDriverStats(driverId: string) {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { dailyPayment: true },
  });

  const [rentalStats, paymentStats, expenseStats, activeRentals] = await Promise.all([
    prisma.rental.count({ where: { driverId } }),
    prisma.driverPayment.aggregate({
      where: { driverId },
      _sum: { amount: true },
    }),
    prisma.driverExpense.aggregate({
      where: { driverId },
      _sum: { amount: true },
    }),
    prisma.rental.findMany({
      where: { driverId, status: { in: ["ACTIVE", "CONFIRMED"] } },
      select: { rentalDays: true },
    }),
  ]);

  const totalPayments = decimalToNumber(paymentStats._sum.amount);
  const totalExpenses = decimalToNumber(expenseStats._sum.amount);

  const estimatedEarnings = activeRentals.reduce(
    (sum, r) => sum + r.rentalDays * decimalToNumber(driver?.dailyPayment),
    0
  );

  const completedRentals = await prisma.rental.findMany({
    where: { driverId, status: "COMPLETED" },
    select: { rentalDays: true },
  });

  const completedEarnings = completedRentals.reduce(
    (sum, r) => sum + r.rentalDays * decimalToNumber(driver?.dailyPayment),
    0
  );

  const totalEarnedEstimate = completedEarnings + estimatedEarnings;
  const outstandingPayments = Math.max(0, totalEarnedEstimate - totalPayments);

  return {
    totalRentals: rentalStats,
    activeRentals: activeRentals.length,
    totalPayments,
    totalExpenses,
    outstandingPayments,
    dailyPayment: decimalToNumber(driver?.dailyPayment),
  };
}

export async function isDriverNicTaken(nic: string, excludeId?: string): Promise<boolean> {
  const normalized = normalizeNic(nic);
  const existing = await prisma.driver.findFirst({
    where: {
      nic: normalized,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
  return !!existing;
}

export async function getActiveDrivers() {
  return prisma.driver.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    select: { id: true, name: true, driverCode: true, dailyPayment: true },
    orderBy: { name: "asc" },
  });
}

export async function getDriverRentalsForSelect(driverId: string) {
  return prisma.rental.findMany({
    where: { driverId },
    select: { id: true, bookingNumber: true, status: true },
    orderBy: { pickupDate: "desc" },
    take: 50,
  });
}

export { getLicenceExpiryStatus } from "@/lib/utils";
