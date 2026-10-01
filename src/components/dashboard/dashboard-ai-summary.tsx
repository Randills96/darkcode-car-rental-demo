"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { summarizeDashboardToday } from "@/app/ai/actions";
import { cn } from "@/lib/utils";

interface DashboardAiSummaryProps {
  aiEnabled: boolean;
}

export function DashboardAiSummary({ aiEnabled }: DashboardAiSummaryProps) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [source, setSource] = useState<"ai" | "template" | null>(null);

  async function handleSummarize() {
    setLoading(true);
    try {
      const result = await summarizeDashboardToday();
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setSummary(result.data.summary);
      setSource(result.data.source);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm sm:px-5 sm:py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight sm:text-base">Daily briefing</h2>
            {source && (
              <Badge variant={source === "ai" ? "info" : "secondary"} className="rounded-md">
                {source === "ai" ? "AI summary" : "Smart summary"}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {aiEnabled
              ? "Generate a short briefing of rentals, reminders, and risks."
              : "Uses a structured template — add OPENAI_API_KEY for richer AI summaries."}
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          disabled={loading}
          onClick={handleSummarize}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {loading ? "Summarizing..." : summary ? "Refresh summary" : "Summarize today"}
        </Button>
      </div>

      {summary && (
        <div
          className={cn(
            "mt-4 rounded-xl border bg-muted/30 px-4 py-3 text-sm leading-relaxed text-foreground/90",
            "whitespace-pre-wrap"
          )}
        >
          {summary}
        </div>
      )}
    </section>
  );
}
