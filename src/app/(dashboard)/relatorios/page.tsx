import type { ElementType } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  Ban,
  BarChart3,
  Building2,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ClipboardCheck,
  Construction,
  Factory,
  Filter,
  Flag,
  Gauge,
  Hourglass,
  Lightbulb,
  ListChecks,
  RotateCcw,
  ShieldCheck,
  TimerReset,
  TrendingUp,
  type LucideIcon,
  UserCheck,
  Wrench,
  XCircle,
} from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import {
  getManagementReportData,
  type KpiTrend,
} from "@/lib/management-reports";
import { surface, typography } from "@/lib/design-system";
import { ReportExportActions } from "./report-export-actions";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type TrendTone = "good" | "bad" | "neutral";

type TrendItem = {
  label: string;
  value: string;
  icon: ElementType;
  trend?: {
    value: string;
    tone: TrendTone;
  };
};

function formatAverage(value: number | null) {
  if (value === null) return "Sem base histórica";
  const rounded = Math.round(value * 10) / 10;
  return rounded === 1 ? "1 dia" : `${rounded.toLocaleString("pt-BR")} dias`;
}

function formatPercent(value: number, total: number) {
  if (total === 0) return "Sem base histórica";
  return `${Math.round((value / total) * 100)}%`;
}

function formatRate(value: number | null) {
  if (value === null) return "Sem base histórica";
  return `${Math.round(value)}%`;
}

function buildRankingHref(path: string, filters: Record<string, string>) {
  const params = new URLSearchParams(filters);
  return `${path}?${params.toString()}`;
}

function getTrend(trend: KpiTrend) {
  if (trend.status === "no-history") return undefined;
  return {
    value: trend.label,
    tone:
      trend.status === "positive"
        ? "good"
        : trend.status === "negative"
          ? "bad"
          : "neutral",
  } satisfies TrendItem["trend"];
}

