import { prisma } from "@/lib/db";
import { decimalToNumber, formatCurrency } from "@/lib/utils";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";
import { getUpcomingJobs, buildPickupReminderMessage, buildReturnReminderMessage } from "@/lib/services/upcoming-jobs";
import { profitAffectingExpenseWhere } from "@/lib/services/expense";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  addDays,
  subMonths,
  format,
} from "date-fns";

async function fetchDashboardData() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const serviceDeadline = addDays(todayStart, 14);

  const [
    todayRentals,
    activeRentals,
    dueForReturn,
    overdueRentals,
    vehicleStatusCounts,
    todayHireIncome,
    monthHireIncome,
    monthExpenses,
    outstandingBalances,
    pendingOwnerSettlements,
    pendingBrokerCommissions,
    heldDeposits,
    expiringInsurance30,
    expiringInsurance7,
    expiredInsurance,
    expiringRevenueLicence,
    expiringEmission,
    serviceDue,
    recentRentals,
    alerts,
    upcomingJobs,
    rentalStatusCounts,
  ] = await Promise.all([
    prisma.rental.count({
      where: {
        pickupDate: { lte: todayEnd },
        returnDate: { gte: todayStart },
        status: { in: ["CONFIRMED", "ACTIVE"] },
      },
    }),
    prisma.rental.count({ where: { status: "ACTIVE" } }),
    prisma.rental.count({
      where: { returnDate: { gte: todayStart, lte: todayEnd }, status: "ACTIVE" },
    }),
    prisma.rental.count({
      where: { returnDate: { lt: todayStart }, status: "ACTIVE" },
    }),
    prisma.vehicle.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.rental.aggregate({
      where: { status: "COMPLETED", updatedAt: { gte: todayStart, lte: todayEnd } },
      _sum: { finalTotal: true },
    }),
    prisma.rental.aggregate({
      where: { status: "COMPLETED", updatedAt: { gte: monthStart, lte: monthEnd } },
      _sum: { finalTotal: true },
    }),
    prisma.expense.aggregate({
      where: { expenseDate: { gte: monthStart, lte: monthEnd }, ...profitAffectingExpenseWhere() },
      _sum: { amount: true },
    }),
    prisma.rental.aggregate({
      where: {
        balance: { gt: 0 },
        status: { in: ["ACTIVE", "RETURNED", "COMPLETED"] },
      },
      _sum: { balance: true },
    }),
    prisma.ownerSettlement.aggregate({
      where: { status: { in: ["PENDING", "PARTIALLY_PAID"] } },
      _sum: { ownerPayable: true, paidAmount: true },
    }),
    prisma.brokerCommission.aggregate({
      where: { status: { in: ["PENDING", "PARTIALLY_PAID"] } },
      _sum: { commissionAmount: true, paidAmount: true },
    }),
    prisma.securityDeposit.aggregate({
      where: { status: "HELD" },
      _sum: { depositAmount: true },
    }),
    prisma.vehicleDocument.count({
      where: {
        documentType: "INSURANCE",
        expiryDate: { gte: now, lte: addDays(now, 30) },
      },
    }),
    prisma.vehicleDocument.count({
      where: {
        documentType: "INSURANCE",
        expiryDate: { gte: now, lte: addDays(now, 7) },
      },
    }),
    prisma.vehicleDocument.count({
      where: { documentType: "INSURANCE", expiryDate: { lt: now } },
    }),
    prisma.vehicleDocument.count({
      where: {
        documentType: "REVENUE_LICENCE",
        expiryDate: { lte: addDays(now, 30) },
      },
    }),
    prisma.vehicleDocument.count({
      where: {
        documentType: "EMISSION_CERTIFICATE",
        expiryDate: { lte: addDays(now, 30) },
      },
    }),
    prisma.vehicleMaintenance.count({
      where: { nextServiceDate: { lte: serviceDeadline } },
    }),
    prisma.rental.findMany({
      where: { status: { in: ["ACTIVE", "CONFIRMED"] } },
      include: {
        customer: { select: { fullName: true } },
        vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } },
      },
      orderBy: { pickupDate: "desc" },
      take: 5,
    }),
    generateAlerts(now),
    getUpcomingJobs(),
    prisma.rental.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const statusMap = Object.fromEntries(
    vehicleStatusCounts.map((row) => [row.status, row._count._all])
  ) as Record<string, number>;

  const totalVehicles = vehicleStatusCounts.reduce((sum, row) => sum + row._count._all, 0);
  const availableVehicles = statusMap.AVAILABLE ?? 0;
  const reservedVehicles = statusMap.RESERVED ?? 0;
  const maintenanceVehicles = statusMap.MAINTENANCE ?? 0;
  const rentedVehicles = statusMap.RENTED ?? 0;
  const inactiveVehicles = statusMap.INACTIVE ?? 0;

  const todayRevenue = decimalToNumber(todayHireIncome._sum.finalTotal);
  const monthRevenue = decimalToNumber(monthHireIncome._sum.finalTotal);
  const monthExpenseTotal = decimalToNumber(monthExpenses._sum.amount);

  const ownerPending =
    decimalToNumber(pendingOwnerSettlements._sum.ownerPayable) -
    decimalToNumber(pendingOwnerSettlements._sum.paidAmount);

  const brokerPending =
    decimalToNumber(pendingBrokerCommissions._sum.commissionAmount) -
    decimalToNumber(pendingBrokerCommissions._sum.paidAmount);

  const rentalStatusMap = Object.fromEntries(
    rentalStatusCounts.map((row) => [row.status, row._count._all])
  ) as Record<string, number>;

  const inquiry = rentalStatusMap.INQUIRY ?? 0;
  const quoted = rentalStatusMap.QUOTED ?? 0;
  const confirmed = rentalStatusMap.CONFIRMED ?? 0;
  const active = rentalStatusMap.ACTIVE ?? 0;
  const returned = rentalStatusMap.RETURNED ?? 0;
  const completed = rentalStatusMap.COMPLETED ?? 0;
  const cancelled = rentalStatusMap.CANCELLED ?? 0;

  return {
    operations: {
      todayRentals,
      activeRentals,
      availableVehicles,
      reservedVehicles,
      maintenanceVehicles,
      dueForReturn,
      overdueRentals,
    },
    financial: {
      todayRevenue,
      monthRevenue,
      monthExpenses: monthExpenseTotal,
      monthProfit: monthRevenue - monthExpenseTotal,
      outstandingBalances: decimalToNumber(outstandingBalances._sum.balance),
      pendingOwnerPayments: ownerPending,
      pendingBrokerCommissions: brokerPending,
      heldDeposits: decimalToNumber(heldDeposits._sum.depositAmount),
    },
    fleet: {
      totalVehicles,
      availableVehicles,
      reservedVehicles,
      rentedVehicles,
      maintenanceVehicles,
      inactiveVehicles,
    },
    compliance: {
      expiringInsurance30,
      expiringInsurance7,
      expiredInsurance,
      expiringRevenueLicence,
      expiringEmission,
      serviceDue,
    },
    rentalStatus: {
      inquiry,
      quoted,
      confirmed,
      active,
      returned,
      completed,
      cancelled,
      openPipeline: inquiry + quoted + confirmed + active + returned,
      total: inquiry + quoted + confirmed + active + returned + completed + cancelled,
    },
    recentRentals,
    alerts,
    upcomingJobs,
  };
}

