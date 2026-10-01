import { prisma } from "@/lib/db";
import { getSystemSettings } from "@/lib/services/settings";
import { decimalToNumber } from "@/lib/utils";
import {
  createPdfBuffer,
  drawReceiptFooter,
  drawReceiptHeader,
  drawStatusBadge,
  drawTableSection,
  drawTwoColumnInfoBox,
  formatReceiptDate,
  formatReceiptMoney,
  PAYMENT_METHOD_LABELS,
  RECEIPT_COLORS,
  pageMetrics,
} from "@/lib/services/pdf-receipt-utils";

export function canGenerateOwnerSettlementReceipt(): boolean {
  return true;
}

export async function getOwnerSettlementReceiptData(settlementId: string) {
  const [settlement, settings] = await Promise.all([
    prisma.ownerSettlement.findUnique({
      where: { id: settlementId },
      include: {
        owner: {
          select: {
            name: true,
            ownerCode: true,
            phone: true,
            email: true,
            nic: true,
            bankName: true,
            bankAccount: true,
            bankBranch: true,
          },
        },
        rental: {
          select: {
            bookingNumber: true,
            pickupDate: true,
            pickupTime: true,
            returnDate: true,
            returnTime: true,
            rentalDays: true,
            extraKm: true,
            finalTotal: true,
            vehicle: {
              select: { registrationNumber: true, make: true, model: true },
            },
          },
        },
        paidBy: { select: { name: true } },
      },
    }),
    getSystemSettings(),
  ]);

  if (!settlement) return null;

  const ownerDaily = decimalToNumber(settlement.ownerDailyRate);
  const ownerExtra = decimalToNumber(settlement.ownerExtraKmRate);
  const ownerPayable = decimalToNumber(settlement.ownerPayable);
  const companyCommission = decimalToNumber(settlement.companyCommission);
  const rentalRevenue = decimalToNumber(settlement.rentalRevenue);
  const paidAmount = decimalToNumber(settlement.paidAmount);
  const balance = Math.max(0, ownerPayable - paidAmount);
  const sym = settings.currency_symbol;

  const ownerCostLines: Array<{ label: string; amount: number }> = [];
  if (ownerDaily > 0) {
    ownerCostLines.push({
      label: `Owner daily rate (${settlement.billableDays} day(s) @ ${formatReceiptMoney(sym, ownerDaily)}/day)`,
      amount: ownerDaily * settlement.billableDays,
    });
  }
  if (ownerExtra > 0 && settlement.billableExtraKm > 0) {
    ownerCostLines.push({
      label: `Owner extra KM rate (${settlement.billableExtraKm.toLocaleString()} km @ ${formatReceiptMoney(sym, ownerExtra)}/km)`,
      amount: ownerExtra * settlement.billableExtraKm,
    });
  }
  if (ownerCostLines.length === 0) {
    ownerCostLines.push({
      label: `Owner payout (agreed share for booking ${settlement.rental.bookingNumber})`,
      amount: ownerPayable,
    });
  }

  return {
    companyName: settings.company_name,
    currency: settings.currency,
    currencySymbol: sym,
    receiptNumber: `OSR-${settlement.rental.bookingNumber}`,
    issuedAt: new Date(),
    owner: settlement.owner,
    rental: settlement.rental,
    rentalRevenue,
    companyCommission,
    ownerCostLines,
    ownerPayable,
    paidAmount,
    balance,
    status: settlement.status,
    paymentDate: settlement.paymentDate,
    paymentMethod: settlement.paymentMethod
      ? PAYMENT_METHOD_LABELS[settlement.paymentMethod]
      : null,
    referenceNumber: settlement.referenceNumber,
    notes: settlement.notes,
    paidBy: settlement.paidBy?.name ?? null,
  };
}

