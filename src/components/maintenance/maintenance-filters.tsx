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

const MAINTENANCE_TYPES = [
  { value: "OIL_CHANGE", label: "Oil Change" },
  { value: "FULL_SERVICE", label: "Full Service" },
  { value: "BRAKE_SERVICE", label: "Brake Service" },
  { value: "TYRES", label: "Tyres" },
  { value: "BATTERY", label: "Battery" },
  { value: "AC_REPAIR", label: "AC Repair" },
  { value: "ENGINE_REPAIR", label: "Engine Repair" },
  { value: "BODY_REPAIR", label: "Body Repair" },
  { value: "ACCIDENT_REPAIR", label: "Accident Repair" },
  { value: "OTHER", label: "Other" },
];

export function MaintenanceFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const search = searchParams.get("search") ?? "";
  const maintenanceType = searchParams.get("maintenanceType") ?? "ALL";

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== "ALL") params.set(key, value);
      else params.delete(key);
    });
    params.delete("page");
    startTransition(() => router.push(`/maintenance?${params.toString()}`));
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search code, vehicle, provider..."
          defaultValue={search}
          className="pl-9"
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParams({ search: (e.target as HTMLInputElement).value });
          }}
        />
      </div>
      <Select value={maintenanceType} onValueChange={(v) => updateParams({ maintenanceType: v })}>
        <SelectTrigger className="w-full lg:w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Types</SelectItem>
          {MAINTENANCE_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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

export { MAINTENANCE_TYPES };
