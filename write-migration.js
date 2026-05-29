const fs = require("fs");
const path = require("path");

// ──────────────────────────────────────────────────────────────────────────────
// 1. dashboard/page.tsx — trocar mock por actions, fix dates
// ──────────────────────────────────────────────────────────────────────────────
const dashboard = `import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Construction,
  FileText,
  Plus,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { getInspections } from "@/lib/actions/inspection-actions";
import { getScaffolds } from "@/lib/actions/scaffold-actions";

const NORMS = [
  "NR-18 / 2022",
  "NR-35 / 2012",
  "ABNT NBR 6494",
  "ISO 45001:2018",
  "ISO 9001:2015",
];

export default async function DashboardPage() {
  const [scaffolds, inspections] = await Promise.all([
    getScaffolds(),
    getInspections(),
  ]);

  const liberados = scaffolds.filter((s) => s.status === "liberado").length;
  const pendentes = scaffolds.filter((s) =>
    ["pendente", "em_montagem"].includes(s.status),
  ).length;
  const reprovados = scaffolds.filter((s) => s.status === "reprovado").length;
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
          <Link
            href="/andaimes/novo"
            className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold tracking-widest uppercase h-8 px-3"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Andaime
          </Link>
          <Link
            href="/inspecoes/nova"
            className="inline-flex items-center gap-1.5 border border-border text-foreground hover:bg-muted text-[10px] font-bold tracking-widest uppercase h-8 px-3"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            Nova Inspeção
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Andaimes Liberados" value={liberados} total={scaffolds.length} icon={CheckCircle2} theme="green" hint="Status operacional" />
        <KpiCard label="Aguardando Inspeção" value={pendentes} total={scaffolds.length} icon={Clock} theme="amber" hint="Pendente / Em montagem" />
        <KpiCard label="Andaimes Reprovados" value={reprovados} total={scaffolds.length} icon={XCircle} theme="red" hint="Ação corretiva requerida" />
        <KpiCard label="Vencimento em 3 dias" value={proxVenc} total={scaffolds.length} icon={AlertTriangle} theme="orange" hint="Requer renovação" />
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <PanelBlock title="Andaimes Cadastrados" subtitle={scaffolds.length + " ativos"} icon={Construction}
            action={<Link href="/andaimes" className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-1">Ver todos <ArrowRight className="w-3 h-3" /></Link>}
          >
            <div className="divide-y divide-border">
              {scaffolds.slice(0, 6).map((s) => (
                <Link key={s.id} href={"/andaimes/" + s.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                  <div className="min-w-0">
                    <p className="font-bold text-[11px] text-foreground font-mono uppercase">{s.code}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{s.location} · {s.area}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </Link>
              ))}
            </div>
          </PanelBlock>
        </div>

        <div className="lg:col-span-2">
          <PanelBlock title="Últimos Registros" subtitle={inspections.length + " total"} icon={FileText}
            action={<Link href="/inspecoes" className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-1">Ver todos <ArrowRight className="w-3 h-3" /></Link>}
          >
            <div className="divide-y divide-border">
              {inspections.slice(0, 7).map((insp) => (
                <Link key={insp.id} href={"/inspecoes/" + insp.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                  <div className="min-w-0">
                    <p className="font-bold text-[11px] text-foreground font-mono uppercase">{insp.scaffold_code}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {format(insp.date, "dd/MM/yyyy")} · {insp.inspector_name}
                    </p>
                  </div>
                  <StatusBadge status={insp.result} />
                </Link>
              ))}
            </div>
          </PanelBlock>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3 border-t border-border">
        <span className="text-[9px] text-muted-foreground/40 uppercase tracking-widest font-semibold">Conformidade:</span>
        {NORMS.map((n) => (
          <span key={n} className="text-[9px] font-mono px-2 py-0.5 border border-border/60 text-muted-foreground/50 uppercase tracking-wider bg-muted/30">{n}</span>
        ))}
      </div>
    </div>
  );
}

interface KpiCardProps { label: string; value: number; total: number; icon: React.ElementType; theme: "green" | "amber" | "red" | "orange"; hint: string; }
const THEMES = {
  green:  { border: "border-l-[3px] border-l-green-600",  val: "text-green-700",  bar: "bg-green-500" },
  amber:  { border: "border-l-[3px] border-l-amber-500",  val: "text-amber-700",  bar: "bg-amber-400" },
  red:    { border: "border-l-[3px] border-l-red-600",    val: "text-red-700",    bar: "bg-red-500" },
  orange: { border: "border-l-[3px] border-l-orange-500", val: "text-orange-700", bar: "bg-orange-400" },
} as const;
function KpiCard({ label, value, total, icon: Icon, theme, hint }: KpiCardProps) {
  const t = THEMES[theme]; const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className={"bg-card " + t.border + " border border-border p-4 shadow-sm"}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-tight pr-2">{label}</p>
        <Icon className="w-4 h-4 shrink-0 text-muted-foreground/40" />
      </div>
      <p className={"text-[28px] font-bold " + t.val + " leading-none tracking-tight"}>{value}</p>
      <div className="mt-3">
        <div className="w-full bg-border/60 h-0.75 mb-1.5"><div className={t.bar + " h-0.75 transition-all"} style={{ width: pct + "%" }} /></div>
        <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">{hint}</p>
      </div>
    </div>
  );
}
interface PanelBlockProps { title: string; subtitle?: string; icon: React.ElementType; action?: React.ReactNode; children: React.ReactNode; }
function PanelBlock({ title, subtitle, icon: Icon, action, children }: PanelBlockProps) {
  return (
    <div className="bg-card border border-border shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">{title}</span>
          {subtitle && <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider hidden sm:inline">· {subtitle}</span>}
        </div>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
`;

