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
import { brokerFormSchema, type BrokerFormValues } from "@/lib/validations/broker";
import { createBroker, updateBroker } from "@/app/brokers/actions";

interface BrokerFormProps {
  mode: "create" | "edit";
  brokerId?: string;
  defaultValues?: Partial<BrokerFormValues>;
}

const emptyDefaults: BrokerFormValues = {
  name: "",
  nic: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  notes: "",
  defaultCommissionPerDay: 0,
  defaultCommissionPerExtraKm: 0,
  status: "ACTIVE",
};

export function BrokerForm({ mode, brokerId, defaultValues }: BrokerFormProps) {
  const router = useRouter();
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<BrokerFormValues>({
    resolver: zodResolver(brokerFormSchema),
    defaultValues: { ...emptyDefaults, ...defaultValues },
  });

  async function onSubmit(data: BrokerFormValues) {
    const result = mode === "create" ? await createBroker(data) : await updateBroker(brokerId!, data);
    if (!result.success) { toast.error(result.error); return; }
    toast.success(result.message);
    router.push(mode === "create" ? `/brokers/${result.data?.id}` : `/brokers/${brokerId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader><CardTitle>Broker Details</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2"><Label htmlFor="nic">NIC</Label><Input id="nic" {...register("nic")} /></div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" {...register("phone")} placeholder="0111234567" />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-2"><Label htmlFor="whatsapp">WhatsApp</Label><Input id="whatsapp" {...register("whatsapp")} /></div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="broker@example.com" />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultCommissionPerDay">Default commission per day (LKR)</Label>
              <Input
                id="defaultCommissionPerDay"
                type="number"
                step="0.01"
                {...register("defaultCommissionPerDay")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultCommissionPerExtraKm">Default commission per extra km (LKR)</Label>
              <Input
                id="defaultCommissionPerExtraKm"
                type="number"
                step="0.01"
                {...register("defaultCommissionPerExtraKm")}
              />
            </div>
            <p className="sm:col-span-2 text-xs text-muted-foreground">
              Applied automatically when this broker is selected on a rental (you can override per booking).
            </p>
          </div>
          <div className="space-y-2"><Label htmlFor="address">Address</Label><Textarea id="address" {...register("address")} rows={2} /></div>
          <div className="space-y-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" {...register("notes")} rows={3} /></div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : mode === "create" ? "Create Broker" : "Save Changes"}</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
