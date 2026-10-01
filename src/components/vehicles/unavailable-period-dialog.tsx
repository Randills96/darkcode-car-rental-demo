"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { unavailablePeriodSchema, type UnavailablePeriodFormValues } from "@/lib/validations/vehicle";
import { addUnavailablePeriod } from "@/app/vehicles/actions";

export function UnavailablePeriodDialog({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<UnavailablePeriodFormValues>({
    resolver: zodResolver(unavailablePeriodSchema),
    defaultValues: { startDate: "", endDate: "", reason: "" },
  });

  async function onSubmit(data: UnavailablePeriodFormValues) {
    const result = await addUnavailablePeriod(vehicleId, data);
    if (!result.success) { toast.error(result.error); return; }
    toast.success(result.message);
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><CalendarOff className="h-4 w-4 mr-2" />Mark Unavailable</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Unavailable Period</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Start Date *</Label><Input type="date" {...register("startDate")} /></div>
            <div className="space-y-2"><Label>End Date *</Label><Input type="date" {...register("endDate")} /></div>
          </div>
          {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
          <div className="space-y-2"><Label>Reason</Label><Textarea {...register("reason")} rows={2} placeholder="Maintenance, repair, owner use..." /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Add Period"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
