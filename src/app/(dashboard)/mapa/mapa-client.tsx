"use client";

import type { ScaffoldPin } from "@/components/maps/operational-map";
import { EmptyState } from "@/components/shared/empty-state";
import { OfflineDataNotice } from "@/components/offline/offline-data-notice";
import { MobileFilterPanel } from "@/components/shared/mobile-filter-panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
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
import { differenceInCalendarDays, parseISO } from "date-fns";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";

import { surface, typography } from "@/lib/design-system";
import { getExpirationFilterLabel } from "@/lib/filter-labels";
import { useOfflineSnapshotCache } from "@/lib/offline/use-offline-snapshot-cache";
import {
  scaffoldStatusTone,
  SEMANTIC_TONE_CLASSES,
} from "@/lib/semantic-tones";

const OperationalMap = dynamic(
  () =>
    import("@/components/maps/operational-map").then((m) => m.OperationalMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted/30">
        <p className={`${typography.emptyState} animate-pulse text-muted-foreground`}>
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
        <p className={`${typography.bodyStrong} text-muted-foreground`}>
          Nenhum andaime georreferênciado
        </p>
        <p className={`max-w-xs text-center ${typography.sectionDescription} text-muted-foreground/60`}>
          Cadastre ou edite andaimes informando a localização GPS para
          visualiza-los no mapa.
        </p>
      </div>
    );
  }

  return (
    <OperationalMap
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
  {
    status: "liberado",
    label: "Liberado",
    dot: SEMANTIC_TONE_CLASSES[scaffoldStatusTone("liberado")].dot,
  },
  {
    status: "em_montagem",
    label: "Em montagem",
    dot: SEMANTIC_TONE_CLASSES[scaffoldStatusTone("em_montagem")].dot,
  },
  {
    status: "pendente_liberacao",
    label: "Pend. liberação",
    dot: SEMANTIC_TONE_CLASSES[scaffoldStatusTone("pendente_liberacao")].dot,
  },
  {
    status: "reprovado",
    label: "Reprovado",
    dot: SEMANTIC_TONE_CLASSES[scaffoldStatusTone("reprovado")].dot,
  },
  {
    status: "interditado",
    label: "Interditado",
    dot: SEMANTIC_TONE_CLASSES[scaffoldStatusTone("interditado")].dot,
  },
  {
    status: "vencido",
    label: "Vencido",
    dot: SEMANTIC_TONE_CLASSES[scaffoldStatusTone("vencido")].dot,
  },
];

function filterLabel(activeStatus: string | null) {
  if (!activeStatus) return "Todos os status";
  return (
    LEGEND_FILTERS.find((item) => item.status === activeStatus)?.label ??
    activeStatus
  );
}

function dueFilterLabel(dueFilter: string) {
  return dueFilter === "all"
    ? "Todos os vencimentos"
    : getExpirationFilterLabel(dueFilter);
}

function getScaffoldStatusDot(status: string) {
  return SEMANTIC_TONE_CLASSES[scaffoldStatusTone(status)].dot;
}

