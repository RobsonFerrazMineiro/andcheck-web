import "server-only";

import {
  AuditAction,
  AuditEntityType,
  InspectionResult,
  NonConformityStatus,
  Prisma,
} from "@prisma/client";
import { differenceInMilliseconds, endOfDay } from "date-fns";

import { requireAnyPermission } from "@/lib/authz";
import { dataScopeWhere, getDataScope } from "@/lib/data-scope";
import { prisma } from "@/lib/prisma";

const DAY_IN_MS = 86_400_000;
const MOVEMENT_GROUP_WINDOW_MS = 30 * 60 * 1000;

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
  const actor = log.userName ?? "Sistema";
  const status = getJsonString(log.newValue, "status");
  const result = getJsonString(log.newValue, "result");
  const inspectionResult = getJsonString(log.newValue, "inspection_result");
  const scaffoldCode = getJsonString(log.newValue, "scaffold_code") ?? label;

  if (log.entityType === AuditEntityType.SCAFFOLD) {
    if (log.action === AuditAction.CREATE) {
      return {
        badge: "ANDAIME CRIADO",
        dedupeKey: `${log.entityType}:${log.entityId ?? label}:created`,
        groupable: false,
        subtitle: `Criado por ${actor}`,
        title: label,
        tone: "success" as const,
      };
    }
    if (log.action === AuditAction.STATUS_CHANGE) {
      if (status === "liberado") {
        return {
          badge: "LIBERADO",
          dedupeKey: `${log.entityType}:${log.entityId ?? label}:liberado`,
          groupable: false,
          subtitle: `Liberado por ${actor}`,
          title: label,
          tone: "success" as const,
        };
      }
      if (status === "interditado") {
        return {
          badge: "INTERDITADO",
          dedupeKey: `${log.entityType}:${log.entityId ?? label}:interditado`,
          groupable: false,
          subtitle: actor,
          title: label,
          tone: "critical" as const,
        };
      }
      if (status === "desmontado") {
        return {
          badge: "DESMONTADO",
          dedupeKey: `${log.entityType}:${log.entityId ?? label}:desmontado`,
          groupable: false,
          subtitle: actor,
          title: label,
          tone: "disabled" as const,
        };
      }
      if (
        inspectionResult === "aprovado" ||
        inspectionResult === "aprovado_com_ressalvas"
      ) {
        return {
          badge: "LIBERADO",
          dedupeKey: `${log.entityType}:${log.entityId ?? label}:liberado`,
          groupable: false,
          subtitle: `Liberado por ${actor}`,
          title: label,
          tone: "success" as const,
        };
      }
      if (inspectionResult === "reprovado") {
        return {
          badge: "REPROVADO",
          dedupeKey: `${log.entityType}:${log.entityId ?? label}:reprovado`,
          groupable: false,
          subtitle: actor,
          title: label,
          tone: "critical" as const,
        };
      }
    }
  }

  if (
    log.entityType === AuditEntityType.INSPECTION &&
    log.action === AuditAction.CREATE
  ) {
    if (result === "reprovado") {
      return {
        badge: "INSP. REPROVADA",
        dedupeKey: `${log.entityType}:${log.entityId ?? label}:reprovada`,
        groupable: false,
        subtitle: actor,
        title: scaffoldCode,
        tone: "critical" as const,
      };
    }
    if (result === "aprovado_com_ressalvas") {
      return {
        badge: "C/ RESSALVAS",
        dedupeKey: `${log.entityType}:${log.entityId ?? label}:ressalvas`,
        groupable: false,
        subtitle: actor,
        title: scaffoldCode,
        tone: "warning" as const,
      };
    }
    if (result === "aprovado") {
      return {
        badge: "INSP. APROVADA",
        dedupeKey: `${log.entityType}:${log.entityId ?? label}:aprovada`,
        groupable: false,
        subtitle: actor,
        title: scaffoldCode,
        tone: "neutral" as const,
      };
    }
    return null;
  }

  if (log.entityType === AuditEntityType.NON_CONFORMITY) {
    if (log.action === AuditAction.CREATE) {
      return {
        badge: "NC ABERTA",
        dedupeKey: `${log.entityType}:${log.entityId ?? label}:aberta`,
        groupable: false,
        subtitle: `Aberta por ${actor}`,
        title: label,
        tone: "critical" as const,
      };
    }
    if (log.action === AuditAction.COMPLETE || status === "CLOSED") {
      return {
        badge: "NC ENCERRADA",
        dedupeKey: `${log.entityType}:${log.entityId ?? label}:encerrada`,
        groupable: false,
        subtitle: `Encerrada por ${actor}`,
        title: label,
        tone: "success" as const,
      };
    }
    if (
      log.action === AuditAction.UPDATE ||
      log.action === AuditAction.STATUS_CHANGE ||
      log.action === AuditAction.UPLOAD
    ) {
      return {
        badge: "NC ATUALIZADA",
        dedupeKey: `${log.entityType}:${log.entityId ?? label}:atualizada`,
        groupable: true,
        subtitle: `Atualizada por ${actor}`,
        title: label,
        tone: "warning" as const,
      };
    }
  }

  if (
    log.entityType === AuditEntityType.DOCUMENT &&
    log.action === AuditAction.DOCUMENT_UPDATED &&
    status === "EXPIRED"
  ) {
    return {
      badge: "DOC. VENCIDO",
      dedupeKey: `${log.entityType}:${log.entityId ?? label}:vencido`,
      groupable: false,
      subtitle: "Documento tecnico vencido",
      title: label,
      tone: "critical" as const,
    };
  }

  if (
    log.entityType === AuditEntityType.DOCUMENT &&
    (log.action === AuditAction.DOCUMENT_CREATED ||
      log.action === AuditAction.UPLOAD)
  ) {
    return {
      badge: "DOCUMENTO ANEXADO",
      dedupeKey: `${log.entityType}:${log.entityId ?? label}:anexado`,
      groupable: false,
      subtitle: `Anexado por ${actor}`,
      title: label,
      tone: "neutral" as const,
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
      orderBy: { created_at: "desc" },
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
        dueDate: true,
      },
    }),
    prisma.scaffold.groupBy({
      by: ["companyId"],
      where: workspaceRankingWhere,
      _count: { _all: true },
      orderBy: { _count: { companyId: "desc" } },
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
          {
            entityType: AuditEntityType.SCAFFOLD,
            action: { in: [AuditAction.CREATE, AuditAction.STATUS_CHANGE] },
          },
          {
            entityType: AuditEntityType.INSPECTION,
            action: AuditAction.CREATE,
          },
          {
            entityType: AuditEntityType.NON_CONFORMITY,
            action: {
              in: [
                AuditAction.CREATE,
                AuditAction.UPDATE,
                AuditAction.STATUS_CHANGE,
                AuditAction.COMPLETE,
                AuditAction.UPLOAD,
              ],
            },
          },
          {
            entityType: AuditEntityType.DOCUMENT,
            action: {
              in: [
                AuditAction.DOCUMENT_CREATED,
                AuditAction.DOCUMENT_UPDATED,
                AuditAction.UPLOAD,
              ],
            },
          },
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
  const companyNames = new Map(
    companies.map((company) => [company.id, company.name]),
  );

  const operationDays = dismantledScaffolds.flatMap((scaffold) => {
    if (!scaffold.released_at || !scaffold.dismantled_at) return [];
    const days =
      differenceInMilliseconds(scaffold.dismantled_at, scaffold.released_at) /
      DAY_IN_MS;
    return days >= 0 ? [days] : [];
  });
  const correctionDays = closedNonConformities.flatMap((nc) => {
    if (!nc.closedAt) return [];
    const days =
      differenceInMilliseconds(nc.closedAt, nc.createdAt) / DAY_IN_MS;
    return days >= 0 ? [days] : [];
  });
  const approvedInspections = inspections.filter(
    (inspection) =>
      inspection.result === InspectionResult.aprovado ||
      inspection.result === InspectionResult.aprovado_com_ressalvas,
  ).length;
  const approvalRate =
    inspections.length > 0
      ? Math.round((approvedInspections / inspections.length) * 100)
      : 0;
  const onTimeClosedNonConformities = closedNonConformities.filter(
    (nc) => nc.closedAt && nc.dueDate && nc.closedAt <= endOfDay(nc.dueDate),
  ).length;
  const onTimeClosureRate =
    closedNonConformities.length > 0
      ? Math.round(
          (onTimeClosedNonConformities / closedNonConformities.length) * 100,
        )
      : null;
  const averageOperationDays = average(operationDays);
  const averageCorrectionDays = average(correctionDays);

  return {
    operational: {
      scaffolds,
      inspections,
    },
    historical: {
      averageOperationDays:
        averageOperationDays === null
          ? null
          : Math.max(1, Math.round(averageOperationDays)),
      approvalRate,
      onTimeClosureRate,
      averageCorrectionDays:
        averageCorrectionDays === null
          ? null
          : roundOneDecimal(averageCorrectionDays),
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
      .reduce<
        Array<{
          id: string;
          badge: string;
          count: number;
          dedupeKey: string;
          groupable: boolean;
          subtitle: string;
          title: string;
          tone:
            | "success"
            | "critical"
            | "warning"
            | "neutral"
            | "disabled";
          createdAt: Date;
        }>
      >((movements, log) => {
        const movement = getOperationalMovement(log);
        if (!movement) return movements;

        if (movement.groupable) {
          const grouped = movements.find(
            (item) =>
              item.groupable &&
              item.dedupeKey === movement.dedupeKey &&
              differenceInMilliseconds(item.createdAt, log.createdAt) <=
                MOVEMENT_GROUP_WINDOW_MS,
          );
          if (grouped) {
            grouped.count += 1;
            return movements;
          }
        }

        movements.push({
          id: log.id,
          badge: movement.badge,
          count: 1,
          dedupeKey: movement.dedupeKey,
          groupable: movement.groupable,
          subtitle: movement.subtitle,
          title: movement.title,
          tone: movement.tone,
          createdAt: log.createdAt,
        });
        return movements;
      }, [])
      .slice(0, 10)
      .map((movement) => ({
        id: movement.id,
        badge: movement.badge,
        subtitle:
          movement.groupable && movement.count > 1
            ? `${movement.count} alteracoes registradas`
            : movement.subtitle,
        title: movement.title,
        tone: movement.tone,
        createdAt: movement.createdAt,
      })),
  };
}