// ──────────────────────────────────────────────────────────────────────────────
// 2. andaimes/[id]/page.tsx — trocar mock por getScaffoldById, fix dates
// ──────────────────────────────────────────────────────────────────────────────
const andaimeDetail = `import { format } from "date-fns";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ChevronRight,
  ClipboardCheck,
  Construction,
  MapPin,
  Ruler,
  User,
  Weight,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/shared/status-badge";
import { getScaffoldById } from "@/lib/actions/scaffold-actions";

const TYPE_LABELS: Record<string, string> = {
  tubular: "Tubular", fachadeiro: "Fachadeiro", multidirecional: "Multidirecional",
  suspenso: "Suspenso", torre: "Torre",
};

type Props = { params: Promise<{ id: string }> };

export default async function AndaimeDetailPage({ params }: Props) {
  const { id } = await params;
  const scaffold = await getScaffoldById(id);
  if (!scaffold) notFound();

  const inspections = scaffold.inspections;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-2">
        <Link href="/andaimes" className="w-7 h-7 flex items-center justify-center hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          <Link href="/andaimes" className="hover:text-foreground">Andaimes</Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{scaffold.code}</span>
        </p>
      </div>

      <div className="bg-primary border-l-4 border-l-sidebar-primary px-5 py-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-primary-foreground/40 mb-1">Ficha Técnica do Ativo</p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-primary-foreground font-mono tracking-widest">{scaffold.code}</h1>
              <StatusBadge status={scaffold.status} size="lg" />
            </div>
            <p className="text-[11px] text-primary-foreground/50 mt-1">{scaffold.location}</p>
          </div>
          <Link
            href={"/inspecoes/nova?scaffold_id=" + scaffold.id + "&scaffold_code=" + scaffold.code}
            className="inline-flex items-center gap-2 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white text-[10px] font-bold uppercase tracking-widest h-9 px-4 shrink-0"
          >
            <ClipboardCheck className="w-4 h-4" />
            Iniciar Inspeção
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <TechCard title="Dados do Andaime" icon={Construction}>
          <TechRow icon={Construction} label="Tipo de Andaime" value={TYPE_LABELS[scaffold.type] ?? scaffold.type} />
          <TechRow icon={MapPin} label="Localização" value={scaffold.location} />
          {scaffold.area && <TechRow icon={Building2} label="Área / Setor" value={scaffold.area} />}
          <TechRow icon={Ruler} label="Altura" value={scaffold.height + " m"} />
          {scaffold.max_load && <TechRow icon={Weight} label="Carga Máxima" value={scaffold.max_load + " kg"} />}
        </TechCard>

        <TechCard title="Responsabilidade Técnica" icon={User}>
          {scaffold.responsible && <TechRow icon={User} label="Responsável Técnico" value={scaffold.responsible} />}
          {scaffold.validity_date && (
            <TechRow icon={Calendar} label="Data de Validade" value={format(scaffold.validity_date, "dd/MM/yyyy")} />
          )}
          {scaffold.notes && (
            <div className="px-4 py-3 border-t border-border bg-muted/20">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Observações</p>
              <p className="text-[11px] text-foreground leading-relaxed">{scaffold.notes}</p>
            </div>
          )}
        </TechCard>
      </div>

      <TechCard title="Histórico de Inspeções" icon={ClipboardCheck}
        extra={<span className="text-[9px] text-muted-foreground font-mono">{inspections.length} registro(s)</span>}
      >
        {inspections.length === 0 ? (
          <div className="text-center py-10">
            <ClipboardCheck className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
            <p className="text-[11px] text-muted-foreground">Nenhuma inspeção registrada para este andaime</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            <div className="grid grid-cols-3 px-4 py-2 bg-muted/40">
              {["Inspetor", "Data", "Resultado"].map((h) => (
                <p key={h} className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{h}</p>
              ))}
            </div>
            {inspections.map((insp) => (
              <Link key={insp.id} href={"/inspecoes/" + insp.id} className="grid grid-cols-3 items-center px-4 py-3 hover:bg-muted/30 transition-colors group">
                <p className="text-[11px] font-semibold text-foreground truncate">{insp.inspector_name}</p>
                <p className="text-[11px] text-muted-foreground">{format(insp.date, "dd/MM/yyyy")}</p>
                <div className="flex items-center justify-between">
                  <StatusBadge status={insp.result} />
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </TechCard>
    </div>
  );
}

interface TechCardProps { title: string; icon: React.ElementType; extra?: React.ReactNode; children: React.ReactNode; }
function TechCard({ title, icon: Icon, extra, children }: TechCardProps) {
  return (
    <div className="bg-card border border-border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b-2 border-border">
        <div className="flex items-center gap-2"><Icon className="w-3.5 h-3.5 text-muted-foreground/60" /><p className="text-[10px] font-bold uppercase tracking-widest text-foreground">{title}</p></div>
        {extra}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}
interface TechRowProps { icon: React.ElementType; label: string; value: string; }
function TechRow({ icon: Icon, label, value }: TechRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
      <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">{label}</p>
        <p className="text-[11px] font-semibold text-foreground text-right truncate">{value}</p>
      </div>
    </div>
  );
}
`;

