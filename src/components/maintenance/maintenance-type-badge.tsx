import type { MaintenanceType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const TYPE_CONFIG: Record<MaintenanceType, { label: string; variant: "default" | "secondary" | "info" | "warning" }> = {
  OIL_CHANGE: { label: "Oil Change", variant: "info" },
  FULL_SERVICE: { label: "Full Service", variant: "default" },
  BRAKE_SERVICE: { label: "Brake Service", variant: "warning" },
  TYRES: { label: "Tyres", variant: "secondary" },
  BATTERY: { label: "Battery", variant: "secondary" },
  AC_REPAIR: { label: "AC Repair", variant: "info" },
  ENGINE_REPAIR: { label: "Engine Repair", variant: "warning" },
  BODY_REPAIR: { label: "Body Repair", variant: "secondary" },
  ACCIDENT_REPAIR: { label: "Accident Repair", variant: "warning" },
  OTHER: { label: "Other", variant: "secondary" },
};

export function MaintenanceTypeBadge({ type }: { type: MaintenanceType }) {
  const config = TYPE_CONFIG[type];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
