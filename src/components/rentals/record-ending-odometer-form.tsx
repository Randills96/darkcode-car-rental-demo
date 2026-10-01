"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSectionCard } from "@/components/ui/form-section-card";
import { MileageCalculationPreview } from "@/components/rentals/mileage-calculation-preview";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  endingOdometerRecordSchema,
  type EndingOdometerRecordValues,
} from "@/lib/validations/rental";
import { recordEndingOdometer } from "@/app/rentals/actions";
import { formatCurrency, getCurrentTimeHHMM } from "@/lib/utils";
import type { RatePlanType } from "@prisma/client";

export interface ActiveRentalForEndingOdometer {
  id: string;
  bookingNumber: string;
  startingOdometer: number | null;
  rentalDays: number;
  includedKm: number;
  includedKmExtraDay: number;
  extraKmRate: number;
  dailyRate: number;
  ratePlanType: RatePlanType;
  deliveryCharge: number;
  driverCharge: number;
  otherCharges: number;
  discount: number;
  customer: { fullName: string };
  vehicle: {
    registrationNumber: string;
    make: string;
    model: string;
  } | null;
}

interface RecordEndingOdometerFormProps {
  rentals: ActiveRentalForEndingOdometer[];
  defaultRentalId?: string;
}

export function RecordEndingOdometerForm({
  rentals,
  defaultRentalId,
}: RecordEndingOdometerFormProps) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EndingOdometerRecordValues>({
    resolver: zodResolver(endingOdometerRecordSchema),
    defaultValues: {
      rentalId: defaultRentalId || "",
      endingOdometer: 0,
      returnDate: today,
      returnTime: getCurrentTimeHHMM(),
    },
  });

  const rentalId = watch("rentalId");
  const endingOdometer = Number(watch("endingOdometer")) || 0;
  const selected = rentals.find((r) => r.id === rentalId);
  const startingOdometer = selected?.startingOdometer ?? null;

  async function onSubmit(data: EndingOdometerRecordValues) {
    const result = await recordEndingOdometer(data);
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
      toast.info(`Balance due: ${formatCurrency(result.data.balance)}. Record payment to complete.`);
    }
    router.push(`/rentals/${data.rentalId}`);
    router.refresh();
  }

  if (rentals.length === 0) {
    return (
      <FormSectionCard title="No active rentals awaiting return" variant="amber">
        <p className="text-sm text-muted-foreground">
          There are no active rentals ready for an ending odometer reading. The vehicle must be
          handed over first.
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/rentals">View rentals</Link>
        </Button>
      </FormSectionCard>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormSectionCard title="Select booking" variant="sky">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Booking number *</Label>
            <Select
              value={rentalId || ""}
              onValueChange={(v) => {
                setValue("rentalId", v, { shouldValidate: true });
                const rental = rentals.find((r) => r.id === v);
                if (rental?.startingOdometer != null) {
                  setValue("endingOdometer", rental.startingOdometer);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an active rental" />
              </SelectTrigger>
              <SelectContent>
                {rentals.map((rental) => (
                  <SelectItem key={rental.id} value={rental.id}>
                    {rental.bookingNumber} — {rental.customer.fullName}
                    {rental.vehicle
                      ? ` (${rental.vehicle.registrationNumber})`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.rentalId && (
              <p className="text-sm text-destructive">{errors.rentalId.message}</p>
            )}
          </div>

          {selected && (
            <div className="rounded-lg border bg-muted/20 p-3 text-sm">
              <p>
                <span className="text-muted-foreground">Customer: </span>
                <span className="font-medium">{selected.customer.fullName}</span>
              </p>
              {selected.vehicle && (
                <p>
                  <span className="text-muted-foreground">Vehicle: </span>
                  <span className="font-medium">
                    {selected.vehicle.registrationNumber} — {selected.vehicle.make}{" "}
                    {selected.vehicle.model}
                  </span>
                </p>
              )}
              {startingOdometer != null && (
                <p>
                  <span className="text-muted-foreground">Starting odometer: </span>
                  <span className="font-semibold text-cyan-700 dark:text-cyan-300">
                    {startingOdometer.toLocaleString()} km
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      </FormSectionCard>

      {selected && (
        <FormSectionCard title="Ending odometer & final bill" variant="cyan">
          <p className="mb-4 text-sm text-muted-foreground">
            Enter the odometer reading when the customer returns the vehicle. The system will
            calculate extra KM charges and the final bill automatically.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="returnDate">Return date *</Label>
              <Input id="returnDate" type="date" {...register("returnDate")} required />
              {errors.returnDate && (
                <p className="text-sm text-destructive">{errors.returnDate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnTime">Return time *</Label>
              <Input id="returnTime" type="time" {...register("returnTime")} required />
              {errors.returnTime && (
                <p className="text-sm text-destructive">{errors.returnTime.message}</p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="endingOdometer">Ending odometer reading (km) *</Label>
              <Input
                id="endingOdometer"
                type="number"
                min={startingOdometer ?? 0}
                step={1}
                className="text-lg font-semibold"
                {...register("endingOdometer")}
              />
              {errors.endingOdometer && (
                <p className="text-sm text-destructive">{errors.endingOdometer.message}</p>
              )}
            </div>
          </div>

          {startingOdometer != null && endingOdometer >= startingOdometer && (
            <div className="mt-4">
              <MileageCalculationPreview
                startingOdometer={startingOdometer}
                endingOdometer={endingOdometer}
                rentalDays={selected.rentalDays}
                includedKmPerDay={selected.includedKm}
                includedKmExtraDay={selected.includedKmExtraDay}
                extraKmRate={selected.extraKmRate}
                dailyRate={selected.dailyRate}
                ratePlanType={selected.ratePlanType}
                deliveryCharge={selected.deliveryCharge}
                driverCharge={selected.driverCharge}
                otherCharges={selected.otherCharges}
                discount={selected.discount}
              />
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !rentalId ||
                startingOdometer == null ||
                endingOdometer < (startingOdometer ?? 0)
              }
            >
              {isSubmitting ? "Calculating..." : "Record ending odometer & calculate final bill"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </FormSectionCard>
      )}
    </form>
  );
}
