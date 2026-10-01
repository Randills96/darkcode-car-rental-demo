"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { settleDepositSchema, type SettleDepositFormValues } from "@/lib/validations/security-deposit";
import { reviseSecurityDeposit, settleSecurityDeposit } from "@/app/payments/actions";
import { useCurrencySymbol } from "@/components/currency-provider";

interface RefundDepositFormProps {
  rentalId: string;
  depositId: string;
  remaining: number;
  mode?: "refund" | "edit";
  currentRefundAmount?: number;
  currentRetainedAmount?: number;
  currentRetainReason?: string;
  currentNotes?: string;
  currentMethod?: SettleDepositFormValues["refundMethod"];
}

export function RefundDepositForm({
  rentalId,
  depositId,
  remaining,
  mode = "refund",
  currentRefundAmount = remaining,
  currentRetainedAmount = 0,
  currentRetainReason = "",
  currentNotes = "",
  currentMethod = "CASH",
}: RefundDepositFormProps) {
  const router = useRouter();
  const currencySymbol = useCurrencySymbol();
  const isEdit = mode === "edit";
  const { register, handleSubmit, setValue, watch, formState: { isSubmitting } } = useForm<SettleDepositFormValues>({
    resolver: zodResolver(settleDepositSchema),
    defaultValues: {
      depositId,
      refundAmount: isEdit ? currentRefundAmount : remaining,
      amountRetained: isEdit ? currentRetainedAmount : 0,
      retainReason: currentRetainReason,
      refundMethod: currentMethod,
      refundDate: new Date().toISOString().split("T")[0],
      notes: currentNotes,
    },
  });

  async function onSubmit(data: SettleDepositFormValues) {
    const result = isEdit
      ? await reviseSecurityDeposit({ ...data, depositId })
      : await settleSecurityDeposit({ ...data, depositId });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    router.push(`/rentals/${rentalId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {isEdit && (
        <p className="text-sm text-muted-foreground">
          Change the refund or retained amounts. Set refund to 0 and retained to 0 to hold the deposit again and re-enable Refund Deposit.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Refund Amount ({currencySymbol})</Label>
          <Input type="number" step="0.01" {...register("refundAmount")} />
        </div>
        <div className="space-y-2">
          <Label>Amount Retained ({currencySymbol})</Label>
          <Input type="number" step="0.01" {...register("amountRetained")} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Retain Reason</Label>
        <Textarea {...register("retainReason")} rows={2} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Refund Method</Label>
          <Select
            value={watch("refundMethod") || "CASH"}
            onValueChange={(v) => setValue("refundMethod", v as SettleDepositFormValues["refundMethod"])}
          >
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
          <Label>Settlement Date *</Label>
          <Input type="date" {...register("refundDate")} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea {...register("notes")} rows={2} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Refund Deposit"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(`/rentals/${rentalId}`)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
