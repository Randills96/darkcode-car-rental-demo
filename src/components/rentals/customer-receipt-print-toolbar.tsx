"use client";

import { useEffect } from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CustomerReceiptPrintToolbar() {
  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="mb-4 flex flex-wrap items-center justify-center gap-2 print:hidden">
      <Button type="button" size="sm" onClick={() => window.print()}>
        <Printer className="mr-2 h-4 w-4" />
        Print Receipt
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => window.close()}>
        <X className="mr-2 h-4 w-4" />
        Close
      </Button>
    </div>
  );
}
