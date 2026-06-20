import "server-only";

import { differenceInMilliseconds } from "date-fns";
import {
  AuditAction,
  AuditEntityType,
  InspectionResult,
  NonConformityStatus,
  Prisma,
} from "@prisma/client";

import { requireAnyPermission } from "@/lib/authz";
import { dataScopeWhere, getDataScope } from "@/lib/data-scope";
import { prisma } from "@/lib/prisma";

const DAY_IN_MS = 86_400_000;

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function roundOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function getJsonString(value: Prisma.JsonValue | null, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value[key];
  return typeof item === "string" ? item : null;
}

function getOperationalMovement(log: {
  entityId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityLabel: string | null;
  description: string;
  userName: string | null;
  newValue: Prisma.JsonValue | null;
  createdAt: Date;
}) {
  const label = log.entityLabel ?? "registro";
  const status = getJsonString(log.newValue, "status");
  const result = getJsonString(log.newValue, "result");
  const inspectionResult = getJsonString(log.newValue, "inspection_result");

  if (log.entityType === AuditEntityType.SCAFFOLD) {
    if (log.action === AuditAction.CREATE) {
      return {
        badge: "ANDAIME CRIADO",
        dedupeKey: `${log.entityType}:${log.entityId ?? label}:created`,
        title: `Andaime ${label} criado`,
        tone: "green" as const,
      };
    }
    if (log.action === AuditAction.STATUS_CHANGE) {
      if (status === "liberado") {
        return {
          badge: "LIBERADO",
          dedupeKey: `${log.entityType}:${log.entityId ?? label}:liberado`,
          title: `Andaime ${label} liberado`,
          tone: "green" as const,
        };
      }
      if (status === "interditado") {
        return {
          badge: "INTERDITADO",
          dedupeKey: `${log.entityType}:${log.entityId ?? label}:interditado`,
          title: `Andaime ${label} interditado`,
          tone: "red" as const,
        };
      }
      if (status === "desmontado") {
        return {
          badge: "DESMONTADO",
          dedupeKey: `${log.entityType}:${log.entityId ?? label}:desmontado`,
          title: `Andaime ${label} desmontado`,
          tone: "red" as const,
        };
      }
      if (inspectionResult === "aprovado" || inspectionResult === "aprovado_com_ressalvas") {
        return {
          badge: "LIBERADO",
          dedupeKey: `${log.entityType}:${log.entityId ?? label}:liberado`,
          title: `Andaime ${label} liberado`,
          tone: "green" as const,
        };
      }
      if (inspectionResult === "reprovado") {
        return {
          badge: "REPROVADO",
          dedupeKey: `${log.entityType}:${log.entityId ?? label}:reprovado`,
          title: `Andaime ${label} reprovado`,
          tone: "red" as const,
        };
      }
    }
  }

  if (log.entityType === AuditEntityType.INSPECTION && log.action === AuditAction.CREATE) {
    if (result === "reprovado") {
      return {
        badge: "INSPECAO REPROVADA",
        dedupeKey: `${log.entityType}:${log.entityId ?? label}:reprovada`,
        title: `Inspecao ${label} reprovada`,
        tone: "red" as const,
      };
    }
    if (result === "aprovado" || result === "aprovado_com_ressalvas") {
      return {
        badge: "INSPECAO APROVADA",
        dedupeKey: `${log.entityType}:${log.entityId ?? label}:aprovada`,
        title: `Inspecao ${label} aprovada`,
        tone: "green" as const,
      };
    }
    return null;
  }

  if (log.entityType === AuditEntityType.NON_CONFORMITY) {
    if (log.action === AuditAction.CREATE) {
      return {
        badge: "NC ABERTA",
        dedupeKey: `${log.entityType}:${log.entityId ?? label}:aberta`,
        title: `Nao conformidade ${label} aberta`,
        tone: "red" as const,
      };
    }
    if (log.action === AuditAction.COMPLETE) {
      return {
        badge: "NC ENCERRADA",
        dedupeKey: `${log.entityType}:${log.entityId ?? label}:encerrada`,
        title: `Nao conformidade ${label} encerrada`,
        tone: "green" as const,
      };
    }
  }

  if (
    log.entityType === AuditEntityType.DOCUMENT &&
    (log.action === AuditAction.DOCUMENT_CREATED || log.action === AuditAction.UPLOAD)
  ) {
    return {
      badge: "DOCUMENTO",
      dedupeKey: `${log.entityType}:${log.entityId ?? label}:anexado`,
      title: `Documento tecnico anexado em ${label}`,
      tone: "blue" as const,
    };
  }

  return null;
}

