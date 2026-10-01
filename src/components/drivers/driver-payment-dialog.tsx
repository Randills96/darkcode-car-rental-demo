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
import { driverPaymentSchema, type DriverPaymentFormValues } from "@/lib/validations/driver";
import { recordDriverPayment } from "@/app/drivers/actions";
import { useCurrencySymbol } from "@/components/currency-provider";

interface DriverPaymentDialogProps {
  driverId: string;
  rentals: Array<{ id: string; bookingNumber: string; status: string }>;
}

export function DriverPaymentDialog({ driverId, rentals }: DriverPaymentDialogProps) {
  const router = useRouter();
  const currencySymbol = useCurrencySymbol();
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting } } = useForm<DriverPaymentFormValues>({
    resolver: zodResolver(driverPaymentSchema),
    defaultValues: {
      amount: 0,
      paymentMethod: "CASH",
      paymentDate: new Date().toISOString().split("T")[0],
      rentalId: "",
      referenceNumber: "",
      notes: "",
    },
  });

  async function onSubmit(data: DriverPaymentFormValues) {
    const result = await recordDriverPayment(driverId, data);
    if (!result.success) { toast.error(result.error); return; }
    toast.success(result.message);
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Record Payment</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Driver Payment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2"><Label>Amount ({currencySymbol}) *</Label><Input type="number" step="0.01" {...register("amount")} /></div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={watch("paymentMethod")} onValueChange={(v) => setValue("paymentMethod", v as DriverPaymentFormValues["paymentMethod"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Payment Date *</Label><Input type="date" {...register("paymentDate")} /></div>
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
          <div className="space-y-2"><Label>Reference</Label><Input {...register("referenceNumber")} /></div>
          <div className="space-y-2"><Label>Notes</Label><Textarea {...register("notes")} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Record Payment"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
