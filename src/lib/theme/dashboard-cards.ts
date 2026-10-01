export type DashboardCardVariant =
  | "slate"
  | "sky"
  | "emerald"
  | "amber"
  | "violet"
  | "rose"
  | "cyan"
  | "orange"
  | "indigo";

const baseCard =
  "border-border/80 bg-card dark:border-border/60";

export const dashboardStatVariants: Record<
  DashboardCardVariant,
  { card: string; icon: string; value: string; hover: string }
> = {
  slate: {
    card: baseCard,
    icon: "bg-muted text-muted-foreground ring-border/60",
    value: "text-foreground",
    hover: "hover:border-border hover:bg-muted/30",
  },
  sky: {
    card: baseCard,
    icon: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-900",
    value: "text-foreground",
    hover: "hover:border-sky-200 dark:hover:border-sky-800",
  },
  emerald: {
    card: baseCard,
    icon: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-900",
    value: "text-foreground",
    hover: "hover:border-emerald-200 dark:hover:border-emerald-800",
  },
  amber: {
    card: baseCard,
    icon: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-900",
    value: "text-foreground",
    hover: "hover:border-amber-200 dark:hover:border-amber-800",
  },
  violet: {
    card: baseCard,
    icon: "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-violet-900",
    value: "text-foreground",
    hover: "hover:border-violet-200 dark:hover:border-violet-800",
  },
  rose: {
    card: "border-rose-200/80 bg-card dark:border-rose-900/50",
    icon: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-900",
    value: "text-rose-700 dark:text-rose-300",
    hover: "hover:border-rose-300 dark:hover:border-rose-800",
  },
  cyan: {
    card: baseCard,
    icon: "bg-cyan-50 text-cyan-700 ring-cyan-100 dark:bg-cyan-950/60 dark:text-cyan-300 dark:ring-cyan-900",
    value: "text-foreground",
    hover: "hover:border-cyan-200 dark:hover:border-cyan-800",
  },
  orange: {
    card: baseCard,
    icon: "bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-950/60 dark:text-orange-300 dark:ring-orange-900",
    value: "text-foreground",
    hover: "hover:border-orange-200 dark:hover:border-orange-800",
  },
  indigo: {
    card: baseCard,
    icon: "bg-indigo-50 text-indigo-700 ring-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-900",
    value: "text-foreground",
    hover: "hover:border-indigo-200 dark:hover:border-indigo-800",
  },
};

export const dashboardPanelVariants: Record<
  DashboardCardVariant,
  { card: string; header: string; hover: string }
> = {
  slate: {
    card: baseCard,
    header: "border-border/70 bg-muted/20",
    hover: "hover:border-border",
  },
  sky: {
    card: baseCard,
    header: "border-border/70 bg-muted/20",
    hover: "hover:border-border",
  },
  emerald: {
    card: baseCard,
    header: "border-border/70 bg-muted/20",
    hover: "hover:border-border",
  },
  amber: {
    card: baseCard,
    header: "border-border/70 bg-muted/20",
    hover: "hover:border-border",
  },
  violet: {
    card: baseCard,
    header: "border-border/70 bg-muted/20",
    hover: "hover:border-border",
  },
  rose: {
    card: "border-rose-200/70 bg-card dark:border-rose-900/40",
    header: "border-rose-200/60 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20",
    hover: "hover:border-rose-300 dark:hover:border-rose-800",
  },
  cyan: {
    card: baseCard,
    header: "border-border/70 bg-muted/20",
    hover: "hover:border-border",
  },
  orange: {
    card: baseCard,
    header: "border-border/70 bg-muted/20",
    hover: "hover:border-border",
  },
  indigo: {
    card: baseCard,
    header: "border-border/70 bg-muted/20",
    hover: "hover:border-border",
  },
};

export const dashboardCardMotion =
  "group relative overflow-hidden transition-colors duration-200 ease-out hover:shadow-sm active:scale-[0.995] motion-reduce:transition-none motion-reduce:active:scale-100";

export const dashboardIconMotion =
  "transition-colors duration-200";
