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

function formatActivity(log: {
  action: AuditAction;
  entityType: AuditEntityType;
  entityLabel: string | null;
  description: string;
  userName: string | null;
  newValue: Prisma.JsonValue | null;
}) {
  const label = log.entityLabel ?? "registro";
  const actor = log.userName ?? "Sistema";
  const status =
    log.newValue &&
    typeof log.newValue === "object" &&
    !Array.isArray(log.newValue) &&
    typeof log.newValue.status === "string"
      ? log.newValue.status
      : null;

  if (log.entityType === "SCAFFOLD" && log.action === "STATUS_CHANGE") {
    if (status === "liberado") return `${actor} liberou ${label}`;
    if (status === "desmontado") return `Andaime ${label} desmontado`;
    return `${actor} alterou o status de ${label}`;
  }
  if (log.entityType === "NON_CONFORMITY" && log.action === "COMPLETE") {
    return `${label} foi encerrada`;
  }
  if (log.entityType === "NON_CONFORMITY" && log.action === "CREATE") {
    return `${label} foi aberta`;
  }
  if (log.entityType === "INSPECTION" && log.action === "CREATE") {
    return `Nova inspecao registrada em ${label}`;
  }
  if (log.entityType === "DOCUMENT" && log.action === "DOCUMENT_CREATED") {
    return `Documento tecnico anexado em ${label}`;
  }

  return log.description.endsWith(".") ? log.description.slice(0, -1) : log.description;
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

  const [
    scaffolds,
    inspections,
    dismantledScaffolds,
    closedNonConformities,
    companyRanking,
    areaRanking,
    recentAuditLogs,
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
      where: scopedWhere,
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
      where: scopedWhere,
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        action: true,
        entityType: true,
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
    recentActivities: recentAuditLogs.map((log) => ({
      id: log.id,
      description: formatActivity(log),
      createdAt: log.createdAt,
      actor: log.userName ?? "Sistema",
    })),
  };
}
