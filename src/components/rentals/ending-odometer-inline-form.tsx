"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MileageCalculationPreview } from "@/components/rentals/mileage-calculation-preview";
import {
  endingOdometerRecordSchema,
  type EndingOdometerRecordValues,
} from "@/lib/validations/rental";
import { recordEndingOdometer, updateEndingOdometer } from "@/app/rentals/actions";
import { formatCurrency, getCurrentTimeHHMM } from "@/lib/utils";
import type { RatePlanType } from "@prisma/client";

export interface EndingOdometerInlineFormProps {
  rentalId: string;
  startingOdometer: number;
  rentalDays: number;
  includedKm: number;
  includedKmExtraDay?: number;
  extraKmRate: number;
  dailyRate: number;
  ratePlanType: RatePlanType;
  deliveryCharge?: number;
  driverCharge?: number;
  otherCharges?: number;
  discount?: number;
  defaultReturnDate?: string;
  defaultReturnTime?: string;
  defaultEndingOdometer?: number;
  /** "record" = first entry; "correct" = fix a mistaken reading after return */
  mode?: "record" | "correct";
  embedded?: boolean;
}

export function EndingOdometerInlineForm({
  rentalId,
  startingOdometer,
  rentalDays,
  includedKm,
  includedKmExtraDay,
  extraKmRate,
  dailyRate,
  ratePlanType,
  deliveryCharge = 0,
  driverCharge = 0,
  otherCharges = 0,
  discount = 0,
  defaultReturnDate,
  defaultReturnTime,
  defaultEndingOdometer,
  mode = "record",
  embedded = false,
}: EndingOdometerInlineFormProps) {
  const router = useRouter();
  const isCorrectMode = mode === "correct";
  const today = defaultReturnDate || new Date().toISOString().split("T")[0];
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingData, setPendingData] = useState<EndingOdometerRecordValues | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EndingOdometerRecordValues>({
    resolver: zodResolver(endingOdometerRecordSchema),
    defaultValues: {
      rentalId,
      endingOdometer: defaultEndingOdometer ?? startingOdometer,
      returnDate: today,
      returnTime: defaultReturnTime || getCurrentTimeHHMM(),
    },
  });

  const endingOdometer = Number(watch("endingOdometer")) || startingOdometer;

  async function submitValues(data: EndingOdometerRecordValues) {
    const result = isCorrectMode
      ? await updateEndingOdometer(data)
      : await recordEndingOdometer(data);

    if (!result.success) {
      if (result.fieldErrors) {
        const firstError = Object.values(result.fieldErrors)[0]?.[0];
        toast.error(firstError || result.error);
      } else {
        toast.error(result.error);
      }
      return;
    }

    toast.success(result.message);
    if (result.data && result.data.balance > 0) {
      toast.info(
        `Final bill: ${formatCurrency(result.data.finalTotal)} — balance due: ${formatCurrency(result.data.balance)}`
      );
    }
    router.refresh();
  }

  async function onSubmit(data: EndingOdometerRecordValues) {
    if (isCorrectMode) {
      setPendingData(data);
      setConfirmOpen(true);
      return;
    }
    await submitValues(data);
  }

  async function handleConfirmCorrect() {
    if (!pendingData) return;
    setConfirmOpen(false);
    await submitValues(pendingData);
    setPendingData(null);
  }

  const formBody = (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register("rentalId")} />

        <div className="rounded-lg border bg-muted/20 p-3 text-sm">
          <span className="text-muted-foreground">Starting odometer: </span>
          <span className="font-semibold text-cyan-700 dark:text-cyan-300">
            {startingOdometer.toLocaleString()} km
          </span>
          {isCorrectMode && defaultEndingOdometer != null && (
            <>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="text-muted-foreground">Current ending: </span>
              <span className="font-semibold">{defaultEndingOdometer.toLocaleString()} km</span>
            </>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`returnDate-${rentalId}`}>Return date *</Label>
            <Input id={`returnDate-${rentalId}`} type="date" {...register("returnDate")} required />
            {errors.returnDate && (
              <p className="text-sm text-destructive">{errors.returnDate.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`returnTime-${rentalId}`}>Return time *</Label>
            <Input id={`returnTime-${rentalId}`} type="time" {...register("returnTime")} required />
            {errors.returnTime && (
              <p className="text-sm text-destructive">{errors.returnTime.message}</p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`endingOdometer-${rentalId}`}>Ending odometer reading (km) *</Label>
            <Input
              id={`endingOdometer-${rentalId}`}
              type="number"
              min={startingOdometer}
              step={1}
              className="text-lg font-semibold"
              {...register("endingOdometer")}
            />
            {errors.endingOdometer && (
              <p className="text-sm text-destructive">{errors.endingOdometer.message}</p>
            )}
          </div>
        </div>

        {endingOdometer >= startingOdometer && (
          <MileageCalculationPreview
            startingOdometer={startingOdometer}
            endingOdometer={endingOdometer}
            rentalDays={rentalDays}
            includedKmPerDay={includedKm}
            includedKmExtraDay={includedKmExtraDay ?? includedKm}
            extraKmRate={extraKmRate}
            dailyRate={dailyRate}
            ratePlanType={ratePlanType}
            deliveryCharge={deliveryCharge}
            driverCharge={driverCharge}
            otherCharges={otherCharges}
            discount={discount}
          />
        )}

        <Button
          type="submit"
          disabled={isSubmitting || endingOdometer < startingOdometer}
          className="w-full sm:w-auto"
          variant={isCorrectMode ? "outline" : "default"}
        >
          {isSubmitting
            ? "Recalculating..."
            : isCorrectMode
              ? "Correct ending odometer & recalculate bill"
              : "Calculate final bill from KM driven"}
        </Button>
      </form>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Correct ending odometer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will recalculate KM driven, extra KM charges, and the final bill. If payments were
              already recorded, the balance due will update — you may need to record an additional
              payment or adjust existing ones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingData(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCorrect} disabled={isSubmitting}>
              Yes, recalculate bill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (embedded) {
    return (
      <div
        className={
          isCorrectMode
            ? "rounded-lg border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-900/40 dark:bg-orange-950/20"
            : "rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20"
        }
      >
        <p className="mb-4 text-sm font-medium">
          {isCorrectMode
            ? "Wrong ending odometer? Enter the correct reading below to recalculate the final bill."
            : "Enter ending odometer when customer returns"}
        </p>
        {formBody}
      </div>
    );
  }

  return formBody;
}
