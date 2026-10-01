"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Shield } from "lucide-react";
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
import { collectDepositSchema, type CollectDepositFormValues } from "@/lib/validations/security-deposit";
import { collectSecurityDeposit } from "@/app/payments/actions";
import { useCurrencySymbol } from "@/components/currency-provider";

interface CollectDepositDialogProps {
  rentalId: string;
  suggestedAmount?: number;
}

export function CollectDepositDialog({ rentalId, suggestedAmount = 0 }: CollectDepositDialogProps) {
  const router = useRouter();
  const currencySymbol = useCurrencySymbol();
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting } } = useForm<CollectDepositFormValues>({
    resolver: zodResolver(collectDepositSchema),
    defaultValues: {
      rentalId,
      depositAmount: suggestedAmount,
      paymentMethod: "CASH",
      receivedDate: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  async function onSubmit(data: CollectDepositFormValues) {
    const result = await collectSecurityDeposit({ ...data, rentalId });
    if (!result.success) { toast.error(result.error); return; }
    toast.success(result.message);
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Shield className="h-4 w-4 mr-2" />Collect Deposit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Collect Security Deposit</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2"><Label>Deposit Amount ({currencySymbol}) *</Label><Input type="number" step="0.01" {...register("depositAmount")} /></div>
          <div className="space-y-2">
            <Label>Payment Method *</Label>
            <Select value={watch("paymentMethod")} onValueChange={(v) => setValue("paymentMethod", v as CollectDepositFormValues["paymentMethod"])}>
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
          <div className="space-y-2"><Label>Received Date *</Label><Input type="date" {...register("receivedDate")} /></div>
          <div className="space-y-2"><Label>Notes</Label><Textarea {...register("notes")} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Collect Deposit"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
