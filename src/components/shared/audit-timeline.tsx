"use client";

import { format } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  Camera,
  CheckCircle2,
  Edit3,
  History,
  MessageSquare,
  Minus,
  Paperclip,
  PenLine,
  Plus,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { useExclusiveMenu } from "@/hooks/use-exclusive-menu";
import {
  type SemanticTone,
  SEMANTIC_TONE_CLASSES,
} from "@/lib/semantic-tones";
import { humanizeCode } from "@/lib/human-readable";

export type HistoryEventType =
  | "create"
  | "update"
  | "delete"
  | "status"
  | "inspection"
  | "non_conformity"
  | "comment"
  | "document"
  | "photo"
  | "responsible"
  | "deadline"
  | "signature"
  | "sync"
  | "failure";

export type HistoryEventDetail = {
  label: string;
  before?: string | null;
  after?: string | null;
  value?: string | null;
};

export type HistoryEvent = {
  id: string;
  type: HistoryEventType;
  actorName: string;
  summary: string;
  createdAt: Date | string;
  tone: SemanticTone;
  details?: HistoryEventDetail[];
  metadata?: {
    company?: string | null;
    workspace?: string | null;
    browser?: string | null;
    device?: string | null;
    os?: string | null;
  };
};

export type AuditTimelineItem = {
  id: string;
  action: string;
  description: string;
  userName: string | null;
  userRole: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  browserName: string | null;
  osName: string | null;
  deviceType: string | null;
  companyName: string;
  workspaceName: string;
  createdAt: Date | string;
};

type AuditTimelineProps = {
  title?: string;
  items: AuditTimelineItem[];
  previewCount?: number;
  className?: string;
};

type HistoryTimelineCompactProps = {
  title?: string;
  events: HistoryEvent[];
  initialLimit?: number;
  showFullHistoryAction?: boolean;
  variant?: "compact" | "page";
};

type HistoryDropdownButtonProps = {
  events: HistoryEvent[];
  buttonLabel?: string;
  dropdownTitle?: string;
  initialLimit?: number;
  className?: string;
};

const TECHNICAL_KEYS = new Set([
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
  "company",
  "companyId",
  "workspace",
  "workspaceId",
  "workspace_id",
  "userAgent",
  "sessionId",
]);

const RELEVANT_DETAIL_KEYS = new Set([
  "area",
  "classification",
  "code",
  "department",
  "description",
  "comment",
  "dismantleReason",
  "dismantleReasonDescription",
  "dueDate",
  "email",
  "fileName",
  "location",
  "name",
  "notes",
  "reason",
  "requiresNewInspection",
  "responsible",
  "responsibleName",
  "responsibleUserId",
  "result",
  "role",
  "roleCode",
  "scaffoldCode",
  "scaffoldReturnedToPendingRelease",
  "status",
  "tag",
  "title",
  "type",
  "validity_date",
  "validityDate",
  "validity_days",
]);

const FIELD_LABELS: Record<string, string> = {
  action: "Ação",
  area: "Área",
  classification: "Classificação",
  code: "Código",
  company: "Empresa",
  companyId: "Empresa",
  comment: "Observação",
  department: "Departamento",
  description: "Descrição",
  dismantleReason: "Motivo da desmontagem",
  dismantleReasonDescription: "Observação",
  dueDate: "Prazo",
  email: "E-mail",
  fileName: "Arquivo",
  location: "Localização",
  name: "Nome",
  notes: "Observações",
  reason: "Motivo",
  requiresNewInspection: "Nova inspeção necessária",
  responsible: "Responsável",
  responsibleName: "Responsável",
  responsibleUserId: "Responsável",
  result: "Resultado",
  role: "Perfil",
  roleCode: "Perfil",
  scaffoldCode: "Andaime",
  scaffoldReturnedToPendingRelease: "Andaime voltou para pendente de liberação",
  status: "Status",
  tag: "TAG",
  title: "Título",
  type: "Tipo",
  validity_date: "Validade",
  validityDate: "Validade",
  validity_days: "Validade",
  workspace: "Workspace",
  workspaceId: "Workspace",
};

