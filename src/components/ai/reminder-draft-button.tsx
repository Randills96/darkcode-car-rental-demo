"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { draftJobReminderMessage } from "@/app/ai/actions";
import { toWhatsAppUrl } from "@/lib/ai/reminder-draft";
import type { UpcomingJobType } from "@/lib/services/upcoming-jobs";

interface ReminderDraftButtonProps {
  job: {
    type: UpcomingJobType;
    bookingNumber: string;
    customerName: string;
    customerPhone: string;
    vehicleLabel: string;
    scheduledDate: Date | string;
    scheduledTime: string;
    location: string | null;
  };
  compact?: boolean;
}

export function ReminderDraftButton({ job, compact = false }: ReminderDraftButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [source, setSource] = useState<"ai" | "template" | null>(null);

  async function generateDraft(channel: "whatsapp" | "sms") {
    setLoading(true);
    try {
      const result = await draftJobReminderMessage({
        jobType: job.type,
        bookingNumber: job.bookingNumber,
        customerName: job.customerName,
        customerPhone: job.customerPhone,
        vehicleLabel: job.vehicleLabel,
        scheduledDate: new Date(job.scheduledDate).toISOString(),
        scheduledTime: job.scheduledTime,
        location: job.location,
        channel,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setMessage(result.data.message);
      setSource(result.data.source);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  async function copyMessage() {
    if (!message) return;
    await navigator.clipboard.writeText(message);
    toast.success("Message copied");
  }

  const whatsappUrl =
    job.customerPhone && message ? toWhatsAppUrl(job.customerPhone, message) : null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "rounded-md bg-background/70",
          compact && "h-7 px-2.5 text-xs"
        )}
        disabled={loading}
        onClick={() => generateDraft("whatsapp")}
      >
        {loading ? (
          <Loader2 className={cn("h-3.5 w-3.5 animate-spin", !compact && "mr-2 h-4 w-4")} />
        ) : (
          <Sparkles className={cn(compact ? "mr-1 h-3.5 w-3.5" : "mr-2 h-4 w-4")} />
        )}
        {compact ? "Draft" : "Draft message"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <span className="hidden" />
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Customer reminder
              {source && (
                <Badge variant={source === "ai" ? "info" : "secondary"} className="rounded-full">
                  {source === "ai" ? "AI draft" : "Smart template"}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={8}
            className="resize-none"
          />

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => generateDraft("sms")} disabled={loading}>
                Shorter SMS
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => generateDraft("whatsapp")} disabled={loading}>
                WhatsApp style
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={copyMessage} disabled={!message}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              {whatsappUrl && (
                <Button size="sm" asChild>
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Open WhatsApp
                  </a>
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
