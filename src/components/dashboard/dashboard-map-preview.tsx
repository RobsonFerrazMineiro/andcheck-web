"use client";

import type { ScaffoldPin } from "@/components/maps/operational-map";
import { isPast } from "date-fns";
import { ExternalLink, MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

const OperationalMap = dynamic(
  () =>
    import("@/components/maps/operational-map").then((m) => m.OperationalMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-muted/20">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">
          Carregando mapa…
        </p>
      </div>
    ),
  },
);

interface RawScaffold {
  id: string;
  code: string;
  status: string;
  location: string;
  area: string;
  responsible: string;
  validity_date?: Date | null;
  latitude?: number | null;
  longitude?: number | null;
  inspections?: Array<{ date: Date; result: string }>;
}

interface Props {
  scaffolds: RawScaffold[];
}

export function DashboardMapPreview({ scaffolds }: Props) {
  const pins: ScaffoldPin[] = scaffolds
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => ({
      id: s.id,
      code: s.code,
      location: s.location,
      area: s.area ?? "",
      status: s.status,
      responsible: s.responsible,
      validity_date: s.validity_date ? s.validity_date.toISOString() : null,
      latitude: s.latitude as number,
      longitude: s.longitude as number,
      effectiveStatus:
        s.status === "liberado" && s.validity_date && isPast(s.validity_date)
          ? "vencido"
          : s.status,
      lastInspection: s.inspections?.[0]
        ? {
            date: s.inspections[0].date.toISOString(),
            result: s.inspections[0].result,
          }
        : null,
    }));

  const hasMap = pins.length > 0;

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
            · {pins.length}/{scaffolds.length} georreferenciados
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

      {/* Mapa */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{ minHeight: 220 }}
      >
        {hasMap ? (
          <OperationalMap scaffolds={pins} height="100%" interactive={false} />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-2 bg-muted/20"
            style={{ minHeight: 220 }}
          >
            <MapPin className="w-6 h-6 text-muted-foreground/30" />
            <p className="text-[11px] text-muted-foreground text-center">
              Nenhum andaime georreferenciado
            </p>
            <p className="text-[9px] text-muted-foreground/50 text-center max-w-45">
              Cadastre andaimes com localização GPS para visualizá-los aqui.
            </p>
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="px-4 py-2 border-t border-border flex flex-wrap gap-3">
        {[
          { label: "Liberado", dot: "bg-emerald-500" },
          { label: "Pendente", dot: "bg-amber-400" },
          { label: "Reprovado", dot: "bg-red-500" },
          { label: "Em Montagem", dot: "bg-blue-500" },
          { label: "Vencido", dot: "bg-red-700" },
        ].map((v) => (
          <div key={v.label} className="flex items-center gap-1.5">
            <div className={"w-2 h-2 rounded-full " + v.dot} />
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
              {v.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
