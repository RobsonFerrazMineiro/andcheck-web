import "server-only";

import {
  InspectionResult,
  NonConformityStatus,
  Prisma,
  ScaffoldStatus,
} from "@prisma/client";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  differenceInMilliseconds,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";

import { getCurrentUserAccess, requireAnyPermission } from "@/lib/authz";
import { dataScopeWhere, getDataScope } from "@/lib/data-scope";
import { prisma } from "@/lib/prisma";

const DAY_IN_MS = 86_400_000;

export type ReportPeriodKey =
  | "today"
  | "7d"
  | "30d"
  | "90d"
  | "365d"
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

export type ManagementReportOption = {
  id: string;
  name: string;
};

export type ManagementReportAreaRanking = {
  name: string;
  scaffolds: number;
  inspections: number;
  ncs: number;
  companies: string[];
  workspaces: string[];
};

export type ManagementReportCompanyRanking = {
  id: string;
  name: string;
  scaffolds: number;
  inspections: number;
  ncs: number;
  aprovadas: number;
  reprovadas: number;
  ressalvas: number;
  approvalRate: number | null;
};

export type ManagementReportInspectorRanking = {
  name: string;
  inspections: number;
  aprovadas: number;
  reprovadas: number;
  ressalvas: number;
  approvalRate: number | null;
};

export type ManagementReportNonConformityRanking = {
  title: string;
  occurrences: number;
};

export type ManagementReportNonConformityTrend = {
  label: string;
  abertas: number;
  encerradas: number;
};

export type ManagementReportGranularity = "day" | "week" | "month" | "quarter";

export type ManagementReportData = {
  filters: ManagementReportFilters;
  periodLabel: string;
  exportedBy: string;
  options: {
    companies: ManagementReportOption[];
    workspaces: ManagementReportOption[];
    areas: string[];
  };
  kpis: {
    scaffolds: {
      total: number;
      liberados: number;
      emMontagem: number;
      pendentes: number;
      interditados: number;
      vencidos: number;
      desmontados: number;
    };
    inspections: {
      total: number;
      aprovadas: number;
      reprovadas: number;
      ressalvas: number;
    };
    nonConformities: {
      abertas: number;
      emTratamento: number;
      encerradas: number;
      vencidas: number;
    };
    averages: {
      operationDays: number | null;
      correctionDays: number | null;
      inspectionIntervalDays: number | null;
    };
    quality: {
      onTimeClosureRate: number | null;
      utilizationRate: number | null;
      activeScaffolds: number;
    };
  };
  trends: {
    approvalRate: KpiTrend;
    operationDays: KpiTrend;
    correctionDays: KpiTrend;
    closedNonConformities: KpiTrend;
    onTimeClosureRate: KpiTrend;
  };
  charts: {
    granularity: "day" | "week" | "month" | "quarter";
    inspectionTrend: Array<{
      label: string;
      aprovadas: number;
      reprovadas: number;
      ressalvas: number;
    }>;
    nonConformityTrend: ManagementReportNonConformityTrend[];
  };
  rankings: {
    companies: ManagementReportCompanyRanking[];
    areas: ManagementReportAreaRanking[];
    inspectors: ManagementReportInspectorRanking[];
    nonConformities: ManagementReportNonConformityRanking[];
  };
  exportRows: {
    scaffolds: Array<Record<string, string>>;
    inspections: Array<Record<string, string | number>>;
    nonConformities: Array<Record<string, string | number | null>>;
  };
};

export type TrendDirection = "up" | "down" | "neutral" | "none";

export type TrendStatus =
  | "positive"
  | "negative"
  | "neutral"
  | "no-history"
  | "new-record";

export type KpiTrend = {
  direction: TrendDirection;
  status: TrendStatus;
  label: string;
  currentValue: number;
  previousValue: number | null;
  absoluteDiff: number | null;
  percentDiff: number | null;
};

export type ManagementReportFilterLabels = {
  company: string;
  workspace: string;
  area: string;
};

type MetricType = "percentage" | "number" | "days";
type TrendPolarity = "higher-is-better" | "lower-is-better";

