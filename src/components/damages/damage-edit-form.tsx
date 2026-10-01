"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Link from "next/link";
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
import { damageUpdateSchema, type DamageUpdateValues } from "@/lib/validations/damage";
import { updateDamage } from "@/app/damages/actions";
import type { DamageDetailClient } from "@/lib/services/damage";

interface DamageEditFormProps {
  damage: DamageDetailClient;
}

export function damageToEditValues(damage: DamageDetailClient): DamageUpdateValues {
  return {
    damageType: damage.damageType,
    description: damage.description,
    estimatedCost: damage.estimatedCost,
    customerCharge: damage.customerCharge,
    damageDate: damage.damageDate.split("T")[0],
    status: damage.status,
    notes: damage.notes || "",
  };
}

export function DamageEditForm({ damage }: DamageEditFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DamageUpdateValues>({
    resolver: zodResolver(damageUpdateSchema),
    defaultValues: damageToEditValues(damage),
  });

  const status = watch("status") ?? damage.status;

  async function onSubmit(data: DamageUpdateValues) {
    const result = await updateDamage(damage.id, data);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    router.push(`/damages/${damage.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Edit Damage — {damage.damageCode}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <p className="font-medium">Linked rental</p>
            <p className="text-muted-foreground">
              <Link href={`/rentals/${damage.rental.id}`} className="text-primary hover:underline">
                {damage.rental.bookingNumber}
              </Link>
              {" · "}
              {damage.customer.fullName}
              {" · "}
              {damage.vehicle.registrationNumber}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="damageType">Damage Type *</Label>
              <Input id="damageType" {...register("damageType")} placeholder="Scratch, Dent, etc." />
              {errors.damageType && <p className="text-sm text-destructive">{errors.damageType.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="damageDate">Damage Date *</Label>
              <Input id="damageDate" type="date" {...register("damageDate")} />
              {errors.damageDate && <p className="text-sm text-destructive">{errors.damageDate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedCost">Estimated Cost (Rs.)</Label>
              <Input id="estimatedCost" type="number" step="0.01" {...register("estimatedCost")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerCharge">Customer Charge (Rs.)</Label>
              <Input id="customerCharge" type="number" step="0.01" {...register("customerCharge")} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setValue("status", value as DamageUpdateValues["status"], { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="REPORTED">Reported</SelectItem>
                  <SelectItem value="ASSESSED">Assessed</SelectItem>
                  <SelectItem value="CHARGED">Charged</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                </SelectContent>
              </Select>
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
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