const ENTITY_LABELS: Record<string, string> = {
  COMPANY: "Empresa",
  USER: "Usuário",
  WORKSPACE: "Workspace",
  SCAFFOLD: "Andaime",
  INSPECTION: "Inspeção",
  DOCUMENT: "Documento",
  SIGNATURE: "Assinatura",
  PDF: "PDF",
  QR_CODE: "Consulta",
  SETTINGS: "Configuração",
  NON_CONFORMITY: "Não conformidade",
  NOTIFICATION: "Notificação",
};

const VALUE_LABELS: Record<string, string> = {
  ASSIGNED: "Em correção",
  CANCELLED: "Cancelado",
  CLOSED: "Encerrada",
  CL_FAIL: "Não conforme",
  CL_NA: "Não aplicável",
  CL_OK: "Conforme",
  CL_WARN: "Com ressalva",
  IN_PROGRESS: "Em tratamento",
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
  OPEN: "Aberta",
  PENDING_VERIFICATION: "Aguardando verificação",
  REJECTED: "Rejeitada",
  approved: "Aprovado",
  aprovado: "Aprovado",
  aprovado_com_ressalvas: "Aprovado com ressalvas",
  cancelled: "Cancelado",
  closed: "Encerrada",
  concluido: "Concluído",
  desmontado: "Desmontado",
  em_montagem: "Em montagem",
  in_progress: "Em tratamento",
  interditado: "Interditado",
  liberado: "Liberado",
  pending_release: "Pendente de liberação",
  pendente_liberacao: "Pendente de liberação",
  rejected: "Rejeitado",
  reprovado: "Reprovado",
  tubular: "Tubular",
  vencido: "Vencido",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getString(value: unknown, key: string) {
  if (!isRecord(value)) return null;
  const item = value[key];
  return typeof item === "string" && item.trim() ? item : null;
}

function labelField(key: string) {
  return FIELD_LABELS[key] ?? humanizeCode(key);
}

function humanizeValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (value instanceof Date) return format(value, "dd/MM/yyyy HH:mm");
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return format(date, "dd/MM/yyyy HH:mm");
    }
    return VALUE_LABELS[value] ?? humanizeCode(value);
  }
  if (Array.isArray(value)) return `${value.length} item(ns)`;
  return "Dados registrados";
}

function hasUsefulValue(value: unknown) {
  return humanizeValue(value) !== "-";
}

