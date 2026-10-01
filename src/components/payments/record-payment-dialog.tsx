"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { paymentFormSchema, type PaymentFormValues } from "@/lib/validations/payment";
import { recordPayment, fetchRentalDamagesForPayment } from "@/app/payments/actions";
import { formatCurrency } from "@/lib/utils";
import { useCurrencySymbol } from "@/components/currency-provider";

interface RentalOption {
  id: string;
  bookingNumber: string;
  status: string;
  customer: { fullName: string };
  finalTotal?: number;
  balance?: number;
}

interface PaymentRentalContext {
  finalTotal: number;
  balance: number;
  status: string;
  hasReturnRecord: boolean;
  extraKm?: number;
  extraKmCharge?: number;
}

interface RecordPaymentDialogProps {
  rentals: RentalOption[];
  defaultRentalId?: string;
  triggerLabel?: string;
  paymentContext?: PaymentRentalContext;
}

function getSuggestedPaymentType(status: string, hasReturnRecord: boolean): PaymentFormValues["paymentType"] {
  if (hasReturnRecord || status === "RETURNED" || status === "COMPLETED") {
    return "FINAL_PAYMENT";
  }
  return "RENTAL_PAYMENT";
}

function buildFormDefaults(
  defaultRentalId: string | undefined,
  paymentContext: PaymentRentalContext | undefined,
  selectedRental: RentalOption | undefined
): PaymentFormValues {
  const context =
    paymentContext && defaultRentalId
      ? paymentContext
      : selectedRental?.balance != null
        ? {
            finalTotal: selectedRental.finalTotal ?? 0,
            balance: selectedRental.balance,
            status: selectedRental.status,
            hasReturnRecord:
              selectedRental.status === "RETURNED" || selectedRental.status === "COMPLETED",
          }
        : null;

  const paymentType = context
    ? getSuggestedPaymentType(context.status, context.hasReturnRecord)
    : "RENTAL_PAYMENT";

  const suggestedAmount =
    context && context.balance > 0 && paymentType !== "ADVANCE" ? context.balance : 0;

  return {
    rentalId: defaultRentalId || selectedRental?.id || "",
    amount: suggestedAmount,
    paymentMethod: "CASH",
    paymentType,
    paymentDate: new Date().toISOString().split("T")[0],
    referenceNumber: "",
    notes: "",
    damageId: "",
  };
}

