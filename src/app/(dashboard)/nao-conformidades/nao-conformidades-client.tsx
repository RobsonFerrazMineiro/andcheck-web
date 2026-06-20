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
import { surface, typography } from "@/lib/design-system";

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
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

const CLASSIFICATION_STYLE: Record<string, string> = {
  LOW: "bg-slate-50 text-slate-700 border-slate-300",
  MEDIUM: "bg-amber-50 text-amber-800 border-amber-400/60",
  HIGH: "bg-orange-50 text-orange-800 border-orange-400/60",
  CRITICAL: "bg-red-100 text-red-900 border-red-600/70",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberta",
  ASSIGNED: "Em Correção",
  IN_PROGRESS: "Em Tratamento",
  PENDING_VERIFICATION: "Aguardando Verificação",
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
        `inline-flex items-center rounded-md border px-2 py-0.5 ${typography.badge} ` +
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
          <p className={`${typography.pageEyebrow} mb-1 text-muted-foreground`}>
            AndCheck EHS · Controle de Tratativas
          </p>
          <h1 className={`${typography.pageTitle} text-foreground`}>
            Não Conformidades
          </h1>
          <p className={`mt-0.5 ${typography.sectionDescription} text-muted-foreground`}>
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
            label: "Críticas",
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
              "border border-l-4 rounded-lg p-3 text-center " + card.bg + " " + card.bar
            }
          >
            <p className={`${typography.operationalValue} ${card.color}`}>
              {card.value}
            </p>
            <p className={`${typography.sectionLabel} text-muted-foreground`}>
              {card.label}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm p-3 grid grid-cols-1 lg:grid-cols-[1.4fr_170px_170px_170px_170px_140px] gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <Input
            placeholder="Buscar por código, andaime, empresa ou responsável..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-[11px] rounded-md border-border"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-[11px] rounded-md">
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
          <SelectTrigger className="h-8 text-[11px] rounded-md">
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
          <SelectTrigger className="h-8 text-[11px] rounded-md">
            <SelectValue placeholder="Classificação" />
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
          <SelectTrigger className="h-8 text-[11px] rounded-md">
            <SelectValue placeholder="Responsável" />
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
          <SelectTrigger className="h-8 text-[11px] rounded-md">
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
        <p className={`${typography.panelSubtitle} text-muted-foreground`}>
          {filtered.length} resultado(s) filtrado(s)
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-14 text-center">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className={`mb-1 text-muted-foreground ${typography.emptyState}`}>
            Nenhuma não conformidade encontrada
          </p>
          <p className={`${typography.bodyMuted} text-muted-foreground/60`}>
            As NCs geradas por inspeções reprovadas aparecerao nesta listagem.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <div className={`hidden grid-cols-12 gap-4 border-b border-border xl:grid ${surface.tableHeader}`}>
            {[
              "Código",
              "Data",
              "Andaime",
              "Empresa",
              "Classificação",
              "Responsável",
              "Prazo",
              "Status",
              "",
            ].map((h, i) => (
              <p
                key={i}
                className={
                  "text-primary-foreground/60 " +
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
                      <p className={`xl:col-span-1 text-foreground ${typography.code}`}>
                        {nc.code}
                      </p>
                      <div className="xl:col-span-1 hidden xl:flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                        <p className={`${typography.sectionDescription} text-muted-foreground`}>
                          {format(parseISO(nc.createdAt), "dd/MM/yy")}
                        </p>
                      </div>
                      <div className="xl:col-span-2 min-w-0">
                        <p className={`truncate text-foreground ${typography.bodyStrong}`}>
                          {nc.scaffold.code}
                        </p>
                        <p className={`truncate text-muted-foreground ${typography.panelSubtitle}`}>
                          {nc.scaffold.area}
                        </p>
                      </div>
                      <p className={`hidden truncate text-muted-foreground xl:col-span-2 xl:block ${typography.sectionDescription}`}>
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
                        <p className={`truncate text-muted-foreground ${typography.sectionDescription}`}>
                          {responsible}
                        </p>
                      </div>
                      <p
                        className={
                          `hidden xl:block xl:col-span-1 ${typography.codeMuted} ` +
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
            <p className={`${typography.panelSubtitle} text-muted-foreground/40`}>
              {filtered.length} registro(s) · Controle de tratativas · AndCheck
              EHS
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
