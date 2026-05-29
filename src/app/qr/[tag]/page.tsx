import { format, isPast, parseISO } from "date-fns";
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
