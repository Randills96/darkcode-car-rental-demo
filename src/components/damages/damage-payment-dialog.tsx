"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { damagePaymentSchema, type DamagePaymentFormValues } from "@/lib/validations/damage";
import { recordDamagePayment } from "@/app/damages/actions";
import { decimalToNumber } from "@/lib/utils";
import { useCurrencySymbol } from "@/components/currency-provider";

interface DamagePaymentDialogProps {
  damageId: string;
  customerCharge: { toString(): string };
  paymentStatus: string;
}

export function DamagePaymentDialog({ damageId, customerCharge, paymentStatus }: DamagePaymentDialogProps) {
  const router = useRouter();
  const currencySymbol = useCurrencySymbol();
  const [open, setOpen] = useState(false);
  const charge = decimalToNumber(customerCharge);

  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting } } = useForm<DamagePaymentFormValues>({
    resolver: zodResolver(damagePaymentSchema),
    defaultValues: {
      amount: charge,
      paymentMethod: "CASH",
      paymentDate: new Date().toISOString().split("T")[0],
      referenceNumber: "",
      notes: "",
    },
  });

  if (paymentStatus === "PAID" || charge <= 0) return null;

  async function onSubmit(data: DamagePaymentFormValues) {
    const result = await recordDamagePayment(damageId, data);
    if (!result.success) { toast.error(result.error); return; }
    toast.success(result.message);
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm">Record Payment</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Damage Payment</DialogTitle>
          <p className="text-sm text-muted-foreground">Customer charge: Rs. {charge.toFixed(2)}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2"><Label>Amount ({currencySymbol}) *</Label><Input type="number" step="0.01" {...register("amount")} /></div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={watch("paymentMethod")} onValueChange={(v) => setValue("paymentMethod", v as DamagePaymentFormValues["paymentMethod"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Payment Date *</Label><Input type="date" {...register("paymentDate")} /></div>
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