// ──────────────────────────────────────────────────────────────────────────────
// 3. inspecoes/[id]/page.tsx — trocar mock por getInspectionById, fix dates
// ──────────────────────────────────────────────────────────────────────────────
const inspecaoDetail = `import { addDays, format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Construction,
  MinusCircle,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { getInspectionById } from "@/lib/actions/inspection-actions";
import { ChecklistValue } from "@prisma/client";

interface Props { params: Promise<{ id: string }> }

function valueToStatus(v: ChecklistValue): "conforme" | "nao_conforme" | "nao_aplicavel" {
  if (v === "CL_OK") return "conforme";
  if (v === "CL_FAIL" || v === "CL_WARN") return "nao_conforme";
  return "nao_aplicavel";
}

const ITEM_ICONS = {
  conforme:      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
  nao_conforme:  <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />,
  nao_aplicavel: <MinusCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
};
const ITEM_LABELS = { conforme: "Conforme", nao_conforme: "Não Conforme", nao_aplicavel: "N/A" };
const ITEM_ROW = { conforme: "bg-card", nao_conforme: "bg-red-50/60", nao_aplicavel: "bg-card" };

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground w-28 shrink-0 pt-0.5">{label}</p>
      <div className="text-[12px] text-foreground font-medium">{value}</div>
    </div>
  );
}

export default async function InspectionDetailPage({ params }: Props) {
  const { id } = await params;
  const inspection = await getInspectionById(id);
  if (!inspection) notFound();

  const scaffold = inspection.scaffold;
  const checklist = inspection.checklist;

  const totalItems = checklist.length;
  const conformes    = checklist.filter((i) => valueToStatus(i.value) === "conforme").length;
  const naoConformes = checklist.filter((i) => valueToStatus(i.value) === "nao_conforme").length;
  const naAplicavel  = checklist.filter((i) => valueToStatus(i.value) === "nao_aplicavel").length;
  const pct = totalItems - naAplicavel > 0 ? Math.round((conformes / (totalItems - naAplicavel)) * 100) : 0;

  const validadeDate =
    inspection.result !== "reprovado" && inspection.validity_days > 0
      ? format(addDays(inspection.date, inspection.validity_days), "dd/MM/yyyy")
      : null;

  const docNum = "AND-" + inspection.scaffold_code + "-" + format(inspection.date, "yyyyMMdd");

  const grouped: Record<string, typeof checklist> = {};
  checklist.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-2">
        <Link href="/inspecoes" className="w-7 h-7 flex items-center justify-center hover:bg-muted/50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </Link>
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
          <Link href="/inspecoes" className="hover:text-foreground">Inspeções</Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground font-semibold font-mono">{docNum}</span>
        </div>
      </div>

      <div className="bg-primary overflow-hidden shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-[9px] font-semibold tracking-widest uppercase text-primary-foreground/40 mb-1">Relatório Técnico de Inspeção · AndCheck EHS</p>
            <h2 className="text-[22px] font-bold text-primary-foreground tracking-tight font-mono">{docNum}</h2>
            <p className="text-[11px] text-primary-foreground/60 mt-0.5">NR-18 · NR-35 · ABNT NBR 6494</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={inspection.result} size="lg" />
            {validadeDate && (
              <p className="text-[10px] text-primary-foreground/60">
                Válido até <span className="font-bold font-mono text-primary-foreground">{validadeDate}</span>
              </p>
            )}
          </div>
        </div>
        <div className="px-5 pb-4 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-primary-foreground/10 overflow-hidden">
            <div className={"h-full transition-all " + (pct >= 80 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : "bg-red-400")} style={{ width: pct + "%" }} />
          </div>
          <p className="text-[11px] font-bold text-primary-foreground/80 shrink-0">{pct}% conformes</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Conformes",     value: conformes,    color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Não Conformes", value: naoConformes, color: "text-red-600",     bg: "bg-red-50 border-red-200" },
          { label: "N/A",           value: naAplicavel,  color: "text-slate-500",   bg: "bg-muted/40 border-border" },
        ].map((s) => (
          <div key={s.label} className={"border p-3 text-center " + s.bg}>
            <p className={"text-[22px] font-bold font-mono " + s.color}>{s.value}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border shadow-sm p-5">
        <h3 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2 mb-2">Dados da Inspeção</h3>
        <InfoRow label="Andaime" value={
          <span className="font-mono font-bold">{inspection.scaffold_code}
            {scaffold && <span className="text-muted-foreground font-normal ml-2">— {scaffold.location}</span>}
          </span>
        } />
        <InfoRow label="Data" value={<span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-muted-foreground/40" />{format(inspection.date, "dd/MM/yyyy")}</span>} />
        <InfoRow label="Inspetor" value={<span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-muted-foreground/40" />{inspection.inspector_name}</span>} />
        <InfoRow label="Resultado" value={<StatusBadge status={inspection.result} />} />
        <InfoRow label="Validade" value={
          validadeDate
            ? <span className="font-mono font-bold">{inspection.validity_days} dias — até {validadeDate}</span>
            : <span className="text-muted-foreground">—</span>
        } />
        {inspection.notes && <InfoRow label="Observações" value={<span className="text-[12px] text-muted-foreground leading-relaxed">{inspection.notes}</span>} />}
        {scaffold && (
          <>
            <InfoRow label="Tipo" value={scaffold.code} />
            <InfoRow label="Localização" value={
              <Link href={"/andaimes/" + scaffold.id} className="flex items-center gap-1.5 hover:text-primary">
                <Construction className="w-3.5 h-3.5 text-muted-foreground/40" />{scaffold.location} — {scaffold.area}
              </Link>
            } />
          </>
        )}
      </div>

      <div className="bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b-2 border-border bg-muted/30">
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">Checklist de Conformidade</p>
        </div>
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <div className="px-4 py-2 bg-primary/5 border-b border-border">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{category}</p>
            </div>
            {items.map((item) => {
              const st = valueToStatus(item.value);
              return (
                <div key={item.id} className={"flex items-start gap-3 px-4 py-3 border-b border-border/50 " + ITEM_ROW[st]}>
                  {ITEM_ICONS[st]}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={"text-[12px] font-medium " + (st === "nao_conforme" ? "text-red-700" : "text-foreground")}>{item.item_label}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.critical && <Badge variant="destructive" className="text-[8px] px-1.5 py-0 h-4">Crítico</Badge>}
                        <span className={"text-[9px] font-bold uppercase " + (st === "conforme" ? "text-emerald-600" : st === "nao_conforme" ? "text-red-600" : "text-slate-400")}>
                          {ITEM_LABELS[st]}
                        </span>
                      </div>
                    </div>
                    {item.observation && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{item.observation}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Link href="/inspecoes" className="flex items-center gap-1.5 h-8 px-4 border border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </Link>
        <Link href={"/andaimes/" + inspection.scaffold_id} className="flex items-center gap-1.5 h-8 px-4 border border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted transition-colors">
          <Construction className="w-3.5 h-3.5" /> Ver Andaime
        </Link>
      </div>
    </div>
  );
}
`;

