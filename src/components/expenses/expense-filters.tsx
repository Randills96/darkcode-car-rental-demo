"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EXPENSE_CATEGORIES = [
  { value: "FUEL", label: "Fuel" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "REPAIR", label: "Repair" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "REVENUE_LICENCE", label: "Revenue Licence" },
  { value: "EMISSION_TEST", label: "Emission Test" },
  { value: "DRIVER_PAYMENT", label: "Driver Payment" },
  { value: "DRIVER_ACCOMMODATION", label: "Driver Accommodation" },
  { value: "PARKING", label: "Parking" },
  { value: "TOLL", label: "Toll" },
  { value: "CLEANING", label: "Cleaning" },
  { value: "OWNER_PAYMENT", label: "Owner Payment" },
  { value: "BROKER_COMMISSION", label: "Broker Commission" },
  { value: "OTHER", label: "Other" },
];

export function ExpenseFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "ALL";

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== "ALL") params.set(key, value);
      else params.delete(key);
    });
    params.delete("page");
    startTransition(() => router.push(`/expenses?${params.toString()}`));
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search code, description, vehicle..."
          defaultValue={search}
          className="pl-9"
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParams({ search: (e.target as HTMLInputElement).value });
          }}
        />
      </div>
      <Select value={category} onValueChange={(v) => updateParams({ category: v })}>
        <SelectTrigger className="w-full lg:w-[200px]"><SelectValue placeholder="Category" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Categories</SelectItem>
          {EXPENSE_CATEGORIES.map((c) => (
            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="secondary"
        disabled={isPending}
        onClick={() => {
          const input = document.querySelector<HTMLInputElement>('input[placeholder*="Search code"]');
          updateParams({ search: input?.value ?? "" });
        }}
      >
        Search
      </Button>
    </div>
  );
}

export { EXPENSE_CATEGORIES };
