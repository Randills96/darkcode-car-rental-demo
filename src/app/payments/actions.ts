"use server";

import { revalidatePath } from "next/cache";
import { invalidateOperationalCaches } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit";
import {
  createPaymentRecord,
  syncRentalPaymentTotals,
  getPaymentById,
  getRentalDamagesForPayment,
} from "@/lib/services/payment";
import {
  resolveDepositStatus,
  getHeldDepositTotal,
} from "@/lib/services/security-deposit";
import { resolveDamagePaymentStatus } from "@/lib/services/damage";
import { decimalToNumber, formatCurrency } from "@/lib/utils";
import { canGenerateCustomerReceipt } from "@/lib/services/customer-receipt";
import { createSettlementsForCompletedRental } from "@/lib/services/settlement";
import {
  markRentalCompleted,
  shouldCompleteHireOnPayment,
} from "@/lib/services/rental";
import {
  paymentFormSchema,
  type PaymentFormValues,
} from "@/lib/validations/payment";
import {
  collectDepositSchema,
  settleDepositSchema,
  type CollectDepositFormValues,
  type SettleDepositFormValues,
} from "@/lib/validations/security-deposit";
import type { ActionResult } from "@/app/customers/actions";

function parseDate(value: string): Date {
  return new Date(value);
}

async function completeHireAfterCashPayment(
  rentalId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await markRentalCompleted(rentalId, userId);
    if (!result.completed) return false;
    try {
      await createSettlementsForCompletedRental(rentalId);
    } catch (error) {
      console.error("createSettlementsForCompletedRental:", error);
    }
    if (!result.alreadyCompleted) {
      try {
        await createAuditLog({
          userId,
          action: "STATUS_CHANGE",
          entityType: "Rental",
          entityId: rentalId,
          details: { from: "RETURNED", to: "COMPLETED", trigger: "CASH_PAYMENT" },
        });
      } catch (error) {
        console.error("createAuditLog:", error);
      }
    }
    return !result.alreadyCompleted;
  } catch (error) {
    console.error("completeHireAfterCashPayment:", error);
    return false;
  }
}

export async function recordPayment(
  input: PaymentFormValues
): Promise<
  ActionResult<{
    id: string;
    fullyPaid: boolean;
    hireCompleted: boolean;
    rentalId: string;
    bookingNumber: string;
  }>
> {
  try {
    const session = await requirePermission("payments.create");
    const parsed = paymentFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = parsed.data;
    const rental = await prisma.rental.findUnique({
      where: { id: data.rentalId },
      select: { id: true, customerId: true, bookingNumber: true, status: true },
    });

    if (!rental) return { success: false, error: "Rental not found" };
    if (rental.status === "CANCELLED") {
      return { success: false, error: "Cannot record payment for cancelled rental" };
    }

    if (data.paymentType === "DAMAGE_PAYMENT" && data.damageId) {
      const damage = await prisma.rentalDamage.findFirst({
        where: { id: data.damageId, rentalId: data.rentalId },
      });
      if (!damage) return { success: false, error: "Damage record not found for this rental" };
    }

    const payment = await createPaymentRecord(prisma, {
      rentalId: data.rentalId,
      customerId: rental.customerId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      paymentType: data.paymentType,
      paymentDate: parseDate(data.paymentDate),
      referenceNumber: data.referenceNumber || null,
      notes: data.notes || null,
      recordedById: session.user.id,
    });

    try {
      await syncRentalPaymentTotals(data.rentalId);
    } catch (error) {
      console.error("syncRentalPaymentTotals:", error);
    }

    if (data.paymentType === "DAMAGE_PAYMENT" && data.damageId) {
      try {
        const damage = await prisma.rentalDamage.findUnique({ where: { id: data.damageId } });
        if (damage) {
          const payments = await prisma.payment.findMany({
            where: {
              rentalId: data.rentalId,
              paymentType: "DAMAGE_PAYMENT",
              notes: { contains: damage.damageCode },
            },
          });
          const totalPaid = payments.reduce((sum, p) => sum + decimalToNumber(p.amount), 0);
          const paymentStatus = resolveDamagePaymentStatus(
            decimalToNumber(damage.customerCharge),
            totalPaid
          );
          await prisma.rentalDamage.update({
            where: { id: data.damageId },
            data: {
              paymentStatus,
              status: paymentStatus === "PAID" ? "RESOLVED" : damage.status,
            },
          });
        }
      } catch (error) {
        console.error("damage payment status update:", error);
      }
    }

    try {
      await createAuditLog({
        userId: session.user.id,
        action: "PAYMENT",
        entityType: "Payment",
        entityId: payment.id,
        details: {
          paymentCode: payment.paymentCode,
          amount: data.amount,
          paymentType: data.paymentType,
          rentalId: data.rentalId,
          bookingNumber: rental.bookingNumber,
        },
      });
    } catch (error) {
      console.error("createAuditLog:", error);
    }

    let hireCompleted = false;
    if (
      shouldCompleteHireOnPayment({
        rentalStatus: rental.status,
        paymentMethod: data.paymentMethod,
      })
    ) {
      hireCompleted = await completeHireAfterCashPayment(data.rentalId, session.user.id);
    }

    try {
      revalidatePath("/payments");
      revalidatePath(`/rentals/${data.rentalId}`);
      if (hireCompleted) {
        revalidatePath("/rentals");
      }
      invalidateOperationalCaches();
    } catch (error) {
      console.error("recordPayment cache:", error);
    }

    const updatedRental = await prisma.rental.findUnique({
      where: { id: data.rentalId },
      select: { balance: true, status: true },
    });
    const fullyPaid = updatedRental ? canGenerateCustomerReceipt(updatedRental) : false;

    let message = "Payment recorded successfully";
    if (hireCompleted && fullyPaid) {
      message = "Cash recorded. Hire completed — customer receipt is ready to print.";
    } else if (hireCompleted) {
      message = "Cash recorded. Hire marked as completed.";
    } else if (fullyPaid) {
      message = "Payment recorded. Rental is fully paid — customer receipt is ready to print.";
    }

    return {
      success: true,
      data: {
        id: payment.id,
        fullyPaid,
        hireCompleted,
        rentalId: data.rentalId,
        bookingNumber: rental.bookingNumber,
      },
      message,
    };
  } catch (error) {
    console.error("recordPayment:", error);
    if (error instanceof Error && /transaction/i.test(error.message)) {
      return { success: false, error: "Could not save this payment. Please try Record Payment again." };
    }
    return { success: false, error: "Failed to record payment" };
  }
}

