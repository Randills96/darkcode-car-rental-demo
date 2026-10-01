import { existsSync } from "fs";
import type PDFKit from "pdfkit";
import { getSystemSettings } from "@/lib/services/settings";
import {
  computeExpenseReportForExport,
  computeFleetUtilizationReport,
  computePaymentReportForExport,
  computeRentalReportForExport,
} from "@/lib/services/reports";
import {
  getVehicleProfitability,
  getOwnerProfitability,
} from "@/lib/services/profitability";
import {
  createPdfBuffer,
  formatReceiptDate,
  getCompanyLogoFilePath,
  pageMetrics,
  tryDrawCompanyLogo,
} from "@/lib/services/pdf-receipt-utils";
import { decimalToNumber, formatCurrency, stripCurrencySymbol } from "@/lib/utils";
import type { ReportExportParams } from "@/lib/validations/report";

const REPORT_COLORS = {
  primary: "#0f4c81",
  primarySoft: "#e8f0f8",
  text: "#374151",
  muted: "#6b7280",
  border: "#e5e7eb",
  rowEven: "#ffffff",
  rowOdd: "#f8fafc",
  white: "#ffffff",
};

const REPORT_TITLES: Record<ReportExportParams["reportType"], string> = {
  rentals: "Rental Report",
  payments: "Payment Report",
  expenses: "Expense Report",
  fleet: "Fleet Utilization Report",
  "profitability-vehicle": "Vehicle Profitability Report",
  "profitability-owner": "Owner Profitability Report",
};

function formatRangeLabel(from?: string, to?: string): string {
  if (from && to) return `${formatReceiptDate(new Date(from))} to ${formatReceiptDate(new Date(to))}`;
  if (from) return `From ${formatReceiptDate(new Date(from))}`;
  if (to) return `Up to ${formatReceiptDate(new Date(to))}`;
  return "All dates";
}

function formatMoney(value: number): string {
  return stripCurrencySymbol(formatCurrency(value));
}

function drawReportHeader(
  doc: PDFKit.PDFDocument,
  input: {
    companyName: string;
    title: string;
    periodLabel: string;
    rowCount: number;
  }
) {
  const { left, width } = pageMetrics(doc);
  const headerTop = doc.y;
  const headerHeight = 86;
  const logoSize = 56;
  const hasLogo = existsSync(getCompanyLogoFilePath());
  const textLeft = hasLogo ? left + 18 + logoSize + 10 : left + 18;

  doc.save();
  doc.roundedRect(left, headerTop, width, headerHeight, 8).fill(REPORT_COLORS.primarySoft);
  doc.roundedRect(left, headerTop, width, headerHeight, 8).stroke(REPORT_COLORS.border);

  if (hasLogo) {
    tryDrawCompanyLogo(doc, left + 14, headerTop + 15, logoSize);
  }

  doc.fillColor(REPORT_COLORS.primary).font("Helvetica-Bold").fontSize(20);
  doc.text(input.companyName, textLeft, headerTop + 16, { width: width - (textLeft - left) - 18 });

  doc.font("Helvetica-Bold").fontSize(12);
  doc.text(input.title, textLeft, headerTop + 42, { width: width - (textLeft - left) - 18 });

  doc.fillColor(REPORT_COLORS.muted).font("Helvetica").fontSize(9);
  doc.text(`Period: ${input.periodLabel}`, textLeft, headerTop + 62, { width: width * 0.45 });
  doc.text(`Generated: ${formatReceiptDate(new Date())}`, left + 18, headerTop + 62, {
    width: width - 36,
    align: "right",
  });
  doc.text(`${input.rowCount} record(s)`, left + 18, headerTop + 74, {
    width: width - 36,
    align: "right",
  });

  doc.restore();
  doc.fillColor(REPORT_COLORS.text);
  doc.y = headerTop + headerHeight + 22;
}

function drawDataTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: string[][],
  columnWidths: number[]
) {
  const { left, width } = pageMetrics(doc);
  const rowHeight = 24;
  const headerHeight = 28;
  const fontSize = 8;
  const bottomLimit = doc.page.height - doc.page.margins.bottom - 40;

  const totalWeight = columnWidths.reduce((sum, value) => sum + value, 0);
  const colWidths = columnWidths.map((weight) => (width * weight) / totalWeight);

  function drawTableHeader(y: number) {
    doc.save();
    doc.rect(left, y, width, headerHeight).fill(REPORT_COLORS.primary);
    doc.fillColor(REPORT_COLORS.white).font("Helvetica-Bold").fontSize(fontSize);

    let x = left;
    headers.forEach((header, index) => {
      const align = index >= headers.length - 2 ? "right" : "left";
      doc.text(header, x + 6, y + 9, {
        width: colWidths[index] - 12,
        align,
      });
      x += colWidths[index];
    });
    doc.restore();
  }

  let y = doc.y;
  drawTableHeader(y);
  y += headerHeight;

  rows.forEach((row, rowIndex) => {
    if (y + rowHeight > bottomLimit) {
      doc.addPage();
      y = doc.page.margins.top;
      drawTableHeader(y);
      y += headerHeight;
    }

    const bg = rowIndex % 2 === 0 ? REPORT_COLORS.rowEven : REPORT_COLORS.rowOdd;
    doc.save();
    doc.rect(left, y, width, rowHeight).fill(bg);
    doc.rect(left, y, width, rowHeight).stroke(REPORT_COLORS.border);

    doc.fillColor(REPORT_COLORS.text).font("Helvetica").fontSize(fontSize);
    let x = left;
    row.forEach((cell, index) => {
      const align = index >= headers.length - 2 ? "right" : "left";
      doc.text(cell, x + 6, y + 8, {
        width: colWidths[index] - 12,
        align,
        lineBreak: false,
        ellipsis: true,
      });
      x += colWidths[index];
    });
    doc.restore();
    y += rowHeight;
  });

  doc.y = y + 16;
}

function drawReportFooter(doc: PDFKit.PDFDocument, companyName: string, currency: string) {
  const { left, width } = pageMetrics(doc);
  const footerY = doc.page.height - doc.page.margins.bottom - 36;

  doc.save();
  doc.moveTo(left, footerY).lineTo(left + width, footerY).stroke(REPORT_COLORS.border);
  doc.fillColor(REPORT_COLORS.muted).font("Helvetica").fontSize(8);
  doc.text(
    `${companyName}  |  Confidential internal report  |  Currency: ${currency}`,
    left,
    footerY + 10,
    { width, align: "center" }
  );
  doc.restore();
}

