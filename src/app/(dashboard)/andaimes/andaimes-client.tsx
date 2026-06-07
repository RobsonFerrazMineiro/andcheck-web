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
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            AndCheck EHS · Gestão de Ativos
          </p>
          <h1 className="text-[18px] font-bold text-foreground tracking-tight uppercase">
            Registro de Andaimes
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {scaffolds.length} unidades cadastradas
          </p>
        </div>
        {canCreateScaffold && (
          <Link
            href="/andaimes/novo"
            className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground text-[10px] font-bold uppercase tracking-widest h-8 px-4 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Cadastrar Andaime
          </Link>
        )}
      </div>

      <div className="bg-card border border-border shadow-sm p-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <Input
            placeholder="Buscar por TAG, localização ou área..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-[11px] rounded-none border-border"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 h-8 text-[11px] rounded-none">
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
        <p className="text-[9px] text-muted-foreground uppercase tracking-widest">
          {filtered.length} resultado(s) filtrado(s)
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="bg-card border border-border p-14 text-center">
          <Construction className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Nenhum andaime encontrado
          </p>
          <p className="text-[10px] text-muted-foreground/60 mb-4">
            Cadastre o primeiro ativo para iniciar o controle
          </p>
          {canCreateScaffold && (
            <Link
              href="/andaimes/novo"
              className="inline-flex items-center gap-1.5 bg-accent text-accent-foreground text-[10px] uppercase tracking-widest px-3 h-8"
            >
              <Plus className="w-3.5 h-3.5" />
              Cadastrar
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border shadow-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2.5 bg-primary border-b border-border">
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
                  "text-[9px] font-bold uppercase tracking-widest text-primary-foreground/60 " +
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
                    <p className="md:col-span-2 font-bold text-[12px] font-mono text-foreground">
                      {scaffold.code}
                    </p>
                    <p className="md:col-span-2 text-[11px] text-muted-foreground">
                      {TYPE_LABELS[scaffold.type] ?? scaffold.type}
                      {scaffold.height && (
                        <span className="text-muted-foreground/40 ml-1">
                          · {scaffold.height}m
                        </span>
                      )}
                    </p>
                    <div className="md:col-span-3 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground/30 shrink-0 hidden md:block" />
                      <p className="text-[11px] text-muted-foreground truncate">
                        {scaffold.location}
                      </p>
                    </div>
                    <p className="hidden md:block md:col-span-2 text-[11px] text-muted-foreground font-mono">
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
            <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">
              {filtered.length} registro(s) · Documento Controlado · AndCheck
              EHS
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
