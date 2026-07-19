"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { MobileFilterPanel } from "@/components/shared/mobile-filter-panel";
import { typography } from "@/lib/design-system";
import type { ExecutiveDashboardData } from "@/lib/executive-dashboard";
import {
  scaffoldStatusTone,
  SEMANTIC_TONE_CLASSES,
  SEMANTIC_TONE_HEX,
  type SemanticTone,
} from "@/lib/semantic-tones";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Download,
  FileSpreadsheet,
  Filter,
  Info,
  MapPinned,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type Props = {
  data: ExecutiveDashboardData;
};

const OperationalMap = dynamic(
  () =>
    import("@/components/maps/operational-map").then((module) => module.OperationalMap),
  {
    ssr: false,
    loading: () => <EmptyChart label="Carregando mapa gerencial..." />,
  },
);

const OperationalSeriesChart = dynamic(
  () =>
    import("@/components/dashboard/executive-dashboard-charts").then(
      (module) => module.OperationalSeriesChart,
    ),
  { loading: () => <EmptyChart label="Carregando indicadores..." /> },
);

const StatusDistributionChart = dynamic(
  () =>
    import("@/components/dashboard/executive-dashboard-charts").then(
      (module) => module.StatusDistributionChart,
    ),
  { loading: () => <EmptyChart label="Carregando distribuição..." /> },
);

const InspectorProductivityChart = dynamic(
  () =>
    import("@/components/dashboard/executive-dashboard-charts").then(
      (module) => module.InspectorProductivityChart,
    ),
  { loading: () => <EmptyChart label="Carregando produtividade..." /> },
);

const PERIODS = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "quarter", label: "Trimestre" },
  { value: "year", label: "Ano" },
];

const STATUS_COLORS: Record<string, string> = {
  liberado: SEMANTIC_TONE_HEX[scaffoldStatusTone("liberado")],
  em_montagem: SEMANTIC_TONE_HEX[scaffoldStatusTone("em_montagem")],
  pendente_liberacao:
    SEMANTIC_TONE_HEX[scaffoldStatusTone("pendente_liberacao")],
  interditado: SEMANTIC_TONE_HEX[scaffoldStatusTone("interditado")],
  vencido: SEMANTIC_TONE_HEX[scaffoldStatusTone("vencido")],
  desmontado: SEMANTIC_TONE_HEX[scaffoldStatusTone("desmontado")],
};