function matchesDueFilter(validityDate: string | null, dueFilter: string) {
  if (dueFilter === "all") return true;
  if (!validityDate) return false;

  const daysToExpire = differenceInCalendarDays(
    parseISO(validityDate),
    new Date(),
  );

  return (
    (dueFilter === "expiring_soon" &&
      daysToExpire > 0 &&
      daysToExpire <= 7) ||
    (dueFilter === "expiring_today" && daysToExpire === 0)
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
  const [dueFilter, setDueFilter] = useState("all");
  const [showAllScaffolds, setShowAllScaffolds] = useState(false);
  const {
    data: cachedScaffolds,
    isOfflineFallback,
    lastCachedAt,
  } = useOfflineSnapshotCache({
    cacheKey: "mapScaffolds:snapshot",
    initialData: scaffolds,
  });

  const companies = useMemo(
    () =>
      Array.from(
        new Map(
          cachedScaffolds.map((scaffold) => [
            scaffold.companyId,
            scaffold.companyName,
          ]),
        ),
      )
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [cachedScaffolds],
  );

  const filteredScaffolds = useMemo(
    () =>
      cachedScaffolds.filter(
        (scaffold) =>
          (!activeStatus || scaffold.effectiveStatus === activeStatus) &&
          (activeCompanyId === "all" ||
            scaffold.companyId === activeCompanyId) &&
          matchesDueFilter(scaffold.validity_date, dueFilter),
      ),
    [activeCompanyId, activeStatus, cachedScaffolds, dueFilter],
  );

  const comCoords = filteredScaffolds.filter(
    (scaffold) => scaffold.latitude !== null && scaffold.longitude !== null,
  ).length;
  const visibleScaffolds = filteredScaffolds.slice(0, 8);

  return (
    <div className="min-w-0 space-y-5 overflow-hidden">
      <OfflineDataNotice
        active={isOfflineFallback}
        label="mapa operacional"
        lastCachedAt={lastCachedAt}
      />

      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div
          className={`flex min-w-0 flex-col justify-between gap-2 sm:flex-row sm:items-center ${surface.panelHeader}`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <MapPin className={`${surface.panelHeaderIcon} shrink-0`} />
            <span className={`${surface.panelHeaderTitle} min-w-0 truncate`}>
              Mapa de Satélite
            </span>
            <span className={`hidden sm:inline ${surface.panelHeaderSubtitle}`}>
              · {comCoords} andaimes georreferênciados
            </span>
          </div>
          <p className={`${typography.panelSubtitle} min-w-0 break-words text-muted-foreground/60`}>
            Filtro: {filterLabel(activeStatus)}
            {activeCompanyId !== "all" &&
              ` · ${
                companies.find((company) => company.id === activeCompanyId)
                  ?.name ?? "Empresa"
              }`}
            {dueFilter !== "all" && ` · ${dueFilterLabel(dueFilter)}`}
          </p>
        </div>
        <div style={{ height: 480 }}>
          <MapaClient
            scaffolds={filteredScaffolds}
            showCompanyName={showCompanyName}
          />
        </div>
      </div>

      <MobileFilterPanel
        title="Filtros operacionais"
        description="Filtre o mapa por empresa, vencimento e status."
        summary={`${filteredScaffolds.length}/${cachedScaffolds.length} · ${filterLabel(activeStatus)}${activeCompanyId !== "all" ? ` · ${companies.find((company) => company.id === activeCompanyId)?.name ?? "Empresa"}` : ""}`}
      >
      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card p-0">
        <div
          className={`flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${surface.panelHeader}`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Construction className={`${surface.panelHeaderIcon} shrink-0`} />
            <span className={`${surface.panelHeaderTitle} min-w-0 truncate`}>
              Filtros Operacionais
            </span>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {canFilterCompany && companies.length > 1 && (
              <Select
                value={activeCompanyId}
                onValueChange={setActiveCompanyId}
              >
                <SelectTrigger className={`h-8 w-full min-w-0 rounded-md sm:w-52 ${typography.bodyMuted}`}>
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
            <Select value={dueFilter} onValueChange={setDueFilter}>
              <SelectTrigger className={`h-8 w-full min-w-0 rounded-md sm:w-52 ${typography.bodyMuted}`}>
                <SelectValue placeholder="Vencimento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os vencimentos</SelectItem>
                <SelectItem value="expiring_soon">
                  Prestes a vencer (7 dias)
                </SelectItem>
                <SelectItem value="expiring_today">
                  {getExpirationFilterLabel("expiring_today")}
                </SelectItem>
              </SelectContent>
            </Select>
            {(activeStatus ||
              activeCompanyId !== "all" ||
              dueFilter !== "all") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveStatus(null);
                  setActiveCompanyId("all");
                  setDueFilter("all");
                }}
                className={`${typography.action} text-muted-foreground hover:text-foreground`}
              >
                <RotateCcw className="size-3" />
                Limpar
              </Button>
            )}
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2 p-3 sm:p-4">
          {LEGEND_FILTERS.map((item) => {
            const count = cachedScaffolds.filter(
              (scaffold) =>
                scaffold.effectiveStatus === item.status &&
                (activeCompanyId === "all" ||
                  scaffold.companyId === activeCompanyId) &&
                matchesDueFilter(scaffold.validity_date, dueFilter),
            ).length;
            const active = activeStatus === item.status;

            return (
              <Button
                key={item.status}
                type="button"
                variant={active ? "secondary" : "outline"}
                size="sm"
                onClick={() => setActiveStatus(active ? null : item.status)}
                className={
                  "min-w-0 gap-2 " +
                  (active
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted/60")
                }
                aria-pressed={active}
              >
                <span className={"size-3 rounded-full " + item.dot} />
                <span className="truncate">{item.label}</span>
                <span className={`${typography.codeMuted} text-muted-foreground/70`}>
                  {count}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
      </MobileFilterPanel>

      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div
          className={`flex min-w-0 items-center justify-between gap-3 ${surface.panelHeader}`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Construction className={`${surface.panelHeaderIcon} shrink-0`} />
            <span className={`${surface.panelHeaderTitle} min-w-0 truncate`}>
              Andaimes
            </span>
            <span className={`hidden sm:inline ${surface.panelHeaderSubtitle}`}>
              · Listagem
            </span>
          </div>
          <span className={`${typography.panelSubtitle} shrink-0 text-muted-foreground/60`}>
            {filteredScaffolds.length} de {cachedScaffolds.length} registros
          </span>
        </div>
        <div className="divide-y divide-border">
          {filteredScaffolds.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="Nenhum andaime encontrado"
              description="Ajuste os filtros para visualizar andaimes no mapa operacional."
              className="border-0 border-b border-dashed"
            />
          ) : (
            visibleScaffolds.map((scaffold) => (
              <div
                key={scaffold.id}
                className="flex min-w-0 items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/30 sm:px-4"
              >
                <div
                  className={
                    "size-2 shrink-0 rounded-full " +
                    getScaffoldStatusDot(scaffold.effectiveStatus)
                  }
                />
                <MapPin className="size-3.5 shrink-0 text-muted-foreground/30" />
                <div className="min-w-0 flex-1">
                  <p className={`${typography.code} text-foreground`}>
                    {scaffold.code}
                  </p>
                  <p className={`truncate ${typography.bodyMuted} text-muted-foreground`}>
                    {canFilterCompany ? `${scaffold.companyName} - ` : ""}
                    {scaffold.location} - {scaffold.area}
                    {!scaffold.latitude && (
                      <span
                        className={`ml-1 ${SEMANTIC_TONE_CLASSES.warning.text}`}
                      >
                        - sem coords
                      </span>
                    )}
                  </p>
                </div>
                <div className="hidden shrink-0 sm:block">
                  <StatusBadge status={scaffold.effectiveStatus} />
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button asChild variant="ghost" size="icon-xs" title="Detalhe">
                    <Link
                      href={`/andaimes/${scaffold.id}`}
                      aria-label={`Visualizar andaime ${scaffold.code}`}
                    >
                      <Construction className="size-3.5 text-muted-foreground" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="icon-xs" title="QR Code">
                    <Link
                      href={`/qr/${scaffold.id}`}
                      aria-label={`Abrir QR Code do andaime ${scaffold.code}`}
                    >
                      <QrCode className="size-3.5 text-muted-foreground" />
                    </Link>
                  </Button>
                  {canInspect && (
                    <Button asChild variant="ghost" size="icon-xs" title="Inspecionar">
                      <Link
                        href={`/inspecoes/nova?scaffold_id=${scaffold.id}`}
                        aria-label={`Criar inspeção para o andaime ${scaffold.code}`}
                      >
                        <ClipboardCheck className="size-3.5 text-muted-foreground" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
          {filteredScaffolds.length > visibleScaffolds.length && (
            <div className="px-3 py-3 sm:px-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAllScaffolds(true)}
                className={`w-full text-muted-foreground hover:text-foreground sm:w-auto ${typography.action}`}
              >
                Ver todos
              </Button>
            </div>
          )}
        </div>
      </div>

      {showAllScaffolds && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="map-scaffold-list-title"
          className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 sm:items-center sm:justify-center sm:p-4"
        >
          <div className="max-h-[85vh] w-full overflow-hidden border border-border bg-card shadow-lg sm:max-w-3xl">
            <div className="flex items-center justify-between gap-3 border-b-2 border-border bg-muted/40 px-4 py-3">
              <div>
                <p
                  id="map-scaffold-list-title"
                  className={`${typography.panelTitle} text-foreground`}
                >
                  Todos os andaimes
                </p>
                <p className={`mt-0.5 ${typography.codeMuted} text-muted-foreground`}>
                  {filteredScaffolds.length} registro(s) filtrado(s)
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAllScaffolds(false)}
                className={`${typography.action} text-muted-foreground hover:text-foreground`}
              >
                Fechar
              </Button>
            </div>
            <div className="max-h-[calc(85vh-4.5rem)] divide-y divide-border overflow-y-auto">
              {filteredScaffolds.map((scaffold) => (
                <div
                  key={scaffold.id}
                  className="flex min-w-0 items-center gap-3 px-4 py-3"
                >
                  <div
                    className={
                      "size-2 shrink-0 rounded-full " +
                      getScaffoldStatusDot(scaffold.effectiveStatus)
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`${typography.code} text-foreground`}>
                      {scaffold.code}
                    </p>
                    <p className={`truncate ${typography.bodyMuted} text-muted-foreground`}>
                      {canFilterCompany ? `${scaffold.companyName} - ` : ""}
                      {scaffold.location} - {scaffold.area}
                    </p>
                  </div>
                  <div className="hidden shrink-0 sm:block">
                    <StatusBadge status={scaffold.effectiveStatus} />
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button asChild variant="ghost" size="icon-sm">
                      <Link
                        href={`/andaimes/${scaffold.id}`}
                        onClick={() => setShowAllScaffolds(false)}
                        aria-label={`Visualizar andaime ${scaffold.code}`}
                      >
                        <Construction className="size-3.5 text-muted-foreground" />
                      </Link>
                    </Button>
                    {canInspect && (
                      <Button asChild variant="ghost" size="icon-sm">
                        <Link
                          href={`/inspecoes/nova?scaffold_id=${scaffold.id}`}
                          onClick={() => setShowAllScaffolds(false)}
                          aria-label={`Criar inspeção para o andaime ${scaffold.code}`}
                        >
                          <ClipboardCheck className="size-3.5 text-muted-foreground" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
