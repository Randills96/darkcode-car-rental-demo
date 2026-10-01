"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { vehicleDocumentSchema, type VehicleDocumentFormValues } from "@/lib/validations/vehicle";
import { addVehicleDocument } from "@/app/vehicles/actions";

export function VehicleDocumentDialog({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting } } = useForm<VehicleDocumentFormValues>({
    resolver: zodResolver(vehicleDocumentSchema),
    defaultValues: { documentType: "INSURANCE", documentNumber: "", issueDate: "", expiryDate: "", filePath: "", notes: "" },
  });

  async function onSubmit(data: VehicleDocumentFormValues) {
    const result = await addVehicleDocument(vehicleId, data);
    if (!result.success) { toast.error(result.error); return; }
    toast.success(result.message);
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Document</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Vehicle Document</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={watch("documentType")} onValueChange={(v) => setValue("documentType", v as VehicleDocumentFormValues["documentType"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="INSURANCE">Insurance</SelectItem>
                <SelectItem value="REVENUE_LICENCE">Revenue Licence</SelectItem>
                <SelectItem value="EMISSION_CERTIFICATE">Emission Certificate</SelectItem>
                <SelectItem value="REGISTRATION">Registration</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Document Number</Label><Input {...register("documentNumber")} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Issue Date</Label><Input type="date" {...register("issueDate")} /></div>
            <div className="space-y-2"><Label>Expiry Date</Label><Input type="date" {...register("expiryDate")} /></div>
          </div>
          <div className="space-y-2"><Label>File Reference</Label><Input {...register("filePath")} /></div>
          <div className="space-y-2"><Label>Notes</Label><Textarea {...register("notes")} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Document"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
