"use client";

import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import {
  Calendar,
  ChevronRight,
  ClipboardCheck,
  Filter,
  Plus,
  Search,
  User,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
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
import {
  inspectionResultTone,
  SEMANTIC_TONE_CLASSES,
} from "@/lib/semantic-tones";

export type InspectionRow = {
  id: string;
  scaffold_id: string;
  scaffold_code: string;
  date: string;
  inspector_name: string;
  result: string;
  validity_days: number;
  notes: string | null;
};

export function InspecoesClient({
  initialData,
  canCreateInspection,
}: {
  initialData: InspectionRow[];
  canCreateInspection: boolean;
}) {
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("all");
  const [expirationFilter, setExpirationFilter] = useState("all");

  const inspections = initialData;
  const today = new Date();
  const filtered = inspections.filter((i) => {
    const matchSearch =
      !search ||
      i.scaffold_code.toLowerCase().includes(search.toLowerCase()) ||
      i.inspector_name.toLowerCase().includes(search.toLowerCase());
    const matchResult = resultFilter === "all" || i.result === resultFilter;
    const expiresAt =
      i.validity_days > 0 ? addDays(parseISO(i.date), i.validity_days) : null;
    const daysToExpire = expiresAt
      ? differenceInCalendarDays(expiresAt, today)
      : null;
    const matchExpiration =
      expirationFilter === "all" ||
      (expirationFilter === "expiring_soon" &&
        daysToExpire !== null &&
        daysToExpire > 0 &&
        daysToExpire <= 7) ||
      (expirationFilter === "expiring_today" && daysToExpire === 0);
    return matchSearch && matchResult && matchExpiration;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-border">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <ClipboardCheck className="size-4" />
            AndCheck • Inspeções
          </div>
          <h1 className={`${typography.pageTitle} text-foreground`}>
            Histórico de Inspeções
          </h1>
          <p
            className={`mt-0.5 ${typography.sectionDescription} text-muted-foreground`}
          >
            {inspections.length} registros no sistema
          </p>
        </div>
        {canCreateInspection && (
          <Link
            href="/inspecoes/nova"
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-accent px-4 text-accent-foreground hover:bg-accent/90 ${typography.action}`}
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Inspeção
          </Link>
        )}
      </div>

      <MobileFilterPanel
        description="Busque e refine o histórico de inspeções."
        summary={`${filtered.length}/${inspections.length} · ${resultFilter === "all" ? "Todos resultados" : resultFilter} · ${expirationFilter === "all" ? "Todos vencimentos" : expirationFilter}`}
      >
        <div className="grid gap-2 rounded-lg border border-border bg-card p-3 shadow-sm md:grid-cols-[1fr_180px_180px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <Input
              placeholder="Buscar por andaime (TAG) ou inspetor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-[11px] rounded-md border-border"
            />
          </div>
          <Select value={resultFilter} onValueChange={setResultFilter}>
            <SelectTrigger className="h-8 w-full rounded-md text-[11px]">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/50" />
              <SelectValue placeholder="Resultado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Resultados</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="aprovado_com_ressalvas">
                Com Ressalvas
              </SelectItem>
              <SelectItem value="reprovado">Reprovado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={expirationFilter} onValueChange={setExpirationFilter}>
            <SelectTrigger className="h-8 w-full rounded-md text-[11px]">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/50" />
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
        </div>
      </MobileFilterPanel>

      {filtered.length !== inspections.length && (
        <p className={`${typography.panelSubtitle} text-muted-foreground`}>
          {filtered.length} resultado(s) filtrado(s)
        </p>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Nenhuma inspeção encontrada"
          description="Registre a primeira vistoria para iniciar o histórico técnico do andaime."
          action={
            canCreateInspection ? (
            <Link
              href="/inspecoes/nova"
              className={`inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-accent-foreground ${typography.action}`}
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Inspeção
            </Link>
            ) : null
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="andcheck-long-list grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((insp) => {
              const tone =
                SEMANTIC_TONE_CLASSES[inspectionResultTone(insp.result)];
              return (
                <Link
                  key={insp.id}
                  href={"/inspecoes/" + insp.id}
                  className={`group andcheck-lift andcheck-icon-nudge flex min-h-48 flex-col rounded-lg border border-border bg-card p-3 shadow-sm ring-1 hover:bg-primary/5 sm:p-4 ${tone.border}`}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`${typography.code} text-foreground`}>
                        {insp.scaffold_code}
                      </p>
                      <p
                        className={`mt-1 text-muted-foreground ${typography.sectionDescription}`}
                      >
                        Inspeção realizada em{" "}
                        {format(parseISO(insp.date), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <StatusBadge status={insp.result} />
                  </div>

                  <div className="grid flex-1 gap-3">
                    <InspectionMeta
                      icon={User}
                      label="Inspetor"
                      value={insp.inspector_name || "Sem inspetor"}
                    />
                    <InspectionMeta
                      icon={Calendar}
                      label="Data"
                      value={format(parseISO(insp.date), "dd/MM/yyyy")}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <InspectionMetric
                        label="Validade"
                        value={
                          insp.validity_days > 0
                            ? format(
                                addDays(
                                  parseISO(insp.date),
                                  insp.validity_days,
                                ),
                                "dd/MM/yyyy",
                              )
                            : "—"
                        }
                      />
                      <InspectionMetric
                        label="Observação"
                        value={insp.notes ? "Com nota" : "Sem nota"}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span
                      className={`${typography.action} text-muted-foreground`}
                    >
                      Abrir inspeção
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

function InspectionMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
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

function InspectionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-muted/20 p-2.5">
      <p className={`${typography.panelSubtitle} text-muted-foreground/50`}>
        {label}
      </p>
      <p className={`mt-1 text-foreground ${typography.code}`}>{value}</p>
    </div>
  );
}
