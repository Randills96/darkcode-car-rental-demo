import { prisma } from "@/lib/db";
import { addDays, startOfDay } from "date-fns";
import type { NotificationSeverity } from "@prisma/client";
import type { NotificationSearchParams } from "@/lib/validations/notification";
import { formatCurrency } from "@/lib/utils";
import {
  BROADCAST_READ_ENTITY,
  overlayBroadcastReadState,
} from "@/lib/services/notification-read";
import {
  buildPickupReminderMessage,
  buildReturnReminderMessage,
  getBookingReminderRentals,
} from "@/lib/services/upcoming-jobs";

interface AlertCandidate {
  title: string;
  message: string;
  severity: NotificationSeverity;
  entityType?: string;
  entityId?: string;
}

async function getReadBroadcastIds(userId: string): Promise<string[]> {
  const receipts = await prisma.notification.findMany({
    where: { userId, entityType: BROADCAST_READ_ENTITY },
    select: { entityId: true },
  });
  return receipts.map((row) => row.entityId).filter((id): id is string => Boolean(id));
}

function visibleNotificationWhere(userId: string, readBroadcastIds: string[], unreadOnly: boolean) {
  const notReceipt = { NOT: { entityType: BROADCAST_READ_ENTITY } };
  const visibleToUser = {
    AND: [notReceipt, { OR: [{ userId }, { userId: null }] }],
  };

  if (!unreadOnly) return visibleToUser;

  const unreadBroadcast =
    readBroadcastIds.length > 0
      ? { userId: null, id: { notIn: readBroadcastIds } }
      : { userId: null };

  return {
    AND: [
      notReceipt,
      {
        OR: [{ userId, isRead: false }, unreadBroadcast],
      },
    ],
  };
}

export async function getNotifications(userId: string, params: NotificationSearchParams) {
  const { filter, page, limit } = params;
  const skip = (page - 1) * limit;
  const readBroadcastIds = await getReadBroadcastIds(userId);
  const where = visibleNotificationWhere(userId, readBroadcastIds, filter === "unread");

  const [rows, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  const notifications = overlayBroadcastReadState(rows, readBroadcastIds);
  return { notifications, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getUnreadNotificationCount(userId: string) {
  const readBroadcastIds = await getReadBroadcastIds(userId);
  return prisma.notification.count({
    where: visibleNotificationWhere(userId, readBroadcastIds, true),
  });
}

async function ensureBroadcastReadReceipt(notificationId: string, userId: string) {
  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      entityType: BROADCAST_READ_ENTITY,
      entityId: notificationId,
    },
    select: { id: true },
  });
  if (existing) return;

  await prisma.notification.create({
    data: {
      userId,
      title: "Read",
      message: "",
      severity: "INFO",
      entityType: BROADCAST_READ_ENTITY,
      entityId: notificationId,
      isRead: true,
    },
  });
}

export async function markNotificationRead(id: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: {
      id,
      OR: [{ userId }, { userId: null }],
      NOT: { entityType: BROADCAST_READ_ENTITY },
    },
  });
  if (!notification) return false;

  if (notification.userId === null) {
    await ensureBroadcastReadReceipt(id, userId);
    return true;
  }

  await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
  return true;
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
      NOT: { entityType: BROADCAST_READ_ENTITY },
    },
    data: { isRead: true },
  });

  const readBroadcastIds = await getReadBroadcastIds(userId);
  const broadcasts = await prisma.notification.findMany({
    where: {
      userId: null,
      NOT: { entityType: BROADCAST_READ_ENTITY },
      ...(readBroadcastIds.length > 0 ? { id: { notIn: readBroadcastIds } } : {}),
    },
    select: { id: true },
  });

  if (broadcasts.length === 0) return;

  await prisma.notification.createMany({
    data: broadcasts.map((broadcast) => ({
      userId,
      title: "Read",
      message: "",
      severity: "INFO" as const,
      entityType: BROADCAST_READ_ENTITY,
      entityId: broadcast.id,
      isRead: true,
    })),
  });
}

async function notificationExists(candidate: AlertCandidate) {
  if (!candidate.entityType || !candidate.entityId) return false;
  const existing = await prisma.notification.findFirst({
    where: {
      entityType: candidate.entityType,
      entityId: candidate.entityId,
      title: candidate.title,
      isRead: false,
      createdAt: { gte: addDays(new Date(), -7) },
    },
  });
  return !!existing;
}

async function createNotificationIfNew(candidate: AlertCandidate, userId?: string | null) {
  if (await notificationExists(candidate)) return;
  await prisma.notification.create({
    data: {
      userId: userId ?? null,
      title: candidate.title,
      message: candidate.message,
      severity: candidate.severity,
      entityType: candidate.entityType,
      entityId: candidate.entityId,
    },
  });
}