export function ExecutiveDashboardClient({ data }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState(data.filters);

  function updateFilter(name: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function applyFilters() {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") params.set(key, value);
    });
    startTransition(() => {
      router.push(`/dashboard-gerencial?${params.toString()}`);
    });
  }

  const chartTotals = useMemo(
    () =>
      data.series.reduce(
        (total, item) =>
          total +
          item.inspections +
          item.nonConformities +
          item.released +
          item.interdictions +
          item.criticalNotifications,
        0,
      ),
    [data.series],
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-border">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <BarChart3 className="size-4" />
            AndCheck • Dashboard Executivo
          </div>
          <h1 className={`${typography.pageTitle} text-foreground`}>
            Dashboard Executivo
          </h1>
          <p className={`mt-0.5 ${typography.sectionDescription} text-muted-foreground`}>
            Indicadores estratégicos e Business Intelligence
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Badge variant="secondary">{data.range.label}</Badge>
          <Button
            size="sm"
            className={`h-8 gap-1.5 rounded-md px-3 ${typography.action}`}
            onClick={() => exportExcel(data)}
          >
            <FileSpreadsheet className="size-3.5" />
            Excel
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 gap-1.5 rounded-md border border-border/70 px-3 ${typography.action}`}
            onClick={() => exportPdf(data)}
          >
            <Download className="size-3.5" />
            PDF
          </Button>
        </div>
      </header>

      <MobileFilterPanel
        title="Filtros globais"
        description="Todos os indicadores, rankings, mapa e exportações usam a mesma seleção."
        summary={`${data.range.label} · ${filters.companyId === "all" ? "Todas empresas" : data.filterOptions.companies.find((item) => item.id === filters.companyId)?.name ?? "Empresa"} · ${filters.status === "all" ? "Todos status" : filters.status}`}
      >
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <p className={`${typography.sectionLabel} text-muted-foreground`}>
            Filtros globais
          </p>
          <span className={`${typography.panelSubtitle} text-muted-foreground/50`}>
            {data.range.label}
          </span>
        </div>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            <FilterSelect
              label="Empresa"
              value={filters.companyId}
              onValueChange={(value) => updateFilter("companyId", value)}
              options={data.filterOptions.companies.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
            <FilterSelect
              label="Workspace"
              value={filters.workspaceId}
              onValueChange={(value) => updateFilter("workspaceId", value)}
              options={data.filterOptions.workspaces.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
            <FilterSelect
              label="Área"
              value={filters.area}
              onValueChange={(value) => updateFilter("area", value)}
              options={data.filterOptions.areas.map((item) => ({
                value: item,
                label: item,
              }))}
            />
            <FilterSelect
              label="Status"
              value={filters.status}
              onValueChange={(value) => updateFilter("status", value)}
              options={data.filterOptions.statuses}
            />
            <FilterSelect
              label="Visão"
              value={filters.period}
              onValueChange={(value) => updateFilter("period", value)}
              options={PERIODS}
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">Data inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(event) => updateFilter("startDate", event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endDate">Data final</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(event) => updateFilter("endDate", event.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              className={`h-8 gap-1.5 rounded-md px-3 ${typography.action}`}
              onClick={applyFilters}
              disabled={isPending}
            >
              {isPending ? "Aplicando..." : "Aplicar filtros"}
            </Button>
          </div>
      </div>
      </MobileFilterPanel>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Indicadores operacionais</CardTitle>
            <CardDescription>
              Evolução consolidada por {PERIODS.find((item) => item.value === data.filters.period)?.label.toLowerCase()}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {chartTotals === 0 ? (
                <EmptyChart />
              ) : (
                <OperationalSeriesChart data={data.series} />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dashboard por status</CardTitle>
            <CardDescription>Distribuição dos andaimes por situação operacional.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-[160px_1fr] xl:grid-cols-1">
              <div className="h-44">
                <StatusDistributionChart data={data.statusDistribution} />
              </div>
              <div className="flex flex-col gap-2">
                {data.statusDistribution.map((item) => (
                  <div key={item.status} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-sm"
                        style={{ background: STATUS_COLORS[item.status] ?? "#94a3b8" }}
                      />
                      <span className="truncate text-sm font-medium">{item.label}</span>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.total} · {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <RankingsGrid data={data} />
        <ProductivityPanel data={data} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <ManagementMap data={data} />
        <InsightsPanel data={data} />
      </section>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select value={value || "all"} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">Todos</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function KpiCard({ kpi }: { kpi: ExecutiveDashboardData["kpis"][number] }) {
  const positive = (kpi.trend ?? 0) >= 0;
  return (
    <Card className={cn("min-h-36", toneRing(kpi.tone))}>
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm">{kpi.label}</CardTitle>
          <Info className="size-4 shrink-0 text-muted-foreground" aria-label={kpi.tooltip} />
        </div>
        <CardDescription>{kpi.tooltip}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-3">
          <div className="text-2xl font-bold tracking-normal">{kpi.value}</div>
          <Badge variant={positive ? "secondary" : "destructive"} className="gap-1">
            {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {kpi.trend === null ? "n/a" : `${kpi.trend}%`}
          </Badge>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{kpi.comparison}</p>
      </CardContent>
    </Card>
  );
}

function RankingsGrid({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rankings executivos</CardTitle>
        <CardDescription>Empresas, áreas, inspetores, NCs e workspaces em destaque.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Ranking title="Top Empresas" items={data.rankings.companies} />
        <Ranking title="Top Áreas" items={data.rankings.areas} />
        <Ranking title="Top Inspetores" items={data.rankings.inspectors} />
        <Ranking title="Top Não Conformidades" items={data.rankings.nonConformities} />
        <Ranking title="Top Workspaces" items={data.rankings.workspaces} />
        <Ranking title="Maior taxa de aprovação" items={data.rankings.approvalCompanies} suffix="%" />
        <Ranking title="Mais interdições" items={data.rankings.interdictionCompanies} />
      </CardContent>
    </Card>
  );
}

function Ranking({
  title,
  items,
  suffix = "",
}: {
  title: string;
  items: Array<{ name: string; total: number; detail?: string }>;
  suffix?: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.total));
  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {items.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Sem dados no período"
          description="Os itens deste ranking aparecerão conforme houver registros nos filtros aplicados."
          className="border-0 py-8 shadow-none"
        />
      ) : (
        items.slice(0, 5).map((item, index) => (
          <div key={`${title}-${item.name}`} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-medium">
                {index + 1}. {item.name}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {item.total}{suffix}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(6, (item.total / max) * 100)}%` }} />
            </div>
            {item.detail && <span className="text-xs text-muted-foreground">{item.detail}</span>}
          </div>
        ))
      )}
    </div>
  );
}

