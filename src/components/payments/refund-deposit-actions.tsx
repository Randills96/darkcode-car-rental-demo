import Link from "next/link";
import { Pencil, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RefundDepositActionsProps {
  rentalId: string;
  canRefund: boolean;
  isFullySettled: boolean;
  canEdit: boolean;
  fullWidth?: boolean;
  size?: "default" | "sm";
}

export function RefundDepositActions({
  rentalId,
  canRefund,
  isFullySettled,
  canEdit,
  fullWidth = false,
  size = "default",
}: RefundDepositActionsProps) {
  const href = `/rentals/${rentalId}/refund-deposit`;
  const widthClass = fullWidth ? "w-full" : undefined;

  if (isFullySettled) {
    return (
      <div className={fullWidth ? "flex w-full flex-col gap-2" : "flex flex-wrap items-center gap-2"}>
        <Button size={size} disabled className={widthClass}>
          <Undo2 className="mr-2 h-4 w-4" />
          Refunded
        </Button>
        {canEdit && (
          <Button size={size} variant="outline" className={widthClass} asChild>
            <Link href={`${href}?edit=1`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        )}
      </div>
    );
  }

  if (!canRefund) return null;

  return (
    <Button size={size} className={widthClass} asChild>
      <Link href={href}>
        <Undo2 className="mr-2 h-4 w-4" />
        Refund Deposit
      </Link>
    </Button>
  );
}
