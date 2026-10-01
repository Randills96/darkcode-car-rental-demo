"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DocumentImageUpload } from "@/components/customers/document-image-upload";
import { getAiStatus, scanDrivingLicence } from "@/app/ai/actions";
import type { DrivingLicenceScanResult } from "@/lib/ai/document-scan";
import { licenceScanFilledCount } from "@/lib/ai/licence-text-parse";
import {
  compressImageForScan,
  preparePhotoForAiScan,
  scanLicencePhotosOnDevice,
} from "@/components/customers/licence-client-ocr";

interface LicenceScanPanelProps {
  disabled?: boolean;
  frontFile: File | null;
  backFile: File | null;
  onFrontChange: (file: File | null) => void;
  onBackChange: (file: File | null) => void;
  onFilled: (result: DrivingLicenceScanResult) => void;
}

function fileKey(file: File | null) {
  return file ? `${file.name}:${file.size}:${file.lastModified}` : "";
}

function toScanResult(result: DrivingLicenceScanResult): DrivingLicenceScanResult {
  return {
    fullName: result.fullName || "",
    nic: result.nic || "",
    address: result.address || "",
    drivingLicenceNumber: result.drivingLicenceNumber || "",
    drivingLicenceExpiry: result.drivingLicenceExpiry || "",
    confidence: result.confidence || "medium",
    notes: result.notes || "",
  };
}

export function LicenceScanPanel({
  disabled,
  frontFile,
  backFile,
  onFrontChange,
  onBackChange,
  onFilled,
}: LicenceScanPanelProps) {
  const [scanning, setScanning] = useState(false);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const lastScanKey = useRef("");
  const scanInFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getAiStatus()
      .then((status) => {
        if (!cancelled) setAiEnabled(status.enabled);
      })
      .catch(() => {
        if (!cancelled) setAiEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function runScan(front: File | null, back: File | null, options?: { manual?: boolean }) {
    if (!front && !back) {
      if (options?.manual) toast.error("Upload a driving licence photo first");
      return;
    }

    const key = `${fileKey(front)}|${fileKey(back)}`;
    if (!options?.manual && key === lastScanKey.current) return;
    if (scanInFlight.current) return;

    scanInFlight.current = true;
    setScanning(true);
    try {
      if (aiEnabled === true) {
        const aiFront = front ? await preparePhotoForAiScan(front) : null;
        const aiBack = back ? await preparePhotoForAiScan(back) : null;

        const formData = new FormData();
        if (aiFront) formData.set("front", aiFront);
        if (aiBack) formData.set("back", aiBack);

        const result = await scanDrivingLicence(formData);
        if (result.success && licenceScanFilledCount(result.data.result) > 0) {
          lastScanKey.current = key;
          onFilled(toScanResult(result.data.result));
          toast.success(result.message ?? "Details filled from the licence — please check and edit if needed");
          return;
        }
      }

      const compressedFront = front ? await compressImageForScan(front) : null;
      const compressedBack = back ? await compressImageForScan(back) : null;
      const local = toScanResult(await scanLicencePhotosOnDevice(compressedFront, compressedBack));
      if (licenceScanFilledCount(local) > 0) {
        lastScanKey.current = key;
        onFilled(local);
        toast.success("Filled details from the licence photo — please check and edit if needed");
        return;
      }

      toast.error("Could not read the licence clearly — enter the details manually");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to scan driving licence");
    } finally {
      scanInFlight.current = false;
      setScanning(false);
    }
  }

  function handleFrontChange(file: File | null) {
    onFrontChange(file);
    if (file) void runScan(file, backFile);
  }

  function handleBackChange(file: File | null) {
    onBackChange(file);
    if (file) void runScan(frontFile, file);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Scan the front in frame first. Full name is field 1.2 then 1. Address is the line under
        the name on the front. The back is the vehicle-class table — scan it only if the front
        photo is unclear. Check every filled field.
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Driving Licence — Front</Label>
          <DocumentImageUpload
            disabled={disabled || scanning}
            onFileChange={handleFrontChange}
            enableScanner
            scannerTitle="Scan licence front"
            label="Upload front photo"
            hint="Or pick a photo from the gallery"
          />
        </div>
        <div className="space-y-2">
          <Label>Driving Licence — Back</Label>
          <DocumentImageUpload
            disabled={disabled || scanning}
            onFileChange={handleBackChange}
            enableScanner
            scannerTitle="Scan licence back"
            label="Upload back photo"
            hint="Vehicle classes — optional if the front is clear"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || scanning || (!frontFile && !backFile)}
          onClick={() => void runScan(frontFile, backFile, { manual: true })}
        >
          {scanning ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ScanLine className="mr-2 h-4 w-4" />
          )}
          {scanning ? "Reading licence..." : "Scan licence & fill details"}
        </Button>
        <p className="text-xs text-muted-foreground">
          After filling, edit any field that looks wrong.
        </p>
      </div>
    </div>
  );
}
