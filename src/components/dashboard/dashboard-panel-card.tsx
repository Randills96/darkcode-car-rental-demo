import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  dashboardCardMotion,
  dashboardPanelVariants,
  type DashboardCardVariant,
} from "@/lib/theme/dashboard-cards";

interface DashboardPanelCardProps {
  title: string;
  variant?: DashboardCardVariant;
  href?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function DashboardPanelCard({
  title,
  variant = "slate",
  href,
  action,
  children,
  className,
}: DashboardPanelCardProps) {
  const styles = dashboardPanelVariants[variant];

  const card = (
    <Card
      className={cn(
        dashboardCardMotion,
        "h-full overflow-hidden border shadow-sm",
        styles.card,
        href && "cursor-pointer",
        href && styles.hover,
        className
      )}
    >
      <CardHeader
        className={cn(
          "flex flex-col gap-2 border-b sm:flex-row sm:items-center sm:justify-between",
          styles.header
        )}
      >
        <CardTitle className="text-sm font-semibold tracking-tight sm:text-base">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );

  if (!href) return card;

  return (
    <Link href={href} className="block h-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {card}
    </Link>
  );
}

interface DashboardSectionProps {
  title: string;
  description?: string;
  variant?: DashboardCardVariant;
  children: React.ReactNode;
}

export function DashboardSection({
  title,
  description,
  children,
}: DashboardSectionProps) {
  return (
    <section>
      <div className="mb-3 sm:mb-4">
        <h3 className="text-sm font-semibold tracking-tight sm:text-base">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}
