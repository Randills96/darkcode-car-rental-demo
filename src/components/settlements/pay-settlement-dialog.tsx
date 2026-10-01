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
import { settlementPaymentSchema, type SettlementPaymentFormValues } from "@/lib/validations/settlement";
import { payOwnerSettlement, payBrokerCommission } from "@/app/settlements/actions";
import { useCurrencySymbol } from "@/components/currency-provider";

interface PaySettlementDialogProps {
  type: "owner" | "broker";
  recordId: string;
  label: string;
  payableAmount: number;
  paidAmount: number;
  status: string;
}

export function PaySettlementDialog({
  type,
  recordId,
  label,
  payableAmount,
  paidAmount,
  status,
}: PaySettlementDialogProps) {
  const router = useRouter();
  const currencySymbol = useCurrencySymbol();
  const [open, setOpen] = useState(false);
  const remaining = Math.max(0, payableAmount - paidAmount);

  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting } } = useForm<SettlementPaymentFormValues>({
    resolver: zodResolver(settlementPaymentSchema),
    defaultValues: {
      amount: remaining,
      paymentMethod: "BANK_TRANSFER",
      paymentDate: new Date().toISOString().split("T")[0],
      referenceNumber: "",
      notes: "",
    },
  });

  if (status === "PAID" || remaining <= 0) return null;

  async function onSubmit(data: SettlementPaymentFormValues) {
    const result =
      type === "owner"
        ? await payOwnerSettlement(recordId, data)
        : await payBrokerCommission(recordId, data);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message, {
      action: {
        label: type === "broker" ? "Open receipt" : "Open breakdown",
        onClick: () =>
          window.open(
            type === "broker"
              ? `/api/settlements/broker/${recordId}/receipt`
              : `/api/settlements/owner/${recordId}/receipt`,
            "_blank"
          ),
      },
    });
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Pay</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{type === "owner" ? "Pay Owner Settlement" : "Pay Broker Commission"}</DialogTitle>
          <p className="text-sm text-muted-foreground">{label} · Remaining: {currencySymbol} {remaining.toFixed(2)}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Amount ({currencySymbol}) *</Label>
            <Input type="number" step="0.01" {...register("amount")} />
          </div>
          <div className="space-y-2">
            <Label>Payment Method *</Label>
            <Select value={watch("paymentMethod")} onValueChange={(v) => setValue("paymentMethod", v as SettlementPaymentFormValues["paymentMethod"])}>
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
          <div className="space-y-2">
            <Label>Payment Date *</Label>
            <Input type="date" {...register("paymentDate")} />
          </div>
          <div className="space-y-2">
            <Label>Reference Number</Label>
            <Input {...register("referenceNumber")} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea {...register("notes")} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Record Payment"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
