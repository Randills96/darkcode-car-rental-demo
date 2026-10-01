import { mkdir, unlink, writeFile, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import {
  deleteDocumentObject,
  getDocumentObject,
  isObjectStorageEnabled,
  putDocumentObject,
} from "@/lib/uploads/object-storage";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "customer-documents");

export function getCustomerDocumentRelativePath(customerId: string, fileName: string) {
  return path.posix.join("customer-documents", customerId, fileName);
}

export function getCustomerDocumentAbsolutePath(relativePath: string) {
  const normalized = relativePath.replace(/^\/+/, "").replace(/\\/g, "/");
  if (!normalized.startsWith("customer-documents/")) {
    throw new Error("Invalid document path");
  }

  const absolutePath = path.resolve(process.cwd(), "uploads", normalized);
  const allowedRoot = path.resolve(UPLOAD_ROOT);

  if (!absolutePath.startsWith(allowedRoot)) {
    throw new Error("Invalid document path");
  }

  return absolutePath;
}

export async function saveCustomerDocumentImage(
  customerId: string,
  buffer: Buffer,
  extension: string
) {
  const fileName = `${randomUUID()}.${extension}`;
  const relativePath = getCustomerDocumentRelativePath(customerId, fileName);

  if (isObjectStorageEnabled()) {
    await putDocumentObject(relativePath, buffer, "image/jpeg");
    return relativePath;
  }

  if (process.env.VERCEL) {
    throw new Error("Photo storage is not configured. Set Cloudflare R2 environment variables.");
  }

  const absolutePath = getCustomerDocumentAbsolutePath(relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);

  return relativePath;
}

export async function readCustomerDocumentFile(relativePath: string) {
  if (isObjectStorageEnabled()) {
    return getDocumentObject(relativePath);
  }

  return readFile(getCustomerDocumentAbsolutePath(relativePath));
}

export async function deleteCustomerDocumentFile(relativePath: string | null | undefined) {
  if (!relativePath) return;

  try {
    if (isObjectStorageEnabled()) {
      await deleteDocumentObject(relativePath);
      return;
    }

    const absolutePath = getCustomerDocumentAbsolutePath(relativePath);
    await unlink(absolutePath);
  } catch {
    // File may already be removed; ignore missing file errors.
  }
}

export function buildDocumentDownloadName(input: {
  documentType: string;
  documentNumber?: string | null;
  extension?: string;
}) {
  const type = input.documentType.toLowerCase().replace(/_/g, "-");
  const number = input.documentNumber?.trim().replace(/[^\w-]+/g, "-");
  const base = number ? `${type}-${number}` : type;
  return `${base}.${input.extension ?? "jpg"}`;
}
