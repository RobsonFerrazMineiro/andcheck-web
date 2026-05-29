const fs = require("fs");

// ── QR Public Page (/qr/[tag]) ──────────────────────────────────────────────
const qr = `import { format, isPast, parseISO } from "date-fns";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Construction,
  MapPin,
  Shield,
  User,
  Wrench,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MOCK_INSPECTIONS, MOCK_SCAFFOLDS } from "@/lib/mock-data";

interface Props {
  params: Promise<{ tag: string }>;
}

const STATUS_CFG = {
  liberado:    { label: "LIBERADO",     bg: "bg-emerald-500", icon: CheckCircle2, ring: "ring-emerald-300/60" },
  pendente:    { label: "PENDENTE",     bg: "bg-amber-500",   icon: Clock,        ring: "ring-amber-300/60" },
  reprovado:   { label: "REPROVADO",    bg: "bg-red-600",     icon: XCircle,      ring: "ring-red-300/60" },
  vencido:     { label: "VENCIDO",      bg: "bg-red-700",     icon: AlertTriangle,ring: "ring-red-400/60" },
  em_montagem: { label: "EM MONTAGEM",  bg: "bg-blue-600",    icon: Wrench,       ring: "ring-blue-300/60" },
};

const TYPE_LABELS: Record<string, string> = {
  tubular: "Tubular", fachadeiro: "Fachadeiro", multidirecional: "Multidirecional",
  suspenso: "Suspenso", torre: "Torre",
};

const RESULT_STYLE: Record<string, { label: string; color: string }> = {
  aprovado: { label: "Aprovado", color: "text-emerald-600" },
  aprovado_com_ressalvas: { label: "Aprovado c/ Ressalvas", color: "text-amber-600" },
  reprovado: { label: "Reprovado", color: "text-red-600" },
};

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/10 last:border-0">
      <Icon className="w-4 h-4 text-white/40 mt-0.5 shrink-0" />
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-0.5">{label}</p>
        <p className="text-[13px] text-white font-medium">{value}</p>
      </div>
    </div>
  );
}

export default async function QRPage({ params }: Props) {
  const { tag } = await params;

  // tag pode ser o ID do andaime ou o código (ex: AND-001)
  const scaffold = MOCK_SCAFFOLDS.find((s) => s.id === tag || s.code === tag);
  if (!scaffold) notFound();

  // Verificar se validade venceu
  const effectiveStatus =
    scaffold.status === "liberado" &&
    scaffold.validity_date &&
    isPast(parseISO(scaffold.validity_date))
      ? "vencido"
      : scaffold.status;

  const cfg = STATUS_CFG[effectiveStatus as keyof typeof STATUS_CFG] ?? STATUS_CFG.pendente;
  const StatusIcon = cfg.icon;

  const lastInspection = MOCK_INSPECTIONS
    .filter((i) => i.scaffold_id === scaffold.id)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  const validadeFormatted = scaffold.validity_date
    ? format(parseISO(scaffold.validity_date), "dd/MM/yyyy")
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "hsl(215,46%,9%)" }}>
      <div className="w-full max-w-sm space-y-4">
        {/* Status Card */}
        <div className={"rounded-2xl overflow-hidden shadow-2xl ring-4 " + cfg.ring} style={{ background: "hsl(215,46%,13%)" }}>
          {/* Status banner */}
          <div className={"p-6 flex flex-col items-center gap-3 " + cfg.bg}>
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <StatusIcon className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Status de Segurança</p>
              <p className="text-[28px] font-black text-white tracking-tight leading-none">{cfg.label}</p>
            </div>
          </div>

          {/* Andaime Info */}
          <div className="p-5 space-y-0">
            <div className="flex items-center gap-3 pb-4 mb-2 border-b border-white/10">
              <div className="w-10 h-10 rounded bg-white/8 flex items-center justify-center shrink-0">
                <Construction className="w-5 h-5 text-white/40" />
              </div>
              <div>
                <p className="text-[22px] font-black font-mono text-white leading-none">{scaffold.code}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{TYPE_LABELS[scaffold.type] ?? scaffold.type} · {scaffold.height}m</p>
              </div>
            </div>
            <InfoRow icon={MapPin} label="Localização" value={scaffold.location} />
            <InfoRow icon={Building2} label="Área" value={scaffold.area} />
            <InfoRow icon={User} label="Responsável" value={scaffold.responsible} />
            {validadeFormatted && (
              <InfoRow icon={Calendar} label="Válido até" value={validadeFormatted} />
            )}
            {scaffold.max_load && (
              <InfoRow icon={Shield} label="Carga Máxima" value={scaffold.max_load + " kg"} />
            )}
          </div>
        </div>

        {/* Última inspeção */}
        {lastInspection && (
          <div className="rounded-xl p-4" style={{ background: "hsl(215,46%,13%)" }}>
            <div className="flex items-center gap-2 mb-3">
              <ClipboardCheck className="w-3.5 h-3.5 text-white/40" />
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">Última Inspeção</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] text-white font-medium">{lastInspection.inspector_name}</p>
                <p className="text-[11px] text-white/40 font-mono">
                  {format(parseISO(lastInspection.date), "dd/MM/yyyy")}
                </p>
              </div>
              <span className={"text-[11px] font-bold uppercase " + (RESULT_STYLE[lastInspection.result]?.color ?? "text-white/60")}>
                {RESULT_STYLE[lastInspection.result]?.label ?? lastInspection.result}
              </span>
            </div>
          </div>
        )}

        {/* CTA */}
        <Link
          href={"/inspecoes/nova"}
          className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
        >
          <ClipboardCheck className="w-4 h-4" />
          Realizar Nova Inspeção
        </Link>

        {/* Rodapé */}
        <div className="text-center">
          <p className="text-[9px] text-white/20 uppercase tracking-widest">
            AndCheck EHS · NR-18 / NR-35 / NBR 6494
          </p>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync("src/app/qr/[tag]/page.tsx", qr, "utf8");
console.log(
  "qr/[tag]/page.tsx ok",
  fs.statSync("src/app/qr/[tag]/page.tsx").size,
);

// ── Mapa Page (/mapa) ────────────────────────────────────────────────────────
const mapa = `import { format, isPast, parseISO } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Construction,
  MapPin,
  QrCode,
  Wrench,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { MOCK_SCAFFOLDS } from "@/lib/mock-data";

