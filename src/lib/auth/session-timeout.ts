/** Sign out after this much time without user activity. */
export const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

export const IDLE_TIMEOUT_MINUTES = IDLE_TIMEOUT_MS / 60_000;

export const IDLE_ACTIVITY_STORAGE_KEY = "redknot-last-activity";

export const IDLE_ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

export function isSessionIdleExpired(lastActivity: number | undefined, now = Date.now()): boolean {
  if (lastActivity == null) return false;
  return now - lastActivity > IDLE_TIMEOUT_MS;
}
