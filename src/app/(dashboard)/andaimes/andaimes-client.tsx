"use client";

import { differenceInCalendarDays, format, parseISO } from "date-fns";
import {
  Calendar,
  ChevronRight,
  Construction,
  MapPin,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { FilterField, FilterShell } from "@/components/shared/filter-shell";
import { OfflineDataNotice } from "@/components/offline/offline-data-notice";
import { MobileFilterPanel } from "@/components/shared/mobile-filter-panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { typography } from "@/lib/design-system";
import { useOfflineEntityCache } from "@/lib/offline/use-offline-entity-cache";
import {
  scaffoldStatusTone,
  SEMANTIC_TONE_CLASSES,
} from "@/lib/semantic-tones";

const TYPE_LABELS: Record<string, string> = {
  tubular: "Tubular",
  fachadeiro: "Fachadeiro",
  multidirecional: "Multidirecional",
  suspenso: "Suspenso",
  torre: "Torre",
};

export type ScaffoldRow = {
  id: string;
  code: string;
  type: string;
  status: string;
  location: string;
  area: string;
  height: number;
  responsible: string;
  validity_date: string | null;
  _count: { inspections: number };
};

export function AndaimesClient({
  initialData,
  canCreateScaffold,
}: {
  initialData: ScaffoldRow[];
  canCreateScaffold: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expirationFilter, setExpirationFilter] = useState("all");
  const {
    data: scaffolds,
    isOfflineFallback,
    lastCachedAt,
  } = useOfflineEntityCache({
    storeName: "scaffolds",
    initialData,
  });

  const today = new Date();
  const filtered = scaffolds.filter((s) => {
    const matchSearch =
      !search ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.location.toLowerCase().includes(search.toLowerCase()) ||
      s.area.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const daysToExpire = s.validity_date
      ? differenceInCalendarDays(parseISO(s.validity_date), today)
      : null;
    const matchExpiration =
      expirationFilter === "all" ||
      (expirationFilter === "expiring_soon" &&
        daysToExpire !== null &&
        daysToExpire > 0 &&
        daysToExpire <= 7) ||
      (expirationFilter === "expiring_today" && daysToExpire === 0);
    return matchSearch && matchStatus && matchExpiration;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-border">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Construction className="size-4" />
            AndCheck • Andaimes
          </div>
          <h1 className={`${typography.pageTitle} text-foreground`}>
            Registro de Andaimes
          </h1>
          <p
            className={`mt-0.5 ${typography.sectionDescription} text-muted-foreground`}
          >
            {scaffolds.length} unidades cadastradas
          </p>
        </div>
        {canCreateScaffold && (
          <Link
            href="/andaimes/novo"
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-accent px-4 text-accent-foreground hover:bg-accent/90 ${typography.action}`}
          >
            <Plus className="w-3.5 h-3.5" />
            Cadastrar Andaime
          </Link>
        )}
      </div>

      <OfflineDataNotice
        active={isOfflineFallback}
        label="andaimes"
        lastCachedAt={lastCachedAt}
      />

      <MobileFilterPanel
        description="Busque e refine a lista de andaimes."
        summary={`${filtered.length}/${scaffolds.length} · ${statusFilter === "all" ? "Todos status" : statusFilter} · ${expirationFilter === "all" ? "Todos vencimentos" : expirationFilter}`}
      >
        <FilterShell
          title="Filtros"
          meta={`${filtered.length}/${scaffolds.length}`}
          contentClassName="grid gap-3 md:grid-cols-[1fr_180px_180px]"
        >
          <FilterField label="Busca">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <Input
              placeholder="Buscar por TAG, localização ou área..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-[11px] rounded-md border-border"
            />
          </div>
          </FilterField>
          <FilterField label="Status">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-full rounded-md text-[11px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="liberado">Liberado</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="reprovado">Reprovado</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="em_montagem">Em Montagem</SelectItem>
            </SelectContent>
          </Select>
          </FilterField>
          <FilterField label="Vencimento">
          <Select value={expirationFilter} onValueChange={setExpirationFilter}>
            <SelectTrigger className="h-8 w-full rounded-md text-[11px]">
              <SelectValue placeholder="Vencimento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Vencimentos</SelectItem>
              <SelectItem value="expiring_soon">
                Prestes a vencer (7 dias)
              </SelectItem>
              <SelectItem value="expiring_today">Vencendo hoje</SelectItem>
            </SelectContent>
          </Select>
          </FilterField>
        </FilterShell>
      </MobileFilterPanel>

      {filtered.length !== scaffolds.length && (
        <p className={`${typography.panelSubtitle} text-muted-foreground`}>
          {filtered.length} resultado(s) filtrado(s)
        </p>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Construction}
          title="Nenhum andaime encontrado"
          description="Cadastre o primeiro ativo para iniciar o controle operacional do ciclo de vida."
          action={
            canCreateScaffold ? (
            <Link
              href="/andaimes/novo"
              className={`inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-accent-foreground ${typography.action}`}
            >
              <Plus className="w-3.5 h-3.5" />
              Cadastrar
            </Link>
            ) : null
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="andcheck-long-list grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((scaffold) => {
              const tone =
                SEMANTIC_TONE_CLASSES[scaffoldStatusTone(scaffold.status)];
              return (
                <Link
                  key={scaffold.id}
                  href={"/andaimes/" + scaffold.id}
                  className={`group andcheck-lift andcheck-icon-nudge flex min-h-40 flex-col rounded-lg border border-border bg-card p-3 shadow-sm ring-1 hover:bg-primary/5 ${tone.border}`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`${typography.code} text-foreground`}>
                        {scaffold.code}
                      </p>
                      <p
                        className={`mt-1 truncate text-muted-foreground ${typography.sectionDescription}`}
                      >
                        {TYPE_LABELS[scaffold.type] ?? scaffold.type}
                        {scaffold.height ? ` · ${scaffold.height}m` : ""}
                      </p>
                    </div>
                    <StatusBadge status={scaffold.status} />
                  </div>

                  <div className="grid flex-1 gap-2">
                    <CardMeta
                      icon={MapPin}
                      label="Localização"
                      value={scaffold.location || "Sem localização"}
                    />
                    <>
                      <CardMeta
                        icon={Construction}
                        label="Área"
                        value={scaffold.area || "Sem área"}
                      />
                      <CardMeta
                        icon={Calendar}
                        label="Validade"
                        value={
                          scaffold.validity_date
                            ? format(
                                parseISO(scaffold.validity_date),
                                "dd/MM/yyyy",
                              )
                            : "—"
                        }
                      />
                    </>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span
                      className={`${typography.action} text-muted-foreground`}
                    >
                      {scaffold._count.inspections}{" "}
                      {scaffold._count.inspections === 1
                        ? "inspeção"
                        : "inspeções"}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground/30 transition-colors group-hover:text-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
          <p className={`${typography.panelSubtitle} text-muted-foreground/40`}>
            {filtered.length} registro(s) · Documento Controlado · AndCheck
          </p>
        </div>
      )}
    </div>
  );
}

function CardMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/40" />
      <div className="min-w-0">
        <p className={`${typography.panelSubtitle} text-muted-foreground/50`}>
          {label}
        </p>
        <p className={`truncate text-muted-foreground ${typography.bodyMuted}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
