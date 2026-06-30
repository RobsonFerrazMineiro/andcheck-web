import type { ElementType } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  ClipboardCheck,
  Construction,
  Factory,
  Gauge,
  ShieldCheck,
  UserCheck,
  Wrench,
} from "lucide-react";

import {
  getManagementReportData,
  resolveManagementReportFilterLabels,
  type KpiTrend,
  type ManagementReportData,
} from "@/lib/management-reports";

import { PrintActions } from "./print-actions";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type DonutItem = {
  label: string;
  value: number;
  color: string;
};

type KpiItem = {
  label: string;
  value: string | number;
  icon: ElementType;
  accent: string;
  trend?: KpiTrend;
};

function formatAverage(value: number | null) {
  if (value === null) return "Sem base histórica";
  const rounded = Math.round(value * 10) / 10;
  return rounded === 1 ? "1 dia" : `${rounded.toLocaleString("pt-BR")} dias`;
}

function formatRate(value: number | null) {
  if (value === null) return "Sem base histórica";
  return `${Math.round(value)}%`;
}

function formatTrendRate(trend: KpiTrend) {
  if (trend.status === "no-history") return "Sem base histórica";
  return formatRate(trend.currentValue);
}

function trendClass(trend?: KpiTrend) {
  if (!trend || trend.status === "no-history" || trend.status === "new-record") {
    return "text-slate-500";
  }
  if (trend.status === "positive") return "text-emerald-700";
  if (trend.status === "negative") return "text-rose-700";
  return "text-slate-500";
}

function trendLabel(trend?: KpiTrend, withComparison = false) {
  if (!trend) return null;
  if (trend.status === "no-history") return "Sem base histórica";
  return `${trend.label}${withComparison ? " vs período anterior" : ""}`;
}

function buildBackHref(filters: ManagementReportData["filters"]) {
  const params = new URLSearchParams({
    companyId: filters.companyId,
    workspaceId: filters.workspaceId,
    area: filters.area,
    period: filters.period,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  });
  return `/relatorios?${params.toString()}`;
}

