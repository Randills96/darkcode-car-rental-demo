"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  quoteRental,
  confirmRental,
  cancelRental,
  completeRental,
} from "@/app/rentals/actions";
import type { RentalStatus } from "@prisma/client";

interface RentalWorkflowActionsProps {
  rentalId: string;
  status: RentalStatus;
  hasVehicle: boolean;
  hasHandover: boolean;
  hasReturn: boolean;
  canEdit: boolean;
  canCancel: boolean;
}

export function RentalWorkflowActions({
  rentalId,
  status,
  hasVehicle,
  hasHandover,
  hasReturn,
  canEdit,
  canCancel,
}: RentalWorkflowActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function runAction(action: string, fn: () => Promise<{ success: boolean; error?: string; message?: string }>) {
    if (loading !== null) return;
    setLoading(action);
    try {
      const result = await fn();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  if (!canEdit && !canCancel) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {canEdit && status === "INQUIRY" && (
        <Button
          size="sm"
          disabled={loading !== null}
          onClick={() => runAction("quote", () => quoteRental(rentalId))}
        >
          {loading === "quote" ? "..." : "Mark as Quoted"}
        </Button>
      )}
      {canEdit && status === "QUOTED" && (
        <Button
          size="sm"
          disabled={loading !== null || !hasVehicle}
          onClick={() => runAction("confirm", () => confirmRental(rentalId))}
        >
          {loading === "confirm" ? "..." : "Confirm Rental"}
        </Button>
      )}
      {canEdit && status === "RETURNED" && (
        <>
          <Button
            size="sm"
            disabled={loading !== null}
            onClick={() => runAction("complete", () => completeRental(rentalId))}
          >
            {loading === "complete" ? "..." : "Complete Rental"}
          </Button>
          <p className="text-xs text-muted-foreground self-center">
            Recording cash received also completes the hire.
          </p>
        </>
      )}
      {canCancel && !["COMPLETED", "CANCELLED"].includes(status) && (
        <Button
          size="sm"
          variant="destructive"
          disabled={loading !== null}
          onClick={() => {
            if (confirm("Cancel this rental? This cannot be undone.")) {
              runAction("cancel", () => cancelRental(rentalId));
            }
          }}
        >
          {loading === "cancel" ? "..." : "Cancel Rental"}
        </Button>
      )}
      {status === "CONFIRMED" && !hasHandover && (
        <p className="text-xs text-muted-foreground self-center">
          Record handover below to activate rental.
        </p>
      )}
      {status === "ACTIVE" && !hasReturn && (
        <p className="text-xs text-muted-foreground self-center">
          Record return below when vehicle is back.
        </p>
      )}
    </div>
  );
}
