"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  customerDocumentSchema,
  type CustomerDocumentFormValues,
} from "@/lib/validations/customer";
import { updateCustomerDocument } from "@/app/customers/actions";
import { DocumentImageUpload } from "@/components/customers/document-image-upload";
import { DocumentScanFillButton } from "@/components/ai/document-scan-fill-button";
import { CUSTOMER_DOCUMENT_TYPES } from "@/lib/customer-documents/types";
import type { DocumentScanResult } from "@/lib/ai/document-scan";

interface DocumentEditDialogProps {
  customerId: string;
  document: {
    id: string;
    documentType: string;
    documentNumber: string | null;
    issueDate: Date | null;
    expiryDate: Date | null;
    filePath: string | null;
    notes: string | null;
  };
}

import { toDateInputValue } from "@/lib/utils";

function toDateInput(value: Date | string | null | undefined): string {
  return toDateInputValue(value);
}

export function DocumentEditDialog({ customerId, document }: DocumentEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const uploadResetKey = useRef(0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerDocumentFormValues>({
    resolver: zodResolver(customerDocumentSchema),
    defaultValues: {
      documentType: document.documentType as CustomerDocumentFormValues["documentType"],
      documentNumber: document.documentNumber ?? "",
      issueDate: toDateInput(document.issueDate),
      expiryDate: toDateInput(document.expiryDate),
      notes: document.notes ?? "",
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      reset({
        documentType: document.documentType as CustomerDocumentFormValues["documentType"],
        documentNumber: document.documentNumber ?? "",
        issueDate: toDateInput(document.issueDate),
        expiryDate: toDateInput(document.expiryDate),
        notes: document.notes ?? "",
      });
      setSelectedFile(null);
      uploadResetKey.current += 1;
    }
  }

  function applyScanResult(result: DocumentScanResult) {
    if (result.documentNumber) {
      setValue("documentNumber", result.documentNumber);
    }
    if (result.issueDate) {
      setValue("issueDate", result.issueDate);
    }
    if (result.expiryDate) {
      setValue("expiryDate", result.expiryDate);
    }
    if (result.documentTypeGuess) {
      setValue("documentType", result.documentTypeGuess);
    }
    if (result.notes) {
      setValue("notes", result.notes);
    }
  }

  async function onSubmit(data: CustomerDocumentFormValues) {
    const formData = new FormData();
    formData.set("documentType", data.documentType);
    formData.set("documentNumber", data.documentNumber ?? "");
    formData.set("issueDate", data.issueDate ?? "");
    formData.set("expiryDate", data.expiryDate ?? "");
    formData.set("notes", data.notes ?? "");
    if (selectedFile) {
      formData.set("file", selectedFile);
    }

    const result = await updateCustomerDocument(document.id, customerId, formData);
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message ?? "Document updated successfully");
    handleOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Customer Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Document Type *</Label>
            <Select
              value={watch("documentType")}
              onValueChange={(v) =>
                setValue("documentType", v as CustomerDocumentFormValues["documentType"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMER_DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`documentNumber-${document.id}`}>Document Number</Label>
            <Input id={`documentNumber-${document.id}`} {...register("documentNumber")} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`issueDate-${document.id}`}>Issue Date</Label>
              <Input id={`issueDate-${document.id}`} type="date" {...register("issueDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`expiryDate-${document.id}`}>Expiry Date</Label>
              <Input id={`expiryDate-${document.id}`} type="date" {...register("expiryDate")} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Document Image</Label>
              <DocumentScanFillButton
                file={selectedFile}
                documentType={watch("documentType")}
                disabled={isSubmitting}
                onApply={applyScanResult}
              />
            </div>
            {document.filePath && !selectedFile && (
              <p className="text-xs text-muted-foreground">
                Current image is saved. Upload a new image below to replace it.
              </p>
            )}
            <DocumentImageUpload
              key={uploadResetKey.current}
              disabled={isSubmitting}
              onFileChange={setSelectedFile}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`docNotes-${document.id}`}>Notes</Label>
            <Textarea id={`docNotes-${document.id}`} {...register("notes")} rows={2} />
          </div>
          {errors.documentType && (
            <p className="text-sm text-destructive">{errors.documentType.message}</p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