export async function getDashboardMetrics() {
  await requireAnyPermission(["read.all", "read.own_company"]);
  const scope = await getDataScope();
  const scopedWhere = dataScopeWhere(scope);
  const activeScaffoldWhere = {
    ...scopedWhere,
    status: { not: "desmontado" },
  } satisfies Prisma.ScaffoldWhereInput;
  const dismantledScaffoldWhere = {
    ...scopedWhere,
    status: "desmontado",
  } satisfies Prisma.ScaffoldWhereInput;
  const workspaceRankingWhere = {
    ...(scope.workspaceIds ? { workspaceId: { in: scope.workspaceIds } } : {}),
  } satisfies Prisma.ScaffoldWhereInput;

  const [
    scaffolds,
    inspections,
    dismantledScaffolds,
    closedNonConformities,
    companyRanking,
    areaRanking,
    auditLogs,
  ] = await Promise.all([
    prisma.scaffold.findMany({
      where: activeScaffoldWhere,
      orderBy: { code: "asc" },
      include: {
        tenantCompany: { select: { id: true, name: true } },
        _count: { select: { inspections: true } },
        inspections: {
          orderBy: { date: "desc" },
          take: 1,
          select: { date: true, result: true },
        },
      },
    }),
    prisma.inspection.findMany({
      where: scopedWhere,
      orderBy: { date: "desc" },
      select: {
        id: true,
        scaffold_id: true,
        scaffold_code: true,
        date: true,
        inspector_name: true,
        result: true,
        validity_days: true,
        notes: true,
        scaffold: {
          select: {
            code: true,
            location: true,
            area: true,
            tenantCompany: { select: { id: true, name: true } },
          },
        },
        _count: { select: { checklist: true } },
      },
    }),
    prisma.scaffold.findMany({
      where: dismantledScaffoldWhere,
      select: {
        id: true,
        released_at: true,
        dismantled_at: true,
      },
    }),
    prisma.nonConformity.findMany({
      where: {
        ...scopedWhere,
        status: NonConformityStatus.CLOSED,
      },
      select: {
        id: true,
        createdAt: true,
        closedAt: true,
      },
    }),
    prisma.scaffold.groupBy({
      by: ["companyId"],
      where: workspaceRankingWhere,
      _count: { _all: true },
      orderBy: { _count: { companyId: "desc" } },
      take: 4,
    }),
    prisma.scaffold.groupBy({
      by: ["area"],
      where: scopedWhere,
      _count: { _all: true },
      orderBy: { _count: { area: "desc" } },
      take: 4,
    }),
    prisma.auditLog.findMany({
      where: {
        ...scopedWhere,
        OR: [
          { entityType: AuditEntityType.SCAFFOLD, action: { in: [AuditAction.CREATE, AuditAction.STATUS_CHANGE] } },
          { entityType: AuditEntityType.INSPECTION, action: AuditAction.CREATE },
          { entityType: AuditEntityType.NON_CONFORMITY, action: { in: [AuditAction.CREATE, AuditAction.COMPLETE] } },
          { entityType: AuditEntityType.DOCUMENT, action: { in: [AuditAction.DOCUMENT_CREATED, AuditAction.UPLOAD] } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        entityLabel: true,
        description: true,
        userName: true,
        newValue: true,
        createdAt: true,
      },
    }),
  ]);

  const companyIds = companyRanking.map((item) => item.companyId);
  const companies = companyIds.length
    ? await prisma.company.findMany({
        where: { id: { in: companyIds } },
        select: { id: true, name: true },
      })
    : [];
  const companyNames = new Map(companies.map((company) => [company.id, company.name]));

  const operationDays = dismantledScaffolds.flatMap((scaffold) => {
    if (!scaffold.released_at || !scaffold.dismantled_at) return [];
    const days = differenceInMilliseconds(scaffold.dismantled_at, scaffold.released_at) / DAY_IN_MS;
    return days >= 0 ? [days] : [];
  });
  const correctionDays = closedNonConformities.flatMap((nc) => {
    if (!nc.closedAt) return [];
    const days = differenceInMilliseconds(nc.closedAt, nc.createdAt) / DAY_IN_MS;
    return days >= 0 ? [days] : [];
  });
  const approvedInspections = inspections.filter((inspection) =>
    inspection.result === InspectionResult.aprovado ||
    inspection.result === InspectionResult.aprovado_com_ressalvas,
  ).length;
  const approvalRate =
    inspections.length > 0 ? Math.round((approvedInspections / inspections.length) * 100) : 0;
  const averageOperationDays = average(operationDays);
  const averageCorrectionDays = average(correctionDays);

  return {
    operational: {
      scaffolds,
      inspections,
    },
    historical: {
      averageOperationDays:
        averageOperationDays === null ? null : Math.max(1, Math.round(averageOperationDays)),
      approvalRate,
      closedNonConformities: closedNonConformities.length,
      averageCorrectionDays:
        averageCorrectionDays === null ? null : roundOneDecimal(averageCorrectionDays),
    },
    rankings: {
      companies: companyRanking.map((item) => ({
        id: item.companyId,
        name: companyNames.get(item.companyId) ?? item.companyId,
        total: item._count._all,
      })),
      areas: areaRanking.map((item) => ({
        name: item.area,
        total: item._count._all,
      })),
    },
    operationalMovements: auditLogs
      .flatMap((log) => {
        const movement = getOperationalMovement(log);
        if (!movement) return [];
        return [{
          id: log.id,
          badge: movement.badge,
          dedupeKey: movement.dedupeKey,
          title: movement.title,
          tone: movement.tone,
          userName: log.userName ?? "Sistema",
          createdAt: log.createdAt,
        }];
      })
      .filter((movement, index, movements) => {
        const previous = movements[index - 1];
        return !previous || previous.dedupeKey !== movement.dedupeKey;
      })
      .slice(0, 10)
      .map((movement) => ({
        id: movement.id,
        badge: movement.badge,
        title: movement.title,
        tone: movement.tone,
        userName: movement.userName,
        createdAt: movement.createdAt,
      })),
  };
}