export default async function RelatoriosPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const report = await getManagementReportData(params);
  const { filters } = report;
  const rankingQuery = {
    companyId: filters.companyId,
    workspaceId: filters.workspaceId,
    area: filters.area,
    period: filters.period,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  };
  const inspectionTotals = [
    {
      label: "Aprovadas",
      value: report.kpis.inspections.aprovadas,
      color: "#059669",
    },
    {
      label: "Reprovadas",
      value: report.kpis.inspections.reprovadas,
      color: "#be123c",
    },
    {
      label: "Com ressalvas",
      value: report.kpis.inspections.ressalvas,
      color: "#d97706",
    },
  ];
  const insights: TrendItem[] = [
    {
      label: "Empresa mais ativa",
      value: report.rankings.companies[0]?.name ?? "Sem dados",
      icon: Building2,
    },
    {
      label: "Área com maior volume",
      value: report.rankings.areas[0]?.name ?? "Sem dados",
      icon: Factory,
    },
    {
      label: "Inspetor mais ativo",
      value: report.rankings.inspectors[0]?.name ?? "Sem dados",
      icon: UserCheck,
    },
    {
      label: "Taxa de aprovação",
      value: formatPercent(
        report.kpis.inspections.aprovadas,
        report.kpis.inspections.total,
      ),
      icon: TrendingUp,
      trend: getTrend(report.trends.approvalRate),
    },
    {
      label: "Tempo médio em operação",
      value: formatAverage(report.kpis.averages.operationDays),
      icon: Clock3,
      trend: getTrend(report.trends.operationDays),
    },
    {
      label: "Tempo médio de correção",
      value: formatAverage(report.kpis.averages.correctionDays),
      icon: Wrench,
      trend: getTrend(report.trends.correctionDays),
    },
    {
      label: "NCs encerradas",
      value: report.kpis.nonConformities.encerradas.toString(),
      icon: ShieldCheck,
      trend: getTrend(report.trends.closedNonConformities),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 border-b-2 border-border pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <BarChart3 className="size-4" />
            AndCheck • Relatórios Gerenciais
          </div>
          <h1 className={`${typography.pageTitle} text-foreground`}>
            Relatórios Gerenciais
          </h1>
          <p
            className={`mt-0.5 ${typography.sectionDescription} text-muted-foreground`}
          >
            Indicadores consolidados da operação.
          </p>
        </div>
        <ReportExportActions report={report} />
      </div>

      <form
        action="/relatorios"
        className="rounded-lg border border-border bg-card p-4 shadow-sm"
      >
        <div className="mb-3 flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <p className={`${typography.sectionLabel} text-muted-foreground`}>
            Filtros Globais
          </p>
          <span className={`${typography.panelSubtitle} text-muted-foreground/50`}>
            · {report.periodLabel}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <FilterSelect
            label="Empresa"
            name="companyId"
            value={filters.companyId}
            options={report.options.companies.map((item) => [
              item.id,
              item.name,
            ])}
          />
          <FilterSelect
            label="Workspace"
            name="workspaceId"
            value={filters.workspaceId}
            options={report.options.workspaces.map((item) => [
              item.id,
              item.name,
            ])}
          />
          <FilterSelect
            label="Área"
            name="area"
            value={filters.area}
            options={report.options.areas.map((area) => [area, area])}
          />
          <FilterSelect
            label="Período"
            name="period"
            value={filters.period}
            options={[
              ["today", "Hoje"],
              ["7d", "Últimos 7 dias"],
              ["30d", "Últimos 30 dias"],
              ["90d", "Últimos 90 dias"],
              ["365d", "Últimos 12 meses"],
              ["month", "Este mês"],
              ["custom", "Personalizado"],
            ]}
            includeAll={false}
          />
          <DateInput label="Início" name="dateFrom" value={filters.dateFrom} />
          <DateInput label="Fim" name="dateTo" value={filters.dateTo} />
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-4 text-[10px] font-bold uppercase tracking-widest text-accent-foreground hover:bg-accent/90"
          >
            Aplicar Filtros
          </button>
        </div>
      </form>

      <div className="grid gap-4 xl:grid-cols-2">
        <KpiPanel
          title="Andaimes"
          icon={Construction}
          items={[
            ["Total cadastrados", report.kpis.scaffolds.total, ListChecks],
            ["Liberados", report.kpis.scaffolds.liberados, ShieldCheck],
            ["Em montagem", report.kpis.scaffolds.emMontagem, Construction],
            ["Pendentes", report.kpis.scaffolds.pendentes, Hourglass],
            ["Interditados", report.kpis.scaffolds.interditados, Ban],
            ["Vencidos", report.kpis.scaffolds.vencidos, CircleAlert],
            ["Desmontados", report.kpis.scaffolds.desmontados, Archive],
            [
              "Taxa de utilização",
              formatRate(report.kpis.quality.utilizationRate),
              Gauge,
            ],
          ]}
        />
        <KpiPanel
          title="Inspeções"
          icon={ClipboardCheck}
          items={[
            ["Total realizadas", report.kpis.inspections.total, ClipboardCheck],
            ["Aprovadas", report.kpis.inspections.aprovadas, CheckCircle2],
            ["Reprovadas", report.kpis.inspections.reprovadas, XCircle],
            ["Com ressalvas", report.kpis.inspections.ressalvas, Flag],
          ]}
        />
        <KpiPanel
          title="Não Conformidades"
          icon={AlertTriangle}
          items={[
            ["Abertas", report.kpis.nonConformities.abertas, AlertTriangle],
            [
              "Em tratamento",
              report.kpis.nonConformities.emTratamento,
              RotateCcw,
            ],
            ["Encerradas", report.kpis.nonConformities.encerradas, ShieldCheck],
            ["Vencidas", report.kpis.nonConformities.vencidas, CircleAlert],
          ]}
        />
        <KpiPanel
          title="Tempos Médios"
          icon={TimerReset}
          items={[
            [
              "Tempo médio em operação",
              formatAverage(report.kpis.averages.operationDays),
              Clock3,
            ],
            [
              "Correção de NC",
              formatAverage(report.kpis.averages.correctionDays),
              Wrench,
            ],
            [
              "Entre inspeções",
              formatAverage(report.kpis.averages.inspectionIntervalDays),
              Gauge,
            ],
          ]}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <InspectionPerformanceChart
          title="Desempenho de Inspeções"
          icon={BarChart3}
          rows={inspectionTotals}
        />
        <NonConformityTrendChart
          title="Evolução das NCs"
          icon={AlertTriangle}
          rows={report.charts.nonConformityTrend.map((item) => ({
            label: item.label,
            abertas: item.abertas,
            encerradas: item.encerradas,
          }))}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <RankingPanel
          title="Empresas"
          icon={Building2}
          href={buildRankingHref("/relatorios/rankings/empresas", rankingQuery)}
          rows={report.rankings.companies.map((item) => ({
            label: item.name,
            values: [
              { label: "Andaimes", value: item.scaffolds, color: "#d97706" },
              { label: "Inspeções", value: item.inspections, color: "#64748b" },
              { label: "NCs", value: item.ncs, color: "#be123c" },
            ],
          }))}
        />
        <RankingPanel
          title="Áreas Operacionais"
          icon={Factory}
          href={buildRankingHref("/relatorios/rankings/areas", rankingQuery)}
          rows={report.rankings.areas.map((item) => ({
            label: item.name,
            values: [
              { label: "Andaimes", value: item.scaffolds, color: "#d97706" },
              { label: "Inspeções", value: item.inspections, color: "#64748b" },
              { label: "NCs", value: item.ncs, color: "#be123c" },
            ],
          }))}
        />
        <RankingPanel
          title="Top Inspetores"
          icon={UserCheck}
          href={buildRankingHref("/relatorios/rankings/inspetores", rankingQuery)}
          rows={report.rankings.inspectors.map((item) => ({
            label: item.name,
            values: [
              { label: "Inspeções", value: item.inspections, color: "#64748b" },
              { label: "Aprovado", value: item.aprovadas, color: "#059669" },
              { label: "Reprovado", value: item.reprovadas, color: "#be123c" },
            ],
          }))}
        />
      </div>

      <TopNonConformitiesPanel rows={report.rankings.nonConformities} />

      <InsightsPanel items={insights} />
    </div>
  );
}

