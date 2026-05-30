import { ExternalLink, MapPin } from "lucide-react";
import Link from "next/link";

interface ScaffoldPin {
  id: string;
  code: string;
  status: string;
  location: string;
}

interface Props {
  scaffolds: ScaffoldPin[];
}

const STATUS_PIN: Record<string, { color: string; bg: string; label: string }> =
  {
    liberado: { color: "bg-green-500", bg: "bg-green-50", label: "Liberado" },
    reprovado: { color: "bg-red-500", bg: "bg-red-50", label: "Reprovado" },
    pendente: { color: "bg-amber-400", bg: "bg-amber-50", label: "Pendente" },
    em_montagem: {
      color: "bg-blue-500",
      bg: "bg-blue-50",
      label: "Em Montagem",
    },
    vencido: { color: "bg-orange-500", bg: "bg-orange-50", label: "Vencido" },
  };

// Posições fixas distribuídas na área de preview (em %)
const PIN_POSITIONS = [
  { top: "18%", left: "22%" },
  { top: "32%", left: "58%" },
  { top: "55%", left: "38%" },
  { top: "42%", left: "75%" },
  { top: "68%", left: "20%" },
  { top: "22%", left: "82%" },
  { top: "72%", left: "62%" },
  { top: "14%", left: "46%" },
];

export function DashboardMapPreview({ scaffolds }: Props) {
  const pins = scaffolds.slice(0, 8);

  const counts = scaffolds.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});

  const legendEntries = Object.entries(STATUS_PIN).filter(
    ([key]) => (counts[key] ?? 0) > 0,
  );

  return (
    <div className="bg-card border border-border shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
            Mapa Operacional
          </span>
          <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider hidden sm:inline">
            · {scaffolds.length} ativos
          </span>
        </div>
        <Link
          href="/mapa"
          className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          Abrir mapa
          <ExternalLink className="w-2.5 h-2.5" />
        </Link>
      </div>

      {/* Área do mapa */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{ minHeight: 200 }}
      >
        {/* Grade topográfica mockada */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #e8ecf0 0%, #dde3ea 50%, #e4e9ef 100%)",
          }}
        />
        {/* Grid de referência */}
        <svg
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          style={{ opacity: 0.25 }}
        >
          <defs>
            <pattern
              id="grid"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        {/* Área industrial simulada */}
        <div
          className="absolute rounded-sm border border-slate-300/60 bg-slate-300/20"
          style={{ top: "25%", left: "15%", width: "65%", height: "55%" }}
        />
        <p
          className="absolute text-[8px] font-bold uppercase tracking-widest text-slate-400/60"
          style={{ top: "26%", left: "17%" }}
        >
          Área Industrial
        </p>

        {/* Pins */}
        {pins.map((s, i) => {
          const pos = PIN_POSITIONS[i] ?? { top: "50%", left: "50%" };
          const cfg = STATUS_PIN[s.status] ?? STATUS_PIN.pendente;
          return (
            <div
              key={s.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 group"
              style={{ top: pos.top, left: pos.left }}
              title={`${s.code} — ${s.location}`}
            >
              {/* Pulsação para reprovados */}
              {s.status === "reprovado" && (
                <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-50" />
              )}
              <div
                className={`w-4 h-4 rounded-full ${cfg.color} border-2 border-white shadow-md relative z-10`}
              />
              {/* Tooltip */}
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-foreground text-background text-[9px] font-mono px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
                {s.code}
              </div>
            </div>
          );
        })}

        {/* Escala */}
        <div className="absolute bottom-2 right-3 flex items-center gap-1">
          <div className="w-8 h-0.5 bg-slate-400/60" />
          <span className="text-[8px] text-slate-400/80 font-mono">50m</span>
        </div>
      </div>

      {/* Legenda */}
      {legendEntries.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border flex flex-wrap gap-x-4 gap-y-1">
          {legendEntries.map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${cfg.color}`} />
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                {cfg.label}
                <span className="font-mono ml-1 text-muted-foreground/60">
                  ({counts[key]})
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
