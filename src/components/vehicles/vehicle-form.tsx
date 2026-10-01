"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { vehicleFormSchema, type VehicleFormValues } from "@/lib/validations/vehicle";
import { createVehicle, updateVehicle } from "@/app/vehicles/actions";
import { decimalToNumber, formatCurrency, toDateInputValue } from "@/lib/utils";
import { exampleIncludedKmPolicy } from "@/lib/services/included-km";
import { useCurrencySymbol } from "@/components/currency-provider";

interface VehicleFormProps {
  mode: "create" | "edit";
  vehicleId?: string;
  defaultValues?: Partial<VehicleFormValues>;
  owners: Array<{ id: string; name: string; ownerCode: string }>;
}

const emptyDefaults: VehicleFormValues = {
  registrationNumber: "",
  vehicleType: "CAR",
  make: "",
  model: "",
  year: new Date().getFullYear(),
  colour: "",
  fuelType: "PETROL",
  transmission: "AUTOMATIC",
  seatingCapacity: 4,
  currentOdometer: 0,
  dailyRate: 0,
  includedKm: 200,
  includedKmExtraDay: 200,
  extraKmRate: 0,
  ownerDailyRate: "",
  ownerExtraKmRate: "",
  weeklyRate: "",
  monthlyRate: "",
  ownershipType: "COMPANY_OWNED",
  ownerId: "",
  status: "AVAILABLE",
  notes: "",
  insurancePolicyNumber: "",
  insuranceExpiryDate: "",
  revenueLicenceNumber: "",
  revenueLicenceExpiryDate: "",
};

