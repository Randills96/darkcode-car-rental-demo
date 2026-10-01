import { Badge } from "@/components/ui/badge";
import type { SettlementStatus } from "@prisma/client";

const STATUS_CONFIG: Record<
  SettlementStatus,
  { label: string; variant: "success" | "warning" | "destructive" | "secondary" }
> = {
  PENDING: { label: "Pending", variant: "destructive" },
  PARTIALLY_PAID: { label: "Partially Paid", variant: "warning" },
  PAID: { label: "Paid", variant: "success" },
};

export function SettlementStatusBadge({ status }: { status: SettlementStatus | string }) {
  const config = STATUS_CONFIG[status as SettlementStatus] ?? {
    label: String(status).replace(/_/g, " "),
    variant: "secondary" as const,
  };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
