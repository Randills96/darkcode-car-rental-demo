"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCw, ArrowLeft } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="max-w-md w-full rounded-xl border bg-card p-6 text-center shadow-lg space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {error?.message && !error.message.includes("digest")
              ? error.message
              : "An unexpected error occurred while loading this page."}
          </p>
          {error?.digest && (
            <p className="text-xs text-muted-foreground/60 font-mono mt-2 select-all">
              Ref: {error.digest}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => window.history.back()} className="w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Go back
          </Button>
          <Button size="sm" onClick={reset} className="w-full sm:w-auto">
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Try again
          </Button>
          <Button variant="secondary" size="sm" asChild className="w-full sm:w-auto">
            <Link href="/">
              <Home className="h-4 w-4 mr-1.5" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
