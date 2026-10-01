"use client";

import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportBlacklistedCustomers } from "@/app/customers/actions";

interface ExportBlacklistedButtonProps {
  search?: string;
}

export function ExportBlacklistedButton({ search }: ExportBlacklistedButtonProps) {
  async function handleExport() {
    const result = await exportBlacklistedCustomers(search);
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
    link.download = `blacklisted-customers-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded");
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
}
