"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markAllNotificationsAsRead } from "@/app/notifications/actions";

export function MarkAllReadButton() {
  const router = useRouter();

  async function handleClick() {
    const result = await markAllNotificationsAsRead();
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      <CheckCheck className="h-4 w-4 mr-2" />
      Mark All Read
    </Button>
  );
}
