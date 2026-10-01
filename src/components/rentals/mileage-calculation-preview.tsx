"use client";

import { describeIncludedKmPolicy } from "@/lib/services/included-km";
import { calculatePricing } from "@/lib/services/pricing";
import { formatCurrency } from "@/lib/utils";
import type { RatePlanType } from "@prisma/client";

interface MileageCalculationPreviewProps {
  startingOdometer: number;
  endingOdometer: number;
  rentalDays: number;
  includedKmPerDay: number;
  includedKmExtraDay?: number;
  extraKmRate: number;
  dailyRate: number;
  ratePlanType?: RatePlanType;
  deliveryCharge?: number;
  driverCharge?: number;
  otherCharges?: number;
  discount?: number;
  lateReturnCharge?: number;
  additionalCharges?: number;
}

export function MileageCalculationPreview({
  startingOdometer,
  endingOdometer,
  rentalDays,
  includedKmPerDay,
  includedKmExtraDay = includedKmPerDay,
  extraKmRate,
  dailyRate,
  ratePlanType = "DAILY",
  deliveryCharge = 0,
  driverCharge = 0,
  otherCharges = 0,
  discount = 0,
  lateReturnCharge = 0,
  additionalCharges = 0,
}: MileageCalculationPreviewProps) {
  if (endingOdometer < startingOdometer) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Ending odometer cannot be less than the starting reading (
        {startingOdometer.toLocaleString()} km).
      </div>
    );
  }

  const pricing = calculatePricing({
    dailyRate,
    rentalDays,
    includedKmPerDay,
    includedKmExtraDay,
    extraKmRate,
    ratePlanType,
    deliveryCharge,
    driverCharge,
    otherCharges: otherCharges + lateReturnCharge + additionalCharges,
    discount,
    startingOdometer,
    endingOdometer,
  });

  return (
    <div className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-sky-50/40 p-4 dark:to-sky-950/10">
      <p className="mb-3 text-sm font-semibold">Mileage & final bill preview</p>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-4 sm:flex-col sm:justify-start">
          <dt className="text-muted-foreground">Starting odometer</dt>
          <dd className="font-medium">{startingOdometer.toLocaleString()} km</dd>
        </div>
        <div className="flex justify-between gap-4 sm:flex-col sm:justify-start">
          <dt className="text-muted-foreground">Ending odometer</dt>
          <dd className="font-medium">{endingOdometer.toLocaleString()} km</dd>
        </div>
        <div className="flex justify-between gap-4 sm:flex-col sm:justify-start">
          <dt className="text-muted-foreground">KM driven this hire</dt>
          <dd className="font-semibold text-primary">{pricing.totalKm.toLocaleString()} km</dd>
        </div>
        <div className="flex justify-between gap-4 sm:flex-col sm:justify-start">
          <dt className="text-muted-foreground">Free KM allowance</dt>
          <dd>
            {describeIncludedKmPolicy(rentalDays, includedKmPerDay, includedKmExtraDay)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 sm:flex-col sm:justify-start">
          <dt className="text-muted-foreground">Extra KM (chargeable)</dt>
          <dd className={pricing.extraKm > 0 ? "font-semibold text-orange-700" : ""}>
            {pricing.extraKm.toLocaleString()} km
            {pricing.extraKm > 0 && extraKmRate > 0
              ? ` @ ${formatCurrency(extraKmRate)}/km`
              : ""}
          </dd>
        </div>
        <div className="flex justify-between gap-4 sm:flex-col sm:justify-start">
          <dt className="text-muted-foreground">Extra KM charge</dt>
          <dd className={pricing.extraKmCharge > 0 ? "font-semibold text-orange-700" : ""}>
            {formatCurrency(pricing.extraKmCharge)}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex items-center justify-between border-t pt-3 text-sm font-semibold">
        <span>Estimated final bill (incl. extra KM)</span>
        <span>{formatCurrency(pricing.finalTotal)}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Extra KM is calculated when driven distance exceeds the free allowance. The final bill updates
        automatically when you record the return.
      </p>
    </div>
  );
}
