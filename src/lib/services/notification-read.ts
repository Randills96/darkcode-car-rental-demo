export const BROADCAST_READ_ENTITY = "BROADCAST_READ";

export function isBroadcastReadReceipt(notification: {
  entityType?: string | null;
}): boolean {
  return notification.entityType === BROADCAST_READ_ENTITY;
}

export function overlayBroadcastReadState<
  T extends { id: string; userId: string | null; isRead: boolean; entityType?: string | null },
>(notifications: T[], readBroadcastIds: Iterable<string>): T[] {
  const read = new Set(readBroadcastIds);
  return notifications
    .filter((notification) => !isBroadcastReadReceipt(notification))
    .map((notification) => {
      if (notification.userId === null && read.has(notification.id)) {
        return { ...notification, isRead: true };
      }
      return notification;
    });
}

export function isUnreadForUser(
  notification: { id: string; userId: string | null; isRead: boolean; entityType?: string | null },
  readBroadcastIds: Iterable<string>
): boolean {
  if (isBroadcastReadReceipt(notification)) return false;
  if (notification.userId === null) {
    return !new Set(readBroadcastIds).has(notification.id);
  }
  return !notification.isRead;
}
