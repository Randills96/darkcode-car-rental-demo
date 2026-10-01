"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHandoverWhatsAppDetails } from "@/app/rentals/actions";
import type { HandoverWhatsAppPayload } from "@/lib/whatsapp/handover-message";
import { HandoverWhatsAppDialog, openHandoverWhatsApp } from "@/components/rentals/handover-whatsapp-dialog";

export function HandoverWhatsAppResendButton({ rentalId }: { rentalId: string }) {
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<HandoverWhatsAppPayload | null>(null);
  const [open, setOpen] = useState(false);

  async function send() {
    setLoading(true);
    try {
      const result = await getHandoverWhatsAppDetails(rentalId);
      if (!result.success || !result.data) {
        toast.error(!result.success ? result.error : "Could not prepare the WhatsApp message");
        return;
      }
      setPayload(result.data.whatsapp);
      setOpen(true);
      openHandoverWhatsApp(result.data.whatsapp);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => void send()} disabled={loading}>
        <MessageCircle className="mr-2 h-4 w-4" />
        {loading ? "Preparing..." : "Send rental details on WhatsApp"}
      </Button>
      <HandoverWhatsAppDialog payload={payload} open={open} onOpenChange={setOpen} />
    </>
  );
}
