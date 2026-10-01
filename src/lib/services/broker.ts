import { prisma } from "@/lib/db";
import { generateCode, decimalToNumber } from "@/lib/utils";
import type { BrokerSearchParams } from "@/lib/validations/broker";
import type { EntityStatus, Prisma } from "@prisma/client";

export async function generateBrokerCode(): Promise<string> {
  const [count, last] = await Promise.all([
    prisma.broker.count(),
    prisma.broker.findFirst({
      orderBy: { brokerCode: "desc" },
      select: { brokerCode: true },
    }),
  ]);

  let next = count + 1;
  if (last?.brokerCode) {
    const match = last.brokerCode.match(/(\d+)$/);
    if (match) {
      const lastSeq = parseInt(match[1], 10);
      if (!isNaN(lastSeq)) {
        next = Math.max(next, lastSeq + 1);
      }
    }
  }

  while (true) {
    const code = generateCode("BRK", next);
    const existing = await prisma.broker.findUnique({
      where: { brokerCode: code },
      select: { id: true },
    });
    if (!existing) {
      return code;
    }
    next++;
  }
}

export async function getBrokers(params: BrokerSearchParams) {
  const { search, status, page, limit, sortBy, sortOrder } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.BrokerWhereInput = {
    deletedAt: null,
    ...(status && status !== "ALL" ? { status: status as EntityStatus } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { brokerCode: { contains: search } },
            { nic: { contains: search } },
          ],
        }
      : {}),
  };

  const [brokers, total] = await Promise.all([
    prisma.broker.findMany({
      where,
      include: { _count: { select: { rentals: true, commissions: true } } },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.broker.count({ where }),
  ]);

  return { brokers, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getBrokerById(id: string) {
  return prisma.broker.findFirst({
    where: { id, deletedAt: null },
    include: {
      rentals: {
        include: {
          customer: { select: { fullName: true } },
          vehicle: { select: { registrationNumber: true } },
        },
        orderBy: { pickupDate: "desc" },
      },
      commissions: {
        include: {
          rental: { select: { bookingNumber: true } },
          paidBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export type BrokerDetailClient = Omit<
  NonNullable<Awaited<ReturnType<typeof getBrokerById>>>,
  "defaultCommissionPerDay" | "defaultCommissionPerExtraKm" | "rentals" | "commissions"
> & {
  defaultCommissionPerDay: number;
  defaultCommissionPerExtraKm: number;
  rentals: Array<
    Omit<NonNullable<Awaited<ReturnType<typeof getBrokerById>>>["rentals"][number], "finalTotal"> & {
      finalTotal: number;
    }
  >;
  commissions: Array<
    Omit<
      NonNullable<Awaited<ReturnType<typeof getBrokerById>>>["commissions"][number],
      "rentalValue" | "commissionPerDay" | "commissionPerExtraKm" | "commissionAmount" | "paidAmount"
    > & {
      rentalValue: number;
      commissionPerDay: number;
      commissionPerExtraKm: number;
      commissionAmount: number;
      paidAmount: number;
    }
  >;
};

export function serializeBrokerDetail(
  broker: NonNullable<Awaited<ReturnType<typeof getBrokerById>>>
): BrokerDetailClient {
  return {
    ...broker,
    defaultCommissionPerDay: decimalToNumber(broker.defaultCommissionPerDay),
    defaultCommissionPerExtraKm: decimalToNumber(broker.defaultCommissionPerExtraKm),
    rentals: broker.rentals.map((rental) => ({
      ...rental,
      finalTotal: decimalToNumber(rental.finalTotal),
    })),
    commissions: broker.commissions.map((commission) => ({
      ...commission,
      rentalValue: decimalToNumber(commission.rentalValue),
      commissionPerDay: decimalToNumber(commission.commissionPerDay),
      commissionPerExtraKm: decimalToNumber(commission.commissionPerExtraKm),
      commissionAmount: decimalToNumber(commission.commissionAmount),
      paidAmount: decimalToNumber(commission.paidAmount),
    })),
  };
}

export async function getBrokerStats(brokerId: string) {
  const [bookingCount, commissionStats, rentalRevenue] = await Promise.all([
    prisma.rental.count({ where: { brokerId } }),
    prisma.brokerCommission.aggregate({
      where: { brokerId },
      _sum: { commissionAmount: true, paidAmount: true },
    }),
    prisma.rental.aggregate({
      where: { brokerId, status: { in: ["COMPLETED", "ACTIVE", "RETURNED"] } },
      _sum: { finalTotal: true },
    }),
  ]);

  const totalCommission = decimalToNumber(commissionStats._sum.commissionAmount);
  const paidCommission = decimalToNumber(commissionStats._sum.paidAmount);

  return {
    totalBookings: bookingCount,
    totalRentalRevenue: decimalToNumber(rentalRevenue._sum.finalTotal),
    totalCommission,
    paidCommission,
    pendingCommission: totalCommission - paidCommission,
  };
}

export async function getActiveBrokers() {
  return prisma.broker.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    select: { id: true, name: true, brokerCode: true },
    orderBy: { name: "asc" },
  });
}
