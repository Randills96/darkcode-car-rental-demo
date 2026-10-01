"use client";

import type { DrivingLicenceScanResult } from "@/lib/ai/document-scan";
import { parseDrivingLicenceText, mergeLicencePageTexts } from "@/lib/ai/licence-text-parse";

const MAX_EDGE_PX = 1800;
const MIN_EDGE_PX = 1100;
const JPEG_QUALITY = 0.82;

async function bitmapFromFile(file: File) {
  try {
    return await createImageBitmap(file);
  } catch {
    return null;
  }
}

function canvasToFile(canvas: HTMLCanvasElement, name: string) {
  return new Promise<File | null>((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        resolve(new File([blob], name, { type: "image/jpeg" }));
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

function enhanceBitmap(bitmap: ImageBitmap) {
  const longest = Math.max(bitmap.width, bitmap.height);
  const shortest = Math.min(bitmap.width, bitmap.height);
  let scale = 1;
  if (longest > MAX_EDGE_PX) scale = MAX_EDGE_PX / longest;
  else if (shortest < MIN_EDGE_PX) scale = MIN_EDGE_PX / shortest;

  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.drawImage(bitmap, 0, 0, width, height);

  const image = context.getImageData(0, 0, width, height);
  const data = image.data;
  let min = 255;
  let max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    min = Math.min(min, gray);
    max = Math.max(max, gray);
  }
  const span = Math.max(1, max - min);
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const stretched = ((gray - min) / span) * 255;
    const value = stretched < 150 ? Math.max(0, stretched * 0.65) : Math.min(255, stretched * 1.15);
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

export async function preparePhotoForAiScan(file: File): Promise<File> {
  const bitmap = await bitmapFromFile(file);
  if (!bitmap) return file;
  const longest = Math.max(bitmap.width, bitmap.height);
  if (longest <= 2048 && file.size < 5 * 1024 * 1024) {
    bitmap.close();
    return file;
  }
  const scale = longest > 2048 ? 2048 / longest : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const compressed = await canvasToFile(canvas, `${file.name.replace(/\.[^.]+$/, "") || "licence"}.jpg`);
  return compressed || file;
}

export async function compressImageForScan(file: File): Promise<File> {
  const bitmap = await bitmapFromFile(file);
  if (!bitmap) return file;
  const canvas = enhanceBitmap(bitmap);
  bitmap.close();
  const compressed = await canvasToFile(canvas, `${file.name.replace(/\.[^.]+$/, "") || "licence"}.jpg`);
  return compressed || file;
}

async function recognizePages(files: File[]) {
  const mod = await import("tesseract.js");
  const createWorker = mod.createWorker ?? ("default" in mod ? mod.default.createWorker : undefined);
  if (!createWorker) {
    throw new Error("Could not start licence reading on this device");
  }

  let worker: Awaited<ReturnType<typeof createWorker>>;
  try {
    worker = await createWorker("eng+sin", 1);
  } catch {
    worker = await createWorker("eng", 1);
  }

  const pages: string[] = [];
  try {
    const psm = mod.PSM ?? ("default" in mod ? mod.default.PSM : undefined);
    await worker.setParameters({ tessedit_pageseg_mode: psm?.SINGLE_BLOCK ?? "6" });
    for (const file of files) {
      const result = await worker.recognize(file);
      pages.push(result.data.text || "");
    }

    const firstPass = parseDrivingLicenceText(pages.join("\n\n"));
    if (firstPass.fullName && firstPass.address) return pages;

    await worker.setParameters({ tessedit_pageseg_mode: psm?.SINGLE_COLUMN ?? "4" });
    const retry: string[] = [];
    for (const file of files) {
      const result = await worker.recognize(file);
      retry.push(result.data.text || "");
    }
    return [...pages, ...retry];
  } finally {
    await worker.terminate();
  }
}

export async function scanLicencePhotosOnDevice(
  front: File | null,
  back: File | null
): Promise<DrivingLicenceScanResult> {
  const files = [front, back].filter((file): file is File => Boolean(file));
  const enhanced: File[] = [];
  for (const file of files) {
    enhanced.push(await compressImageForScan(file));
  }

  const pages = await recognizePages(enhanced);
  const parsed = mergeLicencePageTexts(pages);
  return {
    fullName: parsed.fullName || "",
    nic: parsed.nic || "",
    address: parsed.address || "",
    drivingLicenceNumber: parsed.drivingLicenceNumber || "",
    drivingLicenceExpiry: parsed.drivingLicenceExpiry || "",
    confidence: parsed.confidence || "low",
    notes: parsed.notes || "",
  };
}
