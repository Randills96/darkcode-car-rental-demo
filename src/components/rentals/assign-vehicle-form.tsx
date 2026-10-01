"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignVehicleSchema } from "@/lib/validations/rental";
import { assignVehicleToRental } from "@/app/rentals/actions";
import { z } from "zod";

const schema = assignVehicleSchema;
type FormValues = z.infer<typeof schema>;

interface AssignVehicleFormProps {
  rentalId: string;
  vehicles: Array<{ id: string; registrationNumber: string; make: string; model: string }>;
  currentVehicleId?: string | null;
}

export function AssignVehicleForm({ rentalId, vehicles, currentVehicleId }: AssignVehicleFormProps) {
  const router = useRouter();
  const {
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { vehicleId: currentVehicleId || "" },
  });

  async function onSubmit(data: FormValues) {
    const result = await assignVehicleToRental(rentalId, data.vehicleId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader><CardTitle>Assign Vehicle</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-2">
            <Label>Vehicle</Label>
            <Select
              value={watch("vehicleId")}
              onValueChange={(v) => setValue("vehicleId", v, { shouldValidate: true })}
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
          </div>
          <Button type="submit" disabled={isSubmitting} className="self-end">
            {isSubmitting ? "Assigning..." : "Assign"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
