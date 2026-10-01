import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";
import { CACHE_TAGS } from "@/lib/cache";
import { unstable_cache } from "next/cache";
import { profitAffectingExpenseWhere, MAINTENANCE_NOTE_PREFIX } from "@/lib/services/expense";
import { endOfDay, startOfDay, startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import type { Prisma } from "@prisma/client";

export interface DateRangeFilter {
  from?: Date;
  to?: Date;
}

function parseRange(from?: string, to?: string): DateRangeFilter {
  return {
    from: from ? startOfDay(new Date(from)) : undefined,
    to: to ? endOfDay(new Date(to)) : undefined,
  };
}

function rentalReturnFilter(range: DateRangeFilter) {
  if (!range.from && !range.to) return {};
  return {
    returnDate: {
      ...(range.from ? { gte: range.from } : {}),
      ...(range.to ? { lte: range.to } : {}),
    },
  };
}

function expenseDateFilter(range: DateRangeFilter) {
  if (!range.from && !range.to) return {};
  return {
    expenseDate: {
      ...(range.from ? { gte: range.from } : {}),
      ...(range.to ? { lte: range.to } : {}),
    },
  };
}

function maintenanceDateFilter(range: DateRangeFilter) {
  if (!range.from && !range.to) return {};
  return {
    date: {
      ...(range.from ? { gte: range.from } : {}),
      ...(range.to ? { lte: range.to } : {}),
    },
  };
}

function addToMap(map: Map<string, number>, key: string, value: number) {
  map.set(key, (map.get(key) ?? 0) + value);
}

async function computeVehicleProfitability(from?: string, to?: string) {
  const range = parseRange(from, to);
  const rentalWhere = {
    status: "COMPLETED" as const,
    vehicleId: { not: null },
    ...rentalReturnFilter(range),
  };

  const [vehicles, rentalStats, maintenanceStats, expenseStats, completedRentals] = await Promise.all([
    prisma.vehicle.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        vehicleCode: true,
        registrationNumber: true,
        make: true,
        model: true,
        ownershipType: true,
        owner: { select: { name: true } },
      },
      orderBy: { registrationNumber: "asc" },
    }),
    prisma.rental.groupBy({
      by: ["vehicleId"],
      where: rentalWhere,
      _sum: { finalTotal: true },
      _count: { _all: true },
    }),
    prisma.vehicleMaintenance.groupBy({
      by: ["vehicleId"],
      where: maintenanceDateFilter(range),
      _sum: { cost: true },
    }),
    prisma.expense.groupBy({
      by: ["vehicleId"],
      where: {
        vehicleId: { not: null },
        category: { notIn: ["OWNER_PAYMENT", "BROKER_COMMISSION"] },
        OR: [{ notes: null }, { notes: { not: { startsWith: MAINTENANCE_NOTE_PREFIX } } }],
        ...expenseDateFilter(range),
      },
      _sum: { amount: true },
    }),
    prisma.rental.findMany({
      where: rentalWhere,
      select: { id: true, vehicleId: true },
    }),
  ]);

  const rentalToVehicle = new Map(
    completedRentals.filter((r) => r.vehicleId).map((r) => [r.id, r.vehicleId!])
  );
  const rentalIds = completedRentals.map((r) => r.id);

  const ownerByVehicle = new Map<string, number>();
  const commissionByVehicle = new Map<string, number>();
  const brokerByVehicle = new Map<string, number>();
  const driverByVehicle = new Map<string, number>();

  if (rentalIds.length > 0) {
    const [ownerSettlements, brokerCommissions, driverPayments] = await Promise.all([
      prisma.ownerSettlement.findMany({
        where: { rentalId: { in: rentalIds } },
        select: { rentalId: true, ownerPayable: true, companyCommission: true },
      }),
      prisma.brokerCommission.findMany({
        where: { rentalId: { in: rentalIds } },
        select: { rentalId: true, commissionAmount: true },
      }),
      prisma.driverPayment.findMany({
        where: { rentalId: { in: rentalIds } },
        select: { rentalId: true, amount: true },
      }),
    ]);

    for (const row of ownerSettlements) {
      const vehicleId = rentalToVehicle.get(row.rentalId);
      if (!vehicleId) continue;
      addToMap(ownerByVehicle, vehicleId, decimalToNumber(row.ownerPayable));
      addToMap(commissionByVehicle, vehicleId, decimalToNumber(row.companyCommission));
    }
    for (const row of brokerCommissions) {
      const vehicleId = rentalToVehicle.get(row.rentalId);
      if (!vehicleId) continue;
      addToMap(brokerByVehicle, vehicleId, decimalToNumber(row.commissionAmount));
    }
    for (const row of driverPayments) {
      if (!row.rentalId) continue;
      const vehicleId = rentalToVehicle.get(row.rentalId);
      if (!vehicleId) continue;
      addToMap(driverByVehicle, vehicleId, decimalToNumber(row.amount));
    }
  }

  const revenueMap = new Map(
    rentalStats.filter((r) => r.vehicleId).map((r) => [r.vehicleId!, { revenue: decimalToNumber(r._sum.finalTotal), count: r._count._all }])
  );
  const maintenanceMap = new Map(maintenanceStats.map((r) => [r.vehicleId, decimalToNumber(r._sum.cost)]));
  const expenseMap = new Map(
    expenseStats.filter((r) => r.vehicleId).map((r) => [r.vehicleId!, decimalToNumber(r._sum.amount)])
  );

  return vehicles
    .map((vehicle) => {
      const stats = revenueMap.get(vehicle.id);
      const revenue = stats?.revenue ?? 0;
      const maintenanceCost = maintenanceMap.get(vehicle.id) ?? 0;
      const expenseCost = expenseMap.get(vehicle.id) ?? 0;
      const ownerPayable = ownerByVehicle.get(vehicle.id) ?? 0;
      const brokerCost = brokerByVehicle.get(vehicle.id) ?? 0;
      const driverCost = driverByVehicle.get(vehicle.id) ?? 0;
      const companyCommission = commissionByVehicle.get(vehicle.id) ?? 0;
      const totalCosts = ownerPayable + brokerCost + driverCost + maintenanceCost + expenseCost;
      const netProfit = revenue - totalCosts;

      return {
        vehicleId: vehicle.id,
        vehicleCode: vehicle.vehicleCode,
        registrationNumber: vehicle.registrationNumber,
        label: `${vehicle.registrationNumber} — ${vehicle.make} ${vehicle.model}`,
        ownershipType: vehicle.ownershipType,
        ownerName: vehicle.owner?.name ?? null,
        rentalCount: stats?.count ?? 0,
        revenue,
        ownerPayable,
        companyCommission,
        brokerCost,
        driverCost,
        maintenanceCost,
        expenseCost,
        totalCosts,
        netProfit,
        marginPercent: revenue > 0 ? (netProfit / revenue) * 100 : 0,
      };
    })
    .sort((a, b) => b.netProfit - a.netProfit);
}

