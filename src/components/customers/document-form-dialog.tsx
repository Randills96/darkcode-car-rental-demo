"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { addCustomerDocument } from "@/app/customers/actions";
import { DocumentImageUpload } from "@/components/customers/document-image-upload";
import { DocumentScanFillButton } from "@/components/ai/document-scan-fill-button";
import {
  buildDocumentSideNote,
  CUSTOMER_DOCUMENT_TYPES,
  isTwoSidedDocumentType,
} from "@/lib/customer-documents/types";
import type { DocumentScanResult } from "@/lib/ai/document-scan";

interface DocumentFormDialogProps {
  customerId: string;
}

export function DocumentFormDialog({ customerId }: DocumentFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
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
      documentType: "DRIVING_LICENCE",
      documentNumber: "",
      issueDate: "",
      expiryDate: "",
      notes: "",
    },
  });

  const documentType = watch("documentType");
  const twoSided = isTwoSidedDocumentType(documentType);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      reset();
      setSelectedFile(null);
      setFrontFile(null);
      setBackFile(null);
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

  async function submitDocument(file: File | null, sideNote?: string) {
    const data = watch();
    const formData = new FormData();
    formData.set("documentType", data.documentType);
    formData.set("documentNumber", data.documentNumber ?? "");
    formData.set("issueDate", data.issueDate ?? "");
    formData.set("expiryDate", data.expiryDate ?? "");
    formData.set("notes", sideNote ?? data.notes ?? "");
    if (file) {
      formData.set("file", file);
    }
    return addCustomerDocument(customerId, formData);
  }

  async function onSubmit(data: CustomerDocumentFormValues) {
    if (twoSided) {
      if (!frontFile && !backFile) {
        toast.error("Upload at least one side (front or back)");
        return;
      }

      const uploads: Array<{ file: File; note: string }> = [];
      if (frontFile) {
        uploads.push({ file: frontFile, note: buildDocumentSideNote(data.documentType, "FRONT") });
      }
      if (backFile) {
        uploads.push({ file: backFile, note: buildDocumentSideNote(data.documentType, "BACK") });
      }

      for (const upload of uploads) {
        const result = await submitDocument(upload.file, upload.note);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
      }

      toast.success(
        uploads.length === 2 ? "Both sides uploaded successfully" : "Document side uploaded successfully"
      );
      handleOpenChange(false);
      router.refresh();
      return;
    }

    const formData = new FormData();
    formData.set("documentType", data.documentType);
    formData.set("documentNumber", data.documentNumber ?? "");
    formData.set("issueDate", data.issueDate ?? "");
    formData.set("expiryDate", data.expiryDate ?? "");
    formData.set("notes", data.notes ?? "");
    if (selectedFile) {
      formData.set("file", selectedFile);
    }

    const result = await addCustomerDocument(customerId, formData);
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message ?? "Document added successfully");
    handleOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Customer Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Document Type *</Label>
            <Select
              value={documentType}
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
            <Label htmlFor="documentNumber">Document Number</Label>
            <Input id="documentNumber" {...register("documentNumber")} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="issueDate">Issue Date</Label>
              <Input id="issueDate" type="date" {...register("issueDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input id="expiryDate" type="date" {...register("expiryDate")} />
            </div>
          </div>

          {twoSided ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Licence / ID Images</Label>
                <DocumentScanFillButton
                  file={frontFile ?? backFile}
                  documentType={documentType}
                  disabled={isSubmitting}
                  onApply={applyScanResult}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Front Side</Label>
                  <DocumentImageUpload
                    key={`${uploadResetKey.current}-front`}
                    disabled={isSubmitting}
                    onFileChange={setFrontFile}
                    label="Upload front"
                    hint="Front of licence or NIC"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Back Side</Label>
                  <DocumentImageUpload
                    key={`${uploadResetKey.current}-back`}
                    disabled={isSubmitting}
                    onFileChange={setBackFile}
                    label="Upload back"
                    hint="Back of licence or NIC"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload one or both sides. Each side is saved as a separate document row.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Document Image</Label>
                <DocumentScanFillButton
                  file={selectedFile}
                  documentType={documentType}
                  disabled={isSubmitting}
                  onApply={applyScanResult}
                />
              </div>
              <DocumentImageUpload
                key={uploadResetKey.current}
                disabled={isSubmitting}
                onFileChange={setSelectedFile}
              />
              <p className="text-xs text-muted-foreground">
                Upload a photo, then use Scan &amp; fill to extract details (requires OPENAI_API_KEY).
              </p>
            </div>
          )}

          {!twoSided && (
            <div className="space-y-2">
              <Label htmlFor="docNotes">Notes</Label>
              <Textarea id="docNotes" {...register("notes")} rows={2} />
            </div>
          )}
          {errors.documentType && (
            <p className="text-sm text-destructive">{errors.documentType.message}</p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Uploading..." : "Add Document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
