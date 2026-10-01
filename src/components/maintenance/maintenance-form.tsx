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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { maintenanceFormSchema, type MaintenanceFormValues } from "@/lib/validations/maintenance";
import { createMaintenance } from "@/app/maintenance/actions";
import { MAINTENANCE_TYPES } from "@/components/maintenance/maintenance-filters";

interface MaintenanceFormProps {
  vehicles: Array<{
    id: string;
    registrationNumber: string;
    make: string;
    model: string;
    currentOdometer: number;
  }>;
  defaultVehicleId?: string;
}

export function MaintenanceForm({ vehicles, defaultVehicleId }: MaintenanceFormProps) {
  const router = useRouter();
  const selectedVehicle = vehicles.find((v) => v.id === defaultVehicleId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      vehicleId: defaultVehicleId || "",
      maintenanceType: "FULL_SERVICE",
      date: new Date().toISOString().split("T")[0],
      odometer: selectedVehicle?.currentOdometer ?? 0,
      description: "",
      serviceProvider: "",
      cost: 0,
      nextServiceDate: "",
      nextServiceKm: "",
      notes: "",
    },
  });

  async function onSubmit(data: MaintenanceFormValues) {
    const result = await createMaintenance(data);
    if (!result.success) {
      toast.error(result.fieldErrors ? Object.values(result.fieldErrors)[0]?.[0] || result.error : result.error);
      return;
    }
    toast.success(result.message);
    router.push(`/maintenance/${result.data?.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader><CardTitle>Maintenance Record</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {!defaultVehicleId && (
            <div className="space-y-2">
              <Label>Vehicle *</Label>
              <Select
                value={watch("vehicleId")}
                onValueChange={(v) => {
                  setValue("vehicleId", v, { shouldValidate: true });
                  const vehicle = vehicles.find((item) => item.id === v);
                  if (vehicle) setValue("odometer", vehicle.currentOdometer);
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registrationNumber} — {v.make} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.vehicleId && <p className="text-sm text-destructive">{errors.vehicleId.message}</p>}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Maintenance Type *</Label>
              <Select
                value={watch("maintenanceType")}
                onValueChange={(v) => setValue("maintenanceType", v as MaintenanceFormValues["maintenanceType"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Service Date *</Label>
              <Input id="date" type="date" {...register("date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="odometer">Odometer (km)</Label>
              <Input id="odometer" type="number" {...register("odometer")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost (Rs.)</Label>
              <Input id="cost" type="number" step="0.01" {...register("cost")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="serviceProvider">Service Provider</Label>
              <Input id="serviceProvider" {...register("serviceProvider")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea id="description" {...register("description")} rows={3} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="nextServiceDate">Next Service Date</Label>
              <Input id="nextServiceDate" type="date" {...register("nextServiceDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextServiceKm">Next Service KM</Label>
              <Input id="nextServiceKm" type="number" {...register("nextServiceKm")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} rows={2} />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Record"}</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
