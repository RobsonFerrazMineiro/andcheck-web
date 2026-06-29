import type {
  NotificationChannel,
  NotificationSeverity,
  NotificationType,
} from "@prisma/client";

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  SCAFFOLD_CREATED: "Andaime criado",
  SCAFFOLD_RELEASED: "Andaime liberado",
  SCAFFOLD_REJECTED: "Andaime reprovado",
  SCAFFOLD_INTERDICTED: "Andaime interditado",
  SCAFFOLD_DISASSEMBLED: "Andaime desmontado",
  SCAFFOLD_EXPIRED: "Andaime vencido",
  SCAFFOLD_EXPIRING_SOON: "Andaime proximo do vencimento",
  INSPECTION_PENDING: "Inspecao pendente",
  INSPECTION_COMPLETED: "Inspecao realizada",
  INSPECTION_APPROVED: "Inspecao aprovada",
  INSPECTION_REJECTED: "Inspecao reprovada",
  INSPECTION_WITH_REMARKS: "Inspecao com ressalvas",
  NONCONFORMITY_OPENED: "NC aberta",
  NONCONFORMITY_IN_PROGRESS: "NC em tratamento",
  NONCONFORMITY_CORRECTED: "NC corrigida",
  NONCONFORMITY_CLOSED: "NC encerrada",
  NONCONFORMITY_EXPIRED: "NC vencida",
  NONCONFORMITY_EXPIRING_SOON: "NC proxima do vencimento",
  DOCUMENT_ATTACHED: "Documento anexado",
  DOCUMENT_EXPIRED: "Documento vencido",
  DOCUMENT_EXPIRING_SOON: "Documento proximo do vencimento",
};

export const NOTIFICATION_DEFAULT_SEVERITY: Record<
  NotificationType,
  NotificationSeverity
> = {
  SCAFFOLD_CREATED: "INFO",
  SCAFFOLD_RELEASED: "SUCCESS",
  SCAFFOLD_REJECTED: "WARNING",
  SCAFFOLD_INTERDICTED: "CRITICAL",
  SCAFFOLD_DISASSEMBLED: "INFO",
  SCAFFOLD_EXPIRED: "CRITICAL",
  SCAFFOLD_EXPIRING_SOON: "WARNING",
  INSPECTION_PENDING: "WARNING",
  INSPECTION_COMPLETED: "INFO",
  INSPECTION_APPROVED: "SUCCESS",
  INSPECTION_REJECTED: "CRITICAL",
  INSPECTION_WITH_REMARKS: "WARNING",
  NONCONFORMITY_OPENED: "WARNING",
  NONCONFORMITY_IN_PROGRESS: "INFO",
  NONCONFORMITY_CORRECTED: "SUCCESS",
  NONCONFORMITY_CLOSED: "SUCCESS",
  NONCONFORMITY_EXPIRED: "CRITICAL",
  NONCONFORMITY_EXPIRING_SOON: "WARNING",
  DOCUMENT_ATTACHED: "INFO",
  DOCUMENT_EXPIRED: "CRITICAL",
  DOCUMENT_EXPIRING_SOON: "WARNING",
};

export const NOTIFICATION_ENTITY_GROUPS: Record<NotificationType, string> = {
  SCAFFOLD_CREATED: "SCAFFOLD",
  SCAFFOLD_RELEASED: "SCAFFOLD",
  SCAFFOLD_REJECTED: "SCAFFOLD",
  SCAFFOLD_INTERDICTED: "SCAFFOLD",
  SCAFFOLD_DISASSEMBLED: "SCAFFOLD",
  SCAFFOLD_EXPIRED: "SCAFFOLD",
  SCAFFOLD_EXPIRING_SOON: "SCAFFOLD",
  INSPECTION_PENDING: "INSPECTION",
  INSPECTION_COMPLETED: "INSPECTION",
  INSPECTION_APPROVED: "INSPECTION",
  INSPECTION_REJECTED: "INSPECTION",
  INSPECTION_WITH_REMARKS: "INSPECTION",
  NONCONFORMITY_OPENED: "NONCONFORMITY",
  NONCONFORMITY_IN_PROGRESS: "NONCONFORMITY",
  NONCONFORMITY_CORRECTED: "NONCONFORMITY",
  NONCONFORMITY_CLOSED: "NONCONFORMITY",
  NONCONFORMITY_EXPIRED: "NONCONFORMITY",
  NONCONFORMITY_EXPIRING_SOON: "NONCONFORMITY",
  DOCUMENT_ATTACHED: "DOCUMENT",
  DOCUMENT_EXPIRED: "DOCUMENT",
  DOCUMENT_EXPIRING_SOON: "DOCUMENT",
};

export const NOTIFICATION_GROUP_LABELS: Record<string, string> = {
  SCAFFOLD: "Andaimes",
  INSPECTION: "Inspecoes",
  NONCONFORMITY: "NCs",
  DOCUMENT: "Documentos",
};

export const NOTIFICATION_SEVERITY_LABELS: Record<NotificationSeverity, string> = {
  INFO: "Info",
  SUCCESS: "Sucesso",
  WARNING: "Alerta",
  CRITICAL: "Critica",
};

export const CRITICAL_DEFAULT_EMAIL_ROLES = new Set([
  "SUPER_ADMIN",
  "HSE_HYDRO",
  "HSE_GERENCIADORA",
  "ADMIN_EMPRESA",
  "HSE_EMPRESA",
  "SUPERVISOR",
  "ENCARREGADO",
  "SUPERVISOR_ENCARREGADO",
]);

export function normalizeChannels(
  channels: NotificationChannel[] | undefined,
  severity: NotificationSeverity,
) {
  const normalized = new Set<NotificationChannel>(
    channels ?? ["INTERNAL"],
  );
  if (severity === "CRITICAL") {
    normalized.add("INTERNAL");
  }
  return Array.from(normalized);
}

export function notificationEntityPath(
  entityType: string | null | undefined,
  entityId: string | null | undefined,
) {
  if (!entityType || !entityId) return "/notificacoes";

  if (entityType === "SCAFFOLD") return `/andaimes/${entityId}`;
  if (entityType === "INSPECTION") return `/inspecoes/${entityId}`;
  if (entityType === "NONCONFORMITY") return `/nao-conformidades/${entityId}`;
  if (entityType === "DOCUMENT") return `/documentos/${entityId}`;

  return "/notificacoes";
}
