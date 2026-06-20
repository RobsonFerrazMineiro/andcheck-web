import type { ElementType } from "react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  ClipboardCheck,
  Construction,
  Factory,
  Filter,
  Lightbulb,
  TimerReset,
  UserCheck,
} from "lucide-react";

import { getManagementReportData } from "@/lib/management-reports";
import { surface, typography } from "@/lib/design-system";
import { ReportExportActions } from "./report-export-actions";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type TrendTone = "good" | "bad" | "neutral";

type TrendItem = {
  label: string;
  value: string;
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

function getTrend(
  current: number | null,
  previous: number | null,
  options: { suffix?: string; lowerIsBetter?: boolean } = {},
) {
  if (current === null || previous === null) return undefined;

  const delta = current - previous;
  const rounded = Math.round(delta * 10) / 10;
  const isNeutral = Math.abs(rounded) < 0.1;
  const improved = options.lowerIsBetter ? delta < 0 : delta > 0;
  const tone: TrendTone = isNeutral ? "neutral" : improved ? "good" : "bad";
  const signal = rounded > 0 ? "↑ +" : rounded < 0 ? "↓ " : "→ ";
  const suffix = options.suffix ?? "";

  return {
    value: `${signal}${rounded.toLocaleString("pt-BR")}${suffix}`,
    tone,
  };
}

export default async function RelatoriosPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const report = await getManagementReportData(params);
  const { filters } = report;
  const inspectionTotals = [
    {
      label: "Aprovadas",
      value: report.kpis.inspections.aprovadas,
      color: "bg-emerald-500",
      track: "bg-emerald-50",
    },
    {
      label: "Reprovadas",
      value: report.kpis.inspections.reprovadas,
      color: "bg-red-500",
      track: "bg-red-50",
    },
    {
      label: "Com ressalvas",
      value: report.kpis.inspections.ressalvas,
      color: "bg-amber-500",
      track: "bg-amber-50",
    },
  ];
  const insights: TrendItem[] = [
    {
      label: "Empresa mais ativa",
      value: report.rankings.companies[0]?.name ?? "Sem dados",
    },
    {
      label: "Área com maior volume",
      value: report.rankings.areas[0]?.name ?? "Sem dados",
    },
    {
      label: "Inspetor mais ativo",
      value: report.rankings.inspectors[0]?.name ?? "Sem dados",
    },
    {
      label: "Taxa de aprovação",
      value: formatPercent(
        report.kpis.inspections.aprovadas,
        report.kpis.inspections.total,
      ),
      trend: getTrend(
        report.trends.approvalRate.current,
        report.trends.approvalRate.previous,
        { suffix: "%" },
      ),
    },
    {
      label: "Tempo médio em operação",
      value: formatAverage(report.kpis.averages.operationDays),
      trend: getTrend(
        report.trends.operationDays.current,
        report.trends.operationDays.previous,
        { suffix: " dias", lowerIsBetter: true },
      ),
    },
    {
      label: "Tempo médio de correção",
      value: formatAverage(report.kpis.averages.correctionDays),
      trend: getTrend(
        report.trends.correctionDays.current,
        report.trends.correctionDays.previous,
        { suffix: " dias", lowerIsBetter: true },
      ),
    },
    {
      label: "NCs encerradas",
      value: report.kpis.nonConformities.encerradas.toString(),
      trend: getTrend(
        report.trends.closedNonConformities.current,
        report.trends.closedNonConformities.previous,
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 border-b-2 border-border pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className={`${typography.pageEyebrow} mb-1 text-muted-foreground`}>
            AndCheck EHS • Business Intelligence
          </p>
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
            ["Total cadastrados", report.kpis.scaffolds.total],
            ["Liberados", report.kpis.scaffolds.liberados],
            ["Em montagem", report.kpis.scaffolds.emMontagem],
            ["Pendentes", report.kpis.scaffolds.pendentes],
            ["Interditados", report.kpis.scaffolds.interditados],
            ["Vencidos", report.kpis.scaffolds.vencidos],
            ["Desmontados", report.kpis.scaffolds.desmontados],
          ]}
        />
        <KpiPanel
          title="Inspeções"
          icon={ClipboardCheck}
          items={[
            ["Total realizadas", report.kpis.inspections.total],
            ["Aprovadas", report.kpis.inspections.aprovadas],
            ["Reprovadas", report.kpis.inspections.reprovadas],
            ["Com ressalvas", report.kpis.inspections.ressalvas],
          ]}
        />
        <KpiPanel
          title="Não Conformidades"
          icon={AlertTriangle}
          items={[
            ["Abertas", report.kpis.nonConformities.abertas],
            ["Em tratamento", report.kpis.nonConformities.emTratamento],
            ["Encerradas", report.kpis.nonConformities.encerradas],
            ["Vencidas", report.kpis.nonConformities.vencidas],
          ]}
        />
        <KpiPanel
          title="Tempos Médios"
          icon={TimerReset}
          items={[
            [
              "Tempo médio em operação",
              formatAverage(report.kpis.averages.operationDays),
            ],
            [
              "Correção de NC",
              formatAverage(report.kpis.averages.correctionDays),
            ],
            [
              "Entre inspeções",
              formatAverage(report.kpis.averages.inspectionIntervalDays),
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
          rows={report.rankings.companies.map((item) => ({
            label: item.name,
            values: [
              { label: "Andaimes", value: item.scaffolds, color: "bg-accent" },
              { label: "Inspeções", value: item.inspections, color: "bg-blue-500" },
              { label: "NCs", value: item.ncs, color: "bg-red-500" },
            ],
          }))}
        />
        <RankingPanel
          title="Áreas Operacionais"
          icon={Factory}
          rows={report.rankings.areas.map((item) => ({
            label: item.name,
            values: [
              { label: "Andaimes", value: item.scaffolds, color: "bg-accent" },
              { label: "Inspeções", value: item.inspections, color: "bg-blue-500" },
              { label: "NCs", value: item.ncs, color: "bg-red-500" },
            ],
          }))}
        />
        <RankingPanel
          title="Top Inspetores"
          icon={UserCheck}
          rows={report.rankings.inspectors.map((item) => ({
            label: item.name,
            values: [
              { label: "Inspeções", value: item.inspections, color: "bg-blue-500" },
              { label: "Aprovação", value: item.aprovadas, color: "bg-emerald-500" },
              { label: "Reprovação", value: item.reprovadas, color: "bg-red-500" },
            ],
          }))}
        />
      </div>

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
  items: Array<[string, number | string]>;
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
        {items.map(([label, value]) => (
          <div key={label} className="bg-card p-3">
            <p className={`${typography.sectionLabel} text-muted-foreground`}>
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
  rows: Array<{ label: string; value: number; color: string; track: string }>;
}) {
  const max = Math.max(1, ...rows.map((item) => item.value));

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className={surface.panelHeader}>
        <div className="flex items-center gap-2">
          <Icon className={surface.panelHeaderIcon} />
          <p className={surface.panelHeaderTitle}>{title}</p>
        </div>
      </div>
      <div className="space-y-3 p-4">
        {rows.map((item) => (
          <div
            key={item.label}
            className="grid grid-cols-[120px_1fr_42px] items-center gap-3"
          >
            <p className={`${typography.bodyStrong} truncate`}>{item.label}</p>
            <div className={`h-3 overflow-hidden rounded-sm ${item.track}`}>
              <div
                className={`h-full rounded-sm ${item.color}`}
                style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
              />
            </div>
            <p className="text-right font-mono text-[12px] font-bold text-foreground">
              {item.value}
            </p>
          </div>
        ))}
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

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className={surface.panelHeader}>
        <div className="flex items-center gap-2">
          <Icon className={surface.panelHeaderIcon} />
          <p className={surface.panelHeaderTitle}>{title}</p>
        </div>
      </div>
      <div className="p-4">
        <div className="mb-3 flex items-center gap-4">
          <LegendItem color="bg-red-500" label="NCs Abertas" />
          <LegendItem color="bg-emerald-500" label="NCs Encerradas" />
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
          <div className="relative h-28 border-b border-l border-border">
            <div className="absolute inset-0 flex items-end justify-between gap-1 px-2">
              {rows.map((item) => (
                <div
                  key={item.label}
                  className="flex h-full min-w-0 flex-1 items-end justify-center gap-0.5"
                  title={`Período: ${item.label}\nNCs abertas: ${item.abertas}\nNCs encerradas: ${item.encerradas}`}
                >
                  <div
                    className="w-full max-w-3 rounded-t-sm bg-red-500"
                    style={{ height: `${Math.max(4, (item.abertas / max) * 100)}%` }}
                  />
                  <div
                    className="w-full max-w-3 rounded-t-sm bg-emerald-500"
                    style={{
                      height: `${Math.max(4, (item.encerradas / max) * 100)}%`,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <span />
          <div className="mt-2 flex justify-between gap-1 px-2">
            {rows.map((item) => (
              <span
                key={item.label}
                className="min-w-0 flex-1 truncate text-center font-mono text-[9px] font-semibold text-muted-foreground"
                title={item.label}
              >
                {item.label}
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
  rows,
}: {
  title: string;
  icon: ElementType;
  rows: Array<{
    label: string;
    values: Array<{ label: string; value: number; color: string }>;
  }>;
}) {
  const max = Math.max(
    1,
    ...rows.flatMap((row) => row.values.map((item) => item.value)),
  );
  const visibleRows = rows.slice(0, 5);
  const hiddenRows = rows.slice(5);

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
          <p className="p-4 text-[11px] text-muted-foreground">
            Sem dados no período.
          </p>
        ) : (
          <>
            {visibleRows.map((row, index) => (
              <RankingRow key={row.label} index={index} row={row} max={max} />
            ))}
            {hiddenRows.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer list-none border-t border-border px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-muted/40">
                  Ver ranking completo →
                </summary>
                <div className="divide-y divide-border border-t border-border">
                  {hiddenRows.map((row, index) => (
                    <RankingRow
                      key={row.label}
                      index={index + visibleRows.length}
                      row={row}
                      max={max}
                    />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function RankingRow({
  index,
  row,
  max,
}: {
  index: number;
  row: {
    label: string;
    values: Array<{ label: string; value: number; color: string }>;
  };
  max: number;
}) {
  return (
    <div className="p-3">
      <div className="mb-2 flex items-center gap-3">
        <span className="font-mono text-[10px] font-bold text-muted-foreground">
          {index + 1}.
        </span>
        <p className={`${typography.bodyStrong} min-w-0 flex-1 truncate`}>
          {row.label}
        </p>
      </div>
      <div className="space-y-1.5">
        {row.values.map((item) => (
          <div
            key={item.label}
            className="grid grid-cols-[70px_1fr_28px] items-center gap-2"
          >
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              {item.label}
            </span>
            <div className="h-2 overflow-hidden rounded-sm bg-muted">
              <div
                className={`h-full rounded-sm ${item.color}`}
                style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
              />
            </div>
            <span className="text-right font-mono text-[10px] font-bold text-foreground">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
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
        {items.map((item) => (
          <div key={item.label} className="bg-card p-3">
            <p className={`${typography.sectionLabel} text-muted-foreground`}>
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
        ))}
      </div>
    </section>
  );
}
