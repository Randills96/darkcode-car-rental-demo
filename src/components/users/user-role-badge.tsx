import type { UserRole } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const ROLE_CONFIG: Record<UserRole, { label: string; variant: "default" | "secondary" | "info" | "warning" }> = {
  SUPER_ADMIN: { label: "Super Admin", variant: "default" },
  ADMIN: { label: "Admin", variant: "info" },
  EMPLOYEE: { label: "Employee", variant: "secondary" },
  DRIVER: { label: "Driver", variant: "warning" },
};

export function UserRoleBadge({ role }: { role: UserRole }) {
  const config = ROLE_CONFIG[role];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
