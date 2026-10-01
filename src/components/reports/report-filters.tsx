"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TABS = [
  { value: "profitability", label: "Profitability" },
  { value: "rentals", label: "Rentals" },
  { value: "payments", label: "Payments" },
  { value: "expenses", label: "Expenses" },
  { value: "fleet", label: "Fleet" },
];

export function ReportFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const tab = searchParams.get("tab") ?? "profitability";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const view = searchParams.get("view") ?? "vehicle";

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    params.delete("page");
    startTransition(() => router.push(`/reports?${params.toString()}`));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t.value}
            variant={tab === t.value ? "default" : "outline"}
            size="sm"
            disabled={isPending}
            onClick={() => updateParams({ tab: t.value })}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">From</label>
          <Input type="date" defaultValue={from} onChange={(e) => updateParams({ from: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">To</label>
          <Input type="date" defaultValue={to} onChange={(e) => updateParams({ to: e.target.value })} />
        </div>
        {tab === "profitability" && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">View</label>
            <Select value={view} onValueChange={(v) => updateParams({ view: v })}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vehicle">By Vehicle</SelectItem>
                <SelectItem value="month">By Month</SelectItem>
                <SelectItem value="owner">By Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <Button variant="secondary" className="w-full sm:w-auto" disabled={isPending} onClick={() => updateParams({ from, to })}>
          Apply
        </Button>
      </div>
    </div>
  );
}
