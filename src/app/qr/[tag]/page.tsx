import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  MapPin,
  ShieldCheck,
  User,
  Wrench,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getScaffoldByTag } from "@/lib/actions/scaffold-actions";

interface Props {
  params: Promise<{ tag: string }>;
}

const STATUS_CFG = {
  liberado: {
    label: "LIBERADO",
    msg: "Andaime liberado para uso. Verifique a validade antes de utilizar.",
    bg: "bg-emerald-500",
    iconBg: "bg-emerald-400/25",
    iconRing: "ring-emerald-300/50",
    ring: "ring-emerald-500/50",
    icon: CheckCircle2,
  },
  pendente_liberacao: {
    label: "PEND. LIBERAÇÃO",
    msg: "Montagem concluída. Aguardando inspeção de liberação. Uso não autorizado.",
    bg: "bg-amber-500",
    iconBg: "bg-amber-400/25",
    iconRing: "ring-amber-300/50",
    ring: "ring-amber-500/50",
    icon: Clock,
  },
  em_montagem: {
    label: "EM MONTAGEM",
    msg: "Andaime em montagem. Uso não autorizado.",
    bg: "bg-sky-600",
    iconBg: "bg-sky-400/25",
    iconRing: "ring-sky-300/50",
    ring: "ring-sky-600/50",
    icon: Wrench,
  },
  reprovado: {
    label: "REPROVADO",
    msg: "Andaime reprovado na inspeção. Uso proibido até correção e nova liberação.",
    bg: "bg-red-600",
    iconBg: "bg-red-400/25",
    iconRing: "ring-red-300/50",
    ring: "ring-red-600/50",
    icon: XCircle,
  },
  interditado: {
    label: "INTERDITADO",
    msg: "⚠️ ANDAIME INTERDITADO. Uso estritamente proibido. Risco de acidente.",
    bg: "bg-red-800",
    iconBg: "bg-red-400/25",
    iconRing: "ring-red-300/50",
    ring: "ring-red-800/50",
    icon: AlertTriangle,
  },
  vencido: {
    label: "VENCIDO",
    msg: "Validade expirada. Uso proibido até nova inspeção e liberação.",
    bg: "bg-red-700",
    iconBg: "bg-red-400/25",
    iconRing: "ring-red-300/50",
    ring: "ring-red-700/50",
    icon: AlertTriangle,
  },
  desmontado: {
    label: "DESMONTADO",
    msg: "Este andaime foi desmontado e está fora de operação.",
    bg: "bg-slate-500",
    iconBg: "bg-slate-400/25",
    iconRing: "ring-slate-300/50",
    ring: "ring-slate-500/50",
    icon: AlertTriangle,
  },
  // legado
  pendente: {
    label: "PENDENTE",
    msg: "Aguardando inspeção de liberação. Uso não autorizado.",
    bg: "bg-amber-500",
    iconBg: "bg-amber-400/25",
    iconRing: "ring-amber-300/50",
    ring: "ring-amber-500/50",
    icon: Clock,
  },
};

const TYPE_LABELS: Record<string, string> = {
  tubular: "Tubular",
  fachadeiro: "Fachadeiro",
  multidirecional: "Multidirecional",
  suspenso: "Suspenso",
  torre: "Torre",
};

const RESULT_STYLE: Record<string, { label: string; color: string }> = {
  aprovado: { label: "Aprovado", color: "text-emerald-400 font-bold" },
  aprovado_com_ressalvas: {
    label: "Aprovado c/ Ressalvas",
    color: "text-amber-400 font-bold",
  },
  reprovado: { label: "Reprovado", color: "text-red-500 font-bold" },
};

