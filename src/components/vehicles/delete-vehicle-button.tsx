"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteVehicle, deleteVehicleDocument, deleteUnavailablePeriod } from "@/app/vehicles/actions";

export function DeleteVehicleButton({ vehicleId, regNumber }: { vehicleId: string; regNumber: string }) {
  const router = useRouter();
  async function handleDelete() {
    const result = await deleteVehicle(vehicleId);
    if (!result.success) { toast.error(result.error); return; }
    toast.success(result.message);
    router.push("/vehicles");
    router.refresh();
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" />Delete</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
          <AlertDialogDescription>Delete {regNumber}? Only allowed if no active rentals.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeleteVehicleDocumentButton({ documentId, vehicleId }: { documentId: string; vehicleId: string }) {
  const router = useRouter();
  async function handleDelete() {
    const result = await deleteVehicleDocument(documentId, vehicleId);
    if (!result.success) { toast.error(result.error); return; }
    toast.success(result.message);
    router.refresh();
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Delete Document</AlertDialogTitle><AlertDialogDescription>Remove this document record?</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeleteUnavailablePeriodButton({ periodId, vehicleId }: { periodId: string; vehicleId: string }) {
  const router = useRouter();
  async function handleDelete() {
    const result = await deleteUnavailablePeriod(periodId, vehicleId);
    if (!result.success) { toast.error(result.error); return; }
    toast.success(result.message);
    router.refresh();
  }
  return (
    <Button variant="ghost" size="sm" className="text-destructive" onClick={handleDelete}>Remove</Button>
  );
}