const AREA_COORDS: Record<string, { x: number; y: number }> = {
  "Bloco Industrial 01": { x: 18, y: 22 },
  "Bloco Industrial 02": { x: 42, y: 22 },
  "Utilidades":          { x: 72, y: 35 },
  "Manutencao":          { x: 28, y: 60 },
  "Logistica":           { x: 60, y: 65 },
  "Processo":            { x: 80, y: 22 },
};

const STATUS_DOT: Record<string, string> = {
  liberado:    "bg-emerald-500",
  pendente:    "bg-amber-400",
  reprovado:   "bg-red-500",
  vencido:     "bg-red-700",
  em_montagem: "bg-blue-500",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  liberado:    CheckCircle2,
  pendente:    Clock,
  reprovado:   XCircle,
  vencido:     AlertTriangle,
  em_montagem: Wrench,
};

export default function MapaPage() {
  const scaffolds = MOCK_SCAFFOLDS.map((s) => ({
    ...s,
    effectiveStatus:
      s.status === "liberado" && s.validity_date && isPast(parseISO(s.validity_date))
        ? ("vencido" as const)
        : s.status,
  }));

  const liberados    = scaffolds.filter((s) => s.effectiveStatus === "liberado").length;
  const pendentes    = scaffolds.filter((s) => ["pendente", "em_montagem"].includes(s.effectiveStatus)).length;
  const reprovados   = scaffolds.filter((s) => s.effectiveStatus === "reprovado").length;
  const vencidos     = scaffolds.filter((s) => s.effectiveStatus === "vencido").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-border">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            AndCheck EHS · Visualização Espacial
          </p>
          <h1 className="text-[18px] font-bold text-foreground tracking-tight uppercase">
            Mapa Operacional
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {scaffolds.length} andaimes distribuídos na planta
          </p>
        </div>
        <Link
          href="/andaimes/novo"
          className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold uppercase tracking-widest h-8 px-4 shrink-0"
        >
          <Construction className="w-3.5 h-3.5" />
          Novo Andaime
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Liberados",  value: liberados,  color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Pendentes",  value: pendentes,  color: "text-amber-600",   bg: "bg-amber-50 border-amber-200" },
          { label: "Reprovados", value: reprovados, color: "text-red-600",     bg: "bg-red-50 border-red-200" },
          { label: "Vencidos",   value: vencidos,   color: "text-red-700",     bg: "bg-red-50/60 border-red-300" },
        ].map((k) => (
          <div key={k.label} className={"border p-3 text-center " + k.bg}>
            <p className={"text-[26px] font-black font-mono " + k.color}>{k.value}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Mapa esquemático */}
      <div className="bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            Planta Industrial — Vista Superior (Esquemático)
          </p>
          <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">
            Posições ilustrativas · Não georreferenciado
          </p>
        </div>
        <div className="relative w-full bg-muted/30 overflow-hidden" style={{ paddingBottom: "55%" }}>
          {/* Grid de fundo */}
          <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Zonas da planta */}
          {[
            { label: "BLOCO IND. 01", x: 5, y: 10, w: 28, h: 25, color: "border-blue-300/30 bg-blue-50/20" },
            { label: "BLOCO IND. 02", x: 35, y: 10, w: 24, h: 25, color: "border-blue-300/30 bg-blue-50/20" },
            { label: "PROCESSO",     x: 66, y: 10, w: 22, h: 25, color: "border-violet-300/30 bg-violet-50/20" },
            { label: "UTILIDADES",   x: 62, y: 38, w: 20, h: 20, color: "border-slate-300/30 bg-slate-50/20" },
            { label: "MANUTENÇÃO",   x: 18, y: 50, w: 22, h: 20, color: "border-orange-300/30 bg-orange-50/20" },
            { label: "LOGÍSTICA",    x: 44, y: 52, w: 24, h: 20, color: "border-green-300/30 bg-green-50/20" },
          ].map((z) => (
            <div
              key={z.label}
              className={"absolute border " + z.color}
              style={{ left: z.x + "%", top: z.y + "%", width: z.w + "%", height: z.h + "%" }}
            >
              <p className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-widest p-1.5 leading-none">
                {z.label}
              </p>
            </div>
          ))}

          {/* Pontos dos andaimes */}
          {scaffolds.map((s) => {
            const pos = AREA_COORDS[s.area] ?? { x: 50, y: 50 };
            const StatusIcon = STATUS_ICON[s.effectiveStatus] ?? Clock;
            return (
              <Link
                key={s.id}
                href={"/andaimes/" + s.id}
                title={s.code + " — " + s.location}
                className="absolute -translate-x-1/2 -translate-y-1/2 group z-10"
                style={{ left: pos.x + "%", top: pos.y + "%" }}
              >
                <div className={"w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-white/60 transition-transform group-hover:scale-125 " + STATUS_DOT[s.effectiveStatus]}>
                  <StatusIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                  <div className="bg-popover border border-border shadow-lg px-2 py-1.5 min-w-max">
                    <p className="text-[10px] font-bold font-mono text-foreground">{s.code}</p>
                    <p className="text-[9px] text-muted-foreground">{s.location}</p>
                  </div>
                  <div className="w-2 h-2 bg-popover border-r border-b border-border rotate-45 -mt-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="bg-card border border-border p-4 flex flex-wrap gap-4">
        {Object.entries({
          liberado:    { label: "Liberado",    dot: "bg-emerald-500" },
          pendente:    { label: "Pendente",    dot: "bg-amber-400" },
          reprovado:   { label: "Reprovado",   dot: "bg-red-500" },
          vencido:     { label: "Vencido",     dot: "bg-red-700" },
          em_montagem: { label: "Em Montagem", dot: "bg-blue-500" },
        }).map(([, v]) => (
          <div key={v.label} className="flex items-center gap-2">
            <div className={"w-3 h-3 rounded-full " + v.dot} />
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{v.label}</p>
          </div>
        ))}
      </div>

      {/* Lista tabular */}
      <div className="bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            Todos os Andaimes — Listagem por Área
          </p>
        </div>
        <div className="divide-y divide-border">
          {scaffolds.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
              <div className={"w-2 h-2 rounded-full shrink-0 " + STATUS_DOT[s.effectiveStatus]} />
              <MapPin className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[12px] font-mono text-foreground">{s.code}</p>
                <p className="text-[10px] text-muted-foreground truncate">{s.location} · {s.area}</p>
              </div>
              <StatusBadge status={s.effectiveStatus} />
              <div className="flex gap-1.5 shrink-0">
                <Link href={"/andaimes/" + s.id} className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded transition-colors" title="Detalhe">
                  <Construction className="w-3.5 h-3.5 text-muted-foreground" />
                </Link>
                <Link href={"/qr/" + s.id} className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded transition-colors" title="QR Code">
                  <QrCode className="w-3.5 h-3.5 text-muted-foreground" />
                </Link>
                <Link href={"/inspecoes/nova?scaffold_id=" + s.id} className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded transition-colors" title="Inspecionar">
                  <ClipboardCheck className="w-3.5 h-3.5 text-muted-foreground" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync("src/app/(dashboard)/mapa/page.tsx", mapa, "utf8");
console.log(
  "mapa/page.tsx ok",
  fs.statSync("src/app/(dashboard)/mapa/page.tsx").size,
);

// ── Relatórios Page (/relatorios) ─────────────────────────────────────────────
const relatorios = `import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Construction,
  Download,
  FileBarChart2,
  FileText,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { MOCK_INSPECTIONS, MOCK_SCAFFOLDS } from "@/lib/mock-data";

export default function RelatoriosPage() {
  const inspections = MOCK_INSPECTIONS;
  const scaffolds   = MOCK_SCAFFOLDS;

  const aprovados        = inspections.filter((i) => i.result === "aprovado").length;
  const comRessalvas     = inspections.filter((i) => i.result === "aprovado_com_ressalvas").length;
  const reprovados       = inspections.filter((i) => i.result === "reprovado").length;
  const liberadosAtivos  = scaffolds.filter((s) => s.status === "liberado").length;
  const vencidos         = scaffolds.filter((s) => s.status === "vencido").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-border">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            AndCheck EHS · Documentação Controlada
          </p>
          <h1 className="text-[18px] font-bold text-foreground tracking-tight uppercase">
            Relatórios & Exportações
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {inspections.length} inspeções registradas · Exportação PDF disponível em breve
          </p>
        </div>
      </div>

      {/* Resumo KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Insp. Aprovadas",   value: aprovados,       color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Com Ressalvas",      value: comRessalvas,    color: "text-amber-600",   bg: "bg-amber-50 border-amber-200" },
          { label: "Reprovadas",         value: reprovados,      color: "text-red-600",     bg: "bg-red-50 border-red-200" },
          { label: "Andaimes Liberados", value: liberadosAtivos, color: "text-blue-600",    bg: "bg-blue-50 border-blue-200" },
          { label: "Vencidos",           value: vencidos,        color: "text-red-700",     bg: "bg-red-50/60 border-red-300" },
        ].map((k) => (
          <div key={k.label} className={"border p-3 text-center " + k.bg}>
            <p className={"text-[24px] font-black font-mono " + k.color}>{k.value}</p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground leading-tight mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Cards de tipos de relatório */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: FileBarChart2,
            title: "Relatório Gerencial",
            desc: "Resumo executivo de KPIs, tendências e conformidade global da instalação.",
            badge: "Em breve",
          },
          {
            icon: FileText,
            title: "Relatório por Andaime",
            desc: "Histórico completo por ativo: inspeções, validades, responsáveis e ações.",
            badge: "Em breve",
          },
          {
            icon: AlertTriangle,
            title: "Relatório de Não Conformidades",
            desc: "Listagem de todos os itens reprovados e pendentes de regularização.",
            badge: "Em breve",
          },
        ].map((r) => (
          <div key={r.title} className="bg-card border border-border p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 bg-primary/8 flex items-center justify-center">
                <r.icon className="w-4.5 h-4.5 text-primary/60" />
              </div>
              <span className="text-[8px] font-bold uppercase tracking-widest bg-muted text-muted-foreground px-2 py-0.5">
                {r.badge}
              </span>
            </div>
            <div>
              <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wide">{r.title}</h3>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{r.desc}</p>
            </div>
            <button
              disabled
              className="w-full flex items-center justify-center gap-1.5 h-8 text-[10px] font-bold uppercase tracking-widest border border-border text-muted-foreground/40 cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar PDF
            </button>
          </div>
        ))}
      </div>

      {/* Tabela histórico completo */}
      <div className="bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            Histórico Completo de Inspeções
          </p>
          <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">
            {inspections.length} registros
          </p>
        </div>

        <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2.5 bg-primary">
          {["Nº Doc.", "Andaime", "Data", "Inspetor", "Validade", "Resultado", ""].map((h, i) => (
            <p key={i} className={"text-[9px] font-bold uppercase tracking-widest text-primary-foreground/60 " +
              (i === 0 ? "col-span-2" : i === 1 ? "col-span-2" : i === 2 ? "col-span-2" :
               i === 3 ? "col-span-2" : i === 4 ? "col-span-1" : i === 5 ? "col-span-2" : "col-span-1")}
            >{h}</p>
          ))}
        </div>

        <div className="divide-y divide-border">
          {inspections.map((insp, idx) => {
            const docNum = "AND-" + insp.scaffold_code + "-" + insp.date.replace(/-/g, "");
            const resultIcon = insp.result === "aprovado"
              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              : insp.result === "reprovado"
              ? <XCircle className="w-3.5 h-3.5 text-red-600" />
              : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
            return (
              <div key={insp.id} className={"flex md:grid md:grid-cols-12 md:gap-4 items-center px-4 py-3 " + (idx % 2 === 1 ? "bg-muted/20" : "bg-card")}>
                <p className="md:col-span-2 font-mono text-[10px] font-bold text-foreground truncate">{docNum}</p>
                <p className="md:col-span-2 text-[11px] font-mono font-bold text-foreground hidden md:block">{insp.scaffold_code}</p>
                <p className="md:col-span-2 text-[11px] text-muted-foreground font-mono hidden md:block">
                  {format(parseISO(insp.date), "dd/MM/yyyy")}
                </p>
                <p className="md:col-span-2 text-[11px] text-muted-foreground truncate hidden md:block">{insp.inspector_name}</p>
                <p className="md:col-span-1 text-[11px] text-muted-foreground hidden md:block">
                  {insp.validity_days > 0 ? insp.validity_days + "d" : "—"}
                </p>
                <div className="md:col-span-2 hidden md:flex items-center">
                  <StatusBadge status={insp.result} />
                </div>
                <div className="md:col-span-1 flex items-center gap-2 ml-auto md:ml-0">
                  {resultIcon}
                  <Link
                    href={"/inspecoes/" + insp.id}
                    className="text-[9px] font-bold uppercase tracking-widest text-primary hover:underline"
                  >
                    Ver
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-2.5 bg-muted/30 border-t border-border">
          <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">
            {inspections.length} registro(s) · Documento Controlado · AndCheck EHS · NR-18 / NR-35 / NBR 6494
          </p>
        </div>
      </div>

      {/* Atalhos */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/inspecoes/nova"
          className="flex items-center gap-3 bg-card border border-border p-4 hover:bg-muted/30 transition-colors group"
        >
          <ClipboardCheck className="w-5 h-5 text-primary/40 group-hover:text-primary/60 transition-colors" />
          <div>
            <p className="text-[11px] font-bold text-foreground uppercase tracking-wide">Nova Inspeção</p>
            <p className="text-[10px] text-muted-foreground">Registrar vistoria agora</p>
          </div>
        </Link>
        <Link
          href="/andaimes"
          className="flex items-center gap-3 bg-card border border-border p-4 hover:bg-muted/30 transition-colors group"
        >
          <Construction className="w-5 h-5 text-primary/40 group-hover:text-primary/60 transition-colors" />
          <div>
            <p className="text-[11px] font-bold text-foreground uppercase tracking-wide">Gestão de Andaimes</p>
            <p className="text-[10px] text-muted-foreground">Ver todos os ativos</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
`;

fs.writeFileSync("src/app/(dashboard)/relatorios/page.tsx", relatorios, "utf8");
console.log(
  "relatorios/page.tsx ok",
  fs.statSync("src/app/(dashboard)/relatorios/page.tsx").size,
);
