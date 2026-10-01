import { Badge } from "@/components/ui/badge";
import type { CustomerStatus } from "@prisma/client";

interface CustomerStatusBadgeProps {
  status: CustomerStatus;
}

export function CustomerStatusBadge({ status }: CustomerStatusBadgeProps) {
  if (status === "BLACKLISTED") {
    return <Badge variant="destructive">Blacklisted</Badge>;
  }
  return <Badge variant="success">Normal</Badge>;
}
