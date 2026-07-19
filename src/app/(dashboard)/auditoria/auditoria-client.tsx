"use client";

import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileClock,
  Search,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { FilterField, FilterShell } from "@/components/shared/filter-shell";
import {
  HistoryTimelineCompact,
  type HistoryEvent,
  type HistoryEventDetail,
  type HistoryEventType,
} from "@/components/shared/audit-timeline";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { typography } from "@/lib/design-system";
import type { SemanticTone } from "@/lib/semantic-tones";

export type AuditRow = {
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
  sessionId: string | null;
  browserName: string | null;
  osName: string | null;
  deviceType: string | null;
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
  workspace: string;
  status: string;
  scaffoldTag: string;
  dateFrom: string;
  dateTo: string;
  order: "asc" | "desc";
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
  NOTIFICATION: "Notificação",
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
  { value: "NOTIFICATION", label: "Notificações" },
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
  NOTIFICATION: "a notificação",
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
  ["NOTIFICATION_CREATED", "Notificação gerada"],
  ["NOTIFICATION_READ", "Notificação lida"],
  ["NOTIFICATION_ARCHIVED", "Notificação arquivada"],
  ["NOTIFICATION_EMAIL_RESENT", "Reenvio de e-mail"],
] as const;

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
  if (row.action === "NOTIFICATION_CREATED") {
    return { label: "Gerou notificação", shortLabel: "NOTIFICAÇÃO", tone: "neutral" };
  }
  if (row.action === "NOTIFICATION_READ") {
    return { label: "Leu notificação", shortLabel: "LEITURA", tone: "success" };
  }
  if (row.action === "NOTIFICATION_ARCHIVED") {
    return { label: "Arquivou notificação", shortLabel: "ARQUIVAMENTO", tone: "disabled" };
  }
  if (row.action === "NOTIFICATION_EMAIL_RESENT") {
    return { label: "Reenviou e-mail", shortLabel: "REENVIO", tone: "warning" };
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
    case "NOTIFICATION":
      return `Notificação ${label}`;
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
    case "NOTIFICATION_CREATED":
      return `${actor} gerou a notificação ${entityLabel}.`;
    case "NOTIFICATION_READ":
      return `${actor} marcou a notificação ${entityLabel} como lida.`;
    case "NOTIFICATION_ARCHIVED":
      return `${actor} arquivou a notificação ${entityLabel}.`;
    case "NOTIFICATION_EMAIL_RESENT":
      return `${actor} reenviou e-mail da notificação ${entityLabel}.`;
    case "LOGIN":
      return `${actor} entrou no sistema.`;
    case "LOGOUT":
      return `${actor} saiu do sistema.`;
    default:
      return row.description.endsWith(".") ? row.description : `${row.description}.`;
  }
}

const AUDIT_TECHNICAL_KEYS = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "deletedAt",
  "created_at",
  "updated_at",
  "deleted_at",
  "password",
  "passwordHash",
  "password_hash",
  "entityType",
  "entity_type",
  "tenantCompanyId",
  "tenant_company_id",
  "workspace_id",
  "userAgent",
  "sessionId",
]);

const AUDIT_RELEVANT_DETAIL_KEYS = new Set([
  "action",
  "area",
  "classification",
  "code",
  "companyId",
  "department",
  "description",
  "dueDate",
  "email",
  "fileName",
  "location",
  "name",
  "notes",
  "reason",
  "responsible",
  "responsibleUserId",
  "result",
  "role",
  "roleCode",
  "scaffoldCode",
  "status",
  "tag",
  "title",
  "type",
  "validity_date",
  "validityDate",
  "validity_days",
  "workspaceId",
]);

const AUDIT_VALUE_LABELS: Record<string, string> = {
  ASSIGNED: "Atribuída",
  CANCELLED: "Cancelado",
  CLOSED: "Encerrada",
  IN_PROGRESS: "Em tratamento",
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
  OPEN: "Aberta",
  PENDING_VERIFICATION: "Aguardando verificação",
  REJECTED: "Rejeitada",
  aprovado: "Aprovado",
  aprovado_com_ressalvas: "Aprovado com ressalvas",
  desmontado: "Desmontado",
  em_montagem: "Em montagem",
  interditado: "Interditado",
  liberado: "Liberado",
  pendente_liberacao: "Pendente de liberação",
  reprovado: "Reprovado",
  tubular: "Tubular",
  vencido: "Vencido",
};

