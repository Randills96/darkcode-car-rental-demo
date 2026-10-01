import PDFDocument from "pdfkit";
import { prisma } from "@/lib/db";
import { BALANCE_AFFECTING_PAYMENT_TYPES } from "@/lib/services/payment";
import { getSystemSettings } from "@/lib/services/settings";
import { drawReceiptHeader } from "@/lib/services/pdf-receipt-utils";
import { calculateIncludedKmAllowance } from "@/lib/services/included-km";
import { decimalToNumber, formatCurrency } from "@/lib/utils";
import type { PaymentMethod, PaymentType, RentalStatus } from "@prisma/client";
import type PDFKit from "pdfkit";

const CUSTOMER_PAYMENT_LABELS: Record<PaymentType, string> = {
  ADVANCE: "Advance Payment",
  RENTAL_PAYMENT: "Rental Payment",
  FINAL_PAYMENT: "Final Payment",
  DAMAGE_PAYMENT: "Damage Charge",
  ADDITIONAL_CHARGE: "Additional Charge",
  SECURITY_DEPOSIT: "Security Deposit",
  SECURITY_DEPOSIT_REFUND: "Deposit Refund",
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CARD: "Card",
  ONLINE: "Online",
  OTHER: "Other",
};

const COLORS = {
  primary: "#0f4c81",
  primaryDark: "#0a3558",
  accent: "#059669",
  text: "#1f2937",
  muted: "#6b7280",
  border: "#d1d5db",
  panel: "#f3f4f6",
  white: "#ffffff",
};

export function canGenerateCustomerReceipt(input: {
  status: RentalStatus;
  balance: { toString(): string } | number;
}): boolean {
  const balance = decimalToNumber(input.balance);
  return balance === 0 && ["RETURNED", "COMPLETED"].includes(input.status);
}