// ──────────────────────────────────────────────────────────────────────────────
// 4. andaimes/page.tsx — thin server wrapper
// ──────────────────────────────────────────────────────────────────────────────
const andaimesPage = `import { getScaffolds } from "@/lib/actions/scaffold-actions";
import { AndaimesClient } from "./andaimes-client";

export default async function AndaimesPage() {
  const raw = await getScaffolds();
  const scaffolds = raw.map((s) => ({
    id: s.id,
    code: s.code,
    type: s.type as string,
    status: s.status as string,
    location: s.location,
    area: s.area,
    height: s.height,
    responsible: s.responsible,
    validity_date: s.validity_date ? s.validity_date.toISOString() : null,
    _count: s._count,
  }));
  return <AndaimesClient initialData={scaffolds} />;
}
`;

// ──────────────────────────────────────────────────────────────────────────────
// 5. andaimes/andaimes-client.tsx
// ──────────────────────────────────────────────────────────────────────────────
const andaimesClient = `"use client";

import { format, parseISO } from "date-fns";
import { ChevronRight, Construction, Filter, MapPin, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TYPE_LABELS: Record<string, string> = {
  tubular: "Tubular", fachadeiro: "Fachadeiro", multidirecional: "Multidirecional",
  suspenso: "Suspenso", torre: "Torre",
};

export type ScaffoldRow = {
  id: string; code: string; type: string; status: string;
  location: string; area: string; height: number; responsible: string;
  validity_date: string | null; _count: { inspections: number };
};

export function AndaimesClient({ initialData }: { initialData: ScaffoldRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const scaffolds = initialData;
  const filtered = scaffolds.filter((s) => {
    const matchSearch = !search ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.location.toLowerCase().includes(search.toLowerCase()) ||
      s.area.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-border">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">AndCheck EHS · Gestão de Ativos</p>
          <h1 className="text-[18px] font-bold text-foreground tracking-tight uppercase">Registro de Andaimes</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">{scaffolds.length} unidades cadastradas</p>
        </div>
        <Link href="/andaimes/novo" className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold uppercase tracking-widest h-8 px-4 shrink-0">
          <Plus className="w-3.5 h-3.5" />Cadastrar Andaime
        </Link>
      </div>

      <div className="bg-card border border-border shadow-sm p-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <Input placeholder="Buscar por TAG, localização ou área..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-[11px] rounded-none border-border" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 h-8 text-[11px] rounded-none">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/50" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="liberado">Liberado</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="reprovado">Reprovado</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="em_montagem">Em Montagem</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length !== scaffolds.length && (
        <p className="text-[9px] text-muted-foreground uppercase tracking-widest">{filtered.length} resultado(s) filtrado(s)</p>
      )}

      {filtered.length === 0 ? (
        <div className="bg-card border border-border p-14 text-center">
          <Construction className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Nenhum andaime encontrado</p>
          <p className="text-[10px] text-muted-foreground/60 mb-4">Cadastre o primeiro ativo para iniciar o controle</p>
          <Link href="/andaimes/novo" className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-[10px] uppercase tracking-widest px-3 h-8">
            <Plus className="w-3.5 h-3.5" />Cadastrar
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border shadow-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2.5 bg-primary border-b border-border">
            {["TAG / Código", "Tipo", "Localização", "Validade", "Status", ""].map((h, i) => (
              <p key={i} className={"text-[9px] font-bold uppercase tracking-widest text-primary-foreground/60 " +
                (i === 0 ? "col-span-2" : i === 1 ? "col-span-2" : i === 2 ? "col-span-3" : i === 3 ? "col-span-2" : i === 4 ? "col-span-2" : "col-span-1")}>{h}</p>
            ))}
          </div>
          <div className="divide-y divide-border">
            {filtered.map((scaffold, idx) => (
              <Link key={scaffold.id} href={"/andaimes/" + scaffold.id}
                className={"flex md:grid md:grid-cols-12 md:gap-4 items-center px-4 py-3 hover:bg-primary/5 transition-colors group " + (idx % 2 === 1 ? "bg-muted/20" : "bg-card")}
              >
                <div className="flex items-center gap-3 flex-1 md:contents">
                  <div className="w-7 h-7 bg-primary/8 flex items-center justify-center shrink-0 md:hidden"><Construction className="w-3.5 h-3.5 text-primary/40" /></div>
                  <div className="flex-1 md:contents">
                    <p className="md:col-span-2 font-bold text-[12px] font-mono text-foreground">{scaffold.code}</p>
                    <p className="md:col-span-2 text-[11px] text-muted-foreground">{TYPE_LABELS[scaffold.type] ?? scaffold.type}{scaffold.height && <span className="text-muted-foreground/40 ml-1">· {scaffold.height}m</span>}</p>
                    <div className="md:col-span-3 flex items-center gap-1"><MapPin className="w-3 h-3 text-muted-foreground/30 shrink-0 hidden md:block" /><p className="text-[11px] text-muted-foreground truncate">{scaffold.location}</p></div>
                    <p className="hidden md:block md:col-span-2 text-[11px] text-muted-foreground font-mono">{scaffold.validity_date ? format(parseISO(scaffold.validity_date), "dd/MM/yyyy") : "—"}</p>
                    <div className="hidden md:flex md:col-span-2 items-center"><StatusBadge status={scaffold.status} /></div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="md:hidden"><StatusBadge status={scaffold.status} /></div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="px-4 py-2 bg-muted/30 border-t border-border">
            <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">{filtered.length} registro(s) · Documento Controlado · AndCheck EHS</p>
          </div>
        </div>
      )}
    </div>
  );
}
`;

