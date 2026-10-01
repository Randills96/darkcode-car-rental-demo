import Link from "next/link";
import {
  ArrowUpRight,
  BellRing,
  CalendarClock,
  Car,
  Phone,
  Sparkles,
  ArrowDownLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  getUpcomingJobLabel,
  type UpcomingJob,
  type UpcomingJobType,
} from "@/lib/services/upcoming-jobs";
import { ReminderDraftButton } from "@/components/ai/reminder-draft-button";

interface UpcomingJobsPanelProps {
  jobs: UpcomingJob[];
}

const jobConfig: Record<
  UpcomingJobType,
  {
    icon: LucideIcon;
    accent: string;
    bar: string;
    chip: string;
    badge: "info" | "warning" | "success" | "destructive";
  }
> = {
  PICKUP_TODAY: {
    icon: ArrowUpRight,
    accent: "from-emerald-500/10 to-white dark:from-emerald-500/10 dark:to-card",
    bar: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    badge: "success",
  },
  RETURN_TODAY: {
    icon: ArrowDownLeft,
    accent: "from-rose-500/10 to-white dark:from-rose-500/10 dark:to-card",
    bar: "bg-rose-500",
    chip: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    badge: "destructive",
  },
  PICKUP_REMINDER: {
    icon: BellRing,
    accent: "from-sky-500/10 to-white dark:from-sky-500/10 dark:to-card",
    bar: "bg-sky-500",
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    badge: "info",
  },
  RETURN_REMINDER: {
    icon: CalendarClock,
    accent: "from-amber-500/10 to-white dark:from-amber-500/10 dark:to-card",
    bar: "bg-amber-500",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    badge: "warning",
  },
};

const jobGroups: Array<{
  key: string;
  title: string;
  types: UpcomingJobType[];
  pulse?: boolean;
}> = [
  {
    key: "today",
    title: "Today",
    types: ["PICKUP_TODAY", "RETURN_TODAY"],
    pulse: true,
  },
  {
    key: "tomorrow",
    title: "Call ahead — tomorrow",
    types: ["PICKUP_REMINDER", "RETURN_REMINDER"],
  },
];

function JobCard({ job }: { job: UpcomingJob }) {
  const config = jobConfig[job.type];
  const Icon = config.icon;

  const scheduleLine = [
    formatDate(job.scheduledDate),
    job.scheduledTime,
    job.vehicleLabel,
    job.customerPhone,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br shadow-sm",
        config.accent
      )}
    >
      <div className={cn("absolute left-0 top-0 h-full w-1", config.bar)} />

      <div className="flex gap-2.5 p-3 pl-3.5">
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            config.chip
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={config.badge} className="h-5 rounded-md px-1.5 text-[10px] font-semibold">
              {getUpcomingJobLabel(job.type)}
            </Badge>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {job.status}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <Link
              href={`/rentals/${job.rentalId}`}
              className="text-sm font-semibold leading-tight hover:text-primary"
            >
              {job.bookingNumber}
            </Link>
            <span className="truncate text-sm text-foreground/90">{job.customerName}</span>
          </div>

          <p className="truncate text-[11px] leading-snug text-muted-foreground">{scheduleLine}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-border/50 bg-background/50 px-3 py-2">
        {job.customerPhone && (
          <Button size="sm" className="h-7 rounded-md px-2.5 text-xs" asChild>
            <a href={`tel:${job.customerPhone}`}>
              <Phone className="mr-1 h-3.5 w-3.5" />
              Call
            </a>
          </Button>
        )}
        {job.customerPhone && <ReminderDraftButton job={job} compact />}
        <Button variant="outline" size="sm" className="h-7 rounded-md px-2.5 text-xs" asChild>
          <Link href={`/rentals/${job.rentalId}`}>
            Open
            <ArrowUpRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function UpcomingJobsPanel({ jobs }: UpcomingJobsPanelProps) {
  const todayJobs = jobs.filter((j) => jobGroups[0].types.includes(j.type));
  const tomorrowJobs = jobs.filter((j) => jobGroups[1].types.includes(j.type));

  return (
    <section
      data-tour="upcoming-jobs"
      className="overflow-hidden rounded-xl border bg-card shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight sm:text-base">Today’s work queue</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Today {todayJobs.length} · Tomorrow {tomorrowJobs.length} — call, handover, or collect
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-md text-xs">
            {jobs.length} total
          </Badge>
          <Button variant="outline" size="sm" className="h-7 rounded-md px-2.5 text-xs" asChild>
            <Link href="/rentals">All rentals</Link>
          </Button>
        </div>
      </div>

      <div className="space-y-4 p-3 sm:p-4">
        {jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-8 text-center">
            <CalendarClock className="mx-auto mb-2 h-7 w-7 text-muted-foreground/70" />
            <p className="text-sm font-medium">All clear for now</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Today and tomorrow bookings will appear here.
            </p>
          </div>
        ) : (
          jobGroups.map((group) => {
            const groupJobs = jobs.filter((job) => group.types.includes(job.type));
            if (groupJobs.length === 0) return null;

            return (
              <div key={group.key} className="space-y-2">
                <div className="flex items-center gap-2 px-0.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.title}
                  </h3>
                  <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
                    {groupJobs.length}
                  </Badge>
                  {group.pulse && groupJobs.length > 0 && (
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {groupJobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