function percent(value: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function PrintHeader({
  report,
  labels,
}: {
  report: ManagementReportData;
  labels: ReturnType<typeof resolveManagementReportFilterLabels>;
}) {
  return (
    <header className="rounded-lg bg-slate-800 px-7 py-5 text-white">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
        AndCheck • Relatórios Gerenciais
      </p>
      <h1 className="mt-1 text-[26px] font-extrabold uppercase tracking-normal">
        Relatórios Gerenciais
      </h1>
      <div className="mt-5 grid grid-cols-3 gap-x-8 gap-y-2 text-[11px] text-slate-200">
        <p>
          <span className="font-semibold text-white">Empresa:</span> {labels.company}
        </p>
        <p>
          <span className="font-semibold text-white">Workspace:</span>{" "}
          {labels.workspace}
        </p>
        <p>
          <span className="font-semibold text-white">Área:</span> {labels.area}
        </p>
        <p>
          <span className="font-semibold text-white">Período:</span>{" "}
          {report.periodLabel}
        </p>
        <p>
          <span className="font-semibold text-white">Emitido em:</span>{" "}
          {format(new Date(), "dd/MM/yyyy HH:mm")}
        </p>
        <p>
          <span className="font-semibold text-white">Emitido por:</span>{" "}
          {report.exportedBy || "AndCheck"}
        </p>
      </div>
    </header>
  );
}

function SectionTitle({ title, icon: Icon }: { title: string; icon: ElementType }) {
  return (
    <div className="flex items-center gap-2 rounded-t-lg bg-slate-800 px-4 py-2.5 text-white">
      <Icon className="size-4 text-slate-300" />
      <p className="text-[12px] font-extrabold uppercase tracking-widest">{title}</p>
    </div>
  );
}

function KpiCard({ item }: { item: KpiItem }) {
  const Icon = item.icon;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className={`border-l-4 ${item.accent} pl-3`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
            {item.label}
          </p>
          <Icon className="size-4 shrink-0 text-slate-500" />
        </div>
        <p className="mt-2 text-[22px] font-extrabold leading-none text-slate-950">
          {item.value}
        </p>
        {item.trend && (
          <p className={`mt-2 text-[10px] font-bold ${trendClass(item.trend)}`}>
            {trendLabel(item.trend, item.label === "Taxa de Aprovação")}
          </p>
        )}
      </div>
    </div>
  );
}

function KpiGrid({ items }: { items: KpiItem[] }) {
  return (
    <section>
      <SectionTitle title="KPIs principais" icon={BarChart3} />
      <div className="grid grid-cols-4 gap-3 rounded-b-lg border border-t-0 border-slate-200 bg-slate-50 p-3">
        {items.map((item) => (
          <KpiCard key={item.label} item={item} />
        ))}
      </div>
    </section>
  );
}

function DonutSvg({
  items,
  size = 124,
  strokeWidth = 18,
  center,
}: {
  items: DonutItem[];
  size?: number;
  strokeWidth?: number;
  center?: { value: string; label: string };
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      className="shrink-0"
    >
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={strokeWidth}
      />
      {total > 0 &&
        items.map((item) => {
          const length = (item.value / total) * circumference;
          const currentOffset = offset;
          offset += length;
          if (length <= 0) return null;
          return (
            <circle
              key={item.label}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${Math.max(0, length - 1.8)} ${circumference}`}
              strokeDashoffset={-(currentOffset + 0.9)}
              strokeLinecap="butt"
              transform="rotate(-90 50 50)"
            />
          );
        })}
      {center && (
        <text x="50" y="48" textAnchor="middle" className="fill-slate-950">
          <tspan className="text-[11px] font-black">{center.value}</tspan>
          <tspan
            x="50"
            dy="7"
            className="text-[4px] font-extrabold uppercase tracking-widest fill-slate-500"
          >
            {center.label}
          </tspan>
        </text>
      )}
    </svg>
  );
}

function DonutCard({
  title,
  icon,
  items,
  footer,
  center,
  donutSize = 124,
  strokeWidth = 18,
  contentClassName = "grid-cols-[142px_1fr]",
  compactLegend = false,
}: {
  title: string;
  icon: ElementType;
  items: DonutItem[];
  footer?: string;
  center?: { value: string; label: string };
  donutSize?: number;
  strokeWidth?: number;
  contentClassName?: string;
  compactLegend?: boolean;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <SectionTitle title={title} icon={icon} />
      <div className={`grid ${contentClassName} items-center gap-3 p-4`}>
        <DonutSvg
          items={items}
          center={center}
          size={donutSize}
          strokeWidth={strokeWidth}
        />
        <div className={compactLegend ? "w-fit space-y-1.5" : "space-y-1"}>
          {items.map((item) => (
            <div
              key={item.label}
              className={`grid items-center text-[10.5px] ${
                compactLegend
                  ? "grid-cols-[118px_28px_34px] gap-2"
                  : "grid-cols-[1fr_34px_42px] gap-2.5"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2 font-bold text-slate-600">
                <span
                  className="size-2.5 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="text-right font-mono font-extrabold text-slate-950">
                {item.value}
              </span>
              <span className="text-right font-mono font-bold text-slate-500">
                {percent(item.value, total)}
              </span>
            </div>
          ))}
          {footer && (
            <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10.5px] font-bold text-slate-600">
              {footer}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PerformanceCard({ items }: { items: DonutItem[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const approved = items.find((item) => item.label === "Aprovadas")?.value ?? 0;
  const approvalRate = total > 0 ? `${Math.round((approved / total) * 100)}%` : "0%";

  return (
    <DonutCard
      title="Desempenho de Inspeções"
      icon={BarChart3}
      items={items}
      center={{ value: approvalRate, label: "Taxa de aprovação" }}
      donutSize={152}
      strokeWidth={21}
      contentClassName="grid-cols-[172px_1fr]"
      compactLegend
    />
  );
}

function NcEvolutionCard({
  rows,
}: {
  rows: Array<{ label: string; abertas: number; encerradas: number }>;
}) {
  const max = Math.max(1, ...rows.flatMap((item) => [item.abertas, item.encerradas]));
  const visibleInterval = Math.max(1, Math.ceil(rows.length / 7));
  const ticks = [max, Math.round(max / 2), 0].filter(
    (value, index, values) => values.indexOf(value) === index,
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <SectionTitle title="Evolução das NCs" icon={AlertTriangle} />
      <div className="px-4 pb-12 pr-7 pt-4">
        <div className="mb-2 flex items-center gap-6">
          <Legend color="#be123c" label="NCs abertas" />
          <Legend color="#0f766e" label="NCs encerradas" />
        </div>
        <div className="grid grid-cols-[20px_1fr] gap-1">
          <div className="relative h-[180px]">
            {ticks.map((tick) => (
              <span
                key={tick}
                className="absolute right-0 translate-y-1/2 font-mono text-[10px] font-bold text-slate-500"
                style={{ bottom: `${(tick / max) * 100}%` }}
              >
                {tick}
              </span>
            ))}
          </div>
          <div className="relative h-[180px] border-b border-l border-slate-300">
            {ticks.map((tick) => (
              <span
                key={tick}
                className="absolute left-0 right-8 border-t border-slate-200"
                style={{ bottom: `${(tick / max) * 100}%` }}
              />
            ))}
            <div className="absolute bottom-0 left-0 right-12 top-0 flex items-end gap-1 pl-1">
              {rows.map((item, index) => (
                <div key={`${item.label}-${index}`} className="relative flex min-w-0 flex-1 justify-center">
                  <div className="flex h-[148px] items-end gap-0.5">
                    <Bar value={item.abertas} max={max} color="#be123c" />
                    <Bar value={item.encerradas} max={max} color="#0f766e" />
                  </div>
                  {(index % visibleInterval === 0 || index === rows.length - 1) && (
                    <span className="absolute top-full mt-1 origin-top-left rotate-90 whitespace-nowrap font-mono text-[9px] font-bold text-slate-600">
                      {item.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="flex h-full w-2 flex-col justify-end">
      {value > 0 ? (
        <span className="mb-0.5 text-center font-mono text-[8px] font-black text-slate-900">
          {value}
        </span>
      ) : (
        <span className="h-[10px]" aria-hidden="true" />
      )}
      <span
        className="block min-h-1 rounded-t-sm"
        style={{
          height: value > 0 ? `${Math.max(5, (value / max) * 100)}%` : 2,
          backgroundColor: color,
          opacity: value > 0 ? 1 : 0.45,
        }}
      />
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-600">
      <span className="size-2.5 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function RankingTable({
  title,
  icon,
  columns,
  rows,
}: {
  title: string;
  icon: ElementType;
  columns: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <SectionTitle title={title} icon={icon} />
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr className="bg-slate-50 text-left uppercase tracking-widest text-slate-500">
            {columns.map((column, index) => (
              <th
                key={column}
                className={`border-b border-slate-200 px-3 py-2 font-extrabold ${
                  index > 1 ? "text-right" : ""
                }`}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 5).map((row, rowIndex) => (
            <tr key={`${title}-${rowIndex}`} className={rowIndex % 2 ? "bg-slate-50/70" : ""}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`${title}-${rowIndex}-${cellIndex}`}
                  className={`border-b border-slate-200 px-3 py-2 ${
                    cellIndex > 1 ? "text-right font-mono font-bold" : ""
                  } ${cellIndex === 0 ? "font-mono font-bold text-slate-500" : ""}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function TopNonConformitiesTable({
  rows,
}: {
  rows: Array<{ title: string; occurrences: number }>;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <SectionTitle title="Top Não Conformidades" icon={AlertTriangle} />
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-[12px] font-semibold text-slate-600">
          Nenhuma não conformidade registrada no período.
        </p>
      ) : (
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-50 text-left uppercase tracking-widest text-slate-500">
              <th className="border-b border-slate-200 px-4 py-2 font-extrabold">
                Não Conformidade
              </th>
              <th className="border-b border-slate-200 px-4 py-2 text-right font-extrabold">
                Ocorrências
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 5).map((item, index) => (
              <tr key={item.title} className={index % 2 ? "bg-slate-50/70" : ""}>
                <td className="border-b border-slate-200 px-4 py-2.5 font-semibold text-slate-900">
                  <span className="mr-3 font-mono text-[10px] font-bold text-slate-500">
                    {index + 1}.
                  </span>
                  {item.title}
                </td>
                <td className="border-b border-slate-200 px-4 py-2.5 text-right font-mono text-[12px] font-extrabold">
                  {item.occurrences}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function InsightsGrid({ items }: { items: KpiItem[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <SectionTitle title="Insights Operacionais" icon={Gauge} />
      <div className="grid grid-cols-4 gap-px bg-slate-200">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-white p-3">
              <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
                <Icon className="size-3.5" />
                {item.label}
              </p>
              <p className="mt-2 truncate text-[18px] font-extrabold text-slate-950">
                {item.value}
              </p>
              {item.trend && (
                <p className={`mt-1 text-[10px] font-bold ${trendClass(item.trend)}`}>
                  {trendLabel(item.trend)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default async function PrintManagementReportPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const report = await getManagementReportData(params);
  const labels = resolveManagementReportFilterLabels(report);

  const scaffoldDonut: DonutItem[] = [
    { label: "Liberados", value: report.kpis.scaffolds.liberados, color: "#059669" },
    { label: "Em montagem", value: report.kpis.scaffolds.emMontagem, color: "#d97706" },
    { label: "Pendentes", value: report.kpis.scaffolds.pendentes, color: "#ca8a04" },
    { label: "Interditados", value: report.kpis.scaffolds.interditados, color: "#be123c" },
    { label: "Vencidos", value: report.kpis.scaffolds.vencidos, color: "#e11d48" },
    { label: "Desmontados", value: report.kpis.scaffolds.desmontados, color: "#475569" },
  ];
  const inspectionDonut: DonutItem[] = [
    { label: "Aprovadas", value: report.kpis.inspections.aprovadas, color: "#059669" },
    { label: "Reprovadas", value: report.kpis.inspections.reprovadas, color: "#be123c" },
    { label: "Com ressalvas", value: report.kpis.inspections.ressalvas, color: "#d97706" },
    {
      label: "NCs em tratamento",
      value: report.kpis.nonConformities.emTratamento,
      color: "#0f766e",
    },
    { label: "NCs vencidas", value: report.kpis.nonConformities.vencidas, color: "#64748b" },
  ];
  const performanceItems = inspectionDonut.slice(0, 3);

  const kpis: KpiItem[] = [
    {
      label: "Total de Andaimes",
      value: report.kpis.scaffolds.total,
      icon: Construction,
      accent: "border-orange-600",
    },
    {
      label: "Inspeções Realizadas",
      value: report.kpis.inspections.total,
      icon: ClipboardCheck,
      accent: "border-slate-500",
    },
    {
      label: "NCs Abertas",
      value: report.kpis.nonConformities.abertas,
      icon: AlertTriangle,
      accent: "border-rose-700",
    },
    {
      label: "Tempo Médio em Operação",
      value: formatAverage(report.kpis.averages.operationDays),
      icon: Clock3,
      accent: "border-emerald-600",
    },
    {
      label: "Taxa de Aprovação",
      value: formatTrendRate(report.trends.approvalRate),
      icon: Gauge,
      accent: "border-emerald-600",
      trend: report.trends.approvalRate,
    },
    {
      label: "NCs Encerradas",
      value: report.kpis.nonConformities.encerradas,
      icon: CheckCircle2,
      accent: "border-emerald-600",
      trend: report.trends.closedNonConformities,
    },
    {
      label: "NCs em Dia",
      value: formatRate(report.kpis.quality.onTimeClosureRate),
      icon: ShieldCheck,
      accent: "border-slate-500",
      trend: report.trends.onTimeClosureRate,
    },
    {
      label: "Taxa de Utilização",
      value: formatRate(report.kpis.quality.utilizationRate),
      icon: Gauge,
      accent: "border-teal-600",
    },
    {
      label: "Tempo Médio Correção",
      value: formatAverage(report.kpis.averages.correctionDays),
      icon: Wrench,
      accent: "border-orange-600",
      trend: report.trends.correctionDays,
    },
  ];

  const insights: KpiItem[] = [
    {
      label: "Empresa mais ativa",
      value: report.rankings.companies[0]?.name ?? "Sem dados",
      icon: Building2,
      accent: "border-slate-500",
    },
    {
      label: "Área com maior volume",
      value: report.rankings.areas[0]?.name ?? "Sem dados",
      icon: Factory,
      accent: "border-slate-500",
    },
    {
      label: "Inspetor mais ativo",
      value: report.rankings.inspectors[0]?.name ?? "Sem dados",
      icon: UserCheck,
      accent: "border-slate-500",
    },
    {
      label: "Tempo médio de correção",
      value: formatAverage(report.kpis.averages.correctionDays),
      icon: Wrench,
      accent: "border-slate-500",
      trend: report.trends.correctionDays,
    },
  ];

  return (
    <>
      <PrintActions backHref={buildBackHref(report.filters)} />
      <main className="min-h-screen bg-slate-200 py-6 print:bg-white print:py-0">
        <style>{`
          @page { size: A4 landscape; margin: 8mm; }
          @media print {
            .print-toolbar { display: none !important; }
            .print-page {
              box-shadow: none !important;
              margin: 0 !important;
              min-height: auto !important;
              page-break-after: always;
              width: 100% !important;
            }
            .print-page:last-child { page-break-after: auto; }
          }
        `}</style>
        <section className="print-page mx-auto mb-6 w-[1120px] space-y-4 rounded-lg bg-white p-6 shadow-xl">
          <PrintHeader report={report} labels={labels} />
          <KpiGrid items={kpis} />
          <div className="grid grid-cols-2 gap-4">
            <DonutCard title="Andaimes" icon={Construction} items={scaffoldDonut} />
            <DonutCard
              title="Inspeções e NCs"
              icon={ClipboardCheck}
              items={inspectionDonut}
              footer={`Tempo médio de correção: ${formatAverage(
                report.kpis.averages.correctionDays,
              )}`}
            />
          </div>
        </section>

        <section className="print-page mx-auto mb-6 w-[1120px] space-y-4 rounded-lg bg-white p-6 shadow-xl">
          <PrintHeader report={report} labels={labels} />
          <div className="grid grid-cols-[0.82fr_1.18fr] gap-4">
            <PerformanceCard items={performanceItems} />
            <NcEvolutionCard rows={report.charts.nonConformityTrend} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <RankingTable
              title="Top 5 Empresas"
              icon={Building2}
              columns={["#", "Empresa", "And.", "Insp.", "NC"]}
              rows={report.rankings.companies.map((item, index) => [
                index + 1,
                item.name,
                item.scaffolds,
                item.inspections,
                item.ncs,
              ])}
            />
            <RankingTable
              title="Top 5 Áreas"
              icon={Factory}
              columns={["#", "Área", "And.", "Insp.", "NC"]}
              rows={report.rankings.areas.map((item, index) => [
                index + 1,
                item.name,
                item.scaffolds,
                item.inspections,
                item.ncs,
              ])}
            />
            <RankingTable
              title="Top 5 Inspetores"
              icon={UserCheck}
              columns={["#", "Inspetor", "Insp.", "Apr.", "Rep."]}
              rows={report.rankings.inspectors.map((item, index) => [
                index + 1,
                item.name,
                item.inspections,
                item.aprovadas,
                item.reprovadas,
              ])}
            />
          </div>
          <p className="text-[10px] font-medium text-slate-500">
            Documento gerado automaticamente pelo AndCheck. Dados respeitam escopo,
            RBAC e filtros aplicados.
          </p>
        </section>

        <section className="print-page mx-auto w-[1120px] space-y-4 rounded-lg bg-white p-6 shadow-xl">
          <PrintHeader report={report} labels={labels} />
          <TopNonConformitiesTable rows={report.rankings.nonConformities} />
          <InsightsGrid items={insights} />
          <p className="text-[10px] font-medium text-slate-500">
            Documento gerado automaticamente pelo AndCheck. Dados respeitam escopo,
            RBAC e filtros aplicados.
          </p>
        </section>
      </main>
    </>
  );
}
