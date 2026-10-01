import { prisma } from "@/lib/db";
import { decimalToNumber, generateCode, normalizeNic } from "@/lib/utils";
import type { CustomerSearchParams } from "@/lib/validations/customer";
import type { CustomerStatus, Prisma } from "@prisma/client";

export async function generateCustomerCode(): Promise<string> {
  const [count, last] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.findFirst({
      orderBy: { customerCode: "desc" },
      select: { customerCode: true },
    }),
  ]);

  let next = count + 1;
  if (last?.customerCode) {
    const match = last.customerCode.match(/(\d+)$/);
    if (match) {
      const lastSeq = parseInt(match[1], 10);
      if (!isNaN(lastSeq)) {
        next = Math.max(next, lastSeq + 1);
      }
    }
  }

  while (true) {
    const code = generateCode("CUS", next);
    const existing = await prisma.customer.findUnique({
      where: { customerCode: code },
      select: { id: true },
    });
    if (!existing) {
      return code;
    }
    next++;
  }
}

export async function getCustomers(params: CustomerSearchParams) {
  const { search, status, page, limit, sortBy, sortOrder } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.CustomerWhereInput = {
    deletedAt: null,
    ...(status && status !== "ALL" ? { status: status as CustomerStatus } : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search } },
            { nic: { contains: search } },
            { phone: { contains: search } },
            { customerCode: { contains: search } },
            { whatsapp: { contains: search } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { rentals: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    customers,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getCustomerById(id: string) {
  return prisma.customer.findFirst({
    where: { id, deletedAt: null },
    include: {
      createdBy: { select: { id: true, name: true } },
      updatedBy: { select: { id: true, name: true } },
      blacklistedBy: { select: { id: true, name: true } },
      documents: { orderBy: { createdAt: "desc" } },
      blacklistHistory: {
        include: { createdBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      rentals: {
        include: {
          vehicle: { select: { registrationNumber: true, make: true, model: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      payments: {
        include: {
          rental: { select: { bookingNumber: true } },
          recordedBy: { select: { name: true } },
        },
        orderBy: { paymentDate: "desc" },
      },
      damages: {
        include: {
          vehicle: { select: { registrationNumber: true } },
          rental: { select: { bookingNumber: true } },
        },
        orderBy: { damageDate: "desc" },
      },
    },
  });
}

export async function getCustomerStats(customerId: string) {
  const [rentalStats, paymentStats, balanceStats] = await Promise.all([
    prisma.rental.aggregate({
      where: { customerId },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { customerId },
      _sum: { amount: true },
    }),
    prisma.rental.aggregate({
      where: {
        customerId,
        balance: { gt: 0 },
        status: { in: ["ACTIVE", "RETURNED", "COMPLETED"] },
      },
      _sum: { balance: true },
    }),
  ]);

  const vehiclesRented = await prisma.rental.findMany({
    where: { customerId, vehicleId: { not: null } },
    select: {
      vehicle: { select: { registrationNumber: true, make: true, model: true } },
    },
    distinct: ["vehicleId"],
  });

  return {
    totalRentals: rentalStats._count,
    totalSpending: decimalToNumber(paymentStats._sum.amount),
    outstandingBalance: decimalToNumber(balanceStats._sum.balance),
    previousVehicles: vehiclesRented
      .map((r) => r.vehicle)
      .filter(Boolean),
  };
}

export async function getBlacklistedCustomers(params: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.CustomerWhereInput = {
    deletedAt: null,
    status: "BLACKLISTED",
    ...(params.search
      ? {
          OR: [
            { fullName: { contains: params.search } },
            { nic: { contains: params.search } },
            { phone: { contains: params.search } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        blacklistedBy: { select: { name: true } },
        _count: { select: { rentals: true } },
      },
      orderBy: { blacklistDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return { customers, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findCustomerByNic(nic: string) {
  const normalized = normalizeNic(nic);
  return prisma.customer.findFirst({
    where: { nic: normalized },
  });
}

export async function isNicTaken(nic: string, excludeId?: string): Promise<boolean> {
  const normalized = normalizeNic(nic);
  const existing = await prisma.customer.findFirst({
    where: {
      nic: normalized,
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
  return !!existing;
}

export function customerToCsvRows(
  customers: Array<{
    customerCode: string;
    fullName: string;
    nic: string;
    phone: string;
    whatsapp: string | null;
    address: string;
    status: CustomerStatus;
    blacklistReason: string | null;
    blacklistDate: Date | null;
    registrationDate: Date;
    blacklistedBy?: { name: string } | null;
    _count?: { rentals: number };
  }>
) {
  const headers = [
    "Customer Code",
    "Full Name",
    "NIC",
    "Phone",
    "WhatsApp",
    "Address",
    "Status",
    "Blacklist Reason",
    "Blacklist Date",
    "Blacklisted By",
    "Total Rentals",
    "Registration Date",
  ];

  const rows = customers.map((c) => [
    c.customerCode,
    c.fullName,
    c.nic,
    c.phone,
    c.whatsapp ?? "",
    c.address.replace(/,/g, ";"),
    c.status,
    c.blacklistReason ?? "",
    c.blacklistDate?.toISOString().split("T")[0] ?? "",
    c.blacklistedBy?.name ?? "",
    String(c._count?.rentals ?? 0),
    c.registrationDate.toISOString().split("T")[0],
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}
