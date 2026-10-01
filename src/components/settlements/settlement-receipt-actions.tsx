"use client";

import { useState } from "react";
import Link from "next/link";
import { FileDown, FileText, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  sendBrokerSettlementReceiptEmail,
  sendOwnerSettlementReceiptEmail,
} from "@/app/settlements/actions";

/** Set to true after SMTP is configured in .env (SMTP_HOST, SMTP_FROM, etc.) */
const SETTLEMENT_EMAIL_ENABLED = false;

interface SettlementReceiptActionsProps {
  type: "owner" | "broker";
  settlementId: string;
  bookingNumber: string;
  recipientEmail?: string | null;
  paidAmount: number;
  canSendEmail?: boolean;
  profileEditHref?: string;
  compact?: boolean;
}

export function SettlementReceiptActions({
  type,
  settlementId,
  bookingNumber,
  recipientEmail,
  paidAmount,
  canSendEmail = false,
  profileEditHref,
  compact = false,
}: SettlementReceiptActionsProps) {
  const [sending, setSending] = useState(false);
  const receiptHref =
    type === "broker"
      ? `/api/settlements/broker/${settlementId}/receipt`
      : `/api/settlements/owner/${settlementId}/receipt`;
  const downloadHref = `${receiptHref}?dl=1`;
  const downloadLabel =
    type === "broker" ? "Broker settlement slip" : "Owner price breakdown";
  const downloadFilename =
    type === "broker"
      ? `broker-commission-${bookingNumber}.pdf`
      : `owner-price-breakdown-${bookingNumber}.pdf`;

  const canDownload = true;
  if (!canDownload) return null;

  const showEmailActions = SETTLEMENT_EMAIL_ENABLED && canSendEmail;
  const hasEmail = Boolean(recipientEmail?.trim());

  async function handleSendEmail() {
    if (!recipientEmail?.trim()) {
      toast.error(
        type === "broker"
          ? "Add the broker's email on their profile before sending."
          : "Add the owner's email on their profile before sending."
      );
      return;
    }

    setSending(true);
    const result =
      type === "broker"
        ? await sendBrokerSettlementReceiptEmail(settlementId)
        : await sendOwnerSettlementReceiptEmail(settlementId);
    setSending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "pt-2"}`}>
      {/* Opens inline so it works on phones. `download` is deliberately NOT set
          here — combined with target="_blank" it leaves a blank tab and no file
          on iOS Safari and in-app browsers. */}
      <Button variant="outline" size="sm" asChild>
        <a href={receiptHref} target="_blank" rel="noopener noreferrer">
          <FileText className="mr-2 h-4 w-4" />
          {compact ? "View" : `View ${downloadLabel}`}
        </a>
      </Button>
      <Button variant="ghost" size="sm" asChild>
        <a href={downloadHref} download={downloadFilename}>
          <FileDown className="mr-2 h-4 w-4" />
          {compact ? "Save" : "Download"}
        </a>
      </Button>
      {showEmailActions && hasEmail && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={sending}
          title={`Send to ${recipientEmail}`}
          onClick={handleSendEmail}
        >
          <Mail className="mr-2 h-4 w-4" />
          {sending ? "Sending..." : compact ? "Email" : "Email Receipt"}
        </Button>
      )}
      {showEmailActions && !hasEmail && profileEditHref && (
        <Button variant="secondary" size="sm" asChild title="Save an email on their profile to enable sending">
          <Link href={profileEditHref}>
            <Mail className="mr-2 h-4 w-4" />
            {compact ? "Add email" : `Add ${type === "broker" ? "broker" : "owner"} email`}
          </Link>
        </Button>
      )}
    </div>
  );
}
