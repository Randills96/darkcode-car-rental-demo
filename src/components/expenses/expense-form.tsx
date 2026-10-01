"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { expenseFormSchema, type ExpenseFormValues } from "@/lib/validations/expense";
import { createExpense, updateExpense } from "@/app/expenses/actions";
import { EXPENSE_CATEGORIES } from "@/components/expenses/expense-filters";
import { useCurrencySymbol } from "@/components/currency-provider";

interface ExpenseFormProps {
  options: {
    vehicles: Array<{ id: string; registrationNumber: string; make: string; model: string }>;
    rentals: Array<{ id: string; bookingNumber: string; status: string }>;
    owners: Array<{ id: string; name: string; ownerCode: string }>;
    brokers: Array<{ id: string; name: string; brokerCode: string }>;
  };
  defaultVehicleId?: string;
  defaultRentalId?: string;
  expenseId?: string;
  defaultValues?: Partial<ExpenseFormValues>;
}

export function ExpenseForm({
  options,
  defaultVehicleId,
  defaultRentalId,
  expenseId,
  defaultValues,
}: ExpenseFormProps) {
  const router = useRouter();
  const currencySymbol = useCurrencySymbol();
  const isEdit = Boolean(expenseId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      category: "OTHER",
      amount: 0,
      expenseDate: new Date().toISOString().split("T")[0],
      description: "",
      vehicleId: defaultVehicleId || "",
      rentalId: defaultRentalId || "",
      ownerId: "",
      brokerId: "",
      notes: "",
      ...defaultValues,
    },
  });

  async function onSubmit(data: ExpenseFormValues) {
    const result = isEdit && expenseId ? await updateExpense(expenseId, data) : await createExpense(data);
    if (!result.success) {
      toast.error(result.fieldErrors ? Object.values(result.fieldErrors)[0]?.[0] || result.error : result.error);
      return;
    }
    toast.success(result.message);
    router.push(`/expenses/${result.data?.id ?? expenseId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader><CardTitle>{isEdit ? "Edit Expense" : "Expense Details"}</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={watch("category")}
                onValueChange={(v) => setValue("category", v as ExpenseFormValues["category"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expenseDate">Expense Date *</Label>
              <Input id="expenseDate" type="date" {...register("expenseDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ({currencySymbol}) *</Label>
              <Input id="amount" type="number" step="0.01" {...register("amount")} />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea id="description" {...register("description")} rows={3} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 border-t pt-4">
            <div className="space-y-2">
              <Label>Vehicle (optional)</Label>
              <Select
                value={watch("vehicleId") || "none"}
                onValueChange={(v) => setValue("vehicleId", v === "none" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {options.vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registrationNumber} — {v.make} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rental (optional)</Label>
              <Select
                value={watch("rentalId") || "none"}
                onValueChange={(v) => setValue("rentalId", v === "none" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {options.rentals.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.bookingNumber} ({r.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Owner (optional)</Label>
              <Select
                value={watch("ownerId") || "none"}
                onValueChange={(v) => setValue("ownerId", v === "none" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {options.owners.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name} ({o.ownerCode})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Broker (optional)</Label>
              <Select
                value={watch("brokerId") || "none"}
                onValueChange={(v) => setValue("brokerId", v === "none" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {options.brokers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name} ({b.brokerCode})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} rows={2} />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Record Expense"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
