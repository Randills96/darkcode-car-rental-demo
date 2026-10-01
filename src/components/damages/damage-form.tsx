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
import { damageFormSchema, type DamageFormValues } from "@/lib/validations/damage";
import { createDamage } from "@/app/damages/actions";

interface DamageFormProps {
  rentals: Array<{
    id: string;
    bookingNumber: string;
    status: string;
    customer: { fullName: string };
    vehicle: { registrationNumber: string; make: string; model: string } | null;
  }>;
  defaultRentalId?: string;
}

const emptyDefaults: DamageFormValues = {
  rentalId: "",
  damageType: "",
  description: "",
  estimatedCost: 0,
  customerCharge: 0,
  damageDate: new Date().toISOString().split("T")[0],
  status: "REPORTED",
  notes: "",
};

export function DamageForm({ rentals, defaultRentalId }: DamageFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DamageFormValues>({
    resolver: zodResolver(damageFormSchema),
    defaultValues: {
      ...emptyDefaults,
      rentalId: defaultRentalId || "",
    },
  });

  async function onSubmit(data: DamageFormValues) {
    const result = await createDamage(data);
    if (!result.success) {
      toast.error(
        result.fieldErrors
          ? Object.values(result.fieldErrors)[0]?.[0] || result.error
          : result.error
      );
      return;
    }
    toast.success(result.message);
    router.push(`/damages/${result.data?.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader><CardTitle>Damage Details</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {!defaultRentalId && (
            <div className="space-y-2">
              <Label>Rental *</Label>
              <Select
                value={watch("rentalId")}
                onValueChange={(value) => setValue("rentalId", value, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select rental" /></SelectTrigger>
                <SelectContent>
                  {rentals.map((rental) => (
                    <SelectItem key={rental.id} value={rental.id}>
                      {rental.bookingNumber} — {rental.customer.fullName}
                      {rental.vehicle ? ` (${rental.vehicle.registrationNumber})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.rentalId && <p className="text-sm text-destructive">{errors.rentalId.message}</p>}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="damageType">Damage Type *</Label>
              <Input id="damageType" {...register("damageType")} placeholder="Scratch, Dent, etc." />
              {errors.damageType && <p className="text-sm text-destructive">{errors.damageType.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="damageDate">Damage Date *</Label>
              <Input id="damageDate" type="date" {...register("damageDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedCost">Estimated Cost (Rs.)</Label>
              <Input id="estimatedCost" type="number" step="0.01" {...register("estimatedCost")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerCharge">Customer Charge (Rs.)</Label>
              <Input id="customerCharge" type="number" step="0.01" {...register("customerCharge")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea id="description" {...register("description")} rows={4} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} rows={2} />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Record Damage"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