export function VehicleForm({ mode, vehicleId, defaultValues, owners }: VehicleFormProps) {
  const router = useRouter();
  const currencySymbol = useCurrencySymbol();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: { ...emptyDefaults, ...defaultValues },
  });

  const ownershipType = watch("ownershipType");
  const ownerId = watch("ownerId");
  const customerDailyRate = Number(watch("dailyRate") || 0);
  const customerExtraKmRate = Number(watch("extraKmRate") || 0);
  const ownerDaily = Number(watch("ownerDailyRate") || 0);
  const ownerExtra = Number(watch("ownerExtraKmRate") || 0);
  const needsOwner = ownershipType !== "COMPANY_OWNED" || Boolean(ownerId);
  const dailyMargin = customerDailyRate - ownerDaily;
  const extraKmMargin = customerExtraKmRate - ownerExtra;

  async function onSubmit(data: VehicleFormValues) {
    const result =
      mode === "create" ? await createVehicle(data) : await updateVehicle(vehicleId!, data);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    router.push(mode === "create" ? `/vehicles/${result.data?.id}` : `/vehicles/${vehicleId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Vehicle Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="registrationNumber">Registration Number *</Label>
            <Input id="registrationNumber" {...register("registrationNumber")} placeholder="CAB-1234" />
            {errors.registrationNumber && <p className="text-sm text-destructive">{errors.registrationNumber.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Vehicle Type</Label>
            <Select value={watch("vehicleType")} onValueChange={(v) => setValue("vehicleType", v as VehicleFormValues["vehicleType"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CAR">Car</SelectItem>
                <SelectItem value="SUV">SUV</SelectItem>
                <SelectItem value="VAN">Van</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={watch("status")} onValueChange={(v) => setValue("status", v as VehicleFormValues["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="RESERVED">Reserved</SelectItem>
                <SelectItem value="RENTED">Rented</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="make">Make *</Label><Input id="make" {...register("make")} /></div>
          <div className="space-y-2"><Label htmlFor="model">Model *</Label><Input id="model" {...register("model")} /></div>
          <div className="space-y-2"><Label htmlFor="year">Year *</Label><Input id="year" type="number" {...register("year")} /></div>
          <div className="space-y-2"><Label htmlFor="colour">Colour *</Label><Input id="colour" {...register("colour")} /></div>
          <div className="space-y-2">
            <Label>Fuel Type</Label>
            <Select value={watch("fuelType")} onValueChange={(v) => setValue("fuelType", v as VehicleFormValues["fuelType"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PETROL">Petrol</SelectItem>
                <SelectItem value="DIESEL">Diesel</SelectItem>
                <SelectItem value="HYBRID">Hybrid</SelectItem>
                <SelectItem value="ELECTRIC">Electric</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Transmission</Label>
            <Select value={watch("transmission")} onValueChange={(v) => setValue("transmission", v as VehicleFormValues["transmission"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AUTOMATIC">Automatic</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="seatingCapacity">Seating</Label><Input id="seatingCapacity" type="number" {...register("seatingCapacity")} /></div>
          <div className="space-y-2"><Label htmlFor="currentOdometer">Current Odometer (KM)</Label><Input id="currentOdometer" type="number" {...register("currentOdometer")} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Rates & Ownership</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Ownership Type</Label>
            <Select value={ownershipType} onValueChange={(v) => setValue("ownershipType", v as VehicleFormValues["ownershipType"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPANY_OWNED">Company Owned</SelectItem>
                <SelectItem value="PERSONALLY_OWNED">Personally Owned</SelectItem>
                <SelectItem value="THIRD_PARTY_OWNED">Third Party Owned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Owner {needsOwner ? "*" : "(optional)"}</Label>
            <Select value={ownerId || "NONE"} onValueChange={(v) => setValue("ownerId", v === "NONE" ? "" : v, { shouldValidate: true })}>
              <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None</SelectItem>
                {owners.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.ownerCode} — {o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.ownerId && <p className="text-sm text-destructive">{errors.ownerId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dailyRate">Customer daily rate ({currencySymbol}) *</Label>
            <Input id="dailyRate" type="number" step="0.01" {...register("dailyRate")} />
            {errors.dailyRate && <p className="text-sm text-destructive">{errors.dailyRate.message}</p>}
            <p className="text-xs text-muted-foreground">Income when this car is hired.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="includedKm">Free KM on day 1</Label>
            <Input id="includedKm" type="number" {...register("includedKm")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="includedKmExtraDay">Free KM on each extra day</Label>
            <Input id="includedKmExtraDay" type="number" {...register("includedKmExtraDay")} />
            <p className="text-xs text-muted-foreground">
              {exampleIncludedKmPolicy(
                Number(watch("includedKm") || 0),
                Number(watch("includedKmExtraDay") || 0)
              )}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="extraKmRate">Customer extra km rate ({currencySymbol}) *</Label>
            <Input id="extraKmRate" type="number" step="0.01" {...register("extraKmRate")} />
            {errors.extraKmRate && <p className="text-sm text-destructive">{errors.extraKmRate.message}</p>}
          </div>
          {needsOwner && (
            <>
              <div className="space-y-2">
                <Label htmlFor="ownerDailyRate">Owner daily rate ({currencySymbol}) *</Label>
                <Input id="ownerDailyRate" type="number" step="0.01" {...register("ownerDailyRate")} />
                {errors.ownerDailyRate && <p className="text-sm text-destructive">{errors.ownerDailyRate.message}</p>}
                <p className="text-xs text-muted-foreground">Expense paid to the owner per hire day.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerExtraKmRate">Owner extra km rate ({currencySymbol}) *</Label>
                <Input id="ownerExtraKmRate" type="number" step="0.01" {...register("ownerExtraKmRate")} />
                {errors.ownerExtraKmRate && <p className="text-sm text-destructive">{errors.ownerExtraKmRate.message}</p>}
              </div>
              <div className="rounded-lg border bg-muted/40 p-3 text-sm sm:col-span-1">
                <p className="font-medium">Your margin</p>
                <p>Daily: {formatCurrency(dailyMargin)}</p>
                <p>Extra km: {formatCurrency(extraKmMargin)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Customer rate is income. Owner rate is expense. Margin is profit.
                </p>
              </div>
            </>
          )}
          <div className="space-y-2"><Label htmlFor="weeklyRate">Weekly Rate ({currencySymbol})</Label><Input id="weeklyRate" type="number" step="0.01" {...register("weeklyRate")} /></div>
          <div className="space-y-2"><Label htmlFor="monthlyRate">Monthly Rate ({currencySymbol})</Label><Input id="monthlyRate" type="number" step="0.01" {...register("monthlyRate")} /></div>
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Vehicle Documents & Expiry</CardTitle>
          <p className="text-sm text-muted-foreground">
            Insurance and Revenue Licence records. Expiry dates are monitored and 21-day advance alerts are automatically dispatched.
          </p>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          {/* Insurance */}
          <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
            <div className="border-b pb-2">
              <h4 className="font-medium text-sm text-primary">Insurance Policy</h4>
            </div>
            <div className="space-y-2">
              <Label htmlFor="insurancePolicyNumber">Policy / Certificate Number</Label>
              <Input
                id="insurancePolicyNumber"
                placeholder="e.g. POL-123456"
                {...register("insurancePolicyNumber")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="insuranceExpiryDate">Expiry Date</Label>
              <Input
                id="insuranceExpiryDate"
                type="date"
                {...register("insuranceExpiryDate")}
              />
            </div>
          </div>

          {/* Revenue Licence */}
          <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
            <div className="border-b pb-2">
              <h4 className="font-medium text-sm text-primary">Revenue Licence</h4>
            </div>
            <div className="space-y-2">
              <Label htmlFor="revenueLicenceNumber">Licence Number</Label>
              <Input
                id="revenueLicenceNumber"
                placeholder="e.g. REV-789012"
                {...register("revenueLicenceNumber")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="revenueLicenceExpiryDate">Expiry Date</Label>
              <Input
                id="revenueLicenceExpiryDate"
                type="date"
                {...register("revenueLicenceExpiryDate")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : mode === "create" ? "Create Vehicle" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

export { vehicleToFormValues } from "@/lib/mappers/vehicle";