// ──────────────────────────────────────────────────────────────────────────────
// 6. inspecoes/page.tsx — thin server wrapper
// ──────────────────────────────────────────────────────────────────────────────
const inspecoesPage = `import { getInspections } from "@/lib/actions/inspection-actions";
import { InspecoesClient } from "./inspecoes-client";

export default async function InspecoesPage() {
  const raw = await getInspections();
  const inspections = raw.map((i) => ({
    id: i.id,
    scaffold_id: i.scaffold_id,
    scaffold_code: i.scaffold_code,
    date: i.date.toISOString(),
    inspector_name: i.inspector_name,
    result: i.result as string,
    validity_days: i.validity_days,
    notes: i.notes,
  }));
  return <InspecoesClient initialData={inspections} />;
}
`;

// ──────────────────────────────────────────────────────────────────────────────
// 7. inspecoes/inspecoes-client.tsx
// ──────────────────────────────────────────────────────────────────────────────
const inspecoesClient = `"use client";

import { format, parseISO } from "date-fns";
import { Calendar, ChevronRight, ClipboardCheck, Filter, Plus, Search, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type InspectionRow = {
  id: string; scaffold_id: string; scaffold_code: string; date: string;
  inspector_name: string; result: string; validity_days: number; notes: string | null;
};

export function InspecoesClient({ initialData }: { initialData: InspectionRow[] }) {
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("all");

  const inspections = initialData;
  const filtered = inspections.filter((i) => {
    const matchSearch = !search ||
      i.scaffold_code.toLowerCase().includes(search.toLowerCase()) ||
      i.inspector_name.toLowerCase().includes(search.toLowerCase());
    const matchResult = resultFilter === "all" || i.result === resultFilter;
    return matchSearch && matchResult;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-border">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">AndCheck EHS · Registros Técnicos</p>
          <h1 className="text-[18px] font-bold text-foreground tracking-tight uppercase">Histórico de Inspeções</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">{inspections.length} registros no sistema</p>
        </div>
        <Link href="/inspecoes/nova" className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold uppercase tracking-widest h-8 px-4 shrink-0">
          <Plus className="w-3.5 h-3.5" />Nova Inspeção
        </Link>
      </div>

      <div className="bg-card border border-border shadow-sm p-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <Input placeholder="Buscar por andaime (TAG) ou inspetor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-[11px] rounded-none border-border" />
        </div>
        <Select value={resultFilter} onValueChange={setResultFilter}>
          <SelectTrigger className="w-full sm:w-48 h-8 text-[11px] rounded-none">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/50" />
            <SelectValue placeholder="Resultado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Resultados</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="aprovado_com_ressalvas">Com Ressalvas</SelectItem>
            <SelectItem value="reprovado">Reprovado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length !== inspections.length && (
        <p className="text-[9px] text-muted-foreground uppercase tracking-widest">{filtered.length} resultado(s) filtrado(s)</p>
      )}

      {filtered.length === 0 ? (
        <div className="bg-card border border-border p-14 text-center">
          <ClipboardCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Nenhuma inspeção encontrada</p>
          <p className="text-[10px] text-muted-foreground/60 mb-4">Registre a primeira vistoria para iniciar o histórico</p>
          <Link href="/inspecoes/nova" className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-[10px] uppercase tracking-widest px-3 h-8">
            <Plus className="w-3.5 h-3.5" />Nova Inspeção
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border shadow-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2.5 bg-primary border-b border-border">
            {["Nº Doc.", "Andaime", "Data", "Inspetor", "Validade", "Resultado", ""].map((h, i) => (
              <p key={i} className={"text-[9px] font-bold uppercase tracking-widest text-primary-foreground/60 " +
                (i === 0 ? "col-span-2" : i === 1 ? "col-span-2" : i === 2 ? "col-span-2" : i === 3 ? "col-span-2" : i === 4 ? "col-span-1" : i === 5 ? "col-span-2" : "col-span-1")}>{h}</p>
            ))}
          </div>
          <div className="divide-y divide-border">
            {filtered.map((insp, idx) => {
              const docNum = "AND-" + insp.scaffold_code + "-" + insp.date.substring(0, 10).replace(/-/g, "");
              return (
                <Link key={insp.id} href={"/inspecoes/" + insp.id}
                  className={"flex md:grid md:grid-cols-12 md:gap-4 items-center px-4 py-3 hover:bg-primary/5 transition-colors group " + (idx % 2 === 1 ? "bg-muted/20" : "bg-card")}
                >
                  <div className="flex items-center gap-3 flex-1 md:contents">
                    <div className="w-7 h-7 bg-primary/8 flex items-center justify-center shrink-0 md:hidden"><ClipboardCheck className="w-3.5 h-3.5 text-primary/40" /></div>
                    <div className="flex-1 md:contents">
                      <p className="md:col-span-2 font-bold text-[12px] font-mono text-foreground">{docNum}</p>
                      <p className="md:col-span-2 font-mono text-[11px] text-foreground hidden md:block">{insp.scaffold_code}</p>
                      <div className="md:col-span-2 hidden md:flex items-center gap-1"><Calendar className="w-3 h-3 text-muted-foreground/30 shrink-0" /><p className="text-[11px] text-muted-foreground">{format(parseISO(insp.date), "dd/MM/yyyy")}</p></div>
                      <div className="md:col-span-2 hidden md:flex items-center gap-1"><User className="w-3 h-3 text-muted-foreground/30 shrink-0" /><p className="text-[11px] text-muted-foreground truncate">{insp.inspector_name}</p></div>
                      <p className="hidden md:block md:col-span-1 text-[11px] text-muted-foreground font-mono">{insp.validity_days > 0 ? insp.validity_days + "d" : "—"}</p>
                      <div className="hidden md:flex md:col-span-2 items-center"><StatusBadge status={insp.result} /></div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="md:hidden"><StatusBadge status={insp.result} /></div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="px-4 py-2 bg-muted/30 border-t border-border">
            <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">{filtered.length} registro(s) · Documento Controlado · AndCheck EHS</p>
          </div>
        </div>
      )}
    </div>
  );
}
`;

