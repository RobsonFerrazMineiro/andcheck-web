import { auth } from "@/auth";
import { resolveAuditRequestContext } from "@/lib/audit-context";
import { requireAnyPermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_COMPANY_ID,
  DEFAULT_WORKSPACE_ID,
  resolveTenantContext,
} from "@/lib/multi-company";
import { sanitizeForLog } from "@/lib/safe-log";
import { dataScopeWhere, getDataScope } from "@/lib/data-scope";
import { AuditAction, AuditEntityType, Prisma } from "@prisma/client";

type AuditUser = {
  id?: string | null;
  name?: string | null;
  role?: string | null;
  companyId?: string | null;
  workspaceId?: string | null;
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
  "fileContent",
  "fileData",
  "imageData",
  "photo",
  "photos",
  "buffer",
  "blob",
  "arrayBuffer",
]);

const STATUS_CONSULTATION_DEDUPLICATION_MS = 5 * 60 * 1_000;

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

  if (typeof value === "string") {
    if (/^data:image\//i.test(value)) return "[image-data-hidden]";
    if (/^data:[^;,]+;base64,/i.test(value)) return "[base64-hidden]";
    if (value.length > 2_000) return `[long-string-hidden:${value.length}]`;
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
    companyId: dbUser?.companyId,
    workspaceId: dbUser?.workspaceId,
  };
}

export async function createAuditLog(input: CreateAuditLogInput) {
  try {
    const [user, requestContext] = await Promise.all([
      resolveAuditUser(input.user),
      resolveAuditRequestContext(),
    ]);
    const tenantContext = await resolveTenantContext({
      company: input.companyId ?? user?.companyId,
      workspace: input.workspaceId ?? user?.workspaceId,
    });

    await prisma.auditLog.create({
      data: {
        userId: user?.id ?? null,
        userName: user?.name ?? null,
        userRole: user?.role ?? null,
        sessionId: requestContext.sessionId,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        entityLabel: input.entityLabel ?? null,
        action: input.action,
        description: input.description,
        oldValue: sanitizeAuditValue(input.oldValue) ?? Prisma.JsonNull,
        newValue: sanitizeAuditValue(input.newValue) ?? Prisma.JsonNull,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        browserName: requestContext.browserName,
        osName: requestContext.osName,
        deviceType: requestContext.deviceType,
        workspaceId: tenantContext.workspaceId,
        companyId: tenantContext.companyId,
      },
    });
  } catch (error) {
    console.error("Audit log failed:", sanitizeForLog(error));
  }
}

