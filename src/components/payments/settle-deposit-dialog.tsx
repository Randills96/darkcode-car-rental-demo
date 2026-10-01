"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Undo2 } from "lucide-react";
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
import { settleDepositSchema, type SettleDepositFormValues } from "@/lib/validations/security-deposit";
import { settleSecurityDeposit } from "@/app/payments/actions";
import { decimalToNumber } from "@/lib/utils";
import { useCurrencySymbol } from "@/components/currency-provider";

interface SettleDepositDialogProps {
  deposit: {
    id: string;
    depositAmount: { toString(): string };
    refundAmount: { toString(): string };
    amountRetained: { toString(): string };
    status: string;
  };
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary";
}

export function SettleDepositDialog({
  deposit,
  triggerLabel = "Refund Deposit",
  triggerVariant = "outline",
}: SettleDepositDialogProps) {
  const router = useRouter();
  const currencySymbol = useCurrencySymbol();
  const [open, setOpen] = useState(false);
  const depositAmount = decimalToNumber(deposit.depositAmount);
  const remaining = Math.max(
    0,
    depositAmount - decimalToNumber(deposit.refundAmount) - decimalToNumber(deposit.amountRetained)
  );

  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting } } = useForm<SettleDepositFormValues>({
    resolver: zodResolver(settleDepositSchema),
    defaultValues: {
      depositId: deposit.id,
      refundAmount: remaining,
      amountRetained: 0,
      retainReason: "",
      refundMethod: "CASH",
      refundDate: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  if (["REFUNDED", "FORFEITED"].includes(deposit.status)) return null;

  async function onSubmit(data: SettleDepositFormValues) {
    const result = await settleSecurityDeposit({ ...data, depositId: deposit.id });
    if (!result.success) { toast.error(result.error); return; }
    toast.success(result.message);
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={triggerVariant}>
          <Undo2 className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refund Security Deposit</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Remaining held: {currencySymbol} {remaining.toFixed(2)}. Refund after the hire is completed, or keep part for damage/cleaning.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Refund Amount ({currencySymbol})</Label><Input type="number" step="0.01" {...register("refundAmount")} /></div>
            <div className="space-y-2"><Label>Amount Retained ({currencySymbol})</Label><Input type="number" step="0.01" {...register("amountRetained")} /></div>
          </div>
          <div className="space-y-2"><Label>Retain Reason</Label><Textarea {...register("retainReason")} rows={2} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Refund Method</Label>
              <Select value={watch("refundMethod") || "CASH"} onValueChange={(v) => setValue("refundMethod", v as SettleDepositFormValues["refundMethod"])}>
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
            <div className="space-y-2"><Label>Settlement Date *</Label><Input type="date" {...register("refundDate")} /></div>
          </div>
          <div className="space-y-2"><Label>Notes</Label><Textarea {...register("notes")} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Refund Deposit"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
