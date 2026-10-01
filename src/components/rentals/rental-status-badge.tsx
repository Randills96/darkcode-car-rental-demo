import { Badge } from "@/components/ui/badge";
import type { RentalStatus } from "@prisma/client";

const STATUS_CONFIG: Record<
  RentalStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }
> = {
  INQUIRY: { label: "Inquiry", variant: "secondary" },
  QUOTED: { label: "Quoted", variant: "info" },
  CONFIRMED: { label: "Confirmed", variant: "warning" },
  ACTIVE: { label: "Active", variant: "success" },
  RETURNED: { label: "Returned", variant: "info" },
  COMPLETED: { label: "Completed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

interface RentalStatusBadgeProps {
  status: RentalStatus;
}

export function RentalStatusBadge({ status }: RentalStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
