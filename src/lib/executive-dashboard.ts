import "server-only";

import { requireAnyPermission } from "@/lib/authz";
import { dataScopeWhere, getDataScope } from "@/lib/data-scope";
import { summarizeChecklistNonConformity } from "@/lib/management-reports";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  addDays,
  differenceInCalendarDays,
  differenceInMilliseconds,
  endOfDay,
  format,
  startOfDay,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const DAY_IN_MS = 86_400_000;

export type ExecutivePeriod = "week" | "month" | "quarter" | "year";

export type ExecutiveDashboardFilters = {
  companyId?: string;
  workspaceId?: string;
  area?: string;
  status?: string;
  period?: ExecutivePeriod;
  startDate?: string;
  endDate?: string;
};

export type ExecutiveDashboardData = Awaited<
  ReturnType<typeof getExecutiveDashboard>
>;

type KpiTone = "neutral" | "success" | "warning" | "critical";

type Kpi = {
  id: string;
  label: string;
  value: string;
  rawValue: number;
  unit?: string;
  tone: KpiTone;
  trend: number | null;
  comparison: string;
  tooltip: string;
};

type SeriesPoint = {
  label: string;
  inspections: number;
  nonConformities: number;
  released: number;
  interdictions: number;
  criticalNotifications: number;
};

type ScopedRecord = {
  companyId: string;
  workspaceId: string;
};

