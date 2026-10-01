import type { NotificationSeverity } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const SEVERITY_CONFIG: Record<
  NotificationSeverity,
  { label: string; variant: "info" | "warning" | "destructive" | "secondary" }
> = {
  INFO: { label: "Info", variant: "info" },
  WARNING: { label: "Warning", variant: "warning" },
  CRITICAL: { label: "Critical", variant: "destructive" },
};

export function NotificationSeverityBadge({ severity }: { severity: NotificationSeverity }) {
  const config = SEVERITY_CONFIG[severity];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
