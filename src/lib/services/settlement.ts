import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";
import { CACHE_TAGS } from "@/lib/cache";
import { unstable_cache } from "next/cache";
import {
  calculateBrokerCommission,
  calculateOwnerSettlement,
  decimalField,
} from "@/lib/services/commission-calculator";
import type {
  OwnerSettlementSearchParams,
  BrokerCommissionSearchParams,
  DriverPaymentSearchParams,
} from "@/lib/validations/settlement";
import { Prisma, type SettlementStatus } from "@prisma/client";
import { createPayoutExpense, CASH_PAYOUT_NOTE_PREFIX, PAYABLE_NOTE_PREFIX, createMaintenanceExpense } from "@/lib/services/expense";

async function getSettingNumber(
  tx: Prisma.TransactionClient | typeof prisma,
  key: string,
  fallback: number
): Promise<number> {
  const setting = await tx.systemSetting.findUnique({ where: { key } });
  const parsed = setting?.value ? Number.parseFloat(setting.value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isDuplicateKeyError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return true;
  }
  return error instanceof Error && /duplicate entry/i.test(error.message);
}

function money(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

async function resolveExpenseUserId(
  tx: Prisma.TransactionClient | typeof prisma,
  preferred: string | null | undefined
) {
  if (preferred) return preferred;
  const user = await tx.user.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } });
  return user?.id ?? null;
}

