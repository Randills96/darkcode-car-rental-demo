import Link from "next/link";
import { Bell } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { NotificationList } from "@/components/notifications/notification-list";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { SyncAlertsButton } from "@/components/notifications/sync-alerts-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { getNotifications } from "@/lib/services/notification";
import { notificationSearchSchema } from "@/lib/validations/notification";

interface NotificationsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const session = await requirePermission("notifications.view");
  const params = notificationSearchSchema.parse(await searchParams);

  const { notifications, total, page, totalPages } = await getNotifications(session.user.id, params);

  return (
    <DashboardShell title="Notifications">
      <PageHeader
        title="Notification Center"
        description={`${total} notification${total !== 1 ? "s" : ""}${params.filter === "unread" ? " (unread)" : ""}`}
        actions={
          <>
            <Button variant={params.filter === "all" ? "default" : "outline"} size="sm" asChild>
              <Link href="/notifications">All</Link>
            </Button>
            <Button variant={params.filter === "unread" ? "default" : "outline"} size="sm" asChild>
              <Link href="/notifications?filter=unread">Unread</Link>
            </Button>
            <SyncAlertsButton />
            <MarkAllReadButton />
          </>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications"
              description={params.filter === "unread" ? "You're all caught up." : "System alerts will appear here."}
            />
          ) : (
            <>
              <NotificationList notifications={notifications} />
              <Pagination
                page={page}
                totalPages={totalPages}
                baseUrl="/notifications"
                searchParams={{ filter: params.filter !== "all" ? params.filter : undefined }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
