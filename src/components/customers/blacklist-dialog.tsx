"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Ban, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  blacklistSchema,
  removeBlacklistSchema,
  type BlacklistFormValues,
  type RemoveBlacklistFormValues,
} from "@/lib/validations/customer";
import { blacklistCustomer, removeBlacklist } from "@/app/customers/actions";
import type { CustomerStatus } from "@prisma/client";

interface BlacklistDialogProps {
  customerId: string;
  customerName: string;
  status: CustomerStatus;
  canManage: boolean;
}

export function BlacklistDialog({
  customerId,
  customerName,
  status,
  canManage,
}: BlacklistDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isBlacklisted = status === "BLACKLISTED";

  const blacklistForm = useForm<BlacklistFormValues>({
    resolver: zodResolver(blacklistSchema),
    defaultValues: { reason: "", notes: "" },
  });

  const removeForm = useForm<RemoveBlacklistFormValues>({
    resolver: zodResolver(removeBlacklistSchema),
    defaultValues: { notes: "" },
  });

  if (!canManage) return null;

  async function onBlacklist(data: BlacklistFormValues) {
    const result = await blacklistCustomer(customerId, data);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    setOpen(false);
    blacklistForm.reset();
    router.refresh();
  }

  async function onRemove(data: RemoveBlacklistFormValues) {
    const result = await removeBlacklist(customerId, data);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    setOpen(false);
    removeForm.reset();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isBlacklisted ? (
          <Button variant="outline" size="sm">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Remove Blacklist
          </Button>
        ) : (
          <Button variant="destructive" size="sm">
            <Ban className="h-4 w-4 mr-2" />
            Blacklist Customer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isBlacklisted ? "Remove Blacklist" : "Blacklist Customer"}
          </DialogTitle>
          <DialogDescription>
            {isBlacklisted
              ? `Remove blacklist status from ${customerName}.`
              : `Mark ${customerName} as blacklisted. This will show a warning when creating rentals.`}
          </DialogDescription>
        </DialogHeader>

        {isBlacklisted ? (
          <form onSubmit={removeForm.handleSubmit(onRemove)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="removeNotes">Notes</Label>
              <Textarea
                id="removeNotes"
                {...removeForm.register("notes")}
                placeholder="Reason for removing blacklist..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={removeForm.formState.isSubmitting}>
                {removeForm.formState.isSubmitting ? "Processing..." : "Remove Blacklist"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={blacklistForm.handleSubmit(onBlacklist)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                {...blacklistForm.register("reason")}
                placeholder="Reason for blacklisting..."
                rows={3}
              />
              {blacklistForm.formState.errors.reason && (
                <p className="text-sm text-destructive">
                  {blacklistForm.formState.errors.reason.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...blacklistForm.register("notes")} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={blacklistForm.formState.isSubmitting}
              >
                {blacklistForm.formState.isSubmitting ? "Processing..." : "Confirm Blacklist"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
