"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormSectionCard } from "@/components/ui/form-section-card";
import { MileageCalculationPreview } from "@/components/rentals/mileage-calculation-preview";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { returnSchema, type ReturnFormValues } from "@/lib/validations/rental";
import { recordReturn } from "@/app/rentals/actions";
import { describeIncludedKmPolicy } from "@/lib/services/included-km";
import { getCurrentTimeHHMM } from "@/lib/utils";
import type { RatePlanType } from "@prisma/client";

interface ReturnFormProps {
  rentalId: string;
  startingOdometer: number;
  rentalDays: number;
  includedKmPerDay: number;
  includedKmExtraDay?: number;
  extraKmRate: number;
  dailyRate: number;
  ratePlanType: RatePlanType;
  deliveryCharge?: number;
  driverCharge?: number;
  otherCharges?: number;
  discount?: number;
  defaultDate?: string;
  embedded?: boolean;
}

export function ReturnForm({
  rentalId,
  startingOdometer,
  rentalDays,
  includedKmPerDay,
  includedKmExtraDay = includedKmPerDay,
  extraKmRate,
  dailyRate,
  ratePlanType,
  deliveryCharge = 0,
  driverCharge = 0,
  otherCharges = 0,
  discount = 0,
  defaultDate,
  embedded = false,
}: ReturnFormProps) {
  const router = useRouter();
  const today = defaultDate || new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<ReturnFormValues>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      returnDate: today,
      returnTime: getCurrentTimeHHMM(),
      endingOdometer: startingOdometer,
      endingFuelLevel: "FULL",
      vehicleCondition: "",
      newDamage: "",
      cleaningStatus: "CLEAN",
      isLateReturn: false,
      lateReturnCharge: 0,
      additionalCharges: 0,
      inspectionNotes: "",
    },
  });

  const endingOdometer = Number(watch("endingOdometer")) || startingOdometer;
  const lateReturnCharge = Number(watch("lateReturnCharge")) || 0;
  const additionalCharges = Number(watch("additionalCharges")) || 0;

  async function onSubmit(data: ReturnFormValues) {
    const result = await recordReturn(rentalId, data);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    router.refresh();
  }

  const formBody = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="rounded-lg border bg-muted/20 p-3 text-sm">
        <span className="text-muted-foreground">Starting odometer: </span>
        <span className="font-semibold">{startingOdometer.toLocaleString()} km</span>
        <span className="mx-2 text-muted-foreground">·</span>
        <span className="text-muted-foreground">Free allowance: </span>
        <span className="font-medium">
          {describeIncludedKmPolicy(rentalDays, includedKmPerDay, includedKmExtraDay)}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="returnDate">Return Date *</Label>
          <Input id="returnDate" type="date" {...register("returnDate")} required />
          {errors.returnDate && (
            <p className="text-sm text-destructive">{errors.returnDate.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="returnTime">Return Time *</Label>
          <Input id="returnTime" type="time" {...register("returnTime")} required />
          {errors.returnTime && (
            <p className="text-sm text-destructive">{errors.returnTime.message}</p>
          )}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="endingOdometer">Ending Odometer Reading (km) *</Label>
          <Input
            id="endingOdometer"
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
        <div className="space-y-2">
          <Label>Ending Fuel Level *</Label>
          <Select
            value={watch("endingFuelLevel")}
            onValueChange={(v) =>
              setValue("endingFuelLevel", v as ReturnFormValues["endingFuelLevel"])
            }
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EMPTY">Empty</SelectItem>
              <SelectItem value="QUARTER">1/4</SelectItem>
              <SelectItem value="HALF">1/2</SelectItem>
              <SelectItem value="THREE_QUARTER">3/4</SelectItem>
              <SelectItem value="FULL">Full</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Cleaning Status *</Label>
          <Select
            value={watch("cleaningStatus")}
            onValueChange={(v) =>
              setValue("cleaningStatus", v as ReturnFormValues["cleaningStatus"])
            }
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CLEAN">Clean</SelectItem>
              <SelectItem value="NEEDS_CLEANING">Needs Cleaning</SelectItem>
              <SelectItem value="DEEP_CLEAN_REQUIRED">Deep Clean Required</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lateReturnCharge">Late Return Charge</Label>
          <Input id="lateReturnCharge" type="number" step="0.01" {...register("lateReturnCharge")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="additionalCharges">Additional Charges</Label>
          <Input
            id="additionalCharges"
            type="number"
            step="0.01"
            {...register("additionalCharges")}
          />
        </div>
      </div>

      <MileageCalculationPreview
        startingOdometer={startingOdometer}
        endingOdometer={endingOdometer}
        rentalDays={rentalDays}
        includedKmPerDay={includedKmPerDay}
        includedKmExtraDay={includedKmExtraDay}
        extraKmRate={extraKmRate}
        dailyRate={dailyRate}
        ratePlanType={ratePlanType}
        deliveryCharge={deliveryCharge}
        driverCharge={driverCharge}
        otherCharges={otherCharges}
        discount={discount}
        lateReturnCharge={lateReturnCharge}
        additionalCharges={additionalCharges}
      />

      <div className="flex items-center gap-2">
        <input type="checkbox" id="isLateReturn" {...register("isLateReturn")} />
        <Label htmlFor="isLateReturn">Late return</Label>
      </div>
      <div className="space-y-2">
        <Label htmlFor="newDamage">New Damage</Label>
        <Textarea id="newDamage" {...register("newDamage")} rows={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vehicleCondition">Vehicle Condition</Label>
        <Textarea id="vehicleCondition" {...register("vehicleCondition")} rows={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="inspectionNotes">Inspection Notes</Label>
        <Textarea id="inspectionNotes" {...register("inspectionNotes")} rows={2} />
      </div>
      <Button type="submit" disabled={isSubmitting || endingOdometer < startingOdometer}>
        {isSubmitting ? "Recording..." : "Record Return & Update Final Bill"}
      </Button>
    </form>
  );

  if (embedded) {
    return (
      <div className="rounded-lg border p-4">
        <p className="mb-4 text-sm font-medium">Step 2 — Record ending odometer (return)</p>
        {formBody}
      </div>
    );
  }

  return (
    <FormSectionCard title="Vehicle Return — Ending Odometer" variant="amber">
      {formBody}
    </FormSectionCard>
  );
}