export function RecordPaymentDialog({
  rentals,
  defaultRentalId,
  triggerLabel = "Record Payment",
  paymentContext,
}: RecordPaymentDialogProps) {
  const router = useRouter();
  const currencySymbol = useCurrencySymbol();
  const [open, setOpen] = useState(false);
  const [damages, setDamages] = useState<
    Array<{ id: string; damageCode: string; damageType: string; customerCharge: { toString(): string } }>
  >([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: buildFormDefaults(defaultRentalId, paymentContext, undefined),
  });

  const rentalId = watch("rentalId");
  const paymentType = watch("paymentType");
  const amount = watch("amount");

  const selectedRental = rentals.find((r) => r.id === rentalId);
  const context: PaymentRentalContext | null =
    paymentContext && defaultRentalId
      ? paymentContext
      : selectedRental?.balance != null
        ? {
            finalTotal: selectedRental.finalTotal ?? 0,
            balance: selectedRental.balance,
            status: selectedRental.status,
            hasReturnRecord:
              selectedRental.status === "RETURNED" || selectedRental.status === "COMPLETED",
          }
        : null;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      reset(buildFormDefaults(defaultRentalId, paymentContext, undefined));
    }
  }

  useEffect(() => {
    if (!open || !context) return;
    if (!["RENTAL_PAYMENT", "FINAL_PAYMENT"].includes(paymentType)) return;
    if (context.balance <= 0) return;
    if (Number(amount) > 0) return;
    setValue("amount", context.balance, { shouldValidate: true, shouldDirty: true });
  }, [open, context, paymentType, amount, setValue]);

  useEffect(() => {
    if (paymentType === "DAMAGE_PAYMENT" && rentalId) {
      fetchRentalDamagesForPayment(rentalId).then(setDamages);
    } else {
      setDamages([]);
      setValue("damageId", "");
    }
  }, [paymentType, rentalId, setValue]);

  function handleRentalChange(id: string) {
    setValue("rentalId", id, { shouldValidate: true });
    const rental = rentals.find((r) => r.id === id);
    if (rental?.balance != null && rental.balance > 0) {
      const type = getSuggestedPaymentType(
        rental.status,
        rental.status === "RETURNED" || rental.status === "COMPLETED"
      );
      setValue("paymentType", type);
      setValue("amount", rental.balance, { shouldValidate: true, shouldDirty: true });
    }
  }

  function handlePaymentTypeChange(type: PaymentFormValues["paymentType"]) {
    setValue("paymentType", type);
    if (
      context &&
      ["RENTAL_PAYMENT", "FINAL_PAYMENT"].includes(type) &&
      context.balance > 0
    ) {
      setValue("amount", context.balance, { shouldValidate: true, shouldDirty: true });
    }
  }

  function fillBalanceAmount() {
    if (context && context.balance > 0) {
      setValue("amount", context.balance, { shouldValidate: true, shouldDirty: true });
    }
  }

  async function onSubmit(data: PaymentFormValues) {
    const result = await recordPayment(data);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    if (result.data?.fullyPaid) {
      toast.success(result.message, {
        action: {
          label: "Print receipt",
          onClick: () => window.open(`/rentals/${result.data!.rentalId}/receipt`, "_blank"),
        },
        duration: 10000,
      });
    } else {
      toast.success(result.message);
    }
    reset(buildFormDefaults(defaultRentalId, paymentContext, undefined));
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!defaultRentalId && (
            <div className="space-y-2">
              <Label>Rental *</Label>
              <Select value={rentalId} onValueChange={handleRentalChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rental" />
                </SelectTrigger>
                <SelectContent>
                  {rentals.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.bookingNumber} — {r.customer.fullName} ({r.status})
                      {r.balance != null ? ` — due ${formatCurrency(r.balance)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {context && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Final total</span>
                <span className="font-semibold">{formatCurrency(context.finalTotal)}</span>
              </div>
              {paymentContext?.extraKmCharge != null && paymentContext.extraKmCharge > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Extra KM ({paymentContext.extraKm ?? 0} km)
                  </span>
                  <span>{formatCurrency(paymentContext.extraKmCharge)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-orange-700">
                <span>Balance due</span>
                <span>{formatCurrency(context.balance)}</span>
              </div>
              {context.status === "ACTIVE" && !context.hasReturnRecord && (
                <p className="text-destructive">
                  Record the ending odometer first to calculate the final bill.
                </p>
              )}
              {context.status === "RETURNED" && (
                <p className="text-muted-foreground">
                  Recording cash received will complete this hire automatically.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="payment-amount">Amount ({currencySymbol}) *</Label>
                {context && context.balance > 0 && (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={fillBalanceAmount}
                  >
                    Use balance ({formatCurrency(context.balance)})
                  </Button>
                )}
              </div>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min={0}
                value={amount === 0 ? "" : amount}
                onChange={(e) => {
                  const val = e.target.value;
                  setValue("amount", val === "" ? 0 : Number(val), {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-date">Payment Date *</Label>
              <Input id="payment-date" type="date" {...register("paymentDate")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Payment Type *</Label>
              <Select value={paymentType} onValueChange={handlePaymentTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADVANCE">Advance</SelectItem>
                  <SelectItem value="RENTAL_PAYMENT">Rental Payment</SelectItem>
                  <SelectItem value="FINAL_PAYMENT">Final Payment</SelectItem>
                  <SelectItem value="DAMAGE_PAYMENT">Damage Payment</SelectItem>
                  <SelectItem value="ADDITIONAL_CHARGE">Additional Charge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <Select
                value={watch("paymentMethod")}
                onValueChange={(v) =>
                  setValue("paymentMethod", v as PaymentFormValues["paymentMethod"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {paymentType === "DAMAGE_PAYMENT" && (
            <div className="space-y-2">
              <Label>Damage Record *</Label>
              <Select
                value={watch("damageId") || ""}
                onValueChange={(v) => setValue("damageId", v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select damage" />
                </SelectTrigger>
                <SelectContent>
                  {damages.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No unpaid damages
                    </SelectItem>
                  ) : (
                    damages.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.damageCode} — {d.damageType} (Rs. {d.customerCharge.toString()})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Reference Number</Label>
            <Input {...register("referenceNumber")} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea {...register("notes")} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
