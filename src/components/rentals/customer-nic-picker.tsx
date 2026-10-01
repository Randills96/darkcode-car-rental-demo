"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type RentalCustomerOption = {
  id: string;
  fullName: string;
  customerCode: string;
  nic: string;
  status: string;
};

interface CustomerNicPickerProps {
  customers: RentalCustomerOption[];
  value: string;
  onChange: (customerId: string) => void;
  error?: string;
}

function normalizeNicQuery(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]/g, "");
}

export function CustomerNicPicker({ customers, value, onChange, error }: CustomerNicPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = customers.find((customer) => customer.id === value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery(selected?.nic ?? "");
    }
  }, [open, selected?.nic]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const matches = useMemo(() => {
    const needle = normalizeNicQuery(query);
    if (!needle) return customers;
    return customers.filter((customer) => {
      const nic = normalizeNicQuery(customer.nic);
      const name = customer.fullName.toLowerCase();
      const code = customer.customerCode.toLowerCase();
      return nic.includes(needle) || name.includes(query.trim().toLowerCase()) || code.includes(needle);
    });
  }, [customers, query]);

  useEffect(() => {
    const needle = normalizeNicQuery(query);
    if (!needle) return;
    const exact = customers.find((customer) => normalizeNicQuery(customer.nic) === needle);
    if (exact && exact.id !== value) {
      onChange(exact.id);
    }
  }, [customers, onChange, query, value]);

  function selectCustomer(customer: RentalCustomerOption) {
    onChange(customer.id);
    setQuery(customer.nic);
    setOpen(false);
    inputRef.current?.blur();
  }

  function clearSelection() {
    onChange("");
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  }

  return (
    <div ref={rootRef} className="space-y-2 sm:col-span-2">
      <Label htmlFor="customer-nic">Customer NIC *</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="customer-nic"
          ref={inputRef}
          value={open || !selected ? query : selected.nic}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setOpen(true);
            if (selected && normalizeNicQuery(next) !== normalizeNicQuery(selected.nic)) {
              onChange("");
            }
          }}
          onFocus={() => {
            setOpen(true);
            setQuery(selected?.nic ?? query);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
            if (event.key === "Enter") {
              event.preventDefault();
              if (matches.length === 1) selectCustomer(matches[0]);
            }
          }}
          placeholder="Type NIC number"
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          inputMode="text"
          enterKeyHint="search"
          className="pl-9 pr-10"
        />
        {(query || selected) && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            aria-label="Clear customer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Type the NIC to find the customer. Name search also works.
      </p>

      {selected && !open && (
        <p className="text-sm text-foreground">
          {selected.fullName}
          <span className="ml-2 text-muted-foreground">({selected.customerCode})</span>
          {selected.status === "BLACKLISTED" ? (
            <span className="ml-2 text-destructive">Blacklisted</span>
          ) : null}
        </p>
      )}

      {open && (
        <div className="z-50 max-h-[min(16rem,50dvh)] overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {matches.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">No customer matches that NIC.</p>
          ) : (
            <ul className="py-1">
              {matches.map((customer) => {
                const isActive = customer.id === value;
                return (
                  <li key={customer.id}>
                    <button
                      type="button"
                      onClick={() => selectCustomer(customer)}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-base sm:py-2 sm:text-sm",
                        isActive ? "bg-accent" : "hover:bg-accent/70"
                      )}
                    >
                      <span className="flex w-full items-center justify-between gap-2">
                        <span className="font-medium tabular-nums tracking-wide">{customer.nic}</span>
                        {isActive ? <Check className="h-4 w-4 shrink-0" /> : null}
                      </span>
                      <span className="text-muted-foreground">
                        {customer.fullName} · {customer.customerCode}
                        {customer.status === "BLACKLISTED" ? " · Blacklisted" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
