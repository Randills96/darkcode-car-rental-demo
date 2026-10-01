"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { settingsFormSchema, type SettingsFormValues } from "@/lib/validations/settings";
import { updateSettings } from "@/app/settings/actions";
import { BrandLogo } from "@/components/brand-logo";

interface SettingsFormProps {
  defaultValues: SettingsFormValues;
  canEdit: boolean;
  canManageAnnualFee?: boolean;
}

export function SettingsForm({ defaultValues, canEdit, canManageAnnualFee = false }: SettingsFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues,
  });

  async function onSubmit(data: SettingsFormValues) {
    const result = await updateSettings(data);
    if (!result.success) {
      toast.error(result.fieldErrors ? Object.values(result.fieldErrors)[0]?.[0] || result.error : result.error);
      return;
    }
    toast.success(result.message);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company & Rental Rules</CardTitle>
          <CardDescription>Core business configuration used across rentals and pricing</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="company_name">Company Name</Label>
            <div className="flex items-center gap-3">
              <BrandLogo size={48} className="rounded-md" />
              <Input id="company_name" {...register("company_name")} disabled={!canEdit} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rental_day_start_time">Rental Day Start Time</Label>
            <Input id="rental_day_start_time" placeholder="19:00" {...register("rental_day_start_time")} disabled={!canEdit} />
            {errors.rental_day_start_time && <p className="text-sm text-destructive">{errors.rental_day_start_time.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="default_included_km">Free KM on day 1</Label>
            <Input id="default_included_km" type="number" {...register("default_included_km")} disabled={!canEdit} />
            <p className="text-xs text-muted-foreground">Default: 200 km per day (can be changed anytime).</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="default_included_km_extra_day">Free KM on each extra day</Label>
            <Input
              id="default_included_km_extra_day"
              type="number"
              {...register("default_included_km_extra_day")}
              disabled={!canEdit}
            />
            <p className="text-xs text-muted-foreground">
              Default: 200 km/day (a 3-day hire is then{" "}
              {Number(watch("default_included_km") || 0) +
                Number(watch("default_included_km_extra_day") || 0) * 2}{" "}
              km free). You can customize this per vehicle or hire.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency Code</Label>
            <Input id="currency" {...register("currency")} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency_symbol">Currency Symbol</Label>
            <Input id="currency_symbol" {...register("currency_symbol")} disabled={!canEdit} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Block Blacklisted Customer Bookings</Label>
            <Select
              value={watch("block_blacklisted_booking")}
              onValueChange={(v) => setValue("block_blacklisted_booking", v as "true" | "false")}
              disabled={!canEdit}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Warn only</SelectItem>
                <SelectItem value="true">Block booking</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commission Defaults</CardTitle>
          <CardDescription>Fixed amounts applied when settlements are auto-generated</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="default_owner_commission">Owner Settlement Commission (Rs.)</Label>
            <Input id="default_owner_commission" type="number" {...register("default_owner_commission")} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="default_broker_commission">Broker Commission (Rs.)</Label>
            <Input id="default_broker_commission" type="number" {...register("default_broker_commission")} disabled={!canEdit} />
          </div>
        </CardContent>
      </Card>

      {canManageAnnualFee && (
      <Card>
        <CardHeader>
          <CardTitle>Annual account fee</CardTitle>
          <CardDescription>
            Manager and Staff accounts deactivate after one year until Super Admin confirms this bank payment.
            Super Admin accounts never expire.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="annual_fee_amount">Annual fee (LKR)</Label>
            <Input id="annual_fee_amount" type="number" {...register("annual_fee_amount")} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank_name">Bank name</Label>
            <Input id="bank_name" {...register("bank_name")} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank_account_name">Account name</Label>
            <Input id="bank_account_name" {...register("bank_account_name")} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank_account_number">Account number</Label>
            <Input id="bank_account_number" {...register("bank_account_number")} disabled={!canEdit} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bank_branch">Branch</Label>
            <Input id="bank_branch" {...register("bank_branch")} disabled={!canEdit} />
          </div>
        </CardContent>
      </Card>
      )}

      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      )}
    </form>
  );
}
