import { unstable_cache, updateTag } from "next/cache";
import { prisma } from "@/lib/db";

export const CACHE_TAGS = {
  dashboard: "dashboard",
  notifications: "notifications",
  chart: "dashboard-chart",
  profitability: "profitability",
  settings: "system-settings",
  reports: "reports",
} as const;

export function invalidateOperationalCaches() {
  try {
    updateTag(CACHE_TAGS.dashboard);
    updateTag(CACHE_TAGS.chart);
    updateTag(CACHE_TAGS.profitability);
    updateTag(CACHE_TAGS.reports);
  } catch (error) {
    console.error("invalidateOperationalCaches:", error);
  }
}

export function getCachedNotificationCount(userId: string) {
  return unstable_cache(
    async () =>
      prisma.notification.count({
        where: {
          OR: [{ userId }, { userId: null }],
          isRead: false,
        },
      }),
    [`notification-count-${userId}`],
    { revalidate: 20, tags: [CACHE_TAGS.notifications] }
  )();
}
