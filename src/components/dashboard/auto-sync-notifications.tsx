"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { refreshSystemNotifications } from "@/app/notifications/actions";

export function AutoSyncNotifications() {
  const router = useRouter();
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current) return;
    synced.current = true;

    refreshSystemNotifications().then((result) => {
      if (result.success && (result.data?.synced ?? 0) > 0) {
        router.refresh();
      }
    });
  }, [router]);

  return null;
}