function FilterSelect({
  label,
  name,
  value,
  options,
  includeAll = true,
}: {
  label: string;
  name: string;
  value: string;
  options: string[][];
  includeAll?: boolean;
}) {
  return (
    <label className="space-y-1.5">
      <span className={`${typography.sectionLabel} text-muted-foreground`}>
        {label}
      </span>
      <select
        name={name}
        defaultValue={value}
        className="h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground outline-none"
      >
        {includeAll && <option value="all">Todos</option>}
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateInput({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className={`${typography.sectionLabel} text-muted-foreground`}>
        {label}
      </span>
      <input
        type="date"
        name={name}
        defaultValue={value}
        className="h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground outline-none"
      />
    </label>
  );
}

function KpiPanel({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: ElementType;
  items: Array<[string, number | string, ElementType]>;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className={surface.panelHeader}>
        <div className="flex items-center gap-2">
          <Icon className={surface.panelHeaderIcon} />
          <p className={surface.panelHeaderTitle}>{title}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
        {items.map(([label, value, ItemIcon]) => (
          <div key={label} className="bg-card p-3">
            <p
              className={`${typography.sectionLabel} flex items-center gap-1.5 text-muted-foreground`}
            >
              <ItemIcon className="size-3.5 shrink-0 text-muted-foreground" />
              {label}
            </p>
            <p className={`${typography.kpiValue} mt-1.5 text-foreground`}>
              {value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function InspectionPerformanceChart({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: ElementType;
  rows: Array<{ label: string; value: number; color: string }>;
}) {
  const total = rows.reduce((sum, item) => sum + item.value, 0);
  const approved = rows.find((item) => item.label === "Aprovadas")?.value ?? 0;
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className={surface.panelHeader}>
        <div className="flex items-center gap-2">
          <Icon className={surface.panelHeaderIcon} />
          <p className={surface.panelHeaderTitle}>{title}</p>
        </div>
      </div>
      <div className="grid grid-cols-[216px_1fr] items-center gap-2 p-4">
        <div className="relative flex size-52 items-center justify-center">
          <MiniDonut
            values={rows}
            sizeClassName="size-52"
            strokeWidth={6}
            gap={1.4}
          />
          <div className="absolute text-center">
            <p className="font-mono text-[22px] font-black leading-none text-foreground">
              {approvalRate}%
            </p>
            <p className="mt-1 max-w-24 text-[8px] font-bold uppercase leading-tight tracking-wider text-muted-foreground">
              Taxa de aprovação
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {rows.map((item) => (
            <div
              key={item.label}
              className="grid max-w-[300px] grid-cols-[150px_28px] items-center gap-0.5"
            >
              <span className="flex min-w-0 items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span
                  className="size-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="text-right font-mono text-[12px] font-bold text-foreground">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NonConformityTrendChart({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: ElementType;
  rows: Array<{ label: string; abertas: number; encerradas: number }>;
}) {
  const max = Math.max(
    1,
    ...rows.flatMap((item) => [item.abertas, item.encerradas]),
  );
  const ticks = [max, Math.round(max * 0.66), Math.round(max * 0.33), 0].filter(
    (value, index, values) => values.indexOf(value) === index,
  );
  const labelInterval = Math.max(1, Math.ceil(rows.length / 6));
  const getLabelOffset = (label: string) => {
    if (label.includes(" - ")) return 44;
    if (label.length === 5) return 22;
    if (label.includes("/")) return 28;
    return 0;
  };

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className={surface.panelHeader}>
        <div className="flex items-center gap-2">
          <Icon className={surface.panelHeaderIcon} />
          <p className={surface.panelHeaderTitle}>{title}</p>
        </div>
      </div>
      <div className="p-4 pb-6">
        <div className="mb-3 flex items-center gap-4">
          <LegendItem color="bg-[#be123c]" label="NCs abertas" />
          <LegendItem color="bg-[#059669]" label="NCs encerradas" />
        </div>
        <div className="grid grid-cols-[28px_1fr] gap-2">
          <div className="relative h-28">
            {ticks.map((tick) => (
              <span
                key={tick}
                className="absolute right-0 -translate-y-1/2 font-mono text-[9px] font-semibold text-muted-foreground"
                style={{ top: `${100 - (tick / max) * 100}%` }}
              >
                {tick}
              </span>
            ))}
          </div>
          <div className="relative h-28 border-b border-l border-border bg-slate-50/50">
            <div className="absolute inset-0 flex items-end justify-between gap-1 px-2">
              {rows.map((item) => (
                <div
                  key={item.label}
                  className="flex h-full min-w-0 flex-1 items-end justify-center gap-0.5"
                  title={`Período: ${item.label}\nNCs abertas: ${item.abertas}\nNCs encerradas: ${item.encerradas}`}
                >
                  <div
                    className="w-full max-w-3 rounded-t-sm bg-[#be123c]"
                    style={{ height: `${Math.max(4, (item.abertas / max) * 100)}%` }}
                  />
                  <div
                    className="w-full max-w-3 rounded-t-sm bg-[#059669]"
                    style={{
                      height: `${Math.max(4, (item.encerradas / max) * 100)}%`,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <span />
          <div className="mt-2 flex h-16 justify-between gap-1 px-2">
            {rows.map((item, index) => (
              <span
                key={item.label}
                className="relative min-w-0 flex-1 font-mono text-[10px] font-bold text-muted-foreground"
                title={item.label}
              >
                {(index % labelInterval === 0 || index === rows.length - 1) && (
                  <span
                    className="absolute left-1/2 top-0 block"
                    style={{
                      transform: `translateX(calc(-50% + ${getLabelOffset(item.label)}px))`,
                    }}
                  >
                    <span className="block origin-top-left rotate-90 whitespace-nowrap">
                      {item.label}
                    </span>
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`size-2 rounded-sm ${color}`} />
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function RankingPanel({
  title,
  icon: Icon,
  href,
  rows,
}: {
  title: string;
  icon: LucideIcon;
  href: string;
  rows: Array<{
    label: string;
    values: Array<{ label: string; value: number; color: string }>;
  }>;
}) {
  const visibleRows = rows.slice(0, 5);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className={surface.panelHeader}>
        <div className="flex items-center gap-2">
          <Icon className={surface.panelHeaderIcon} />
          <p className={surface.panelHeaderTitle}>{title}</p>
        </div>
      </div>
      <div className="divide-y divide-border">
        {rows.length === 0 ? (
          <EmptyState
            icon={Icon}
            title="Sem dados no período"
            description="Os rankings serão exibidos conforme houver registros suficientes nos filtros aplicados."
            className="border-0 border-b border-dashed py-8"
          />
        ) : (
          visibleRows.map((row, index) => (
            <RankingRow key={row.label} index={index} row={row} />
          ))
        )}
      </div>
      {rows.length > 5 && (
        <Link
          href={href}
          className="block border-t border-border px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-muted/40"
        >
          Ver ranking completo →
        </Link>
      )}
    </section>
  );
}

function RankingRow({
  index,
  row,
}: {
  index: number;
  row: {
    label: string;
    values: Array<{ label: string; value: number; color: string }>;
  };
}) {
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] font-bold text-muted-foreground">
          {index + 1}.
      </span>
      <p className={`${typography.bodyStrong} min-w-0 flex-1 truncate`}>
        {row.label}
      </p>
        <div className="ml-3 flex shrink-0 items-center gap-5">
          <MiniDonut values={row.values} />
          <div className="space-y-0.5">
            {row.values.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-[72px_24px] items-center gap-1.5"
              >
                <span className="flex min-w-0 items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span
                    className="size-1.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="text-right font-mono text-[10px] font-bold text-foreground">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TopNonConformitiesPanel({
  rows,
}: {
  rows: Array<{ title: string; occurrences: number }>;
}) {
  const visibleRows = rows.slice(0, 5);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className={surface.panelHeader}>
        <div className="flex items-center gap-2">
          <AlertTriangle className={surface.panelHeaderIcon} />
          <p className={surface.panelHeaderTitle}>Top Não Conformidades</p>
        </div>
        <p className={surface.panelHeaderSubtitle}>
          Tipos mais recorrentes no período
        </p>
      </div>
      {visibleRows.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="Nenhuma não conformidade registrada"
          description="As não conformidades mais recorrentes aparecerão aqui conforme os filtros aplicados."
          className="border-0 border-b border-dashed py-8"
        />
      ) : (
        <div className="divide-y divide-border">
          <div className="grid grid-cols-[1fr_110px] bg-muted/40 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <span>Não Conformidade</span>
            <span className="text-right">Ocorrências</span>
          </div>
          {visibleRows.map((item, index) => (
            <div
              key={item.title}
              className="grid grid-cols-[1fr_110px] items-center gap-4 px-4 py-2.5 hover:bg-primary/5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="font-mono text-[10px] font-bold text-muted-foreground">
                  {index + 1}.
                </span>
                <span className="truncate text-[12px] font-semibold text-foreground">
                  {item.title}
                </span>
              </div>
              <span className="text-right font-mono text-[13px] font-bold text-foreground">
                {item.occurrences}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MiniDonut({
  values,
  sizeClassName = "size-11",
  strokeWidth = 7,
  gap = 2.4,
}: {
  values: Array<{ label: string; value: number; color: string }>;
  sizeClassName?: string;
  strokeWidth?: number;
  gap?: number;
}) {
  const total = values.reduce((sum, item) => sum + item.value, 0);
  const radius = 15;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return (
      <svg
        viewBox="0 0 40 40"
        className={`${sizeClassName} shrink-0`}
        aria-hidden="true"
      >
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 40 40"
      className={`${sizeClassName} shrink-0`}
      aria-hidden="true"
    >
      {values
        .reduce<
          Array<{
            color: string;
            label: string;
            length: number;
            offset: number;
          }>
        >((segments, item) => {
          const previousOffset = segments.reduce(
            (sum, segment) => sum + segment.length,
            0,
          );
          const rawLength = (item.value / total) * circumference;
          return [
            ...segments,
            {
              color: item.color,
              label: item.label,
              length: rawLength,
              offset: previousOffset,
            },
          ];
        }, [])
        .filter((segment) => segment.length > 0)
        .map((segment) => (
          <circle
            key={segment.label}
            cx="20"
            cy="20"
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${Math.max(0, segment.length - gap)} ${
              circumference - Math.max(0, segment.length - gap)
            }`}
            strokeDashoffset={-(segment.offset + gap / 2)}
            strokeLinecap="butt"
            transform="rotate(-90 20 20)"
          />
        ))}
    </svg>
  );
}

function InsightsPanel({ items }: { items: TrendItem[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className={surface.panelHeader}>
        <div className="flex items-center gap-2">
          <Lightbulb className={surface.panelHeaderIcon} />
          <p className={surface.panelHeaderTitle}>Insights Operacionais</p>
        </div>
        <p className={surface.panelHeaderSubtitle}>
          Leitura executiva do período selecionado
        </p>
      </div>
      <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const ItemIcon = item.icon;
          return (
          <div key={item.label} className="bg-card p-3">
            <p
              className={`${typography.sectionLabel} flex items-center gap-1.5 text-muted-foreground`}
            >
              <ItemIcon className="size-3.5 shrink-0 text-muted-foreground" />
              {item.label}
            </p>
            <p className="mt-1 truncate text-[13px] font-semibold text-foreground">
              {item.value}
            </p>
            {item.trend && (
              <p
                className={`mt-1 text-[10px] font-semibold ${
                  item.trend.tone === "good"
                    ? "text-emerald-600"
                    : item.trend.tone === "bad"
                      ? "text-red-600"
                      : "text-muted-foreground"
                }`}
              >
                {item.trend.value} em relação ao período anterior
              </p>
            )}
          </div>
          );
        })}
      </div>
    </section>
  );
}
