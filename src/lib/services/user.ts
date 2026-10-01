import { prisma } from "@/lib/db";
import type { UserSearchParams } from "@/lib/validations/user";
import type { Prisma, UserRole, UserStatus } from "@prisma/client";

export async function getUsers(params: UserSearchParams) {
  const { search, role, status, page, limit } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(role && role !== "ALL" ? { role: role as UserRole } : {}),
    ...(status && status !== "ALL" ? { status: status as UserStatus } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        subscriptionExpiresAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getUserById(id: string) {
  return prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      subscriptionExpiresAt: true,
    },
  });
}

export async function isEmailTaken(email: string, excludeId?: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const existing = await prisma.user.findFirst({
    where: {
      email: normalized,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
  return !!existing;
}

export async function countActiveSuperAdmins(excludeId?: string) {
  return prisma.user.count({
    where: {
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
}
