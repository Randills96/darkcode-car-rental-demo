"use client";

import { FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CustomerReceiptActionsProps {
  rentalId: string;
  bookingNumber: string;
  disabled?: boolean;
}

export function CustomerReceiptActions({
  rentalId,
  bookingNumber,
  disabled,
}: CustomerReceiptActionsProps) {
  const pdfHref = `/api/rentals/${rentalId}/receipt`;
  const printHref = `/rentals/${rentalId}/receipt`;

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="default" size="sm" asChild disabled={disabled}>
        <a
          href={pdfHref}
          target="_blank"
          rel="noopener noreferrer"
          download={`customer-receipt-${bookingNumber}.pdf`}
        >
          <FileDown className="mr-2 h-4 w-4" />
          Download PDF
        </a>
      </Button>
      <Button variant="outline" size="sm" asChild disabled={disabled}>
        <a href={printHref} target="_blank" rel="noopener noreferrer">
          <Printer className="mr-2 h-4 w-4" />
          Print Receipt
        </a>
      </Button>
    </div>
  );
}
