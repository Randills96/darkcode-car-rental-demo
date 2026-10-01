"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  IDLE_ACTIVITY_EVENTS,
  IDLE_ACTIVITY_STORAGE_KEY,
  IDLE_TIMEOUT_MS,
} from "@/lib/auth/session-timeout";

const LOCAL_ACTIVITY_THROTTLE_MS = 1_000;
const SERVER_UPDATE_THROTTLE_MS = 30_000;

export function IdleSessionGuard() {
  const pathname = usePathname();
  const { data: session, status, update } = useSession();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLocalActivityRef = useRef(0);
  const lastServerUpdateRef = useRef(0);

  const clearIdleTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const signOutIdle = useCallback(() => {
    clearIdleTimer();
    localStorage.removeItem(IDLE_ACTIVITY_STORAGE_KEY);
    void signOut({ redirect: false }).then(() => {
      window.location.replace("/login?reason=idle");
    });
  }, [clearIdleTimer]);

  const scheduleSignOut = useCallback(() => {
    clearIdleTimer();

    const now = Date.now();
    const stored = localStorage.getItem(IDLE_ACTIVITY_STORAGE_KEY);
    const parsed = stored ? Number(stored) : NaN;
    const lastActivity = Number.isFinite(parsed) ? parsed : now;
    const remaining = IDLE_TIMEOUT_MS - (now - lastActivity);

    if (remaining <= 0) {
      signOutIdle();
      return;
    }

    timeoutRef.current = setTimeout(signOutIdle, remaining);
  }, [clearIdleTimer, signOutIdle]);

  const recordActivity = useCallback(() => {
    if (status !== "authenticated" || session?.error === "SessionExpired") return;

    const now = Date.now();
    if (now - lastLocalActivityRef.current < LOCAL_ACTIVITY_THROTTLE_MS) {
      return;
    }
    lastLocalActivityRef.current = now;

    localStorage.setItem(IDLE_ACTIVITY_STORAGE_KEY, String(now));
    scheduleSignOut();

    if (now - lastServerUpdateRef.current >= SERVER_UPDATE_THROTTLE_MS) {
      lastServerUpdateRef.current = now;
      void update({ lastActivity: now });
    }
  }, [scheduleSignOut, session?.error, status, update]);

  useEffect(() => {
    if (pathname.startsWith("/login") || status !== "authenticated" || session?.error === "SessionExpired") {
      clearIdleTimer();
      return;
    }

    const now = Date.now();
    localStorage.setItem(IDLE_ACTIVITY_STORAGE_KEY, String(now));
    lastLocalActivityRef.current = now;
    lastServerUpdateRef.current = now;
    scheduleSignOut();

    const onActivity = () => recordActivity();
    for (const event of IDLE_ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        recordActivity();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const onStorage = (event: StorageEvent) => {
      if (event.key === IDLE_ACTIVITY_STORAGE_KEY) {
        scheduleSignOut();
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      clearIdleTimer();
      for (const event of IDLE_ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [clearIdleTimer, pathname, recordActivity, scheduleSignOut, session?.error, status]);

  return null;
}