const AUDIT_DETAIL_LABELS: Record<string, string> = {
  action: "Ação",
  area: "Área",
  code: "Código",
  companyId: "Empresa",
  department: "Departamento",
  description: "Descrição",
  dueDate: "Prazo",
  email: "E-mail",
  name: "Nome",
  result: "Resultado",
  role: "Perfil",
  roleCode: "Perfil",
  scaffoldCode: "Andaime",
  scaffoldId: "Andaime",
  status: "Status",
  tag: "TAG",
  title: "Título",
  type: "Tipo",
  userName: "Usuário",
  validityDate: "Validade",
  workspaceId: "Workspace",
};

function auditDetailLabel(key: string) {
  return AUDIT_DETAIL_LABELS[key] ?? key.replaceAll("_", " ");
}

function auditValueLabel(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (value instanceof Date) return format(value, "dd/MM/yyyy HH:mm");
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return format(date, "dd/MM/yyyy HH:mm");
    }
    return AUDIT_VALUE_LABELS[value] ?? value.replaceAll("_", " ");
  }
  if (Array.isArray(value)) return `${value.length} item(ns)`;
  return "Dados registrados";
}

function auditChangedDetails(
  oldValue: unknown,
  newValue: unknown,
): HistoryEventDetail[] {
  if (!isPlainObject(oldValue) && !isPlainObject(newValue)) return [];

  const before = isPlainObject(oldValue) ? oldValue : {};
  const after = isPlainObject(newValue) ? newValue : {};

  return Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
    .filter((key) => !AUDIT_TECHNICAL_KEYS.has(key))
    .filter((key) => AUDIT_RELEVANT_DETAIL_KEYS.has(key))
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .filter(
      (key) =>
        auditValueLabel(before[key]) !== "-" || auditValueLabel(after[key]) !== "-",
    )
    .map((key) => ({
      label: auditDetailLabel(key),
      before: auditValueLabel(before[key]),
      after: auditValueLabel(after[key]),
    }))
    .slice(0, 8);
}

function auditRowType(row: AuditRow): HistoryEventType {
  if (row.action.includes("FAIL")) return "failure";
  if (row.action.includes("SYNC")) return "sync";
  if (row.action === "CREATE" || row.action.endsWith("_CREATED")) return "create";
  if (row.action === "UPDATE" || row.action.endsWith("_UPDATED")) return "update";
  if (row.action === "DELETE" || row.action.includes("REMOVED")) return "delete";
  if (row.action === "STATUS_CHANGE") return "status";
  if (row.action.includes("COMMENT")) return "comment";
  if (row.action.includes("DOCUMENT") || row.action === "UPLOAD") return "document";
  if (row.action.includes("SIGN")) return "signature";
  if (row.entityType === "INSPECTION") return "inspection";
  if (row.entityType === "NON_CONFORMITY") return "non_conformity";
  return "update";
}

function compactHistorySummary(row: AuditRow) {
  const newStatus =
    getRecordString(row.newValue, "status") ??
    getRecordString(row.newValue, "result");
  const entity = labelEntity(row.entityType);

  if (row.action === "STATUS_CHANGE" && newStatus) {
    return `${entity} ${auditValueLabel(newStatus)}`;
  }
  if (row.action === "COMPLETE") return `${entity} concluído`;
  if (row.action === "DELETE" || row.action.includes("REMOVED")) {
    return `${entity} removido`;
  }
  if (row.action.includes("DOCUMENT") || row.action === "UPLOAD") {
    return "Documento anexado";
  }
  if (row.action.includes("SIGN")) return "Assinatura registrada";
  if (row.action.includes("NOTIFICATION")) return getEventMeta(row).label;
  if (row.action === "CREATE" || row.action.endsWith("_CREATED")) {
    return `${entity} criado`;
  }
  if (row.action === "UPDATE" || row.action.endsWith("_UPDATED")) {
    return `${entity} atualizado`;
  }

  return getEventMeta(row).label;
}

