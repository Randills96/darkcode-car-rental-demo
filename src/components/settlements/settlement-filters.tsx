"use client";

import Link from "next/link";
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

interface SettlementFiltersProps {
  tab: "owners" | "brokers" | "drivers";
}

export function SettlementFilters({ tab }: SettlementFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "ALL";

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== "ALL") params.set(key, value);
      else params.delete(key);
    });
    params.delete("page");
    startTransition(() => router.push(`/settlements?${params.toString()}`));
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={
            tab === "drivers"
              ? "Search driver, booking, reference..."
              : "Search booking, name, reference..."
          }
          defaultValue={search}
          className="pl-9"
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParams({ search: (e.target as HTMLInputElement).value });
          }}
        />
      </div>
      {tab !== "drivers" && (
        <Select value={status} onValueChange={(v) => updateParams({ status: v })}>
          <SelectTrigger className="w-full lg:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
          </SelectContent>
        </Select>
      )}
      <Button
        variant="secondary"
        disabled={isPending}
        onClick={() => {
          const input = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
          updateParams({ search: input?.value ?? "" });
        }}
      >
        Search
      </Button>
    </div>
  );
}

export function SettlementTabs({ activeTab }: { activeTab: string }) {
  const tabs = [
    { id: "owners", label: "Owner Settlements" },
    { id: "brokers", label: "Broker Commissions" },
    { id: "drivers", label: "Driver Payments" },
  ];

  return (
    <div className="flex gap-2 border-b mb-4">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={`/settlements?tab=${tab.id}`}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === tab.id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
