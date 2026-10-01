import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FormSectionVariant = "sky" | "violet" | "emerald" | "amber" | "rose" | "slate" | "indigo" | "cyan";

const variantStyles: Record<
  FormSectionVariant,
  { card: string; header: string; accent: string }
> = {
  sky: {
    card: "border-sky-200/80 bg-gradient-to-br from-white via-sky-50/40 to-sky-100/30 dark:border-sky-800/40 dark:from-card dark:via-sky-950/20 dark:to-sky-950/10",
    header: "border-sky-100/80 bg-sky-50/50 dark:border-sky-900/40 dark:bg-sky-950/20",
    accent: "via-sky-400/40",
  },
  violet: {
    card: "border-violet-200/80 bg-gradient-to-br from-white via-violet-50/40 to-violet-100/30 dark:border-violet-800/40 dark:from-card dark:via-violet-950/20 dark:to-violet-950/10",
    header: "border-violet-100/80 bg-violet-50/50 dark:border-violet-900/40 dark:bg-violet-950/20",
    accent: "via-violet-400/40",
  },
  emerald: {
    card: "border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/40 to-emerald-100/30 dark:border-emerald-800/40 dark:from-card dark:via-emerald-950/20 dark:to-emerald-950/10",
    header: "border-emerald-100/80 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20",
    accent: "via-emerald-400/40",
  },
  amber: {
    card: "border-amber-200/80 bg-gradient-to-br from-white via-amber-50/40 to-amber-100/30 dark:border-amber-800/40 dark:from-card dark:via-amber-950/20 dark:to-amber-950/10",
    header: "border-amber-100/80 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20",
    accent: "via-amber-400/40",
  },
  rose: {
    card: "border-rose-200/80 bg-gradient-to-br from-white via-rose-50/40 to-rose-100/30 dark:border-rose-800/40 dark:from-card dark:via-rose-950/20 dark:to-rose-950/10",
    header: "border-rose-100/80 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20",
    accent: "via-rose-400/40",
  },
  slate: {
    card: "border-slate-200/80 bg-gradient-to-br from-white via-slate-50/50 to-slate-100/40 dark:border-slate-700/50 dark:from-card dark:via-slate-900/30 dark:to-slate-900/10",
    header: "border-slate-200/80 bg-slate-50/60 dark:border-slate-800/40 dark:bg-slate-900/30",
    accent: "via-slate-400/30",
  },
  indigo: {
    card: "border-indigo-200/80 bg-gradient-to-br from-white via-indigo-50/40 to-indigo-100/30 dark:border-indigo-800/40 dark:from-card dark:via-indigo-950/20 dark:to-indigo-950/10",
    header: "border-indigo-100/80 bg-indigo-50/50 dark:border-indigo-900/40 dark:bg-indigo-950/20",
    accent: "via-indigo-400/40",
  },
  cyan: {
    card: "border-cyan-200/80 bg-gradient-to-br from-white via-cyan-50/40 to-cyan-100/30 dark:border-cyan-800/40 dark:from-card dark:via-cyan-950/20 dark:to-cyan-950/10",
    header: "border-cyan-100/80 bg-cyan-50/50 dark:border-cyan-900/40 dark:bg-cyan-950/20",
    accent: "via-cyan-400/40",
  },
};

const motionStyles =
  "group relative overflow-hidden shadow-[0_4px_14px_-4px_rgba(15,23,42,0.12),0_2px_4px_-2px_rgba(15,23,42,0.06)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_20px_40px_-12px_rgba(15,23,42,0.18),0_8px_16px_-8px_rgba(59,130,246,0.12)] active:translate-y-0 active:scale-[0.995] motion-reduce:transition-none motion-reduce:hover:translate-y-0";

interface FormSectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  variant?: FormSectionVariant;
  headerAction?: React.ReactNode;
}

export function FormSectionCard({
  title,
  variant = "sky",
  headerAction,
  className,
  children,
  ...props
}: FormSectionCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card className={cn(motionStyles, styles.card, className)} {...props}>
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          styles.accent
        )}
      />
      <CardHeader
        className={cn(
          "relative border-b pb-4 transition-colors duration-300 group-hover:border-primary/20",
          styles.header
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg transition-transform duration-300 group-hover:translate-x-0.5">
            {title}
          </CardTitle>
          {headerAction}
        </div>
      </CardHeader>
      <CardContent className="relative pt-6">{children}</CardContent>
    </Card>
  );
}