export function getVehicleProfitability(from?: string, to?: string) {
  return unstable_cache(
    () => computeVehicleProfitability(from, to),
    ["vehicle-profitability", from ?? "all", to ?? "all"],
    { revalidate: 60, tags: [CACHE_TAGS.profitability] }
  )();
}

async function computeMonthlyProfitability(months = 6) {
  const now = new Date();
  const monthRanges = Array.from({ length: months }, (_, i) => {
    const date = subMonths(now, months - 1 - i);
    return {
      month: format(date, "yyyy-MM"),
      monthLabel: format(date, "MMM yy"),
      start: startOfMonth(date),
      end: endOfMonth(date),
    };
  });

  return Promise.all(
    monthRanges.map(async ({ month, monthLabel, start, end }) => {
      const [revenueAgg, expenseByCategory, maintenanceAgg] = await Promise.all([
        prisma.rental.aggregate({
          where: { status: "COMPLETED", updatedAt: { gte: start, lte: end } },
          _sum: { finalTotal: true },
        }),
        prisma.expense.groupBy({
          by: ["category"],
          where: {
            expenseDate: { gte: start, lte: end },
            AND: [
              profitAffectingExpenseWhere(),
              { OR: [{ notes: null }, { notes: { not: { startsWith: MAINTENANCE_NOTE_PREFIX } } }] },
            ],
          },
          _sum: { amount: true },
        }),
        prisma.vehicleMaintenance.aggregate({ where: { date: { gte: start, lte: end } }, _sum: { cost: true } }),
      ]);

      let ownerTotal = 0;
      let brokerTotal = 0;
      let otherExpenses = 0;
      for (const row of expenseByCategory) {
        const amount = decimalToNumber(row._sum.amount);
        if (row.category === "OWNER_PAYMENT") ownerTotal += amount;
        else if (row.category === "BROKER_COMMISSION") brokerTotal += amount;
        else otherExpenses += amount;
      }

      const revenue = decimalToNumber(revenueAgg._sum.finalTotal);
      const maintenanceTotal = decimalToNumber(maintenanceAgg._sum.cost);
      const totalCosts = otherExpenses + maintenanceTotal + ownerTotal + brokerTotal;

      return {
        month,
        monthLabel,
        revenue,
        expenses: otherExpenses,
        maintenance: maintenanceTotal,
        ownerPayouts: ownerTotal,
        brokerPayouts: brokerTotal,
        netProfit: revenue - totalCosts,
      };
    })
  );
}

export function getMonthlyProfitability(months = 6) {
  return unstable_cache(
    () => computeMonthlyProfitability(months),
    ["monthly-profitability", String(months)],
    { revalidate: 60, tags: [CACHE_TAGS.profitability] }
  )();
}