function ProductivityPanel({ data }: Props) {
  const bars = data.productivity.byInspector.slice(0, 8);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtividade</CardTitle>
        <CardDescription>Produção por inspetor, empresa, área e tempos médios operacionais.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Inspeções/dia" value={data.productivity.daily} />
          <Metric label="Inspeções/mês" value={data.productivity.monthly} />
          <Metric label="Dias para liberar" value={data.productivity.averageReleaseDays} suffix=" dias" />
          <Metric label="Dias para fechar NC" value={data.productivity.averageNcClosureDays} suffix=" dias" />
        </div>
        <div className="h-64">
          {bars.length === 0 ? (
            <EmptyChart />
          ) : (
            <InspectorProductivityChart data={bars} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-normal">
        {formatNumber(value)}
        {suffix}
      </p>
    </div>
  );
}

function ManagementMap({ data }: Props) {
  const pins = data.map.pins;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapa gerencial</CardTitle>
        <CardDescription>
          Mapa real com andaimes georreferenciados, status por cor e concentração por área.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="relative min-h-96 overflow-hidden rounded-lg border">
          {pins.length > 0 ? (
            <OperationalMap
              scaffolds={pins}
              height="384px"
              interactive
              showCompanyName
              variant="compact"
            />
          ) : (
            <EmptyChart label="Nenhum andaime georreferenciado no filtro aplicado." />
          )}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MapPinned className="size-4" />
            {pins.length} ponto(s) georreferenciado(s)
          </div>
          <Ranking title="Áreas" items={data.map.byArea} />
          <div className="grid grid-cols-2 gap-2 rounded-md border p-3 text-xs text-muted-foreground">
            {[
              ["Liberado", "liberado"],
              ["Montagem", "em_montagem"],
              ["Pendente", "pendente_liberacao"],
              ["Interditado", "interditado"],
              ["Vencido", "vencido"],
              ["Desmontado", "desmontado"],
            ].map(([label, status]) => (
              <div key={status} className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: STATUS_COLORS[status] ?? "#64748b" }}
                />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightsPanel({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Insights operacionais</CardTitle>
        <CardDescription>Tendências automáticas calculadas com os dados filtrados.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {data.insights.map((insight) => (
          <div key={insight.title} className={cn("rounded-md border p-3", toneBackground(insight.tone))}>
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{insight.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{insight.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyChart({ label = "Sem dados para o período filtrado." }: { label?: string }) {
  return (
    <EmptyState
      icon={Activity}
      title={label}
      description="Ajuste os filtros ou aguarde novos registros operacionais para compor este indicador."
      className="flex h-full min-h-44 flex-col justify-center border-dashed shadow-none"
    />
  );
}

function toneRing(tone: string) {
  return SEMANTIC_TONE_CLASSES[toSemanticTone(tone)].border;
}

function toneBackground(tone: string) {
  return SEMANTIC_TONE_CLASSES[toSemanticTone(tone)].subtleBg;
}

function toSemanticTone(tone: string): SemanticTone {
  if (
    tone === "success" ||
    tone === "critical" ||
    tone === "warning" ||
    tone === "neutral" ||
    tone === "disabled"
  ) {
    return tone;
  }
  return "neutral";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value);
}

function exportExcel(data: ExecutiveDashboardData) {
  const rows = [
    ["AndCheck • Dashboard Executivo"],
    ["Período", data.range.label],
    ["Gerado em", new Date(data.generatedAt).toLocaleString("pt-BR")],
    [],
    ["KPI", "Valor", "Comparação", "Tendência"],
    ...data.kpis.map((item) => [item.label, item.value, item.comparison, `${item.trend ?? 0}%`]),
    [],
    ["Série", "Inspeções", "NCs", "Liberados", "Interdições", "Notificações críticas"],
    ...data.series.map((item) => [
      item.label,
      item.inspections,
      item.nonConformities,
      item.released,
      item.interdictions,
      item.criticalNotifications,
    ]),
  ];
  const html = `<html><head><meta charset="utf-8" /></head><body><table>${rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${String(cell ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</td>`).join("")}</tr>`,
    )
    .join("")}</table></body></html>`;
  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  downloadBlob(blob, "business-intelligence-andcheck.xls");
}

async function exportPdf(data: ExecutiveDashboardData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("AndCheck • Dashboard Executivo", 12, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Periodo: ${data.range.label}`, 12, 21);
  doc.text(`Gerado em: ${new Date(data.generatedAt).toLocaleString("pt-BR")}`, 12, 27);

  let x = 12;
  let y = 38;
  data.kpis.slice(0, 12).forEach((kpi, index) => {
    doc.setDrawColor(220);
    doc.rect(x, y, 65, 22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(kpi.label, x + 3, y + 6, { maxWidth: 58 });
    doc.setFontSize(13);
    doc.text(kpi.value, x + 3, y + 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(kpi.comparison, x + 3, y + 20, { maxWidth: 58 });
    x += 69;
    if ((index + 1) % 4 === 0) {
      x = 12;
      y += 27;
    }
  });

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Insights", 12, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 7;
  data.insights.forEach((insight) => {
    doc.text(`- ${insight.title}: ${insight.detail}`, 12, y, { maxWidth: 260 });
    y += 7;
  });

  doc.save("business-intelligence-andcheck.pdf");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
