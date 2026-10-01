"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function BrokerFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== "ALL") params.set(key, value);
      else params.delete(key);
    });
    params.delete("page");
    startTransition(() => router.push(`/brokers?${params.toString()}`));
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name, phone, or code..." defaultValue={searchParams.get("search") ?? ""} className="pl-9"
          onKeyDown={(e) => { if (e.key === "Enter") updateParams({ search: (e.target as HTMLInputElement).value }); }} />
      </div>
      <Select defaultValue={searchParams.get("status") ?? "ALL"} onValueChange={(v) => updateParams({ status: v })}>
        <SelectTrigger className="w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="INACTIVE">Inactive</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="secondary" disabled={isPending} onClick={() => {
        const input = document.querySelector<HTMLInputElement>('input[placeholder*="Search by name"]');
        updateParams({ search: input?.value ?? "" });
      }}>Search</Button>
    </div>
  );
}
