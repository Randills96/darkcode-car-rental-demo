"use server";

import { revalidatePath } from "next/cache";
import { invalidateOperationalCaches } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit";
import {
  resolveSettlementStatus,
  getOwnerSettlementById,
  getBrokerCommissionById,
  recordSettlementCashPayout,
} from "@/lib/services/settlement";
import { generateBrokerSettlementReceiptPdf } from "@/lib/services/broker-settlement-receipt";
import { generateOwnerSettlementReceiptPdf } from "@/lib/services/owner-settlement-receipt";
import { getSystemSettings } from "@/lib/services/settings";
import { sendEmailWithPdfAttachment } from "@/lib/services/email";
import { decimalToNumber, formatCurrency } from "@/lib/utils";
import {
  settlementPaymentSchema,
  type SettlementPaymentFormValues,
} from "@/lib/validations/settlement";
import type { ActionResult } from "@/app/customers/actions";

function parseDate(value: string): Date {
  return new Date(value);
}

export async function payOwnerSettlement(
  settlementId: string,
  input: SettlementPaymentFormValues
): Promise<ActionResult> {
  try {
    const session = await requirePermission("settlements.create");
    const parsed = settlementPaymentSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    const settlement = await getOwnerSettlementById(settlementId);
    if (!settlement) return { success: false, error: "Settlement not found" };
    if (settlement.status === "PAID") {
      return { success: false, error: "Settlement is already fully paid" };
    }

    const ownerPayable = decimalToNumber(settlement.ownerPayable);
    const currentPaid = decimalToNumber(settlement.paidAmount);
    const remaining = ownerPayable - currentPaid;

    if (parsed.data.amount > remaining + 0.001) {
      return {
        success: false,
        error: `Payment exceeds remaining balance (${formatCurrency(remaining)})`,
      };
    }

    const newPaidAmount = currentPaid + parsed.data.amount;
    const newStatus = resolveSettlementStatus(ownerPayable, newPaidAmount);

    await prisma.ownerSettlement.update({
      where: { id: settlementId },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
        paymentDate: parseDate(parsed.data.paymentDate),
        paymentMethod: parsed.data.paymentMethod,
        referenceNumber: parsed.data.referenceNumber || settlement.referenceNumber,
        notes: parsed.data.notes || settlement.notes,
        paidById: session.user.id,
      },
    });

    try {
      await recordSettlementCashPayout({
        kind: "owner",
        amount: parsed.data.amount,
        expenseDate: parseDate(parsed.data.paymentDate),
        bookingNumber: settlement.rental.bookingNumber,
        vehicleId: settlement.rental.vehicleId,
        rentalId: settlement.rental.id,
        ownerId: settlement.ownerId,
        settlementId,
        paidAmountTotal: newPaidAmount,
        referenceNumber: parsed.data.referenceNumber,
        notes: parsed.data.notes,
        createdById: session.user.id,
      });
    } catch (error) {
      console.error("recordSettlementCashPayout owner:", error);
    }

    await createAuditLog({
      userId: session.user.id,
      action: "SETTLEMENT",
      entityType: "OwnerSettlement",
      entityId: settlementId,
      details: {
        amount: parsed.data.amount,
        bookingNumber: settlement.rental.bookingNumber,
        ownerName: settlement.owner.name,
        status: newStatus,
      },
    });

    revalidatePath("/settlements");
    revalidatePath("/owners");
    revalidatePath(`/owners/${settlement.ownerId}`);
    revalidatePath("/rentals");
    revalidatePath(`/rentals/${settlement.rental.id}`);
    revalidatePath("/expenses");
    invalidateOperationalCaches();
    return { success: true, message: "Owner settlement payment recorded" };
  } catch (error) {
    console.error("payOwnerSettlement:", error);
    return { success: false, error: "Failed to record owner settlement payment" };
  }
}

