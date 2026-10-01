import { prisma } from "@/lib/db";
import { generateCode, decimalToNumber } from "@/lib/utils";
import { calculateBalance } from "@/lib/services/pricing";
import type { PaymentSearchParams } from "@/lib/validations/payment";
import { Prisma, type PaymentType } from "@prisma/client";

export const BALANCE_AFFECTING_PAYMENT_TYPES: PaymentType[] = [
  "ADVANCE",
  "RENTAL_PAYMENT",
  "FINAL_PAYMENT",
  "DAMAGE_PAYMENT",
  "ADDITIONAL_CHARGE",
];

function isDuplicateKeyError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return true;
  }
  return error instanceof Error && /duplicate entry/i.test(error.message);
}

export async function generatePaymentCode(
  tx: Prisma.TransactionClient | typeof prisma = prisma
): Promise<string> {
  const count = await tx.payment.count();
  const suffix = `${Date.now().toString(36).slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
  return `${generateCode("PAY", count + 1)}-${suffix}`;
}

export async function createPaymentRecord(
  tx: Prisma.TransactionClient | typeof prisma,
  data: Omit<Prisma.PaymentUncheckedCreateInput, "paymentCode">
) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await tx.payment.create({
        data: {
          ...data,
          paymentCode: await generatePaymentCode(tx),
        },
      });
    } catch (error) {
      if (!isDuplicateKeyError(error) || attempt === 3) throw error;
    }
  }
  throw new Error("Failed to create payment");
}

export async function syncRentalPaymentTotals(
  rentalId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma
) {
  const rental = await tx.rental.findUnique({ where: { id: rentalId } });
  if (!rental) throw new Error("Rental not found");

  const payments = await tx.payment.findMany({
    where: {
      rentalId,
      paymentType: { in: BALANCE_AFFECTING_PAYMENT_TYPES },
    },
  });

  const totalPaid = payments.reduce((sum, p) => sum + decimalToNumber(p.amount), 0);
  const finalTotal = decimalToNumber(rental.finalTotal);
  const balance = calculateBalance(finalTotal, totalPaid);

  await tx.rental.update({
    where: { id: rentalId },
    data: { totalPaid, balance },
  });

  return { totalPaid, balance, finalTotal };
}

export async function getPayments(params: PaymentSearchParams) {
  const { search, paymentType, paymentMethod, page, limit, sortBy, sortOrder } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.PaymentWhereInput = {
    ...(paymentType && paymentType !== "ALL" ? { paymentType: paymentType as PaymentType } : {}),
    ...(paymentMethod && paymentMethod !== "ALL" ? { paymentMethod } : {}),
    ...(search
      ? {
          OR: [
            { paymentCode: { contains: search } },
            { referenceNumber: { contains: search } },
            { rental: { bookingNumber: { contains: search } } },
            { customer: { fullName: { contains: search } } },
          ],
        }
      : {}),
  };

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        rental: { select: { id: true, bookingNumber: true, status: true } },
        customer: { select: { id: true, fullName: true } },
        recordedBy: { select: { name: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  return { payments, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getPaymentById(id: string) {
  return prisma.payment.findUnique({
    where: { id },
    include: {
      rental: {
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          finalTotal: true,
          totalPaid: true,
          balance: true,
        },
      },
      customer: { select: { id: true, fullName: true, phone: true } },
      recordedBy: { select: { name: true } },
    },
  });
}

export async function getRentalsForPaymentSelect() {
  const rentals = await prisma.rental.findMany({
    where: { status: { notIn: ["CANCELLED", "INQUIRY"] } },
    select: {
      id: true,
      bookingNumber: true,
      status: true,
      customerId: true,
      finalTotal: true,
      totalPaid: true,
      balance: true,
      customer: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return rentals.map((rental) => ({
    ...rental,
    finalTotal: decimalToNumber(rental.finalTotal),
    totalPaid: decimalToNumber(rental.totalPaid),
    balance: decimalToNumber(rental.balance),
  }));
}

export async function getRentalDamagesForPayment(rentalId: string) {
  return prisma.rentalDamage.findMany({
    where: { rentalId, paymentStatus: { not: "PAID" } },
    select: {
      id: true,
      damageCode: true,
      damageType: true,
      customerCharge: true,
      paymentStatus: true,
    },
    orderBy: { damageDate: "desc" },
  });
}