async function buildReportRows(
  reportType: ReportExportParams["reportType"],
  from?: string,
  to?: string
): Promise<{ headers: string[]; rows: string[][]; columnWidths: number[]; landscape: boolean }> {
  switch (reportType) {
    case "rentals": {
      const rentals = await computeRentalReportForExport(from, to);
      return {
        headers: [
          "Booking",
          "Customer",
          "Vehicle",
          "Pickup",
          "Return",
          "Days",
          "Status",
          "Final Total",
          "Paid",
          "Balance",
        ],
        rows: rentals.map((r) => [
          r.bookingNumber,
          r.customer.fullName,
          r.vehicle?.registrationNumber ?? "—",
          r.pickupDate.toISOString().split("T")[0],
          r.returnDate.toISOString().split("T")[0],
          String(r.rentalDays),
          r.status.replace(/_/g, " "),
          formatMoney(decimalToNumber(r.finalTotal)),
          formatMoney(decimalToNumber(r.totalPaid)),
          formatMoney(decimalToNumber(r.balance)),
        ]),
        columnWidths: [1, 1.2, 0.8, 0.8, 0.8, 0.5, 0.8, 0.8, 0.8, 0.8],
        landscape: true,
      };
    }
    case "payments": {
      const payments = await computePaymentReportForExport(from, to);
      return {
        headers: ["Code", "Date", "Booking", "Customer", "Type", "Method", "Amount"],
        rows: payments.map((p) => [
          p.paymentCode,
          p.paymentDate.toISOString().split("T")[0],
          p.rental.bookingNumber,
          p.customer.fullName,
          p.paymentType.replace(/_/g, " "),
          p.paymentMethod.replace(/_/g, " "),
          formatMoney(decimalToNumber(p.amount)),
        ]),
        columnWidths: [1, 0.8, 0.9, 1.3, 1, 0.9, 0.8],
        landscape: false,
      };
    }
    case "expenses": {
      const expenses = await computeExpenseReportForExport(from, to);
      return {
        headers: ["Code", "Date", "Category", "Description", "Vehicle", "Rental", "Amount"],
        rows: expenses.map((e) => [
          e.expenseCode,
          e.expenseDate.toISOString().split("T")[0],
          e.category.replace(/_/g, " "),
          e.description.slice(0, 48),
          e.vehicle?.registrationNumber ?? "—",
          e.rental?.bookingNumber ?? "—",
          formatMoney(decimalToNumber(e.amount)),
        ]),
        columnWidths: [0.9, 0.8, 1, 1.6, 0.8, 0.8, 0.8],
        landscape: true,
      };
    }
    case "fleet": {
      const fleet = await computeFleetUtilizationReport(from, to);
      return {
        headers: ["Registration", "Vehicle", "Status", "Rentals", "Rented Days", "Period Days", "Utilization"],
        rows: fleet.map((v) => [
          v.registrationNumber,
          `${v.make} ${v.model}`,
          v.status.replace(/_/g, " "),
          String(v.rentalCount),
          String(v.rentedDays),
          String(v.periodDays),
          `${v.utilizationPercent.toFixed(1)}%`,
        ]),
        columnWidths: [1, 1.2, 0.9, 0.7, 0.9, 0.9, 0.9],
        landscape: false,
      };
    }
    case "profitability-vehicle": {
      const data = await getVehicleProfitability(from, to);
      return {
        headers: [
          "Registration",
          "Vehicle",
          "Owner",
          "Rentals",
          "Revenue",
          "Costs",
          "Net Profit",
          "Margin",
        ],
        rows: data.map((v) => [
          v.registrationNumber,
          v.label.split(" — ")[1] ?? v.label,
          v.ownerName ?? "Company",
          String(v.rentalCount),
          formatMoney(v.revenue),
          formatMoney(v.totalCosts),
          formatMoney(v.netProfit),
          `${v.marginPercent.toFixed(1)}%`,
        ]),
        columnWidths: [1, 1.1, 1, 0.7, 0.9, 0.9, 0.9, 0.7],
        landscape: true,
      };
    }
    case "profitability-owner": {
      const data = await getOwnerProfitability(from, to);
      return {
        headers: [
          "Owner Code",
          "Name",
          "Vehicles",
          "Rentals",
          "Revenue",
          "Commission",
          "Payable",
          "Outstanding",
        ],
        rows: data.map((o) => [
          o.ownerCode,
          o.name,
          String(o.vehicleCount),
          String(o.rentalCount),
          formatMoney(o.rentalRevenue),
          formatMoney(o.companyCommission),
          formatMoney(o.ownerPayable),
          formatMoney(o.ownerOutstanding),
        ]),
        columnWidths: [0.9, 1.3, 0.7, 0.7, 0.9, 0.9, 0.9, 0.9],
        landscape: true,
      };
    }
  }
}

export async function generateReportPdf(
  reportType: ReportExportParams["reportType"],
  from?: string,
  to?: string
): Promise<Buffer> {
  const [settings, table] = await Promise.all([
    getSystemSettings(),
    buildReportRows(reportType, from, to),
  ]);

  return createPdfBuffer(
    (doc) => {
      drawReportHeader(doc, {
        companyName: settings.company_name,
        title: REPORT_TITLES[reportType],
        periodLabel: formatRangeLabel(from, to),
        rowCount: table.rows.length,
      });

      if (table.rows.length === 0) {
        doc
          .fillColor(REPORT_COLORS.muted)
          .font("Helvetica")
          .fontSize(11)
          .text("No records found for the selected period.", pageMetrics(doc).left, doc.y, {
            width: pageMetrics(doc).width,
            align: "center",
          });
      } else {
        drawDataTable(doc, table.headers, table.rows, table.columnWidths);
      }

      drawReportFooter(doc, settings.company_name, settings.currency);
    },
    table.landscape ? { layout: "landscape" } : undefined
  );
}

export function getReportPdfFilename(reportType: ReportExportParams["reportType"]): string {
  const dateSuffix = new Date().toISOString().split("T")[0];
  const names: Record<ReportExportParams["reportType"], string> = {
    rentals: `rental-report-${dateSuffix}.pdf`,
    payments: `payment-report-${dateSuffix}.pdf`,
    expenses: `expense-report-${dateSuffix}.pdf`,
    fleet: `fleet-utilization-${dateSuffix}.pdf`,
    "profitability-vehicle": `vehicle-profitability-${dateSuffix}.pdf`,
    "profitability-owner": `owner-profitability-${dateSuffix}.pdf`,
  };
  return names[reportType];
}
