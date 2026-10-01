"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshSystemNotifications } from "@/app/notifications/actions";

export function SyncAlertsButton() {
  const router = useRouter();

  async function handleSync() {
    const result = await refreshSystemNotifications();
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Alerts synced");
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSync}>
      <RefreshCw className="h-4 w-4 mr-2" />
      Sync Alerts
    </Button>
  );
}