export async function syncSystemNotifications() {
  const now = new Date();
  const today = startOfDay(now);
  const candidates: AlertCandidate[] = [];

  const expiredDocs = await prisma.vehicleDocument.findMany({
    where: { expiryDate: { lt: now } },
    include: { vehicle: { select: { registrationNumber: true } } },
    take: 20,
  });
  for (const doc of expiredDocs) {
    candidates.push({
      title: `${doc.documentType.replace(/_/g, " ")} Expired`,
      message: `${doc.vehicle.registrationNumber} — expired ${doc.expiryDate?.toLocaleDateString("en-LK")}`,
      severity: "CRITICAL",
      entityType: "VehicleDocument",
      entityId: doc.id,
    });
  }

  const expiringSoon = await prisma.vehicleDocument.findMany({
    where: { expiryDate: { gte: now, lte: addDays(now, 21) } },
    include: { vehicle: { select: { registrationNumber: true } } },
    take: 50,
  });
  for (const doc of expiringSoon) {
    const daysLeft = Math.max(0, Math.ceil((doc.expiryDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    candidates.push({
      title: `${doc.documentType.replace(/_/g, " ")} Expiring Soon`,
      message: `${doc.vehicle.registrationNumber} — expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${doc.expiryDate?.toLocaleDateString("en-LK")})`,
      severity: daysLeft <= 7 ? "CRITICAL" : "WARNING",
      entityType: "VehicleDocument",
      entityId: doc.id,
    });
  }

  const overdueRentals = await prisma.rental.findMany({
    where: { status: "ACTIVE", returnDate: { lt: today } },
    include: {
      customer: { select: { fullName: true } },
      vehicle: { select: { registrationNumber: true } },
    },
    take: 20,
  });
  for (const rental of overdueRentals) {
    candidates.push({
      title: "Overdue Rental",
      message: `${rental.bookingNumber} — ${rental.customer.fullName} / ${rental.vehicle?.registrationNumber ?? "Unassigned"}`,
      severity: "CRITICAL",
      entityType: "Rental",
      entityId: rental.id,
    });
  }

  const serviceRecords = await prisma.vehicleMaintenance.findMany({
    where: {
      OR: [{ nextServiceDate: { not: null } }, { nextServiceKm: { not: null } }],
    },
    include: {
      vehicle: { select: { id: true, registrationNumber: true, currentOdometer: true } },
    },
    take: 30,
  });
  const deadline = addDays(today, 14);
  for (const record of serviceRecords) {
    const dateDue = record.nextServiceDate && record.nextServiceDate <= deadline;
    const kmDue =
      record.nextServiceKm != null && record.vehicle.currentOdometer >= record.nextServiceKm;
    if (!dateDue && !kmDue) continue;

    const overdue = record.nextServiceDate && record.nextServiceDate < today;
    candidates.push({
      title: overdue ? "Service Overdue" : "Service Due Soon",
      message: `${record.vehicle.registrationNumber} — ${record.maintenanceType.replace(/_/g, " ")}`,
      severity: overdue ? "CRITICAL" : "WARNING",
      entityType: "VehicleMaintenance",
      entityId: record.id,
    });
  }

  const outstanding = await prisma.rental.findMany({
    where: { balance: { gt: 0 }, status: { in: ["ACTIVE", "RETURNED", "COMPLETED"] } },
    include: { customer: { select: { fullName: true } } },
    take: 10,
  });
  for (const rental of outstanding) {
    candidates.push({
      title: "Outstanding Balance",
      message: `${rental.customer.fullName} — ${rental.bookingNumber} owes ${formatCurrency(Number(rental.balance))}`,
      severity: "WARNING",
      entityType: "Rental",
      entityId: rental.id,
    });
  }

  const { pickupTomorrow, returnTomorrow } = await getBookingReminderRentals();
  for (const rental of pickupTomorrow) {
    candidates.push({
      title: "Pickup Reminder — Tomorrow",
      message: buildPickupReminderMessage(rental),
      severity: "INFO",
      entityType: "Rental",
      entityId: rental.id,
    });
  }
  for (const rental of returnTomorrow) {
    candidates.push({
      title: "Return Reminder — Tomorrow",
      message: buildReturnReminderMessage(rental),
      severity: "WARNING",
      entityType: "Rental",
      entityId: rental.id,
    });
  }

  const expiredCustomerLicences = await prisma.customer.findMany({
    where: {
      deletedAt: null,
      drivingLicenceExpiry: { lt: now },
    },
    select: {
      id: true,
      fullName: true,
      customerCode: true,
      drivingLicenceExpiry: true,
    },
    take: 20,
  });
  for (const customer of expiredCustomerLicences) {
    candidates.push({
      title: "Customer Driving Licence Expired",
      message: `${customer.fullName} (${customer.customerCode}) — expired ${customer.drivingLicenceExpiry?.toLocaleDateString("en-LK")}. Verify licence manually before rental.`,
      severity: "CRITICAL",
      entityType: "Customer",
      entityId: customer.id,
    });
  }

  const expiringCustomerLicences = await prisma.customer.findMany({
    where: {
      deletedAt: null,
      drivingLicenceExpiry: { gte: now, lte: addDays(now, 30) },
    },
    select: {
      id: true,
      fullName: true,
      customerCode: true,
      drivingLicenceExpiry: true,
    },
    take: 20,
  });
  for (const customer of expiringCustomerLicences) {
    candidates.push({
      title: "Customer Driving Licence Expiring Soon",
      message: `${customer.fullName} (${customer.customerCode}) — expires ${customer.drivingLicenceExpiry?.toLocaleDateString("en-LK")}`,
      severity: "WARNING",
      entityType: "Customer",
      entityId: customer.id,
    });
  }

  for (const candidate of candidates) {
    await createNotificationIfNew(candidate);
  }

  const { enforceUserSubscriptions } = await import("@/lib/services/user-subscription");
  await enforceUserSubscriptions();

  return candidates.length;
}
