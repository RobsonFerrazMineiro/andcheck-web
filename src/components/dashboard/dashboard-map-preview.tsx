"use client";

import type { ScaffoldPin } from "@/components/maps/operational-map";
import { EmptyState } from "@/components/shared/empty-state";
import { isPast } from "date-fns";
import { ExternalLink, MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { surface, typography } from "@/lib/design-system";

const OperationalMap = dynamic(
  () =>
    import("@/components/maps/operational-map").then((m) => m.OperationalMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-muted/20">
        <p
          className={`${typography.action} animate-pulse text-muted-foreground`}
        >
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
  companyId: string;
  tenantCompany: { name: string };
  location_description?: string | null;
  validity_date?: Date | string | null;
  latitude?: number | null;
  longitude?: number | null;
  inspections?: Array<{ date: Date | string; result: string }>;
}

export interface DashboardMapPreviewProps {
  scaffolds: RawScaffold[];
  showCompanyName?: boolean;
}

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function toDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

export function DashboardMapPreview({
  scaffolds,
  showCompanyName = true,
}: DashboardMapPreviewProps) {
  const pins: ScaffoldPin[] = scaffolds
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => ({
      id: s.id,
      code: s.code,
      location: s.location,
      area: s.area ?? "",
      status: s.status,
      responsible: s.responsible,
      companyId: s.companyId,
      companyName: s.tenantCompany.name,
      locationDescription: s.location_description,
      validity_date: toIsoDate(s.validity_date),
      latitude: s.latitude as number,
      longitude: s.longitude as number,
      effectiveStatus:
        s.status === "liberado" &&
        s.validity_date &&
        isPast(toDate(s.validity_date) ?? new Date())
          ? "vencido"
          : s.status,
      lastInspection: s.inspections?.[0]
        ? {
            date: toIsoDate(s.inspections[0].date) ?? "",
            result: s.inspections[0].result,
          }
        : null,
    }));

  const hasMap = pins.length > 0;

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div
        className={`flex items-center justify-between ${surface.panelHeader}`}
      >
        <div className="flex items-center gap-2">
          <MapPin className={surface.panelHeaderIcon} />
          <span className={surface.panelHeaderTitle}>Mapa Operacional</span>
          <span className={`hidden sm:inline ${surface.panelHeaderSubtitle}`}>
            · {pins.length}/{scaffolds.length} georreferênciados
          </span>
        </div>
        <Link
          href="/mapa"
          className={`flex items-center gap-1 text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground ${typography.linkAction}`}
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
          <OperationalMap
            scaffolds={pins}
            height="100%"
            interactive
            showCompanyName={showCompanyName}
            variant="compact"
          />
        ) : (
          <EmptyState
            icon={MapPin}
            title="Nenhum andaime georreferenciado"
            description="Cadastre andaimes com localização GPS para visualizá-los aqui."
            className="h-full min-h-[220px] justify-center rounded-none border-0 bg-muted/20 shadow-none"
          />
        )}
      </div>

      {/* Legenda */}
      <div className="px-4 py-2 border-t border-border flex flex-wrap gap-3">
        {[
          { label: "Liberado", dot: "bg-emerald-500" },
          { label: "Em Montagem", dot: "bg-blue-500" },
          { label: "Pend. Lib.", dot: "bg-amber-400" },
          { label: "Reprovado", dot: "bg-red-500" },
          { label: "Interditado", dot: "bg-red-900" },
          { label: "Vencido", dot: "bg-gray-600" },
        ].map((v) => (
          <div key={v.label} className="flex items-center gap-1.5">
            <div className={"w-2 h-2 rounded-full " + v.dot} />
            <p className={`${typography.panelSubtitle} text-muted-foreground`}>
              {v.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
