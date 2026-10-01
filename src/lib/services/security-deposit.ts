import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";
import type { SecurityDepositStatus } from "@prisma/client";

export async function getSecurityDepositsByRental(rentalId: string) {
  return prisma.securityDeposit.findMany({
    where: { rentalId },
    orderBy: { receivedDate: "desc" },
  });
}

export function resolveDepositStatus(
  depositAmount: number,
  refundAmount: number,
  amountRetained: number
): SecurityDepositStatus {
  if (amountRetained >= depositAmount && refundAmount === 0) return "FORFEITED";
  if (refundAmount >= depositAmount && amountRetained === 0) return "REFUNDED";
  if (refundAmount > 0 || amountRetained > 0) return "PARTIALLY_REFUNDED";
  return "HELD";
}

export async function getHeldDepositTotal(rentalId: string): Promise<number> {
  const deposits = await prisma.securityDeposit.findMany({
    where: { rentalId, status: { in: ["HELD", "PARTIALLY_REFUNDED"] } },
  });

  return deposits.reduce((sum, d) => {
    const remaining =
      decimalToNumber(d.depositAmount) -
      decimalToNumber(d.refundAmount) -
      decimalToNumber(d.amountRetained);
    return sum + Math.max(0, remaining);
  }, 0);
}

const ACTIVE_DEPOSIT_STATUSES = ["HELD", "PARTIALLY_REFUNDED"] as const;

export function remainingDepositAmount(deposit: {
  depositAmount: { toString(): string } | number;
  refundAmount: { toString(): string } | number;
  amountRetained: { toString(): string } | number;
}) {
  return Math.max(
    0,
    decimalToNumber(deposit.depositAmount) -
      decimalToNumber(deposit.refundAmount) -
      decimalToNumber(deposit.amountRetained)
  );
}

export function getDepositRefundUiState(
  deposits: Array<{
    status: string;
    depositAmount: { toString(): string } | number;
    refundAmount: { toString(): string } | number;
    amountRetained: { toString(): string } | number;
  }>
) {
  const remaining = deposits.reduce((sum, deposit) => {
    if (!ACTIVE_DEPOSIT_STATUSES.includes(deposit.status as (typeof ACTIVE_DEPOSIT_STATUSES)[number])) {
      return sum;
    }
    return sum + remainingDepositAmount(deposit);
  }, 0);

  return {
    remaining,
    hasActive: remaining > 0,
    isFullySettled: deposits.length > 0 && remaining <= 0,
  };
}

export async function ensureHeldSecurityDeposit(rentalId: string) {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    select: {
      id: true,
      status: true,
      securityDeposit: true,
      securityDeposits: {
        select: { id: true, status: true },
        orderBy: { receivedDate: "desc" },
      },
    },
  });
  if (!rental || rental.status === "CANCELLED") return null;

  const held = rental.securityDeposits.find((d) =>
    ACTIVE_DEPOSIT_STATUSES.includes(d.status as (typeof ACTIVE_DEPOSIT_STATUSES)[number])
  );
  if (held) return held;
  if (rental.securityDeposits.length > 0) return null;

  const amount = decimalToNumber(rental.securityDeposit);
  if (amount <= 0) return null;

  return prisma.securityDeposit.create({
    data: {
      rentalId,
      depositAmount: amount,
      paymentMethod: "CASH",
      receivedDate: new Date(),
      notes: "Held from the booking security deposit amount",
      status: "HELD",
    },
    select: { id: true },
  });
}
