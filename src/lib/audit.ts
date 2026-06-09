import { auth } from "@/auth";
import { requireAnyPermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { AuditAction, AuditEntityType, Prisma } from "@prisma/client";
import { headers } from "next/headers";

type AuditUser = {
  id?: string | null;
  name?: string | null;
  role?: string | null;
};

type AuditValue = Prisma.InputJsonValue | null | undefined;

type CreateAuditLogInput = {
  user?: AuditUser | null;
  entityType: AuditEntityType;
  entityId?: string | null;
  entityLabel?: string | null;
  action: AuditAction;
  description: string;
  oldValue?: AuditValue;
  newValue?: AuditValue;
  workspaceId?: string | null;
  companyId?: string | null;
};

const SENSITIVE_KEYS = new Set([
  "password",
  "password_hash",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "signature",
  "signature_data",
  "signatureData",
  "file_url",
  "fileUrl",
]);

function sanitizeAuditValue(value: AuditValue): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditValue(item) ?? null);
  }

  if (typeof value === "object") {
    const clean: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(key)) {
        clean[key] = "[redacted]";
        continue;
      }

      clean[key] = sanitizeAuditValue(
        nestedValue as Prisma.InputJsonValue,
      ) ?? null;
    }

    return clean;
  }

  return value;
}

async function resolveAuditUser(user?: AuditUser | null) {
  if (user) return user;

  const session = await auth();
  const sessionUser = session?.user as
    | { id?: string; name?: string | null; email?: string | null; role?: string | null }
    | undefined;

  if (!sessionUser?.id && !sessionUser?.email) return null;

  const dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        ...(sessionUser.id ? [{ id: sessionUser.id }] : []),
        ...(sessionUser.email ? [{ email: sessionUser.email }] : []),
      ],
    },
    include: {
      roles: {
        include: { role: true },
        orderBy: { assigned_at: "asc" },
      },
    },
  });

  return {
    id: dbUser?.id ?? sessionUser.id,
    name: dbUser?.name ?? sessionUser.name ?? sessionUser.email,
    role: dbUser?.roles[0]?.role.code ?? sessionUser.role,
  };
}

export async function createAuditLog(input: CreateAuditLogInput) {
  try {
    const [user, hdrs] = await Promise.all([resolveAuditUser(input.user), headers()]);
    const ipAddress =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      hdrs.get("x-real-ip") ??
      null;
    const userAgent = hdrs.get("user-agent");

    await prisma.auditLog.create({
      data: {
        userId: user?.id ?? null,
        userName: user?.name ?? null,
        userRole: user?.role ?? null,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        entityLabel: input.entityLabel ?? null,
        action: input.action,
        description: input.description,
        oldValue: sanitizeAuditValue(input.oldValue) ?? Prisma.JsonNull,
        newValue: sanitizeAuditValue(input.newValue) ?? Prisma.JsonNull,
        ipAddress,
        userAgent,
        workspaceId: input.workspaceId ?? null,
        companyId: input.companyId ?? null,
      },
    });
  } catch (error) {
    console.error("Audit log failed:", error);
  }
}

export async function getAuditLogs({
  search,
  action,
  entityType,
  user,
  company,
  dateFrom,
  dateTo,
  page = 1,
  pageSize = 25,
}: {
  search?: string;
  action?: string;
  entityType?: string;
  user?: string;
  company?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireAnyPermission(["audit.view", "logs.view", "permissions.manage"]);

  const where: Prisma.AuditLogWhereInput = {};

  if (action) where.action = action as AuditAction;
  if (entityType) where.entityType = entityType as AuditEntityType;
  if (user) where.userName = { contains: user, mode: "insensitive" };
  if (company) where.companyId = { contains: company, mode: "insensitive" };
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }
  if (search) {
    where.OR = [
      { description: { contains: search, mode: "insensitive" } },
      { entityLabel: { contains: search, mode: "insensitive" } },
      { userName: { contains: search, mode: "insensitive" } },
      { userRole: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = Math.max(page - 1, 0) * pageSize;
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export { AuditAction, AuditEntityType };
