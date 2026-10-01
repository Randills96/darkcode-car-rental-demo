const STORAGE_PREFIX = "redknot:onboarding:completed";

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function isTourCompleted(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(storageKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function markTourCompleted(userId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId), "1");
  } catch {
    // Ignore storage failures (private mode, quota, etc.)
  }
}

export function resetTourCompleted(userId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(userId));
  } catch {
    // Ignore storage failures
  }
}
