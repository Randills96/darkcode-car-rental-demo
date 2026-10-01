"use server";

import { requirePermission } from "@/lib/auth/session";
import {
  exportExpenseReportCsv,
  exportFleetReportCsv,
  exportPaymentReportCsv,
  exportRentalReportCsv,
} from "@/lib/services/reports";
import {
  getVehicleProfitability,
  getOwnerProfitability,
} from "@/lib/services/profitability";
import { rowsToCsv } from "@/lib/utils/csv";
import { reportExportSchema } from "@/lib/validations/report";
import type { ActionResult } from "@/app/customers/actions";

export async function exportReport(
  input: { reportType: string; from?: string; to?: string }
): Promise<ActionResult<{ csv: string; filename: string }>> {
  try {
    await requirePermission("reports.export");
    const parsed = reportExportSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Invalid export parameters" };
    }

    const { reportType, from, to } = parsed.data;
    const dateSuffix = new Date().toISOString().split("T")[0];

    switch (reportType) {
      case "rentals": {
        const csv = await exportRentalReportCsv(from, to);
        return { success: true, data: { csv, filename: `rental-report-${dateSuffix}.csv` } };
      }
      case "payments": {
        const csv = await exportPaymentReportCsv(from, to);
        return { success: true, data: { csv, filename: `payment-report-${dateSuffix}.csv` } };
      }
      case "expenses": {
        const csv = await exportExpenseReportCsv(from, to);
        return { success: true, data: { csv, filename: `expense-report-${dateSuffix}.csv` } };
      }
      case "fleet": {
        const csv = await exportFleetReportCsv(from, to);
        return { success: true, data: { csv, filename: `fleet-utilization-${dateSuffix}.csv` } };
      }
      case "profitability-vehicle": {
        const data = await getVehicleProfitability(from, to);
        const csv = rowsToCsv(
          [
            "Registration",
            "Vehicle",
            "Ownership",
            "Rentals",
            "Revenue",
            "Owner Payable",
            "Broker Cost",
            "Driver Cost",
            "Maintenance",
            "Expenses",
            "Total Costs",
            "Net Profit",
            "Margin %",
          ],
          data.map((v) => [
            v.registrationNumber,
            v.label,
            v.ownershipType,
            v.rentalCount,
            v.revenue.toFixed(2),
            v.ownerPayable.toFixed(2),
            v.brokerCost.toFixed(2),
            v.driverCost.toFixed(2),
            v.maintenanceCost.toFixed(2),
            v.expenseCost.toFixed(2),
            v.totalCosts.toFixed(2),
            v.netProfit.toFixed(2),
            v.marginPercent.toFixed(1),
          ])
        );
        return { success: true, data: { csv, filename: `vehicle-profitability-${dateSuffix}.csv` } };
      }
      case "profitability-owner": {
        const data = await getOwnerProfitability(from, to);
        const csv = rowsToCsv(
          [
            "Owner Code",
            "Name",
            "Vehicles",
            "Rentals",
            "Rental Revenue",
            "Company Commission",
            "Owner Payable",
            "Owner Paid",
            "Outstanding",
          ],
          data.map((o) => [
            o.ownerCode,
            o.name,
            o.vehicleCount,
            o.rentalCount,
            o.rentalRevenue.toFixed(2),
            o.companyCommission.toFixed(2),
            o.ownerPayable.toFixed(2),
            o.ownerPaid.toFixed(2),
            o.ownerOutstanding.toFixed(2),
          ])
        );
        return { success: true, data: { csv, filename: `owner-profitability-${dateSuffix}.csv` } };
      }
      default:
        return { success: false, error: "Unknown report type" };
    }
  } catch (error) {
    console.error("exportReport:", error);
    return { success: false, error: "Failed to export report" };
  }
}