async function computeOwnerProfitability(from?: string, to?: string) {
  const range = parseRange(from, to);
  const rentalWhere: Prisma.RentalWhereInput = {
    status: "COMPLETED",
    vehicleId: { not: null },
    ...rentalReturnFilter(range),
  };

  const [owners, vehicles, rentalStats, settlements] = await Promise.all([
    prisma.vehicleOwner.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      select: { id: true, ownerCode: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.vehicle.findMany({
      where: { deletedAt: null, ownerId: { not: null } },
      select: { id: true, ownerId: true },
    }),
    prisma.rental.groupBy({
      by: ["vehicleId"],
      where: rentalWhere,
      _sum: { finalTotal: true },
      _count: { _all: true },
    }),
    prisma.ownerSettlement.findMany({
      where: { rental: rentalWhere },
      select: {
        ownerId: true,
        rentalRevenue: true,
        companyCommission: true,
        ownerPayable: true,
        paidAmount: true,
      },
    }),
  ]);

  const vehicleToOwner = new Map(
    vehicles.filter((vehicle) => vehicle.ownerId).map((vehicle) => [vehicle.id, vehicle.ownerId!])
  );

  const ownerVehicleCount = new Map<string, number>();
  for (const vehicle of vehicles) {
    if (!vehicle.ownerId) continue;
    ownerVehicleCount.set(vehicle.ownerId, (ownerVehicleCount.get(vehicle.ownerId) ?? 0) + 1);
  }

  const ownerRentalCount = new Map<string, number>();
  const ownerRevenue = new Map<string, number>();

  for (const row of rentalStats) {
    if (!row.vehicleId) continue;
    const ownerId = vehicleToOwner.get(row.vehicleId);
    if (!ownerId) continue;
    ownerRentalCount.set(ownerId, (ownerRentalCount.get(ownerId) ?? 0) + row._count._all);
    ownerRevenue.set(
      ownerId,
      (ownerRevenue.get(ownerId) ?? 0) + decimalToNumber(row._sum.finalTotal)
    );
  }

  const ownerCommission = new Map<string, number>();
  const ownerPayableMap = new Map<string, number>();
  const ownerPaidMap = new Map<string, number>();
  const ownerSettlementRevenue = new Map<string, number>();

  for (const row of settlements) {
    addToMap(ownerCommission, row.ownerId, decimalToNumber(row.companyCommission));
    addToMap(ownerPayableMap, row.ownerId, decimalToNumber(row.ownerPayable));
    addToMap(ownerPaidMap, row.ownerId, decimalToNumber(row.paidAmount));
    addToMap(ownerSettlementRevenue, row.ownerId, decimalToNumber(row.rentalRevenue));
  }

  return owners
    .map((owner) => {
      const vehicleCount = ownerVehicleCount.get(owner.id) ?? 0;
      if (vehicleCount === 0) return null;

      const ownerPayable = ownerPayableMap.get(owner.id) ?? 0;
      const ownerPaid = ownerPaidMap.get(owner.id) ?? 0;

      return {
        ownerId: owner.id,
        ownerCode: owner.ownerCode,
        name: owner.name,
        vehicleCount,
        rentalCount: ownerRentalCount.get(owner.id) ?? 0,
        rentalRevenue: ownerSettlementRevenue.get(owner.id) ?? ownerRevenue.get(owner.id) ?? 0,
        companyCommission: ownerCommission.get(owner.id) ?? 0,
        ownerPayable,
        ownerPaid,
        ownerOutstanding: ownerPayable - ownerPaid,
      };
    })
    .filter((owner): owner is NonNullable<typeof owner> => owner !== null)
    .sort((a, b) => b.companyCommission - a.companyCommission);
}

export function getOwnerProfitability(from?: string, to?: string) {
  return unstable_cache(
    () => computeOwnerProfitability(from, to),
    ["owner-profitability", from ?? "all", to ?? "all"],
    { revalidate: 60, tags: [CACHE_TAGS.profitability] }
  )();
}

export async function getProfitabilitySummary(from?: string, to?: string) {
  const [vehicles, months] = await Promise.all([
    getVehicleProfitability(from, to),
    getMonthlyProfitability(),
  ]);

  const totalRevenue = vehicles.reduce((sum, v) => sum + v.revenue, 0);
  const totalCosts = vehicles.reduce((sum, v) => sum + v.totalCosts, 0);
  const totalProfit = vehicles.reduce((sum, v) => sum + v.netProfit, 0);

  return {
    totalRevenue,
    totalCosts,
    totalProfit,
    vehicleCount: vehicles.length,
    profitableVehicles: vehicles.filter((v) => v.netProfit > 0).length,
    monthlyTrend: months,
  };
}
