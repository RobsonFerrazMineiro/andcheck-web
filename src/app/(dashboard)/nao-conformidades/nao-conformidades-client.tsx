"use client";

import { format, isPast, parseISO } from "date-fns";
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  ClipboardList,
  Filter,
  Search,
  User,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type NonConformityRow = {
  id: string;
  code: string;
  title: string;
  description: string;
  classification: string;
  status: string;
  companyId: string | null;
  dueDate: string | null;
  closedAt: string | null;
  createdAt: string;
  scaffold: {
    id: string;
    code: string;
    area: string;
    location: string;
    company: string | null;
  };
  originInspection: {
    id: string;
    date: string;
    result: string;
    inspector_name: string;
  };
  responsibleUser: {
    id: string;
    name: string;
    company: string | null;
  } | null;
  _count: {
    checklistItems: number;
    evidences: number;
    history: number;
  };
};

const CLASSIFICATION_LABELS: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Critica",
};

const CLASSIFICATION_STYLE: Record<string, string> = {
  LOW: "bg-slate-50 text-slate-700 border-slate-300",
  MEDIUM: "bg-amber-50 text-amber-800 border-amber-400/60",
  HIGH: "bg-orange-50 text-orange-800 border-orange-400/60",
  CRITICAL: "bg-red-100 text-red-900 border-red-600/70",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberta",
  ASSIGNED: "Em Correcao",
  IN_PROGRESS: "Em Tratamento",
  PENDING_VERIFICATION: "Aguardando Verificacao",
  CLOSED: "Encerrada",
  REJECTED: "Rejeitada",
  CANCELLED: "Cancelada",
};

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-blue-50 text-blue-800 border-blue-400/60",
  ASSIGNED: "bg-amber-50 text-amber-800 border-amber-400/60",
  IN_PROGRESS: "bg-amber-50 text-amber-800 border-amber-400/60",
  PENDING_VERIFICATION: "bg-purple-50 text-purple-800 border-purple-400/60",
  CLOSED: "bg-emerald-50 text-emerald-800 border-emerald-400/60",
  REJECTED: "bg-red-50 text-red-800 border-red-400/60",
  CANCELLED: "bg-slate-100 text-slate-600 border-slate-400/60",
};

function isOverdue(nc: NonConformityRow) {
  if (!nc.dueDate || ["CLOSED", "CANCELLED"].includes(nc.status)) return false;
  return isPast(parseISO(nc.dueDate));
}

function Badge({
  value,
  labels,
  styles,
}: {
  value: string;
  labels: Record<string, string>;
  styles: Record<string, string>;
}) {
  return (
    <span
      className={
        "inline-flex items-center border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest " +
        (styles[value] ?? "bg-slate-50 text-slate-600 border-slate-300")
      }
    >
      {labels[value] ?? value}
    </span>
  );
}