export async function payBrokerCommission(
  commissionId: string,
  input: SettlementPaymentFormValues
): Promise<ActionResult> {
  try {
    const session = await requirePermission("settlements.create");
    const parsed = settlementPaymentSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    const commission = await getBrokerCommissionById(commissionId);
    if (!commission) return { success: false, error: "Commission record not found" };
    if (commission.status === "PAID") {
      return { success: false, error: "Commission is already fully paid" };
    }

    const commissionAmount = decimalToNumber(commission.commissionAmount);
    const currentPaid = decimalToNumber(commission.paidAmount);
    const remaining = commissionAmount - currentPaid;

    if (parsed.data.amount > remaining + 0.001) {
      return {
        success: false,
        error: `Payment exceeds remaining balance (${formatCurrency(remaining)})`,
      };
    }

    const newPaidAmount = currentPaid + parsed.data.amount;
    const newStatus = resolveSettlementStatus(commissionAmount, newPaidAmount);

    await prisma.brokerCommission.update({
      where: { id: commissionId },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
        paymentDate: parseDate(parsed.data.paymentDate),
        paymentMethod: parsed.data.paymentMethod,
        referenceNumber: parsed.data.referenceNumber || commission.referenceNumber,
        notes: parsed.data.notes || commission.notes,
        paidById: session.user.id,
      },
    });

    try {
      await recordSettlementCashPayout({
        kind: "broker",
        amount: parsed.data.amount,
        expenseDate: parseDate(parsed.data.paymentDate),
        bookingNumber: commission.rental.bookingNumber,
        vehicleId: commission.rental.vehicleId,
        rentalId: commission.rental.id,
        brokerId: commission.brokerId,
        settlementId: commissionId,
        paidAmountTotal: newPaidAmount,
        referenceNumber: parsed.data.referenceNumber,
        notes: parsed.data.notes,
        createdById: session.user.id,
      });
    } catch (error) {
      console.error("recordSettlementCashPayout broker:", error);
    }

    await createAuditLog({
      userId: session.user.id,
      action: "SETTLEMENT",
      entityType: "BrokerCommission",
      entityId: commissionId,
      details: {
        amount: parsed.data.amount,
        bookingNumber: commission.rental.bookingNumber,
        brokerName: commission.broker.name,
        status: newStatus,
      },
    });

    revalidatePath("/settlements");
    revalidatePath("/brokers");
    revalidatePath(`/brokers/${commission.brokerId}`);
    revalidatePath("/rentals");
    revalidatePath(`/rentals/${commission.rental.id}`);
    revalidatePath("/expenses");
    invalidateOperationalCaches();
    return { success: true, message: "Broker commission payment recorded" };
  } catch (error) {
    console.error("payBrokerCommission:", error);
    return { success: false, error: "Failed to record broker commission payment" };
  }
}

export async function sendBrokerSettlementReceiptEmail(
  commissionId: string
): Promise<ActionResult> {
  try {
    const session = await requirePermission("settlements.create");
    const commission = await getBrokerCommissionById(commissionId);
    if (!commission) return { success: false, error: "Commission record not found" };

    const email = commission.broker.email?.trim();
    if (!email) {
      return {
        success: false,
        error: "No email on file for this broker. Add an email on the broker profile first.",
      };
    }

    const pdf = await generateBrokerSettlementReceiptPdf(commissionId);
    if (!pdf) {
      return {
        success: false,
        error: "Receipt is available after at least one commission payment is recorded.",
      };
    }

    const settings = await getSystemSettings();
    const result = await sendEmailWithPdfAttachment({
      to: email,
      subject: `${settings.company_name} — Broker commission receipt (${commission.rental.bookingNumber})`,
      text: `Dear ${commission.broker.name},\n\nPlease find attached your broker commission payment receipt for booking ${commission.rental.bookingNumber}.\n\nThank you,\n${settings.company_name}`,
      filename: `broker-commission-${commission.rental.bookingNumber}.pdf`,
      pdf,
    });

    if (!result.success) return { success: false, error: result.error };

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "BrokerCommission",
      entityId: commissionId,
      details: { emailedReceiptTo: email, bookingNumber: commission.rental.bookingNumber },
    });

    return { success: true, message: `Broker receipt emailed to ${email}` };
  } catch (error) {
    console.error("sendBrokerSettlementReceiptEmail:", error);
    return { success: false, error: "Failed to send broker receipt email" };
  }
}

export async function sendOwnerSettlementReceiptEmail(
  settlementId: string
): Promise<ActionResult> {
  try {
    const session = await requirePermission("settlements.create");
    const settlement = await getOwnerSettlementById(settlementId);
    if (!settlement) return { success: false, error: "Settlement not found" };

    const email = settlement.owner.email?.trim();
    if (!email) {
      return {
        success: false,
        error: "No email on file for this owner. Add an email on the owner profile first.",
      };
    }

    const pdf = await generateOwnerSettlementReceiptPdf(settlementId);
    if (!pdf) return { success: false, error: "Could not generate owner settlement document." };

    const settings = await getSystemSettings();
    const result = await sendEmailWithPdfAttachment({
      to: email,
      subject: `${settings.company_name} — Owner settlement breakdown (${settlement.rental.bookingNumber})`,
      text: `Dear ${settlement.owner.name},\n\nPlease find attached the costing breakdown for your vehicle settlement on booking ${settlement.rental.bookingNumber}.\n\nThank you,\n${settings.company_name}`,
      filename: `owner-settlement-${settlement.rental.bookingNumber}.pdf`,
      pdf,
    });

    if (!result.success) return { success: false, error: result.error };

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "OwnerSettlement",
      entityId: settlementId,
      details: { emailedReceiptTo: email, bookingNumber: settlement.rental.bookingNumber },
    });

    return { success: true, message: `Owner breakdown emailed to ${email}` };
  } catch (error) {
    console.error("sendOwnerSettlementReceiptEmail:", error);
    return { success: false, error: "Failed to send owner settlement email" };
  }
}
