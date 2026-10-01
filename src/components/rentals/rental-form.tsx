"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormSectionCard } from "@/components/ui/form-section-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock } from "lucide-react";
import { BlacklistWarningBanner } from "@/components/customers/blacklist-warning-banner";
import { PricingSummary } from "@/components/rentals/pricing-summary";
import { CommissionPreview } from "@/components/rentals/commission-preview";
import { CustomerNicPicker } from "@/components/rentals/customer-nic-picker";
import { rentalFormSchema, type RentalFormValues } from "@/lib/validations/rental";
import { describeIncludedKmPolicy } from "@/lib/services/included-km";
import { calculateRentalDays, getRentalDurationInfo } from "@/lib/services/pricing";
import { getCurrentTimeHHMM } from "@/lib/utils";
import { createRental, updateRental, previewRentalPricing } from "@/app/rentals/actions";
import { checkCustomerBlacklistWarning } from "@/app/customers/actions";
import type { PricingResult } from "@/lib/services/pricing";

interface RentalFormProps {
  mode: "create" | "edit";
  createIntent?: "quick" | "inquiry";
  rentalId?: string;
  defaultValues?: Partial<RentalFormValues>;
  customers: Array<{ id: string; fullName: string; customerCode: string; nic: string; status: string }>;
  vehicles: Array<{
    id: string;
    registrationNumber: string;
    make: string;
    model: string;
    dailyRate: number;
    includedKm: number;
    includedKmExtraDay: number;
    extraKmRate: number;
    ownerDailyRate: number | null;
    ownerExtraKmRate: number | null;
    ownershipType: "COMPANY_OWNED" | "PERSONALLY_OWNED" | "THIRD_PARTY_OWNED";
    ownerId?: string | null;
    weeklyRate: number | null;
    monthlyRate: number | null;
    currentOdometer: number;
  }>;
  drivers: Array<{ id: string; name: string; driverCode: string }>;
  brokers: Array<{
    id: string;
    name: string;
    brokerCode: string;
    defaultCommissionPerDay: number;
    defaultCommissionPerExtraKm: number;
  }>;
}

function localIsoDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const emptyDefaults: RentalFormValues = {
  customerId: "",
  vehicleId: "",
  rentalType: "SELF_DRIVE",
  ratePlanType: "DAILY",
  pickupDate: "",
  pickupTime: "",
  returnDate: "",
  returnTime: "",
  pickupLocation: "",
  returnLocation: "",
  dailyRate: 0,
  includedKm: 200,
  includedKmExtraDay: 200,
  extraKmRate: 0,
  deliveryCharge: 0,
  driverCharge: 0,
  otherCharges: 0,
  discount: 0,
  securityDeposit: 0,
  advancePayment: 0,
  driverId: "",
  brokerId: "",
  brokerCommissionPerDay: 0,
  brokerCommissionPerExtraKm: 0,
  ownerDailyRate: null,
  ownerExtraKmRate: null,
  startingOdometer: null,
  notes: "",
  status: "INQUIRY",
};