async function ensureOwnerHireExpense(
  tx: Prisma.TransactionClient | typeof prisma,
  rental: {
    id: string;
    bookingNumber: string;
    vehicleId: string | null;
    createdById: string;
    updatedById: string | null;
    updatedAt?: Date;
  },
  settlement: { ownerId: string; ownerPayable: { toString(): string } | number }
) {
  try {
    const payableNote = `${PAYABLE_NOTE_PREFIX} owner-hire:${rental.id}`;
    const existing = await tx.expense.findFirst({
      where: {
        rentalId: rental.id,
        category: "OWNER_PAYMENT",
        OR: [{ notes: null }, { notes: { not: { startsWith: CASH_PAYOUT_NOTE_PREFIX } } }],
      },
      select: { id: true },
    });
    if (existing) return;

    const amount = money(decimalToNumber(settlement.ownerPayable));
    if (amount <= 0) return;

    const createdById = await resolveExpenseUserId(tx, rental.updatedById ?? rental.createdById);
    if (!createdById) return;

    await createPayoutExpense(tx, {
      category: "OWNER_PAYMENT",
      amount,
      expenseDate: rental.updatedAt ?? new Date(),
      description: `Owner payable — ${rental.bookingNumber}`,
      vehicleId: rental.vehicleId,
      rentalId: rental.id,
      ownerId: settlement.ownerId,
      notes: payableNote,
      createdById,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) return;
    console.error("ensureOwnerHireExpense:", error);
  }
}

async function ensureBrokerHireExpense(
  tx: Prisma.TransactionClient | typeof prisma,
  rental: {
    id: string;
    bookingNumber: string;
    vehicleId: string | null;
    createdById: string;
    updatedById: string | null;
    updatedAt?: Date;
  },
  commission: { brokerId: string; commissionAmount: { toString(): string } | number }
) {
  try {
    const payableNote = `${PAYABLE_NOTE_PREFIX} broker-hire:${rental.id}`;
    const existing = await tx.expense.findFirst({
      where: {
        rentalId: rental.id,
        category: "BROKER_COMMISSION",
        OR: [{ notes: null }, { notes: { not: { startsWith: CASH_PAYOUT_NOTE_PREFIX } } }],
      },
      select: { id: true },
    });
    if (existing) return;

    const amount = money(decimalToNumber(commission.commissionAmount));
    if (amount <= 0) return;

    const createdById = await resolveExpenseUserId(tx, rental.updatedById ?? rental.createdById);
    if (!createdById) return;

    await createPayoutExpense(tx, {
      category: "BROKER_COMMISSION",
      amount,
      expenseDate: rental.updatedAt ?? new Date(),
      description: `Broker commission payable — ${rental.bookingNumber}`,
      vehicleId: rental.vehicleId,
      rentalId: rental.id,
      brokerId: commission.brokerId,
      notes: payableNote,
      createdById,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) return;
    console.error("ensureBrokerHireExpense:", error);
  }
}

export async function recordSettlementCashPayout(input: {
  kind: "owner" | "broker";
  amount: number;
  expenseDate: Date;
  bookingNumber: string;
  vehicleId?: string | null;
  rentalId: string;
  ownerId?: string | null;
  brokerId?: string | null;
  settlementId: string;
  paidAmountTotal: number;
  referenceNumber?: string | null;
  notes?: string | null;
  createdById: string;
}) {
  const amount = money(input.amount);
  if (amount <= 0) return;

  const payoutKey = `${input.kind}-paid:${input.settlementId}:${money(input.paidAmountTotal)}`;
  const existing = await prisma.expense.findFirst({
    where: { notes: { contains: payoutKey } },
    select: { id: true },
  });
  if (existing) return;

  const extra = input.referenceNumber
    ? `Ref: ${input.referenceNumber}${input.notes ? ` — ${input.notes}` : ""}`
    : input.notes || "";

  await createPayoutExpense(prisma, {
    category: input.kind === "owner" ? "OWNER_PAYMENT" : "BROKER_COMMISSION",
    amount,
    expenseDate: input.expenseDate,
    description:
      input.kind === "owner"
        ? `Owner payment (paid) — ${input.bookingNumber}`
        : `Broker commission (paid) — ${input.bookingNumber}`,
    vehicleId: input.vehicleId,
    rentalId: input.rentalId,
    ownerId: input.ownerId,
    brokerId: input.brokerId,
    notes: `${CASH_PAYOUT_NOTE_PREFIX} ${payoutKey}${extra ? ` — ${extra}` : ""}`,
    createdById: input.createdById,
  });
}

export async function getDefaultOwnerCommission(
  tx: Prisma.TransactionClient | typeof prisma = prisma
): Promise<number> {
  return getSettingNumber(tx, "default_owner_commission", 30000);
}

export async function getDefaultBrokerCommission(
  tx: Prisma.TransactionClient | typeof prisma = prisma
): Promise<number> {
  return getSettingNumber(tx, "default_broker_commission", 5000);
}

export function resolveSettlementStatus(
  totalPayable: number,
  paidAmount: number
): SettlementStatus {
  if (paidAmount <= 0) return "PENDING";
  if (paidAmount >= totalPayable) return "PAID";
  return "PARTIALLY_PAID";
}

export async function createSettlementsForCompletedRental(
  rentalId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma
) {
  const rental = await tx.rental.findUnique({
    where: { id: rentalId },
    include: {
      vehicle: { select: { ownerId: true, ownershipType: true } },
      ownerSettlement: true,
      brokerCommission: true,
    },
  });

  if (!rental) return;

  const rentalDays = rental.rentalDays;
  const extraKm = rental.extraKm;
  const finalTotal = decimalToNumber(rental.finalTotal);
  const customerDailyRate = decimalToNumber(rental.dailyRate);
  const customerExtraKmRate = decimalToNumber(rental.extraKmRate);

  if (rental.vehicle?.ownerId && !rental.ownerSettlement) {
    const fallbackFlatCommission = await getDefaultOwnerCommission(tx);
    const ownerResult = calculateOwnerSettlement({
      ownershipType: rental.vehicle.ownershipType,
      ownerId: rental.vehicle.ownerId,
      ownerDailyRate: rental.ownerDailyRate != null ? decimalToNumber(rental.ownerDailyRate) : null,
      ownerExtraKmRate:
        rental.ownerExtraKmRate != null ? decimalToNumber(rental.ownerExtraKmRate) : null,
      customerDailyRate,
      customerExtraKmRate,
      rentalDays,
      extraKm,
      finalTotal,
      fallbackFlatCommission,
    });

    if (ownerResult) {
      try {
        await tx.ownerSettlement.upsert({
          where: { rentalId },
          create: {
            rentalId,
            ownerId: rental.vehicle.ownerId,
            rentalRevenue: money(ownerResult.rentalRevenue),
            companyCommission: money(ownerResult.companyCommission),
            ownerDailyRate: money(ownerResult.ownerDailyRate),
            ownerExtraKmRate: money(ownerResult.ownerExtraKmRate),
            billableDays: ownerResult.billableDays,
            billableExtraKm: ownerResult.billableExtraKm,
            ownerPayable: money(ownerResult.ownerPayable),
            status: "PENDING",
          },
          update: {},
        });
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
      }
    }
  }

  if (rental.brokerId && !rental.brokerCommission) {
    const fallbackFlatCommission = await getDefaultBrokerCommission(tx);
    const brokerResult = calculateBrokerCommission({
      brokerId: rental.brokerId,
      brokerCommissionPerDay:
        rental.brokerCommissionPerDay != null
          ? decimalToNumber(rental.brokerCommissionPerDay)
          : null,
      brokerCommissionPerExtraKm:
        rental.brokerCommissionPerExtraKm != null
          ? decimalToNumber(rental.brokerCommissionPerExtraKm)
          : null,
      rentalDays,
      extraKm,
      fallbackFlatCommission,
    });

    if (brokerResult) {
      try {
        await tx.brokerCommission.upsert({
          where: { rentalId },
          create: {
            rentalId,
            brokerId: rental.brokerId,
            rentalValue: money(finalTotal),
            commissionPerDay: money(brokerResult.commissionPerDay),
            commissionPerExtraKm: money(brokerResult.commissionPerExtraKm),
            billableDays: brokerResult.billableDays,
            billableExtraKm: brokerResult.billableExtraKm,
            commissionAmount: money(brokerResult.commissionAmount),
            status: "PENDING",
          },
          update: {},
        });
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
      }
    }
  }

  const ownerSettlement = await tx.ownerSettlement.findUnique({
    where: { rentalId },
    select: { ownerId: true, ownerPayable: true },
  });
  if (["RETURNED", "COMPLETED"].includes(rental.status) && ownerSettlement) {
    await ensureOwnerHireExpense(tx, rental, ownerSettlement);
  }

  const brokerCommission = await tx.brokerCommission.findUnique({
    where: { rentalId },
    select: { brokerId: true, commissionAmount: true },
  });
  if (["RETURNED", "COMPLETED"].includes(rental.status) && brokerCommission) {
    await ensureBrokerHireExpense(tx, rental, brokerCommission);
  }
}

export async function getOwnerSettlements(params: OwnerSettlementSearchParams) {
  const { search, status, page, limit, sortBy, sortOrder } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.OwnerSettlementWhereInput = {
    ...(status && status !== "ALL" ? { status: status as SettlementStatus } : {}),
    ...(search
      ? {
          OR: [
            { rental: { bookingNumber: { contains: search } } },
            { owner: { name: { contains: search } } },
            { owner: { ownerCode: { contains: search } } },
            { referenceNumber: { contains: search } },
          ],
        }
      : {}),
  };

  const [settlements, total] = await Promise.all([
    prisma.ownerSettlement.findMany({
      where,
      include: {
        rental: { select: { id: true, bookingNumber: true, status: true } },
        owner: { select: { id: true, name: true, ownerCode: true, email: true } },
        paidBy: { select: { name: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.ownerSettlement.count({ where }),
  ]);

  return { settlements, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getBrokerCommissions(params: BrokerCommissionSearchParams) {
  const { search, status, page, limit, sortBy, sortOrder } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.BrokerCommissionWhereInput = {
    ...(status && status !== "ALL" ? { status: status as SettlementStatus } : {}),
    ...(search
      ? {
          OR: [
            { rental: { bookingNumber: { contains: search } } },
            { broker: { name: { contains: search } } },
            { broker: { brokerCode: { contains: search } } },
            { referenceNumber: { contains: search } },
          ],
        }
      : {}),
  };

  const [commissions, total] = await Promise.all([
    prisma.brokerCommission.findMany({
      where,
      include: {
        rental: { select: { id: true, bookingNumber: true, status: true } },
        broker: { select: { id: true, name: true, brokerCode: true, email: true } },
        paidBy: { select: { name: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.brokerCommission.count({ where }),
  ]);

  return { commissions, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getDriverPaymentsList(params: DriverPaymentSearchParams) {
  const { search, page, limit, sortBy, sortOrder } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.DriverPaymentWhereInput = search
    ? {
        OR: [
          { referenceNumber: { contains: search } },
          { driver: { name: { contains: search } } },
          { driver: { driverCode: { contains: search } } },
          { rental: { bookingNumber: { contains: search } } },
        ],
      }
    : {};

  const [payments, total] = await Promise.all([
    prisma.driverPayment.findMany({
      where,
      include: {
        driver: { select: { id: true, name: true, driverCode: true } },
        rental: { select: { id: true, bookingNumber: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.driverPayment.count({ where }),
  ]);

  return { payments, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getOwnerSettlementById(id: string) {
  return prisma.ownerSettlement.findUnique({
    where: { id },
    include: {
      rental: { select: { id: true, bookingNumber: true, vehicleId: true } },
      owner: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getBrokerCommissionById(id: string) {
  return prisma.brokerCommission.findUnique({
    where: { id },
    include: {
      rental: { select: { id: true, bookingNumber: true, vehicleId: true } },
      broker: { select: { id: true, name: true, email: true } },
    },
  });
}

export const getSettlementsSummary = unstable_cache(
  async () => {
    const [ownerPending, brokerPending, driverPayments] = await Promise.all([
      prisma.ownerSettlement.aggregate({
        where: { status: { in: ["PENDING", "PARTIALLY_PAID"] } },
        _sum: { ownerPayable: true, paidAmount: true },
        _count: true,
      }),
      prisma.brokerCommission.aggregate({
        where: { status: { in: ["PENDING", "PARTIALLY_PAID"] } },
        _sum: { commissionAmount: true, paidAmount: true },
        _count: true,
      }),
      prisma.driverPayment.aggregate({ _sum: { amount: true }, _count: true }),
    ]);

    return {
      pendingOwnerCount: ownerPending._count,
      pendingOwnerAmount:
        decimalToNumber(ownerPending._sum.ownerPayable) -
        decimalToNumber(ownerPending._sum.paidAmount),
      pendingBrokerCount: brokerPending._count,
      pendingBrokerAmount:
        decimalToNumber(brokerPending._sum.commissionAmount) -
        decimalToNumber(brokerPending._sum.paidAmount),
      totalDriverPayments: driverPayments._count,
      totalDriverPaymentAmount: decimalToNumber(driverPayments._sum.amount),
    };
  },
  ["settlements-summary"],
  { revalidate: 30, tags: [CACHE_TAGS.dashboard] }
);

export { decimalField };

export async function backfillSettlementExpenses() {
  const legacyBrokerPays = await prisma.expense.findMany({
    where: {
      category: "BROKER_COMMISSION",
      description: { startsWith: "Broker commission —" },
      NOT: { notes: { startsWith: CASH_PAYOUT_NOTE_PREFIX } },
    },
    select: { id: true, notes: true, description: true },
  });
  for (const row of legacyBrokerPays) {
    if (row.description.includes("payable")) continue;
    await prisma.expense.update({
      where: { id: row.id },
      data: { notes: `${CASH_PAYOUT_NOTE_PREFIX} ${row.notes ?? "legacy-broker-payout"}` },
    });
  }

  const legacyPayouts = await prisma.expense.findMany({
    where: {
      category: { in: ["OWNER_PAYMENT", "BROKER_COMMISSION"] },
      description: { contains: "(paid)" },
      NOT: { notes: { startsWith: CASH_PAYOUT_NOTE_PREFIX } },
    },
    select: { id: true, notes: true },
  });
  for (const row of legacyPayouts) {
    await prisma.expense.update({
      where: { id: row.id },
      data: { notes: `${CASH_PAYOUT_NOTE_PREFIX} ${row.notes ?? "legacy-payout"}` },
    });
  }

  const hireRentals = await prisma.rental.findMany({
    where: { status: { in: ["RETURNED", "COMPLETED"] } },
    select: { id: true },
  });
  for (const rental of hireRentals) {
    await createSettlementsForCompletedRental(rental.id);
  }

  const paidOwners = await prisma.ownerSettlement.findMany({
    where: { paidAmount: { gt: 0 } },
    include: {
      rental: {
        select: {
          id: true,
          bookingNumber: true,
          vehicleId: true,
          createdById: true,
          updatedById: true,
        },
      },
    },
  });
  for (const settlement of paidOwners) {
    await recordSettlementCashPayout({
      kind: "owner",
      amount: decimalToNumber(settlement.paidAmount),
      expenseDate: settlement.paymentDate ?? settlement.updatedAt,
      bookingNumber: settlement.rental.bookingNumber,
      vehicleId: settlement.rental.vehicleId,
      rentalId: settlement.rental.id,
      ownerId: settlement.ownerId,
      settlementId: settlement.id,
      paidAmountTotal: decimalToNumber(settlement.paidAmount),
      createdById: settlement.paidById ?? settlement.rental.updatedById ?? settlement.rental.createdById,
    });
  }

  const paidBrokers = await prisma.brokerCommission.findMany({
    where: { paidAmount: { gt: 0 } },
    include: {
      rental: {
        select: {
          id: true,
          bookingNumber: true,
          vehicleId: true,
          createdById: true,
          updatedById: true,
        },
      },
    },
  });
  for (const commission of paidBrokers) {
    await recordSettlementCashPayout({
      kind: "broker",
      amount: decimalToNumber(commission.paidAmount),
      expenseDate: commission.paymentDate ?? commission.updatedAt,
      bookingNumber: commission.rental.bookingNumber,
      vehicleId: commission.rental.vehicleId,
      rentalId: commission.rental.id,
      brokerId: commission.brokerId,
      settlementId: commission.id,
      paidAmountTotal: decimalToNumber(commission.paidAmount),
      createdById: commission.paidById ?? commission.rental.updatedById ?? commission.rental.createdById,
    });
  }

  const maintenanceRows = await prisma.vehicleMaintenance.findMany({
    where: { cost: { gt: 0 } },
    select: {
      id: true,
      vehicleId: true,
      maintenanceType: true,
      cost: true,
      date: true,
      description: true,
      createdById: true,
    },
  });
  for (const row of maintenanceRows) {
    await createMaintenanceExpense({
      maintenanceId: row.id,
      vehicleId: row.vehicleId,
      maintenanceType: row.maintenanceType,
      amount: decimalToNumber(row.cost),
      date: row.date,
      description: row.description,
      createdById: row.createdById,
    });
  }

  return {
    hireRentals: hireRentals.length,
    paidOwners: paidOwners.length,
    paidBrokers: paidBrokers.length,
    maintenanceRows: maintenanceRows.length,
  };
}
