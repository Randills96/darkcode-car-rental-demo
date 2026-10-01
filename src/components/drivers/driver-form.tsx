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
import { driverFormSchema, type DriverFormValues } from "@/lib/validations/driver";
import { createDriver, updateDriver } from "@/app/drivers/actions";
import { decimalToNumber, toDateInputValue } from "@/lib/utils";

interface DriverFormProps {
  mode: "create" | "edit";
  driverId?: string;
  defaultValues?: Partial<DriverFormValues>;
}

const emptyDefaults: DriverFormValues = {
  name: "",
  nic: "",
  phone: "",
  whatsapp: "",
  address: "",
  drivingLicence: "",
  licenceExpiry: "",
  dailyPayment: 0,
  status: "ACTIVE",
  notes: "",
};

export function DriverForm({ mode, driverId, defaultValues }: DriverFormProps) {
  const router = useRouter();
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<DriverFormValues>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: { ...emptyDefaults, ...defaultValues },
  });

  async function onSubmit(data: DriverFormValues) {
    const result = mode === "create" ? await createDriver(data) : await updateDriver(driverId!, data);
    if (!result.success) { toast.error(result.error); return; }
    toast.success(result.message);
    router.push(mode === "create" ? `/drivers/${result.data?.id}` : `/drivers/${driverId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader><CardTitle>Driver Information</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nic">NIC *</Label>
              <Input id="nic" {...register("nic")} />
              {errors.nic && <p className="text-sm text-destructive">{errors.nic.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" {...register("phone")} placeholder="0711234567" />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" {...register("whatsapp")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drivingLicence">Driving Licence *</Label>
              <Input id="drivingLicence" {...register("drivingLicence")} />
              {errors.drivingLicence && <p className="text-sm text-destructive">{errors.drivingLicence.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenceExpiry">Licence Expiry *</Label>
              <Input id="licenceExpiry" type="date" {...register("licenceExpiry")} />
              {errors.licenceExpiry && <p className="text-sm text-destructive">{errors.licenceExpiry.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailyPayment">Daily Payment (Rs.) *</Label>
              <Input id="dailyPayment" type="number" step="0.01" {...register("dailyPayment")} />
              {errors.dailyPayment && <p className="text-sm text-destructive">{errors.dailyPayment.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v as "ACTIVE" | "INACTIVE")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" {...register("address")} rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} rows={3} />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : mode === "create" ? "Create Driver" : "Save Changes"}</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

export { driverToFormValues } from "@/lib/mappers/driver";
