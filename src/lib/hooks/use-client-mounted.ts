"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

/** Avoid hydration mismatch for client-only UI (theme, portals). */
export function useClientMounted() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
