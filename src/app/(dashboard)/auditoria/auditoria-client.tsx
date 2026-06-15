"use client";

import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  FileClock,
  Filter,
  Search,
  ShieldCheck,
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

type AuditRow = {
  id: string;
  userName: string | null;
  userRole: string | null;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  action: string;
  description: string;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  workspaceId: string | null;
  companyId: string | null;
  createdAt: string;
};

type Filters = {
  search: string;
  action: string;
  entityType: string;
  user: string;
  company: string;
  dateFrom: string;
  dateTo: string;
};

const ACTION_LABELS: Record<string, string> = {
  COMPANY_CREATED: "Criou empresa",
  COMPANY_UPDATED: "Atualizou empresa",
  COMPANY_ACTIVATED: "Ativou empresa",
  COMPANY_DEACTIVATED: "Desativou empresa",
  CREATE: "Criou",
  UPDATE: "Atualizou",
  DELETE: "Removeu",
  STATUS_CHANGE: "Alterou status",
  SIGN: "Assinou",
  COMPLETE: "Concluiu",
  UPLOAD: "Anexou documento",
  DOWNLOAD: "Baixou",
  GENERATE_PDF: "Gerou PDF",
  VIEW_QR: "Consultou status do andaime",
  LOGIN: "Entrou no sistema",
  LOGOUT: "Saiu do sistema",
  ROLE_CHANGE: "Alterou perfil",
};

const ENTITY_LABELS: Record<string, string> = {
  COMPANY: "Empresa",
  USER: "Usuario",
  SCAFFOLD: "Andaime",
  INSPECTION: "Inspecao",
  DOCUMENT: "Documento tecnico",
  SIGNATURE: "Assinatura",
  PDF: "PDF",
  QR_CODE: "Status do andaime",
  SETTINGS: "Configuracao",
  NON_CONFORMITY: "Nao conformidade",
};

const ENTITY_ARTICLES: Record<string, string> = {
  COMPANY: "a empresa",
  USER: "o usuario",
  SCAFFOLD: "o andaime",
  INSPECTION: "a inspecao",
  DOCUMENT: "o documento tecnico",
  SIGNATURE: "a assinatura",
  PDF: "o PDF",
  QR_CODE: "o status do andaime",
  SETTINGS: "a configuracao",
  NON_CONFORMITY: "a nao conformidade",
};

const FIELD_LABELS: Record<string, string> = {
  area: "Area",
  assembly_completed_at: "Montagem concluida em",
  checklist_items: "Itens do checklist",
  classification: "Classificacao",
  code: "Codigo",
  company: "Empresa",
  companyId: "Empresa",
  closedAt: "Encerrada em",
  createdById: "Criado por",
  department: "Departamento",
  dismantled_at: "Desmontado em",
  dueDate: "Prazo",
  email: "E-mail",
  evidenceType: "Tipo de evidencia",
  failed_items: "Itens reprovados",
  fileName: "Arquivo",
  file_name: "Arquivo",
  inspection_id: "Inspecao",
  inspection_result: "Resultado da inspecao",
  inspector_name: "Inspetor",
  is_active: "Status",
  latitude: "Latitude",
  location: "Local",
  longitude: "Longitude",
  name: "Nome",
  originInspectionId: "Inspecao de origem",
  position: "Cargo",
  registration: "Matricula",
  released_at: "Liberado em",
  responsibleUserId: "Responsavel",
  result: "Resultado",
  role: "Perfil",
  role_code: "Perfil",
  scaffold_code: "Andaime",
  scaffold_id: "Andaime",
  signer_company: "Empresa do assinante",
  signer_name: "Assinante",
  signer_position: "Cargo do assinante",
  status: "Status",
  tag: "Tag",
  title: "Titulo",
  type: "Tipo",
  validity_date: "Validade",
  validity_days: "Validade em dias",
  warning_items: "Itens com ressalva",
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN_EMPRESA: "Admin Empresa",
  AUDITOR: "Auditor",
  HSE_EMPRESA: "HSE Empresa",
  HSE_GERENCIADORA: "HSE Gerenciadora",
  HSE_HYDRO: "HSE Hydro",
  MONTADOR_LIDER: "Montador Lider",
  PLANEJAMENTO: "Planejamento",
  SUPERVISOR: "Supervisor",
  ENCARREGADO: "Encarregado",
  SUPER_ADMIN: "Super Admin",
  SUPERVISOR_ENCARREGADO: "Supervisor/Encarregado",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  cancelled: "Cancelada",
  closed: "Encerrada",
  critical: "Critica",
  aprovado: "Aprovado",
  aprovado_com_ressalvas: "Aprovado com ressalvas",
  cl_fail: "Reprovado",
  cl_na: "Nao aplicavel",
  cl_ok: "Conforme",
  cl_warn: "Com ressalva",
  desmontado: "Desmontado",
  em_montagem: "Em montagem",
  inactive: "Inativo",
  in_progress: "Em tratamento",
  interditado: "Interditado",
  liberado: "Liberado",
  low: "Baixa",
  medium: "Media",
  open: "Aberta",
  pendente_liberacao: "Pendente de liberacao",
  pending_verification: "Aguardando verificacao",
  reprovado: "Reprovado",
  high: "Alta",
};