function auditRowToHistoryEvent(row: AuditRow): HistoryEvent {
  const meta = getEventMeta(row);
  const summary = compactHistorySummary(row)
    .replace(/\bcm[a-z0-9]{18,}\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    id: row.id,
    type: auditRowType(row),
    actorName: row.userName ?? "Sistema",
    summary,
    createdAt: row.createdAt,
    tone: meta.tone,
    details: [
      { label: "Entidade", value: entityDisplay(row) },
      { label: "Tipo de evento", value: labelAction(row) },
      ...auditChangedDetails(row.oldValue, row.newValue),
    ],
    metadata: {
      company: row.companyId,
      workspace: row.workspaceId,
      browser: row.browserName,
      device: row.deviceType,
      os: row.osName,
      ip: row.ipAddress,
    },
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function exportRowsToExcel(rows: AuditRow[]) {
  const headers = [
    "Data/Hora",
    "Usuário",
    "Perfil",
    "Ação",
    "Entidade",
    "Descrição",
    "Empresa",
    "Workspace",
    "IP",
    "Sessão",
    "Navegador",
    "Sistema Operacional",
    "Dispositivo",
  ];
  const body = rows
    .map((row) =>
      [
        format(new Date(row.createdAt), "dd/MM/yyyy HH:mm:ss"),
        row.userName ?? "Sistema",
        row.userRole ?? "-",
        labelAction(row),
        entityDisplay(row),
        friendlyDescription(row),
        row.companyId ?? "-",
        row.workspaceId ?? "-",
        row.ipAddress ?? "-",
        row.sessionId ? row.sessionId.slice(0, 12) : "-",
        row.browserName ?? "-",
        row.osName ?? "-",
        row.deviceType ?? "-",
      ]
        .map((cell) => `<td>${escapeHtml(cell)}</td>`)
        .join(""),
    )
    .map((cells) => `<tr>${cells}</tr>`)
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table><thead><tr>${headers
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join("")}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `auditoria-${format(new Date(), "yyyyMMdd-HHmm")}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportRowsToPdf(rows: AuditRow[]) {
  const body = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(format(new Date(row.createdAt), "dd/MM/yyyy HH:mm"))}</td>
          <td>${escapeHtml(row.userName ?? "Sistema")}</td>
          <td>${escapeHtml(labelAction(row))}</td>
          <td>${escapeHtml(entityDisplay(row))}</td>
          <td>${escapeHtml(friendlyDescription(row))}</td>
          <td>${escapeHtml(companyDisplay(row))}</td>
        </tr>
      `,
    )
    .join("");
  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) return;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Auditoria AndCheck</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
          h1 { font-size: 20px; margin: 0 0 4px; }
          p { margin: 0 0 16px; color: #4b5563; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th { text-align: left; background: #f3f4f6; border: 1px solid #d1d5db; padding: 6px; }
          td { vertical-align: top; border: 1px solid #e5e7eb; padding: 6px; }
        </style>
      </head>
      <body>
        <h1>Auditoria AndCheck</h1>
        <p>${rows.length} evento(s) exportados em ${escapeHtml(format(new Date(), "dd/MM/yyyy HH:mm"))}</p>
        <table>
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Usuário</th>
              <th>Ação</th>
              <th>Entidade</th>
              <th>Descrição</th>
              <th>Empresa/Workspace</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
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
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const currentFilters = useMemo(() => filters, [filters]);
  const historyEvents = useMemo(
    () => rows.map(auditRowToHistoryEvent),
    [rows],
  );

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-border">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <FileClock className="size-4" />
            AndCheck • Auditoria
          </div>
          <h1 className={`${typography.pageTitle} text-foreground`}>
            Auditoria
          </h1>
          <p className={`mt-0.5 text-muted-foreground ${typography.sectionDescription}`}>
            {total} evento(s) registrados
          </p>
        </div>
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => exportRowsToExcel(exportRows)}
            className={`inline-flex h-8 items-center gap-2 rounded-md bg-accent px-3 text-accent-foreground hover:bg-accent/90 ${typography.action}`}
          >
            <Download className="h-3.5 w-3.5" />
            Excel
          </button>
          <button
            type="button"
            onClick={() => exportRowsToPdf(exportRows)}
            className={`inline-flex h-8 items-center gap-2 rounded-md border border-border bg-card px-3 text-muted-foreground hover:bg-muted ${typography.action}`}
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </button>
          <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-card px-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className={`${typography.action} text-muted-foreground`}>
              Log Imutável
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 shadow-sm md:hidden">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <FileClock className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className={`${typography.bodyStrong} text-foreground`}>
              Auditoria resumida
            </p>
            <p className={`mt-1 text-muted-foreground ${typography.sectionDescription}`}>
              {total} evento(s) encontrados. Toque em um evento para revisar os
              detalhes completos.
            </p>
          </div>
        </div>
      </div>

      <form
        action="/auditoria"
        className="hidden md:block"
      >
        <FilterShell
          title="Filtros"
          meta={`${total} evento(s)`}
          contentClassName="flex min-w-0 flex-wrap items-start gap-2"
        >
          <FilterField label="Busca" className="w-full sm:min-w-[180px] sm:flex-1 md:max-w-[260px]">
          <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <Input
            name="search"
            defaultValue={filters.search}
            placeholder="Buscar descrição, usuário ou entidade..."
            className="pl-9 h-8 text-[11px] rounded-md border-border"
          />
          </div>
          </FilterField>
        <FilterField label="Ação" className="sm:w-[150px]">
        <Select name="action" defaultValue={filters.action || "all"}>
          <SelectTrigger className="h-8 w-full rounded-md text-[11px] sm:w-[150px]">
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
        </FilterField>
        <FilterField label="Entidade" className="sm:w-[108px]">
        <Select name="entityType" defaultValue={filters.entityType || "all"}>
          <SelectTrigger className="h-8 w-full rounded-md text-[11px] sm:w-[108px]">
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
        </FilterField>
        <FilterField label="Usuário" className="sm:w-[150px]">
        <Input
          name="user"
          defaultValue={filters.user}
          placeholder="Usuário"
          className="h-8 w-full rounded-md border-border text-[11px] sm:w-[150px]"
        />
        </FilterField>
        <FilterField label="Empresa" className="sm:w-[150px]">
        <Input
          name="company"
          defaultValue={filters.company}
          placeholder="Empresa"
          className="h-8 w-full rounded-md border-border text-[11px] sm:w-[150px]"
        />
        </FilterField>
        <FilterField label="Workspace" className="sm:w-[150px]">
        <Input
          name="workspace"
          defaultValue={filters.workspace}
          placeholder="Workspace"
          className="h-8 w-full rounded-md border-border text-[11px] sm:w-[150px]"
        />
        </FilterField>
        <FilterField label="Status" className="sm:w-[135px]">
        <Input
          name="status"
          defaultValue={filters.status}
          placeholder="Status"
          className="h-8 w-full rounded-md border-border text-[11px] sm:w-[135px]"
        />
        </FilterField>
        <FilterField label="TAG" className="sm:w-[125px]">
        <Input
          name="scaffoldTag"
          defaultValue={filters.scaffoldTag}
          placeholder="TAG"
          className="h-8 w-full rounded-md border-border text-[11px] sm:w-[125px]"
        />
        </FilterField>
        <FilterField label="Inicio" className="sm:w-[154px]">
        <Input
          type="date"
          name="dateFrom"
          defaultValue={filters.dateFrom}
          className="h-8 w-full rounded-md border-border text-[11px] sm:w-[154px]"
        />
        </FilterField>
        <FilterField label="Fim" className="sm:w-[154px]">
        <Input
          type="date"
          name="dateTo"
          defaultValue={filters.dateTo}
          className="h-8 w-full rounded-md border-border text-[11px] sm:w-[154px]"
        />
        </FilterField>
        <FilterField label="Ordenacao" className="sm:w-[132px]">
        <Select name="order" defaultValue={filters.order}>
          <SelectTrigger className="h-8 w-full rounded-md text-[11px] sm:w-[132px]">
            <SelectValue placeholder="Ordenação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Mais recentes</SelectItem>
            <SelectItem value="asc">Mais antigos</SelectItem>
          </SelectContent>
        </Select>
        </FilterField>
        <div className="flex items-end sm:w-[170px]">
        <button className="h-8 w-full rounded-md bg-accent px-4 text-accent-foreground text-[10px] font-bold uppercase tracking-widest">
          Filtrar
        </button>
        </div>
        </FilterShell>
      </form>

      <div className="min-w-0 overflow-hidden rounded-lg bg-card border border-border shadow-sm">
        <HistoryTimelineCompact
          events={historyEvents}
          initialLimit={Math.max(rows.length, 1)}
          showFullHistoryAction={false}
          variant="page"
        />

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

    </div>
  );
}
