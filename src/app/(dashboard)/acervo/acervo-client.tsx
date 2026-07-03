"use client";

import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronRight,
  FileText,
  Filter,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { surface, typography } from "@/lib/design-system";

export type ArchiveScaffoldRow = {
  id: string;
  code: string;
  tag: string;
  area: string;
  companyName: string;
  workspaceName: string;
  dismantledAt: string | null;
  documentsCount: number;
  nonConformitiesCount: number;
};

function formatDate(value: string | null) {
  return value ? format(parseISO(value), "dd/MM/yyyy") : "-";
}

function Kpi({
  icon: Icon,
  label,
  value,
  className,
  iconClass = "text-muted-foreground",
  valueClass = "text-foreground",
}: {
  icon: typeof Archive;
  label: string;
  value: number;
  className: string;
  iconClass?: string;
  valueClass?: string;
}) {
  return (
    <div
      className={`andcheck-lift border border-l-4 bg-card rounded-lg p-4 shadow-sm ${className}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <p
          className={`${typography.sectionLabel} text-muted-foreground leading-tight`}
        >
          {label}
        </p>
        <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
      </div>
      <p className={`${typography.kpiValue} leading-none ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function CountBadge({
  icon: Icon,
  value,
  label,
  className,
}: {
  icon: typeof FileText;
  value: number;
  label: string;
  className: string;
}) {
  return (
    <Badge
      variant="outline"
      className={`inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 ${typography.badge} ${className}`}
    >
      <Icon className="size-2.5" />
      {value} {label}
    </Badge>
  );
}

export function AcervoClient({
  initialData,
}: {
  initialData: ArchiveScaffoldRow[];
}) {
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [areaFilter, setÁreaFilter] = useState("all");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [hasNcFilter, setHasNcFilter] = useState("all");
  const [hasDocsFilter, setHasDocsFilter] = useState("all");

  const companies = useMemo(
    () =>
      Array.from(new Set(initialData.map((row) => row.companyName)))
        .filter(Boolean)
        .sort(),
    [initialData],
  );
  const workspaces = useMemo(
    () =>
      Array.from(new Set(initialData.map((row) => row.workspaceName)))
        .filter(Boolean)
        .sort(),
    [initialData],
  );
  const areas = useMemo(
    () =>
      Array.from(new Set(initialData.map((row) => row.area)))
        .filter(Boolean)
        .sort(),
    [initialData],
  );

  const filtered = initialData.filter((row) => {
    const text = [
      row.code,
      row.tag,
      row.area,
      row.companyName,
      row.workspaceName,
    ]
      .join(" ")
      .toLowerCase();
    const dismantledDate = row.dismantledAt
      ? row.dismantledAt.slice(0, 10)
      : "";

    return (
      (!search || text.includes(search.toLowerCase())) &&
      (companyFilter === "all" || row.companyName === companyFilter) &&
      (workspaceFilter === "all" || row.workspaceName === workspaceFilter) &&
      (areaFilter === "all" || row.area === areaFilter) &&
      (!periodStart || (dismantledDate && dismantledDate >= periodStart)) &&
      (!periodEnd || (dismantledDate && dismantledDate <= periodEnd)) &&
      (hasNcFilter === "all" ||
        (hasNcFilter === "yes"
          ? row.nonConformitiesCount > 0
          : row.nonConformitiesCount === 0)) &&
      (hasDocsFilter === "all" ||
        (hasDocsFilter === "yes"
          ? row.documentsCount > 0
          : row.documentsCount === 0))
    );
  });

  const total = initialData.length;
  const withNc = initialData.filter(
    (row) => row.nonConformitiesCount > 0,
  ).length;
  const withDocuments = initialData.filter(
    (row) => row.documentsCount > 0,
  ).length;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-4 border-b-2 border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Archive className="size-4" />
            AndCheck • Acervo de Andaimes
          </div>
          <h1 className={`${typography.pageTitle} text-foreground`}>
            Acervo de Andaimes
          </h1>
          <p
            className={`mt-0.5 text-muted-foreground ${typography.sectionDescription}`}
          >
            Consulta historica de andaimes desmontados.
          </p>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          icon={Archive}
          label="Total de Andaimes"
          value={total}
          className="border-slate-200 border-l-slate-500"
          iconClass="text-slate-500"
          valueClass="text-slate-700"
        />
        <Kpi
          icon={CheckCircle2}
          label="Desmontados"
          value={total}
          className="border-green-200 border-l-green-500 bg-green-50/40"
          iconClass="text-green-600"
          valueClass="text-green-700"
        />
        <Kpi
          icon={AlertTriangle}
          label="Com Tratativas"
          value={withNc}
          className="border-red-200 border-l-red-500 bg-red-50/40"
          iconClass="text-red-500"
          valueClass="text-red-700"
        />
        <Kpi
          icon={FileText}
          label="Com Documentação"
          value={withDocuments}
          className="border-slate-200 border-l-slate-500 bg-slate-50/40"
          iconClass="text-slate-500"
          valueClass="text-slate-700"
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-2 rounded-lg border border-border bg-card p-3 shadow-sm md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[1.2fr_160px_160px_140px_130px_130px_140px_160px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            placeholder="Buscar por TAG, área, empresa ou workspace..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-8 rounded-md border-border pl-9 text-[11px]"
          />
        </div>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="h-8 rounded-md text-[11px]">
            <Filter className="mr-1.5 size-3.5 text-muted-foreground/50" />
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
        <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
          <SelectTrigger className="h-8 rounded-md text-[11px]">
            <SelectValue placeholder="Workspace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos workspaces</SelectItem>
            {workspaces.map((workspace) => (
              <SelectItem key={workspace} value={workspace}>
                {workspace}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={areaFilter} onValueChange={setÁreaFilter}>
          <SelectTrigger className="h-8 rounded-md text-[11px]">
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Áreas</SelectItem>
            {areas.map((area) => (
              <SelectItem key={area} value={area}>
                {area}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          aria-label="Periodo inicial"
          value={periodStart}
          onChange={(event) => setPeriodStart(event.target.value)}
          className="h-8 rounded-md border-border text-[11px]"
        />
        <Input
          type="date"
          aria-label="Periodo final"
          value={periodEnd}
          onChange={(event) => setPeriodEnd(event.target.value)}
          className="h-8 rounded-md border-border text-[11px]"
        />
        <Select value={hasNcFilter} onValueChange={setHasNcFilter}>
          <SelectTrigger className="h-8 rounded-md text-[11px]">
            <SelectValue placeholder="Possui NC" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">NCs: todos</SelectItem>
            <SelectItem value="yes">Com NC</SelectItem>
            <SelectItem value="no">Sem NC</SelectItem>
          </SelectContent>
        </Select>
        <Select value={hasDocsFilter} onValueChange={setHasDocsFilter}>
          <SelectTrigger className="h-8 rounded-md text-[11px]">
            <SelectValue placeholder="Possui documentos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Documentos: todos</SelectItem>
            <SelectItem value="yes">Com documentos</SelectItem>
            <SelectItem value="no">Sem documentos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div
          className={`hidden grid-cols-[minmax(140px,1.1fr)_minmax(80px,0.7fr)_minmax(120px,1fr)_minmax(170px,1.2fr)_minmax(125px,0.9fr)_minmax(105px,0.8fr)_minmax(72px,0.55fr)_minmax(64px,0.5fr)_24px] gap-4 border-b border-border xl:grid ${surface.tableHeader}`}
        >
          {[
            "TAG",
            "Área",
            "Empresa",
            "Workspace",
            "Status",
            "Desmontagem",
            "Docs",
            "NCs",
            "",
          ].map((header, index) => (
            <p
              key={header || `actions-${index}`}
              className="text-primary-foreground/60"
            >
              {header}
            </p>
          ))}
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Archive}
            title="Nenhum andaime desmontado encontrado"
            description="Os andaimes desmontados serao armazenados automaticamente neste acervo para consulta historica."
            className="border-0 border-b border-dashed"
            action={
              <Button asChild variant="outline" className="rounded-md">
                <Link href="/andaimes">Voltar para Andaimes</Link>
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((row, index) => (
              <Link
                key={row.id}
                href={`/acervo/${encodeURIComponent(row.code)}`}
                className={`group andcheck-motion andcheck-icon-nudge flex items-center px-4 py-3 hover:bg-primary/5 xl:grid xl:grid-cols-[minmax(140px,1.1fr)_minmax(80px,0.7fr)_minmax(120px,1fr)_minmax(170px,1.2fr)_minmax(125px,0.9fr)_minmax(105px,0.8fr)_minmax(72px,0.55fr)_minmax(64px,0.5fr)_24px] xl:gap-4 ${
                  index % 2 ? "bg-muted/20" : "bg-card"
                }`}
              >
                <div className="flex flex-1 items-center gap-3 xl:contents">
                  <div className="flex size-7 shrink-0 items-center justify-center bg-primary/8 xl:hidden">
                    <Archive className="size-3.5 text-primary/40" />
                  </div>
                  <div className="min-w-0 flex-1 xl:contents">
                    <p className={`text-foreground ${typography.code}`}>
                      {row.code}
                    </p>
                    <p
                      className={`${typography.sectionDescription} text-muted-foreground`}
                    >
                      {row.area || "-"}
                    </p>
                    <p
                      className={`hidden truncate text-muted-foreground xl:block ${typography.sectionDescription}`}
                    >
                      {row.companyName || "-"}
                    </p>
                    <p
                      className={`hidden truncate text-muted-foreground xl:block ${typography.sectionDescription}`}
                    >
                      {row.workspaceName || "-"}
                    </p>
                    <div className="hidden xl:flex xl:items-center">
                      <StatusBadge status="desmontado" />
                    </div>
                    <p
                      className={`hidden text-muted-foreground xl:block ${typography.code}`}
                    >
                      {formatDate(row.dismantledAt)}
                    </p>
                    <div className="hidden xl:flex xl:items-center">
                      <CountBadge
                        icon={FileText}
                        value={row.documentsCount}
                        label="DOCS"
                        className="border-slate-300 bg-slate-50 text-slate-700"
                      />
                    </div>
                    <div className="hidden xl:flex xl:items-center">
                      <CountBadge
                        icon={AlertTriangle}
                        value={row.nonConformitiesCount}
                        label="NC"
                        className="border-amber-300 bg-amber-50 text-amber-800"
                      />
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 xl:justify-end">
                    <div className="xl:hidden">
                      <StatusBadge status="desmontado" />
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground/20 group-hover:text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        <div
          className={`border-t bg-muted/30 px-4 py-2 text-muted-foreground/50 ${typography.panelSubtitle}`}
        >
          {filtered.length} registro(s) - Acervo de andaimes
        </div>
      </div>
    </div>
  );
}