export function calculateKpiTrend({
  currentValue,
  previousValue,
  metricType,
  polarity,
  unitLabel = "",
}: {
  currentValue: number | null;
  previousValue: number | null;
  metricType: MetricType;
  polarity: TrendPolarity;
  unitLabel?: string;
}): KpiTrend {
  const current = currentValue ?? 0;

  if (currentValue === null) {
    return {
      direction: "none",
      status: "no-history",
      label: "Sem base histórica",
      currentValue: current,
      previousValue: previousValue ?? null,
      absoluteDiff: null,
      percentDiff: null,
    };
  }

  if (previousValue === null) {
    return {
      direction: "none",
      status: currentValue > 0 ? "new-record" : "no-history",
      label: currentValue > 0 ? "Novo registro" : "Sem base histórica",
      currentValue,
      previousValue: null,
      absoluteDiff: null,
      percentDiff: null,
    };
  }

  const absoluteDiff = currentValue - previousValue;
  const roundedDiff = Math.round(absoluteDiff * 10) / 10;
  const percentDiff =
    previousValue !== 0 ? (absoluteDiff / Math.abs(previousValue)) * 100 : null;

  if (Math.abs(roundedDiff) < 0.1) {
    return {
      direction: "neutral",
      status: "neutral",
      label: "Estável",
      currentValue,
      previousValue,
      absoluteDiff: roundedDiff,
      percentDiff,
    };
  }

  const direction: TrendDirection = absoluteDiff > 0 ? "up" : "down";
  const positive =
    polarity === "lower-is-better" ? absoluteDiff < 0 : absoluteDiff > 0;
  const prefix = absoluteDiff > 0 ? "+" : "-";
  const value = Math.abs(roundedDiff).toLocaleString("pt-BR");
  const suffix = metricType === "percentage" ? "%" : unitLabel;

  return {
    direction,
    status: positive ? "positive" : "negative",
    label: `${prefix}${value}${suffix}`,
    currentValue,
    previousValue,
    absoluteDiff: roundedDiff,
    percentDiff,
  };
}

