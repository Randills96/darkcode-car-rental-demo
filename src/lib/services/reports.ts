import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";
import { rowsToCsv } from "@/lib/utils/csv";
import { CACHE_TAGS } from "@/lib/cache";
import { unstable_cache } from "next/cache";
import { endOfDay, startOfDay } from "date-fns";
import type { Prisma } from "@prisma/client";

function parseRange(from?: string, to?: string) {
  return {
    from: from ? startOfDay(new Date(from)) : undefined,
    to: to ? endOfDay(new Date(to)) : undefined,
  };
}

function dateRangeWhere(field: string, from?: Date, to?: Date): Record<string, unknown> {
  if (!from && !to) return {};
  return {
    [field]: {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    },
  };
}

function rentalOverlapWhere(from?: Date, to?: Date): Prisma.RentalWhereInput {
  if (!from && !to) return {};
  return {
    pickupDate: { lte: to ?? new Date() },
    returnDate: { gte: from ?? new Date(0) },
  };
}

async function computeRentalReport(from?: string, to?: string, page = 1, limit = 20) {
  const range = parseRange(from, to);
  const skip = (page - 1) * limit;

  const where: Prisma.RentalWhereInput = {
    status: { notIn: ["INQUIRY", "CANCELLED"] },
    ...dateRangeWhere("pickupDate", range.from, range.to),
  };

  const [rentals, total] = await Promise.all([
    prisma.rental.findMany({
      where,
      include: {
        customer: { select: { fullName: true, customerCode: true } },
        vehicle: { select: { registrationNumber: true } },
        broker: { select: { name: true } },
      },
      orderBy: { pickupDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.rental.count({ where }),
  ]);

  return { rentals, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export function getRentalReport(from?: string, to?: string, page = 1, limit = 20) {
  return unstable_cache(
    () => computeRentalReport(from, to, page, limit),
    ["rental-report", from ?? "all", to ?? "all", String(page), String(limit)],
    { revalidate: 45, tags: [CACHE_TAGS.reports] }
  )();
}

async function computePaymentReport(from?: string, to?: string, page = 1, limit = 20) {
  const range = parseRange(from, to);
  const skip = (page - 1) * limit;

  const where: Prisma.PaymentWhereInput = dateRangeWhere("paymentDate", range.from, range.to);

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        rental: { select: { bookingNumber: true } },
        customer: { select: { fullName: true } },
      },
      orderBy: { paymentDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  return { payments, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export function getPaymentReport(from?: string, to?: string, page = 1, limit = 20) {
  return unstable_cache(
    () => computePaymentReport(from, to, page, limit),
    ["payment-report", from ?? "all", to ?? "all", String(page), String(limit)],
    { revalidate: 45, tags: [CACHE_TAGS.reports] }
  )();
}

async function computeExpenseReport(from?: string, to?: string, page = 1, limit = 20) {
  const range = parseRange(from, to);
  const skip = (page - 1) * limit;

  const where: Prisma.ExpenseWhereInput = dateRangeWhere("expenseDate", range.from, range.to);

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        vehicle: { select: { registrationNumber: true } },
        rental: { select: { bookingNumber: true } },
      },
      orderBy: { expenseDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.expense.count({ where }),
  ]);

  return { expenses, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export function getExpenseReport(from?: string, to?: string, page = 1, limit = 20) {
  return unstable_cache(
    () => computeExpenseReport(from, to, page, limit),
    ["expense-report", from ?? "all", to ?? "all", String(page), String(limit)],
    { revalidate: 45, tags: [CACHE_TAGS.reports] }
  )();
}

export async function computeFleetUtilizationReport(from?: string, to?: string) {
  const range = parseRange(from, to);
  const periodDays =
    range.from && range.to
      ? Math.max(1, Math.ceil((range.to.getTime() - range.from.getTime()) / 86400000))
      : 30;

  const rentalWhere: Prisma.RentalWhereInput = {
    vehicleId: { not: null },
    status: { in: ["CONFIRMED", "ACTIVE", "RETURNED", "COMPLETED"] },
    ...rentalOverlapWhere(range.from, range.to),
  };

  const [vehicles, rentalStats] = await Promise.all([
    prisma.vehicle.findMany({
      where: { deletedAt: null, status: { not: "INACTIVE" } },
      select: {
        id: true,
        vehicleCode: true,
        registrationNumber: true,
        make: true,
        model: true,
        status: true,
      },
      orderBy: { registrationNumber: "asc" },
    }),
    prisma.rental.groupBy({
      by: ["vehicleId"],
      where: rentalWhere,
      _count: { _all: true },
      _sum: { rentalDays: true },
    }),
  ]);

  const statsMap = new Map(
    rentalStats
      .filter((row) => row.vehicleId)
      .map((row) => [row.vehicleId!, { rentalCount: row._count._all, rentedDays: row._sum.rentalDays ?? 0 }])
  );

  return vehicles
    .map((vehicle) => {
      const stats = statsMap.get(vehicle.id);
      const rentedDays = stats?.rentedDays ?? 0;
      const utilizationPercent = Math.min(100, (rentedDays / periodDays) * 100);

      return {
        ...vehicle,
        rentalCount: stats?.rentalCount ?? 0,
        rentedDays,
        periodDays,
        utilizationPercent,
      };
    })
    .sort((a, b) => b.utilizationPercent - a.utilizationPercent);
}

export function getFleetUtilizationReport(from?: string, to?: string) {
  return unstable_cache(
    () => computeFleetUtilizationReport(from, to),
    ["fleet-report", from ?? "all", to ?? "all"],
    { revalidate: 60, tags: [CACHE_TAGS.reports] }
  )();
}

export async function exportRentalReportCsv(from?: string, to?: string) {
  const rentals = await computeRentalReportForExport(from, to);
  return rowsToCsv(
    [
      "Booking Number",
      "Customer",
      "Vehicle",
      "Pickup Date",
      "Return Date",
      "Days",
      "Status",
      "Final Total",
      "Total Paid",
      "Balance",
      "Broker",
    ],
    rentals.map((r) => [
      r.bookingNumber,
      r.customer.fullName,
      r.vehicle?.registrationNumber ?? "",
      r.pickupDate.toISOString().split("T")[0],
      r.returnDate.toISOString().split("T")[0],
      r.rentalDays,
      r.status,
      decimalToNumber(r.finalTotal),
      decimalToNumber(r.totalPaid),
      decimalToNumber(r.balance),
      r.broker?.name ?? "",
    ])
  );
}

export async function computeRentalReportForExport(from?: string, to?: string) {
  const { rentals } = await computeRentalReport(from, to, 1, 10000);
  return rentals;
}

export async function computePaymentReportForExport(from?: string, to?: string) {
  const { payments } = await computePaymentReport(from, to, 1, 10000);
  return payments;
}

export async function computeExpenseReportForExport(from?: string, to?: string) {
  const { expenses } = await computeExpenseReport(from, to, 1, 10000);
  return expenses;
}

export async function exportPaymentReportCsv(from?: string, to?: string) {
  const payments = await computePaymentReportForExport(from, to);
  return rowsToCsv(
    ["Payment Code", "Date", "Booking", "Customer", "Type", "Method", "Amount"],
    payments.map((p) => [
      p.paymentCode,
      p.paymentDate.toISOString().split("T")[0],
      p.rental.bookingNumber,
      p.customer.fullName,
      p.paymentType,
      p.paymentMethod,
      decimalToNumber(p.amount),
    ])
  );
}

export async function exportExpenseReportCsv(from?: string, to?: string) {
  const expenses = await computeExpenseReportForExport(from, to);
  return rowsToCsv(
    ["Expense Code", "Date", "Category", "Description", "Vehicle", "Rental", "Amount"],
    expenses.map((e) => [
      e.expenseCode,
      e.expenseDate.toISOString().split("T")[0],
      e.category,
      e.description.replace(/,/g, ";"),
      e.vehicle?.registrationNumber ?? "",
      e.rental?.bookingNumber ?? "",
      decimalToNumber(e.amount),
    ])
  );
}

export async function exportFleetReportCsv(from?: string, to?: string) {
  const fleet = await computeFleetUtilizationReport(from, to);
  return rowsToCsv(
    ["Vehicle Code", "Registration", "Make", "Model", "Status", "Rentals", "Rented Days", "Period Days", "Utilization %"],
    fleet.map((v) => [
      v.vehicleCode,
      v.registrationNumber,
      v.make,
      v.model,
      v.status,
      v.rentalCount,
      v.rentedDays,
      v.periodDays,
      v.utilizationPercent.toFixed(1),
    ])
  );
}
