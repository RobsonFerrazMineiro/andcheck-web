"use client";

import { format } from "date-fns";
import {
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Construction,
  Download,
  FileClock,
  FileText,
  Filter,
  MapPinned,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { surface, typography } from "@/lib/design-system";
import {
  type SemanticTone,
  SEMANTIC_TONE_CLASSES,
} from "@/lib/semantic-tones";

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

const ENTITY_LABELS: Record<string, string> = {
  COMPANY: "Empresa",
  USER: "Usuário",
  WORKSPACE: "Workspace",
  SCAFFOLD: "Andaime",
  INSPECTION: "Inspeção",
  DOCUMENT: "Documento técnico",
  SIGNATURE: "Assinatura",
  PDF: "PDF",
  QR_CODE: "Status do andaime",
  SETTINGS: "Configuração",
  NON_CONFORMITY: "Não conformidade",
};

const ENTITY_BADGE_LABELS: Record<string, string> = {
  COMPANY: "EMPRESA",
  USER: "USUÁRIO",
  WORKSPACE: "WORKSPACE",
  SCAFFOLD: "ANDAIME",
  INSPECTION: "INSPEÇÃO",
  DOCUMENT: "DOCUMENTAÇÃO",
  SIGNATURE: "ASSINATURA",
  PDF: "PDF",
  QR_CODE: "CONSULTA",
  SETTINGS: "CONFIGURAÇÃO",
  NON_CONFORMITY: "NÃO CONFORMIDADE",
};

const ENTITY_ICONS: Record<string, React.ElementType> = {
  COMPANY: Building2,
  USER: User,
  SCAFFOLD: Construction,
  INSPECTION: ClipboardCheck,
  DOCUMENT: FileText,
  SIGNATURE: FileText,
  PDF: FileText,
  QR_CODE: Construction,
  SETTINGS: ShieldCheck,
  NON_CONFORMITY: AlertTriangle,
  WORKSPACE: MapPinned,
};

type EventTone = SemanticTone;

const AUDIT_GROUPS = [
  { value: "all", label: "Todos" },
  { value: "USER", label: "Usuários" },
  { value: "COMPANY", label: "Empresas" },
  { value: "WORKSPACE", label: "Workspaces" },
  { value: "SCAFFOLD", label: "Andaimes" },
  { value: "INSPECTION", label: "Inspeções" },
  { value: "NON_CONFORMITY", label: "Não Conformidades" },
  { value: "DOCUMENT", label: "Documentação" },
  { value: "QR_CODE", label: "Consultas" },
];

const ENTITY_ARTICLES: Record<string, string> = {
  COMPANY: "a empresa",
  USER: "o usuário",
  WORKSPACE: "o workspace",
  SCAFFOLD: "o andaime",
  INSPECTION: "a inspeção",
  DOCUMENT: "o documento técnico",
  SIGNATURE: "a assinatura",
  PDF: "o PDF",
  QR_CODE: "o status do andaime",
  SETTINGS: "a configuração",
  NON_CONFORMITY: "a não conformidade",
};

const FIELD_LABELS: Record<string, string> = {
  area: "Área",
  assembly_completed_at: "Montagem concluida em",
  checklist_items: "Itens do checklist",
  classification: "Classificação",
  code: "Código",
  company: "Empresa",
  companyLogo: "Logo da empresa",
  companyId: "Empresa",
  closedAt: "Encerrada em",
  createdById: "Criado por",
  createdAt: "Data de criação",
  department: "Departamento",
  dismantled_at: "Desmontado em",
  dismantleReason: "Motivo da desmontagem",
  dismantleReasonDescription: "Descrição do motivo",
  dueDate: "Prazo",
  email: "E-mail",
  evidenceType: "Tipo de evidência",
  failed_items: "Itens reprovados",
  fileName: "Arquivo",
  file_name: "Arquivo",
  inspection_id: "Inspeção",
  inspection_result: "Resultado da inspeção",
  inspector_name: "Inspetor",
  is_active: "Status",
  latitude: "Latitude",
  location: "Local",
  longitude: "Longitude",
  name: "Nome",
  originInspectionId: "Inspeção de origem",
  position: "Cargo",
  registration: "Matrícula",
  released_at: "Liberado em",
  responsibleUserId: "Responsável",
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
  updatedAt: "Última atualização",
  validity_date: "Validade",
  validity_days: "Validade em dias",
  warning_items: "Itens com ressalva",
  workspaceId: "Workspace",
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
  critical: "Crítica",
  aprovado: "Aprovado",
  aprovado_com_ressalvas: "Aprovado com ressalvas",
  cl_fail: "Reprovado",
  cl_na: "Não aplicável",
  cl_ok: "Conforme",
  cl_warn: "Com ressalva",
  desmontado: "Desmontado",
  em_montagem: "Em montagem",
  inactive: "Inativo",
  in_progress: "Em tratamento",
  interditado: "Interditado",
  liberado: "Liberado",
  low: "Baixa",
  medium: "Média",
  open: "Aberta",
  pendente_liberacao: "Pendente de liberação",
  pending_verification: "Aguardando verificação",
  reprovado: "Reprovado",
  high: "Alta",
};

const ACTION_FILTERS = [
  ["CREATE", "Criação"],
  ["UPDATE", "Atualização"],
  ["STATUS_CHANGE", "Alteração de status"],
  ["ROLE_CHANGE", "Alteração de perfil"],
  ["COMPLETE", "Conclusão"],
  ["UPLOAD", "Upload"],
  ["DOWNLOAD", "Download"],
  ["GENERATE_PDF", "Geração de PDF"],
  ["VIEW_QR", "Consulta"],
  ["DELETE", "Remoção"],
] as const;

const AUDIT_TABLE_GRID =
  "grid-cols-[112px_130px_100px_165px_220px_minmax(280px,1fr)_175px]";

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

function labelEntity(entityType: string) {
  return ENTITY_LABELS[entityType] ?? entityType;
}

function getRecordString(value: unknown, key: string) {
  if (!isPlainObject(value)) return null;
  const item = value[key];
  return typeof item === "string" ? item : null;
}

function getEventMeta(row: AuditRow): {
  label: string;
  shortLabel: string;
  tone: EventTone;
} {
  const newStatus = getRecordString(row.newValue, "status");
  const oldStatus = getRecordString(row.oldValue, "status");

  if (row.action === "VIEW_QR") {
    return { label: "Consultou status", shortLabel: "CONSULTA", tone: "neutral" };
  }
  if (row.action === "ROLE_CHANGE") {
    return { label: "Alterou perfil", shortLabel: "ALTERAÇÃO DE PERFIL", tone: "warning" };
  }
  if (row.action === "STATUS_CHANGE") {
    if (newStatus === "desmontado") {
      return { label: "Desmontou andaime", shortLabel: "DESMONTAGEM", tone: "disabled" };
    }
    return {
      label:
        row.entityType === "SCAFFOLD"
          ? "Alterou status do andaime"
          : "Alterou status",
      shortLabel: "ALTERAÇÃO DE STATUS",
      tone: ["reprovado", "interditado", "cancelled", "CANCELLED"].includes(newStatus ?? "")
        ? "critical"
        : "warning",
    };
  }
  if (row.action === "CREATE" || row.action.endsWith("_CREATED")) {
    if (row.entityType === "USER") return { label: "Criou usuário", shortLabel: "CRIAÇÃO", tone: "success" };
    if (row.entityType === "COMPANY") return { label: "Criou empresa", shortLabel: "CRIAÇÃO", tone: "success" };
    if (row.entityType === "WORKSPACE") return { label: "Criou workspace", shortLabel: "CRIAÇÃO", tone: "success" };
    if (row.entityType === "SCAFFOLD") return { label: "Criou andaime", shortLabel: "CRIAÇÃO", tone: "success" };
    if (row.entityType === "INSPECTION") return { label: "Criou inspeção", shortLabel: "CRIAÇÃO", tone: "success" };
    if (row.entityType === "NON_CONFORMITY") return { label: "Criou não conformidade", shortLabel: "CRIAÇÃO", tone: "success" };
    return { label: "Criou registro", shortLabel: "CRIAÇÃO", tone: "success" };
  }
  if (row.action === "UPDATE" || row.action.endsWith("_UPDATED")) {
    if (row.action === "COMPANY_LOGO_UPDATED") {
      return { label: "Atualizou logo", shortLabel: "ATUALIZAÇÃO", tone: "warning" };
    }
    if (row.entityType === "USER") return { label: "Atualizou usuário", shortLabel: "ATUALIZAÇÃO", tone: "warning" };
    if (row.entityType === "COMPANY") return { label: "Atualizou empresa", shortLabel: "ATUALIZAÇÃO", tone: "warning" };
    if (row.entityType === "WORKSPACE") return { label: "Atualizou workspace", shortLabel: "ATUALIZAÇÃO", tone: "warning" };
    if (row.entityType === "SCAFFOLD") return { label: "Atualizou andaime", shortLabel: "ATUALIZAÇÃO", tone: "warning" };
    if (row.entityType === "NON_CONFORMITY") return { label: "Atualizou não conformidade", shortLabel: "ATUALIZAÇÃO", tone: "warning" };
    return { label: "Atualizou registro", shortLabel: "ATUALIZAÇÃO", tone: "warning" };
  }
  if (row.entityType === "INSPECTION" && newStatus === "aprovado") {
    return { label: "Aprovou inspeção", shortLabel: "APROVAÇÃO", tone: "success" };
  }
  if (row.entityType === "INSPECTION" && (newStatus === "reprovado" || oldStatus === "aprovado")) {
    return { label: "Reprovou inspeção", shortLabel: "REPROVAÇÃO", tone: "critical" };
  }
  if (row.entityType === "NON_CONFORMITY" && ["CLOSED", "closed"].includes(newStatus ?? "")) {
    return { label: "Encerrou não conformidade", shortLabel: "ENCERRAMENTO", tone: "success" };
  }
  if (["DELETE", "CANCELLED", "CANCEL"].includes(row.action)) {
    return { label: "Removeu registro", shortLabel: "REMOÇÃO", tone: "critical" };
  }
  if (row.action === "COMPLETE") {
    return { label: "Concluiu etapa", shortLabel: "CONCLUSÃO", tone: "success" };
  }
  return {
    label: row.action.replaceAll("_", " ").toLowerCase(),
    shortLabel: row.action.replaceAll("_", " "),
    tone: "disabled",
  };
}

function labelAction(rowOrAction: AuditRow | string) {
  if (typeof rowOrAction === "string") return rowOrAction.replaceAll("_", " ");
  return getEventMeta(rowOrAction).label;
}

function entityDisplay(row: AuditRow) {
  const label = row.entityLabel ?? row.entityId ?? "-";

  switch (row.entityType) {
    case "USER":
      return `Usuário ${label}`;
    case "SCAFFOLD":
      return `Andaime ${label}`;
    case "INSPECTION":
      return `Inspeção ${label}`;
    case "DOCUMENT":
      return `Documento técnico ${label}`;
    case "SIGNATURE":
      return `Assinatura ${label}`;
    case "PDF":
      return `PDF da inspeção ${label}`;
    case "QR_CODE":
      return `Status do andaime ${label}`;
    case "NON_CONFORMITY":
      return `Não conformidade ${label}`;
    case "SETTINGS":
      return `Configuração ${label}`;
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
      if (
        row.entityType === "SCAFFOLD" &&
        getRecordString(row.newValue, "status") === "desmontado"
      ) {
        return `${actor} desmontou o andaime ${entityLabel}.`;
      }
      return `${actor} alterou o status de ${entity} ${entityLabel}.`;
    case "ROLE_CHANGE":
      return `${actor} alterou o perfil de ${entity} ${entityLabel}.`;
    case "GENERATE_PDF":
      return `${actor} gerou o PDF da inspeção ${row.entityId ?? entityLabel}.`;
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

function ActionBadge({ row }: { row: AuditRow }) {
  const meta = getEventMeta(row);
  return (
    <Badge
      variant="outline"
      title={meta.label}
      className={`max-w-full rounded-md px-2 py-0.5 ${typography.badge} ${SEMANTIC_TONE_CLASSES[meta.tone].badge}`}
    >
      <span className="block truncate">{meta.label}</span>
    </Badge>
  );
}

function EntityBadge({ row }: { row: AuditRow }) {
  const Icon = ENTITY_ICONS[row.entityType] ?? FileClock;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        variant="outline"
        className={`inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 ${typography.badge} ${SEMANTIC_TONE_CLASSES.neutral.badge}`}
      >
        <Icon className="size-3" />
        {ENTITY_BADGE_LABELS[row.entityType] ?? labelEntity(row.entityType).toUpperCase()}
      </Badge>
      <span className={`text-foreground ${typography.code}`}>
        {row.entityLabel ?? row.entityId ?? "-"}
      </span>
    </div>
  );
}

function csvEscape(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function exportRowsToCsv(rows: AuditRow[]) {
  const headers = [
    "Data/Hora",
    "Usuário",
    "Perfil",
    "Ação",
    "Entidade",
    "Descrição",
    "Empresa",
    "Workspace",
  ];
  const lines = rows.map((row) =>
    [
      format(new Date(row.createdAt), "dd/MM/yyyy HH:mm"),
      row.userName ?? "Sistema",
      row.userRole ?? "-",
      labelAction(row),
      entityDisplay(row),
      friendlyDescription(row),
      row.companyId ?? "-",
      row.workspaceId ?? "-",
    ]
      .map(csvEscape)
      .join(","),
  );
  const csv = [headers.map(csvEscape).join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `auditoria-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function AuditoriaClient({
  rows,
  exportRows,
  total,
  page,
  pageSize,
  filters,
}: {
  rows: AuditRow[];
  exportRows: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: Filters;
}) {
  const [selected, setSelected] = useState<AuditRow | null>(null);
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const currentFilters = useMemo(() => filters, [filters]);

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-border">
        <div>
          <p className={`${typography.pageEyebrow} mb-1 text-muted-foreground`}>
            AndCheck • Auditoria
          </p>
          <h1 className={`${typography.pageTitle} text-foreground`}>
            Auditoria
          </h1>
          <p className={`mt-0.5 text-muted-foreground ${typography.sectionDescription}`}>
            {total} evento(s) registrados
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportRowsToCsv(exportRows)}
            className={`inline-flex h-8 items-center gap-2 rounded-md border border-border bg-card px-3 text-muted-foreground hover:bg-muted ${typography.action}`}
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </button>
          <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-card px-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className={`${typography.action} text-muted-foreground`}>
              Log Imutavel
            </span>
          </div>
        </div>
      </div>

      <form
        action="/auditoria"
        className="grid min-w-0 grid-cols-1 gap-2 rounded-lg border border-border bg-card p-3 shadow-sm md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[1.3fr_170px_170px_150px_150px_130px_130px_auto]"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <Input
            name="search"
            defaultValue={filters.search}
            placeholder="Buscar descrição, usuário ou entidade..."
            className="pl-9 h-8 text-[11px] rounded-md border-border"
          />
        </div>
        <Select name="action" defaultValue={filters.action || "all"}>
          <SelectTrigger className="h-8 text-[11px] rounded-md">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/50" />
            <SelectValue placeholder="Ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas ações</SelectItem>
            {ACTION_FILTERS.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="entityType" defaultValue={filters.entityType || "all"}>
          <SelectTrigger className="h-8 text-[11px] rounded-md">
            <SelectValue placeholder="Entidade" />
          </SelectTrigger>
          <SelectContent>
            {AUDIT_GROUPS.map((entity) => (
              <SelectItem key={entity.value} value={entity.value}>
                {entity.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          name="user"
          defaultValue={filters.user}
          placeholder="Usuário"
          className="h-8 text-[11px] rounded-md border-border"
        />
        <Input
          name="company"
          defaultValue={filters.company}
          placeholder="Empresa"
          className="h-8 text-[11px] rounded-md border-border"
        />
        <Input
          type="date"
          name="dateFrom"
          defaultValue={filters.dateFrom}
          className="h-8 text-[11px] rounded-md border-border"
        />
        <Input
          type="date"
          name="dateTo"
          defaultValue={filters.dateTo}
          className="h-8 text-[11px] rounded-md border-border"
        />
        <button className="h-8 rounded-md bg-accent px-4 text-accent-foreground text-[10px] font-bold uppercase tracking-widest">
          Filtrar
        </button>
      </form>

      <div className="min-w-0 overflow-hidden rounded-lg bg-card border border-border shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[1180px]">
            <div className={`grid ${AUDIT_TABLE_GRID} gap-3 border-b border-border ${surface.tableHeader}`}>
              {[
                "Data/Hora",
                "Usuário",
                "Perfil",
                "Ação",
                "Entidade",
                "Descrição",
                "Empresa/Planta",
              ].map((header) => (
                <p
                  key={header}
                  className="text-primary-foreground/60"
                >
                  {header}
                </p>
              ))}
            </div>

            {rows.length === 0 ? (
              <div className="text-center py-12">
                <FileClock className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                <p className={`text-muted-foreground ${typography.emptyState}`}>
                  Nenhum evento encontrado
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {rows.map((row, index) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelected(row)}
                    className={
                      `w-full grid ${AUDIT_TABLE_GRID} gap-3 items-center overflow-hidden px-4 py-3 text-left hover:bg-muted/40 ` +
                      (index % 2 === 1 ? "bg-muted/20" : "bg-card")
                    }
                  >
                    <p className={`min-w-0 text-muted-foreground ${typography.code}`}>
                      {format(new Date(row.createdAt), "dd/MM/yyyy HH:mm")}
                    </p>
                    <p className={`min-w-0 truncate text-foreground ${typography.bodyStrong}`}>
                      {row.userName ?? "Sistema"}
                    </p>
                    <p className={`min-w-0 truncate text-muted-foreground ${typography.codeMuted}`}>
                      {row.userRole ?? "-"}
                    </p>
                    <div className="min-w-0">
                      <ActionBadge row={row} />
                    </div>
                    <p className={`min-w-0 truncate text-muted-foreground ${typography.codeMuted}`}>
                      {entityDisplay(row)}
                    </p>
                    <p className={`min-w-0 truncate text-foreground ${typography.sectionDescription}`}>
                      {friendlyDescription(row)}
                    </p>
                    <p className={`min-w-0 truncate text-muted-foreground ${typography.bodyMuted}`}>
                      {companyDisplay(row)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-t border-border">
          <p className={`${typography.panelSubtitle} text-muted-foreground/50`}>
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
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-5xl max-h-[88vh] overflow-auto">
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border bg-primary">
              <div>
                <p className={`${typography.pageEyebrow} text-primary-foreground/50`}>
                  Evento de Auditoria
                </p>
                <h2 className="mt-1 text-[15px] font-bold text-primary-foreground">
                  {friendlyDescription(selected)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className={`h-7 rounded-md border border-primary-foreground/20 px-3 text-primary-foreground/70 ${typography.action}`}
              >
                Fechar
              </button>
            </div>

            <div className="p-5 border-b border-border">
              <p className={`mb-3 text-muted-foreground ${typography.action}`}>
                Resumo
              </p>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <EntityBadge row={selected} />
                <ActionBadge row={selected} />
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Detail label="Evento" value={friendlyDescription(selected)} />
                <Detail label="Usuário" value={selected.userName ?? "Sistema"} />
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
                <Detail label="Ação" value={labelAction(selected)} />
                <Detail
                  label="Entidade"
                  value={`${labelEntity(selected.entityType)} · ${
                    selected.entityLabel ?? selected.entityId ?? "-"
                  }`}
                />
              </div>
            </div>

            <div className="p-5 border-b border-border">
              <p className={`mb-3 text-muted-foreground ${typography.action}`}>
                Alterações
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
      <pre className="bg-muted/40 rounded-lg border border-border p-3 text-[11px] font-mono whitespace-pre-wrap break-words max-h-72 overflow-auto">
        {formatJson(value)}
      </pre>
    </div>
  );
}
