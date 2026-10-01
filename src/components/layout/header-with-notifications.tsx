import { getCachedNotificationCount } from "@/lib/cache";
import { Header } from "./header";
import type { UserRole } from "@prisma/client";

interface HeaderWithNotificationsProps {
  title?: string;
  userName: string;
  userRole: UserRole;
  userId: string;
  companyName?: string;
}

export async function HeaderWithNotifications({
  title,
  userName,
  userRole,
  userId,
  companyName,
}: HeaderWithNotificationsProps) {
  const notificationCount = await getCachedNotificationCount(userId);

  return (
    <Header
      title={title}
      userName={userName}
      userRole={userRole}
      notificationCount={notificationCount}
      companyName={companyName}
    />
  );
}
