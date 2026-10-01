/**
 * Create missing Expense Management rows for owner payables, broker
 * commissions, cash payouts, and maintenance costs.
 *
 *   npx tsx --env-file=.env scripts/backfill-settlement-expenses.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CASH = "[PROFIT:NO]";
const PAYABLE = "[PAYABLE]";
const MAINT = "[MAINT:";

function money(value: unknown) {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? 0));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

async function expenseCode() {
  const count = await prisma.expense.count();
  const suffix = `${Date.now().toString(36).slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
  return `EXP-${String(count + 1).padStart(5, "0")}-${suffix}`;
}

async function createExpense(data: {
  category: "OWNER_PAYMENT" | "BROKER_COMMISSION" | "MAINTENANCE" | "REPAIR";
  amount: number;
  expenseDate: Date;
  description: string;
  vehicleId?: string | null;
  rentalId?: string | null;
  ownerId?: string | null;
  brokerId?: string | null;
  notes: string;
  createdById: string;
}) {
  if (!(data.amount > 0) || !data.createdById) return false;
  await prisma.expense.create({
    data: {
      expenseCode: await expenseCode(),
      category: data.category,
      amount: data.amount,
      expenseDate: data.expenseDate,
      description: data.description,
      vehicleId: data.vehicleId || null,
      rentalId: data.rentalId || null,
      ownerId: data.ownerId || null,
      brokerId: data.brokerId || null,
      notes: data.notes,
      createdById: data.createdById,
    },
  });
  return true;
}

async function main() {
  let created = 0;

  const fallbackUser = await prisma.user.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (!fallbackUser) throw new Error("No user found to own expense records");

  const ownerSettlements = await prisma.ownerSettlement.findMany({
    include: {
      rental: {
        select: {
          id: true,
          bookingNumber: true,
          vehicleId: true,
          createdById: true,
          updatedById: true,
          updatedAt: true,
          status: true,
        },
      },
    },
  });

  for (const settlement of ownerSettlements) {
    if (!["RETURNED", "COMPLETED"].includes(settlement.rental.status)) continue;
    const existingPayable = await prisma.expense.findFirst({
      where: {
        rentalId: settlement.rentalId,
        category: "OWNER_PAYMENT",
        OR: [{ notes: null }, { notes: { not: { startsWith: CASH } } }],
      },
      select: { id: true },
    });
    if (!existingPayable) {
      const ok = await createExpense({
        category: "OWNER_PAYMENT",
        amount: money(settlement.ownerPayable),
        expenseDate: settlement.rental.updatedAt,
        description: `Owner payable — ${settlement.rental.bookingNumber}`,
        vehicleId: settlement.rental.vehicleId,
        rentalId: settlement.rental.id,
        ownerId: settlement.ownerId,
        notes: `${PAYABLE} owner-hire:${settlement.rental.id}`,
        createdById: settlement.rental.updatedById ?? settlement.rental.createdById ?? fallbackUser.id,
      });
      if (ok) created += 1;
    }

    const paid = money(settlement.paidAmount);
    if (paid > 0) {
      const key = `owner-paid:${settlement.id}:${paid}`;
      const existingPaid = await prisma.expense.findFirst({
        where: { notes: { contains: key } },
        select: { id: true },
      });
      if (!existingPaid) {
        const ok = await createExpense({
          category: "OWNER_PAYMENT",
          amount: paid,
          expenseDate: settlement.paymentDate ?? settlement.updatedAt,
          description: `Owner payment (paid) — ${settlement.rental.bookingNumber}`,
          vehicleId: settlement.rental.vehicleId,
          rentalId: settlement.rental.id,
          ownerId: settlement.ownerId,
          notes: `${CASH} ${key}`,
          createdById: settlement.paidById ?? settlement.rental.createdById ?? fallbackUser.id,
        });
        if (ok) created += 1;
      }
    }
  }

  const brokerCommissions = await prisma.brokerCommission.findMany({
    include: {
      rental: {
        select: {
          id: true,
          bookingNumber: true,
          vehicleId: true,
          createdById: true,
          updatedById: true,
          updatedAt: true,
          status: true,
        },
      },
    },
  });

  for (const commission of brokerCommissions) {
    if (!["RETURNED", "COMPLETED"].includes(commission.rental.status)) continue;
    const existingPayable = await prisma.expense.findFirst({
      where: {
        rentalId: commission.rentalId,
        category: "BROKER_COMMISSION",
        OR: [{ notes: null }, { notes: { not: { startsWith: CASH } } }],
      },
      select: { id: true },
    });
    if (!existingPayable) {
      const ok = await createExpense({
        category: "BROKER_COMMISSION",
        amount: money(commission.commissionAmount),
        expenseDate: commission.rental.updatedAt,
        description: `Broker commission payable — ${commission.rental.bookingNumber}`,
        vehicleId: commission.rental.vehicleId,
        rentalId: commission.rental.id,
        brokerId: commission.brokerId,
        notes: `${PAYABLE} broker-hire:${commission.rental.id}`,
        createdById: commission.rental.updatedById ?? commission.rental.createdById ?? fallbackUser.id,
      });
      if (ok) created += 1;
    }

    const paid = money(commission.paidAmount);
    if (paid > 0) {
      const key = `broker-paid:${commission.id}:${paid}`;
      const existingPaid = await prisma.expense.findFirst({
        where: { notes: { contains: key } },
        select: { id: true },
      });
      if (!existingPaid) {
        const ok = await createExpense({
          category: "BROKER_COMMISSION",
          amount: paid,
          expenseDate: commission.paymentDate ?? commission.updatedAt,
          description: `Broker commission (paid) — ${commission.rental.bookingNumber}`,
          vehicleId: commission.rental.vehicleId,
          rentalId: commission.rental.id,
          brokerId: commission.brokerId,
          notes: `${CASH} ${key}`,
          createdById: commission.paidById ?? commission.rental.createdById ?? fallbackUser.id,
        });
        if (ok) created += 1;
      }
    }
  }

  const maintenanceRows = await prisma.vehicleMaintenance.findMany({
    where: { cost: { gt: 0 } },
  });
  for (const row of maintenanceRows) {
    const note = `${MAINT}${row.id}]`;
    const existing = await prisma.expense.findFirst({
      where: { notes: { contains: note } },
      select: { id: true },
    });
    if (existing) continue;
    const ok = await createExpense({
      category: row.maintenanceType.includes("REPAIR") ? "REPAIR" : "MAINTENANCE",
      amount: money(row.cost),
      expenseDate: row.date,
      description: row.description || `${row.maintenanceType.replace(/_/g, " ")} maintenance`,
      vehicleId: row.vehicleId,
      notes: note,
      createdById: row.createdById,
    });
    if (ok) created += 1;
  }

  const total = await prisma.expense.count();
  console.log(`Created ${created} expense rows. Expenses table now has ${total} records.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
