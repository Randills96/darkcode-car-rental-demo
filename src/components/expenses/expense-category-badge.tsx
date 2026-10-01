import type { ExpenseCategory } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const CATEGORY_CONFIG: Record<ExpenseCategory, { label: string; variant: "default" | "secondary" | "info" | "warning" | "destructive" }> = {
  FUEL: { label: "Fuel", variant: "info" },
  MAINTENANCE: { label: "Maintenance", variant: "default" },
  REPAIR: { label: "Repair", variant: "warning" },
  INSURANCE: { label: "Insurance", variant: "secondary" },
  REVENUE_LICENCE: { label: "Revenue Licence", variant: "secondary" },
  EMISSION_TEST: { label: "Emission Test", variant: "secondary" },
  DRIVER_PAYMENT: { label: "Driver Payment", variant: "info" },
  DRIVER_ACCOMMODATION: { label: "Driver Accommodation", variant: "info" },
  PARKING: { label: "Parking", variant: "secondary" },
  TOLL: { label: "Toll", variant: "secondary" },
  CLEANING: { label: "Cleaning", variant: "secondary" },
  OWNER_PAYMENT: { label: "Owner Payment", variant: "default" },
  BROKER_COMMISSION: { label: "Broker Commission", variant: "default" },
  OTHER: { label: "Other", variant: "secondary" },
};

export function ExpenseCategoryBadge({ category }: { category: ExpenseCategory }) {
  const config = CATEGORY_CONFIG[category];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