export function resolveManagementReportFilterLabels(
  report: ManagementReportData,
): ManagementReportFilterLabels {
  const company =
    report.filters.companyId === "all"
      ? "Todas as empresas"
      : report.options.companies.find((item) => item.id === report.filters.companyId)
          ?.name ?? "Empresa selecionada";
  const workspace =
    report.filters.workspaceId === "all"
      ? "Todos os workspaces"
      : report.options.workspaces.find(
          (item) => item.id === report.filters.workspaceId,
        )?.name ?? "Workspace selecionado";
  const area = report.filters.area === "all" ? "Todas as áreas" : report.filters.area;

  return { company, workspace, area };
}

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

  if (filters.period === "90d") {
    return { from: startOfDay(subDays(today, 89)), to: endOfDay(today) };
  }

  if (filters.period === "365d") {
    return { from: startOfDay(subDays(today, 364)), to: endOfDay(today) };
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
    period: ["today", "7d", "30d", "90d", "365d", "month", "custom"].includes(period)
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

function limitBucketDate(date: Date, limit: Date, direction: "from" | "to") {
  if (direction === "from") return date < limit ? limit : date;
  return date > limit ? limit : date;
}

function startOfQuarterLocal(date: Date) {
  const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3;
  return startOfDay(new Date(date.getFullYear(), quarterStartMonth, 1));
}

function endOfQuarterLocal(date: Date) {
  const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3;
  return endOfDay(endOfMonth(new Date(date.getFullYear(), quarterStartMonth + 2, 1)));
}

function formatMonthLabel(date: Date) {
  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  return `${months[date.getMonth()]}/${format(date, "yyyy")}`;
}

function formatQuarterLabel(date: Date) {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `T${quarter}/${format(date, "yyyy")}`;
}

function buildTimeBuckets(from: Date, to: Date) {
  const totalDays = Math.max(1, differenceInCalendarDays(to, from) + 1);
  const granularity: ManagementReportGranularity =
    totalDays <= 31
      ? "day"
      : totalDays <= 90
        ? "week"
        : totalDays <= 365
          ? "month"
          : "quarter";
  const buckets: Array<{ key: string; label: string; from: Date; to: Date }> =
    [];

  let cursor = startOfDay(from);
  while (cursor <= to) {
    const rawFrom =
      granularity === "day"
        ? startOfDay(cursor)
        : granularity === "week"
          ? startOfWeek(cursor, { weekStartsOn: 1 })
          : granularity === "month"
            ? startOfMonth(cursor)
            : startOfQuarterLocal(cursor);
    const rawTo =
      granularity === "day"
        ? endOfDay(cursor)
        : granularity === "week"
          ? endOfWeek(cursor, { weekStartsOn: 1 })
          : granularity === "month"
            ? endOfMonth(cursor)
            : endOfQuarterLocal(cursor);
    const bucketFrom = limitBucketDate(startOfDay(rawFrom), from, "from");
    const bucketTo = limitBucketDate(endOfDay(rawTo), to, "to");
    const label =
      granularity === "day"
        ? format(bucketFrom, "dd/MM")
        : granularity === "week"
          ? `${format(bucketFrom, "dd/MM")} - ${format(bucketTo, "dd/MM")}`
          : granularity === "month"
            ? formatMonthLabel(bucketFrom)
            : formatQuarterLabel(bucketFrom);

    buckets.push({
      key: format(bucketFrom, "yyyy-MM-dd"),
      label,
      from: bucketFrom,
      to: bucketTo,
    });

    cursor =
      granularity === "day"
        ? addDays(cursor, 1)
        : granularity === "week"
          ? addWeeks(startOfWeek(cursor, { weekStartsOn: 1 }), 1)
          : granularity === "month"
            ? addMonths(startOfMonth(cursor), 1)
            : addMonths(startOfQuarterLocal(cursor), 3);
  }

  return { buckets, granularity };
}

function findBucketIndex(
  buckets: Array<{ from: Date; to: Date }>,
  date: Date,
) {
  const time = date.getTime();
  let low = 0;
  let high = buckets.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const bucket = buckets[mid];
    if (time < bucket.from.getTime()) {
      high = mid - 1;
    } else if (time > bucket.to.getTime()) {
      low = mid + 1;
    } else {
      return mid;
    }
  }

  return -1;
}

