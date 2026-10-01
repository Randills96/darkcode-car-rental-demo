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

export function PaymentFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const search = searchParams.get("search") ?? "";
  const paymentType = searchParams.get("paymentType") ?? "ALL";
  const paymentMethod = searchParams.get("paymentMethod") ?? "ALL";

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== "ALL") params.set(key, value);
      else params.delete(key);
    });
    params.delete("page");
    startTransition(() => router.push(`/payments?${params.toString()}`));
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search payment code, booking, customer..."
          defaultValue={search}
          className="pl-9"
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParams({ search: (e.target as HTMLInputElement).value });
          }}
        />
      </div>
      <Select value={paymentType} onValueChange={(v) => updateParams({ paymentType: v })}>
        <SelectTrigger className="w-full lg:w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Types</SelectItem>
          <SelectItem value="ADVANCE">Advance</SelectItem>
          <SelectItem value="RENTAL_PAYMENT">Rental Payment</SelectItem>
          <SelectItem value="FINAL_PAYMENT">Final Payment</SelectItem>
          <SelectItem value="DAMAGE_PAYMENT">Damage Payment</SelectItem>
          <SelectItem value="ADDITIONAL_CHARGE">Additional Charge</SelectItem>
          <SelectItem value="SECURITY_DEPOSIT">Security Deposit</SelectItem>
          <SelectItem value="SECURITY_DEPOSIT_REFUND">Deposit Refund</SelectItem>
        </SelectContent>
      </Select>
      <Select value={paymentMethod} onValueChange={(v) => updateParams({ paymentMethod: v })}>
        <SelectTrigger className="w-full lg:w-[160px]"><SelectValue placeholder="Method" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Methods</SelectItem>
          <SelectItem value="CASH">Cash</SelectItem>
          <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
          <SelectItem value="CARD">Card</SelectItem>
          <SelectItem value="ONLINE">Online</SelectItem>
          <SelectItem value="OTHER">Other</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="secondary"
        disabled={isPending}
        onClick={() => {
          const input = document.querySelector<HTMLInputElement>('input[placeholder*="Search payment"]');
          updateParams({ search: input?.value ?? "" });
        }}
      >
        Search
      </Button>
    </div>
  );
}