export function NaoConformidadesClient({
  initialData,
}: {
  initialData: NonConformityRow[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [classificationFilter, setClassificationFilter] = useState("all");
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState("all");

  const companies = useMemo(
    () =>
      Array.from(
        new Set(
          initialData
            .map((nc) => nc.companyId ?? nc.scaffold.company)
            .filter((company): company is string => Boolean(company)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [initialData],
  );

  const responsibles = useMemo(
    () =>
      Array.from(
        new Set(
          initialData
            .map((nc) => nc.responsibleUser?.name)
            .filter((name): name is string => Boolean(name)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [initialData],
  );

  const filtered = initialData.filter((nc) => {
    const company = nc.companyId ?? nc.scaffold.company ?? "-";
    const responsible = nc.responsibleUser?.name ?? "-";
    const text = [
      nc.code,
      nc.title,
      nc.description,
      nc.scaffold.code,
      nc.scaffold.area,
      nc.scaffold.location,
      company,
      responsible,
    ]
      .join(" ")
      .toLowerCase();

    const now = new Date();
    const dueDate = nc.dueDate ? parseISO(nc.dueDate) : null;
    const daysUntilDue = dueDate
      ? (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      : null;
    const overdue = isOverdue(nc);
    const dueNext7Days =
      !!dueDate &&
      !["CLOSED", "CANCELLED"].includes(nc.status) &&
      !overdue &&
      daysUntilDue !== null &&
      daysUntilDue <= 7;

    const matchSearch = !search || text.includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || nc.status === statusFilter;
    const matchCompany = companyFilter === "all" || company === companyFilter;
    const matchClassification =
      classificationFilter === "all" ||
      nc.classification === classificationFilter;
    const matchResponsible =
      responsibleFilter === "all" || responsible === responsibleFilter;
    const matchDue =
      dueFilter === "all" ||
      (dueFilter === "overdue" && overdue) ||
      (dueFilter === "due7" && dueNext7Days);

    return (
      matchSearch &&
      matchStatus &&
      matchCompany &&
      matchClassification &&
      matchResponsible &&
      matchDue
    );
  });

  const abertas = initialData.filter((nc) => nc.status === "OPEN").length;
  const emTratamento = initialData.filter((nc) =>
    ["ASSIGNED", "IN_PROGRESS", "REJECTED"].includes(nc.status),
  ).length;
  const criticas = initialData.filter(
    (nc) => nc.classification === "CRITICAL",
  ).length;
  const vencidas = initialData.filter(isOverdue).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-border">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            AndCheck EHS · Controle de Tratativas
          </p>
          <h1 className="text-[18px] font-bold text-foreground tracking-tight uppercase">
            Nao Conformidades
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {initialData.length} registro(s) de NC no sistema
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "NCs Abertas",
            value: abertas,
            color: "text-blue-600",
            bg: "bg-blue-50 border-blue-200",
            bar: "border-l-blue-600",
          },
          {
            label: "Em Tratamento",
            value: emTratamento,
            color: "text-amber-600",
            bg: "bg-amber-50 border-amber-200",
            bar: "border-l-amber-500",
          },
          {
            label: "Criticas",
            value: criticas,
            color: "text-red-700",
            bg: "bg-red-50 border-red-200",
            bar: "border-l-red-700",
          },
          {
            label: "Vencidas",
            value: vencidas,
            color: "text-slate-700",
            bg: "bg-slate-50 border-slate-300",
            bar: "border-l-slate-700",
          },
        ].map((card) => (
          <div
            key={card.label}
            className={
              "border border-l-4 p-3 text-center " + card.bg + " " + card.bar
            }
          >
            <p className={"text-[26px] font-black font-mono " + card.color}>
              {card.value}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border shadow-sm p-3 grid grid-cols-1 lg:grid-cols-[1.4fr_170px_170px_170px_170px_140px] gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <Input
            placeholder="Buscar por codigo, andaime, empresa ou responsavel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-[11px] rounded-none border-border"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-[11px] rounded-none">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/50" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="h-8 text-[11px] rounded-none">
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas empresas</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company} value={company}>
                {company}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={classificationFilter}
          onValueChange={setClassificationFilter}
        >
          <SelectTrigger className="h-8 text-[11px] rounded-none">
            <SelectValue placeholder="Classificacao" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas classes</SelectItem>
            {Object.entries(CLASSIFICATION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
          <SelectTrigger className="h-8 text-[11px] rounded-none">
            <SelectValue placeholder="Responsavel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos responsaveis</SelectItem>
            {responsibles.map((responsible) => (
              <SelectItem key={responsible} value={responsible}>
                {responsible}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dueFilter} onValueChange={setDueFilter}>
          <SelectTrigger className="h-8 text-[11px] rounded-none">
            <SelectValue placeholder="Vencimento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos prazos</SelectItem>
            <SelectItem value="overdue">Vencidas</SelectItem>
            <SelectItem value="due7">Vence em 7 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length !== initialData.length && (
        <p className="text-[9px] text-muted-foreground uppercase tracking-widest">
          {filtered.length} resultado(s) filtrado(s)
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="bg-card border border-border p-14 text-center">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Nenhuma nao conformidade encontrada
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            As NCs geradas por inspecoes reprovadas aparecerao nesta listagem.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border shadow-sm overflow-hidden">
          <div className="hidden xl:grid grid-cols-12 gap-4 px-4 py-2.5 bg-primary border-b border-border">
            {[
              "Codigo",
              "Data",
              "Andaime",
              "Empresa",
              "Classificacao",
              "Responsavel",
              "Prazo",
              "Status",
              "",
            ].map((h, i) => (
              <p
                key={i}
                className={
                  "text-[9px] font-bold uppercase tracking-widest text-primary-foreground/60 " +
                  (i === 0
                    ? "col-span-1"
                    : i === 1
                      ? "col-span-1"
                      : i === 2
                        ? "col-span-2"
                        : i === 3
                          ? "col-span-2"
                          : i === 4
                            ? "col-span-1"
                            : i === 5
                              ? "col-span-2"
                              : i === 6
                                ? "col-span-1"
                                : i === 7
                                  ? "col-span-1"
                                  : "col-span-1")
                }
              >
                {h}
              </p>
            ))}
          </div>
          <div className="divide-y divide-border">
            {filtered.map((nc, index) => {
              const company = nc.companyId ?? nc.scaffold.company ?? "-";
              const responsible = nc.responsibleUser?.name ?? "-";
              const overdue = isOverdue(nc);

              return (
                <Link
                  key={nc.id}
                  href={"/nao-conformidades/" + nc.id}
                  className={
                    "flex xl:grid xl:grid-cols-12 xl:gap-4 items-center px-4 py-3 hover:bg-primary/5 transition-colors group " +
                    (index % 2 === 1 ? "bg-muted/20" : "bg-card")
                  }
                >
                  <div className="flex items-center gap-3 flex-1 xl:contents">
                    <div className="w-7 h-7 bg-primary/8 flex items-center justify-center shrink-0 xl:hidden">
                      <AlertTriangle className="w-3.5 h-3.5 text-primary/40" />
                    </div>
                    <div className="flex-1 xl:contents min-w-0">
                      <p className="xl:col-span-1 font-bold text-[11px] font-mono text-foreground">
                        {nc.code}
                      </p>
                      <div className="xl:col-span-1 hidden xl:flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                        <p className="text-[11px] text-muted-foreground">
                          {format(parseISO(nc.createdAt), "dd/MM/yy")}
                        </p>
                      </div>
                      <div className="xl:col-span-2 min-w-0">
                        <p className="text-[11px] font-semibold text-foreground truncate">
                          {nc.scaffold.code}
                        </p>
                        <p className="text-[9px] text-muted-foreground truncate">
                          {nc.scaffold.area}
                        </p>
                      </div>
                      <p className="xl:col-span-2 hidden xl:block text-[11px] text-muted-foreground truncate">
                        {company}
                      </p>
                      <div className="hidden xl:flex xl:col-span-1 items-center">
                        <Badge
                          value={nc.classification}
                          labels={CLASSIFICATION_LABELS}
                          styles={CLASSIFICATION_STYLE}
                        />
                      </div>
                      <div className="xl:col-span-2 hidden xl:flex items-center gap-1">
                        <User className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                        <p className="text-[11px] text-muted-foreground truncate">
                          {responsible}
                        </p>
                      </div>
                      <p
                        className={
                          "hidden xl:block xl:col-span-1 text-[11px] font-mono " +
                          (overdue ? "text-red-700 font-bold" : "text-muted-foreground")
                        }
                      >
                        {nc.dueDate
                          ? format(parseISO(nc.dueDate), "dd/MM/yy")
                          : "-"}
                      </p>
                      <div className="hidden xl:flex xl:col-span-1 items-center">
                        <Badge
                          value={nc.status}
                          labels={STATUS_LABELS}
                          styles={STATUS_STYLE}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 xl:col-span-1 xl:justify-end">
                      <div className="xl:hidden">
                        <Badge
                          value={nc.status}
                          labels={STATUS_LABELS}
                          styles={STATUS_STYLE}
                        />
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="px-4 py-2 bg-muted/30 border-t border-border">
            <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">
              {filtered.length} registro(s) · Controle de tratativas · AndCheck
              EHS
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