export function RentalForm({
  mode,
  createIntent = "inquiry",
  rentalId,
  defaultValues,
  customers,
  vehicles,
  drivers,
  brokers,
}: RentalFormProps) {
  const router = useRouter();
  const isQuickHire = mode === "create" && createIntent === "quick";
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [blacklistWarning, setBlacklistWarning] = useState<{
    fullName: string;
    reason: string | null;
    shouldBlock: boolean;
  } | null>(null);
  const skipInitialVehicleFill = useRef(mode === "edit");
  const skipInitialBrokerFill = useRef(mode === "edit");

  const currentTime = getCurrentTimeHHMM();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RentalFormValues>({
    resolver: zodResolver(rentalFormSchema),
    defaultValues: {
      ...emptyDefaults,
      pickupTime: defaultValues?.pickupTime || currentTime,
      returnTime: defaultValues?.returnTime || currentTime,
      ...(isQuickHire
        ? {
            pickupDate: localIsoDate(0),
            returnDate: localIsoDate(1),
            status: "CONFIRMED",
          }
        : {}),
      ...defaultValues,
    },
  });

  const rentalType = watch("rentalType");
  const customerId = watch("customerId");
  const vehicleId = watch("vehicleId");
  const brokerId = watch("brokerId");
  const pickupDate = watch("pickupDate");
  const returnDate = watch("returnDate");
  const pickupTime = watch("pickupTime");
  const returnTime = watch("returnTime");
  const ratePlanType = watch("ratePlanType");
  const dailyRate = watch("dailyRate");
  const includedKm = watch("includedKm");
  const includedKmExtraDay = watch("includedKmExtraDay");
  const extraKmRate = watch("extraKmRate");
  const deliveryCharge = watch("deliveryCharge");
  const driverCharge = watch("driverCharge");
  const otherCharges = watch("otherCharges");
  const discount = watch("discount");
  const brokerCommissionPerDay = watch("brokerCommissionPerDay");
  const brokerCommissionPerExtraKm = watch("brokerCommissionPerExtraKm");
  const ownerDailyRate = watch("ownerDailyRate");
  const ownerExtraKmRate = watch("ownerExtraKmRate");
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  const durationInfo =
    pickupDate && returnDate && pickupTime && returnTime
      ? getRentalDurationInfo(pickupDate, returnDate, pickupTime, returnTime)
      : null;
  const isOwnerVehicle = Boolean(
    selectedVehicle?.ownerId ||
      selectedVehicle?.ownershipType === "THIRD_PARTY_OWNED" ||
      selectedVehicle?.ownershipType === "PERSONALLY_OWNED"
  );

  useEffect(() => {
    if (!customerId) {
      setBlacklistWarning(null);
      return;
    }
    checkCustomerBlacklistWarning(customerId).then((result) => {
      if (result?.isBlacklisted) {
        setBlacklistWarning({
          fullName: result.fullName,
          reason: result.reason,
          shouldBlock: result.shouldBlock,
        });
      } else {
        setBlacklistWarning(null);
      }
    });
  }, [customerId]);

  useEffect(() => {
    if (skipInitialVehicleFill.current) {
      skipInitialVehicleFill.current = false;
      return;
    }

    if (vehicleId) {
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      if (vehicle) {
        setValue("dailyRate", vehicle.dailyRate);
        setValue("includedKm", vehicle.includedKm);
        setValue("includedKmExtraDay", vehicle.includedKmExtraDay);
        setValue("extraKmRate", vehicle.extraKmRate);
        if (
          vehicle.ownerId ||
          vehicle.ownershipType === "THIRD_PARTY_OWNED" ||
          vehicle.ownershipType === "PERSONALLY_OWNED"
        ) {
          setValue("ownerDailyRate", vehicle.ownerDailyRate);
          setValue("ownerExtraKmRate", vehicle.ownerExtraKmRate);
        } else {
          setValue("ownerDailyRate", null);
          setValue("ownerExtraKmRate", null);
        }
        if (mode === "create" && vehicle.currentOdometer > 0) {
          setValue("startingOdometer", vehicle.currentOdometer);
        }
      }
    } else {
      setValue("ownerDailyRate", null);
      setValue("ownerExtraKmRate", null);
    }
  }, [vehicleId, vehicles, setValue, mode]);

  useEffect(() => {
    if (skipInitialBrokerFill.current) {
      skipInitialBrokerFill.current = false;
      return;
    }

    if (!brokerId) {
      setValue("brokerCommissionPerDay", 0);
      setValue("brokerCommissionPerExtraKm", 0);
      return;
    }

    const broker = brokers.find((b) => b.id === brokerId);
    if (broker) {
      setValue("brokerCommissionPerDay", broker.defaultCommissionPerDay);
      setValue("brokerCommissionPerExtraKm", broker.defaultCommissionPerExtraKm);
    }
  }, [brokerId, brokers, setValue]);

  useEffect(() => {
    if (!pickupDate || !returnDate) {
      setPricing(null);
      setPricingLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setPricingLoading(true);
      const result = await previewRentalPricing({
        pickupDate,
        pickupTime,
        returnDate,
        returnTime,
        ratePlanType,
        dailyRate: Number(dailyRate) || 0,
        includedKm: Number(includedKm) || 0,
        includedKmExtraDay: Number(includedKmExtraDay) || 0,
        extraKmRate: Number(extraKmRate) || 0,
        deliveryCharge: Number(deliveryCharge) || 0,
        driverCharge: Number(driverCharge) || 0,
        otherCharges: Number(otherCharges) || 0,
        discount: Number(discount) || 0,
        vehicleId: vehicleId || undefined,
      });
      if (cancelled) return;
      setPricingLoading(false);
      if (result.success && result.data) setPricing(result.data);
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    pickupDate,
    returnDate,
    pickupTime,
    returnTime,
    ratePlanType,
    dailyRate,
    includedKm,
    includedKmExtraDay,
    extraKmRate,
    deliveryCharge,
    driverCharge,
    otherCharges,
    discount,
    vehicleId,
  ]);

  async function onSubmit(data: RentalFormValues) {
    if (blacklistWarning?.shouldBlock) {
      toast.error("Cannot create rental for blacklisted customer");
      return;
    }

    const payload: RentalFormValues = isQuickHire ? { ...data, status: "CONFIRMED" } : data;
    const result =
      mode === "create" ? await createRental(payload) : await updateRental(rentalId!, data);

    if (!result.success) {
      if (result.fieldErrors) {
        const firstError = Object.values(result.fieldErrors)[0]?.[0];
        toast.error(firstError || result.error);
      } else {
        toast.error(result.error);
      }
      return;
    }

    toast.success(result.message || "Saved successfully");
    router.push(mode === "create" ? `/rentals/${result.data?.id}` : `/rentals/${rentalId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {blacklistWarning && (
        <BlacklistWarningBanner
          customerName={blacklistWarning.fullName}
          reason={blacklistWarning.reason}
          shouldBlock={blacklistWarning.shouldBlock}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <FormSectionCard title="Customer & Vehicle" variant="sky">
            <div className="grid gap-4 sm:grid-cols-2">
              <CustomerNicPicker
                customers={customers}
                value={customerId}
                onChange={(id) => setValue("customerId", id, { shouldValidate: Boolean(id), shouldDirty: true })}
                error={errors.customerId?.message}
              />

              <div className="space-y-2 sm:col-span-2">
                <Label>Vehicle {isQuickHire ? "*" : "(optional at inquiry)"}</Label>
                <Select
                  value={vehicleId || ""}
                  onValueChange={(v) => setValue("vehicleId", v === "none" ? "" : v, { shouldValidate: true, shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isQuickHire ? "Select the vehicle" : "Assign later or select now"} />
                  </SelectTrigger>
                  <SelectContent>
                    {!isQuickHire && <SelectItem value="none">No vehicle yet</SelectItem>}
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.registrationNumber} — {v.make} {v.model}
                        {v.ownershipType !== "COMPANY_OWNED" ? " (Owner vehicle)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.vehicleId && (
                  <p className="text-sm text-destructive">{errors.vehicleId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Rental Type *</Label>
                <Select
                  value={rentalType}
                  onValueChange={(v) => setValue("rentalType", v as RentalFormValues["rentalType"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SELF_DRIVE">Self Drive</SelectItem>
                    <SelectItem value="WITH_DRIVER">With Driver</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Rate Plan *</Label>
                <Select
                  value={watch("ratePlanType")}
                  onValueChange={(v) => setValue("ratePlanType", v as RentalFormValues["ratePlanType"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {rentalType === "WITH_DRIVER" && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Driver *</Label>
                  <Select
                    value={watch("driverId") || ""}
                    onValueChange={(v) => setValue("driverId", v, { shouldValidate: true })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                    <SelectContent>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} ({d.driverCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.driverId && (
                    <p className="text-sm text-destructive">{errors.driverId.message}</p>
                  )}
                </div>
              )}

              <div className="space-y-2 sm:col-span-2">
                <Label>Referral broker (optional)</Label>
                <Select
                  value={watch("brokerId") || ""}
                  onValueChange={(v) => setValue("brokerId", v === "none" ? "" : v)}
                >
                  <SelectTrigger><SelectValue placeholder="No broker" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No broker</SelectItem>
                    {brokers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.brokerCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Use when another broker referred this customer to you.
                </p>
              </div>
            </div>
          </FormSectionCard>

          {brokerId && (
            <FormSectionCard title="Broker Commission" variant="violet">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brokerCommissionPerDay">Pay broker per day (LKR)</Label>
                  <Input
                    id="brokerCommissionPerDay"
                    type="number"
                    step="0.01"
                    {...register("brokerCommissionPerDay")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brokerCommissionPerExtraKm">Pay broker per extra km (LKR)</Label>
                  <Input
                    id="brokerCommissionPerExtraKm"
                    type="number"
                    step="0.01"
                    {...register("brokerCommissionPerExtraKm")}
                  />
                </div>
                <p className="sm:col-span-2 text-xs text-muted-foreground">
                  Example: Rs. 1,000/day + Rs. 5/extra km from a Rs. 6,000/day customer rental.
                </p>
              </div>
            </FormSectionCard>
          )}

          {isOwnerVehicle && (
            <FormSectionCard title="Owner Payout" variant="emerald">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ownerDailyRate">Pay owner per day (LKR)</Label>
                  <Input
                    id="ownerDailyRate"
                    type="number"
                    step="0.01"
                    {...register("ownerDailyRate", {
                      setValueAs: (value) => (value === "" || value == null ? null : Number(value)),
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerExtraKmRate">Pay owner per extra km (LKR)</Label>
                  <Input
                    id="ownerExtraKmRate"
                    type="number"
                    step="0.01"
                    {...register("ownerExtraKmRate", {
                      setValueAs: (value) => (value === "" || value == null ? null : Number(value)),
                    })}
                  />
                </div>
                <p className="sm:col-span-2 text-xs text-muted-foreground">
                  Customer amount is income. Owner amount is expense. Your profit is the margin
                  (for example customer Rs. 6,000/day, owner Rs. 5,000/day → you keep Rs. 1,000/day).
                  These lock into income and expenses when the hire is completed.
                </p>
              </div>
            </FormSectionCard>
          )}

          <FormSectionCard title="Dates & Locations" variant="amber">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pickupDate">Pickup Date *</Label>
                <Input id="pickupDate" type="date" {...register("pickupDate")} required />
                {errors.pickupDate && (
                  <p className="text-sm text-destructive">{errors.pickupDate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickupTime">Pickup Time *</Label>
                <Input id="pickupTime" type="time" {...register("pickupTime")} required />
                {errors.pickupTime && (
                  <p className="text-sm text-destructive">{errors.pickupTime.message}</p>
                )}
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="pickupLocation">Pickup Location</Label>
                <Input id="pickupLocation" {...register("pickupLocation")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="returnLocation">Return Location</Label>
                <Input id="returnLocation" {...register("returnLocation")} />
              </div>
            </div>

            {durationInfo && (
              <div
                className={`mt-4 rounded-lg border p-3.5 text-sm transition-colors ${
                  durationInfo.isOverdue24h
                    ? "border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/20"
                    : "border-border/60 bg-muted/30"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Clock className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      Total Duration:{" "}
                      <strong className="font-semibold">{durationInfo.totalHours} hrs</strong> (
                      {durationInfo.rentalDays} Day{durationInfo.rentalDays > 1 ? "s" : ""}
                      {durationInfo.extraHours > 0
                        ? ` + ${durationInfo.extraHours} extra hrs`
                        : ""}
                      )
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Standard: {durationInfo.expectedHours} hrs ({durationInfo.rentalDays} × 24h)
                  </span>
                </div>

                {durationInfo.isOverdue24h && (
                  <div className="mt-3 pt-3 border-t border-amber-500/30 text-xs sm:text-sm space-y-1 text-amber-900 dark:text-amber-200">
                    <p className="font-medium">
                      ⚠️ Exceeds standard 24-hour cycle by {durationInfo.extraHours} hours. Extra charge කරනවාද?
                    </p>
                    <p className="text-xs text-muted-foreground">
                      If you want to charge extra for the additional {durationInfo.extraHours} hours, enter the extra fee in &quot;Other Charges&quot; under Customer Rates &amp; Charges below. If you don&apos;t want to charge extra, leave Other Charges at 0.
                    </p>
                  </div>
                )}
              </div>
            )}
          </FormSectionCard>

          <FormSectionCard title="Starting Odometer" variant="cyan">
            <p className="mb-4 text-sm text-muted-foreground">
              Enter the vehicle odometer reading at pickup. This is saved on the rental and used
              when the customer returns the car to calculate extra KM charges.
            </p>
            <div className="space-y-2 max-w-md">
              <Label htmlFor="startingOdometer">Starting odometer reading (km)</Label>
              <Input
                id="startingOdometer"
                type="number"
                min={0}
                step={1}
                className="text-lg font-semibold"
                {...register("startingOdometer", {
                  setValueAs: (value) =>
                    value === "" || value == null ? null : Number(value),
                })}
              />
              {selectedVehicle && selectedVehicle.currentOdometer > 0 && (
                <p className="text-xs text-muted-foreground">
                  Vehicle current odometer on file:{" "}
                  {selectedVehicle.currentOdometer.toLocaleString()} km
                </p>
              )}
              {errors.startingOdometer && (
                <p className="text-sm text-destructive">{errors.startingOdometer.message}</p>
              )}
            </div>
          </FormSectionCard>

          <FormSectionCard title="Customer Rates & Charges" variant="rose">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="dailyRate">Customer daily rate (LKR)</Label>
                <Input id="dailyRate" type="number" step="0.01" {...register("dailyRate")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="includedKm">Free KM on day 1</Label>
                <Input id="includedKm" type="number" {...register("includedKm")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="includedKmExtraDay">Free KM on each extra day</Label>
                <Input id="includedKmExtraDay" type="number" {...register("includedKmExtraDay")} />
                <p className="text-xs text-muted-foreground">
                  {describeIncludedKmPolicy(
                    pickupDate && returnDate
                      ? calculateRentalDays(
                          new Date(pickupDate),
                          new Date(returnDate),
                          pickupTime,
                          returnTime
                        )
                      : 1,
                    Number(includedKm) || 0,
                    Number(includedKmExtraDay) || 0
                  )}
                  . Extra KM beyond that is charged at the extra km rate when the vehicle is returned.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="extraKmRate">Customer extra km rate (LKR)</Label>
                <Input id="extraKmRate" type="number" step="0.01" {...register("extraKmRate")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryCharge">Delivery Charge</Label>
                <Input id="deliveryCharge" type="number" step="0.01" {...register("deliveryCharge")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driverCharge">Driver Charge</Label>
                <Input id="driverCharge" type="number" step="0.01" {...register("driverCharge")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherCharges">Other Charges</Label>
                <Input id="otherCharges" type="number" step="0.01" {...register("otherCharges")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">Discount</Label>
                <Input id="discount" type="number" step="0.01" {...register("discount")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="securityDeposit">Security Deposit</Label>
                <Input id="securityDeposit" type="number" step="0.01" {...register("securityDeposit")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="advancePayment">Advance Payment</Label>
                <Input id="advancePayment" type="number" step="0.01" {...register("advancePayment")} />
              </div>
            </div>
          </FormSectionCard>

          <FormSectionCard title="Notes" variant="slate">
            <Textarea {...register("notes")} rows={3} placeholder="Internal notes..." />
          </FormSectionCard>
        </div>

        <div className="space-y-6">
          <PricingSummary pricing={pricing} loading={pricingLoading} />
          <CommissionPreview
            rentalDays={pricing?.rentalDays ?? 0}
            brokerId={brokerId || undefined}
            brokerCommissionPerDay={Number(brokerCommissionPerDay) || 0}
            brokerCommissionPerExtraKm={Number(brokerCommissionPerExtraKm) || 0}
            vehicleOwnershipType={selectedVehicle?.ownershipType}
            vehicleOwnerId={selectedVehicle?.ownerId}
            customerDailyRate={Number(dailyRate) || 0}
            customerExtraKmRate={Number(extraKmRate) || 0}
            ownerDailyRate={ownerDailyRate}
            ownerExtraKmRate={ownerExtraKmRate}
          />

          {mode === "create" && !isQuickHire && (
            <FormSectionCard title="Initial Status" variant="slate">
                <Select
                  value={watch("status") || "INQUIRY"}
                  onValueChange={(v) => setValue("status", v as "INQUIRY" | "QUOTED")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INQUIRY">Inquiry</SelectItem>
                    <SelectItem value="QUOTED">Quoted</SelectItem>
                  </SelectContent>
                </Select>
            </FormSectionCard>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            {isQuickHire && (
              <Button type="button" variant="outline" onClick={() => router.push("/rentals/new?intent=inquiry")}>
                Save as inquiry instead
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting || blacklistWarning?.shouldBlock}>
              {isSubmitting
                ? "Saving..."
                : mode === "edit"
                  ? "Update Rental"
                  : isQuickHire
                    ? "Confirm hire"
                    : "Create Rental"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
