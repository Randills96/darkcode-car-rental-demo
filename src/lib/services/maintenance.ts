import { prisma } from "@/lib/db";
import { generateCode, decimalToNumber } from "@/lib/utils";
import type { MaintenanceSearchParams } from "@/lib/validations/maintenance";
import type { MaintenanceType, Prisma } from "@prisma/client";
import { addDays, startOfDay } from "date-fns";

export async function generateMaintenanceCode(): Promise<string> {
  const [count, last] = await Promise.all([
    prisma.vehicleMaintenance.count(),
    prisma.vehicleMaintenance.findFirst({
      orderBy: { maintenanceCode: "desc" },
      select: { maintenanceCode: true },
    }),
  ]);

  let next = count + 1;
  if (last?.maintenanceCode) {
    const match = last.maintenanceCode.match(/(\d+)$/);
    if (match) {
      const lastSeq = parseInt(match[1], 10);
      if (!isNaN(lastSeq)) {
        next = Math.max(next, lastSeq + 1);
      }
    }
  }

  while (true) {
    const code = generateCode("MNT", next);
    const existing = await prisma.vehicleMaintenance.findUnique({
      where: { maintenanceCode: code },
      select: { id: true },
    });
    if (!existing) {
      return code;
    }
    next++;
  }
}

export async function getMaintenanceRecords(params: MaintenanceSearchParams) {
  const { search, maintenanceType, page, limit, sortBy, sortOrder } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.VehicleMaintenanceWhereInput = {
    ...(maintenanceType && maintenanceType !== "ALL"
      ? { maintenanceType: maintenanceType as MaintenanceType }
      : {}),
    ...(search
      ? {
          OR: [
            { maintenanceCode: { contains: search } },
            { description: { contains: search } },
            { serviceProvider: { contains: search } },
            { vehicle: { registrationNumber: { contains: search } } },
            { vehicle: { make: { contains: search } } },
          ],
        }
      : {}),
  };

  const [records, total] = await Promise.all([
    prisma.vehicleMaintenance.findMany({
      where,
      include: {
        vehicle: {
          select: {
            id: true,
            registrationNumber: true,
            make: true,
            model: true,
            currentOdometer: true,
          },
        },
        createdBy: { select: { name: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.vehicleMaintenance.count({ where }),
  ]);

  return { records, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getMaintenanceById(id: string) {
  return prisma.vehicleMaintenance.findUnique({
    where: { id },
    include: {
      vehicle: { include: { owner: { select: { name: true } } } },
      createdBy: { select: { name: true } },
    },
  });
}

export async function getVehiclesForMaintenanceSelect() {
  return prisma.vehicle.findMany({
    where: { deletedAt: null, status: { not: "INACTIVE" } },
    select: {
      id: true,
      registrationNumber: true,
      make: true,
      model: true,
      currentOdometer: true,
    },
    orderBy: { registrationNumber: "asc" },
  });
}

export async function getServiceDueAlerts(daysAhead = 14) {
  const today = startOfDay(new Date());
  const deadline = addDays(today, daysAhead);

  const records = await prisma.vehicleMaintenance.findMany({
    where: {
      OR: [
        { nextServiceDate: { not: null } },
        { nextServiceKm: { not: null } },
      ],
    },
    include: {
      vehicle: {
        select: {
          id: true,
          registrationNumber: true,
          make: true,
          model: true,
          currentOdometer: true,
          status: true,
        },
      },
    },
    orderBy: { nextServiceDate: "asc" },
  });

  return records
    .map((record) => {
      const dateDue =
        record.nextServiceDate &&
        record.nextServiceDate <= deadline;
      const dateOverdue =
        record.nextServiceDate &&
        record.nextServiceDate < today;
      const kmDue =
        record.nextServiceKm != null &&
        record.vehicle.currentOdometer >= record.nextServiceKm;
      const kmOverdue =
        record.nextServiceKm != null &&
        record.vehicle.currentOdometer > record.nextServiceKm + 500;

      if (!dateDue && !kmDue) return null;

      return {
        ...record,
        alertType: dateOverdue || kmOverdue ? ("overdue" as const) : ("upcoming" as const),
        dateDue: !!dateDue,
        kmDue: !!kmDue,
      };
    })
    .filter(Boolean) as Array<
    (typeof records)[0] & {
      alertType: "overdue" | "upcoming";
      dateDue: boolean;
      kmDue: boolean;
    }
  >;
}

export async function getMaintenanceSummary() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalRecords, monthCost, dueAlerts] = await Promise.all([
    prisma.vehicleMaintenance.count(),
    prisma.vehicleMaintenance.aggregate({
      where: { date: { gte: monthStart } },
      _sum: { cost: true },
    }),
    getServiceDueAlerts(14),
  ]);

  return {
    totalRecords,
    monthCost: decimalToNumber(monthCost._sum.cost),
    dueCount: dueAlerts.length,
    overdueCount: dueAlerts.filter((a) => a.alertType === "overdue").length,
  };
}
