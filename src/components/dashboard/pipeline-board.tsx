import Link from "next/link";
import { cn } from "@/lib/utils";

interface PipelineBoardProps {
  inquiry: number;
  quoted: number;
  confirmed: number;
  active: number;
  returned: number;
  completed: number;
  cancelled: number;
  openPipeline: number;
}

const stages = [
  { key: "inquiry", label: "Inquiry", href: "/rentals?status=INQUIRY" },
  { key: "quoted", label: "Quoted", href: "/rentals?status=QUOTED" },
  { key: "confirmed", label: "Confirmed", href: "/rentals?status=CONFIRMED" },
  { key: "active", label: "Active", href: "/rentals?status=ACTIVE" },
  { key: "returned", label: "Returned", href: "/rentals?status=RETURNED" },
  { key: "completed", label: "Completed", href: "/rentals?status=COMPLETED" },
] as const;

export function PipelineBoard({
  inquiry,
  quoted,
  confirmed,
  active,
  returned,
  completed,
  cancelled,
  openPipeline,
}: PipelineBoardProps) {
  const values = { inquiry, quoted, confirmed, active, returned, completed };
  const max = Math.max(...Object.values(values), 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">{openPipeline}</span> open jobs in pipeline
        </p>
        <Link href="/rentals?status=CANCELLED" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
          {cancelled} cancelled
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {stages.map((stage) => {
          const count = values[stage.key];
          const width = Math.max(8, Math.round((count / max) * 100));
          return (
            <Link
              key={stage.key}
              href={stage.href}
              className="rounded-lg border border-border/70 bg-background px-3 py-2.5 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-muted-foreground">{stage.label}</span>
                <span className="text-lg font-semibold tabular-nums">{count}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full bg-primary/70",
                    stage.key === "active" && "bg-indigo-500",
                    stage.key === "returned" && "bg-amber-500"
                  )}
                  style={{ width: `${width}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
