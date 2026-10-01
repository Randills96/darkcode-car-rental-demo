import { Badge } from "@/components/ui/badge";
import type { VehicleStatus } from "@prisma/client";

const statusConfig: Record<
  VehicleStatus,
  { label: string; variant: "success" | "warning" | "info" | "destructive" | "secondary" | "outline" }
> = {
  AVAILABLE: { label: "Available", variant: "success" },
  RESERVED: { label: "Reserved", variant: "warning" },
  RENTED: { label: "Rented", variant: "info" },
  MAINTENANCE: { label: "Maintenance", variant: "warning" },
  UNAVAILABLE: { label: "Unavailable", variant: "secondary" },
  INACTIVE: { label: "Inactive", variant: "outline" },
};

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function OwnershipTypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    COMPANY_OWNED: "Company Owned",
    PERSONALLY_OWNED: "Personally Owned",
    THIRD_PARTY_OWNED: "Third Party",
  };
  return <Badge variant="outline">{labels[type] || type}</Badge>;
}