const ACTIONS = Object.keys(ACTION_LABELS);
const ENTITIES = Object.keys(ENTITY_LABELS);

function buildHref(filters: Filters, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/auditoria?${query}` : "/auditoria";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatJson(value: unknown) {
  if (value === null || value === undefined) return "-";
  return JSON.stringify(value, null, 2);
}

function labelAction(action: string) {
  return ACTION_LABELS[action] ?? action;
}

function labelEntity(entityType: string) {
  return ENTITY_LABELS[entityType] ?? entityType;
}

function entityDisplay(row: AuditRow) {
  const label = row.entityLabel ?? row.entityId ?? "-";

  switch (row.entityType) {
    case "USER":
      return `Usuario ${label}`;
    case "SCAFFOLD":
      return `Andaime ${label}`;
    case "INSPECTION":
      return `Inspecao ${label}`;
    case "DOCUMENT":
      return `Documento tecnico ${label}`;
    case "SIGNATURE":
      return `Assinatura ${label}`;
    case "PDF":
      return `PDF da inspecao ${label}`;
    case "QR_CODE":
      return `Status do andaime ${label}`;
    case "NON_CONFORMITY":
      return `Nao conformidade ${label}`;
    case "SETTINGS":
      return `Configuracao ${label}`;
    default:
      return `${labelEntity(row.entityType)} ${label}`;
  }
}

function companyDisplay(row: AuditRow) {
  if (row.companyId && row.workspaceId) return `${row.companyId} / ${row.workspaceId}`;
  return row.companyId ?? row.workspaceId ?? "-";
}

function normalizeToken(value: string) {
  return (
    ROLE_LABELS[value] ??
    STATUS_LABELS[value.toLowerCase()] ??
    value.replaceAll("_", " ")
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Ativo" : "Inativo";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? value
        : format(date, "dd/MM/yyyy HH:mm");
    }
    return normalizeToken(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "-";
    if (value.every((item) => ["string", "number", "boolean"].includes(typeof item))) {
      return value.map(formatValue).join(", ");
    }
    return `${value.length} registro(s)`;
  }
  if (isPlainObject(value)) {
    const compact = Object.entries(value)
      .filter(([, item]) => item !== null && item !== undefined && item !== "")
      .slice(0, 3)
      .map(([key, item]) => `${FIELD_LABELS[key] ?? key}: ${formatValue(item)}`);
    return compact.length ? compact.join(" | ") : "-";
  }
  return String(value);
}

function comparisonRows(row: AuditRow) {
  const oldObject = isPlainObject(row.oldValue) ? row.oldValue : {};
  const newObject = isPlainObject(row.newValue) ? row.newValue : {};
  const keys = Array.from(
    new Set([...Object.keys(oldObject), ...Object.keys(newObject)]),
  ).filter((key) => key !== "id");

  if (keys.length === 0) {
    return [
      {
        field: "Dados",
        before: formatValue(row.oldValue),
        after: formatValue(row.newValue),
      },
    ];
  }

  return keys.map((key) => ({
    field: FIELD_LABELS[key] ?? key.replaceAll("_", " "),
    before: formatValue(oldObject[key]),
    after: formatValue(newObject[key]),
  }));
}

function friendlyDescription(row: AuditRow) {
  const actor = row.userName ?? "Sistema";
  const entityLabel = row.entityLabel ?? row.entityId ?? "registro";
  const entity = ENTITY_ARTICLES[row.entityType] ?? "o registro";

  switch (row.action) {
    case "COMPANY_CREATED":
      return `${actor} criou a empresa ${entityLabel}.`;
    case "COMPANY_UPDATED":
      return `${actor} atualizou a empresa ${entityLabel}.`;
    case "COMPANY_ACTIVATED":
      return `${actor} ativou a empresa ${entityLabel}.`;
    case "COMPANY_DEACTIVATED":
      return `${actor} desativou a empresa ${entityLabel}.`;
    case "CREATE":
      return `${actor} criou ${entity} ${entityLabel}.`;
    case "UPDATE":
      return `${actor} atualizou ${entity} ${entityLabel}.`;
    case "DELETE":
      return `${actor} removeu ${entity} ${entityLabel}.`;
    case "STATUS_CHANGE":
      return `${actor} alterou o status de ${entity} ${entityLabel}.`;
    case "ROLE_CHANGE":
      return `${actor} alterou o perfil de ${entity} ${entityLabel}.`;
    case "GENERATE_PDF":
      return `${actor} gerou o PDF da inspecao ${row.entityId ?? entityLabel}.`;
    case "UPLOAD":
      return `${actor} anexou documento em ${entity} ${entityLabel}.`;
    case "SIGN":
      return `${actor} assinou ${entity} ${entityLabel}.`;
    case "COMPLETE":
      return `${actor} concluiu ${entity} ${entityLabel}.`;
    case "VIEW_QR":
      return row.userName
        ? `${actor} consultou o status do andaime ${entityLabel}.`
        : `Consulta publica ao status do andaime ${entityLabel}.`;
    case "LOGIN":
      return `${actor} entrou no sistema.`;
    case "LOGOUT":
      return `${actor} saiu do sistema.`;
    default:
      return row.description.endsWith(".") ? row.description : `${row.description}.`;
  }
}

export function AuditoriaClient({
  rows,
  total,
  page,
  pageSize,
  filters,
}: {
  rows: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: Filters;
}) {
  const [selected, setSelected] = useState<AuditRow | null>(null);
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const currentFilters = useMemo(() => filters, [filters]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-border">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            AndCheck EHS · Rastreabilidade
          </p>
          <h1 className="text-[18px] font-bold text-foreground tracking-tight uppercase">
            Auditoria
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {total} evento(s) registrados
          </p>
        </div>
        <div className="flex items-center gap-2 h-8 px-3 border border-border bg-card">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Log Imutavel
          </span>
        </div>
      </div>

      <form
        action="/auditoria"
        className="bg-card border border-border shadow-sm p-3 grid grid-cols-1 lg:grid-cols-[1.3fr_180px_180px_160px_160px_140px_140px_auto] gap-2"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <Input
            name="search"
            defaultValue={filters.search}
            placeholder="Buscar descricao, usuario ou entidade..."
            className="pl-9 h-8 text-[11px] rounded-none border-border"
          />
        </div>
        <Select name="action" defaultValue={filters.action || "all"}>
          <SelectTrigger className="h-8 text-[11px] rounded-none">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/50" />
            <SelectValue placeholder="Acao" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas acoes</SelectItem>
            {ACTIONS.map((action) => (
              <SelectItem key={action} value={action}>
                {labelAction(action)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="entityType" defaultValue={filters.entityType || "all"}>
          <SelectTrigger className="h-8 text-[11px] rounded-none">
            <SelectValue placeholder="Entidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas entidades</SelectItem>
            {ENTITIES.map((entity) => (
              <SelectItem key={entity} value={entity}>
                {labelEntity(entity)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          name="user"
          defaultValue={filters.user}
          placeholder="Usuario"
          className="h-8 text-[11px] rounded-none border-border"
        />
        <Input
          name="company"
          defaultValue={filters.company}
          placeholder="Empresa"
          className="h-8 text-[11px] rounded-none border-border"
        />
        <Input
          type="date"
          name="dateFrom"
          defaultValue={filters.dateFrom}
          className="h-8 text-[11px] rounded-none border-border"
        />
        <Input
          type="date"
          name="dateTo"
          defaultValue={filters.dateTo}
          className="h-8 text-[11px] rounded-none border-border"
        />
        <button className="h-8 px-4 bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-widest">
          Filtrar
        </button>
      </form>

      <div className="bg-card border border-border shadow-sm overflow-x-auto">
        <div className="min-w-[1280px] grid grid-cols-[145px_160px_135px_140px_210px_1fr_150px] gap-4 px-4 py-2.5 bg-primary border-b border-border">
          {[
            "Data/Hora",
            "Usuario",
            "Perfil",
            "Acao",
            "Entidade",
            "Descricao",
            "Empresa/Planta",
          ].map((header) => (
            <p
              key={header}
              className="text-[9px] font-bold uppercase tracking-widest text-primary-foreground/60"
            >
              {header}
            </p>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-12">
            <FileClock className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
              Nenhum evento encontrado
            </p>
          </div>
        ) : (
          <div className="min-w-[1280px] divide-y divide-border">
            {rows.map((row, index) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelected(row)}
                className={
                  "w-full grid grid-cols-[145px_160px_135px_140px_210px_1fr_150px] gap-4 items-center px-4 py-3 text-left hover:bg-muted/40 " +
                  (index % 2 === 1 ? "bg-muted/20" : "bg-card")
                }
              >
                <p className="text-[11px] font-mono text-muted-foreground">
                  {format(new Date(row.createdAt), "dd/MM/yyyy HH:mm")}
                </p>
                <p className="text-[11px] font-semibold text-foreground truncate">
                  {row.userName ?? "Sistema"}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono truncate">
                  {row.userRole ?? "-"}
                </p>
                <p className="text-[10px] font-bold text-sidebar-primary uppercase tracking-wide">
                  {labelAction(row.action)}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono truncate">
                  {entityDisplay(row)}
                </p>
                <p className="text-[11px] text-foreground truncate">
                  {friendlyDescription(row)}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {companyDisplay(row)}
                </p>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-t border-border">
          <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest">
            Pagina {page} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={buildHref(currentFilters, Math.max(page - 1, 1))}
              className="inline-flex h-7 w-7 items-center justify-center border border-border text-muted-foreground hover:bg-muted aria-disabled:opacity-40"
              aria-disabled={page <= 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
            <Link
              href={buildHref(currentFilters, Math.min(page + 1, totalPages))}
              className="inline-flex h-7 w-7 items-center justify-center border border-border text-muted-foreground hover:bg-muted aria-disabled:opacity-40"
              aria-disabled={page >= totalPages}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card border border-border shadow-xl w-full max-w-5xl max-h-[88vh] overflow-auto">
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border bg-primary">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-primary-foreground/50">
                  Evento de Auditoria
                </p>
                <h2 className="text-[15px] font-bold text-primary-foreground mt-1">
                  {friendlyDescription(selected)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="h-7 px-3 border border-primary-foreground/20 text-[10px] font-bold uppercase tracking-widest text-primary-foreground/70"
              >
                Fechar
              </button>
            </div>

            <div className="p-5 border-b border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Resumo
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Detail label="Evento" value={friendlyDescription(selected)} />
                <Detail label="Usuario" value={selected.userName ?? "Sistema"} />
                <Detail label="Perfil" value={selected.userRole ?? "-"} />
                <Detail
                  label="Data/Hora"
                  value={format(new Date(selected.createdAt), "dd/MM/yyyy HH:mm:ss")}
                />
                <Detail label="Empresa/Planta" value={companyDisplay(selected)} />
                <Detail label="IP" value={selected.ipAddress ?? "-"} />
                <Detail
                  label="Dispositivo/Navegador"
                  value={selected.userAgent ?? "-"}
                />
                <Detail label="Acao" value={labelAction(selected.action)} />
                <Detail
                  label="Entidade"
                  value={`${labelEntity(selected.entityType)} · ${
                    selected.entityLabel ?? selected.entityId ?? "-"
                  }`}
                />
              </div>
            </div>

            <div className="p-5 border-b border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Alteracoes
              </p>
              <div className="overflow-x-auto border border-border">
                <div className="min-w-[680px] grid grid-cols-[190px_1fr_1fr] bg-muted/50 border-b border-border">
                  {["Campo", "Antes", "Depois"].map((header) => (
                    <p
                      key={header}
                      className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground"
                    >
                      {header}
                    </p>
                  ))}
                </div>
                <div className="min-w-[680px] divide-y divide-border">
                  {comparisonRows(selected).map((item) => (
                    <div
                      key={item.field}
                      className="grid grid-cols-[190px_1fr_1fr]"
                    >
                      <p className="px-3 py-2 text-[11px] font-semibold text-foreground">
                        {item.field}
                      </p>
                      <p className="px-3 py-2 text-[11px] text-muted-foreground break-words">
                        {item.before}
                      </p>
                      <p className="px-3 py-2 text-[11px] text-foreground break-words">
                        {item.after}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <details className="p-5">
              <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Ver dados tecnicos
              </summary>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <JsonBlock title="Valor anterior" value={selected.oldValue} />
                <JsonBlock title="Valor novo" value={selected.newValue} />
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="text-[12px] font-semibold text-foreground mt-1 break-words">
        {value}
      </p>
    </div>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
        {title}
      </p>
      <pre className="bg-muted/40 border border-border p-3 text-[11px] font-mono whitespace-pre-wrap break-words max-h-72 overflow-auto">
        {formatJson(value)}
      </pre>
    </div>
  );
}
