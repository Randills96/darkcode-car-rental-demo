import type { UserStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <Badge variant={status === "ACTIVE" ? "success" : "secondary"}>
      {status === "ACTIVE" ? "Active" : "Inactive"}
    </Badge>
  );
}
