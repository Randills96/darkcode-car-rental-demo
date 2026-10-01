"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LicenceCardScanner } from "@/components/customers/licence-card-scanner";

interface DocumentImageUploadProps {
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
  enableScanner?: boolean;
  scannerTitle?: string;
}

const ACCEPTED_TYPES = "image/*";

export function DocumentImageUpload({
  onFileChange,
  disabled,
  label = "Upload document image",
  hint = "Any image size accepted — stored compressed for clarity",
  enableScanner,
  scannerTitle = "Scan driving licence",
}: DocumentImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSizeLabel, setFileSizeLabel] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function handleFileSelect(file: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (!file) {
      setPreviewUrl(null);
      setFileName(null);
      setFileSizeLabel(null);
      onFileChange(null);
      return;
    }

    if (!file.type || !file.type.startsWith("image/")) {
      const looksLikeImage = /\.(jpe?g|png|webp|gif|bmp|tif{1,2}|heic|heif|avif)$/i.test(file.name);
      if (file.type && !file.type.startsWith("image/") && !looksLikeImage) {
        toast.error("Please choose an image file");
        onFileChange(null);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    }

    setPreviewUrl(URL.createObjectURL(file));
    setFileName(file.name);
    setFileSizeLabel(formatBytes(file.size));
    onFileChange(file);
  }

  function clearFile() {
    handleFileSelect(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        disabled={disabled}
        onChange={(event) => handleFileSelect(event.target.files?.[0] ?? null)}
      />

      {!previewUrl ? (
        <div className="space-y-2">
          {enableScanner ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setScannerOpen(true)}
                className={cn(
                  "flex min-h-[140px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-6 text-center transition-colors",
                  "hover:border-primary/60 hover:bg-primary/10",
                  disabled && "cursor-not-allowed opacity-60"
                )}
              >
                <Camera className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">Scan in frame</span>
                <span className="text-xs text-muted-foreground">Keep the card inside the corners</span>
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "flex min-h-[140px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 bg-muted/20 px-4 py-6 text-center transition-colors",
                  "hover:border-primary/50 hover:bg-muted/40",
                  disabled && "cursor-not-allowed opacity-60"
                )}
              >
                <ImagePlus className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{hint}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex min-h-[140px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-6 text-center transition-colors",
                "hover:border-primary/50 hover:bg-primary/10",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              <ImagePlus className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">{hint}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-muted/20">
          <div className="relative aspect-[1.586] w-full bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Document preview" className="h-full w-full object-contain" />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8 rounded-full"
              onClick={clearFile}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3 border-t px-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">{fileName}</p>
              <p className="text-xs text-muted-foreground">Original size: {fileSizeLabel}</p>
            </div>
            <div className="flex gap-2">
              {enableScanner && (
                <Button type="button" variant="outline" size="sm" onClick={() => setScannerOpen(true)} disabled={disabled}>
                  Rescan
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={disabled}>
                Replace
              </Button>
            </div>
          </div>
        </div>
      )}

      <LicenceCardScanner
        open={scannerOpen}
        title={scannerTitle}
        onCapture={handleFileSelect}
        onClose={() => setScannerOpen(false)}
      />
    </div>
  );
}