export async function collectSecurityDeposit(
  input: CollectDepositFormValues
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePermission("payments.create");
    const parsed = collectDepositSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    const data = parsed.data;
    const rental = await prisma.rental.findUnique({
      where: { id: data.rentalId },
      select: { id: true, customerId: true, bookingNumber: true, status: true },
    });

    if (!rental) return { success: false, error: "Rental not found" };
    if (["CANCELLED", "INQUIRY"].includes(rental.status)) {
      return { success: false, error: "Cannot collect deposit for this rental status" };
    }

    const existingHeld = await getHeldDepositTotal(data.rentalId);
    if (existingHeld > 0) {
      return { success: false, error: "An active security deposit is already held for this rental" };
    }

    const deposit = await prisma.securityDeposit.create({
      data: {
        rentalId: data.rentalId,
        depositAmount: data.depositAmount,
        paymentMethod: data.paymentMethod,
        receivedDate: parseDate(data.receivedDate),
        notes: data.notes || null,
        status: "HELD",
      },
    });

    await createPaymentRecord(prisma, {
      rentalId: data.rentalId,
      customerId: rental.customerId,
      amount: data.depositAmount,
      paymentMethod: data.paymentMethod,
      paymentType: "SECURITY_DEPOSIT",
      paymentDate: parseDate(data.receivedDate),
      notes: data.notes ? `Security deposit: ${data.notes}` : "Security deposit collection",
      recordedById: session.user.id,
    });

    await prisma.rental.update({
      where: { id: data.rentalId },
      data: { securityDeposit: data.depositAmount },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "PAYMENT",
      entityType: "SecurityDeposit",
      entityId: deposit.id,
      details: { rentalId: data.rentalId, depositAmount: data.depositAmount },
    });

    revalidatePath("/payments");
    revalidatePath(`/rentals/${data.rentalId}`);
    invalidateOperationalCaches();
    return { success: true, data: { id: deposit.id }, message: "Security deposit collected" };
  } catch (error) {
    console.error("collectSecurityDeposit:", error);
    return { success: false, error: "Failed to collect security deposit" };
  }
}

export async function settleSecurityDeposit(
  input: SettleDepositFormValues
): Promise<ActionResult> {
  try {
    const session = await requirePermission("payments.create");
    const parsed = settleDepositSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    const data = parsed.data;
    const deposit = await prisma.securityDeposit.findUnique({
      where: { id: data.depositId },
      include: { rental: { select: { id: true, customerId: true, bookingNumber: true } } },
    });

    if (!deposit) return { success: false, error: "Security deposit not found" };
    if (deposit.status === "REFUNDED" || deposit.status === "FORFEITED") {
      return { success: false, error: "Deposit has already been fully settled" };
    }

    const depositAmount = decimalToNumber(deposit.depositAmount);
    const alreadyRefunded = decimalToNumber(deposit.refundAmount);
    const alreadyRetained = decimalToNumber(deposit.amountRetained);
    const remaining = depositAmount - alreadyRefunded - alreadyRetained;

    if (data.refundAmount + data.amountRetained > remaining + 0.001) {
      return {
        success: false,
        error: `Settlement exceeds remaining deposit (${formatCurrency(remaining)})`,
      };
    }

    const newRefundTotal = alreadyRefunded + data.refundAmount;
    const newRetainedTotal = alreadyRetained + data.amountRetained;
    const newStatus = resolveDepositStatus(depositAmount, newRefundTotal, newRetainedTotal);

    await prisma.securityDeposit.update({
      where: { id: data.depositId },
      data: {
        refundAmount: newRefundTotal,
        amountRetained: newRetainedTotal,
        retainReason: data.retainReason || deposit.retainReason,
        refundDate: parseDate(data.refundDate),
        refundMethod: data.refundMethod || deposit.refundMethod || deposit.paymentMethod,
        status: newStatus,
        notes: data.notes || deposit.notes,
      },
    });

    if (data.refundAmount > 0) {
      await createPaymentRecord(prisma, {
        rentalId: deposit.rentalId,
        customerId: deposit.rental.customerId,
        amount: data.refundAmount,
        paymentMethod: data.refundMethod || deposit.refundMethod || deposit.paymentMethod,
        paymentType: "SECURITY_DEPOSIT_REFUND",
        paymentDate: parseDate(data.refundDate),
        notes: data.notes ? `Deposit refund: ${data.notes}` : "Security deposit refund",
        recordedById: session.user.id,
      });
    }

    await createAuditLog({
      userId: session.user.id,
      action: "SETTLEMENT",
      entityType: "SecurityDeposit",
      entityId: deposit.id,
      details: { refundAmount: data.refundAmount, amountRetained: data.amountRetained, status: newStatus },
    });

    revalidatePath("/payments");
    revalidatePath(`/rentals/${deposit.rentalId}`);
    revalidatePath(`/rentals/${deposit.rentalId}/refund-deposit`);
    invalidateOperationalCaches();
    return { success: true, message: "Security deposit settled successfully" };
  } catch (error) {
    console.error("settleSecurityDeposit:", error);
    return { success: false, error: "Failed to settle security deposit" };
  }
}

