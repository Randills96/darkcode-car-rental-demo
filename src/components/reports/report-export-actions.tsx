"use client";

import { toast } from "sonner";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportReport } from "@/app/reports/actions";

interface ReportExportActionsProps {
  reportType:
    | "rentals"
    | "payments"
    | "expenses"
    | "fleet"
    | "profitability-vehicle"
    | "profitability-owner";
  from?: string;
  to?: string;
}

function buildPdfExportUrl(reportType: string, from?: string, to?: string): string {
  const params = new URLSearchParams({ reportType });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return `/api/reports/export/pdf?${params.toString()}`;
}

export function ReportExportActions({ reportType, from, to }: ReportExportActionsProps) {
  async function handleCsvExport() {
    const result = await exportReport({ reportType, from, to });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    if (!result.data) {
      toast.error("Export failed");
      return;
    }

    const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.data.filename;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV report downloaded");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={handleCsvExport}>
        <Download className="mr-2 h-4 w-4" />
        Export CSV
      </Button>
      <Button variant="outline" size="sm" asChild>
        <a
          href={buildPdfExportUrl(reportType, from, to)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FileText className="mr-2 h-4 w-4" />
          Export PDF
        </a>
      </Button>
    </div>
  );
}
