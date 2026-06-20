"use client";

import type { ScaffoldPin } from "@/components/maps/operational-map";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardCheck,
  Construction,
  MapPin,
  QrCode,
  RotateCcw,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";

import { surface, typography } from "@/lib/design-system";

const OperationalMap = dynamic(
  () =>
    import("@/components/maps/operational-map").then((m) => m.OperationalMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted/30">
        <p className="animate-pulse text-[11px] uppercase tracking-widest text-muted-foreground">
          Carregando mapa...
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
  showCompanyName?: boolean;
}

export function MapaClient({ scaffolds, showCompanyName = true }: Props) {
  const pins = scaffolds.filter(
    (scaffold): scaffold is ScaffoldPin =>
      scaffold.latitude !== null && scaffold.longitude !== null,
  );

  if (pins.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted/20">
        <p className="text-[13px] font-semibold text-muted-foreground">
          Nenhum andaime georreferênciado
        </p>
        <p className="max-w-xs text-center text-[11px] text-muted-foreground/60">
          Cadastre ou edite andaimes informando a localização GPS para
          visualiza-los no mapa.
        </p>
      </div>
    );
  }

  return (
    <OperationalMap
      key={pins.map((pin) => pin.id).join("|")}
      scaffolds={pins}
      height="100%"
      showCompanyName={showCompanyName}
      variant="full"
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
  { status: "em_montagem", label: "Em montagem", dot: "bg-blue-500" },
  {
    status: "pendente_liberacao",
    label: "Pend. liberação",
    dot: "bg-amber-400",
  },
  { status: "reprovado", label: "Reprovado", dot: "bg-red-500" },
  { status: "interditado", label: "Interditado", dot: "bg-red-900" },
  { status: "vencido", label: "Vencido", dot: "bg-gray-600" },
];

const STATUS_DOT: Record<string, string> = {
  liberado: "bg-emerald-500",
  em_montagem: "bg-blue-500",
  pendente_liberacao: "bg-amber-400",
  reprovado: "bg-red-500",
  interditado: "bg-red-900",
  vencido: "bg-gray-600",
  pendente: "bg-amber-400",
};

function filterLabel(activeStatus: string | null) {
  if (!activeStatus) return "Todos os status";
  return (
    LEGEND_FILTERS.find((item) => item.status === activeStatus)?.label ??
    activeStatus
  );
}

export function MapaOperacionalClient({
  scaffolds,
  canInspect,
  canFilterCompany,
  showCompanyName = true,
}: Props & {
  canInspect: boolean;
  canFilterCompany: boolean;
}) {
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState("all");

  const companies = useMemo(
    () =>
      Array.from(
        new Map(
          scaffolds.map((scaffold) => [
            scaffold.companyId,
            scaffold.companyName,
          ]),
        ),
      )
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [scaffolds],
  );

  const filteredScaffolds = useMemo(
    () =>
      scaffolds.filter(
        (scaffold) =>
          (!activeStatus || scaffold.effectiveStatus === activeStatus) &&
          (activeCompanyId === "all" || scaffold.companyId === activeCompanyId),
      ),
    [activeCompanyId, activeStatus, scaffolds],
  );

  const comCoords = filteredScaffolds.filter(
    (scaffold) => scaffold.latitude !== null && scaffold.longitude !== null,
  ).length;

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div
          className={`flex flex-col justify-between gap-2 sm:flex-row sm:items-center ${surface.panelHeader}`}
        >
          <div className="flex items-center gap-2">
            <MapPin className={surface.panelHeaderIcon} />
            <span className={surface.panelHeaderTitle}>Mapa de Satélite</span>
            <span className={`hidden sm:inline ${surface.panelHeaderSubtitle}`}>
              · {comCoords} andaimes georreferênciados
            </span>
          </div>
          <p className={`${typography.panelSubtitle} text-slate-400`}>
            Filtro: {filterLabel(activeStatus)}
            {activeCompanyId !== "all" &&
              ` · ${
                companies.find((company) => company.id === activeCompanyId)
                  ?.name ?? "Empresa"
              }`}
          </p>
        </div>
        <div style={{ height: 480 }}>
          <MapaClient
            scaffolds={filteredScaffolds}
            showCompanyName={showCompanyName}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card p-0">
        <div
          className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${surface.panelHeader}`}
        >
          <div className="flex items-center gap-2">
            <Construction className={surface.panelHeaderIcon} />
            <span className={surface.panelHeaderTitle}>
              Filtros Operacionais
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canFilterCompany && companies.length > 1 && (
              <Select
                value={activeCompanyId}
                onValueChange={setActiveCompanyId}
              >
                <SelectTrigger className="h-8 w-52 rounded-md text-[10px]">
                  <SelectValue placeholder="Todas as empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {(activeStatus || activeCompanyId !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setActiveStatus(null);
                  setActiveCompanyId("all");
                }}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border px-2.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted"
              >
                <RotateCcw className="size-3" />
                Limpar
              </button>
            )}
          </div>
        </div>
        <div className="p-4 flex flex-wrap gap-2">
          {LEGEND_FILTERS.map((item) => {
            const count = scaffolds.filter(
              (scaffold) =>
                scaffold.effectiveStatus === item.status &&
                (activeCompanyId === "all" ||
                  scaffold.companyId === activeCompanyId),
            ).length;
            const active = activeStatus === item.status;

            return (
              <button
                key={item.status}
                type="button"
                onClick={() => setActiveStatus(active ? null : item.status)}
                className={
                  "inline-flex h-8 items-center gap-2 rounded-md border px-3 text-[10px] font-bold uppercase tracking-wider transition-colors " +
                  (active
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted/60")
                }
                aria-pressed={active}
              >
                <span className={"size-3 rounded-full " + item.dot} />
                <span>{item.label}</span>
                <span className="font-mono text-[10px] text-muted-foreground/70">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div
          className={`flex items-center justify-between gap-3 ${surface.panelHeader}`}
        >
          <div className="flex items-center gap-2">
            <Construction className={surface.panelHeaderIcon} />
            <span className={surface.panelHeaderTitle}>Andaimes</span>
            <span className={`hidden sm:inline ${surface.panelHeaderSubtitle}`}>
              · Listagem
            </span>
          </div>
          <span className={`${typography.panelSubtitle} text-slate-400`}>
            {filteredScaffolds.length} de {scaffolds.length} registros
          </span>
        </div>
        <div className="divide-y divide-border">
          {filteredScaffolds.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-[12px] font-semibold text-muted-foreground">
                Nenhum andaime encontrado para este filtro.
              </p>
            </div>
          ) : (
            filteredScaffolds.map((scaffold) => (
              <div
                key={scaffold.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
              >
                <div
                  className={
                    "size-2 shrink-0 rounded-full " +
                    (STATUS_DOT[scaffold.effectiveStatus] ?? "bg-gray-400")
                  }
                />
                <MapPin className="size-3.5 shrink-0 text-muted-foreground/30" />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[12px] font-bold text-foreground">
                    {scaffold.code}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {canFilterCompany ? `${scaffold.companyName} - ` : ""}
                    {scaffold.location} - {scaffold.area}
                    {!scaffold.latitude && (
                      <span className="ml-1 text-amber-500">- sem coords</span>
                    )}
                  </p>
                </div>
                <StatusBadge status={scaffold.effectiveStatus} />
                <div className="flex shrink-0 gap-1.5">
                  <Link
                    href={`/andaimes/${scaffold.id}`}
                    className="flex size-6 items-center justify-center rounded-md hover:bg-muted"
                    title="Detalhe"
                  >
                    <Construction className="size-3.5 text-muted-foreground" />
                  </Link>
                  <Link
                    href={`/qr/${scaffold.id}`}
                    className="flex size-6 items-center justify-center rounded-md hover:bg-muted"
                    title="QR Code"
                  >
                    <QrCode className="size-3.5 text-muted-foreground" />
                  </Link>
                  {canInspect && (
                    <Link
                      href={`/inspecoes/nova?scaffold_id=${scaffold.id}`}
                      className="flex size-6 items-center justify-center rounded-md hover:bg-muted"
                      title="Inspecionar"
                    >
                      <ClipboardCheck className="size-3.5 text-muted-foreground" />
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
