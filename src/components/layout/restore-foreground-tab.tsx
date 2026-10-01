"use client";

import { useEffect } from "react";

/** Radix dialogs can leave the body locked if they unmount while a new tab is opening. */
export function unlockStuckDialogScroll() {
  if (typeof document === "undefined") return;
  if (document.querySelector("[data-radix-dialog-overlay]")) return;
  document.body.style.pointerEvents = "";
  document.body.style.removeProperty("overflow");
  document.body.removeAttribute("data-scroll-locked");
  document.documentElement.style.pointerEvents = "";
}

export function RestoreForegroundTab() {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
        return;
      }
      unlockStuckDialogScroll();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        unlockStuckDialogScroll();
      }
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