function formatDateIso(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function formatDateBr(date?: Date | null) {
  return date ? format(date, "dd/MM/yyyy") : "";
}

function daysBetween(from: Date, to: Date) {
  return Math.max(0, differenceInCalendarDays(to, from));
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

function fixChecklistText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function summarizeChecklistNonConformity(label: string) {
  const clean = fixChecklistText(label);
  const normalized = clean
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (normalized.includes("guarda-corpo superior")) {
    return "Guarda-corpo superior ausente/irregular";
  }
  if (normalized.includes("guarda-corpo intermediario")) {
    return "Guarda-corpo intermediário ausente/irregular";
  }
  if (normalized.includes("rodape")) return "Rodapé ausente ou irregular";
  if (normalized.includes("plataformas de trabalho")) {
    return "Piso/plataforma incompleta ou destravada";
  }
  if (normalized.includes("base") || normalized.includes("sapatas")) {
    return "Base/sapatas inadequadas";
  }
  if (normalized.includes("contraventamento")) {
    return "Contraventamento ausente ou irregular";
  }
  if (normalized.includes("travamento") || normalized.includes("amarracao")) {
    return "Travamento/amarração inadequados";
  }
  if (normalized.includes("deformacoes") || normalized.includes("corrosao")) {
    return "Tubos com deformação, trinca ou corrosão";
  }
  if (normalized.includes("bracadeiras") || normalized.includes("acopladores")) {
    return "Braçadeiras/acopladores irregulares";
  }
  if (normalized.includes("montantes")) return "Montantes fora de prumo";
  if (normalized.includes("escada")) return "Acesso por escada irregular";
  if (normalized.includes("alcapao")) return "Alçapão de acesso irregular";
  if (normalized.includes("linha de vida")) return "Linha de vida ausente/irregular";
  if (normalized.includes("sinalizacao") || normalized.includes("isolamento")) {
    return "Sinalização ou isolamento da área ausente";
  }
  if (normalized.includes("tela de protecao")) return "Tela de proteção ausente";
  if (normalized.includes("rede de seguranca") || normalized.includes("bandeja")) {
    return "Rede de segurança/bandeja ausente";
  }
  if (normalized.includes("redes eletricas") || normalized.includes("distancia segura")) {
    return "Distância insegura de rede elétrica";
  }
  if (normalized.includes("aterramento")) return "Aterramento ausente/irregular";
  if (normalized.includes("iluminacao")) return "Iluminação inadequada";
  if (normalized.includes("art/rrt")) return "ART/RRT ausente, vencida ou inválida";
  if (normalized.includes("projeto estrutural")) return "Projeto estrutural ausente";
  if (normalized.includes("ordem de servico")) return "Ordem de serviço ausente/incompleta";
  if (normalized.includes("permissao de trabalho") || normalized.includes("pt")) {
    return "Permissão de trabalho ausente/vencida";
  }
  if (normalized.includes("capacitacao") || normalized.includes("treinamento")) {
    return "Capacitação/treinamento ausente ou vencido";
  }
  if (normalized.includes("memorial de calculo")) return "Memorial de cálculo ausente";
  if (normalized.includes("placa de identificacao")) {
    return "Placa de identificação/carga ausente";
  }
  if (normalized.includes("capacete")) return "Capacete com jugular ausente";
  if (normalized.includes("cinto de seguranca")) return "Cinto de segurança inadequado";
  if (normalized.includes("calcado")) return "Calçado de segurança inadequado";
  if (normalized.includes("luvas")) return "Luvas de proteção ausentes";
  if (normalized.includes("oculos")) return "Óculos de proteção ausentes";
  if (normalized.includes("aso")) return "ASO para trabalho em altura ausente/vencido";

  return clean.replace(/\s*\([^)]*\)/g, "").slice(0, 72);
}

export async function getManagementReportData(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<ManagementReportData> {
  await requireAnyPermission(["read.all", "read.own_company"]);

  const access = await getCurrentUserAccess();
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
    currentUser,
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
        released_at: true,
        validity_date: true,
        responsible: true,
        tenantCompany: { select: { id: true, name: true } },
        workspace: { select: { id: true, name: true } },
        inspections: {
          orderBy: { date: "desc" },
          take: 1,
          select: { date: true },
        },
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
        notes: true,
        companyId: true,
        workspaceId: true,
        _count: { select: { nonConformities: true } },
        scaffold: {
          select: {
            code: true,
            area: true,
            tenantCompany: { select: { id: true, name: true } },
            workspace: { select: { name: true } },
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
        title: true,
        status: true,
        createdAt: true,
        dueDate: true,
        closedAt: true,
        description: true,
        classification: true,
        companyId: true,
        workspaceId: true,
        responsibleUser: { select: { name: true } },
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
            code: true,
            area: true,
            tenantCompany: { select: { id: true, name: true } },
            workspace: { select: { name: true } },
          },
        },
      },
    }),
    prisma.nonConformity.findMany({
      where: closedNcWhere,
      select: { id: true, createdAt: true, dueDate: true, closedAt: true },
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
      select: { id: true, createdAt: true, dueDate: true, closedAt: true },
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
    access?.userId
      ? prisma.user.findUnique({
          where: { id: access.userId },
          select: { name: true, email: true },
        })
      : Promise.resolve(null),
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
  const activeScaffolds =
    scaffoldStatus.liberados +
    scaffoldStatus.emMontagem +
    scaffoldStatus.pendentes +
    scaffoldStatus.interditados +
    scaffoldStatus.vencidos;
  const utilizationRate =
    scaffoldStatus.total > 0 ? (activeScaffolds / scaffoldStatus.total) * 100 : null;

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
  const onTimeClosedNonConformities = closedNonConformities.filter(
    (item) => item.closedAt && item.dueDate && item.closedAt <= endOfDay(item.dueDate),
  ).length;
  const previousOnTimeClosedNonConformities = previousClosedNonConformities.filter(
    (item) => item.closedAt && item.dueDate && item.closedAt <= endOfDay(item.dueDate),
  ).length;
  const onTimeClosureRate =
    closedNonConformities.length > 0
      ? (onTimeClosedNonConformities / closedNonConformities.length) * 100
      : null;
  const previousOnTimeClosureRate =
    previousClosedNonConformities.length > 0
      ? (previousOnTimeClosedNonConformities / previousClosedNonConformities.length) * 100
      : null;
  const previousInspectionKpis = {
    total: previousInspections.length,
    aprovadas: previousInspections.filter(
      (item) => item.result === InspectionResult.aprovado,
    ).length,
  };
  const approvalRate =
    inspectionKpis.total > 0
      ? (inspectionKpis.aprovadas / inspectionKpis.total) * 100
      : null;
  const previousApprovalRate =
    previousInspectionKpis.total > 0
      ? (previousInspectionKpis.aprovadas / previousInspectionKpis.total) * 100
      : null;

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

  const { buckets, granularity } = buildTimeBuckets(from, to);
  const inspectionTrend = buckets.map((bucket) => ({
    label: bucket.label,
    aprovadas: 0,
    reprovadas: 0,
    ressalvas: 0,
  }));
  const nonConformityTrend = buckets.map((bucket) => ({
    label: bucket.label,
    abertas: 0,
    encerradas: 0,
  }));

  for (const inspection of inspections) {
    const index = findBucketIndex(buckets, inspection.date);
    if (index < 0) continue;
    if (inspection.result === "aprovado") inspectionTrend[index].aprovadas += 1;
    if (inspection.result === "reprovado") {
      inspectionTrend[index].reprovadas += 1;
    }
    if (inspection.result === "aprovado_com_ressalvas") {
      inspectionTrend[index].ressalvas += 1;
    }
  }

  for (const nonConformity of nonConformities) {
    const openedIndex = findBucketIndex(buckets, nonConformity.createdAt);
    if (openedIndex >= 0) nonConformityTrend[openedIndex].abertas += 1;

    if (nonConformity.closedAt) {
      const closedIndex = findBucketIndex(buckets, nonConformity.closedAt);
      if (closedIndex >= 0) {
        nonConformityTrend[closedIndex].encerradas += 1;
      }
    }
  }

  const companyRank = new Map<
    string,
    {
      id: string;
      name: string;
      scaffolds: number;
      inspections: number;
      ncs: number;
      aprovadas: number;
      reprovadas: number;
      ressalvas: number;
    }
  >();
  const areaRank = new Map<
    string,
    {
      name: string;
      scaffolds: number;
      inspections: number;
      ncs: number;
      companies: Set<string>;
      workspaces: Set<string>;
    }
  >();
  const inspectorRank = new Map<
    string,
    {
      name: string;
      inspections: number;
      aprovadas: number;
      reprovadas: number;
      ressalvas: number;
    }
  >();

  for (const scaffold of scaffolds) {
    const id = scaffold.tenantCompany.id;
    const item =
      companyRank.get(id) ??
      {
        id,
        name: scaffold.tenantCompany.name,
        scaffolds: 0,
        inspections: 0,
        ncs: 0,
        aprovadas: 0,
        reprovadas: 0,
        ressalvas: 0,
      };
    item.scaffolds += 1;
    companyRank.set(id, item);

    const areaItem =
      areaRank.get(scaffold.area) ??
      {
        name: scaffold.area,
        scaffolds: 0,
        inspections: 0,
        ncs: 0,
        companies: new Set<string>(),
        workspaces: new Set<string>(),
      };
    areaItem.scaffolds += 1;
    areaItem.companies.add(scaffold.tenantCompany.name);
    areaItem.workspaces.add(scaffold.workspace.name);
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
        aprovadas: 0,
        reprovadas: 0,
        ressalvas: 0,
      };
    item.inspections += 1;
    if (inspection.result === InspectionResult.aprovado) item.aprovadas += 1;
    if (inspection.result === InspectionResult.reprovado) item.reprovadas += 1;
    if (inspection.result === InspectionResult.aprovado_com_ressalvas) {
      item.ressalvas += 1;
    }
    companyRank.set(id, item);

    const area = inspection.scaffold.area;
    const areaItem =
      areaRank.get(area) ??
      {
        name: area,
        scaffolds: 0,
        inspections: 0,
        ncs: 0,
        companies: new Set<string>(),
        workspaces: new Set<string>(),
      };
    areaItem.inspections += 1;
    areaItem.companies.add(inspection.scaffold.tenantCompany.name);
    areaItem.workspaces.add(inspection.scaffold.workspace.name);
    areaRank.set(area, areaItem);

    const inspector =
      inspectorRank.get(inspection.inspector_name) ??
      {
        name: inspection.inspector_name,
        inspections: 0,
        aprovadas: 0,
        reprovadas: 0,
        ressalvas: 0,
      };
    inspector.inspections += 1;
    if (inspection.result === "aprovado") {
      inspector.aprovadas += 1;
    }
    if (inspection.result === "reprovado") inspector.reprovadas += 1;
    if (inspection.result === "aprovado_com_ressalvas") {
      inspector.ressalvas += 1;
    }
    inspectorRank.set(inspection.inspector_name, inspector);
  }
  for (const nc of nonConformities) {
    const id = nc.scaffold.tenantCompany.id;
    const item =
      companyRank.get(id) ??
      {
        id,
        name: nc.scaffold.tenantCompany.name,
        scaffolds: 0,
        inspections: 0,
        ncs: 0,
        aprovadas: 0,
        reprovadas: 0,
        ressalvas: 0,
      };
    item.ncs += 1;
    companyRank.set(id, item);

    const area = nc.scaffold.area;
    const areaItem =
      areaRank.get(area) ??
      {
        name: area,
        scaffolds: 0,
        inspections: 0,
        ncs: 0,
        companies: new Set<string>(),
        workspaces: new Set<string>(),
      };
    areaItem.ncs += 1;
    areaItem.companies.add(nc.scaffold.tenantCompany.name);
    areaItem.workspaces.add(nc.scaffold.workspace.name);
    areaRank.set(area, areaItem);
  }

  const options = {
    companies,
    workspaces,
    areas: areas.map((item) => item.area).filter(Boolean),
  };
  const companyRankings = [...companyRank.values()]
    .map((item) => ({
      ...item,
      approvalRate:
        item.inspections > 0
          ? ((item.aprovadas + item.ressalvas) / item.inspections) * 100
          : null,
    }))
    .sort(
      (a, b) =>
        b.scaffolds + b.inspections + b.ncs -
        (a.scaffolds + a.inspections + a.ncs),
    );
  const areaRankings = [...areaRank.values()]
    .map((item) => ({
      name: item.name,
      scaffolds: item.scaffolds,
      inspections: item.inspections,
      ncs: item.ncs,
      companies: [...item.companies],
      workspaces: [...item.workspaces],
    }))
    .sort(
      (a, b) =>
        b.scaffolds + b.inspections + b.ncs -
        (a.scaffolds + a.inspections + a.ncs),
    );
  const inspectorRankings = [...inspectorRank.values()]
    .map((item) => ({
      ...item,
      approvalRate:
        item.inspections > 0
          ? ((item.aprovadas + item.ressalvas) / item.inspections) * 100
          : null,
    }))
    .sort((a, b) => b.inspections - a.inspections);
  const nonConformityTypeRankings = [
    ...nonConformities.reduce((rank, item) => {
      const labels = item.checklistItems.length
        ? item.checklistItems.map((checklistItem) =>
            summarizeChecklistNonConformity(
              checklistItem.checklistEntry.item_label,
            ),
          )
        : [summarizeChecklistNonConformity(item.title)];

      for (const label of labels) {
        rank.set(label, (rank.get(label) ?? 0) + 1);
      }
      return rank;
    }, new Map<string, number>()),
  ]
    .map(([title, occurrences]) => ({ title, occurrences }))
    .sort((a, b) => b.occurrences - a.occurrences || a.title.localeCompare(b.title));

  return {
    filters: {
      ...filters,
      dateFrom: formatDateIso(from),
      dateTo: formatDateIso(to),
    },
    periodLabel: `${format(from, "dd/MM/yyyy")} - ${format(to, "dd/MM/yyyy")}`,
    exportedBy: currentUser?.name ?? currentUser?.email ?? access?.email ?? "",
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
      quality: {
        onTimeClosureRate,
        utilizationRate,
        activeScaffolds,
      },
    },
    trends: {
      approvalRate: calculateKpiTrend({
        currentValue: approvalRate,
        previousValue: previousApprovalRate,
        metricType: "percentage",
        polarity: "higher-is-better",
      }),
      operationDays: calculateKpiTrend({
        currentValue: average(operationDays),
        previousValue: average(previousOperationDays),
        metricType: "days",
        polarity: "lower-is-better",
        unitLabel: " dias",
      }),
      correctionDays: calculateKpiTrend({
        currentValue: average(correctionDays),
        previousValue: average(previousCorrectionDays),
        metricType: "days",
        polarity: "lower-is-better",
        unitLabel: " dias",
      }),
      closedNonConformities: calculateKpiTrend({
        currentValue: closedNonConformities.length,
        previousValue: previousClosedNonConformities.length,
        metricType: "number",
        polarity: "higher-is-better",
      }),
      onTimeClosureRate: calculateKpiTrend({
        currentValue: onTimeClosureRate,
        previousValue: previousOnTimeClosureRate,
        metricType: "percentage",
        polarity: "higher-is-better",
      }),
    },
    charts: {
      granularity,
      inspectionTrend,
      nonConformityTrend,
    },
    rankings: {
      companies: companyRankings,
      areas: areaRankings,
      inspectors: inspectorRankings,
      nonConformities: nonConformityTypeRankings,
    },
    exportRows: {
      scaffolds: scaffolds.map((item) => ({
        codigoTag: item.code,
        empresa: item.tenantCompany.name,
        workspace: item.workspace.name,
        area: item.area,
        status: item.status,
        dataCriacao: formatDateBr(item.created_at),
        dataLiberacao: formatDateBr(item.released_at),
        dataValidade: formatDateBr(item.validity_date),
        responsavel: item.responsible,
        ultimaInspecao: formatDateBr(item.inspections[0]?.date),
      })),
      inspections: inspections.map((item) => ({
        codigoInspecao: item.id,
        tagAndaime: item.scaffold_code,
        empresa: item.scaffold.tenantCompany.name,
        workspace: item.scaffold.workspace.name,
        area: item.scaffold.area,
        inspetor: item.inspector_name,
        resultado: item.result,
        dataInspecao: formatDateBr(item.date),
        quantidadeNcs: item._count.nonConformities,
        observacoes: item.notes ?? "",
      })),
      nonConformities: nonConformities.map((item) => ({
        codigoNc: item.code,
        tagAndaime: item.scaffold.code,
        empresa: item.scaffold.tenantCompany.name,
        workspace: item.scaffold.workspace.name,
        area: item.scaffold.area,
        tipoNc: item.checklistItems.length
          ? item.checklistItems
              .map((checklistItem) =>
                summarizeChecklistNonConformity(
                  checklistItem.checklistEntry.item_label,
                ),
              )
              .join("; ")
          : summarizeChecklistNonConformity(item.title),
        descricao: item.description,
        status: item.status,
        criticidade: item.classification,
        dataAbertura: formatDateBr(item.createdAt),
        dataCorrecao: formatDateBr(item.closedAt),
        responsavel: item.responsibleUser?.name ?? "",
        diasEmAberto: daysBetween(item.createdAt, item.closedAt ?? new Date()),
      })),
    },
  };
}
