import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

let defaultCurrencySymbol = "Rs.";

export function setDefaultCurrencySymbol(symbol?: string | null) {
  const next = symbol?.trim();
  if (next) defaultCurrencySymbol = next;
}

export function getDefaultCurrencySymbol() {
  return defaultCurrencySymbol;
}

export function formatCurrency(
  amount: number | string | { toString(): string },
  symbol = getDefaultCurrencySymbol()
) {
  const num = typeof amount === "number" ? amount : parseFloat(amount.toString());
  return `${symbol} ${num.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function stripCurrencySymbol(
  formatted: string,
  symbol = getDefaultCurrencySymbol()
) {
  return formatted.replace(`${symbol} `, "").replace(/^Rs\.\s*/, "");
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!(d instanceof Date) || isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

export function getCurrentTimeHHMM(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function generateCode(prefix: string, sequence: number) {
  return `${prefix}-${String(sequence).padStart(5, "0")}`;
}

export function decimalToNumber(value: { toString(): string } | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : parseFloat(value.toString());
}

export function formatCommissionBreakdown(input: {
  perDay: number;
  perExtraKm: number;
  days: number;
  extraKm: number;
}): string {
  const parts: string[] = [];

  if (input.perDay > 0 && input.days > 0) {
    parts.push(`${formatCurrency(input.perDay)}/day × ${input.days}d`);
  }

  if (input.perExtraKm > 0 && input.extraKm > 0) {
    parts.push(`${formatCurrency(input.perExtraKm)}/km × ${input.extraKm}km`);
  }

  if (parts.length > 0) return parts.join(" + ");
  if (input.days > 0 || input.extraKm > 0) return "Flat settlement";
  return "—";
}

export function usesFormulaCommissionBreakdown(input: {
  perDay: number;
  perExtraKm: number;
}): boolean {
  return input.perDay > 0 || input.perExtraKm > 0;
}

export function getDocumentExpiryStatus(expiryDate: Date | null): {
  label: string;
  severity: "expired" | "critical" | "warning" | "ok";
} {
  if (!expiryDate) return { label: "No expiry", severity: "ok" };
  const now = new Date();
  const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86400000);
  if (expiryDate < now) return { label: "Expired", severity: "expired" };
  if (expiryDate <= addDays(now, 7)) return { label: "Expiring in 7 days", severity: "critical" };
  if (expiryDate <= addDays(now, 21)) return { label: "Expiring in 21 days", severity: "warning" };
  if (expiryDate <= addDays(now, 30)) return { label: "Expiring in 30 days", severity: "warning" };
  return { label: "Valid", severity: "ok" };
}

export function getLicenceExpiryStatus(expiryDate: Date): {
  label: string;
  severity: "expired" | "critical" | "warning" | "ok";
} {
  const now = new Date();
  const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86400000);
  if (expiryDate < now) return { label: "Expired", severity: "expired" };
  if (expiryDate <= addDays(now, 30)) return { label: "Expiring soon", severity: "warning" };
  return { label: "Valid", severity: "ok" };
}

/**
 * Normalizes Sri Lankan and international phone numbers:
 * - Trims whitespace
 * - Strips punctuation (spaces, hyphens, brackets, dots)
 * - Converts "+94", "0094", or "94" prefix to leading "0" for Sri Lankan numbers
 * - Prepends leading "0" if 9 digits starting with 7
 * - Retains international format (+[country code]...)
 */
export function normalizePhone(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  const cleaned = trimmed.replace(/[\s\-\(\)\.]/g, "");
  if (cleaned.startsWith("+94")) {
    return "0" + cleaned.slice(3);
  }
  if (cleaned.startsWith("0094")) {
    return "0" + cleaned.slice(4);
  }
  if (cleaned.startsWith("94") && cleaned.length === 11) {
    return "0" + cleaned.slice(2);
  }
  if (!cleaned.startsWith("0") && !cleaned.startsWith("+") && cleaned.length === 9) {
    return "0" + cleaned;
  }
  return cleaned;
}

/**
 * Normalizes NIC and passport strings:
 * - Trims whitespace
 * - Converts to uppercase
 * - Strips internal spaces and hyphens
 */
export function normalizeNic(value: string | null | undefined): string {
  if (!value) return "";
  return value.trim().toUpperCase().replace(/[\s-]/g, "");
}

/**
 * Standard phone regex accepting 10-digit Sri Lankan numbers (starting with 0)
 * or international format (+ followed by 7-15 digits).
 */
export const phoneRegex = /^(0\d{9}|\+?[1-9]\d{6,14})$/;

/**
 * Standard NIC regex accepting:
 * - Sri Lankan old NIC (9 digits + V/X)
 * - Sri Lankan new NIC (12 digits)
 * - Foreign Passport / ID (6-15 alphanumeric chars)
 */
export const nicRegex = /^(\d{9}[vVxX]|\d{12}|[A-Za-z0-9]{6,15})$/;
