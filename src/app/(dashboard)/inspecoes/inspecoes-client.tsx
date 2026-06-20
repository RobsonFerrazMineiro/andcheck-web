"use client";

import { format, parseISO } from "date-fns";
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

import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { surface, typography } from "@/lib/design-system";

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

  const inspections = initialData;
  const filtered = inspections.filter((i) => {
    const matchSearch =
      !search ||
      i.scaffold_code.toLowerCase().includes(search.toLowerCase()) ||
      i.inspector_name.toLowerCase().includes(search.toLowerCase());
    const matchResult = resultFilter === "all" || i.result === resultFilter;
    return matchSearch && matchResult;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-border">
        <div>
          <p className={`${typography.pageEyebrow} mb-1 text-muted-foreground`}>
            AndCheck EHS Â· Registros TÃ©cnicos
          </p>
          <h1 className={`${typography.pageTitle} text-foreground`}>
            HistÃ³rico de InspeÃ§Ãµes
          </h1>
          <p className={`mt-0.5 ${typography.sectionDescription} text-muted-foreground`}>
            {inspections.length} registros no sistema
          </p>
        </div>
        {canCreateInspection && (
          <Link
          href="/inspecoes/nova"
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-accent px-4 text-accent-foreground hover:bg-accent/90 ${typography.action}`}
        >
          <Plus className="w-3.5 h-3.5" />
          Nova InspeÃ§Ã£o
          </Link>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm p-3 flex flex-col sm:flex-row gap-2">
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
          <SelectTrigger className="w-full sm:w-48 h-8 text-[11px] rounded-md">
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
      </div>

      {filtered.length !== inspections.length && (
        <p className={`${typography.panelSubtitle} text-muted-foreground`}>
          {filtered.length} resultado(s) filtrado(s)
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-14 text-center">
          <ClipboardCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className={`mb-1 text-muted-foreground ${typography.emptyState}`}>
            Nenhuma inspeÃ§Ã£o encontrada
          </p>
          <p className={`mb-4 text-muted-foreground/60 ${typography.bodyMuted}`}>
            Registre a primeira vistoria para iniciar o histÃ³rico
          </p>
          {canCreateInspection && (
            <Link
            href="/inspecoes/nova"
            className={`inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-accent-foreground ${typography.action}`}
          >
            <Plus className="w-3.5 h-3.5" />
            Nova InspeÃ§Ã£o
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <div className={`hidden grid-cols-12 gap-4 border-b border-border md:grid ${surface.tableHeader}`}>
            {["Andaime", "Data", "Inspetor", "Validade", "Resultado", ""].map(
              (h, i) => (
                <p
                  key={i}
                  className={
                    "text-primary-foreground/60 " +
                    (i === 0
                      ? "col-span-2"
                      : i === 1
                        ? "col-span-2"
                        : i === 2
                          ? "col-span-4"
                          : i === 3
                            ? "col-span-1"
                            : i === 4
                              ? "col-span-2"
                              : "col-span-1")
                  }
                >
                  {h}
                </p>
              ),
            )}
          </div>
          <div className="divide-y divide-border">
            {filtered.map((insp, idx) => {
              return (
                <Link
                  key={insp.id}
                  href={"/inspecoes/" + insp.id}
                  className={
                    "flex md:grid md:grid-cols-12 md:gap-4 items-center px-4 py-3 hover:bg-primary/5 transition-colors group " +
                    (idx % 2 === 1 ? "bg-muted/20" : "bg-card")
                  }
                >
                  <div className="flex items-center gap-3 flex-1 md:contents">
                    <div className="w-7 h-7 bg-primary/8 flex items-center justify-center shrink-0 md:hidden">
                      <ClipboardCheck className="w-3.5 h-3.5 text-primary/40" />
                    </div>
                    <div className="flex-1 md:contents">
                      <p className={`md:col-span-2 text-foreground ${typography.code}`}>
                        {insp.scaffold_code}
                      </p>
                      <div className="md:col-span-2 hidden md:flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                        <p className={`${typography.sectionDescription} text-muted-foreground`}>
                          {format(parseISO(insp.date), "dd/MM/yyyy")}
                        </p>
                      </div>
                      <div className="md:col-span-4 hidden md:flex items-center gap-1">
                        <User className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                        <p className={`truncate text-muted-foreground ${typography.sectionDescription}`}>
                          {insp.inspector_name}
                        </p>
                      </div>
                      <p className={`hidden md:block md:col-span-1 text-muted-foreground ${typography.code}`}>
                        {insp.validity_days > 0
                          ? insp.validity_days + "d"
                          : "â€”"}
                      </p>
                      <div className="hidden md:flex md:col-span-2 items-center">
                        <StatusBadge status={insp.result} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="md:hidden">
                        <StatusBadge status={insp.result} />
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="px-4 py-2 bg-muted/30 border-t border-border">
            <p className={`${typography.panelSubtitle} text-muted-foreground/40`}>
              {filtered.length} registro(s) Â· Documento Controlado Â· AndCheck
              EHS
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
