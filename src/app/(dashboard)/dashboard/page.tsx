import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Construction,
  FileText,
  History,
  MapPinned,
  Plus,
  ShieldOff,
  TimerReset,
  TrendingUp,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { DashboardMapPreview } from "@/components/dashboard/dashboard-map-preview";
import { InspectionPerformanceChart } from "@/components/dashboard/inspection-performance-chart";
import { StatusBadge } from "@/components/shared/status-badge";
import { canCurrentUser, getCurrentUserAccess } from "@/lib/authz";
import { getDashboardMetrics } from "@/lib/dashboard-metrics";
import { getContextCapabilities } from "@/lib/data-scope";

const NORMS = [
  "NR-18 / 2022",
  "NR-35 / 2012",
  "ABNT NBR 6494",
  "ISO 45001:2018",
  "ISO 9001:2015",
];

export default async function DashboardPage() {
  const access = await getCurrentUserAccess();
  const [
    dashboardMetrics,
    canCreateScaffold,
    canCreateInspection,
  ] = await Promise.all([
    getDashboardMetrics(),
    canCurrentUser("scaffolds.create"),
    canCurrentUser("inspections.create"),
  ]);
  const { scaffolds, inspections } = dashboardMetrics.operational;
  const { historical, rankings, recentActivities } = dashboardMetrics;
  const capabilities = access ? await getContextCapabilities(access) : null;
  const showResponsibleCompany = Boolean(
    capabilities?.canSwitchCompany &&
      access?.roleCodes.some((roleCode) =>
        ["SUPER_ADMIN", "HSE_HYDRO", "HSE_GERENCIADORA", "AUDITOR"].includes(roleCode),
      ),
  );

  const liberados = scaffolds.filter((s) => s.status === "liberado").length;
  const emMontagem = scaffolds.filter((s) => s.status === "em_montagem").length;
  const pendenteLiberacao = scaffolds.filter(
    (s) => s.status === "pendente_liberacao",
  ).length;
  const reprovados = scaffolds.filter((s) =>
    ["reprovado", "interditado"].includes(s.status),
  ).length;
  const proxVenc = scaffolds.filter((s) => {
    if (!s.validity_date || s.status !== "liberado") return false;
    return differenceInDays(s.validity_date, new Date()) <= 3;
  }).length;

  const today = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-border">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            AndCheck EHS · Painel Operacional
          </p>
          <h1 className="text-[18px] font-bold text-foreground tracking-tight uppercase">
            Central de Controle de Andaimes
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
            {today}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {canCreateScaffold && (
            <Link
              href="/andaimes/novo"
              className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground text-[10px] font-bold tracking-widest uppercase h-8 px-3"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Andaime
            </Link>
          )}
          {canCreateInspection && (
            <Link
              href="/inspecoes/nova"
              className="inline-flex items-center gap-1.5 border border-border text-foreground hover:bg-muted text-[10px] font-bold tracking-widest uppercase h-8 px-3"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              Nova Inspeção
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Liberados"
          value={liberados}
          total={scaffolds.length}
          icon={CheckCircle2}
          theme="green"
          hint="Operacional"
        />
        <KpiCard
          label="Em Montagem"
          value={emMontagem}
          total={scaffolds.length}
          icon={Wrench}
          theme="blue"
          hint="Aguardando conclusão"
        />
        <KpiCard
          label="Pend. Liberação"
          value={pendenteLiberacao}
          total={scaffolds.length}
          icon={Clock}
          theme="amber"
          hint="Aguardando inspeção"
        />
        <KpiCard
          label="Reprov. / Interdit."
          value={reprovados}
          total={scaffolds.length}
          icon={ShieldOff}
          theme="red"
          hint="Ação corretiva"
        />
        <KpiCard
          label="Vence em 3 dias"
          value={proxVenc}
          total={scaffolds.length}
          icon={AlertTriangle}
          theme="orange"
          hint="Requer renovação"
        />
      </div>

      {/* Indicadores historicos */}
      <section className="space-y-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            Indicadores Historicos
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Visao gerencial baseada em andaimes desmontados, inspecoes e tratativas.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <ExecutiveKpiCard
            label="Tempo Medio em Operacao"
            value={formatDays(historical.averageOperationDays)}
            description="Tempo medio que os andaimes permaneceram ativos."
            icon={TimerReset}
            theme="slate"
          />
          <ExecutiveKpiCard
            label="Taxa de Aprovacao"
            value={`${historical.approvalRate}%`}
            description="Inspecoes aprovadas sobre o total de inspecoes."
            icon={TrendingUp}
            theme="green"
          />
          <ExecutiveKpiCard
            label="NCs Encerradas"
            value={historical.closedNonConformities}
            description="Nao conformidades encerradas no escopo atual."
            icon={CheckCircle2}
            theme="blue"
          />
          <ExecutiveKpiCard
            label="Tempo Medio de Correcao"
            value={formatDecimalDays(historical.averageCorrectionDays)}
            description="Tempo medio entre abertura e encerramento de NC."
            icon={Clock}
            theme="amber"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankingPanel
          title="Empresas Mais Ativas"
          subtitle="Total de andaimes"
          icon={Building2}
          items={rankings.companies}
          suffix="andaimes"
        />
        <RankingPanel
          title="Areas com Mais Andaimes"
          subtitle="Andaimes criados"
          icon={MapPinned}
          items={rankings.areas}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 min-h-96">
        <InspectionPerformanceChart inspections={inspections} />
        <DashboardMapPreview
          scaffolds={scaffolds}
          showCompanyName={showResponsibleCompany}
        />
      </div>

      {/* Ultimas atividades */}
      <PanelBlock
        title="Ultimas Atividades"
        subtitle={recentActivities.length + " registros"}
        icon={History}
      >
        {recentActivities.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Activity className="mx-auto h-8 w-8 text-muted-foreground/25" />
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Nenhuma atividade registrada
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-foreground">
                    {activity.description}
                  </p>
                  <p className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground/60">
                    {activity.actor}
                  </p>
                </div>
                <p className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {format(activity.createdAt, "dd/MM HH:mm")}
                </p>
              </div>
            ))}
          </div>
        )}
      </PanelBlock>

      <div className="grid lg:grid-cols-[3fr_2fr] gap-4">
        <div>
          <PanelBlock
            title="Andaimes Cadastrados"
            subtitle={scaffolds.length + " ativos"}
            icon={Construction}
            action={
              <Link
                href="/andaimes"
                className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                Ver todos <ArrowRight className="w-3 h-3" />
              </Link>
            }
          >
            <div className="divide-y divide-border">
              {scaffolds.slice(0, 6).map((s) => (
                <Link
                  key={s.id}
                  href={"/andaimes/" + s.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[11px] text-foreground font-mono uppercase">
                      {s.code}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {s.location} · {s.area}
                    </p>
                    {showResponsibleCompany && (
                      <p className="mt-0.5 truncate text-[9px] font-semibold text-muted-foreground/70">
                        Empresa: {s.tenantCompany.name}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={s.status} />
                </Link>
              ))}
            </div>
          </PanelBlock>
        </div>

        <div>
          <PanelBlock
            title="Últimos Registros"
            subtitle={inspections.length + " total"}
            icon={FileText}
            action={
              <Link
                href="/inspecoes"
                className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                Ver todos <ArrowRight className="w-3 h-3" />
              </Link>
            }
          >
            <div className="divide-y divide-border">
              {inspections.slice(0, 7).map((insp) => (
                <Link
                  key={insp.id}
                  href={"/inspecoes/" + insp.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[11px] text-foreground font-mono uppercase">
                      {insp.scaffold_code}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {format(insp.date, "dd/MM/yyyy")} · {insp.inspector_name}
                    </p>
                    {showResponsibleCompany && (
                      <p className="mt-0.5 truncate text-[9px] font-semibold text-muted-foreground/70">
                        Empresa: {insp.scaffold.tenantCompany.name}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={insp.result} />
                </Link>
              ))}
            </div>
          </PanelBlock>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3 border-t border-border">
        <span className="text-[9px] text-muted-foreground/40 uppercase tracking-widest font-semibold">
          Conformidade:
        </span>
        {NORMS.map((n) => (
          <span
            key={n}
            className="text-[9px] font-mono px-2 py-0.5 border border-border/60 text-muted-foreground/50 uppercase tracking-wider bg-muted/30"
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: number;
  total: number;
  icon: React.ElementType;
  theme: "green" | "blue" | "amber" | "red" | "orange";
  hint: string;
}

function formatDays(value: number | null) {
  if (value === null) return "Nao calculado";
  return value === 1 ? "1 dia" : `${value} dias`;
}

function formatDecimalDays(value: number | null) {
  if (value === null) return "Nao calculado";
  const formatted = value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  });
  return value === 1 ? "1 dia" : `${formatted} dias`;
}

type ExecutiveTheme = "slate" | "green" | "blue" | "amber";

const EXECUTIVE_THEMES: Record<
  ExecutiveTheme,
  { border: string; value: string; icon: string }
> = {
  slate: {
    border: "border-l-4 border-l-slate-500",
    value: "text-slate-800",
    icon: "text-slate-500",
  },
  green: {
    border: "border-l-4 border-l-green-500",
    value: "text-green-700",
    icon: "text-green-600",
  },
  blue: {
    border: "border-l-4 border-l-blue-500",
    value: "text-blue-700",
    icon: "text-blue-600",
  },
  amber: {
    border: "border-l-4 border-l-amber-500",
    value: "text-amber-700",
    icon: "text-amber-600",
  },
};

function ExecutiveKpiCard({
  label,
  value,
  description,
  icon: Icon,
  theme,
}: {
  label: string;
  value: number | string;
  description: string;
  icon: React.ElementType;
  theme: ExecutiveTheme;
}) {
  const t = EXECUTIVE_THEMES[theme];

  return (
    <div className={"bg-card border border-border p-4 shadow-sm " + t.border}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">
          {label}
        </p>
        <Icon className={"h-4 w-4 shrink-0 " + t.icon} />
      </div>
      <p className={"text-[24px] font-bold leading-none tracking-tight " + t.value}>
        {value}
      </p>
      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function RankingPanel({
  title,
  subtitle,
  icon,
  items,
  suffix,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  items: { id?: string; name: string; total: number }[];
  suffix?: string;
}) {
  return (
    <PanelBlock title={title} subtitle={subtitle} icon={icon}>
      {items.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground/25" />
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Sem dados historicos
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.map((item, index) => (
            <div
              key={item.id ?? item.name}
              className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
            >
              <span className="font-mono text-[11px] font-bold text-muted-foreground/60">
                {index + 1}.
              </span>
              <p className="truncate text-[11px] font-semibold text-foreground">
                {item.name}
              </p>
              <p className="text-right font-mono text-[10px] font-semibold text-muted-foreground">
                {item.total} {suffix ?? ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </PanelBlock>
  );
}

const THEMES = {
  green: {
    border: "border-l-4 border-l-green-600",
    val: "text-green-700",
    bar: "bg-green-500",
  },
  blue: {
    border: "border-l-4 border-l-blue-600",
    val: "text-blue-700",
    bar: "bg-blue-500",
  },
  amber: {
    border: "border-l-4 border-l-amber-500",
    val: "text-amber-700",
    bar: "bg-amber-400",
  },
  red: {
    border: "border-l-4 border-l-red-600",
    val: "text-red-700",
    bar: "bg-red-500",
  },
  orange: {
    border: "border-l-4 border-l-orange-500",
    val: "text-orange-700",
    bar: "bg-orange-400",
  },
} as const;
function KpiCard({
  label,
  value,
  total,
  icon: Icon,
  theme,
  hint,
}: KpiCardProps) {
  const t = THEMES[theme];
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div
      className={"bg-card " + t.border + " border border-border p-4 shadow-sm"}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-tight pr-2">
          {label}
        </p>
        <Icon className="w-4 h-4 shrink-0 text-muted-foreground/40" />
      </div>
      <p
        className={
          "text-[28px] font-bold " + t.val + " leading-none tracking-tight"
        }
      >
        {value}
      </p>
      <div className="mt-3">
        <div className="w-full bg-border/60 h-0.75 mb-1.5">
          <div
            className={t.bar + " h-0.75 transition-all"}
            style={{ width: pct + "%" }}
          />
        </div>
        <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">
          {hint}
        </p>
      </div>
    </div>
  );
}
interface PanelBlockProps {
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
}
function PanelBlock({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
}: PanelBlockProps) {
  return (
    <div className="bg-card border border-border shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
            {title}
          </span>
          {subtitle && (
            <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider hidden sm:inline">
              · {subtitle}
            </span>
          )}
        </div>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
