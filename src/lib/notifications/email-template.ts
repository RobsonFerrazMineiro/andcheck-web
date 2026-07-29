import "server-only";

import {
  NOTIFICATION_TYPE_LABELS,
  notificationEntityPath,
} from "@/lib/notifications/catalog";
import type { NotificationSeverity, NotificationType } from "@prisma/client";

export type NotificationEmailTemplateData = {
  title: string;
  message: string;
  severity: NotificationSeverity;
  notificationType: NotificationType;
  recipientName?: string | null;
  companyName?: string | null;
  workspaceName?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
  appBaseUrl?: string | null;
};

export type NotificationEmailRender = {
  subject: string;
  html: string;
  text: string;
  actionUrl: string;
  actionLabel: string;
};

const BRAND_NAME = "ANDCHECK";
const BRAND_PRIMARY = "#d35400";
const BRAND_DARK = "#111827";
const BRAND_MUTED = "#64748b";
const BRAND_BORDER = "#e2e8f0";
const BRAND_BACKGROUND = "#f8fafc";

const SEVERITY_TONES: Record<
  NotificationSeverity,
  { label: string; color: string; background: string }
> = {
  INFO: { label: "Informação", color: "#2563eb", background: "#eff6ff" },
  SUCCESS: { label: "Sucesso", color: "#047857", background: "#ecfdf5" },
  WARNING: { label: "Atenção", color: "#b45309", background: "#fffbeb" },
  CRITICAL: { label: "Crítica", color: "#b91c1c", background: "#fef2f2" },
};

const EVENT_LABELS: Partial<Record<NotificationType, string>> = {
  SCAFFOLD_CREATED: "Andaime criado",
  SCAFFOLD_RELEASED: "Andaime liberado",
  SCAFFOLD_REJECTED: "Andaime reprovado",
  SCAFFOLD_INTERDICTED: "Andaime interditado",
  SCAFFOLD_DISASSEMBLED: "Andaime desmontado",
  SCAFFOLD_EXPIRED: "Andaime vencido",
  SCAFFOLD_EXPIRING_SOON: "Andaime próximo do vencimento",
  INSPECTION_PENDING: "Inspeção pendente",
  INSPECTION_COMPLETED: "Inspeção realizada",
  INSPECTION_APPROVED: "Inspeção aprovada",
  INSPECTION_REJECTED: "Inspeção reprovada",
  INSPECTION_WITH_REMARKS: "Inspeção com ressalvas",
  NONCONFORMITY_OPENED: "NC aberta",
  NONCONFORMITY_IN_PROGRESS: "NC em tratamento",
  NONCONFORMITY_CORRECTED: "NC corrigida",
  NONCONFORMITY_CLOSED: "NC encerrada",
  NONCONFORMITY_EXPIRED: "NC vencida",
  NONCONFORMITY_EXPIRING_SOON: "NC próxima do vencimento",
  DOCUMENT_ATTACHED: "Documento anexado",
  DOCUMENT_EXPIRED: "Documento vencido",
  DOCUMENT_EXPIRING_SOON: "Documento próximo do vencimento",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  ARCHIVED: "Arquivado",
  ASSIGNED: "Em correção",
  CANCELLED: "Cancelada",
  CLOSED: "Encerrada",
  CRITICAL: "Crítica",
  EXPIRED: "Vencido",
  IN_PROGRESS: "Em tratamento",
  OPEN: "Aberta",
  PENDING_VERIFICATION: "Pendente de verificação",
  REJECTED: "Rejeitada",
  aprovado: "Aprovado",
  aprovado_com_ressalvas: "Aprovado com ressalvas",
  conforme: "Conforme",
  desmontado: "Desmontado",
  em_montagem: "Em montagem",
  interditado: "Interditado",
  liberado: "Liberado",
  nao_aplicavel: "Não aplicável",
  nao_conforme: "Não conforme",
  pendente: "Pendente",
  pendente_liberacao: "Pendente de liberação",
  reprovado: "Reprovado",
  vencido: "Vencido",
};

