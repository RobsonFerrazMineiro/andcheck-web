"use client";

import type { ScaffoldPin } from "@/components/maps/operational-map";
import { StatusBadge } from "@/components/shared/status-badge";
import dynamic from "next/dynamic";
import { ClipboardCheck, Construction, MapPin, QrCode, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const OperationalMap = dynamic(
  () =>
    import("@/components/maps/operational-map").then((m) => m.OperationalMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-muted/30">
        <p className="text-[11px] text-muted-foreground uppercase tracking-widest animate-pulse">
          Carregando mapa…
        </p>
      </div>
    ),
  },
);

interface Props {
  scaffolds: (Omit<ScaffoldPin, "latitude" | "longitude"> & {
    latitude: number | null;
    longitude: number | null;
  })[];
}

export function MapaClient({ scaffolds }: Props) {
  const pins: ScaffoldPin[] = scaffolds.filter(
    (s): s is ScaffoldPin & { latitude: number; longitude: number } =>
      s.latitude !== null && s.longitude !== null,
  ) as ScaffoldPin[];

  if (pins.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-muted/20">
        <p className="text-[13px] font-semibold text-muted-foreground">
          Nenhum andaime georreferenciado
        </p>
        <p className="text-[11px] text-muted-foreground/60 text-center max-w-xs">
          Cadastre ou edite andaimes informando a localização GPS para
          visualizá-los no mapa.
        </p>
      </div>
    );
  }

  return (
    <OperationalMap
      key={pins.map((pin) => pin.id).join("|")}
      scaffolds={pins}
      height="100%"
    />
  );
}

type LegendFilter = {
  status: string;
  label: string;
  dot: string;
};

const LEGEND_FILTERS: LegendFilter[] = [
  { status: "liberado", label: "Liberado", dot: "bg-emerald-500" },
  { status: "em_montagem", label: "Em Montagem", dot: "bg-blue-500" },
  {
    status: "pendente_liberacao",
    label: "Pend. Liberacao",
    dot: "bg-amber-400",
  },
  { status: "reprovado", label: "Reprovado", dot: "bg-red-500" },
  { status: "interditado", label: "Interditado", dot: "bg-red-900" },
  { status: "vencido", label: "Vencido", dot: "bg-gray-600" },
  { status: "desmontado", label: "Desmontado", dot: "bg-gray-400" },
];

const STATUS_DOT: Record<string, string> = {
  liberado: "bg-emerald-500",
  em_montagem: "bg-blue-500",
  pendente_liberacao: "bg-amber-400",
  reprovado: "bg-red-500",
  interditado: "bg-red-900",
  vencido: "bg-gray-600",
  desmontado: "bg-gray-400",
  pendente: "bg-amber-400",
};

function filterLabel(activeStatus: string | null) {
  if (!activeStatus) return "Todos os status";
  return LEGEND_FILTERS.find((item) => item.status === activeStatus)?.label ?? activeStatus;
}

export function MapaOperacionalClient({
  scaffolds,
  canInspect,
}: Props & {
  canInspect: boolean;
}) {
  const [activeStatus, setActiveStatus] = useState<string | null>(null);

  const filteredScaffolds = useMemo(
    () =>
      activeStatus
        ? scaffolds.filter((s) => s.effectiveStatus === activeStatus)
        : scaffolds,
    [activeStatus, scaffolds],
  );

  const comCoords = filteredScaffolds.filter(
    (s) => s.latitude !== null && s.longitude !== null,
  ).length;

  return (
    <>
      <div className="bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              Mapa de Satelite - Posicionamento Real
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Filtro ativo: {filterLabel(activeStatus)}
            </p>
          </div>
          <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">
            {comCoords} andaimes no mapa · clique no pin para detalhes
          </p>
        </div>
        <div style={{ height: 480 }}>
          <MapaClient scaffolds={filteredScaffolds} />
        </div>
      </div>

      <div className="bg-card border border-border p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            Filtros por Status
          </p>
          {activeStatus && (
            <button
              type="button"
              onClick={() => setActiveStatus(null)}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 border border-border text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted"
            >
              <RotateCcw className="w-3 h-3" />
              Limpar
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {LEGEND_FILTERS.map((item) => {
            const count = scaffolds.filter(
              (s) => s.effectiveStatus === item.status,
            ).length;
            const active = activeStatus === item.status;

            return (
              <button
                key={item.status}
                type="button"
                onClick={() => setActiveStatus(active ? null : item.status)}
                className={
                  "inline-flex items-center gap-2 h-8 px-3 border text-[10px] font-bold uppercase tracking-wider transition-colors " +
                  (active
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted/60")
                }
                aria-pressed={active}
              >
                <span className={"w-3 h-3 rounded-full " + item.dot} />
                <span>{item.label}</span>
                <span className="font-mono text-[10px] text-muted-foreground/70">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            Andaimes - Listagem
          </p>
          <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest">
            {filteredScaffolds.length} de {scaffolds.length} registros
          </p>
        </div>
        <div className="divide-y divide-border">
          {filteredScaffolds.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-[12px] font-semibold text-muted-foreground">
                Nenhum andaime encontrado para este filtro.
              </p>
            </div>
          ) : (
            filteredScaffolds.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div
                  className={
                    "w-2 h-2 rounded-full shrink-0 " +
                    (STATUS_DOT[s.effectiveStatus] ?? "bg-gray-400")
                  }
                />
                <MapPin className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[12px] font-mono text-foreground">
                    {s.code}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {s.location} · {s.area}
                    {!s.latitude && (
                      <span className="text-amber-500 ml-1">· sem coords</span>
                    )}
                  </p>
                </div>
                <StatusBadge status={s.effectiveStatus} />
                <div className="flex gap-1.5 shrink-0">
                  <Link
                    href={"/andaimes/" + s.id}
                    className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded"
                    title="Detalhe"
                  >
                    <Construction className="w-3.5 h-3.5 text-muted-foreground" />
                  </Link>
                  <Link
                    href={"/qr/" + s.id}
                    className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded"
                    title="QR Code"
                  >
                    <QrCode className="w-3.5 h-3.5 text-muted-foreground" />
                  </Link>
                  {canInspect && (
                    <Link
                      href={"/inspecoes/nova?scaffold_id=" + s.id}
                      className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded"
                      title="Inspecionar"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5 text-muted-foreground" />
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
