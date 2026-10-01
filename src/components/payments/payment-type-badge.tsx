import { Badge } from "@/components/ui/badge";
import type { PaymentType } from "@prisma/client";

const TYPE_LABELS: Record<PaymentType, string> = {
  ADVANCE: "Advance",
  RENTAL_PAYMENT: "Rental Payment",
  FINAL_PAYMENT: "Final Payment",
  DAMAGE_PAYMENT: "Damage Payment",
  ADDITIONAL_CHARGE: "Additional Charge",
  SECURITY_DEPOSIT: "Security Deposit",
  SECURITY_DEPOSIT_REFUND: "Deposit Refund",
};

export function PaymentTypeBadge({ type }: { type: PaymentType }) {
  const variant =
    type === "SECURITY_DEPOSIT_REFUND"
      ? "info"
      : type === "SECURITY_DEPOSIT"
        ? "warning"
        : type === "DAMAGE_PAYMENT"
          ? "destructive"
          : "secondary";

  return <Badge variant={variant}>{TYPE_LABELS[type]}</Badge>;
}
