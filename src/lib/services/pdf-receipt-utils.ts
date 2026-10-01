import { existsSync } from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import type PDFKit from "pdfkit";
import type { PaymentMethod } from "@prisma/client";

export function getCompanyLogoFilePath() {
  return path.join(process.cwd(), "public", "logo.jpg");
}

export function tryDrawCompanyLogo(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  size: number
) {
  const logoPath = getCompanyLogoFilePath();
  if (!existsSync(logoPath)) return false;
  try {
    doc.image(logoPath, x, y, { width: size, height: size });
    return true;
  } catch {
    return false;
  }
}

export const RECEIPT_COLORS = {
  primary: "#0a1f5c",
  primaryDark: "#071433",
  accent: "#059669",
  warning: "#d97706",
  text: "#1f2937",
  muted: "#6b7280",
  border: "#d1d5db",
  panel: "#f3f4f6",
  white: "#ffffff",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CARD: "Card",
  ONLINE: "Online",
  OTHER: "Other",
};

export function formatReceiptDate(date: Date): string {
  return date.toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatReceiptMoney(symbol: string, amount: number): string {
  return `${symbol} ${amount.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function pageMetrics(doc: PDFKit.PDFDocument) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;
  return { left, right, width };
}

export function drawReceiptHeader(
  doc: PDFKit.PDFDocument,
  input: {
    companyName: string;
    subtitle: string;
    receiptNumber: string;
    issuedAt: Date;
  }
) {
  const { left, width } = pageMetrics(doc);
  const headerTop = doc.y;
  const headerHeight = 96;
  const logoSize = 68;
  const hasLogo = existsSync(getCompanyLogoFilePath());
  const textLeft = hasLogo ? left + 20 + logoSize + 10 : left + 20;
  const textWidth = width - (textLeft - left) - 20;

  doc.save();
  doc.rect(left, headerTop, width, headerHeight).fill(RECEIPT_COLORS.primary);
  doc.rect(left, headerTop + headerHeight - 4, width, 4).fill("#b91c1c");

  if (hasLogo) {
    tryDrawCompanyLogo(doc, left + 14, headerTop + 14, logoSize);
  }

  doc.fillColor(RECEIPT_COLORS.white).font("Helvetica-Bold").fontSize(22);
  doc.text(input.companyName, textLeft, headerTop + 18, { width: textWidth, align: "left" });

  doc.font("Helvetica").fontSize(10);
  doc.text(input.subtitle, textLeft, headerTop + 46, { width: textWidth });

  doc.font("Helvetica-Bold").fontSize(9);
  doc.text(`Document No: ${input.receiptNumber}`, left + 20, headerTop + 22, {
    width: width - 40,
    align: "right",
  });
  doc.font("Helvetica").fontSize(9);
  doc.text(`Issued: ${formatReceiptDate(input.issuedAt)}`, left + 20, headerTop + 36, {
    width: width - 40,
    align: "right",
  });

  doc.restore();
  doc.fillColor(RECEIPT_COLORS.text);
  doc.y = headerTop + headerHeight + 18;
}

export function drawTwoColumnInfoBox(
  doc: PDFKit.PDFDocument,
  leftTitle: string,
  leftLines: string[],
  rightTitle: string,
  rightLines: string[]
) {
  const { left, width } = pageMetrics(doc);
  const colWidth = (width - 16) / 2;
  const startY = doc.y;
  const lineCount = Math.max(leftLines.length, rightLines.length);
  const boxHeight = 28 + lineCount * 14 + 12;

  doc.save();
  doc.roundedRect(left, startY, width, boxHeight, 6).fill(RECEIPT_COLORS.panel);
  doc.roundedRect(left, startY, width, boxHeight, 6).stroke(RECEIPT_COLORS.border);

  const leftX = left + 14;
  const rightX = left + colWidth + 14;

  doc.fillColor(RECEIPT_COLORS.primary).font("Helvetica-Bold").fontSize(9);
  doc.text(leftTitle, leftX, startY + 12);
  doc.text(rightTitle, rightX, startY + 12);

  doc.fillColor(RECEIPT_COLORS.text).font("Helvetica").fontSize(9);
  let y = startY + 28;
  leftLines.forEach((line) => {
    doc.text(line, leftX, y, { width: colWidth - 20 });
    y += 14;
  });

  y = startY + 28;
  rightLines.forEach((line) => {
    doc.text(line, rightX, y, { width: colWidth - 20 });
    y += 14;
  });

  doc.restore();
  doc.y = startY + boxHeight + 16;
}

export function drawTableSection(
  doc: PDFKit.PDFDocument,
  currencySymbol: string,
  title: string,
  rows: Array<{ label: string; amount: number }>,
  totalLabel: string,
  totalAmount: number
) {
  const { left, width } = pageMetrics(doc);
  const startY = doc.y;

  doc.fillColor(RECEIPT_COLORS.primary).font("Helvetica-Bold").fontSize(10);
  doc.text(title, left, startY);
  doc.y += 16;

  const tableTop = doc.y;
  const rowHeight = 22;
  const amountColWidth = 110;
  const labelWidth = width - amountColWidth;

  doc.save();
  doc.rect(left, tableTop, width, rowHeight).fill(RECEIPT_COLORS.primary);
  doc.fillColor(RECEIPT_COLORS.white).font("Helvetica-Bold").fontSize(8);
  doc.text("DESCRIPTION", left + 10, tableTop + 7);
  doc.text("AMOUNT", left + labelWidth, tableTop + 7, {
    width: amountColWidth - 10,
    align: "right",
  });

  let y = tableTop + rowHeight;
  rows.forEach((row, index) => {
    const bg = index % 2 === 0 ? RECEIPT_COLORS.white : RECEIPT_COLORS.panel;
    doc.rect(left, y, width, rowHeight).fill(bg);
    doc.rect(left, y, width, rowHeight).stroke(RECEIPT_COLORS.border);

    doc.fillColor(RECEIPT_COLORS.text).font("Helvetica").fontSize(9);
    doc.text(row.label, left + 10, y + 6, { width: labelWidth - 16 });
    doc.text(formatReceiptMoney(currencySymbol, row.amount), left + labelWidth, y + 6, {
      width: amountColWidth - 10,
      align: "right",
    });
    y += rowHeight;
  });

  doc.rect(left, y, width, rowHeight + 2).fill("#e8f0f8");
  doc.rect(left, y, width, rowHeight + 2).stroke(RECEIPT_COLORS.primary);
  doc.fillColor(RECEIPT_COLORS.primary).font("Helvetica-Bold").fontSize(10);
  doc.text(totalLabel, left + 10, y + 7);
  doc.text(formatReceiptMoney(currencySymbol, totalAmount), left + labelWidth, y + 7, {
    width: amountColWidth - 10,
    align: "right",
  });

  doc.restore();
  doc.y = y + rowHeight + 14;
}

export function drawStatusBadge(
  doc: PDFKit.PDFDocument,
  label: string,
  color: string = RECEIPT_COLORS.accent
) {
  const { left, width } = pageMetrics(doc);
  const badgeY = doc.y;
  const badgeHeight = 36;

  doc.save();
  doc.roundedRect(left + width / 2 - 100, badgeY, 200, badgeHeight, 4).fill(color);
  doc.fillColor(RECEIPT_COLORS.white).font("Helvetica-Bold").fontSize(13);
  doc.text(label, left + width / 2 - 100, badgeY + 10, {
    width: 200,
    align: "center",
  });
  doc.restore();
  doc.y = badgeY + badgeHeight + 12;
}

export function drawReceiptFooter(
  doc: PDFKit.PDFDocument,
  input: { companyName: string; currency: string; note: string }
) {
  const { left, width } = pageMetrics(doc);
  const footerY = doc.page.height - doc.page.margins.bottom - 52;

  doc.save();
  doc.moveTo(left, footerY).lineTo(left + width, footerY).stroke(RECEIPT_COLORS.border);

  doc.fillColor(RECEIPT_COLORS.muted).font("Helvetica").fontSize(8);
  doc.text(input.note, left, footerY + 10, { width, align: "center" });
  doc.text(
    `${input.companyName}  |  Generated ${formatReceiptDate(new Date())}  |  ${input.currency}`,
    left,
    doc.y + 2,
    { width, align: "center" }
  );
  doc.restore();
}

export function createPdfBuffer(
  build: (doc: PDFKit.PDFDocument) => void,
  options?: PDFKit.PDFDocumentOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, ...options });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    build(doc);
    doc.end();
  });
}
