import "server-only";

import {
  InspectionResult,
  NonConformityStatus,
  Prisma,
  ScaffoldStatus,
} from "@prisma/client";
import {
  differenceInCalendarDays,
  differenceInMilliseconds,
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns";

import { requireAnyPermission } from "@/lib/authz";
import { dataScopeWhere, getDataScope } from "@/lib/data-scope";
import { prisma } from "@/lib/prisma";

const DAY_IN_MS = 86_400_000;

export type ReportPeriodKey =
  | "today"
  | "7d"
  | "30d"
  | "month"
  | "custom";

export type ManagementReportFilters = {
  companyId: string;
  workspaceId: string;
  area: string;
  period: ReportPeriodKey;
  dateFrom: string;
  dateTo: string;
};

export type ManagementReportData = Awaited<
  ReturnType<typeof getManagementReportData>
>;

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function parseDate(value: string | undefined | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolvePeriod(filters: ManagementReportFilters) {
  const today = new Date();

  if (filters.period === "today") {
    return { from: startOfDay(today), to: endOfDay(today) };
  }

  if (filters.period === "7d") {
    return { from: startOfDay(subDays(today, 6)), to: endOfDay(today) };
  }

  if (filters.period === "month") {
    return { from: startOfMonth(today), to: endOfDay(today) };
  }

  if (filters.period === "custom") {
    const from = parseDate(filters.dateFrom);
    const to = parseDate(filters.dateTo);
    return {
      from: from ? startOfDay(from) : startOfDay(subDays(today, 29)),
      to: to ? endOfDay(to) : endOfDay(today),
    };
  }

  return { from: startOfDay(subDays(today, 29)), to: endOfDay(today) };
}

function resolvePreviousPeriod(from: Date, to: Date) {
  const duration = to.getTime() - from.getTime();
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - duration);

  return { previousFrom, previousTo };
}

function normalizeFilters(
  params: Record<string, string | string[] | undefined>,
): ManagementReportFilters {
  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] ?? "" : value ?? "";
  };
  const period = single("period") as ReportPeriodKey;

  return {
    companyId: single("companyId") || "all",
    workspaceId: single("workspaceId") || "all",
    area: single("area") || "all",
    period: ["today", "7d", "30d", "month", "custom"].includes(period)
      ? period
      : "30d",
    dateFrom: single("dateFrom"),
    dateTo: single("dateTo"),
  };
}

function dateRangeWhere(field: string, from: Date, to: Date) {
  return {
    [field]: {
      gte: from,
      lte: to,
    },
  };
}

function applySelectionScope(
  where: Prisma.ScaffoldWhereInput,
  filters: ManagementReportFilters,
) {
  return {
    ...where,
    ...(filters.companyId !== "all" ? { companyId: filters.companyId } : {}),
    ...(filters.workspaceId !== "all"
      ? { workspaceId: filters.workspaceId }
      : {}),
    ...(filters.area !== "all" ? { area: filters.area } : {}),
  } satisfies Prisma.ScaffoldWhereInput;
}

function applySelectionScopeToInspection(
  where: Prisma.InspectionWhereInput,
  filters: ManagementReportFilters,
) {
  return {
    ...where,
    ...(filters.companyId !== "all" ? { companyId: filters.companyId } : {}),
    ...(filters.workspaceId !== "all"
      ? { workspaceId: filters.workspaceId }
      : {}),
    ...(filters.area !== "all" ? { scaffold: { area: filters.area } } : {}),
  } satisfies Prisma.InspectionWhereInput;
}

function applySelectionScopeToNonConformity(
  where: Prisma.NonConformityWhereInput,
  filters: ManagementReportFilters,
) {
  return {
    ...where,
    ...(filters.companyId !== "all" ? { companyId: filters.companyId } : {}),
    ...(filters.workspaceId !== "all"
      ? { workspaceId: filters.workspaceId }
      : {}),
    ...(filters.area !== "all" ? { scaffold: { area: filters.area } } : {}),
  } satisfies Prisma.NonConformityWhereInput;
}

