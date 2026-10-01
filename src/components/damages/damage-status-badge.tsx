import { Badge } from "@/components/ui/badge";
import type { DamageStatus, DamagePaymentStatus } from "@prisma/client";

const STATUS_CONFIG: Record<DamageStatus, { label: string; variant: "success" | "warning" | "destructive" | "secondary" | "info" }> = {
  REPORTED: { label: "Reported", variant: "warning" },
  ASSESSED: { label: "Assessed", variant: "info" },
  CHARGED: { label: "Charged", variant: "secondary" },
  RESOLVED: { label: "Resolved", variant: "success" },
};

const PAYMENT_CONFIG: Record<DamagePaymentStatus, { label: string; variant: "success" | "warning" | "destructive" }> = {
  UNPAID: { label: "Unpaid", variant: "destructive" },
  PARTIALLY_PAID: { label: "Partially Paid", variant: "warning" },
  PAID: { label: "Paid", variant: "success" },
};

export function DamageStatusBadge({ status }: { status: DamageStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function DamagePaymentBadge({ status }: { status: DamagePaymentStatus }) {
  const config = PAYMENT_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