// ──────────────────────────────────────────────────────────────────────────────
// 8. mapa/page.tsx — trocar mock por action, fix dates
// ──────────────────────────────────────────────────────────────────────────────
const mapaFix = fs
  .readFileSync("src/app/(dashboard)/mapa/page.tsx", "utf8")
  .replace(
    `import { MOCK_SCAFFOLDS } from "@/lib/mock-data";`,
    `import { getScaffolds } from "@/lib/actions/scaffold-actions";`,
  )
  .replace(
    `export default function MapaPage() {
  const scaffolds = MOCK_SCAFFOLDS.map`,
    `export default async function MapaPage() {
  const raw = await getScaffolds();
  const scaffolds = raw.map`,
  )
  .replace(`isPast(parseISO(s.validity_date))`, `isPast(s.validity_date)`)
  .replace(/import \{([^}]*?parseISO[^}]*?)\} from "date-fns"/, (m) =>
    m
      .replace(", parseISO", "")
      .replace("parseISO, ", "")
      .replace("parseISO", ""),
  );

// ──────────────────────────────────────────────────────────────────────────────
// 9. relatorios/page.tsx — trocar mock por actions, fix dates
// ──────────────────────────────────────────────────────────────────────────────
const relatoriosFix = fs
  .readFileSync("src/app/(dashboard)/relatorios/page.tsx", "utf8")
  .replace(
    `import { MOCK_INSPECTIONS, MOCK_SCAFFOLDS } from "@/lib/mock-data";`,
    `import { getInspections } from "@/lib/actions/inspection-actions";\nimport { getScaffolds } from "@/lib/actions/scaffold-actions";`,
  )
  .replace(
    `export default function RelatoriosPage() {
  const inspections = MOCK_INSPECTIONS;
  const scaffolds   = MOCK_SCAFFOLDS;`,
    `export default async function RelatoriosPage() {
  const [inspections, scaffolds] = await Promise.all([getInspections(), getScaffolds()]);`,
  )
  .replace(
    `format(parseISO(insp.date), "dd/MM/yyyy")`,
    `format(insp.date, "dd/MM/yyyy")`,
  )
  .replace(`insp.date.replace(/-/g, "")`, `format(insp.date, "yyyyMMdd")`)
  .replace(
    /^import \{ format, parseISO \} from "date-fns";/m,
    `import { format } from "date-fns";`,
  );

// ──────────────────────────────────────────────────────────────────────────────
// escrever todos os arquivos
// ──────────────────────────────────────────────────────────────────────────────
const writes = [
  ["src/app/(dashboard)/dashboard/page.tsx", dashboard],
  ["src/app/(dashboard)/andaimes/[id]/page.tsx", andaimeDetail],
  ["src/app/(dashboard)/inspecoes/[id]/page.tsx", inspecaoDetail],
  ["src/app/(dashboard)/andaimes/page.tsx", andaimesPage],
  ["src/app/(dashboard)/andaimes/andaimes-client.tsx", andaimesClient],
  ["src/app/(dashboard)/inspecoes/page.tsx", inspecoesPage],
  ["src/app/(dashboard)/inspecoes/inspecoes-client.tsx", inspecoesClient],
  ["src/app/(dashboard)/mapa/page.tsx", mapaFix],
  ["src/app/(dashboard)/relatorios/page.tsx", relatoriosFix],
];

for (const [p, content] of writes) {
  fs.writeFileSync(p, content, "utf8");
  const size = fs.statSync(p).size;
  console.log(`${p} → ${size} bytes`);
}
