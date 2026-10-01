import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { dashboardCardMotion } from "@/lib/theme/dashboard-cards";
import type { NotificationSeverity } from "@prisma/client";

interface AlertItemProps {
  title: string;
  message: string;
  severity: NotificationSeverity;
  date?: string;
}

const severityConfig: Record<
  NotificationSeverity,
  { variant: "info" | "warning" | "destructive"; label: string; surface: string }
> = {
  INFO: {
    variant: "info",
    label: "Info",
    surface:
      "border-sky-200/90 bg-gradient-to-r from-sky-50/90 to-white hover:border-sky-300 dark:border-sky-800/50 dark:from-sky-950/30 dark:to-card dark:hover:border-sky-700",
  },
  WARNING: {
    variant: "warning",
    label: "Warning",
    surface:
      "border-amber-200/90 bg-gradient-to-r from-amber-50/90 to-white hover:border-amber-300 dark:border-amber-800/50 dark:from-amber-950/30 dark:to-card dark:hover:border-amber-700",
  },
  CRITICAL: {
    variant: "destructive",
    label: "Critical",
    surface:
      "border-rose-200/90 bg-gradient-to-r from-rose-50/90 to-white hover:border-rose-300 dark:border-rose-800/50 dark:from-rose-950/30 dark:to-card dark:hover:border-rose-700",
  },
};

export function AlertItem({ title, message, severity, date }: AlertItemProps) {
  const config = severityConfig[severity];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3",
        dashboardCardMotion,
        config.surface
      )}
    >
      <Badge variant={config.variant}>{config.label}</Badge>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{message}</p>
        {date && <p className="mt-1 text-xs text-muted-foreground">{date}</p>}
      </div>
    </div>
  );
}
