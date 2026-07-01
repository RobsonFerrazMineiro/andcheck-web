import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Construction,
  FileText,
  HardHat,
  MapPinned,
  Plus,
  ShieldOff,
  TimerReset,
  TrendingUp,
  Wrench,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { DashboardMapPreview } from "@/components/dashboard/dashboard-map-preview";
import { InspectionPerformanceChart } from "@/components/dashboard/inspection-performance-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { canCurrentUser, getCurrentUserAccess } from "@/lib/authz";
import { getDashboardMetrics } from "@/lib/dashboard-metrics";
import { getContextCapabilities } from "@/lib/data-scope";
import { surface, typography } from "@/lib/design-system";
import {
  legacyColorToneToSemanticTone,
  type LegacyColorTone,
  type SemanticTone,
  SEMANTIC_TONE_CLASSES,
} from "@/lib/semantic-tones";

const NORMS = [
  "NR-18 / 2022",
  "NR-35 / 2012",
  "ABNT NBR 6494",
  "ISO 45001:2018",
  "ISO 9001:2015",
];

export default async function DashboardPage() {
  const access = await getCurrentUserAccess();
  const [dashboardMetrics, canCreateScaffold, canCreateInspection] =
    await Promise.all([
      getDashboardMetrics(),
      canCurrentUser("scaffolds.create"),
      canCurrentUser("inspections.create"),
    ]);
  const { scaffolds, inspections } = dashboardMetrics.operational;
  const { historical, operationalMovements, rankings } = dashboardMetrics;
  const capabilities = access ? await getContextCapabilities(access) : null;
  const showResponsibleCompany = Boolean(
    capabilities?.canSwitchCompany &&
    access?.roleCodes.some((roleCode) =>
      ["SUPER_ADMIN", "HSE_HYDRO", "HSE_GERENCIADORA", "AUDITOR"].includes(
        roleCode,
      ),
    ),
  );
  const showCompanyRanking = rankings.companies.length >= 2;

  const liberados = scaffolds.filter((s) => s.status === "liberado").length;
  const emMontagem = scaffolds.filter((s) => s.status === "em_montagem").length;
  const pendenteLiberação = scaffolds.filter(
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
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <BarChart3 className="size-4" />
            AndCheck • Painel Operacional
          </div>
          <h1 className={`${typography.pageTitle} text-foreground`}>
            Central de Controle de Andaimes
          </h1>
          <p
            className={`mt-0.5 ${typography.sectionDescription} capitalize text-muted-foreground`}
          >
            {today}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {canCreateScaffold && (
            <Link
              href="/andaimes/novo"
              className={`inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-accent-foreground hover:bg-accent/90 ${typography.action}`}
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Andaime
            </Link>
          )}
          {canCreateInspection && (
            <Link
              href="/inspecoes/nova"
              className={`inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 px-3 text-foreground hover:bg-muted ${typography.action}`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              Nova Inspeção
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          label="Andaimes Montados"
          value={scaffolds.length}
          total={0}
          icon={Construction}
          theme="slate"
          hint="Inventário operacional ativo"
        />
        <KpiCard
          label="Liberados"
          value={liberados}
          total={scaffolds.length}
          icon={CheckCircle2}
          theme="green"
          hint="Operacional"
          showPct
        />
        <KpiCard
          label="Em Montagem"
          value={emMontagem}
          total={scaffolds.length}
          icon={Wrench}
          theme="blue"
          hint="Aguardando conclusão"
          showPct
        />
        <KpiCard
          label="Pend. Liberação"
          value={pendenteLiberação}
          total={scaffolds.length}
          icon={Clock}
          theme="amber"
          hint="Aguardando inspeção"
          showPct
        />
        <KpiCard
          label="Reprov. / Interdit."
          value={reprovados}
          total={scaffolds.length}
          icon={ShieldOff}
          theme="red"
          hint="Ação corretiva"
          showPct
        />
        <KpiCard
          label="Vence em 3 dias"
          value={proxVenc}
          total={scaffolds.length}
          icon={AlertTriangle}
          theme="orange"
          hint="Requer renovação"
          showPct
        />
      </div>

      {/* Indicadores históricos */}
      <section className="space-y-3">
        <div>
          <p className={`${typography.sectionLabel} text-muted-foreground`}>
            Indicadores Históricos
          </p>
          <p
            className={`mt-0.5 ${typography.sectionDescription} text-muted-foreground`}
          >
            Visão gerencial baseada em andaimes desmontados, inspeções e
            tratativas.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <ExecutiveKpiCard
            label="Tempo Médio em Operação"
            value={formatDays(historical.averageOperationDays)}
            description="Tempo medio que os andaimes permaneceram ativos."
            icon={TimerReset}
            theme="slate"
          />
          <ExecutiveKpiCard
            label="Taxa de Aprovação"
            value={`${historical.approvalRate}%`}
            description="Inspeções aprovadas sobre o total de inspeções."
            icon={TrendingUp}
            theme="green"
          />
          <ExecutiveKpiCard
            label="NCs em Dia"
            value={formatPercentageOrHistoricalBase(
              historical.onTimeClosureRate,
            )}
            description="Percentual de NCs encerradas dentro do prazo definido."
            icon={CheckCircle2}
            theme="blue"
          />
          <ExecutiveKpiCard
            label="Tempo Médio de Correção"
            value={formatDecimalDays(historical.averageCorrectionDays)}
            description="Tempo medio entre abertura e encerramento de NC."
            icon={Clock}
            theme="amber"
          />
        </div>
      </section>

      <div
        className={
          showCompanyRanking
            ? "grid grid-cols-1 lg:grid-cols-2 gap-4"
            : "grid grid-cols-1 gap-4"
        }
      >
        {showCompanyRanking && (
          <RankingPanel
            title="Empresas Mais Ativas"
            subtitle="Total de andaimes"
            description="Comparativo entre empresas do workspace"
            icon={Building2}
            items={rankings.companies}
          />
        )}
        <RankingPanel
          title="Áreas com Mais Andaimes"
          subtitle="Andaimes criados"
          description="Comparativo entre Áreas do workspace"
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

      <div className="grid lg:grid-cols-[3fr_2fr] gap-4">
        <div>
          <PanelBlock
            title="Andaimes Cadastrados"
            subtitle={scaffolds.length + " ativos"}
            icon={Construction}
            action={
              <Link
                href="/andaimes"
                className={`flex items-center gap-1 text-slate-300 hover:text-white ${typography.linkAction}`}
              >
                Ver todos <ArrowRight className="w-3 h-3" />
              </Link>
            }
          >
            {scaffolds.length === 0 ? (
              <EmptyState
                icon={Construction}
                title="Nenhum andaime cadastrado"
                description="Os andaimes ativos aparecerão aqui conforme forem cadastrados."
                className="border-0 border-b border-dashed"
              />
            ) : (
              <div className="divide-y divide-border">
                {scaffolds.slice(0, 10).map((s) => (
                  <Link
                    key={s.id}
                    href={"/andaimes/" + s.id}
                    className="grid grid-cols-[130px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <p className={`${typography.code} uppercase text-foreground`}>
                      {s.code}
                    </p>
                    <div className="min-w-0">
                      {showResponsibleCompany && (
                        <p
                          className={`truncate text-muted-foreground/60 ${typography.metaStrong}`}
                        >
                          Empresa: {s.tenantCompany.name}
                        </p>
                      )}
                      <p
                        className={`${showResponsibleCompany ? "mt-0.5" : ""} ${typography.bodyMuted} truncate text-muted-foreground`}
                      >
                        {s.location} · {s.area}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </Link>
                ))}
              </div>
            )}
          </PanelBlock>
        </div>

        <div>
          <PanelBlock
            title="Últimas Movimentações Operacionais"
            subtitle={operationalMovements.length + " eventos"}
            icon={FileText}
          >
            {operationalMovements.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Nenhuma movimentação operacional"
                description="As últimas alterações de andaimes, inspeções, NCs e documentos aparecerão aqui."
                className="border-0 border-b border-dashed"
              />
            ) : (
              <div className="divide-y divide-border">
                {operationalMovements.map((movement) => (
                  <div
                    key={movement.id}
                    className="grid grid-cols-[132px_minmax(0,1fr)_68px] items-start gap-3 px-4 py-3"
                  >
                    <MovementBadge
                      label={movement.badge}
                      tone={movement.tone}
                    />
                    <div className="min-w-0">
                      <p
                        className={`truncate text-foreground ${typography.code}`}
                      >
                        {movement.title}
                      </p>
                      <p
                        className={`mt-0.5 truncate text-muted-foreground/60 ${typography.panelSubtitle}`}
                      >
                        {movement.subtitle}
                      </p>
                    </div>
                    <p
                      className={`pt-0.5 text-right text-muted-foreground ${typography.codeMuted}`}
                    >
                      {format(movement.createdAt, "dd/MM HH:mm")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </PanelBlock>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3 border-t border-border">
        <span className={`${typography.sectionLabel} text-muted-foreground/40`}>
          Conformidade:
        </span>
        {NORMS.map((n) => (
          <span
            key={n}
            className={`${typography.codeMuted} rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 text-muted-foreground/50`}
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
  theme: LegacyColorTone;
  hint: string;
  showPct?: boolean;
}

function formatDays(value: number | null) {
  if (value === null) return "Não calculado";
  return value === 1 ? "1 dia" : `${value} dias`;
}

function formatDecimalDays(value: number | null) {
  if (value === null) return "Não calculado";
  const formatted = value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  });
  return value === 1 ? "1 dia" : `${formatted} dias`;
}

function formatPercentageOrHistoricalBase(value: number | null) {
  if (value === null) return "Sem base histórica";
  return `${value}%`;
}

type ExecutiveTheme = Extract<
  LegacyColorTone,
  "slate" | "green" | "blue" | "amber"
>;
type MovementTone = SemanticTone;

const EXECUTIVE_THEMES: Record<
  ExecutiveTheme,
  { border: string; value: string; icon: string }
> = {
  slate: {
    border: SEMANTIC_TONE_CLASSES.disabled.borderLeft,
    value: SEMANTIC_TONE_CLASSES.disabled.text,
    icon: SEMANTIC_TONE_CLASSES.disabled.icon,
  },
  green: {
    border: SEMANTIC_TONE_CLASSES.success.borderLeft,
    value: SEMANTIC_TONE_CLASSES.success.text,
    icon: SEMANTIC_TONE_CLASSES.success.icon,
  },
  blue: {
    border: SEMANTIC_TONE_CLASSES.neutral.borderLeft,
    value: SEMANTIC_TONE_CLASSES.neutral.text,
    icon: SEMANTIC_TONE_CLASSES.neutral.icon,
  },
  amber: {
    border: SEMANTIC_TONE_CLASSES.warning.borderLeft,
    value: SEMANTIC_TONE_CLASSES.warning.text,
    icon: SEMANTIC_TONE_CLASSES.warning.icon,
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
    <div
      className={
        "bg-card border border-border rounded-lg p-4 shadow-sm " + t.border
      }
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <p
          className={`${typography.sectionLabel} leading-tight text-muted-foreground`}
        >
          {label}
        </p>
        <Icon className={"h-4 w-4 shrink-0 " + t.icon} />
      </div>
      <p className={`${typography.kpiValue} leading-none ${t.value}`}>
        {value}
      </p>
      <p
        className={`mt-3 leading-relaxed text-muted-foreground ${typography.bodyMuted}`}
      >
        {description}
      </p>
    </div>
  );
}

function RankingPanel({
  title,
  subtitle,
  description,
  icon,
  items,
}: {
  title: string;
  subtitle: string;
  description?: string;
  icon: React.ElementType;
  items: { id?: string; name: string; total: number }[];
}) {
  const maxTotal = Math.max(1, ...items.map((item) => item.total));

  return (
    <PanelBlock title={title} subtitle={subtitle} icon={icon}>
      {description && (
        <div className="border-b border-border px-4 py-2">
          <p className={`${typography.metaStrong} text-muted-foreground/60`}>
            {description}
          </p>
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Sem dados históricos"
          description="Os rankings serão exibidos conforme houver registros suficientes no período."
          className="border-0 border-b border-dashed"
        />
      ) : (
        <div className="max-h-46.5 overflow-y-auto divide-y divide-border">
          {items.map((item, index) => (
            <div
              key={item.id ?? item.name}
              className="flex items-center gap-2 px-4 py-2.5"
            >
              <span
                className={`w-5 shrink-0 text-muted-foreground/60 ${typography.rankingIndex}`}
              >
                {index + 1}.
              </span>
              <p
                className={`w-36 shrink-0 truncate text-foreground sm:w-44 ${typography.bodyStrong}`}
              >
                {item.name}
              </p>
              <div className="h-2.5 min-w-12 flex-1 border border-orange-200 bg-orange-50 sm:max-w-64">
                <div
                  className="h-full bg-accent"
                  style={{
                    width: `${Math.max(8, Math.round((item.total / maxTotal) * 100))}%`,
                  }}
                />
              </div>
              <p
                className={`w-8 shrink-0 text-right text-foreground ${typography.code}`}
              >
                {item.total}
              </p>
            </div>
          ))}
        </div>
      )}
    </PanelBlock>
  );
}

const MOVEMENT_BADGE_ICONS: Record<string, React.ElementType> = {
  "ANDAIME CRIADO": Construction,
  LIBERADO: CheckCircle2,
  INTERDITADO: ShieldOff,
  DESMONTADO: HardHat,
  REPROVADO: XCircle,
  "INSP. APROVADA": ClipboardCheck,
  "INSP. REPROVADA": XCircle,
  "C/ RESSALVAS": AlertTriangle,
  "NC ABERTA": AlertTriangle,
  "NC ENCERRADA": CheckCircle2,
  "NC ATUALIZADA": Clock,
  "DOC. VENCIDO": FileText,
};

function MovementBadge({ label, tone }: { label: string; tone: MovementTone }) {
  const Icon = MOVEMENT_BADGE_ICONS[label] ?? Clock;

  return (
    <span
      className={
        "inline-flex justify-self-start items-center gap-1.5 rounded-md border px-1.5 py-0.5 " +
        typography.badge +
        " " +
        SEMANTIC_TONE_CLASSES[tone].badge
      }
    >
      <Icon className="h-2.5 w-2.5 shrink-0" />
      {label}
    </span>
  );
}

function KpiCard({
  label,
  value,
  total,
  icon: Icon,
  theme,
  hint,
  showPct,
}: KpiCardProps) {
  const t = SEMANTIC_TONE_CLASSES[legacyColorToneToSemanticTone(theme)];
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const showBar = total > 0;
  return (
    <div
      className={
        "bg-card " +
        t.borderLeft +
        " border border-border rounded-lg p-4 shadow-sm"
      }
    >
      <div className="flex items-start justify-between mb-2">
        <p
          className={`${typography.sectionLabel} pr-2 leading-tight text-muted-foreground`}
        >
          {label}
        </p>
        <Icon className={"w-4 h-4 shrink-0 " + t.icon} />
      </div>
      <p
        className={typography.operationalValue + " " + t.text + " leading-none"}
      >
        {value}
      </p>
      <div className="mt-3">
        {showBar && (
          <div className="w-full bg-border/60 h-0.75 mb-1.5">
            <div
              className={t.bar + " h-0.75 transition-all"}
              style={{ width: pct + "%" }}
            />
          </div>
        )}
        <p className={`${typography.panelSubtitle} text-muted-foreground/50`}>
          {showPct && showBar ? `${pct}% do inventário` : hint}
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
    <div className="bg-card border border-border rounded-lg shadow-sm h-full flex flex-col overflow-hidden">
      <div
        className={`flex items-center justify-between ${surface.panelHeader}`}
      >
        <div className="flex items-center gap-2">
          <Icon className={surface.panelHeaderIcon} />
          <span className={surface.panelHeaderTitle}>{title}</span>
          {subtitle && (
            <span className={`hidden sm:inline ${surface.panelHeaderSubtitle}`}>
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