export default async function QRPage({ params }: Props) {
  const { tag } = await params;
  const scaffold = await getScaffoldByTag(tag);
  if (!scaffold) notFound();

  const effectiveStatus =
    scaffold.status === "liberado" &&
    scaffold.validity_date &&
    isPast(scaffold.validity_date)
      ? "vencido"
      : scaffold.status;

  const cfg =
    STATUS_CFG[effectiveStatus as keyof typeof STATUS_CFG] ??
    STATUS_CFG.pendente;
  const StatusIcon = cfg.icon;

  const lastInspection = scaffold.inspections[0] ?? null;

  const validadeFormatted = scaffold.validity_date
    ? format(scaffold.validity_date, "dd/MM/yyyy")
    : null;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 gap-0"
      style={{ background: "hsl(215,46%,9%)" }}
    >
      <div className="w-full max-w-sm flex flex-col gap-3">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-2.5 py-2">
          <ShieldCheck className="w-5 h-5 text-[#ea6a12]" />
          <span className="text-[15px] font-black tracking-widest text-white uppercase">
            AndCheck
          </span>
          <span className="text-[11px] text-white/30 font-medium">
            · NR-18 / NR-35
          </span>
        </div>

        {/* ── Card principal ──────────────────────────────────────── */}
        <div
          className={
            "rounded-2xl overflow-hidden shadow-2xl ring-1 " + cfg.ring
          }
          style={{ background: "hsl(220,10%,18%)" }}
        >
          {/* Status banner */}
          <div
            className={"px-6 py-5 flex items-center justify-between " + cfg.bg}
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">
                Status
              </p>
              <p className="text-[32px] font-black text-white leading-none tracking-tight">
                {cfg.label}
              </p>
            </div>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/20 ring-2 ring-white/40 backdrop-blur-sm">
              <StatusIcon
                className="w-9 h-9 text-white drop-shadow"
                strokeWidth={2}
              />
            </div>
          </div>

          {/* Mensagem operacional */}
          {"msg" in cfg && (
            <div className="px-6 py-3 bg-black/30 border-b border-white/8">
              <p className="text-[11px] font-semibold text-white/80 leading-snug">
                {cfg.msg}
              </p>
            </div>
          )}

          {/* TAG + tipo */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-white/8">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-0.5">
                Tag do Andaime
              </p>
              <p className="text-[26px] font-black font-mono text-white leading-none">
                {scaffold.code}
              </p>
            </div>
            <span className="text-[11px] font-semibold text-white/60 bg-white/8 px-3 py-1 rounded-md">
              {TYPE_LABELS[scaffold.type] ?? scaffold.type}
            </span>
          </div>

          {/* Informações */}
          <div className="px-6 py-2">
            <InfoRow
              icon={MapPin}
              label="Localização"
              value={scaffold.location}
            />
            <InfoRow
              icon={User}
              label="Responsável"
              value={scaffold.responsible}
            />
            {scaffold.company && (
              <InfoRow
                icon={Building2}
                label="Empresa"
                value={scaffold.company}
              />
            )}
            {validadeFormatted && (
              <InfoRow
                icon={CalendarDays}
                label="Validade"
                value={validadeFormatted}
                valueClass="text-[#ea6a12] font-bold"
              />
            )}
          </div>

          {/* Última inspeção */}
          {lastInspection && (
            <div
              className="mx-4 mb-4 mt-2 rounded-xl p-4"
              style={{ background: "hsl(215,46%,9%)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <ClipboardCheck className="w-3.5 h-3.5 text-white/40" />
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">
                  Última Inspeção
                </p>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[14px] text-white font-semibold leading-snug">
                    {lastInspection.inspector_name}
                  </p>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    {format(lastInspection.date, "dd 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <span
                  className={
                    "text-[11px] font-bold shrink-0 mt-0.5 " +
                    (RESULT_STYLE[lastInspection.result]?.color ??
                      "text-white/60")
                  }
                >
                  {RESULT_STYLE[lastInspection.result]?.label ??
                    lastInspection.result}
                </span>
              </div>
            </div>
          )}

          {/* ID */}
          <div className="px-6 pb-4 text-center">
            <p className="text-[9px] text-white/20 font-mono tracking-wider">
              {scaffold.id}
            </p>
          </div>
        </div>

        {/* ── CTA ────────────────────────────────────────────────── */}
        <Link
          href={
            "/inspecoes/nova?scaffold_id=" +
            scaffold.id +
            "&scaffold_code=" +
            scaffold.code
          }
          className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-colors"
          style={{ background: "#ea6a12", color: "#fff" }}
        >
          <ClipboardCheck className="w-4 h-4" />
          Realizar Nova Inspeção
        </Link>

        {/* ── Rodapé ─────────────────────────────────────────────── */}
        <div className="text-center pt-1 pb-2">
          <p className="text-[9px] text-white/20">
            Gerado por AndCheck · Plataforma de Gestão do Ciclo de Vida de Andaimes
          </p>
          <p className="text-[9px] text-white/20 mt-0.5">
            NR-18 · NR-35 · ABNT NBR 6494
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  valueClass = "text-white font-semibold text-[13px]",
}: {
  icon?: React.ElementType;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      {Icon && (
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/5 ring-1 ring-white/15">
          <Icon className="w-3.5 h-3.5 text-white/60" />
        </div>
      )}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-0.5">
          {label}
        </p>
        <p className={valueClass}>{value}</p>
      </div>
    </div>
  );
}
