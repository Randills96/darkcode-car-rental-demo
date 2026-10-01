import type { AuditAction } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const ACTION_CONFIG: Record<AuditAction, { variant: "default" | "secondary" | "destructive" | "success" | "info" | "warning" }> = {
  CREATE: { variant: "success" },
  UPDATE: { variant: "info" },
  DELETE: { variant: "destructive" },
  BLACKLIST: { variant: "warning" },
  PAYMENT: { variant: "default" },
  SETTLEMENT: { variant: "secondary" },
  ASSIGN: { variant: "info" },
  STATUS_CHANGE: { variant: "warning" },
};

export function AuditActionBadge({ action }: { action: AuditAction }) {
  return <Badge variant={ACTION_CONFIG[action].variant}>{action}</Badge>;
}
