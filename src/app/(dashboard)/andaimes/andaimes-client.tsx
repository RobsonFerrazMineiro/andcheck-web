"use client";

import { format, parseISO } from "date-fns";
import {
  ChevronRight,
  Construction,
  Filter,
  MapPin,
  Plus,
  Search,
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

  const scaffolds = initialData;
  const filtered = scaffolds.filter((s) => {
    const matchSearch =
      !search ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.location.toLowerCase().includes(search.toLowerCase()) ||
      s.area.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-border">
        <div>
          <p className={`${typography.pageEyebrow} mb-1 text-muted-foreground`}>
            AndCheck EHS · Gestão de Ativos
          </p>
          <h1 className={`${typography.pageTitle} text-foreground`}>
            Registro de Andaimes
          </h1>
          <p className={`mt-0.5 ${typography.sectionDescription} text-muted-foreground`}>
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

      <div className="bg-card border border-border shadow-sm rounded-lg p-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <Input
            placeholder="Buscar por TAG, localização ou área..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-[11px] rounded-md border-border"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 h-8 text-[11px] rounded-md">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/50" />
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
      </div>

      {filtered.length !== scaffolds.length && (
        <p className={`${typography.panelSubtitle} text-muted-foreground`}>
          {filtered.length} resultado(s) filtrado(s)
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-14 text-center">
          <Construction className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className={`mb-1 text-muted-foreground ${typography.emptyState}`}>
            Nenhum andaime encontrado
          </p>
          <p className={`mb-4 text-muted-foreground/60 ${typography.bodyMuted}`}>
            Cadastre o primeiro ativo para iniciar o controle
          </p>
          {canCreateScaffold && (
            <Link
              href="/andaimes/novo"
              className={`inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-accent-foreground ${typography.action}`}
            >
              <Plus className="w-3.5 h-3.5" />
              Cadastrar
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border shadow-sm rounded-lg overflow-hidden">
          <div className={`hidden grid-cols-12 gap-4 border-b border-border md:grid ${surface.tableHeader}`}>
            {[
              "TAG / Código",
              "Tipo",
              "Localização",
              "Validade",
              "Status",
              "",
            ].map((h, i) => (
              <p
                key={i}
                className={
                  "text-primary-foreground/60 " +
                  (i === 0
                    ? "col-span-2"
                    : i === 1
                      ? "col-span-2"
                      : i === 2
                        ? "col-span-3"
                        : i === 3
                          ? "col-span-2"
                          : i === 4
                            ? "col-span-2"
                            : "col-span-1")
                }
              >
                {h}
              </p>
            ))}
          </div>
          <div className="divide-y divide-border">
            {filtered.map((scaffold, idx) => (
              <Link
                key={scaffold.id}
                href={"/andaimes/" + scaffold.id}
                className={
                  "flex md:grid md:grid-cols-12 md:gap-4 items-center px-4 py-3 hover:bg-primary/5 transition-colors group " +
                  (idx % 2 === 1 ? "bg-muted/20" : "bg-card")
                }
              >
                <div className="flex items-center gap-3 flex-1 md:contents">
                  <div className="w-7 h-7 bg-primary/8 flex items-center justify-center shrink-0 md:hidden">
                    <Construction className="w-3.5 h-3.5 text-primary/40" />
                  </div>
                  <div className="flex-1 md:contents">
                    <p className={`md:col-span-2 text-foreground ${typography.code}`}>
                      {scaffold.code}
                    </p>
                    <p className={`md:col-span-2 text-muted-foreground ${typography.sectionDescription}`}>
                      {TYPE_LABELS[scaffold.type] ?? scaffold.type}
                      {scaffold.height && (
                        <span className="text-muted-foreground/40 ml-1">
                          · {scaffold.height}m
                        </span>
                      )}
                    </p>
                    <div className="md:col-span-3 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground/30 shrink-0 hidden md:block" />
                      <p className={`truncate text-muted-foreground ${typography.sectionDescription}`}>
                        {scaffold.location}
                      </p>
                    </div>
                    <p className={`hidden md:block md:col-span-2 text-muted-foreground ${typography.code}`}>
                      {scaffold.validity_date
                        ? format(parseISO(scaffold.validity_date), "dd/MM/yyyy")
                        : "—"}
                    </p>
                    <div className="hidden md:flex md:col-span-2 items-center">
                      <StatusBadge status={scaffold.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="md:hidden">
                      <StatusBadge status={scaffold.status} />
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="px-4 py-2 bg-muted/30 border-t border-border">
            <p className={`${typography.panelSubtitle} text-muted-foreground/40`}>
              {filtered.length} registro(s) · Documento Controlado · AndCheck
              EHS
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
