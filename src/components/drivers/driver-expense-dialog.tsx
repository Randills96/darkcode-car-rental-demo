"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { driverExpenseSchema, type DriverExpenseFormValues } from "@/lib/validations/driver";
import { recordDriverExpense } from "@/app/drivers/actions";
import { useCurrencySymbol } from "@/components/currency-provider";

interface DriverExpenseDialogProps {
  driverId: string;
  rentals: Array<{ id: string; bookingNumber: string; status: string }>;
}

export function DriverExpenseDialog({ driverId, rentals }: DriverExpenseDialogProps) {
  const router = useRouter();
  const currencySymbol = useCurrencySymbol();
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting } } = useForm<DriverExpenseFormValues>({
    resolver: zodResolver(driverExpenseSchema),
    defaultValues: {
      expenseType: "FOOD",
      amount: 0,
      expenseDate: new Date().toISOString().split("T")[0],
      rentalId: "",
      description: "",
      notes: "",
    },
  });

  async function onSubmit(data: DriverExpenseFormValues) {
    const result = await recordDriverExpense(driverId, data);
    if (!result.success) { toast.error(result.error); return; }
    toast.success(result.message);
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" />Record Expense</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Driver Expense</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Expense Type</Label>
            <Select value={watch("expenseType")} onValueChange={(v) => setValue("expenseType", v as DriverExpenseFormValues["expenseType"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PAYMENT">Payment</SelectItem>
                <SelectItem value="FOOD">Food</SelectItem>
                <SelectItem value="ACCOMMODATION">Accommodation</SelectItem>
                <SelectItem value="TRAVEL">Travel</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Amount ({currencySymbol}) *</Label><Input type="number" step="0.01" {...register("amount")} /></div>
          <div className="space-y-2"><Label>Expense Date *</Label><Input type="date" {...register("expenseDate")} /></div>
          <div className="space-y-2">
            <Label>Linked Rental</Label>
            <Select value={watch("rentalId") || ""} onValueChange={(v) => setValue("rentalId", v)}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {rentals.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.bookingNumber} ({r.status})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Description</Label><Input {...register("description")} /></div>
          <div className="space-y-2"><Label>Notes</Label><Textarea {...register("notes")} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Record Expense"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
