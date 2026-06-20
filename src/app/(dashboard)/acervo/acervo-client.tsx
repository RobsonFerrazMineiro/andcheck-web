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
}: {
  icon: typeof Archive;
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className={`border border-l-4 bg-card rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={`${typography.sectionLabel} text-muted-foreground`}>
            {label}
          </p>
          <p className={`mt-1 text-foreground ${typography.kpiValue}`}>
            {value}
          </p>
        </div>
        <Icon className="size-5 text-muted-foreground" />
      </div>
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
  const [areaFilter, setAreaFilter] = useState("all");
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
          <p className={`mb-1 text-muted-foreground ${typography.pageEyebrow}`}>
            AndCheck EHS - Historico operacional
          </p>
          <h1 className={`${typography.pageTitle} text-foreground`}>
            Acervo de Andaimes
          </h1>
          <p className={`mt-0.5 text-muted-foreground ${typography.sectionDescription}`}>
            Consulta historica de andaimes desmontados.
          </p>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi
          icon={Archive}
          label="Total de Andaimes"
          value={total}
          className="border-slate-200 border-l-slate-500"
        />
        <Kpi
          icon={CheckCircle2}
          label="Desmontados"
          value={total}
          className="border-green-200 border-l-green-500 bg-green-50"
        />
        <Kpi
          icon={AlertTriangle}
          label="Com Tratativas"
          value={withNc}
          className="border-red-200 border-l-red-500 bg-red-50"
        />
        <Kpi
          icon={FileText}
          label="Com Documentacao"
          value={withDocuments}
          className="border-slate-200 border-l-slate-500 bg-slate-50"
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-2 rounded-lg border border-border bg-card p-3 shadow-sm md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[1.2fr_160px_160px_140px_130px_130px_140px_160px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            placeholder="Buscar por TAG, area, empresa ou workspace..."
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
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="h-8 rounded-md text-[11px]">
            <SelectValue placeholder="Area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas areas</SelectItem>
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
        <div className={`hidden grid-cols-[minmax(140px,1.1fr)_minmax(80px,0.7fr)_minmax(120px,1fr)_minmax(170px,1.2fr)_minmax(125px,0.9fr)_minmax(105px,0.8fr)_minmax(72px,0.55fr)_minmax(64px,0.5fr)_24px] gap-4 border-b border-border xl:grid ${surface.tableHeader}`}>
          {[
            "TAG",
            "Area",
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
          <div className="flex flex-col items-center justify-center p-14 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-lg border border-border bg-muted/30">
              <Archive className="size-6 text-muted-foreground/40" />
            </div>
            <p className={`mb-1 text-foreground ${typography.emptyState}`}>
              Nenhum andaime desmontado encontrado
            </p>
            <p className={`max-w-sm leading-relaxed text-muted-foreground ${typography.sectionDescription}`}>
              Os andaimes desmontados serao armazenados automaticamente neste
              acervo para consulta historica.
            </p>
            <Button asChild variant="outline" className="mt-4 rounded-md">
              <Link href="/andaimes">Voltar para Andaimes</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((row, index) => (
              <Link
                key={row.id}
                href={`/acervo/${encodeURIComponent(row.code)}`}
                className={`flex items-center px-4 py-3 transition-colors hover:bg-primary/5 group xl:grid xl:grid-cols-[minmax(140px,1.1fr)_minmax(80px,0.7fr)_minmax(120px,1fr)_minmax(170px,1.2fr)_minmax(125px,0.9fr)_minmax(105px,0.8fr)_minmax(72px,0.55fr)_minmax(64px,0.5fr)_24px] xl:gap-4 ${
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
                    <p className={`${typography.sectionDescription} text-muted-foreground`}>
                      {row.area || "-"}
                    </p>
                    <p className={`hidden truncate text-muted-foreground xl:block ${typography.sectionDescription}`}>
                      {row.companyName || "-"}
                    </p>
                    <p className={`hidden truncate text-muted-foreground xl:block ${typography.sectionDescription}`}>
                      {row.workspaceName || "-"}
                    </p>
                    <div className="hidden xl:flex xl:items-center">
                      <StatusBadge status="desmontado" />
                    </div>
                    <p className={`hidden text-muted-foreground xl:block ${typography.code}`}>
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
        <div className={`border-t bg-muted/30 px-4 py-2 text-muted-foreground/50 ${typography.panelSubtitle}`}>
          {filtered.length} registro(s) - Acervo de andaimes
        </div>
      </div>
    </div>
  );
}
