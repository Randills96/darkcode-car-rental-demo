import { prisma } from "@/lib/db";
import { addDays, addYears, differenceInCalendarDays } from "date-fns";
import type { UserRole, UserStatus } from "@prisma/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getSystemSettings } from "@/lib/services/settings";

export const ANNUAL_FEE_ROLES: UserRole[] = ["ADMIN", "EMPLOYEE"];
export const ANNUAL_FEE_REMINDER_DAYS = 7;

const ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Manager",
  EMPLOYEE: "Staff",
  DRIVER: "Driver",
};

export function isAnnualFeeRole(role: UserRole): boolean {
  return ANNUAL_FEE_ROLES.includes(role);
}

export function addAnnualSubscriptionPeriod(from: Date): Date {
  return addYears(from, 1);
}

export function subscriptionFieldsForRole(role: UserRole, from = new Date()) {
  if (!isAnnualFeeRole(role)) {
    return { subscriptionExpiresAt: null, annualFeeNotifiedAt: null };
  }
  return {
    subscriptionExpiresAt: addAnnualSubscriptionPeriod(from),
    annualFeeNotifiedAt: null as Date | null,
  };
}

export function isSubscriptionExpired(
  role: UserRole,
  expiresAt: Date | null | undefined,
  now = new Date()
): boolean {
  if (!isAnnualFeeRole(role) || !expiresAt) return false;
  return expiresAt.getTime() <= now.getTime();
}

export function isInAnnualFeeReminderWindow(
  role: UserRole,
  expiresAt: Date | null | undefined,
  now = new Date()
): boolean {
  if (!isAnnualFeeRole(role) || !expiresAt) return false;
  if (expiresAt.getTime() <= now.getTime()) return false;
  return expiresAt.getTime() <= addDays(now, ANNUAL_FEE_REMINDER_DAYS).getTime();
}

export function wasNotifiedForCurrentCycle(
  notifiedAt: Date | null | undefined,
  expiresAt: Date | null | undefined
): boolean {
  if (!notifiedAt || !expiresAt) return false;
  return notifiedAt.getTime() >= addDays(expiresAt, -ANNUAL_FEE_REMINDER_DAYS).getTime();
}

export function daysUntilExpiry(expiresAt: Date, now = new Date()): number {
  return differenceInCalendarDays(expiresAt, now);
}

export function formatAnnualFeePaymentMessage(input: {
  amount: number;
  currencySymbol: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBranch: string;
  expiresAt?: Date | null;
}): string {
  const parts: string[] = [];
  if (input.expiresAt) {
    parts.push(`Access ends on ${formatDate(input.expiresAt)}.`);
  }
  if (input.amount > 0) {
    parts.push(
      `Pay the annual fee of ${formatCurrency(input.amount, input.currencySymbol)} to the company bank account.`
    );
  } else {
    parts.push("Pay the annual fee to the company bank account.");
  }

  const bankBits = [
    input.bankAccountName ? `Account name: ${input.bankAccountName}` : "",
    input.bankName ? `Bank: ${input.bankName}` : "",
    input.bankBranch ? `Branch: ${input.bankBranch}` : "",
    input.bankAccountNumber ? `Account number: ${input.bankAccountNumber}` : "",
  ].filter(Boolean);

  if (bankBits.length > 0) {
    parts.push(bankBits.join(" · "));
  } else {
    parts.push("Ask Super Admin for the bank account details.");
  }

  parts.push("After payment, Super Admin can activate the account for another year.");
  return parts.join(" ");
}

async function paymentInstructionsFromSettings(
  settings: Awaited<ReturnType<typeof getSystemSettings>>,
  expiresAt?: Date | null
) {
  return formatAnnualFeePaymentMessage({
    amount: settings.annual_fee_amount,
    currencySymbol: settings.currency_symbol,
    bankName: settings.bank_name ?? "",
    bankAccountName: settings.bank_account_name ?? "",
    bankAccountNumber: settings.bank_account_number ?? "",
    bankBranch: settings.bank_branch ?? "",
    expiresAt,
  });
}

async function paymentInstructions(expiresAt?: Date | null) {
  return paymentInstructionsFromSettings(await getSystemSettings(), expiresAt);
}