export async function generateOwnerSettlementReceiptPdf(
  settlementId: string
): Promise<Buffer | null> {
  const data = await getOwnerSettlementReceiptData(settlementId);
  if (!data) return null;

  return createPdfBuffer((doc) => {
    const sym = data.currencySymbol;

    drawReceiptHeader(doc, {
      companyName: data.companyName,
      subtitle: "Third-Party Vehicle Owner — Settlement Costing Breakdown",
      receiptNumber: data.receiptNumber,
      issuedAt: data.issuedAt,
    });

    const ownerLines = [
      `Name: ${data.owner.name}`,
      `Code: ${data.owner.ownerCode}`,
      `Phone: ${data.owner.phone}`,
      ...(data.owner.email ? [`Email: ${data.owner.email}`] : []),
      ...(data.owner.nic ? [`NIC: ${data.owner.nic}`] : []),
      ...(data.owner.bankName ? [`Bank: ${data.owner.bankName}`] : []),
      ...(data.owner.bankAccount ? [`Account: ${data.owner.bankAccount}`] : []),
      ...(data.owner.bankBranch ? [`Branch: ${data.owner.bankBranch}`] : []),
    ];

    drawTwoColumnInfoBox(
      doc,
      "BOOKING DETAILS",
      [
        `Booking No: ${data.rental.bookingNumber}`,
        `Period: ${formatReceiptDate(data.rental.pickupDate)} ${data.rental.pickupTime} to ${formatReceiptDate(data.rental.returnDate)} ${data.rental.returnTime}`,
        `Duration: ${data.rental.rentalDays} day(s)`,
        data.rental.vehicle
          ? `Vehicle: ${data.rental.vehicle.registrationNumber} — ${data.rental.vehicle.make} ${data.rental.vehicle.model}`
          : "Vehicle: —",
        `Customer rental revenue: ${formatReceiptMoney(sym, data.rentalRevenue)}`,
      ],
      "VEHICLE OWNER",
      ownerLines
    );

    drawTableSection(
      doc,
      sym,
      "Owner Costing Breakdown",
      [
        ...data.ownerCostLines,
        {
          label: "Company margin / commission retained",
          amount: data.companyCommission,
        },
      ],
      "OWNER PAYABLE",
      data.ownerPayable
    );

    if (data.paidAmount > 0) {
      drawTableSection(
        doc,
        sym,
        "Payments to Owner",
        [
          {
            label: data.paymentDate
              ? `Payment on ${formatReceiptDate(data.paymentDate)}${data.paymentMethod ? ` (${data.paymentMethod})` : ""}${data.referenceNumber ? ` — Ref: ${data.referenceNumber}` : ""}`
              : "Settlement payment recorded",
            amount: data.paidAmount,
          },
        ],
        "TOTAL PAID",
        data.paidAmount
      );

      const { left, width } = pageMetrics(doc);
      doc.fillColor(RECEIPT_COLORS.muted).font("Helvetica").fontSize(9);
      doc.text(
        `Balance remaining: ${formatReceiptMoney(sym, data.balance)}${data.paidBy ? `  |  Recorded by: ${data.paidBy}` : ""}`,
        left,
        doc.y,
        { width, align: "center" }
      );
      doc.y += 16;
    } else {
      const { left, width } = pageMetrics(doc);
      doc.fillColor(RECEIPT_COLORS.warning).font("Helvetica-Bold").fontSize(10);
      doc.text(`Amount due to owner: ${formatReceiptMoney(sym, data.balance)}`, left, doc.y, {
        width,
        align: "center",
      });
      doc.y += 20;
    }

    if (data.status === "PAID") {
      drawStatusBadge(doc, "SETTLED IN FULL");
    } else if (data.status === "PARTIALLY_PAID") {
      drawStatusBadge(doc, "PARTIALLY PAID", RECEIPT_COLORS.warning);
    } else {
      drawStatusBadge(doc, "PENDING PAYMENT", RECEIPT_COLORS.warning);
    }

    if (data.notes) {
      const { left, width } = pageMetrics(doc);
      doc.fillColor(RECEIPT_COLORS.muted).font("Helvetica").fontSize(8);
      doc.text(`Notes: ${data.notes}`, left, doc.y, { width });
      doc.y += 14;
    }

    drawReceiptFooter(doc, {
      companyName: data.companyName,
      currency: data.currency,
      note: "This document shows how the owner payout was calculated for the rental booking listed above.",
    });
  });
}
