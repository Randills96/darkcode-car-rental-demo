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

export function canGenerateBrokerSettlementReceipt(): boolean {
  return true;
}

export async function getBrokerSettlementReceiptData(commissionId: string) {
  const [commission, settings] = await Promise.all([
    prisma.brokerCommission.findUnique({
      where: { id: commissionId },
      include: {
        broker: {
          select: {
            name: true,
            brokerCode: true,
            phone: true,
            email: true,
            nic: true,
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

  if (!commission) return null;

  const perDay = decimalToNumber(commission.commissionPerDay);
  const perKm = decimalToNumber(commission.commissionPerExtraKm);
  const commissionAmount = decimalToNumber(commission.commissionAmount);
  const paidAmount = decimalToNumber(commission.paidAmount);
  const balance = Math.max(0, commissionAmount - paidAmount);

  const breakdownLines: Array<{ label: string; amount: number }> = [];
  if (perDay > 0) {
    breakdownLines.push({
      label: `Commission per day (${commission.billableDays} day(s) @ ${formatReceiptMoney(settings.currency_symbol, perDay)}/day)`,
      amount: perDay * commission.billableDays,
    });
  }
  if (perKm > 0 && commission.billableExtraKm > 0) {
    breakdownLines.push({
      label: `Commission on extra KM (${commission.billableExtraKm.toLocaleString()} km @ ${formatReceiptMoney(settings.currency_symbol, perKm)}/km)`,
      amount: perKm * commission.billableExtraKm,
    });
  }
  if (breakdownLines.length === 0) {
    breakdownLines.push({
      label: `Broker commission (flat rate for booking ${commission.rental.bookingNumber})`,
      amount: commissionAmount,
    });
  }

  return {
    companyName: settings.company_name,
    currency: settings.currency,
    currencySymbol: settings.currency_symbol,
    receiptNumber: `BCR-${commission.rental.bookingNumber}`,
    issuedAt: new Date(),
    broker: commission.broker,
    rental: commission.rental,
    rentalValue: decimalToNumber(commission.rentalValue),
    breakdownLines,
    commissionAmount,
    paidAmount,
    balance,
    status: commission.status,
    paymentDate: commission.paymentDate,
    paymentMethod: commission.paymentMethod
      ? PAYMENT_METHOD_LABELS[commission.paymentMethod]
      : null,
    referenceNumber: commission.referenceNumber,
    notes: commission.notes,
    paidBy: commission.paidBy?.name ?? null,
  };
}

export async function generateBrokerSettlementReceiptPdf(
  commissionId: string
): Promise<Buffer | null> {
  const data = await getBrokerSettlementReceiptData(commissionId);
  if (!data) return null;

  return createPdfBuffer((doc) => {
    const sym = data.currencySymbol;

    drawReceiptHeader(doc, {
      companyName: data.companyName,
      subtitle:
        data.paidAmount > 0
          ? "Broker Commission — Payment Receipt"
          : "Broker Commission — Settlement Slip",
      receiptNumber: data.receiptNumber,
      issuedAt: data.issuedAt,
    });

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
        `Customer rental value: ${formatReceiptMoney(sym, data.rentalValue)}`,
      ],
      "BROKER",
      [
        `Name: ${data.broker.name}`,
        `Code: ${data.broker.brokerCode}`,
        `Phone: ${data.broker.phone}`,
        ...(data.broker.email ? [`Email: ${data.broker.email}`] : []),
        ...(data.broker.nic ? [`NIC: ${data.broker.nic}`] : []),
      ]
    );

    drawTableSection(
      doc,
      sym,
      "Commission Breakdown",
      data.breakdownLines,
      "TOTAL COMMISSION",
      data.commissionAmount
    );

    const paymentRows = [
      {
        label: data.paymentDate
          ? `Payment on ${formatReceiptDate(data.paymentDate)}${data.paymentMethod ? ` (${data.paymentMethod})` : ""}${data.referenceNumber ? ` — Ref: ${data.referenceNumber}` : ""}`
          : "Commission payment recorded",
        amount: data.paidAmount,
      },
    ];

    drawTableSection(doc, sym, "Payment to Broker", paymentRows, "AMOUNT PAID", data.paidAmount);

    const { left, width } = pageMetrics(doc);
    doc.fillColor(RECEIPT_COLORS.muted).font("Helvetica").fontSize(9);
    doc.text(
      `Balance remaining: ${formatReceiptMoney(sym, data.balance)}${data.paidBy ? `  |  Recorded by: ${data.paidBy}` : ""}`,
      left,
      doc.y,
      { width, align: "center" }
    );
    doc.y += 16;

    if (data.status === "PAID") {
      drawStatusBadge(doc, "PAID IN FULL");
    } else if (data.status === "PARTIALLY_PAID") {
      drawStatusBadge(doc, "PARTIALLY PAID", RECEIPT_COLORS.warning);
    } else {
      drawStatusBadge(doc, "AMOUNT DUE", RECEIPT_COLORS.warning);
    }

    if (data.notes) {
      doc.fillColor(RECEIPT_COLORS.muted).font("Helvetica").fontSize(8);
      doc.text(`Notes: ${data.notes}`, left, doc.y, { width });
      doc.y += 14;
    }

    drawReceiptFooter(doc, {
      companyName: data.companyName,
      currency: data.currency,
      note:
        data.paidAmount > 0
          ? "This document confirms commission payment to the broker for the rental booking listed above."
          : "This settlement slip shows commission due to the broker for the rental booking listed above.",
    });
  });
}