export async function getCustomerReceiptData(rentalId: string) {
  const [rental, settings] = await Promise.all([
    prisma.rental.findUnique({
      where: { id: rentalId },
      include: {
        customer: {
          select: {
            fullName: true,
            phone: true,
            whatsapp: true,
            nic: true,
            customerCode: true,
          },
        },
        vehicle: {
          select: {
            registrationNumber: true,
            make: true,
            model: true,
          },
        },
        handover: { select: { startingOdometer: true } },
        returnRecord: {
          select: {
            endingOdometer: true,
            totalKm: true,
            freeKm: true,
            extraKm: true,
          },
        },
        payments: {
          where: {
            paymentType: { in: BALANCE_AFFECTING_PAYMENT_TYPES },
          },
          orderBy: { paymentDate: "asc" },
        },
        securityDeposits: true,
        charges: {
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    getSystemSettings(),
  ]);

  if (!rental) return null;
  if (!canGenerateCustomerReceipt(rental)) return null;

  const baseRental =
    decimalToNumber(rental.estimatedTotal) -
    decimalToNumber(rental.deliveryCharge) -
    decimalToNumber(rental.driverCharge) -
    decimalToNumber(rental.otherCharges) +
    decimalToNumber(rental.discount);

  const startingOdometer =
    rental.startingOdometer ?? rental.handover?.startingOdometer ?? null;
  const endingOdometer =
    rental.endingOdometer ?? rental.returnRecord?.endingOdometer ?? null;

  return {
    companyName: settings.company_name,
    currency: settings.currency,
    currencySymbol: settings.currency_symbol,
    receiptNumber: `RCP-${rental.bookingNumber}`,
    issuedAt: new Date(),
    bookingNumber: rental.bookingNumber,
    rentalType: rental.rentalType.replace(/_/g, " "),
    pickupDate: rental.pickupDate,
    pickupTime: rental.pickupTime,
    returnDate: rental.returnDate,
    returnTime: rental.returnTime,
    rentalDays: rental.rentalDays,
    includedKm: rental.includedKm,
    customer: rental.customer,
    vehicle: rental.vehicle,
    mileage:
      startingOdometer != null || endingOdometer != null
        ? {
            startingOdometer,
            endingOdometer,
            totalKm: rental.returnRecord?.totalKm ?? null,
            freeKm:
              rental.returnRecord?.freeKm ??
              calculateIncludedKmAllowance(
                rental.rentalDays,
                rental.includedKm,
                rental.includedKm
              ),
            extraKm: rental.extraKm,
          }
        : null,
    chargeLines: [
      {
        label: `Vehicle rental (${rental.rentalDays} day${rental.rentalDays === 1 ? "" : "s"} @ ${formatCurrency(decimalToNumber(rental.dailyRate))}/day)`,
        amount: baseRental,
      },
      ...(decimalToNumber(rental.extraKmCharge) > 0
        ? [
            {
              label: `Extra mileage (${rental.extraKm.toLocaleString()} km beyond allowance)`,
              amount: decimalToNumber(rental.extraKmCharge),
            },
          ]
        : []),
      ...(decimalToNumber(rental.deliveryCharge) > 0
        ? [{ label: "Delivery charge", amount: decimalToNumber(rental.deliveryCharge) }]
        : []),
      ...(decimalToNumber(rental.driverCharge) > 0
        ? [{ label: "Driver charge", amount: decimalToNumber(rental.driverCharge) }]
        : []),
      ...(decimalToNumber(rental.otherCharges) > 0
        ? [{ label: "Other charges", amount: decimalToNumber(rental.otherCharges) }]
        : []),
      ...rental.charges.map((charge) => ({
        label: charge.description,
        amount: decimalToNumber(charge.amount),
      })),
      ...(decimalToNumber(rental.discount) > 0
        ? [{ label: "Discount", amount: -decimalToNumber(rental.discount) }]
        : []),
    ].filter((line) => line.amount !== 0),
    payments: rental.payments.map((payment) => ({
      code: payment.paymentCode,
      date: payment.paymentDate,
      type: CUSTOMER_PAYMENT_LABELS[payment.paymentType],
      method: PAYMENT_METHOD_LABELS[payment.paymentMethod],
      amount: decimalToNumber(payment.amount),
      reference: payment.referenceNumber,
    })),
    securityDeposits: rental.securityDeposits.map((deposit) => ({
      collected: decimalToNumber(deposit.depositAmount),
      refunded: decimalToNumber(deposit.refundAmount),
      retained: decimalToNumber(deposit.amountRetained),
      status: deposit.status.replace(/_/g, " "),
    })),
    finalTotal: decimalToNumber(rental.finalTotal),
    totalPaid: decimalToNumber(rental.totalPaid),
    balance: decimalToNumber(rental.balance),
  };
}

function formatReceiptDate(date: Date): string {
  return date.toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatReceiptMoney(symbol: string, amount: number): string {
  return `${symbol} ${amount.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type ReceiptData = NonNullable<Awaited<ReturnType<typeof getCustomerReceiptData>>>;

function pageMetrics(doc: PDFKit.PDFDocument) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;
  return { left, right, width };
}

function drawHeader(doc: PDFKit.PDFDocument, data: ReceiptData) {
  drawReceiptHeader(doc, {
    companyName: data.companyName,
    subtitle: "Vehicle Rental — Customer Payment Receipt",
    receiptNumber: data.receiptNumber,
    issuedAt: data.issuedAt,
  });
}

function drawMetaGrid(doc: PDFKit.PDFDocument, data: ReceiptData) {
  const { left, width } = pageMetrics(doc);
  const colWidth = (width - 16) / 2;
  const startY = doc.y;
  const boxHeight = 118;

  doc.save();
  doc.roundedRect(left, startY, width, boxHeight, 6).fill(COLORS.panel);
  doc.roundedRect(left, startY, width, boxHeight, 6).stroke(COLORS.border);

  const leftX = left + 14;
  const rightX = left + colWidth + 14;

  doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(9);
  doc.text("BOOKING DETAILS", leftX, startY + 12);
  doc.text("CUSTOMER", rightX, startY + 12);

  doc.fillColor(COLORS.text).font("Helvetica").fontSize(9);
  let y = startY + 28;
  const leftLines = [
    `Booking No: ${data.bookingNumber}`,
    `Rental Type: ${data.rentalType}`,
    `Duration: ${data.rentalDays} day(s)`,
    data.vehicle
      ? `Vehicle: ${data.vehicle.registrationNumber} — ${data.vehicle.make} ${data.vehicle.model}`
      : "Vehicle: —",
  ];
  leftLines.forEach((line) => {
    doc.text(line, leftX, y, { width: colWidth - 20 });
    y += 14;
  });

  y = startY + 28;
  const rightLines = [
    `Name: ${data.customer.fullName}`,
    `Phone: ${data.customer.phone}`,
    ...(data.customer.whatsapp ? [`WhatsApp: ${data.customer.whatsapp}`] : []),
    `NIC: ${data.customer.nic}`,
  ];
  rightLines.forEach((line) => {
    doc.text(line, rightX, y, { width: colWidth - 20 });
    y += 14;
  });

  doc.restore();
  doc.y = startY + boxHeight + 16;
}

function drawPeriodBar(doc: PDFKit.PDFDocument, data: ReceiptData) {
  const { left, width } = pageMetrics(doc);
  const barY = doc.y;

  doc.save();
  doc.rect(left, barY, width, 32).fill("#e8f0f8");
  doc.rect(left, barY, 4, 32).fill(COLORS.primary);

  doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(8);
  doc.text("RENTAL PERIOD", left + 14, barY + 8);

  doc.fillColor(COLORS.text).font("Helvetica").fontSize(9);
  const period = `${formatReceiptDate(data.pickupDate)} ${data.pickupTime}  to  ${formatReceiptDate(data.returnDate)} ${data.returnTime}`;
  doc.text(period, left + 14, barY + 18, { width: width - 28 });

  doc.restore();
  doc.y = barY + 44;
}

function drawMileagePanel(doc: PDFKit.PDFDocument, data: ReceiptData) {
  if (!data.mileage) return;

  const { left, width } = pageMetrics(doc);
  const startY = doc.y;
  const boxHeight = 58;

  doc.save();
  doc.roundedRect(left, startY, width, boxHeight, 6).fill("#f0fdf4");
  doc.roundedRect(left, startY, width, boxHeight, 6).stroke("#bbf7d0");

  doc.fillColor(COLORS.accent).font("Helvetica-Bold").fontSize(9);
  doc.text("MILEAGE SUMMARY", left + 14, startY + 10);

  doc.fillColor(COLORS.text).font("Helvetica").fontSize(9);
  const cols = width / 4;
  const items = [
    {
      label: "Starting odometer",
      value:
        data.mileage.startingOdometer != null
          ? `${data.mileage.startingOdometer.toLocaleString()} km`
          : "—",
    },
    {
      label: "Ending odometer",
      value:
        data.mileage.endingOdometer != null
          ? `${data.mileage.endingOdometer.toLocaleString()} km`
          : "—",
    },
    {
      label: "KM driven",
      value:
        data.mileage.totalKm != null ? `${data.mileage.totalKm.toLocaleString()} km` : "—",
    },
    {
      label: "Extra KM charged",
      value:
        data.mileage.extraKm > 0 ? `${data.mileage.extraKm.toLocaleString()} km` : "None",
    },
  ];

  items.forEach((item, index) => {
    const x = left + 14 + index * cols;
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(7);
    doc.text(item.label.toUpperCase(), x, startY + 28, { width: cols - 8 });
    doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(9);
    doc.text(item.value, x, startY + 40, { width: cols - 8 });
  });

  doc.restore();
  doc.y = startY + boxHeight + 16;
}

function drawTableSection(
  doc: PDFKit.PDFDocument,
  currencySymbol: string,
  title: string,
  rows: Array<{ label: string; amount: number }>,
  totalLabel: string,
  totalAmount: number
) {
  const { left, width } = pageMetrics(doc);
  const startY = doc.y;

  doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(10);
  doc.text(title, left, startY);
  doc.y += 16;

  const tableTop = doc.y;
  const rowHeight = 22;
  const amountColWidth = 110;
  const labelWidth = width - amountColWidth;

  doc.save();
  doc.rect(left, tableTop, width, rowHeight).fill(COLORS.primary);
  doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(8);
  doc.text("DESCRIPTION", left + 10, tableTop + 7);
  doc.text("AMOUNT", left + labelWidth, tableTop + 7, {
    width: amountColWidth - 10,
    align: "right",
  });

  let y = tableTop + rowHeight;
  rows.forEach((row, index) => {
    const bg = index % 2 === 0 ? COLORS.white : COLORS.panel;
    doc.rect(left, y, width, rowHeight).fill(bg);
    doc.rect(left, y, width, rowHeight).stroke(COLORS.border);

    doc.fillColor(COLORS.text).font("Helvetica").fontSize(9);
    doc.text(row.label, left + 10, y + 6, { width: labelWidth - 16 });
    doc.text(formatReceiptMoney(currencySymbol, row.amount), left + labelWidth, y + 6, {
      width: amountColWidth - 10,
      align: "right",
    });
    y += rowHeight;
  });

  doc.rect(left, y, width, rowHeight + 2).fill("#e8f0f8");
  doc.rect(left, y, width, rowHeight + 2).stroke(COLORS.primary);
  doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(10);
  doc.text(totalLabel, left + 10, y + 7);
  doc.text(formatReceiptMoney(currencySymbol, totalAmount), left + labelWidth, y + 7, {
    width: amountColWidth - 10,
    align: "right",
  });

  doc.restore();
  doc.y = y + rowHeight + 14;
}

function drawPaidBadge(doc: PDFKit.PDFDocument, data: ReceiptData) {
  const { left, width } = pageMetrics(doc);
  const badgeY = doc.y;
  const badgeHeight = 36;

  doc.save();
  doc.roundedRect(left + width / 2 - 90, badgeY, 180, badgeHeight, 4).fill(COLORS.accent);
  doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(14);
  doc.text("PAID IN FULL", left + width / 2 - 90, badgeY + 10, {
    width: 180,
    align: "center",
  });
  doc.restore();

  doc.y = badgeY + badgeHeight + 12;

  doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8);
  doc.text(
    `Balance due: ${formatReceiptMoney(data.currencySymbol, data.balance)}  |  Total paid: ${formatReceiptMoney(data.currencySymbol, data.totalPaid)}`,
    left,
    doc.y,
    { width, align: "center" }
  );
  doc.y += 20;
}

function drawFooter(doc: PDFKit.PDFDocument, data: ReceiptData) {
  const { left, width } = pageMetrics(doc);
  const footerY = doc.page.height - doc.page.margins.bottom - 52;

  doc.save();
  doc.moveTo(left, footerY).lineTo(left + width, footerY).stroke(COLORS.border);

  doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8);
  doc.text("Thank you for choosing our service.", left, footerY + 10, { width, align: "center" });
  doc.text(
    "This document confirms customer payments for the rental listed above. It is not a tax invoice for broker or owner settlements.",
    left,
    doc.y + 2,
    { width, align: "center" }
  );
  doc.text(
    `${data.companyName}  |  Generated ${formatReceiptDate(new Date())}  |  ${data.currency}`,
    left,
    doc.y + 2,
    { width, align: "center" }
  );
  doc.restore();
}

export async function generateCustomerReceiptPdf(rentalId: string): Promise<Buffer | null> {
  const data = await getCustomerReceiptData(rentalId);
  if (!data) return null;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const sym = data.currencySymbol;

    drawHeader(doc, data);
    drawMetaGrid(doc, data);
    drawPeriodBar(doc, data);
    drawMileagePanel(doc, data);

    drawTableSection(
      doc,
      sym,
      "Charges",
      data.chargeLines.map((line) => ({ label: line.label, amount: line.amount })),
      "TOTAL AMOUNT",
      data.finalTotal
    );

    drawTableSection(
      doc,
      sym,
      "Payments Received",
      data.payments.map((payment) => ({
        label: `${formatReceiptDate(payment.date)}  |  ${payment.code}  |  ${payment.type} (${payment.method})`,
        amount: payment.amount,
      })),
      "TOTAL PAID",
      data.totalPaid
    );

    if (data.securityDeposits.length > 0) {
      const { left, width } = pageMetrics(doc);
      doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(9);
      doc.text("Security Deposit (Reference Only)", left, doc.y);
      doc.y += 12;
      doc.font("Helvetica").fontSize(8);
      data.securityDeposits.forEach((deposit) => {
        doc.text(
          `Collected ${formatReceiptMoney(sym, deposit.collected)}  ·  Refunded ${formatReceiptMoney(sym, deposit.refunded)}  ·  Status: ${deposit.status}`,
          left,
          doc.y,
          { width }
        );
        doc.y += 12;
      });
      doc.y += 8;
    }

    drawPaidBadge(doc, data);
    drawFooter(doc, data);

    doc.end();
  });
}