function stripInternalIds(value: string) {
  return value
    .replace(/\bcm[a-z0-9]{18,}\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");
}

function entityFromDescription(description: string) {
  const normalized = normalizedText(description);
  if (normalized.includes("conformidade") || /\bnc\b/.test(normalized)) {
    return "Não conformidade";
  }
  if (normalized.includes("inspe")) return "Inspeção";
  if (normalized.includes("andaime")) return "Andaime";
  if (normalized.includes("document")) return "Documento";
  if (normalized.includes("usu")) return "Usuário";
  if (normalized.includes("empresa")) return "Empresa";
  return null;
}

function humanSummaryFromAuditItem(item: AuditTimelineItem, fallback: string) {
  const newStatus =
    getString(item.newValue, "status") ?? getString(item.newValue, "result");
  const entityType =
    getString(item.newValue, "entityType") ??
    getString(item.oldValue, "entityType");
  const entityLabel =
    (entityType ? ENTITY_LABELS[entityType] ?? humanizeCode(entityType) : null) ??
    entityFromDescription(item.description);
  const description = normalizedText(item.description);

  if (description.includes("consulta publica")) return "Consultou status";
  if (description.includes("checklist")) return "Registrou checklist";
  if (description.includes("responsavel atribuido")) return "Responsável definido";
  if (
    description.includes("solicitacao de verificacao")
  ) {
    return "Solicitou verificação";
  }
  if (
    description.includes("correcao da nc")
  ) {
    if (newStatus === "REJECTED") return "Verificação rejeitada";
    if (newStatus === "CLOSED") return "Verificação aprovada";
    if (newStatus === "PENDING_VERIFICATION") return "Solicitou verificação";
    return "Atualizou correção";
  }

  if (item.action === "STATUS_CHANGE" && newStatus) {
    if (entityType === "NON_CONFORMITY" || entityLabel === "Não conformidade") {
      if (newStatus === "PENDING_VERIFICATION") return "Solicitou verificação";
      if (newStatus === "CLOSED") return "Verificação aprovada";
      if (newStatus === "REJECTED") return "Verificação rejeitada";
      if (newStatus === "ASSIGNED") return "Reabriu a NC";
    }
    if (entityType === "INSPECTION" || entityLabel === "Inspeção") {
      if (newStatus === "aprovado") return "Aprovou inspeção";
      if (newStatus === "reprovado") return "Reprovou inspeção";
    }
    if (entityType === "SCAFFOLD" || entityLabel === "Andaime") {
      if (newStatus === "liberado") return "Liberou andaime";
      if (newStatus === "interditado") return "Interditou andaime";
      if (newStatus === "reprovado") return "Reprovou andaime";
      if (newStatus === "desmontado") return "Desmontou andaime";
    }
    return `${entityLabel ?? "Registro"} ${humanizeValue(newStatus)}`.trim();
  }
  if (item.action === "COMPLETE") {
    return entityLabel ? `${entityLabel} concluído` : "Concluiu etapa";
  }
  if (item.action === "DELETE") return "Removeu registro";
  if (item.action === "CREATE" || item.action.endsWith("_CREATED")) {
    if (entityLabel === "Não conformidade") return "Criou a NC";
    return entityLabel
      ? `Criou ${entityLabel.toLocaleLowerCase("pt-BR")}`
      : "Criou registro";
  }
  if (item.action === "UPDATE" || item.action.endsWith("_UPDATED")) {
    if (entityLabel === "Não conformidade") return "Atualizou a NC";
    return entityLabel
      ? `Atualizou ${entityLabel.toLocaleLowerCase("pt-BR")}`
      : "Atualizou registro";
  }
  if (item.action.includes("DOCUMENT") || item.action === "UPLOAD") {
    if (item.description.toLocaleLowerCase("pt-BR").includes("evid")) {
      return "Anexou evidência";
    }
    return "Documento anexado";
  }
  if (item.action.includes("SIGN")) return "Assinatura registrada";

  return stripInternalIds(fallback);
}

function changedDetails(oldValue: unknown, newValue: unknown, action?: string) {
  if (!isRecord(oldValue) && !isRecord(newValue)) return [];

  const before = isRecord(oldValue) ? oldValue : {};
  const after = isRecord(newValue) ? newValue : {};

  return Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
    .filter((key) => !TECHNICAL_KEYS.has(key))
    .filter((key) => RELEVANT_DETAIL_KEYS.has(key))
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .filter((key) => hasUsefulValue(before[key]) || hasUsefulValue(after[key]))
    .filter((key) => {
      if (
        key === "requiresNewInspection" ||
        key === "scaffoldReturnedToPendingRelease"
      ) {
        return before[key] === true || after[key] === true;
      }
      return true;
    })
    .filter(
      (key) =>
        action !== "CREATE" ||
        [
          "classification",
          "dueDate",
          "result",
          "status",
          "validity_date",
          "validityDate",
          "validity_days",
        ].includes(key),
    )
    .map((key) => ({
      label: labelField(key),
      before: humanizeValue(before[key]),
      after: humanizeValue(after[key]),
    }))
    .slice(0, 8);
}

function actionMeta(action: string): {
  type: HistoryEventType;
  tone: SemanticTone;
  label: string;
} {
  if (action.includes("FAIL")) {
    return { type: "failure", tone: "critical", label: "Falha" };
  }
  if (action.includes("SYNC")) {
    return { type: "sync", tone: "neutral", label: "Sincronização" };
  }
  if (action === "CREATE" || action.endsWith("_CREATED")) {
    return { type: "create", tone: "success", label: "Criação" };
  }
  if (action === "UPDATE" || action.endsWith("_UPDATED")) {
    return { type: "update", tone: "warning", label: "Edição" };
  }
  if (action === "DELETE" || action.includes("REMOVED")) {
    return { type: "delete", tone: "critical", label: "Exclusão" };
  }
  if (action === "STATUS_CHANGE") {
    return { type: "status", tone: "warning", label: "Status" };
  }
  if (action === "COMPLETE" || action.includes("APPROVED")) {
    return { type: "inspection", tone: "success", label: "Conclusão" };
  }
  if (action.includes("REJECT")) {
    return { type: "inspection", tone: "critical", label: "Reprovação" };
  }
  if (action.includes("COMMENT")) {
    return { type: "comment", tone: "neutral", label: "Comentário" };
  }
  if (action.includes("DOCUMENT") || action === "UPLOAD") {
    return { type: "document", tone: "neutral", label: "Documento" };
  }
  if (action.includes("PHOTO") || action.includes("IMAGE")) {
    return { type: "photo", tone: "neutral", label: "Evidência" };
  }
  if (action.includes("RESPONSIBLE")) {
    return { type: "responsible", tone: "neutral", label: "Responsável" };
  }
  if (action.includes("DEADLINE") || action.includes("DUE")) {
    return { type: "deadline", tone: "warning", label: "Prazo" };
  }
  if (action.includes("SIGN")) {
    return { type: "signature", tone: "success", label: "Assinatura" };
  }

  return { type: "update", tone: "disabled", label: humanizeCode(action) };
}

function auditItemHistoryType(
  item: AuditTimelineItem,
  fallback: HistoryEventType,
): HistoryEventType {
  const newStatus =
    getString(item.newValue, "status") ?? getString(item.newValue, "result");
  const entityType =
    getString(item.newValue, "entityType") ??
    getString(item.oldValue, "entityType") ??
    entityFromDescription(item.description);
  const description = item.description.toLocaleLowerCase("pt-BR");

  if (description.includes("respons")) return "responsible";
  if (description.includes("prazo")) return "deadline";
  if (description.includes("coment")) return "comment";
  if (description.includes("evid")) return "photo";
  if (entityType === "NON_CONFORMITY" || entityType === "Não conformidade") {
    if (newStatus === "CLOSED") return "inspection";
    if (newStatus === "REJECTED") return "failure";
    if (newStatus) return "status";
    return "non_conformity";
  }
  if (entityType === "INSPECTION" || entityType === "Inspeção") return "inspection";
  if (item.action === "STATUS_CHANGE") {
    if (["reprovado", "interditado"].includes(newStatus ?? "")) return "failure";
    if (["aprovado", "liberado"].includes(newStatus ?? "")) return "inspection";
  }
  return fallback;
}

function auditItemTone(item: AuditTimelineItem, fallback: SemanticTone): SemanticTone {
  const newStatus =
    getString(item.newValue, "status") ?? getString(item.newValue, "result");

  if (["REJECTED", "reprovado", "interditado", "CANCELLED"].includes(newStatus ?? "")) {
    return "critical";
  }
  if (["CLOSED", "aprovado", "liberado"].includes(newStatus ?? "")) {
    return "success";
  }
  if (["PENDING_VERIFICATION", "ASSIGNED", "pendente_liberacao"].includes(newStatus ?? "")) {
    return "warning";
  }
  return fallback;
}

function auditItemToHistoryEvent(item: AuditTimelineItem): HistoryEvent {
  const meta = actionMeta(item.action);

  return {
    id: item.id,
    type: auditItemHistoryType(item, meta.type),
    actorName: item.userName ?? "Sistema",
    summary: humanSummaryFromAuditItem(item, item.description || meta.label),
    createdAt: item.createdAt,
    tone: auditItemTone(item, meta.tone),
    details: changedDetails(item.oldValue, item.newValue, item.action),
    metadata: {
      browser: item.browserName,
      device: item.deviceType,
      os: item.osName,
    },
  };
}

export function auditItemsToHistoryEvents(items: AuditTimelineItem[]) {
  return normalizeHistoryEvents(items.map(auditItemToHistoryEvent));
}

function eventTime(event: HistoryEvent) {
  return new Date(event.createdAt).getTime();
}

function detailSignature(details: HistoryEventDetail[] | undefined) {
  return (details ?? [])
    .map((detail) =>
      [detail.label, detail.before ?? "", detail.after ?? "", detail.value ?? ""].join(":"),
    )
    .sort()
    .join("|");
}

function eventStatus(event: HistoryEvent) {
  return (event.details ?? []).find((detail) => detail.label === "Status")?.after;
}

function eventBusinessGroup(event: HistoryEvent) {
  const text = `${event.summary} ${(event.details ?? [])
    .map((detail) => `${detail.label} ${detail.value ?? ""}`)
    .join(" ")}`.toLocaleLowerCase("pt-BR");

  if (text.includes("evid")) return "evidence";
  if (text.includes("coment")) return "comment";
  if (text.includes("respons")) return "responsible";
  if (text.includes("prazo")) return "deadline";
  if (text.includes("verifica")) return "verification";
  if (text.includes("status")) return "status";
  return null;
}

function isUsefulEvent(event: HistoryEvent) {
  return Boolean(
    event.summary.trim() ||
      (event.details?.length ?? 0) > 0 ||
      metadataDetails(event).length > 0,
  );
}

function sameBusinessMoment(current: HistoryEvent, previous: HistoryEvent) {
  const timeGap = Math.abs(eventTime(current) - eventTime(previous));
  if (timeGap > 5_000) return false;

  const sameActor = current.actorName === previous.actorName;
  const currentStatus = eventStatus(current);
  const previousStatus = eventStatus(previous);
  const sameStatus = currentStatus && previousStatus && currentStatus === previousStatus;
  const sameDetails = detailSignature(current.details) === detailSignature(previous.details);
  const currentGroup = eventBusinessGroup(current);
  const previousGroup = eventBusinessGroup(previous);
  const sameBusinessGroup = currentGroup && currentGroup === previousGroup;

  return sameActor && (sameStatus || sameDetails || sameBusinessGroup);
}

function mergeEvents(primary: HistoryEvent, secondary: HistoryEvent): HistoryEvent {
  const detailsBySignature = new Map<string, HistoryEventDetail>();
  [...(secondary.details ?? []), ...(primary.details ?? [])].forEach((detail) => {
    detailsBySignature.set(
      [detail.label, detail.before ?? "", detail.after ?? "", detail.value ?? ""].join(":"),
      detail,
    );
  });

  return {
    ...primary,
    details: Array.from(detailsBySignature.values()),
    metadata: {
      ...secondary.metadata,
      ...primary.metadata,
    },
  };
}

export function normalizeHistoryEvents(events: HistoryEvent[]) {
  const sorted = [...events]
    .filter(isUsefulEvent)
    .sort((left, right) => eventTime(left) - eventTime(right));

  const deduped = sorted.reduce<HistoryEvent[]>((result, event) => {
    const previous = result[result.length - 1];
    if (previous && sameBusinessMoment(event, previous)) {
      result[result.length - 1] = mergeEvents(event, previous);
      return result;
    }
    result.push(event);
    return result;
  }, []);

  return deduped.reverse();
}

function formatDateTime(value: Date | string) {
  return format(new Date(value), "dd/MM/yyyy HH:mm");
}

function HistoryEventIcon({ type }: { type: HistoryEventType }) {
  const className = "size-3.5";

  switch (type) {
    case "create":
      return <PlusCircle className={className} />;
    case "update":
      return <Edit3 className={className} />;
    case "delete":
      return <Trash2 className={className} />;
    case "status":
    case "sync":
      return <RefreshCw className={className} />;
    case "inspection":
      return <CheckCircle2 className={className} />;
    case "non_conformity":
    case "failure":
      return <AlertTriangle className={className} />;
    case "comment":
      return <MessageSquare className={className} />;
    case "document":
      return <Paperclip className={className} />;
    case "photo":
      return <Camera className={className} />;
    case "responsible":
      return <UserRound className={className} />;
    case "deadline":
      return <CalendarClock className={className} />;
    case "signature":
      return <PenLine className={className} />;
    default:
      return <ShieldCheck className={className} />;
  }
}

function metadataDetails(event: HistoryEvent): HistoryEventDetail[] {
  const metadata = event.metadata;
  if (!metadata) return [];

  const device = [metadata.device, metadata.os, metadata.browser]
    .filter(Boolean)
    .join(" • ");

  return [
    { label: "Dispositivo", value: device || null },
  ].filter((item) => item.value);
}

export function HistoryTimelineCompact({
  title = "Histórico de Alterações",
  events,
  initialLimit = 5,
  showFullHistoryAction = true,
  variant = "compact",
}: HistoryTimelineCompactProps) {
  const normalizedEvents = useMemo(() => normalizeHistoryEvents(events), [events]);
  const visibleEvents = normalizedEvents.slice(0, initialLimit);
  const hasMoreEvents =
    showFullHistoryAction && normalizedEvents.length > initialLimit;
  const isPage = variant === "page";

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div
        className={`flex items-center justify-between gap-3 border-b border-border bg-card ${
          isPage ? "px-4 py-3" : "px-3 py-2"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <History className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p
              className={`font-bold uppercase tracking-widest text-foreground ${
                isPage ? "text-[11px]" : "text-[10px]"
              }`}
            >
              {title}
            </p>
            <p className="mt-0.5 text-[9px] text-muted-foreground">
              {isPage
                ? `${normalizedEvents.length} evento(s) nesta página`
                : `${Math.min(initialLimit, normalizedEvents.length)} de ${
                    normalizedEvents.length
                  } evento(s)`}
            </p>
          </div>
        </div>
      </div>

      {normalizedEvents.length === 0 ? (
        <EmptyState
          icon={History}
          title="Nenhum evento de auditoria"
          description="Os eventos relevantes desta entidade aparecerão aqui."
          className="border-0 py-8"
        />
      ) : (
        <>
          <HistoryEventList events={visibleEvents} variant={variant} />
          {hasMoreEvents && (
            <div className="border-t border-border px-3 py-2">
              <p className="text-[10px] text-muted-foreground">
                Use a página de auditoria para consultar o histórico completo.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function HistoryDrawerButton({
  events,
  buttonLabel = "Histórico",
  dropdownTitle = "Histórico de Alterações",
  initialLimit = 10,
  className,
}: HistoryDropdownButtonProps) {
  const [open, setOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(initialLimit);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toggleMenu } = useExclusiveMenu(open, setOpen);
  const normalizedEvents = useMemo(() => normalizeHistoryEvents(events), [events]);
  const visibleEvents = normalizedEvents.slice(0, visibleCount);
  const hasMore = visibleCount < normalizedEvents.length;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          if (!open) setVisibleCount(initialLimit);
          toggleMenu();
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={className}
      >
        <History className="size-3.5" />
        <span className="hidden sm:inline">{buttonLabel}</span>
      </Button>

      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="history-dropdown-title"
          className="absolute right-0 top-9 z-50 w-[min(88vw,460px)] overflow-hidden rounded-md border border-border bg-card shadow-xl max-[520px]:fixed max-[520px]:inset-x-3 max-[520px]:top-[150px] max-[520px]:w-auto"
        >
          <div className="flex max-h-[68vh] flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-2.5 py-1.5">
              <div className="min-w-0">
                <p
                  id="history-dropdown-title"
                  className="text-[10px] font-bold uppercase tracking-widest text-foreground"
                >
                  {dropdownTitle}
                </p>
                <p className="mt-0.5 text-[9px] text-muted-foreground">
                  {normalizedEvents.length} evento(s)
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Fechar histórico"
                className="size-7"
              >
                <X className="size-3.5" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {normalizedEvents.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="Nenhum evento de auditoria"
                  description="Os eventos relevantes desta entidade aparecerão aqui."
                  className="border-0 py-8"
                />
              ) : (
                <>
                  <HistoryEventList events={visibleEvents} />
                  {hasMore && (
                    <div className="border-t border-border px-2.5 py-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setVisibleCount((current) => current + initialLimit)}
                      >
                        Carregar mais
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryEventList({
  events,
  variant = "compact",
}: {
  events: HistoryEvent[];
  variant?: "compact" | "page";
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <ol className="divide-y divide-border">
      {events.map((event) => (
        <HistoryEventRow
          key={event.id}
          event={event}
          variant={variant}
          expanded={expandedId === event.id}
          onToggle={() =>
            setExpandedId((current) => (current === event.id ? null : event.id))
          }
        />
      ))}
    </ol>
  );
}

function HistoryEventRow({
  event,
  expanded,
  onToggle,
  variant,
}: {
  event: HistoryEvent;
  expanded: boolean;
  onToggle: () => void;
  variant: "compact" | "page";
}) {
  const toneClasses = SEMANTIC_TONE_CLASSES[event.tone];
  const details = [...(event.details ?? []), ...metadataDetails(event)];
  const hasDetails = details.length > 0;
  const isPage = variant === "page";
  const entity = event.details?.find((detail) => detail.label === "Entidade")?.value;

  return (
    <li className="bg-card">
      <button
        type="button"
        onClick={() => {
          if (hasDetails) onToggle();
        }}
        className={`grid w-full items-center gap-2 text-left ${
          hasDetails ? "hover:bg-muted/30" : "cursor-default"
        } max-[520px]:grid-cols-[24px_minmax(0,1fr)_26px] max-[520px]:gap-x-2 ${
          isPage
            ? "grid-cols-[minmax(150px,0.9fr)_minmax(180px,1.35fr)_minmax(130px,0.8fr)_96px_28px] px-4 py-2.5"
            : "grid-cols-[minmax(112px,0.85fr)_minmax(0,1.3fr)_96px_26px] px-2.5 py-1.5"
        }`}
        aria-expanded={hasDetails ? expanded : undefined}
      >
        <div className="flex min-w-0 items-center gap-2 max-[520px]:contents">
          <span className={`flex size-5 shrink-0 items-center justify-center rounded-md bg-muted ${toneClasses.icon}`}>
            <HistoryEventIcon type={event.type} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-foreground">
              {event.actorName}
            </p>
          </div>
        </div>
        <p
          className={`min-w-0 truncate font-medium leading-snug text-foreground max-[520px]:col-start-2 ${
            isPage ? "text-[12px]" : "text-[11px]"
          }`}
        >
          {event.summary}
        </p>
        {isPage && (
          <p className="hidden min-w-0 truncate text-[10px] text-muted-foreground md:block">
            {entity ?? "-"}
          </p>
        )}
        <p className="truncate text-[10px] text-muted-foreground max-[520px]:col-start-2 max-[520px]:row-start-2">
          {formatDateTime(event.createdAt)}
        </p>
        <span
          className={`ml-auto flex size-6 items-center justify-center rounded-md border border-border bg-card text-muted-foreground max-[520px]:col-start-3 max-[520px]:row-span-2 max-[520px]:row-start-1 ${
            hasDetails ? "" : "invisible"
          }`}
          aria-hidden="true"
        >
          {expanded ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
        </span>
      </button>

      {expanded && hasDetails && (
        <div
          className={`border-t border-border bg-muted/15 py-1.5 max-[520px]:pl-8 ${
            isPage ? "px-4 pl-11" : "px-2.5 pl-9"
          }`}
        >
          {details.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">
              Nenhum detalhe adicional relevante para este evento.
            </p>
          ) : (
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {details.map((detail, index) => (
                <DetailRow key={`${event.id}-${detail.label}-${index}`} detail={detail} />
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function DetailRow({ detail }: { detail: HistoryEventDetail }) {
  const hasChange = detail.before !== undefined || detail.after !== undefined;

  return (
    <div className="min-w-[118px] max-w-full">
      <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
        {detail.label}
      </p>
      {hasChange ? (
        <p className="mt-0.5 break-words text-[10px] leading-relaxed text-foreground">
          {detail.before ?? "-"} <span className="text-muted-foreground">→</span>{" "}
          {detail.after ?? "-"}
        </p>
      ) : (
        <p className="mt-0.5 break-words text-[10px] text-foreground">
          {detail.value ?? "-"}
        </p>
      )}
    </div>
  );
}

export function AuditTimeline({
  items,
  previewCount = 5,
}: AuditTimelineProps) {
  const events = useMemo(() => auditItemsToHistoryEvents(items), [items]);

  return (
    <HistoryTimelineCompact
      events={events}
      initialLimit={previewCount}
      title="Histórico de Alterações"
    />
  );
}

export function AuditTimelineButton({
  items,
  previewCount = 10,
  className,
}: AuditTimelineProps) {
  const events = useMemo(() => auditItemsToHistoryEvents(items), [items]);

  return (
    <HistoryDrawerButton
      events={events}
      initialLimit={previewCount}
      className={className}
    />
  );
}