async function getActiveSuperAdminIds() {
  const admins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN", status: "ACTIVE", deletedAt: null },
    select: { id: true },
  });
  return admins.map((admin) => admin.id);
}

async function notifyUsers(
  userIds: string[],
  title: string,
  message: string,
  severity: "INFO" | "WARNING" | "CRITICAL",
  entityId: string
) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      title,
      message,
      severity,
      entityType: "User",
      entityId,
    })),
  });
}

export async function backfillMissingSubscriptions(now = new Date()) {
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: { in: ANNUAL_FEE_ROLES },
      subscriptionExpiresAt: null,
    },
    select: { id: true, createdAt: true },
  });

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionExpiresAt: addAnnualSubscriptionPeriod(user.createdAt ?? now),
        annualFeeNotifiedAt: null,
      },
    });
  }

  return users.length;
}

export async function enforceUserSubscriptions(now = new Date()) {
  await backfillMissingSubscriptions(now);

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: { in: ANNUAL_FEE_ROLES },
      subscriptionExpiresAt: { not: null },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      subscriptionExpiresAt: true,
      annualFeeNotifiedAt: true,
    },
  });

  let reminded = 0;
  let deactivated = 0;
  const [superAdminIds, settings] = await Promise.all([
    getActiveSuperAdminIds(),
    getSystemSettings(),
  ]);

  for (const user of users) {
    const expiresAt = user.subscriptionExpiresAt;
    if (!expiresAt) continue;

    if (isSubscriptionExpired(user.role, expiresAt, now)) {
      if (user.status === "ACTIVE") {
        await prisma.user.update({
          where: { id: user.id },
          data: { status: "INACTIVE" },
        });
        deactivated += 1;
        const instructions = await paymentInstructionsFromSettings(settings, expiresAt);
        await notifyUsers(
          superAdminIds,
          `Account deactivated — annual fee unpaid`,
          `${user.name} (${ROLE_LABEL[user.role]}, ${user.email}) was deactivated after one year. ${instructions}`,
          "CRITICAL",
          user.id
        );
      }
      continue;
    }

    if (
      user.status === "ACTIVE" &&
      isInAnnualFeeReminderWindow(user.role, expiresAt, now) &&
      !wasNotifiedForCurrentCycle(user.annualFeeNotifiedAt, expiresAt)
    ) {
      const days = Math.max(daysUntilExpiry(expiresAt, now), 1);
      const instructions = await paymentInstructionsFromSettings(settings, expiresAt);
      await notifyUsers(
        [user.id],
        "Annual fee due in 7 days",
        `Your ${ROLE_LABEL[user.role]} account will be deactivated in ${days} day${days === 1 ? "" : "s"}. ${instructions}`,
        "WARNING",
        user.id
      );
      await notifyUsers(
        superAdminIds.filter((id) => id !== user.id),
        `Annual fee due: ${user.name}`,
        `${user.name} (${ROLE_LABEL[user.role]}) must pay the annual fee within ${days} day${days === 1 ? "" : "s"} or the account will be deactivated. ${instructions}`,
        "WARNING",
        user.id
      );
      await prisma.user.update({
        where: { id: user.id },
        data: { annualFeeNotifiedAt: now },
      });
      reminded += 1;
    }
  }

  return { reminded, deactivated };
}

export async function expireUserIfSubscriptionDue<
  T extends {
    id: string;
    role: UserRole;
    status: UserStatus;
    subscriptionExpiresAt: Date | null;
  },
>(user: T, now = new Date()): Promise<T> {
  if (!isSubscriptionExpired(user.role, user.subscriptionExpiresAt, now)) {
    return user;
  }
  if (user.status === "ACTIVE") {
    await prisma.user.update({
      where: { id: user.id },
      data: { status: "INACTIVE" },
    });
  }
  return { ...user, status: "INACTIVE" };
}

export async function getInactiveAccountLoginMessage(email: string) {
  const user = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase(), deletedAt: null },
    select: {
      role: true,
      status: true,
      subscriptionExpiresAt: true,
    },
  });
  if (!user || user.status !== "INACTIVE" || !isAnnualFeeRole(user.role)) {
    return null;
  }
  return paymentInstructions(user.subscriptionExpiresAt);
}
