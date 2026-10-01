import type { UserRole } from "@prisma/client";
import { hasPermission } from "../permissions";

export function isDriverRole(role: UserRole): boolean {
  return role === "DRIVER";
}

/** Hire receipts and PDFs. Drivers must not open another hire by changing the URL. */
export function canAccessHireReceipt(role: UserRole): boolean {
  return hasPermission(role, "rentals.receipt");
}

/**
 * Hire detail / edit / refund pages.
 * Until a User is linked to a Driver master record, Drivers cannot be scoped
 * to assigned hires, so they are blocked from record-level rental pages.
 */
export function canAccessHireRecordPages(role: UserRole): boolean {
  return hasPermission(role, "rentals.view") && !isDriverRole(role);
}

export function canAccessSettlementReceipt(role: UserRole): boolean {
  return hasPermission(role, "settlements.view");
}

export function canCancelRental(role: UserRole): boolean {
  return hasPermission(role, "rentals.cancel");
}
