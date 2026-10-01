import { prisma } from "@/lib/db";
import { generateCode, decimalToNumber } from "@/lib/utils";
import type { ExpenseSearchParams } from "@/lib/validations/expense";
import { Prisma, type ExpenseCategory } from "@prisma/client";

export const CASH_PAYOUT_NOTE_PREFIX = "[PROFIT:NO]";
export const PAYABLE_NOTE_PREFIX = "[PAYABLE]";
export const MAINTENANCE_NOTE_PREFIX = "[MAINT:";

export function profitAffectingExpenseWhere(): Prisma.ExpenseWhereInput {
  return {
    OR: [{ notes: null }, { notes: { not: { startsWith: CASH_PAYOUT_NOTE_PREFIX } } }],
  };
}

export async function generateExpenseCode(
  tx: Prisma.TransactionClient | typeof prisma = prisma
): Promise<string> {
  const count = await tx.expense.count();
  const suffix = `${Date.now().toString(36).slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
  return `${generateCode("EXP", count + 1)}-${suffix}`;
}

function isDuplicateExpenseCode(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return true;
  }
  return error instanceof Error && /duplicate entry/i.test(error.message);
}

export async function createPayoutExpense(
  tx: Prisma.TransactionClient | typeof prisma,
  input: {
    category: ExpenseCategory;
    amount: number;
    expenseDate: Date;
    description: string;
    vehicleId?: string | null;
    rentalId?: string | null;
    ownerId?: string | null;
    brokerId?: string | null;
    notes?: string | null;
    createdById: string;
  }
) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await tx.expense.create({
        data: {
          expenseCode: await generateExpenseCode(tx),
          category: input.category,
          amount: input.amount,
          expenseDate: input.expenseDate,
          description: input.description,
          vehicleId: input.vehicleId || null,
          rentalId: input.rentalId || null,
          ownerId: input.ownerId || null,
          brokerId: input.brokerId || null,
          notes: input.notes || null,
          createdById: input.createdById,
        },
      });
    } catch (error) {
      if (!isDuplicateExpenseCode(error) || attempt === 3) throw error;
    }
  }

  throw new Error("Failed to create payout expense");
}

export async function getExpenses(params: ExpenseSearchParams) {
  const { search, category, page, limit, sortBy, sortOrder } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.ExpenseWhereInput = {
    ...(category && category !== "ALL" ? { category: category as ExpenseCategory } : {}),
    ...(search
      ? {
          OR: [
            { expenseCode: { contains: search } },
            { description: { contains: search } },
            { vehicle: { registrationNumber: { contains: search } } },
            { rental: { bookingNumber: { contains: search } } },
            { owner: { name: { contains: search } } },
            { broker: { name: { contains: search } } },
          ],
        }
      : {}),
  };

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        vehicle: { select: { id: true, registrationNumber: true } },
        rental: { select: { id: true, bookingNumber: true } },
        owner: { select: { id: true, name: true } },
        broker: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.expense.count({ where }),
  ]);

  return { expenses, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getExpenseById(id: string) {
  return prisma.expense.findUnique({
    where: { id },
    include: {
      vehicle: true,
      rental: { select: { id: true, bookingNumber: true, status: true } },
      owner: { select: { id: true, name: true, ownerCode: true } },
      broker: { select: { id: true, name: true, brokerCode: true } },
      createdBy: { select: { name: true } },
    },
  });
}

export async function getExpenseFormOptions() {
  const [vehicles, rentals, owners, brokers] = await Promise.all([
    prisma.vehicle.findMany({
      where: { deletedAt: null },
      select: { id: true, registrationNumber: true, make: true, model: true },
      orderBy: { registrationNumber: "asc" },
    }),
    prisma.rental.findMany({
      where: { status: { notIn: ["CANCELLED", "INQUIRY"] } },
      select: { id: true, bookingNumber: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.vehicleOwner.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      select: { id: true, name: true, ownerCode: true },
      orderBy: { name: "asc" },
    }),
    prisma.broker.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      select: { id: true, name: true, brokerCode: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { vehicles, rentals, owners, brokers };
}

export async function getExpenseSummary() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalExpenses, monthTotal, categoryBreakdown] = await Promise.all([
    prisma.expense.count(),
    prisma.expense.aggregate({
      where: { expenseDate: { gte: monthStart }, ...profitAffectingExpenseWhere() },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: { expenseDate: { gte: monthStart }, ...profitAffectingExpenseWhere() },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
  ]);

  return {
    totalExpenses,
    monthTotal: decimalToNumber(monthTotal._sum.amount),
    categoryBreakdown: categoryBreakdown.map((c) => ({
      category: c.category,
      amount: decimalToNumber(c._sum.amount),
    })),
  };
}

export async function createMaintenanceExpense(input: {
  maintenanceId: string;
  vehicleId: string;
  maintenanceType: string;
  amount: number;
  date: Date;
  description: string;
  createdById: string;
}) {
  if (!(input.amount > 0)) return;

  const note = `${MAINTENANCE_NOTE_PREFIX}${input.maintenanceId}]`;
  const existing = await prisma.expense.findFirst({
    where: { notes: { contains: note } },
    select: { id: true },
  });
  if (existing) return;

  const category: ExpenseCategory = input.maintenanceType.includes("REPAIR") ? "REPAIR" : "MAINTENANCE";
  await createPayoutExpense(prisma, {
    category,
    amount: input.amount,
    expenseDate: input.date,
    description: input.description || `${input.maintenanceType.replace(/_/g, " ")} maintenance`,
    vehicleId: input.vehicleId,
    notes: note,
    createdById: input.createdById,
  });
}
