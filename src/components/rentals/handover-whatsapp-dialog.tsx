"use client";

import { toast } from "sonner";
import { Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HandoverWhatsAppPayload } from "@/lib/whatsapp/handover-message";

interface HandoverWhatsAppDialogProps {
  payload: HandoverWhatsAppPayload | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HandoverWhatsAppDialog({ payload, open, onOpenChange }: HandoverWhatsAppDialogProps) {
  async function copyMessage() {
    if (!payload?.message) return;
    await navigator.clipboard.writeText(payload.message);
    toast.success("Message copied");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send rental details on WhatsApp</DialogTitle>
          <DialogDescription>
            {payload?.url
              ? "WhatsApp should open with this message. If it did not, tap Open WhatsApp."
              : "This customer has no WhatsApp or phone number. Copy the message and send it another way."}
          </DialogDescription>
        </DialogHeader>
        <Textarea readOnly value={payload?.message ?? ""} rows={16} className="font-sans text-sm" />
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => void copyMessage()}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          {payload?.url && (
            <Button type="button" asChild>
              <a href={payload.url} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" />
                Open WhatsApp
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function openHandoverWhatsApp(payload: HandoverWhatsAppPayload): boolean {
  if (!payload.url || typeof window === "undefined") return false;
  const tab = window.open(payload.url, "_blank");
  if (!tab) return false;
  try {
    tab.opener = null;
  } catch {
    // Ignore browsers that freeze opener.
  }
  return true;
}

export function reloadAppTab(path: string) {
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    window.location.assign(path);
  }, 50);
}
