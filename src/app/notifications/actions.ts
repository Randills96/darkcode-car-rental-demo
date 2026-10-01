"use server";

import { revalidatePath, updateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";
import { requirePermission, requireAuth } from "@/lib/auth/session";
import {
  markAllNotificationsRead,
  markNotificationRead,
  syncSystemNotifications,
} from "@/lib/services/notification";
import type { ActionResult } from "@/app/customers/actions";

export async function markNotificationAsRead(id: string): Promise<ActionResult> {
  try {
    const session = await requirePermission("notifications.view");
    const updated = await markNotificationRead(id, session.user.id);
    if (!updated) return { success: false, error: "Notification not found" };
    revalidatePath("/notifications");
    updateTag(CACHE_TAGS.notifications);
    return { success: true, message: "Notification marked as read" };
  } catch (error) {
    console.error("markNotificationAsRead:", error);
    return { success: false, error: "Failed to update notification" };
  }
}

export async function markAllNotificationsAsRead(): Promise<ActionResult> {
  try {
    const session = await requirePermission("notifications.view");
    await markAllNotificationsRead(session.user.id);
    revalidatePath("/notifications");
    updateTag(CACHE_TAGS.notifications);
    return { success: true, message: "All notifications marked as read" };
  } catch (error) {
    console.error("markAllNotificationsAsRead:", error);
    return { success: false, error: "Failed to update notifications" };
  }
}

export async function refreshSystemNotifications(): Promise<ActionResult<{ synced: number }>> {
  try {
    await requireAuth();
    const synced = await syncSystemNotifications();
    if (synced > 0) {
      revalidatePath("/");
      revalidatePath("/notifications");
      updateTag(CACHE_TAGS.notifications);
    }
    return { success: true, data: { synced }, message: "Notifications refreshed" };
  } catch (error) {
    console.error("refreshSystemNotifications:", error);
    return { success: false, error: "Failed to refresh notifications" };
  }
}
