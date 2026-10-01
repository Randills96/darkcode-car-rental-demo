import { prisma } from "@/lib/db";
import type { AuditSearchParams } from "@/lib/validations/audit";
import type { AuditAction, Prisma } from "@prisma/client";

interface AuditLogInput {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details?: Prisma.InputJsonValue;
}

export async function createAuditLog(input: AuditLogInput) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      details: input.details ?? undefined,
    },
  });
}

export async function getAuditLogs(params: AuditSearchParams) {
  const { search, entityType, action, page, limit } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {
    ...(entityType && entityType !== "ALL" ? { entityType } : {}),
    ...(action && action !== "ALL" ? { action: action as AuditAction } : {}),
    ...(search
      ? {
          OR: [
            { entityType: { contains: search } },
            { entityId: { contains: search } },
            { user: { name: { contains: search } } },
            { user: { email: { contains: search } } },
          ],
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getAuditEntityTypes() {
  const types = await prisma.auditLog.findMany({
    distinct: ["entityType"],
    select: { entityType: true },
    orderBy: { entityType: "asc" },
  });
  return types.map((t) => t.entityType);
}