export async function reviseSecurityDeposit(
  input: SettleDepositFormValues
): Promise<ActionResult> {
  try {
    const session = await requirePermission("payments.edit");
    const parsed = settleDepositSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    const data = parsed.data;
    const deposit = await prisma.securityDeposit.findUnique({
      where: { id: data.depositId },
      include: { rental: { select: { id: true, customerId: true } } },
    });

    if (!deposit) return { success: false, error: "Security deposit not found" };

    const depositAmount = decimalToNumber(deposit.depositAmount);
    if (data.refundAmount + data.amountRetained > depositAmount + 0.001) {
      return {
        success: false,
        error: `Settlement exceeds deposit (${formatCurrency(depositAmount)})`,
      };
    }

    const newStatus = resolveDepositStatus(depositAmount, data.refundAmount, data.amountRetained);

    await prisma.securityDeposit.update({
      where: { id: data.depositId },
      data: {
        refundAmount: data.refundAmount,
        amountRetained: data.amountRetained,
        retainReason: data.retainReason || null,
        refundDate: data.refundAmount > 0 ? parseDate(data.refundDate) : null,
        refundMethod: data.refundAmount > 0 ? data.refundMethod || deposit.paymentMethod : null,
        status: newStatus,
        notes: data.notes || deposit.notes,
      },
    });

    const refundPayments = await prisma.payment.findMany({
      where: { rentalId: deposit.rentalId, paymentType: "SECURITY_DEPOSIT_REFUND" },
      orderBy: { createdAt: "desc" },
    });

    if (data.refundAmount <= 0) {
      if (refundPayments.length > 0) {
        await prisma.payment.deleteMany({
          where: { id: { in: refundPayments.map((p) => p.id) } },
        });
      }
    } else if (refundPayments[0]) {
      await prisma.payment.update({
        where: { id: refundPayments[0].id },
        data: {
          amount: data.refundAmount,
          paymentMethod: data.refundMethod || refundPayments[0].paymentMethod,
          paymentDate: parseDate(data.refundDate),
          notes: data.notes ? `Deposit refund: ${data.notes}` : "Security deposit refund",
        },
      });
      if (refundPayments.length > 1) {
        await prisma.payment.deleteMany({
          where: { id: { in: refundPayments.slice(1).map((p) => p.id) } },
        });
      }
    } else {
      await createPaymentRecord(prisma, {
        rentalId: deposit.rentalId,
        customerId: deposit.rental.customerId,
        amount: data.refundAmount,
        paymentMethod: data.refundMethod || deposit.paymentMethod,
        paymentType: "SECURITY_DEPOSIT_REFUND",
        paymentDate: parseDate(data.refundDate),
        notes: data.notes ? `Deposit refund: ${data.notes}` : "Security deposit refund",
        recordedById: session.user.id,
      });
    }

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "SecurityDeposit",
      entityId: deposit.id,
      details: { refundAmount: data.refundAmount, amountRetained: data.amountRetained, status: newStatus },
    });

    revalidatePath("/payments");
    revalidatePath(`/rentals/${deposit.rentalId}`);
    revalidatePath(`/rentals/${deposit.rentalId}/refund-deposit`);
    invalidateOperationalCaches();
    return { success: true, message: "Deposit refund updated" };
  } catch (error) {
    console.error("reviseSecurityDeposit:", error);
    return { success: false, error: "Failed to update deposit refund" };
  }
}

export async function fetchRentalDamagesForPayment(rentalId: string) {
  await requirePermission("payments.view");
  return getRentalDamagesForPayment(rentalId);
}

export async function getPaymentDetails(id: string) {
  await requirePermission("payments.view");
  return getPaymentById(id);
}
