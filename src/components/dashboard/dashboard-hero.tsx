import Link from "next/link";
import { format } from "date-fns";
import { AlertTriangle, Car, TrendingUp, Wallet } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface DashboardHeroProps {
  userName?: string;
  activeRentals: number;
  availableVehicles: number;
  monthProfit: number;
  overdueRentals: number;
}

export function DashboardHero({
  userName,
  activeRentals,
  availableVehicles,
  monthProfit,
  overdueRentals,
}: DashboardHeroProps) {
  const today = format(new Date(), "EEEE, d MMMM yyyy");
  const greetingName = userName?.split(" ")[0];

  const kpis = [
    {
      label: "On rent now",
      value: String(activeRentals),
      hint: "Active bookings",
      href: "/rentals?status=ACTIVE",
      icon: Car,
      tone: "text-indigo-600 dark:text-indigo-300",
      iconBg: "bg-indigo-50 dark:bg-indigo-950/50",
    },
    {
      label: "Ready to hire",
      value: String(availableVehicles),
      hint: "Available vehicles",
      href: "/vehicles?status=AVAILABLE",
      icon: Car,
      tone: "text-emerald-700 dark:text-emerald-300",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/50",
    },
    {
      label: "Month net profit",
      value: formatCurrency(monthProfit),
      hint: monthProfit >= 0 ? "Revenue minus expenses" : "Currently in loss",
      href: "/reports?tab=profitability&view=month",
      icon: monthProfit >= 0 ? TrendingUp : Wallet,
      tone: monthProfit >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300",
      iconBg: monthProfit >= 0 ? "bg-emerald-50 dark:bg-emerald-950/50" : "bg-rose-50 dark:bg-rose-950/50",
    },
    {
      label: "Overdue returns",
      value: String(overdueRentals),
      hint: overdueRentals > 0 ? "Needs follow-up today" : "No overdue jobs",
      href: "/rentals?status=ACTIVE",
      icon: AlertTriangle,
      tone: overdueRentals > 0 ? "text-rose-700 dark:text-rose-300" : "text-foreground",
      iconBg: overdueRentals > 0 ? "bg-rose-50 dark:bg-rose-950/50" : "bg-muted",
      alert: overdueRentals > 0,
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{today}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
            {greetingName ? `Good day, ${greetingName}` : "Operations overview"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            A concise view of fleet, cash, and jobs that need attention.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className={cn(
                "rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                kpi.alert && "border-rose-200 dark:border-rose-900/60"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {kpi.label}
                </p>
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", kpi.iconBg)}>
                  <Icon className={cn("h-4 w-4", kpi.tone)} />
                </span>
              </div>
              <p className={cn("mt-3 text-2xl font-semibold tracking-tight", kpi.tone)}>{kpi.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
