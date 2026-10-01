"use client";

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
import { handoverSchema, type HandoverFormValues } from "@/lib/validations/rental";
import { recordHandover } from "@/app/rentals/actions";
import { openHandoverWhatsApp, reloadAppTab } from "@/components/rentals/handover-whatsapp-dialog";

import { getCurrentTimeHHMM } from "@/lib/utils";

interface HandoverFormProps {
  rentalId: string;
  startingOdometer?: number | null;
  defaultDate?: string;
  embedded?: boolean;
}

export function HandoverForm({
  rentalId,
  startingOdometer,
  defaultDate,
  embedded = false,
}: HandoverFormProps) {
  const today = defaultDate || new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<HandoverFormValues>({
    resolver: zodResolver(handoverSchema),
    defaultValues: {
      handoverDate: today,
      handoverTime: getCurrentTimeHHMM(),
      startingFuelLevel: "FULL",
      vehicleCondition: "",
      existingDamage: "",
      notes: "",
      customerAcknowledged: false,
    },
  });

  async function onSubmit(data: HandoverFormValues) {
    const result = await recordHandover(rentalId, data);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    if (result.data?.whatsapp) {
      openHandoverWhatsApp(result.data.whatsapp);
    }
    reloadAppTab(`/rentals/${rentalId}`);
  }

  const formBody = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {startingOdometer != null ? (
        <div className="rounded-lg border border-cyan-200 bg-cyan-50/40 p-3 text-sm dark:border-cyan-900/50 dark:bg-cyan-950/20">
          <span className="text-muted-foreground">Starting odometer (from rental): </span>
          <span className="font-semibold text-cyan-800 dark:text-cyan-200">
            {startingOdometer.toLocaleString()} km
          </span>
        </div>
      ) : (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Starting odometer is not set on this rental. Edit the rental and enter it before handover.
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="handoverDate">Handover Date *</Label>
          <Input id="handoverDate" type="date" {...register("handoverDate")} required />
          {errors.handoverDate && (
            <p className="text-sm text-destructive">{errors.handoverDate.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="handoverTime">Handover Time *</Label>
          <Input id="handoverTime" type="time" {...register("handoverTime")} required />
          {errors.handoverTime && (
            <p className="text-sm text-destructive">{errors.handoverTime.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Starting Fuel Level *</Label>
          <Select
            value={watch("startingFuelLevel")}
            onValueChange={(v) =>
              setValue("startingFuelLevel", v as HandoverFormValues["startingFuelLevel"])
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
      </div>
      <div className="space-y-2">
        <Label htmlFor="vehicleCondition">Vehicle Condition</Label>
        <Textarea id="vehicleCondition" {...register("vehicleCondition")} rows={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="existingDamage">Existing Damage</Label>
        <Textarea id="existingDamage" {...register("existingDamage")} rows={2} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="customerAcknowledged" {...register("customerAcknowledged")} />
        <Label htmlFor="customerAcknowledged">Customer acknowledged condition</Label>
      </div>
      <Button type="submit" disabled={isSubmitting || startingOdometer == null}>
        {isSubmitting ? "Recording..." : "Record Handover & Activate Rental"}
      </Button>
    </form>
  );

  if (embedded) {
    return (
      <div className="rounded-lg border p-4">
        <p className="mb-4 text-sm font-medium">Step 1 — Vehicle handover (pickup)</p>
        {formBody}
      </div>
    );
  }

  return (
    <FormSectionCard title="Vehicle Handover" variant="cyan">
      {formBody}
    </FormSectionCard>
  );
}
