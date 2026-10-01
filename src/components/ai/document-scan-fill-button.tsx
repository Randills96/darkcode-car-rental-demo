"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scanCustomerDocument } from "@/app/ai/actions";
import type { CustomerDocumentFormValues } from "@/lib/validations/customer";
import type { DocumentScanResult } from "@/lib/ai/document-scan";

interface DocumentScanFillButtonProps {
  file: File | null;
  documentType: CustomerDocumentFormValues["documentType"];
  disabled?: boolean;
  onApply: (result: DocumentScanResult) => void;
}

export function DocumentScanFillButton({
  file,
  documentType,
  disabled,
  onApply,
}: DocumentScanFillButtonProps) {
  const [scanning, setScanning] = useState(false);

  async function handleScan() {
    if (!file) {
      toast.error("Upload a document image first");
      return;
    }

    setScanning(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("documentType", documentType);

      const result = await scanCustomerDocument(formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      onApply(result.data.result);
      toast.success(result.message ?? "Fields filled from scan — please verify");
    } finally {
      setScanning(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={disabled || scanning || !file}
      onClick={handleScan}
      className="rounded-full"
    >
      {scanning ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <ScanLine className="mr-2 h-4 w-4" />
      )}
      {scanning ? "Scanning..." : "Scan & fill"}
    </Button>
  );
}