export const getDashboardData = unstable_cache(fetchDashboardData, ["dashboard-data"], {
  revalidate: 30,
  tags: [CACHE_TAGS.dashboard],
});

async function generateAlerts(now: Date) {
  const today = startOfDay(now);
  const tomorrowStart = startOfDay(addDays(now, 1));
  const tomorrowEnd = endOfDay(addDays(now, 1));
  const serviceDeadline = addDays(today, 14);

  const [expiredDocs, expiringSoon, overdue, outstanding, serviceRecords, pickupTomorrow, returnTomorrow] =
    await Promise.all([
    prisma.vehicleDocument.findMany({
      where: { expiryDate: { lt: now } },
      include: { vehicle: { select: { registrationNumber: true } } },
      take: 10,
    }),
    prisma.vehicleDocument.findMany({
      where: { expiryDate: { gte: now, lte: addDays(now, 7) } },
      include: { vehicle: { select: { registrationNumber: true } } },
      take: 10,
    }),
    prisma.rental.findMany({
      where: { status: "ACTIVE", returnDate: { lt: today } },
      include: {
        customer: { select: { fullName: true } },
        vehicle: { select: { registrationNumber: true } },
      },
      take: 10,
    }),
    prisma.rental.findMany({
      where: { balance: { gt: 0 }, status: { in: ["ACTIVE", "RETURNED", "COMPLETED"] } },
      include: { customer: { select: { fullName: true } } },
      take: 5,
    }),
    prisma.vehicleMaintenance.findMany({
      where: {
        OR: [{ nextServiceDate: { not: null } }, { nextServiceKm: { not: null } }],
      },
      include: {
        vehicle: { select: { registrationNumber: true, currentOdometer: true } },
      },
      take: 20,
    }),
    prisma.rental.findMany({
      where: {
        pickupDate: { gte: tomorrowStart, lte: tomorrowEnd },
        status: { in: ["QUOTED", "CONFIRMED"] },
      },
      include: {
        customer: { select: { fullName: true } },
        vehicle: { select: { registrationNumber: true } },
      },
      take: 10,
    }),
    prisma.rental.findMany({
      where: {
        returnDate: { gte: tomorrowStart, lte: tomorrowEnd },
        status: "ACTIVE",
      },
      include: {
        customer: { select: { fullName: true } },
        vehicle: { select: { registrationNumber: true } },
      },
      take: 10,
    }),
  ]);

  const alerts: Array<{
    title: string;
    message: string;
    severity: "INFO" | "WARNING" | "CRITICAL";
  }> = [];

  for (const doc of expiredDocs) {
    alerts.push({
      title: `${doc.documentType.replace(/_/g, " ")} Expired`,
      message: `${doc.vehicle.registrationNumber} — expired ${doc.expiryDate?.toLocaleDateString("en-LK")}`,
      severity: "CRITICAL",
    });
  }

  for (const doc of expiringSoon) {
    alerts.push({
      title: `${doc.documentType.replace(/_/g, " ")} Expiring Soon`,
      message: `${doc.vehicle.registrationNumber} — expires ${doc.expiryDate?.toLocaleDateString("en-LK")}`,
      severity: "WARNING",
    });
  }

  for (const rental of overdue) {
    alerts.push({
      title: "Overdue Rental",
      message: `${rental.bookingNumber} — ${rental.customer.fullName} / ${rental.vehicle?.registrationNumber ?? "Unassigned"}`,
      severity: "CRITICAL",
    });
  }

  for (const rental of pickupTomorrow) {
    alerts.push({
      title: "Pickup Reminder — Tomorrow",
      message: buildPickupReminderMessage(rental),
      severity: "INFO",
    });
  }

  for (const rental of returnTomorrow) {
    alerts.push({
      title: "Return Reminder — Tomorrow",
      message: buildReturnReminderMessage(rental),
      severity: "WARNING",
    });
  }

  for (const rental of outstanding) {
    alerts.push({
      title: "Outstanding Balance",
      message: `${rental.customer.fullName} — ${rental.bookingNumber} owes ${formatCurrency(decimalToNumber(rental.balance))}`,
      severity: "WARNING",
    });
  }

  for (const record of serviceRecords) {
    const dateDue = record.nextServiceDate && record.nextServiceDate <= serviceDeadline;
    const dateOverdue = record.nextServiceDate && record.nextServiceDate < today;
    const kmDue =
      record.nextServiceKm != null &&
      record.vehicle.currentOdometer >= record.nextServiceKm;

    if (!dateDue && !kmDue) continue;

    alerts.push({
      title: dateOverdue || kmDue ? "Service Overdue" : "Service Due Soon",
      message: `${record.vehicle.registrationNumber} — ${record.maintenanceType.replace(/_/g, " ")}`,
      severity: dateOverdue || kmDue ? "CRITICAL" : "WARNING",
    });
  }

  return alerts.slice(0, 15);
}

async function fetchMonthlyRevenueChart() {
  const now = new Date();
  const monthRanges = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(now, 5 - i);
    return {
      month: format(date, "MMM yy"),
      start: startOfMonth(date),
      end: endOfMonth(date),
    };
  });

  const [hireIncome, expenses] = await Promise.all([
    Promise.all(
      monthRanges.map(({ start, end }) =>
        prisma.rental.aggregate({
          where: { status: "COMPLETED", updatedAt: { gte: start, lte: end } },
          _sum: { finalTotal: true },
        })
      )
    ),
    Promise.all(
      monthRanges.map(({ start, end }) =>
        prisma.expense.aggregate({
          where: { expenseDate: { gte: start, lte: end }, ...profitAffectingExpenseWhere() },
          _sum: { amount: true },
        })
      )
    ),
  ]);

  return monthRanges.map(({ month }, index) => ({
    month,
    revenue: decimalToNumber(hireIncome[index]._sum.finalTotal),
    expenses: decimalToNumber(expenses[index]._sum.amount),
  }));
}

export const getMonthlyRevenueChart = unstable_cache(fetchMonthlyRevenueChart, ["dashboard-chart"], {
  revalidate: 60,
  tags: [CACHE_TAGS.chart],
});