export function buildNotificationEmail(
  data: NotificationEmailTemplateData,
): NotificationEmailRender {
  const appBaseUrl = resolveAppBaseUrl(data.appBaseUrl);
  const actionPath = notificationEntityPath(data.entityType, data.entityId);
  const actionUrl = new URL(actionPath, appBaseUrl).toString();
  const actionLabel = actionLabelForEntity(data.entityType);
  const preferencesUrl = new URL("/perfil/notificacoes", appBaseUrl).toString();
  const appUrl = new URL("/", appBaseUrl).toString();
  const metadata = data.metadata ?? {};
  const severity = SEVERITY_TONES[data.severity];
  const eventLabel =
    EVENT_LABELS[data.notificationType] ??
    normalizeDisplayText(NOTIFICATION_TYPE_LABELS[data.notificationType]);
  const badgeLabel = eventLabel.toLocaleUpperCase("pt-BR");
  const displayTitle = normalizeDisplayText(data.title);
  const displayMessage = normalizeDisplayText(data.message);
  const tagLabel =
    stringValue(metadata.entityLabel) ?? stringValue(metadata.scaffoldCode);
  const year = data.occurredAt.getFullYear();

  const detailRows = compactRows([
    ["🏢", "Empresa", data.companyName],
    ["📍", "Workspace", data.workspaceName],
    ["•", "Severidade", severity.label],
    ["🔔", "Tipo de evento", eventLabel],
    ["📍", "Área", stringValue(metadata.area)],
    ["•", "Status", statusValue(metadata.status)],
    ["📄", "Documento", stringValue(metadata.documentTitle)],
    ["📁", "Categoria", stringValue(metadata.category)],
    ["📅", "Validade", dateValue(metadata.validityDate)],
    ["📅", "Prazo", dateValue(metadata.dueDate) ?? dateValue(metadata.expiryDate)],
    ["⏳", "Dias restantes", numberValue(metadata.daysUntilDue)],
    ["⏱️", "Dias em atraso", numberValue(metadata.daysOverdue)],
    ["📅", "Data/hora", formatDate(data.occurredAt)],
  ]);

  const detailsHtml = detailRows
    .map(
      ([icon, label, value]) =>
        `<tr><td style="padding:8px 0;width:22px;color:${BRAND_MUTED};font-size:13px;vertical-align:top">${escapeHtml(icon)}</td><td style="padding:8px 0;color:${BRAND_MUTED};font-size:13px;vertical-align:top">${escapeHtml(label)}</td><td style="padding:8px 0;text-align:right;font-weight:700;color:${BRAND_DARK};font-size:13px;vertical-align:top">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  const greeting = data.recipientName
    ? `<p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.5">Olá, <strong style="color:${BRAND_DARK};font-weight:800">${escapeHtml(data.recipientName)}</strong>.</p>`
    : "";

  const tagHero = tagLabel
    ? `<div style="margin:14px 0 18px;padding:14px 16px;background:${BRAND_BACKGROUND};border-left:4px solid ${BRAND_PRIMARY};border-radius:6px"><p style="margin:0 0 5px;color:${BRAND_MUTED};font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">TAG</p><p style="margin:0;color:${BRAND_DARK};font-size:24px;font-weight:900;letter-spacing:.02em">${escapeHtml(tagLabel)}</p></div>`
    : "";

  const contextLine = [data.companyName, data.workspaceName]
    .filter((value): value is string => Boolean(value))
    .join(" / ");

  const footerContext = contextLine
    ? `<p style="margin:8px 0 0;color:${BRAND_MUTED};font-size:12px">${escapeHtml(contextLine)}</p>`
    : "";

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:${BRAND_BACKGROUND};font-family:Arial,Helvetica,sans-serif;color:${BRAND_DARK};-webkit-text-size-adjust:100%;text-size-adjust:100%">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:${BRAND_BACKGROUND};padding:24px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border-collapse:collapse;background:#ffffff;border:1px solid ${BRAND_BORDER}">
            <tr>
              <td style="padding:18px 22px;background:${BRAND_DARK};border-bottom:4px solid ${BRAND_PRIMARY}">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
                  <tr>
                    <td style="vertical-align:middle">
                      <span style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;background:${BRAND_PRIMARY};color:#ffffff;font-weight:800;font-size:13px;border-radius:4px" aria-label="AndCheck">AC</span>
                      <span style="display:inline-block;margin-left:10px;color:#ffffff;font-weight:800;font-size:15px;letter-spacing:.14em;vertical-align:middle">${BRAND_NAME}</span>
                    </td>
                    <td align="right" style="color:#cbd5e1;font-size:12px;vertical-align:middle">Comunicação operacional</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 22px 8px">
                <span style="display:inline-block;padding:6px 10px;background:${severity.background};color:${severity.color};border:1px solid ${severity.color};border-radius:6px;font-size:12px;font-weight:800;letter-spacing:.04em">${escapeHtml(badgeLabel)}</span>
                ${tagHero}
                ${greeting}
                <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.55">${escapeHtml(displayMessage)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 22px 20px">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border-top:1px solid ${BRAND_BORDER};border-bottom:1px solid ${BRAND_BORDER};margin:0 0 20px">
                  ${detailsHtml}
                </table>
                <a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:${BRAND_PRIMARY};color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:12px 16px;border-radius:4px">${escapeHtml(actionLabel)}</a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:18px 22px;background:${BRAND_BACKGROUND};border-top:1px solid ${BRAND_BORDER};text-align:center">
                <p style="margin:0;color:${BRAND_MUTED};font-size:12px;line-height:1.5">Esta é uma mensagem automática enviada pelo AndCheck. Você pode revisar suas preferências de notificação no seu perfil.</p>
                <p style="margin:8px 0 0;color:${BRAND_MUTED};font-size:12px;line-height:1.5"><a href="${escapeHtml(preferencesUrl)}" style="color:${BRAND_PRIMARY};font-weight:700;text-decoration:none">Preferências de notificação</a> &bull; <a href="${escapeHtml(appUrl)}" style="color:${BRAND_PRIMARY};font-weight:700;text-decoration:none">Abrir AndCheck</a></p>
                ${footerContext}
                <p style="margin:10px 0 0;color:${BRAND_DARK};font-size:12px;font-weight:800">AndCheck Enterprise</p>
                <p style="margin:2px 0 0;color:#94a3b8;font-size:11px">Plataforma Corporativa para Gestão de Inspeções Industriais</p>
                <p style="margin:8px 0 0;color:#94a3b8;font-size:11px">&copy; ${year} AndCheck</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textRows = detailRows.map(([, label, value]) => `${label}: ${value}`);
  const text = [
    BRAND_NAME,
    "",
    displayTitle,
    "",
    data.recipientName ? `Olá, ${data.recipientName}.` : "",
    tagLabel ? `TAG: ${tagLabel}` : "",
    displayMessage,
    "",
    ...textRows,
    "",
    `${actionLabel}: ${actionUrl}`,
    "",
    `Preferências de notificação: ${preferencesUrl}`,
    `Abrir AndCheck: ${appUrl}`,
    "",
    "AndCheck Enterprise",
    "Plataforma Corporativa para Gestão de Inspeções Industriais",
    "Esta é uma mensagem automática enviada pelo AndCheck.",
  ]
    .filter((line) => line !== "")
    .join("\n");

  return {
    subject: `[AndCheck] ${displayTitle}`,
    html,
    text,
    actionUrl,
    actionLabel,
  };
}

function compactRows(
  rows: Array<[string, string, string | null | undefined]>,
) {
  return rows.filter(
    (row): row is [string, string, string] => Boolean(row[2]?.trim()),
  );
}

function actionLabelForEntity(entityType?: string | null) {
  if (entityType === "SCAFFOLD") return "Visualizar andaime";
  if (entityType === "INSPECTION") return "Visualizar inspeção";
  if (entityType === "NONCONFORMITY") return "Visualizar não conformidade";
  if (entityType === "DOCUMENT") return "Visualizar documento";
  return "Abrir no AndCheck";
}

function resolveAppBaseUrl(input?: string | null) {
  const raw = input || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const url = new URL(raw);
    return url.toString();
  } catch {
    return "http://localhost:3000";
  }
}

function formatDate(date: Date) {
  return date.toLocaleString("pt-BR", { timeZone: "America/Fortaleza" });
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : null;
}

function statusValue(value: unknown) {
  const status = stringValue(value);
  if (!status) return null;
  return STATUS_LABELS[status] ?? humanizeStatus(status);
}

function humanizeStatus(value: string) {
  const normalized = value
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
  return normalized.replace(/^\p{L}/u, (letter) =>
    letter.toLocaleUpperCase("pt-BR"),
  );
}

function normalizeDisplayText(value: string) {
  return value
    .replaceAll("Inspecao", "Inspeção")
    .replaceAll("inspecao", "inspeção")
    .replaceAll("Notificacao", "Notificação")
    .replaceAll("notificacao", "notificação")
    .replaceAll("nao conformidade", "não conformidade")
    .replaceAll("Nao conformidade", "Não conformidade")
    .replaceAll("proximo", "próximo")
    .replaceAll("Proximo", "Próximo")
    .replaceAll("proxima", "próxima")
    .replaceAll("Proxima", "Próxima")
    .replaceAll("esta vencido", "está vencido")
    .replaceAll("esta vencida", "está vencida");
}

function dateValue(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatDate(date);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