export async function getExecutiveDashboard(
  filters: ExecutiveDashboardFilters = {},
) {
  await requireAnyPermission(["read.all", "read.own_company"]);

  const scope = await getDataScope();
  const scopedWhere = dataScopeWhere(scope);
  const range = resolveDateRange(filters);
  const previousRange = {
    start: subDays(range.start, range.days),
    end: subDays(range.end, range.days),
  };

  const commonCurrent = buildCommonWhere(scopedWhere, filters, range);
  const commonPrevious = buildCommonWhere(scopedWhere, filters, previousRange);

  const [
    scaffolds,
    previousScaffolds,
    inspections,
    previousInspections,
    nonConformities,
    previousNonConformities,
    notifications,
    previousNotifications,
    filterCompanies,
    filterWorkspaces,
  ] = await Promise.all([
    prisma.scaffold.findMany({
      where: commonCurrent.scaffold,
      select: {
        id: true,
        code: true,
        status: true,
        area: true,
        company: true,
        companyId: true,
        workspaceId: true,
        created_at: true,
        released_at: true,
        dismantled_at: true,
        validity_date: true,
        latitude: true,
        longitude: true,
        responsible: true,
        location: true,
        location_description: true,
        tenantCompany: { select: { id: true, name: true } },
        workspace: { select: { id: true, name: true } },
        inspections: {
          orderBy: { date: "desc" },
          take: 1,
          select: { date: true, result: true },
        },
      },
    }),
    prisma.scaffold.findMany({
      where: commonPrevious.scaffold,
      select: {
        id: true,
        status: true,
        companyId: true,
        workspaceId: true,
        created_at: true,
        released_at: true,
        dismantled_at: true,
        validity_date: true,
      },
    }),
    prisma.inspection.findMany({
      where: commonCurrent.inspection,
      select: {
        id: true,
        date: true,
        inspector_name: true,
        result: true,
        companyId: true,
        workspaceId: true,
        scaffold: {
          select: {
            area: true,
            companyId: true,
            workspaceId: true,
            tenantCompany: { select: { id: true, name: true } },
            workspace: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.inspection.findMany({
      where: commonPrevious.inspection,
      select: {
        id: true,
        date: true,
        result: true,
        companyId: true,
        workspaceId: true,
      },
    }),
    prisma.nonConformity.findMany({
      where: commonCurrent.nonConformity,
      select: {
        id: true,
        code: true,
        title: true,
        classification: true,
        status: true,
        createdAt: true,
        closedAt: true,
        dueDate: true,
        companyId: true,
        workspaceId: true,
        checklistItems: {
          select: {
            checklistEntry: {
              select: {
                item_label: true,
              },
            },
          },
        },
        scaffold: {
          select: {
            area: true,
            code: true,
            tenantCompany: { select: { id: true, name: true } },
            workspace: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.nonConformity.findMany({
      where: commonPrevious.nonConformity,
      select: {
        id: true,
        status: true,
        createdAt: true,
        closedAt: true,
        dueDate: true,
        companyId: true,
        workspaceId: true,
      },
    }),
    prisma.notification.findMany({
      where: commonCurrent.notification,
      select: {
        id: true,
        type: true,
        severity: true,
        createdAt: true,
        companyId: true,
        workspaceId: true,
      },
    }).catch((error: unknown) => {
      if (isMissingNotificationTables(error)) return [];
      throw error;
    }),
    prisma.notification.findMany({
      where: commonPrevious.notification,
      select: {
        id: true,
        severity: true,
        createdAt: true,
        companyId: true,
        workspaceId: true,
      },
    }).catch((error: unknown) => {
      if (isMissingNotificationTables(error)) return [];
      throw error;
    }),
    prisma.company.findMany({
      where: {
        active: true,
        ...(scope.companyIds ? { id: { in: scope.companyIds } } : {}),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.workspace.findMany({
      where: {
        active: true,
        ...(scope.workspaceIds ? { id: { in: scope.workspaceIds } } : {}),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const closedNcs = nonConformities.filter((item) => item.status === "CLOSED");
  const previousClosedNcs = previousNonConformities.filter(
    (item) => item.status === "CLOSED",
  );
  const releasedScaffolds = scaffolds.filter((item) => item.status === "liberado");
  const previousReleasedScaffolds = previousScaffolds.filter(
    (item) => item.status === "liberado",
  );
  const interdictedScaffolds = scaffolds.filter(
    (item) => item.status === "interditado",
  );
  const expiredScaffolds = scaffolds.filter((item) =>
    isScaffoldExpired(item.status, item.validity_date, range.end),
  );
  const previousExpiredScaffolds = previousScaffolds.filter((item) =>
    isScaffoldExpired(item.status, item.validity_date, previousRange.end),
  );
  const approvedInspections = inspections.filter(isApprovedInspection);
  const previousApprovedInspections = previousInspections.filter(
    isApprovedInspection,
  );
  const openNcs = nonConformities.filter((item) => item.status !== "CLOSED");
  const previousOpenNcs = previousNonConformities.filter(
    (item) => item.status !== "CLOSED",
  );
  const criticalNotifications = notifications.filter(
    (item) => item.severity === "CRITICAL",
  );
  const previousCriticalNotifications = previousNotifications.filter(
    (item) => item.severity === "CRITICAL",
  );

  const approvalRate = percentage(approvedInspections.length, inspections.length);
  const previousApprovalRate = percentage(
    previousApprovedInspections.length,
    previousInspections.length,
  );
  const conformanceIndex = percentage(
    inspections.length - inspections.filter((item) => item.result === "reprovado").length,
    inspections.length + openNcs.length,
  );
  const previousConformanceIndex = percentage(
    previousInspections.length -
      previousInspections.filter((item) => item.result === "reprovado").length,
    previousInspections.length + previousOpenNcs.length,
  );
  const averageCorrectionDays = averageDays(
    closedNcs.flatMap((item) =>
      item.closedAt ? [differenceInMilliseconds(item.closedAt, item.createdAt)] : [],
    ),
  );
  const previousAverageCorrectionDays = averageDays(
    previousClosedNcs.flatMap((item) =>
      item.closedAt ? [differenceInMilliseconds(item.closedAt, item.createdAt)] : [],
    ),
  );
  const utilizationRate = percentage(
    scaffolds.filter((item) =>
      ["liberado", "pendente_liberacao", "interditado"].includes(item.status),
    ).length,
    scaffolds.filter((item) => item.status !== "desmontado").length,
  );
  const previousUtilizationRate = percentage(
    previousScaffolds.filter((item) =>
      ["liberado", "pendente_liberacao", "interditado"].includes(item.status),
    ).length,
    previousScaffolds.filter((item) => item.status !== "desmontado").length,
  );

  const kpis: Kpi[] = [
    buildKpi("totalScaffolds", "Total de Andaimes", scaffolds.length, previousScaffolds.length, "neutral", "Total de andaimes criados no periodo filtrado."),
    buildKpi("releasedScaffolds", "Andaimes Liberados", releasedScaffolds.length, previousReleasedScaffolds.length, "success", "Andaimes com status liberado no periodo filtrado."),
    buildKpi("interdictedScaffolds", "Andaimes Interditados", interdictedScaffolds.length, previousScaffolds.filter((item) => item.status === "interditado").length, "critical", "Andaimes atualmente interditados no periodo filtrado."),
    buildKpi("expiredScaffolds", "Andaimes Vencidos", expiredScaffolds.length, previousExpiredScaffolds.length, "critical", "Andaimes vencidos por status ou data de validade."),
    buildKpi("inspections", "Inspeções Realizadas", inspections.length, previousInspections.length, "neutral", "Inspeções registradas dentro do periodo filtrado."),
    buildKpi("approvalRate", "Taxa de Aprovação", approvalRate, previousApprovalRate, "success", "Percentual de inspeções aprovadas ou aprovadas com ressalvas.", "%"),
    buildKpi("conformanceIndex", "Índice de Conformidade", conformanceIndex, previousConformanceIndex, "success", "Combina inspeções sem reprovação e NCs abertas para indicar estabilidade operacional.", "%"),
    buildKpi("openNcs", "NCs Abertas", openNcs.length, previousOpenNcs.length, "warning", "Não conformidades ainda não encerradas."),
    buildKpi("closedNcs", "NCs Encerradas", closedNcs.length, previousClosedNcs.length, "success", "Não conformidades encerradas dentro do periodo filtrado."),
    buildKpi("avgCorrection", "Tempo Médio de Correção", averageCorrectionDays, previousAverageCorrectionDays, "warning", "Tempo médio entre abertura e encerramento das NCs.", " dias"),
    buildKpi("utilizationRate", "Taxa de Utilização dos Andaimes", utilizationRate, previousUtilizationRate, "neutral", "Percentual de andaimes ativos em uso, pendentes ou interditados.", "%"),
    buildKpi("criticalNotifications", "Notificações Críticas", criticalNotifications.length, previousCriticalNotifications.length, "critical", "Notificações críticas geradas no periodo filtrado."),
  ];

  const series = buildSeries(range, filters.period ?? "month", {
    inspections,
    nonConformities,
    scaffolds,
    notifications: criticalNotifications,
  });
  const statusDistribution = buildStatusDistribution(scaffolds, expiredScaffolds);
  const rankings = buildRankings(scaffolds, inspections, nonConformities);
  const productivity = buildProductivity(scaffolds, inspections, nonConformities, range.days);
  const map = buildMap(scaffolds);
  const insights = buildInsights({
    rankings,
    kpis,
    approvalRate,
    previousApprovalRate,
    averageCorrectionDays,
    previousAverageCorrectionDays,
    openNcs,
    previousOpenNcs,
    inspections,
  });

  return {
    title: "Dashboard Executivo",
    generatedAt: new Date().toISOString(),
    filters: {
      companyId: filters.companyId ?? "all",
      workspaceId: filters.workspaceId ?? "all",
      area: filters.area ?? "all",
      status: filters.status ?? "all",
      period: filters.period ?? "month",
      startDate: format(range.start, "yyyy-MM-dd"),
      endDate: format(range.end, "yyyy-MM-dd"),
    },
    range: {
      label: `${format(range.start, "dd/MM/yyyy")} - ${format(range.end, "dd/MM/yyyy")}`,
      previousLabel: `${format(previousRange.start, "dd/MM/yyyy")} - ${format(previousRange.end, "dd/MM/yyyy")}`,
      days: range.days,
    },
    filterOptions: {
      companies: filterCompanies,
      workspaces: filterWorkspaces,
      areas: Array.from(new Set(scaffolds.map((item) => item.area).filter(Boolean))).sort(),
      statuses: [
        { value: "liberado", label: "Liberados" },
        { value: "em_montagem", label: "Em montagem" },
        { value: "pendente_liberacao", label: "Pendentes" },
        { value: "interditado", label: "Interditados" },
        { value: "vencido", label: "Vencidos" },
        { value: "desmontado", label: "Desmontados" },
      ],
    },
    kpis,
    series,
    statusDistribution,
    rankings,
    productivity,
    map,
    insights,
  };
}

function resolveDateRange(filters: ExecutiveDashboardFilters) {
  const today = endOfDay(new Date());
  const start = filters.startDate ? startOfDay(new Date(filters.startDate)) : null;
  const end = filters.endDate ? endOfDay(new Date(filters.endDate)) : null;
  if (start && end && start <= end) {
    return {
      start,
      end,
      days: Math.max(1, differenceInCalendarDays(end, start) + 1),
    };
  }

  const daysByPeriod: Record<ExecutivePeriod, number> = {
    week: 7,
    month: 30,
    quarter: 90,
    year: 365,
  };
  const days = daysByPeriod[filters.period ?? "month"];
  return {
    start: startOfDay(subDays(today, days - 1)),
    end: today,
    days,
  };
}

function buildCommonWhere(
  scopedWhere: ReturnType<typeof dataScopeWhere>,
  filters: ExecutiveDashboardFilters,
  range: { start: Date; end: Date },
) {
  const scopeFilters = {
    ...scopedWhere,
    ...(filters.companyId && filters.companyId !== "all"
      ? { companyId: filters.companyId }
      : {}),
    ...(filters.workspaceId && filters.workspaceId !== "all"
      ? { workspaceId: filters.workspaceId }
      : {}),
  };
  const scaffoldFilters = {
    ...scopeFilters,
    ...(filters.area && filters.area !== "all" ? { area: filters.area } : {}),
    ...(filters.status && filters.status !== "all"
      ? { status: filters.status as Prisma.EnumScaffoldStatusFilter["equals"] }
      : {}),
    created_at: { gte: range.start, lte: range.end },
  } satisfies Prisma.ScaffoldWhereInput;

  return {
    scaffold: scaffoldFilters,
    inspection: {
      ...scopeFilters,
      date: { gte: range.start, lte: range.end },
      ...(filters.area && filters.area !== "all"
        ? { scaffold: { area: filters.area } }
        : {}),
    } satisfies Prisma.InspectionWhereInput,
    nonConformity: {
      ...scopeFilters,
      createdAt: { gte: range.start, lte: range.end },
      ...(filters.area && filters.area !== "all"
        ? { scaffold: { area: filters.area } }
        : {}),
    } satisfies Prisma.NonConformityWhereInput,
    notification: {
      ...scopeFilters,
      createdAt: { gte: range.start, lte: range.end },
    } satisfies Prisma.NotificationWhereInput,
  };
}

function isApprovedInspection(item: { result: string }) {
  return item.result === "aprovado" || item.result === "aprovado_com_ressalvas";
}

function isScaffoldExpired(status: string, validityDate: Date | null, end: Date) {
  return status === "vencido" || Boolean(validityDate && validityDate < end);
}

function percentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}

function averageDays(valuesMs: number[]) {
  if (valuesMs.length === 0) return 0;
  const averageMs = valuesMs.reduce((total, value) => total + value, 0) / valuesMs.length;
  return Math.round((averageMs / DAY_IN_MS) * 10) / 10;
}

function buildKpi(
  id: string,
  label: string,
  value: number,
  previous: number,
  tone: KpiTone,
  tooltip: string,
  unit = "",
): Kpi {
  const trend = previous === 0 ? (value === 0 ? 0 : 100) : Math.round(((value - previous) / previous) * 1000) / 10;
  const formatted = unit === "%" ? `${formatNumber(value)}%` : `${formatNumber(value)}${unit}`;
  const delta = value - previous;
  return {
    id,
    label,
    value: formatted,
    rawValue: value,
    unit,
    tone,
    trend,
    comparison:
      delta === 0
        ? "sem variação"
        : `${delta > 0 ? "+" : ""}${formatNumber(delta)} vs. período anterior`,
    tooltip,
  };
}

function buildSeries(
  range: { start: Date; end: Date; days: number },
  period: ExecutivePeriod,
  data: {
    inspections: Array<ScopedRecord & { date: Date }>;
    nonConformities: Array<ScopedRecord & { createdAt: Date }>;
    scaffolds: Array<{ created_at: Date; released_at: Date | null; status: string }>;
    notifications: Array<{ createdAt: Date }>;
  },
): SeriesPoint[] {
  const bucketDays = period === "year" ? 30 : period === "quarter" ? 14 : period === "week" ? 1 : 7;
  const buckets: Array<{ start: Date; end: Date; label: string } & SeriesPoint> = [];
  for (let cursor = range.start; cursor <= range.end; cursor = addDays(cursor, bucketDays)) {
    const bucketEnd = endOfDay(addDays(cursor, bucketDays - 1));
    buckets.push({
      start: cursor,
      end: bucketEnd > range.end ? range.end : bucketEnd,
      label:
        bucketDays === 1
          ? format(cursor, "dd/MM", { locale: ptBR })
          : `${format(cursor, "dd/MM")} - ${format(bucketEnd > range.end ? range.end : bucketEnd, "dd/MM")}`,
      inspections: 0,
      nonConformities: 0,
      released: 0,
      interdictions: 0,
      criticalNotifications: 0,
    });
  }

  for (const inspection of data.inspections) incrementBucket(buckets, inspection.date, "inspections");
  for (const nc of data.nonConformities) incrementBucket(buckets, nc.createdAt, "nonConformities");
  for (const scaffold of data.scaffolds) {
    if (scaffold.released_at) incrementBucket(buckets, scaffold.released_at, "released");
    if (scaffold.status === "interditado") incrementBucket(buckets, scaffold.created_at, "interdictions");
  }
  for (const notification of data.notifications) incrementBucket(buckets, notification.createdAt, "criticalNotifications");

  return buckets.map((bucket) => ({
    label: bucket.label,
    inspections: bucket.inspections,
    nonConformities: bucket.nonConformities,
    released: bucket.released,
    interdictions: bucket.interdictions,
    criticalNotifications: bucket.criticalNotifications,
  }));
}

function incrementBucket(
  buckets: Array<{ start: Date; end: Date } & SeriesPoint>,
  date: Date,
  key: keyof Omit<SeriesPoint, "label">,
) {
  const bucket = buckets.find((item) => date >= item.start && date <= item.end);
  if (bucket) bucket[key] += 1;
}

function buildStatusDistribution(
  scaffolds: Array<{ status: string }>,
  expiredScaffolds: Array<{ id: string }>,
) {
  const labels: Record<string, string> = {
    liberado: "Liberados",
    em_montagem: "Em montagem",
    pendente_liberacao: "Pendentes",
    interditado: "Interditados",
    vencido: "Vencidos",
    desmontado: "Desmontados",
  };
  const counts = new Map<string, number>();
  for (const scaffold of scaffolds) {
    counts.set(scaffold.status, (counts.get(scaffold.status) ?? 0) + 1);
  }
  counts.set("vencido", Math.max(counts.get("vencido") ?? 0, expiredScaffolds.length));
  const total = Math.max(1, scaffolds.length);
  return Object.entries(labels).map(([status, label]) => {
    const totalStatus = counts.get(status) ?? 0;
    return {
      status,
      label,
      total: totalStatus,
      percentage: Math.round((totalStatus / total) * 1000) / 10,
    };
  });
}

function buildRankings(
  scaffolds: Array<{
    status: string;
    area: string;
    tenantCompany: { id: string; name: string };
    workspace: { id: string; name: string };
  }>,
  inspections: Array<{
    inspector_name: string;
    result: string;
    scaffold: {
      area: string;
      tenantCompany: { id: string; name: string };
      workspace: { id: string; name: string };
    };
  }>,
  nonConformities: Array<{
    code: string;
    title: string;
    checklistItems: Array<{
      checklistEntry: {
        item_label: string;
      };
    }>;
    status: string;
    classification: string;
    scaffold: {
      area: string;
      tenantCompany: { id: string; name: string };
      workspace: { id: string; name: string };
    };
  }>,
) {
  const companyVolume = rankBy(scaffolds, (item) => item.tenantCompany.name);
  const areaVolume = rankBy(scaffolds, (item) => item.area || "Sem área");
  const inspectorVolume = rankBy(inspections, (item) => item.inspector_name || "Sem inspetor");
  const ncVolume = rankNonConformityTypes(nonConformities);
  const workspaceVolume = rankBy(scaffolds, (item) => item.workspace.name);
  const approvalByCompany = rankRatio(inspections, (item) => item.scaffold.tenantCompany.name, isApprovedInspection);
  const interdictionsByCompany = rankBy(
    scaffolds.filter((item) => item.status === "interditado"),
    (item) => item.tenantCompany.name,
  );

  return {
    companies: companyVolume,
    areas: areaVolume,
    inspectors: inspectorVolume,
    nonConformities: ncVolume,
    workspaces: workspaceVolume,
    approvalCompanies: approvalByCompany,
    interdictionCompanies: interdictionsByCompany,
  };
}

function rankNonConformityTypes(
  nonConformities: Array<{
    title: string;
    checklistItems: Array<{
      checklistEntry: {
        item_label: string;
      };
    }>;
  }>,
) {
  const totals = new Map<string, number>();
  for (const item of nonConformities) {
    const labels = item.checklistItems.length
      ? item.checklistItems.map((checklistItem) =>
          summarizeChecklistNonConformity(
            checklistItem.checklistEntry.item_label,
          ),
        )
      : [summarizeChecklistNonConformity(item.title)];

    for (const label of labels) {
      totals.set(label, (totals.get(label) ?? 0) + 1);
    }
  }

  return [...totals]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .slice(0, 8);
}

function buildProductivity(
  scaffolds: Array<{ created_at: Date; released_at: Date | null; assembly_completed_at?: Date | null }>,
  inspections: Array<{
    inspector_name: string;
    date: Date;
    scaffold: {
      area: string;
      tenantCompany: { name: string };
    };
  }>,
  nonConformities: Array<{ createdAt: Date; closedAt: Date | null }>,
  days: number,
) {
  const releaseTimes = scaffolds.flatMap((item) =>
    item.released_at
      ? [differenceInMilliseconds(item.released_at, item.created_at)]
      : [],
  );
  const ncTimes = nonConformities.flatMap((item) =>
    item.closedAt ? [differenceInMilliseconds(item.closedAt, item.createdAt)] : [],
  );

  return {
    byInspector: rankBy(inspections, (item) => item.inspector_name || "Sem inspetor"),
    byCompany: rankBy(inspections, (item) => item.scaffold.tenantCompany.name),
    byArea: rankBy(inspections, (item) => item.scaffold.area || "Sem área"),
    averageReleaseDays: averageDays(releaseTimes),
    averageNcClosureDays: averageDays(ncTimes),
    daily: Math.round((inspections.length / Math.max(1, days)) * 10) / 10,
    monthly: Math.round((inspections.length / Math.max(1, days)) * 30 * 10) / 10,
  };
}

function buildMap(
  scaffolds: Array<{
    id: string;
    code: string;
    status: string;
    location: string;
    area: string;
    responsible: string;
    companyId: string;
    latitude: number | null;
    longitude: number | null;
    validity_date: Date | null;
    location_description: string | null;
    tenantCompany: { name: string };
    workspace: { name: string };
    inspections: Array<{ date: Date; result: string }>;
  }>,
) {
  const byArea = rankBy(scaffolds, (item) => item.area || "Sem área");
  const pins = scaffolds
    .filter((item) => typeof item.latitude === "number" && typeof item.longitude === "number")
    .map((item) => ({
      id: item.id,
      code: item.code,
      status: item.status,
      effectiveStatus: isScaffoldExpired(item.status, item.validity_date, new Date())
        ? "vencido"
        : item.status,
      location: item.location,
      area: item.area,
      responsible: item.responsible,
      companyId: item.companyId,
      company: item.tenantCompany.name,
      companyName: item.tenantCompany.name,
      workspace: item.workspace.name,
      locationDescription: item.location_description,
      validity_date: item.validity_date ? item.validity_date.toISOString() : null,
      latitude: item.latitude as number,
      longitude: item.longitude as number,
      lastInspection: item.inspections[0]
        ? {
            date: item.inspections[0].date.toISOString(),
            result: item.inspections[0].result,
          }
        : null,
    }));

  return { byArea, pins };
}

function buildInsights(input: {
  rankings: ReturnType<typeof buildRankings>;
  kpis: Kpi[];
  approvalRate: number;
  previousApprovalRate: number;
  averageCorrectionDays: number;
  previousAverageCorrectionDays: number;
  openNcs: unknown[];
  previousOpenNcs: unknown[];
  inspections: unknown[];
}) {
  const insights: Array<{ title: string; detail: string; tone: KpiTone }> = [];
  const topArea = input.rankings.areas[0];
  if (topArea) {
    insights.push({
      title: "Área com maior concentração operacional",
      detail: `${topArea.name} concentra ${topArea.total} andaime(s) no período filtrado.`,
      tone: "neutral",
    });
  }
  const topInspector = input.rankings.inspectors[0];
  if (topInspector) {
    insights.push({
      title: "Maior produtividade de inspeção",
      detail: `${topInspector.name} registrou ${topInspector.total} inspeção(ões).`,
      tone: "success",
    });
  }
  const approvalDelta = input.approvalRate - input.previousApprovalRate;
  insights.push({
    title: approvalDelta >= 0 ? "Tendência de aprovação positiva" : "Queda na taxa de aprovação",
    detail: `A taxa de aprovação variou ${approvalDelta >= 0 ? "+" : ""}${formatNumber(approvalDelta)} p.p. frente ao período anterior.`,
    tone: approvalDelta >= 0 ? "success" : "warning",
  });
  const ncDelta = input.openNcs.length - input.previousOpenNcs.length;
  insights.push({
    title: ncDelta <= 0 ? "NCs abertas sob controle" : "Atenção ao volume de NCs",
    detail: `As NCs abertas variaram ${ncDelta >= 0 ? "+" : ""}${ncDelta} em relação ao período anterior.`,
    tone: ncDelta <= 0 ? "success" : "critical",
  });
  const correctionDelta = input.averageCorrectionDays - input.previousAverageCorrectionDays;
  insights.push({
    title: correctionDelta <= 0 ? "Correções mais rápidas" : "Tempo de correção aumentou",
    detail: `O tempo médio de correção variou ${correctionDelta >= 0 ? "+" : ""}${formatNumber(correctionDelta)} dia(s).`,
    tone: correctionDelta <= 0 ? "success" : "warning",
  });

  return insights.slice(0, 6);
}

function rankBy<T>(items: T[], key: (item: T) => string) {
  const totals = new Map<string, number>();
  for (const item of items) {
    const name = key(item);
    totals.set(name, (totals.get(name) ?? 0) + 1);
  }
  return Array.from(totals.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .slice(0, 8);
}

function rankRatio<T>(
  items: T[],
  key: (item: T) => string,
  success: (item: T) => boolean,
) {
  const totals = new Map<string, { total: number; success: number }>();
  for (const item of items) {
    const name = key(item);
    const current = totals.get(name) ?? { total: 0, success: 0 };
    current.total += 1;
    if (success(item)) current.success += 1;
    totals.set(name, current);
  }
  return Array.from(totals.entries())
    .map(([name, value]) => ({
      name,
      total: Math.round((value.success / Math.max(1, value.total)) * 1000) / 10,
      detail: `${value.success}/${value.total} aprovações`,
    }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .slice(0, 8);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value);
}

function isMissingNotificationTables(error: unknown) {
  const knownError = error as { code?: string; message?: string };
  return (
    knownError.code === "P2021" ||
    knownError.message?.includes("notifications")
  );
}