export async function logScaffoldStatusConsultation(scaffold: {
  id: string;
  code: string;
  status: string;
  company: string | null;
}) {
  try {
    const [user, requestContext] = await Promise.all([
      resolveAuditUser(),
      resolveAuditRequestContext(),
    ]);
    const identityKey = user?.id
      ? `user:${user.id}`
      : `ip:${requestContext.ipAddress ?? "unknown"}`;
    const lockKey = `scaffold-status:${scaffold.id}:${identityKey}`;
    const createdAfter = new Date(
      Date.now() - STATUS_CONSULTATION_DEDUPLICATION_MS,
    );

    await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext(${lockKey})::bigint) IS NULL AS locked
      `;

      const existingLog = await transaction.auditLog.findFirst({
        where: {
          entityType: AuditEntityType.QR_CODE,
          entityId: scaffold.id,
          action: AuditAction.VIEW_QR,
          createdAt: { gte: createdAfter },
          ...(user?.id
            ? { userId: user.id }
            : { userId: null, ipAddress: requestContext.ipAddress }),
        },
        select: { id: true },
      });
      if (existingLog) return;

      await transaction.auditLog.create({
        data: {
          userId: user?.id ?? null,
          userName: user?.name ?? null,
          userRole: user?.role ?? null,
          sessionId: requestContext.sessionId,
          entityType: AuditEntityType.QR_CODE,
          entityId: scaffold.id,
          entityLabel: scaffold.code,
          action: AuditAction.VIEW_QR,
          description: user
            ? `${user.name ?? "Usuário"} consultou o status do andaime ${scaffold.code}`
            : `Consulta publica ao status do andaime ${scaffold.code}`,
          oldValue: Prisma.JsonNull,
          newValue: {
            code: scaffold.code,
            status: scaffold.status,
          },
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          browserName: requestContext.browserName,
          osName: requestContext.osName,
          deviceType: requestContext.deviceType,
          workspaceId: DEFAULT_WORKSPACE_ID,
          companyId: DEFAULT_COMPANY_ID,
        },
      });
    });
  } catch (error) {
    console.error(
      "Scaffold status consultation audit failed:",
      sanitizeForLog(error),
    );
  }
}

export async function getAuditLogs({
  search,
  action,
  entityType,
  user,
  company,
  workspace,
  status,
  scaffoldTag,
  dateFrom,
  dateTo,
  order = "desc",
  page = 1,
  pageSize = 25,
}: {
  search?: string;
  action?: string;
  entityType?: string;
  user?: string;
  company?: string;
  workspace?: string;
  status?: string;
  scaffoldTag?: string;
  dateFrom?: string;
  dateTo?: string;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}) {
  await requireAnyPermission(["audit.view", "logs.view", "permissions.manage"]);
  const scope = await getDataScope();

  const where: Prisma.AuditLogWhereInput = dataScopeWhere(scope);
  const andConditions: Prisma.AuditLogWhereInput[] = [];

  if (action) where.action = action as AuditAction;
  if (entityType) where.entityType = entityType as AuditEntityType;
  if (user) where.userName = { contains: user, mode: "insensitive" };
  if (company) {
    where.tenantCompany = {
      name: { contains: company, mode: "insensitive" },
    };
  }
  if (workspace) {
    where.workspace = {
      name: { contains: workspace, mode: "insensitive" },
    };
  }
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }
  if (status) {
    andConditions.push({
      OR: [
        { description: { contains: status, mode: "insensitive" } },
        { oldValue: { path: ["status"], equals: status } },
        { newValue: { path: ["status"], equals: status } },
        { oldValue: { path: ["result"], equals: status } },
        { newValue: { path: ["result"], equals: status } },
      ],
    });
  }
  if (scaffoldTag) {
    andConditions.push({
      OR: [
        { entityLabel: { contains: scaffoldTag, mode: "insensitive" } },
        { description: { contains: scaffoldTag, mode: "insensitive" } },
        { oldValue: { path: ["scaffold_code"], equals: scaffoldTag } },
        { newValue: { path: ["scaffold_code"], equals: scaffoldTag } },
        { oldValue: { path: ["code"], equals: scaffoldTag } },
        { newValue: { path: ["code"], equals: scaffoldTag } },
      ],
    });
  }
  if (search) {
    andConditions.push({
      OR: [
        { description: { contains: search, mode: "insensitive" } },
        { entityLabel: { contains: search, mode: "insensitive" } },
        { userName: { contains: search, mode: "insensitive" } },
        { userRole: { contains: search, mode: "insensitive" } },
      ],
    });
  }
  if (andConditions.length > 0) where.AND = andConditions;

  const skip = Math.max(page - 1, 0) * pageSize;
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        tenantCompany: { select: { name: true } },
        workspace: { select: { name: true } },
      },
      orderBy: { createdAt: order },
      take: pageSize,
      skip,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      ...item,
      companyId: item.tenantCompany.name,
      workspaceId: item.workspace.name,
      oldValue: sanitizeAuditValue(item.oldValue) ?? null,
      newValue: sanitizeAuditValue(item.newValue) ?? null,
    })),
    total,
    page,
    pageSize,
  };
}

export async function getEntityAuditTimeline({
  entityType,
  entityId,
  limit = 40,
}: {
  entityType: AuditEntityType;
  entityId: string;
  limit?: number;
}) {
  await requireAnyPermission(["read.all", "read.own_company"]);
  const scope = await getDataScope();

  const items = await prisma.auditLog.findMany({
    where: {
      ...dataScopeWhere(scope),
      entityType,
      entityId,
    },
    include: {
      tenantCompany: { select: { name: true } },
      workspace: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  return items.map((item) => ({
    id: item.id,
    action: item.action,
    entityType: item.entityType,
    entityLabel: item.entityLabel,
    description: item.description,
    userName: item.userName,
    userRole: item.userRole,
    oldValue: sanitizeAuditValue(item.oldValue) ?? null,
    newValue: sanitizeAuditValue(item.newValue) ?? null,
    ipAddress: item.ipAddress,
    browserName: item.browserName,
    osName: item.osName,
    deviceType: item.deviceType,
    companyName: item.tenantCompany.name,
    workspaceName: item.workspace.name,
    createdAt: item.createdAt,
  }));
}

export async function getAuditRetentionPolicies() {
  await requireAnyPermission(["audit.view", "logs.view", "permissions.manage"]);
  const scope = await getDataScope();

  const workspaces = await prisma.workspace.findMany({
    where: {
      ...(scope.workspaceIds ? { id: { in: scope.workspaceIds } } : {}),
      active: true,
    },
    include: {
      auditRetentionPolicy: true,
    },
    orderBy: { name: "asc" },
  });

  return workspaces.map((workspace) => ({
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    period: workspace.auditRetentionPolicy?.period ?? "PERMANENT",
    notes: workspace.auditRetentionPolicy?.notes ?? null,
    configuredAt: workspace.auditRetentionPolicy?.updatedAt ?? null,
  }));
}

export { AuditAction, AuditEntityType };
