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

const ACTIONS = ["ALL", "CREATE", "UPDATE", "DELETE", "BLACKLIST", "PAYMENT", "SETTLEMENT", "ASSIGN", "STATUS_CHANGE"];

interface AuditFiltersProps {
  entityTypes: string[];
}

export function AuditFilters({ entityTypes }: AuditFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const search = searchParams.get("search") ?? "";
  const entityType = searchParams.get("entityType") ?? "ALL";
  const action = searchParams.get("action") ?? "ALL";

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== "ALL") params.set(key, value);
      else params.delete(key);
    });
    params.delete("page");
    startTransition(() => router.push(`/audit?${params.toString()}`));
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search user, entity type, entity ID..."
          defaultValue={search}
          className="pl-9"
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParams({ search: (e.target as HTMLInputElement).value });
          }}
        />
      </div>
      <Select value={entityType} onValueChange={(v) => updateParams({ entityType: v })}>
        <SelectTrigger className="w-full lg:w-[180px]"><SelectValue placeholder="Entity" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Entities</SelectItem>
          {entityTypes.map((type) => (
            <SelectItem key={type} value={type}>{type}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={action} onValueChange={(v) => updateParams({ action: v })}>
        <SelectTrigger className="w-full lg:w-[160px]"><SelectValue placeholder="Action" /></SelectTrigger>
        <SelectContent>
          {ACTIONS.map((a) => (
            <SelectItem key={a} value={a}>{a === "ALL" ? "All Actions" : a}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="secondary"
        disabled={isPending}
        onClick={() => {
          const input = document.querySelector<HTMLInputElement>('input[placeholder*="Search user"]');
          updateParams({ search: input?.value ?? "" });
        }}
      >
        Search
      </Button>
    </div>
  );
}
