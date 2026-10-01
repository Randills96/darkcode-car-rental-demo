"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NotificationSeverityBadge } from "@/components/notifications/notification-severity-badge";
import { markNotificationAsRead } from "@/app/notifications/actions";
import { formatDateTime } from "@/lib/utils";
import type { Notification } from "@prisma/client";

function getNotificationLink(notification: Notification): string | null {
  if (!notification.entityType || !notification.entityId) return null;
  switch (notification.entityType) {
    case "Rental":
      return `/rentals/${notification.entityId}`;
    case "VehicleDocument":
      return `/vehicles/documents`;
    case "VehicleMaintenance":
      return `/maintenance`;
    case "Vehicle":
      return `/vehicles/${notification.entityId}`;
    case "Customer":
      return `/customers/${notification.entityId}/edit`;
    default:
      return null;
  }
}

interface NotificationListProps {
  notifications: Notification[];
}

export function NotificationList({ notifications }: NotificationListProps) {
  const router = useRouter();

  async function handleMarkRead(id: string) {
    const result = await markNotificationAsRead(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => {
        const href = getNotificationLink(notification);
        return (
          <Card
            key={notification.id}
            className={notification.isRead ? "opacity-70" : "border-primary/20 bg-primary/5"}
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium">{notification.title}</h3>
                    <NotificationSeverityBadge severity={notification.severity} />
                    {!notification.isRead && (
                      <span className="text-xs font-medium text-primary">New</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(notification.createdAt)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {href && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={href}>View</Link>
                    </Button>
                  )}
                  {!notification.isRead && (
                    <Button variant="secondary" size="sm" onClick={() => handleMarkRead(notification.id)}>
                      Mark Read
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