function buildDailyBuckets(from: Date, to: Date) {
  const totalDays = Math.max(1, differenceInCalendarDays(to, from) + 1);
  const bucketCount = Math.min(totalDays, 14);
  const step = Math.max(1, Math.ceil(totalDays / bucketCount));
  const buckets: Array<{ key: string; label: string; from: Date; to: Date }> =
    [];

  for (let offset = 0; offset < totalDays; offset += step) {
    const bucketFrom = startOfDay(
      new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset),
    );
    const bucketTo = endOfDay(
      new Date(
        from.getFullYear(),
        from.getMonth(),
        from.getDate() + Math.min(offset + step - 1, totalDays - 1),
      ),
    );
    buckets.push({
      key: format(bucketFrom, "yyyy-MM-dd"),
      label:
        step === 1
          ? format(bucketFrom, "dd/MM")
          : `${format(bucketFrom, "dd/MM")} - ${format(bucketTo, "dd/MM")}`,
      from: bucketFrom,
      to: bucketTo,
    });
  }

  return buckets;
}

function inBucket(date: Date, bucket: { from: Date; to: Date }) {
  return date >= bucket.from && date <= bucket.to;
}

function formatDateIso(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function getOperationDays(
  scaffolds: Array<{
    released_at: Date | null;
    assembly_completed_at: Date | null;
    created_at: Date;
    dismantled_at: Date | null;
  }>,
) {
  return scaffolds.flatMap((item) => {
    const start = item.released_at ?? item.assembly_completed_at ?? item.created_at;
    if (!start || !item.dismantled_at) return [];
    const days = differenceInMilliseconds(item.dismantled_at, start) / DAY_IN_MS;
    return days >= 0 ? [days] : [];
  });
}

function getCorrectionDays(
  nonConformities: Array<{
    createdAt: Date;
    closedAt: Date | null;
  }>,
) {
  return nonConformities.flatMap((item) => {
    if (!item.closedAt) return [];
    const days = differenceInMilliseconds(item.closedAt, item.createdAt) / DAY_IN_MS;
    return days >= 0 ? [days] : [];
  });
}

export async function getManagementReportData(
  searchParams: Record<string, string | string[] | undefined>,
) {
  await requireAnyPermission(["read.all", "read.own_company"]);

  const scope = await getDataScope();
  const scopedWhere = dataScopeWhere(scope);
  const filters = normalizeFilters(searchParams);
  const { from, to } = resolvePeriod(filters);
  const { previousFrom, previousTo } = resolvePreviousPeriod(from, to);

  const scopedScaffoldWhere = applySelectionScope(
    {
      ...scopedWhere,
      ...dateRangeWhere("created_at", from, to),
    },
    filters,
  );
  const allScopedScaffoldWhere = applySelectionScope(
    {
      ...scopedWhere,
    },
    filters,
  );
  const scopedInspectionWhere = applySelectionScopeToInspection(
    {
      ...scopedWhere,
      ...dateRangeWhere("date", from, to),
    },
    filters,
  );
  const scopedNonConformityWhere = applySelectionScopeToNonConformity(
    {
      ...scopedWhere,
      ...dateRangeWhere("createdAt", from, to),
    },
    filters,
  );
  const closedNcWhere = applySelectionScopeToNonConformity(
    {
      ...scopedWhere,
      status: NonConformityStatus.CLOSED,
      closedAt: { gte: from, lte: to },
    },
    filters,
  );
  const previousInspectionWhere = applySelectionScopeToInspection(
    {
      ...scopedWhere,
      ...dateRangeWhere("date", previousFrom, previousTo),
    },
    filters,
  );
  const previousClosedNcWhere = applySelectionScopeToNonConformity(
    {
      ...scopedWhere,
      status: NonConformityStatus.CLOSED,
      closedAt: { gte: previousFrom, lte: previousTo },
    },
    filters,
  );

  const [
    companies,
    workspaces,
    areas,
    scaffolds,
    inspections,
    nonConformities,
    closedNonConformities,
    dismantledScaffolds,
    previousInspections,
    previousClosedNonConformities,
    previousDismantledScaffolds,
  ] = await Promise.all([
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
    prisma.scaffold.groupBy({
      by: ["area"],
      where: {
        ...allScopedScaffoldWhere,
        area: { not: "" },
      },
      orderBy: { area: "asc" },
    }),
    prisma.scaffold.findMany({
      where: scopedScaffoldWhere,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        code: true,
        area: true,
        status: true,
        created_at: true,
        tenantCompany: { select: { id: true, name: true } },
        workspace: { select: { id: true, name: true } },
        _count: { select: { inspections: true, nonConformities: true } },
      },
    }),
    prisma.inspection.findMany({
      where: scopedInspectionWhere,
      orderBy: { date: "desc" },
      select: {
        id: true,
        scaffold_id: true,
        scaffold_code: true,
        date: true,
        inspector_name: true,
        result: true,
        companyId: true,
        workspaceId: true,
        scaffold: {
          select: {
            area: true,
            tenantCompany: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.nonConformity.findMany({
      where: scopedNonConformityWhere,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        status: true,
        createdAt: true,
        dueDate: true,
        closedAt: true,
        companyId: true,
        workspaceId: true,
        scaffold: {
          select: {
            area: true,
            tenantCompany: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.nonConformity.findMany({
      where: closedNcWhere,
      select: { id: true, createdAt: true, closedAt: true },
    }),
    prisma.scaffold.findMany({
      where: applySelectionScope(
        {
          ...scopedWhere,
          status: ScaffoldStatus.desmontado,
          dismantled_at: { gte: from, lte: to },
        },
        filters,
      ),
      select: {
        id: true,
        released_at: true,
        assembly_completed_at: true,
        created_at: true,
        dismantled_at: true,
      },
    }),
    prisma.inspection.findMany({
      where: previousInspectionWhere,
      select: {
        id: true,
        result: true,
      },
    }),
    prisma.nonConformity.findMany({
      where: previousClosedNcWhere,
      select: { id: true, createdAt: true, closedAt: true },
    }),
    prisma.scaffold.findMany({
      where: applySelectionScope(
        {
          ...scopedWhere,
          status: ScaffoldStatus.desmontado,
          dismantled_at: { gte: previousFrom, lte: previousTo },
        },
        filters,
      ),
      select: {
        id: true,
        released_at: true,
        assembly_completed_at: true,
        created_at: true,
        dismantled_at: true,
      },
    }),
  ]);

  const scaffoldStatus = {
    total: scaffolds.length,
    liberados: scaffolds.filter((item) => item.status === "liberado").length,
    emMontagem: scaffolds.filter((item) => item.status === "em_montagem")
      .length,
    pendentes: scaffolds.filter(
      (item) => item.status === "pendente_liberacao",
    ).length,
    interditados: scaffolds.filter((item) => item.status === "interditado")
      .length,
    vencidos: scaffolds.filter((item) => item.status === "vencido").length,
    desmontados: scaffolds.filter((item) => item.status === "desmontado")
      .length,
  };

  const inspectionKpis = {
    total: inspections.length,
    aprovadas: inspections.filter(
      (item) => item.result === InspectionResult.aprovado,
    ).length,
    reprovadas: inspections.filter(
      (item) => item.result === InspectionResult.reprovado,
    ).length,
    ressalvas: inspections.filter(
      (item) => item.result === InspectionResult.aprovado_com_ressalvas,
    ).length,
  };

  const ncKpis = {
    abertas: nonConformities.filter((item) => item.status === "OPEN").length,
    emTratamento: nonConformities.filter((item) =>
      ["ASSIGNED", "IN_PROGRESS", "PENDING_VERIFICATION", "REJECTED"].includes(
        item.status,
      ),
    ).length,
    encerradas: nonConformities.filter((item) => item.status === "CLOSED")
      .length,
    vencidas: nonConformities.filter(
      (item) =>
        item.dueDate &&
        item.dueDate < new Date() &&
        !["CLOSED", "CANCELLED"].includes(item.status),
    ).length,
  };

  const operationDays = getOperationDays(dismantledScaffolds);
  const correctionDays = getCorrectionDays(closedNonConformities);
  const previousOperationDays = getOperationDays(previousDismantledScaffolds);
  const previousCorrectionDays = getCorrectionDays(previousClosedNonConformities);
  const previousInspectionKpis = {
    total: previousInspections.length,
    aprovadas: previousInspections.filter(
      (item) => item.result === InspectionResult.aprovado,
    ).length,
  };

  const inspectionsByScaffold = new Map<string, Date[]>();
  for (const inspection of inspections) {
    const dates = inspectionsByScaffold.get(inspection.scaffold_id) ?? [];
    dates.push(inspection.date);
    inspectionsByScaffold.set(inspection.scaffold_id, dates);
  }
  const intervals = [...inspectionsByScaffold.values()].flatMap((dates) => {
    const sorted = dates.sort((a, b) => a.getTime() - b.getTime());
    return sorted.slice(1).map((date, index) => {
      return differenceInMilliseconds(date, sorted[index]) / DAY_IN_MS;
    });
  }).filter((value) => value >= 0);

  const buckets = buildDailyBuckets(from, to);
  const inspectionTrend = buckets.map((bucket) => ({
    label: bucket.label,
    aprovadas: inspections.filter(
      (item) => item.result === "aprovado" && inBucket(item.date, bucket),
    ).length,
    reprovadas: inspections.filter(
      (item) => item.result === "reprovado" && inBucket(item.date, bucket),
    ).length,
    ressalvas: inspections.filter(
      (item) =>
        item.result === "aprovado_com_ressalvas" && inBucket(item.date, bucket),
    ).length,
  }));
  const nonConformityTrend = buckets.map((bucket) => ({
    label: bucket.label,
    abertas: nonConformities.filter((item) => inBucket(item.createdAt, bucket))
      .length,
    encerradas: nonConformities.filter(
      (item) => item.closedAt && inBucket(item.closedAt, bucket),
    ).length,
  }));

  const companyRank = new Map<
    string,
    { id: string; name: string; scaffolds: number; inspections: number; ncs: number }
  >();
  const areaRank = new Map<
    string,
    { name: string; scaffolds: number; inspections: number; ncs: number }
  >();
  const inspectorRank = new Map<
    string,
    { name: string; inspections: number; aprovadas: number; reprovadas: number }
  >();

  for (const scaffold of scaffolds) {
    const id = scaffold.tenantCompany.id;
    const item =
      companyRank.get(id) ??
      { id, name: scaffold.tenantCompany.name, scaffolds: 0, inspections: 0, ncs: 0 };
    item.scaffolds += 1;
    companyRank.set(id, item);

    const areaItem =
      areaRank.get(scaffold.area) ??
      { name: scaffold.area, scaffolds: 0, inspections: 0, ncs: 0 };
    areaItem.scaffolds += 1;
    areaRank.set(scaffold.area, areaItem);
  }
  for (const inspection of inspections) {
    const id = inspection.scaffold.tenantCompany.id;
    const item =
      companyRank.get(id) ??
      {
        id,
        name: inspection.scaffold.tenantCompany.name,
        scaffolds: 0,
        inspections: 0,
        ncs: 0,
      };
    item.inspections += 1;
    companyRank.set(id, item);

    const area = inspection.scaffold.area;
    const areaItem =
      areaRank.get(area) ?? { name: area, scaffolds: 0, inspections: 0, ncs: 0 };
    areaItem.inspections += 1;
    areaRank.set(area, areaItem);

    const inspector =
      inspectorRank.get(inspection.inspector_name) ??
      {
        name: inspection.inspector_name,
        inspections: 0,
        aprovadas: 0,
        reprovadas: 0,
      };
    inspector.inspections += 1;
    if (
      inspection.result === "aprovado" ||
      inspection.result === "aprovado_com_ressalvas"
    ) {
      inspector.aprovadas += 1;
    }
    if (inspection.result === "reprovado") inspector.reprovadas += 1;
    inspectorRank.set(inspection.inspector_name, inspector);
  }
  for (const nc of nonConformities) {
    const id = nc.scaffold.tenantCompany.id;
    const item =
      companyRank.get(id) ??
      { id, name: nc.scaffold.tenantCompany.name, scaffolds: 0, inspections: 0, ncs: 0 };
    item.ncs += 1;
    companyRank.set(id, item);

    const area = nc.scaffold.area;
    const areaItem =
      areaRank.get(area) ?? { name: area, scaffolds: 0, inspections: 0, ncs: 0 };
    areaItem.ncs += 1;
    areaRank.set(area, areaItem);
  }

  const options = {
    companies,
    workspaces,
    areas: areas.map((item) => item.area).filter(Boolean),
  };

  return {
    filters: {
      ...filters,
      dateFrom: formatDateIso(from),
      dateTo: formatDateIso(to),
    },
    periodLabel: `${format(from, "dd/MM/yyyy")} - ${format(to, "dd/MM/yyyy")}`,
    options,
    kpis: {
      scaffolds: scaffoldStatus,
      inspections: inspectionKpis,
      nonConformities: ncKpis,
      averages: {
        operationDays: average(operationDays),
        correctionDays: average(correctionDays),
        inspectionIntervalDays: average(intervals),
      },
    },
    trends: {
      approvalRate: {
        current:
          inspectionKpis.total > 0
            ? (inspectionKpis.aprovadas / inspectionKpis.total) * 100
            : null,
        previous:
          previousInspectionKpis.total > 0
            ? (previousInspectionKpis.aprovadas / previousInspectionKpis.total) *
              100
            : null,
      },
      operationDays: {
        current: average(operationDays),
        previous: average(previousOperationDays),
      },
      correctionDays: {
        current: average(correctionDays),
        previous: average(previousCorrectionDays),
      },
      closedNonConformities: {
        current: closedNonConformities.length,
        previous: previousClosedNonConformities.length,
      },
    },
    charts: {
      inspectionTrend,
      nonConformityTrend,
    },
    rankings: {
      companies: [...companyRank.values()]
        .sort((a, b) => b.scaffolds + b.inspections + b.ncs - (a.scaffolds + a.inspections + a.ncs)),
      areas: [...areaRank.values()]
        .sort((a, b) => b.scaffolds + b.inspections + b.ncs - (a.scaffolds + a.inspections + a.ncs)),
      inspectors: [...inspectorRank.values()]
        .sort((a, b) => b.inspections - a.inspections),
    },
    exportRows: {
      scaffolds: scaffolds.map((item) => ({
        tag: item.code,
        area: item.area,
        empresa: item.tenantCompany.name,
        workspace: item.workspace.name,
        status: item.status,
        criadoEm: format(item.created_at, "dd/MM/yyyy"),
      })),
      inspections: inspections.map((item) => ({
        andaime: item.scaffold_code,
        data: format(item.date, "dd/MM/yyyy"),
        inspetor: item.inspector_name,
        resultado: item.result,
        empresa: item.scaffold.tenantCompany.name,
        area: item.scaffold.area,
      })),
      nonConformities: nonConformities.map((item) => ({
        codigo: item.code,
        status: item.status,
        empresa: item.scaffold.tenantCompany.name,
        area: item.scaffold.area,
        abertura: format(item.createdAt, "dd/MM/yyyy"),
        encerramento: item.closedAt ? format(item.closedAt, "dd/MM/yyyy") : "",
      })),
    },
  };
}
