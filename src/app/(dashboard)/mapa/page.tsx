import { isPast } from "date-fns";
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
import { getScaffolds } from "@/lib/actions/scaffold-actions";

const AREA_COORDS: Record<string, { x: number; y: number }> = {
  "Bloco Industrial 01": { x: 18, y: 22 },
  "Bloco Industrial 02": { x: 42, y: 22 },
  Utilidades: { x: 72, y: 35 },
  Manutencao: { x: 28, y: 60 },
  Logistica: { x: 60, y: 65 },
  Processo: { x: 80, y: 22 },
};

const STATUS_DOT: Record<string, string> = {
  liberado: "bg-emerald-500",
  pendente: "bg-amber-400",
  reprovado: "bg-red-500",
  vencido: "bg-red-700",
  em_montagem: "bg-blue-500",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  liberado: CheckCircle2,
  pendente: Clock,
  reprovado: XCircle,
  vencido: AlertTriangle,
  em_montagem: Wrench,
};

export default async function MapaPage() {
  const raw = await getScaffolds();
  const scaffolds = raw.map((s) => ({
    ...s,
    effectiveStatus:
      s.status === "liberado" && s.validity_date && isPast(s.validity_date)
        ? ("vencido" as const)
        : s.status,
  }));

  const liberados = scaffolds.filter(
    (s) => s.effectiveStatus === "liberado",
  ).length;
  const pendentes = scaffolds.filter((s) =>
    ["pendente", "em_montagem"].includes(s.effectiveStatus),
  ).length;
  const reprovados = scaffolds.filter(
    (s) => s.effectiveStatus === "reprovado",
  ).length;
  const vencidos = scaffolds.filter(
    (s) => s.effectiveStatus === "vencido",
  ).length;

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
          className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground text-[10px] font-bold uppercase tracking-widest h-8 px-4 shrink-0"
        >
          <Construction className="w-3.5 h-3.5" />
          Novo Andaime
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Liberados",
            value: liberados,
            color: "text-emerald-600",
            bg: "bg-emerald-50 border-emerald-200",
            bar: "border-l-green-600",
          },
          {
            label: "Pendentes",
            value: pendentes,
            color: "text-amber-600",
            bg: "bg-amber-50 border-amber-200",
            bar: "border-l-amber-500",
          },
          {
            label: "Reprovados",
            value: reprovados,
            color: "text-red-600",
            bg: "bg-red-50 border-red-200",
            bar: "border-l-red-600",
          },
          {
            label: "Vencidos",
            value: vencidos,
            color: "text-red-700",
            bg: "bg-red-50/60 border-red-300",
            bar: "border-l-red-700",
          },
        ].map((k) => (
          <div
            key={k.label}
            className={
              "border border-l-4 p-3 text-center " + k.bg + " " + k.bar
            }
          >
            <p className={"text-[26px] font-black font-mono " + k.color}>
              {k.value}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              {k.label}
            </p>
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
        <div
          className="relative w-full bg-muted/30 overflow-hidden"
          style={{ paddingBottom: "55%" }}
        >
          {/* Grid de fundo */}
          <svg
            className="absolute inset-0 w-full h-full opacity-10"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Zonas da planta */}
          {[
            {
              label: "BLOCO IND. 01",
              x: 5,
              y: 10,
              w: 28,
              h: 25,
              color: "border-blue-300/30 bg-blue-50/20",
            },
            {
              label: "BLOCO IND. 02",
              x: 35,
              y: 10,
              w: 24,
              h: 25,
              color: "border-blue-300/30 bg-blue-50/20",
            },
            {
              label: "PROCESSO",
              x: 66,
              y: 10,
              w: 22,
              h: 25,
              color: "border-violet-300/30 bg-violet-50/20",
            },
            {
              label: "UTILIDADES",
              x: 62,
              y: 38,
              w: 20,
              h: 20,
              color: "border-slate-300/30 bg-slate-50/20",
            },
            {
              label: "MANUTENÇÃO",
              x: 18,
              y: 50,
              w: 22,
              h: 20,
              color: "border-orange-300/30 bg-orange-50/20",
            },
            {
              label: "LOGÍSTICA",
              x: 44,
              y: 52,
              w: 24,
              h: 20,
              color: "border-green-300/30 bg-green-50/20",
            },
          ].map((z) => (
            <div
              key={z.label}
              className={"absolute border " + z.color}
              style={{
                left: z.x + "%",
                top: z.y + "%",
                width: z.w + "%",
                height: z.h + "%",
              }}
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
                <div
                  className={
                    "w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-white/60 transition-transform group-hover:scale-125 " +
                    STATUS_DOT[s.effectiveStatus]
                  }
                >
                  <StatusIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                  <div className="bg-popover border border-border shadow-lg px-2 py-1.5 min-w-max">
                    <p className="text-[10px] font-bold font-mono text-foreground">
                      {s.code}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      {s.location}
                    </p>
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
          liberado: { label: "Liberado", dot: "bg-emerald-500" },
          pendente: { label: "Pendente", dot: "bg-amber-400" },
          reprovado: { label: "Reprovado", dot: "bg-red-500" },
          vencido: { label: "Vencido", dot: "bg-red-700" },
          em_montagem: { label: "Em Montagem", dot: "bg-blue-500" },
        }).map(([, v]) => (
          <div key={v.label} className="flex items-center gap-2">
            <div className={"w-3 h-3 rounded-full " + v.dot} />
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {v.label}
            </p>
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
            <div
              key={s.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div
                className={
                  "w-2 h-2 rounded-full shrink-0 " +
                  STATUS_DOT[s.effectiveStatus]
                }
              />
              <MapPin className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[12px] font-mono text-foreground">
                  {s.code}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {s.location} · {s.area}
                </p>
              </div>
              <StatusBadge status={s.effectiveStatus} />
              <div className="flex gap-1.5 shrink-0">
                <Link
                  href={"/andaimes/" + s.id}
                  className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded transition-colors"
                  title="Detalhe"
                >
                  <Construction className="w-3.5 h-3.5 text-muted-foreground" />
                </Link>
                <Link
                  href={"/qr/" + s.id}
                  className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded transition-colors"
                  title="QR Code"
                >
                  <QrCode className="w-3.5 h-3.5 text-muted-foreground" />
                </Link>
                <Link
                  href={"/inspecoes/nova?scaffold_id=" + s.id}
                  className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded transition-colors"
                  title="Inspecionar"
                >
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
