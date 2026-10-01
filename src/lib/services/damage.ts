import { prisma } from "@/lib/db";
import { decimalToNumber, generateCode } from "@/lib/utils";
import type { DamageSearchParams } from "@/lib/validations/damage";
import type { DamagePaymentStatus, DamageStatus, Prisma } from "@prisma/client";

export type DamageDetailClient = {
  id: string;
  rentalId: string;
  damageCode: string;
  damageType: string;
  description: string;
  estimatedCost: number;
  customerCharge: number;
  damageDate: string;
  status: DamageStatus;
  paymentStatus: DamagePaymentStatus;
  notes: string | null;
  rental: { id: string; bookingNumber: string; status: string };
  customer: { id: string; fullName: string };
  vehicle: { id: string; registrationNumber: string; make: string; model: string };
};

export function serializeDamageDetail(
  damage: NonNullable<Awaited<ReturnType<typeof getDamageById>>>
): DamageDetailClient {
  return {
    id: damage.id,
    rentalId: damage.rentalId,
    damageCode: damage.damageCode,
    damageType: damage.damageType,
    description: damage.description,
    estimatedCost: decimalToNumber(damage.estimatedCost),
    customerCharge: decimalToNumber(damage.customerCharge),
    damageDate: damage.damageDate.toISOString(),
    status: damage.status,
    paymentStatus: damage.paymentStatus,
    notes: damage.notes,
    rental: {
      id: damage.rental.id,
      bookingNumber: damage.rental.bookingNumber,
      status: damage.rental.status,
    },
    customer: {
      id: damage.customer.id,
      fullName: damage.customer.fullName,
    },
    vehicle: {
      id: damage.vehicle.id,
      registrationNumber: damage.vehicle.registrationNumber,
      make: damage.vehicle.make,
      model: damage.vehicle.model,
    },
  };
}

export async function generateDamageCode(): Promise<string> {
  const [count, last] = await Promise.all([
    prisma.rentalDamage.count(),
    prisma.rentalDamage.findFirst({
      orderBy: { damageCode: "desc" },
      select: { damageCode: true },
    }),
  ]);

  let next = count + 1;
  if (last?.damageCode) {
    const match = last.damageCode.match(/(\d+)$/);
    if (match) {
      const lastSeq = parseInt(match[1], 10);
      if (!isNaN(lastSeq)) {
        next = Math.max(next, lastSeq + 1);
      }
    }
  }

  while (true) {
    const code = generateCode("DMG", next);
    const existing = await prisma.rentalDamage.findUnique({
      where: { damageCode: code },
      select: { id: true },
    });
    if (!existing) {
      return code;
    }
    next++;
  }
}

export async function getDamages(params: DamageSearchParams) {
  const { search, status, paymentStatus, page, limit, sortBy, sortOrder } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.RentalDamageWhereInput = {
    ...(status && status !== "ALL" ? { status: status as DamageStatus } : {}),
    ...(paymentStatus && paymentStatus !== "ALL"
      ? { paymentStatus: paymentStatus as DamagePaymentStatus }
      : {}),
    ...(search
      ? {
          OR: [
            { damageCode: { contains: search } },
            { damageType: { contains: search } },
            { description: { contains: search } },
            { rental: { bookingNumber: { contains: search } } },
            { customer: { fullName: { contains: search } } },
            { vehicle: { registrationNumber: { contains: search } } },
          ],
        }
      : {}),
  };

  const [damages, total] = await Promise.all([
    prisma.rentalDamage.findMany({
      where,
      include: {
        rental: { select: { id: true, bookingNumber: true, status: true } },
        customer: { select: { id: true, fullName: true } },
        vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.rentalDamage.count({ where }),
  ]);

  return { damages, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getDamageById(id: string) {
  return prisma.rentalDamage.findUnique({
    where: { id },
    include: {
      rental: {
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          finalTotal: true,
          balance: true,
        },
      },
      customer: true,
      vehicle: { include: { owner: { select: { name: true } } } },
    },
  });
}

export async function getRentalsForDamageSelect() {
  return prisma.rental.findMany({
    where: {
      vehicleId: { not: null },
      status: { in: ["ACTIVE", "RETURNED", "COMPLETED"] },
    },
    select: {
      id: true,
      bookingNumber: true,
      status: true,
      vehicleId: true,
      customerId: true,
      customer: { select: { fullName: true } },
      vehicle: { select: { registrationNumber: true, make: true, model: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export function resolveDamagePaymentStatus(
  customerCharge: number,
  paidAmount: number
): DamagePaymentStatus {
  if (paidAmount <= 0) return "UNPAID";
  if (paidAmount >= customerCharge) return "PAID";
  return "PARTIALLY_PAID";
}

export function isDamageEditable(damage: { paymentStatus: DamagePaymentStatus }): boolean {
  return damage.paymentStatus !== "PAID";
}
