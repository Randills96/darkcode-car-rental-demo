import { UserRole } from "@prisma/client";

export type Permission =
  | "dashboard.view"
  | "customers.view"
  | "customers.create"
  | "customers.edit"
  | "customers.delete"
  | "customers.blacklist"
  | "vehicles.view"
  | "vehicles.create"
  | "vehicles.edit"
  | "vehicles.delete"
  | "owners.view"
  | "owners.create"
  | "owners.edit"
  | "drivers.view"
  | "drivers.create"
  | "drivers.edit"
  | "brokers.view"
  | "brokers.create"
  | "brokers.edit"
  | "rentals.view"
  | "rentals.create"
  | "rentals.edit"
  | "rentals.cancel"
  | "rentals.handover"
  | "rentals.return"
  | "rentals.receipt"
  | "payments.view"
  | "payments.create"
  | "payments.edit"
  | "damages.view"
  | "damages.create"
  | "damages.edit"
  | "settlements.view"
  | "settlements.create"
  | "maintenance.view"
  | "maintenance.create"
  | "expenses.view"
  | "expenses.create"
  | "expenses.edit"
  | "expenses.delete"
  | "reports.view"
  | "reports.export"
  | "notifications.view"
  | "audit.view"
  | "settings.view"
  | "settings.edit"
  | "users.view"
  | "users.create"
  | "users.edit";

const ALL_PERMISSIONS: Permission[] = [
  "dashboard.view",
  "customers.view", "customers.create", "customers.edit", "customers.delete", "customers.blacklist",
  "vehicles.view", "vehicles.create", "vehicles.edit", "vehicles.delete",
  "owners.view", "owners.create", "owners.edit",
  "drivers.view", "drivers.create", "drivers.edit",
  "brokers.view", "brokers.create", "brokers.edit",
  "rentals.view", "rentals.create", "rentals.edit", "rentals.cancel", "rentals.handover", "rentals.return", "rentals.receipt",
  "payments.view", "payments.create", "payments.edit",
  "damages.view", "damages.create", "damages.edit",
  "settlements.view", "settlements.create",
  "maintenance.view", "maintenance.create",
  "expenses.view", "expenses.create", "expenses.edit", "expenses.delete",
  "reports.view", "reports.export",
  "notifications.view",
  "audit.view",
  "settings.view", "settings.edit",
  "users.view", "users.create", "users.edit",
];

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  ADMIN: ALL_PERMISSIONS.filter((p) => !p.startsWith("users.")),
  EMPLOYEE: [
    "dashboard.view",
    "customers.view", "customers.create", "customers.edit",
    "vehicles.view", "vehicles.create", "vehicles.edit",
    "owners.view", "owners.create", "owners.edit",
    "drivers.view", "drivers.create", "drivers.edit",
    "brokers.view", "brokers.create", "brokers.edit",
    "rentals.view", "rentals.create", "rentals.edit", "rentals.handover", "rentals.return", "rentals.receipt",
    "payments.view", "payments.create",
    "damages.view", "damages.create",
    "maintenance.view", "maintenance.create",
    "expenses.view", "expenses.create",
    "notifications.view",
    "settings.view",
  ],
  DRIVER: [
    "dashboard.view",
    "rentals.view",
    "notifications.view",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canManageAnnualAccountFee(role: UserRole): boolean {
  return role === "SUPER_ADMIN";
}

export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function canAccessRoute(role: UserRole, route: string): boolean {
  const routePermissions: Record<string, Permission> = {
    "/": "dashboard.view",
    "/customers": "customers.view",
    "/vehicles": "vehicles.view",
    "/owners": "owners.view",
    "/drivers": "drivers.view",
    "/brokers": "brokers.view",
    "/rentals": "rentals.view",
    "/payments": "payments.view",
    "/damages": "damages.view",
    "/settlements": "settlements.view",
    "/maintenance": "maintenance.view",
    "/expenses": "expenses.view",
    "/reports": "reports.view",
    "/notifications": "notifications.view",
    "/audit": "audit.view",
    "/settings": "settings.view",
    "/users": "users.view",
  };

  for (const [prefix, permission] of Object.entries(routePermissions)) {
    if (route === prefix || route.startsWith(prefix + "/")) {
      if (role === "DRIVER" && prefix === "/rentals" && route.startsWith("/rentals/")) {
        return false;
      }
      return hasPermission(role, permission);
    }
  }

  return false;
}

export { ROLE_PERMISSIONS };
