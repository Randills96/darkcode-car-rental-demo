import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import {
  dashboardCardMotion,
  dashboardIconMotion,
  dashboardStatVariants,
  type DashboardCardVariant,
} from "@/lib/theme/dashboard-cards";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  variant?: DashboardCardVariant;
  className?: string;
  href?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  variant = "slate",
  className,
  href,
}: StatCardProps) {
  const styles = dashboardStatVariants[variant];

  const card = (
    <Card
      className={cn(
        "relative min-h-[7.25rem] overflow-hidden",
        dashboardCardMotion,
        "border shadow-sm",
        styles.card,
        href && "cursor-pointer",
        href && styles.hover,
        className
      )}
    >
      <CardContent className="relative p-4 pr-[3.25rem]">
        <div
          className={cn(
            "absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-inset",
            dashboardIconMotion,
            styles.icon
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        <div className={cn("mt-2 text-xl font-semibold tabular-nums tracking-tight sm:text-2xl", styles.value)}>
          {value}
        </div>
        {description && (
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  if (!href) return card;

  return (
    <Link href={href} className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {card}
    </Link>
  );
}

interface CurrencyStatCardProps {
  title: string;
  amount: number;
  description?: string;
  icon: LucideIcon;
  variant?: DashboardCardVariant;
  href?: string;
  className?: string;
}

export function CurrencyStatCard({
  title,
  amount,
  description,
  icon,
  variant = "violet",
  href,
  className,
}: CurrencyStatCardProps) {
  return (
    <StatCard
      title={title}
      value={formatCurrency(amount)}
      description={description}
      icon={icon}
      variant={variant}
      href={href}
      className={className}
    />
  );
}

interface FleetStatTileProps {
  value: number;
  label: string;
  href: string;
  variant?: DashboardCardVariant;
  className?: string;
}

export function FleetStatTile({
  value,
  label,
  href,
  variant = "slate",
  className,
}: FleetStatTileProps) {
  const styles = dashboardStatVariants[variant];

  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-xl border p-4 text-center shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        dashboardCardMotion,
        styles.card,
        styles.hover,
        className
      )}
    >
      <p className={cn("text-2xl font-semibold tabular-nums tracking-tight", styles.value)}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </Link>
  );
}
