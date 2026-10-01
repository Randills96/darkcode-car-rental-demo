import {
  LayoutDashboard,
  Users,
  Car,
  UserCircle,
  Handshake,
  IdCard,
  CalendarDays,
  CreditCard,
  AlertTriangle,
  Wallet,
  Wrench,
  Receipt,
  BarChart3,
  Bell,
  ClipboardList,
  Settings,
  Shield,
  type LucideIcon,
} from "lucide-react";
import type { hasPermission } from "@/lib/permissions";

export interface SidebarNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  permission?: Parameters<typeof hasPermission>[1];
  tourNavId?: string;
  /** Highlights this item as a primary workflow (e.g. Rentals) */
  featured?: boolean;
  section?: "Operations" | "Finance" | "System";
}

export const sidebarNavItems: SidebarNavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard, permission: "dashboard.view", tourNavId: "dashboard", section: "Operations" },
  { title: "Customers", href: "/customers", icon: Users, permission: "customers.view", tourNavId: "customers", section: "Operations" },
  { title: "Vehicles", href: "/vehicles", icon: Car, permission: "vehicles.view", section: "Operations" },
  { title: "Owners", href: "/owners", icon: UserCircle, permission: "owners.view", section: "Operations" },
  { title: "Drivers", href: "/drivers", icon: IdCard, permission: "drivers.view", section: "Operations" },
  { title: "Brokers", href: "/brokers", icon: Handshake, permission: "brokers.view", section: "Operations" },
  { title: "Rentals", href: "/rentals", icon: CalendarDays, permission: "rentals.view", tourNavId: "rentals", featured: true, section: "Operations" },
  { title: "Payments", href: "/payments", icon: CreditCard, permission: "payments.view", section: "Finance" },
  { title: "Damages", href: "/damages", icon: AlertTriangle, permission: "damages.view", section: "Finance" },
  { title: "Settlements", href: "/settlements", icon: Wallet, permission: "settlements.view", section: "Finance" },
  { title: "Maintenance", href: "/maintenance", icon: Wrench, permission: "maintenance.view", section: "Finance" },
  { title: "Expenses", href: "/expenses", icon: Receipt, permission: "expenses.view", section: "Finance" },
  { title: "Reports", href: "/reports", icon: BarChart3, permission: "reports.view", section: "Finance" },
  { title: "Notifications", href: "/notifications", icon: Bell, permission: "notifications.view", section: "System" },
  { title: "Audit Log", href: "/audit", icon: ClipboardList, permission: "audit.view", section: "System" },
  { title: "Settings", href: "/settings", icon: Settings, permission: "settings.view", section: "System" },
  { title: "Users", href: "/users", icon: Shield, permission: "users.view", section: "System" },
];
