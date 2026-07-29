import "server-only";

import { createNotification } from "@/lib/notifications/service";
import { prisma } from "@/lib/prisma";
import {
  DocumentStatus,
  NonConformityStatus,
  ScaffoldStatus,
} from "@prisma/client";

const WARNING_WINDOWS = new Set([7, 3, 1, 0]);
const APP_TIME_ZONE = "America/Fortaleza";
const DAY_MS = 1000 * 60 * 60 * 24;
const FINAL_NC_STATUSES = [
  NonConformityStatus.CLOSED,
  NonConformityStatus.CANCELLED,
];

export async function runDailyNotificationChecks(now = new Date()) {
  const today = now;
  const maxDate = addDays(today, 8);
  const result = {
    processed: 0,
    created: 0,
    sent: 0,
    failed: 0,
    ignored: 0,
    scaffoldExpiring: 0,
    scaffoldExpired: 0,
    nonConformityExpiring: 0,
    nonConformityExpired: 0,
    documentExpiring: 0,
    documentExpired: 0,
  };

  const [scaffolds, nonConformities, documents, scaffoldDocuments] =
    await Promise.all([
      prisma.scaffold.findMany({
        where: {
          status: { notIn: [ScaffoldStatus.desmontado] },
          validity_date: { lte: maxDate },
        },
        include: { tenantCompany: { select: { name: true } } },
      }),
      prisma.nonConformity.findMany({
        where: {
          status: { notIn: FINAL_NC_STATUSES },
          dueDate: { lte: maxDate },
        },
        include: { scaffold: { select: { code: true, area: true } } },
      }),
      prisma.document.findMany({
        where: {
          status: { not: DocumentStatus.ARCHIVED },
          expiryDate: { lte: maxDate },
        },
        include: {
          company: { select: { name: true } },
          workspace: { select: { name: true } },
        },
      }),
      prisma.scaffoldDocument.findMany({
        where: { expires_at: { lte: maxDate } },
        include: {
          scaffold: { select: { id: true, code: true, area: true } },
          tenantCompany: { select: { name: true } },
          workspace: { select: { name: true } },
        },
      }),
    ]);

  for (const scaffold of scaffolds) {
    if (!scaffold.validity_date) continue;
    const days = daysUntil(today, scaffold.validity_date);
    if (days < 0) {
      await notify(result, {
        companyId: scaffold.companyId,
        workspaceId: scaffold.workspaceId,
        type: "SCAFFOLD_EXPIRED",
        severity: "CRITICAL",
        title: `Andaime ${scaffold.code} vencido`,
        message: `O andaime ${scaffold.code} esta vencido.`,
        entityType: "SCAFFOLD",
        entityId: scaffold.id,
        channels: ["INTERNAL", "EMAIL"],
        referenceDate: dedupeReference(scaffold.validity_date, days),
        metadata: {
          entityLabel: scaffold.code,
          status: scaffold.status,
          area: scaffold.area,
          validityDate: scaffold.validity_date.toISOString(),
          daysOverdue: Math.abs(days),
        },
      });
      result.scaffoldExpired++;
    } else if (WARNING_WINDOWS.has(days)) {
      await notify(result, {
        companyId: scaffold.companyId,
        workspaceId: scaffold.workspaceId,
        type: "SCAFFOLD_EXPIRING_SOON",
        severity: "WARNING",
        title: `Andaime ${scaffold.code} próximo do vencimento`,
        message: `O andaime ${scaffold.code} vence em ${days} dia(s).`,
        entityType: "SCAFFOLD",
        entityId: scaffold.id,
        channels: ["INTERNAL", "EMAIL"],
        referenceDate: dedupeReference(scaffold.validity_date, days),
        metadata: {
          entityLabel: scaffold.code,
          status: scaffold.status,
          area: scaffold.area,
          validityDate: scaffold.validity_date.toISOString(),
          daysUntilDue: days,
        },
      });
      result.scaffoldExpiring++;
    }
  }

  for (const nc of nonConformities) {
    if (!nc.dueDate) continue;
    const days = daysUntil(today, nc.dueDate);
    if (days < 0) {
      await notify(result, {
        companyId: nc.companyId,
        workspaceId: nc.workspaceId,
        userId: nc.responsibleUserId,
        type: "NONCONFORMITY_EXPIRED",
        severity: "CRITICAL",
        title: `NC ${nc.code} vencida`,
        message: `A não conformidade ${nc.code} está vencida.`,
        entityType: "NONCONFORMITY",
        entityId: nc.id,
        channels: ["INTERNAL", "EMAIL"],
        referenceDate: dedupeReference(nc.dueDate, days),
        metadata: {
          entityLabel: nc.code,
          status: nc.status,
          scaffoldCode: nc.scaffold.code,
          dueDate: nc.dueDate.toISOString(),
          daysOverdue: Math.abs(days),
        },
      });
      result.nonConformityExpired++;
    } else if (WARNING_WINDOWS.has(days)) {
      await notify(result, {
        companyId: nc.companyId,
        workspaceId: nc.workspaceId,
        userId: nc.responsibleUserId,
        type: "NONCONFORMITY_EXPIRING_SOON",
        severity: "WARNING",
        title: `NC ${nc.code} próxima do vencimento`,
        message: `A não conformidade ${nc.code} vence em ${days} dia(s).`,
        entityType: "NONCONFORMITY",
        entityId: nc.id,
        channels: ["INTERNAL", "EMAIL"],
        referenceDate: dedupeReference(nc.dueDate, days),
        metadata: {
          entityLabel: nc.code,
          status: nc.status,
          scaffoldCode: nc.scaffold.code,
          dueDate: nc.dueDate.toISOString(),
          daysUntilDue: days,
        },
      });
      result.nonConformityExpiring++;
    }
  }

  for (const document of documents) {
    if (!document.expiryDate || !document.companyId) continue;
    const days = daysUntil(today, document.expiryDate);
    if (days < 0) {
      await notify(result, {
        companyId: document.companyId,
        workspaceId: document.workspaceId,
        type: "DOCUMENT_EXPIRED",
        severity: "CRITICAL",
        title: `Documento ${document.title} vencido`,
        message: `O documento ${document.title} esta vencido.`,
        entityType: "DOCUMENT",
        entityId: document.id,
        channels: ["INTERNAL", "EMAIL"],
        referenceDate: dedupeReference(document.expiryDate, days),
        metadata: {
          entityLabel: document.title,
          status: document.status,
          category: document.category,
          expiryDate: document.expiryDate.toISOString(),
          daysOverdue: Math.abs(days),
        },
      });
      result.documentExpired++;
    } else if (WARNING_WINDOWS.has(days)) {
      await notify(result, {
        companyId: document.companyId,
        workspaceId: document.workspaceId,
        type: "DOCUMENT_EXPIRING_SOON",
        severity: "WARNING",
        title: `Documento ${document.title} próximo do vencimento`,
        message: `O documento ${document.title} vence em ${days} dia(s).`,
        entityType: "DOCUMENT",
        entityId: document.id,
        channels: ["INTERNAL", "EMAIL"],
        referenceDate: dedupeReference(document.expiryDate, days),
        metadata: {
          entityLabel: document.title,
          status: document.status,
          category: document.category,
          expiryDate: document.expiryDate.toISOString(),
          daysUntilDue: days,
        },
      });
      result.documentExpiring++;
    }
  }

  for (const document of scaffoldDocuments) {
    if (!document.expires_at) continue;
    const days = daysUntil(today, document.expires_at);
    const expired = days < 0;
    if (!expired && !WARNING_WINDOWS.has(days)) continue;

    await notify(result, {
      companyId: document.companyId,
      workspaceId: document.workspaceId,
      type: expired
        ? "DOCUMENT_EXPIRED"
        : "DOCUMENT_EXPIRING_SOON",
      severity: expired
        ? "CRITICAL"
        : "WARNING",
      title: expired
        ? `Documento ${document.title} vencido`
        : `Documento ${document.title} próximo do vencimento`,
      message: expired
        ? `O documento ${document.title} do andaime ${document.scaffold.code} está vencido.`
        : `O documento ${document.title} do andaime ${document.scaffold.code} vence em ${days} dia(s).`,
      entityType: "SCAFFOLD",
      entityId: document.scaffold_id,
      channels: ["INTERNAL", "EMAIL"],
      referenceDate: dedupeReference(document.expires_at, days),
      metadata: {
        entityLabel: document.scaffold.code,
        status: document.type,
        area: document.scaffold.area,
        documentTitle: document.title,
        expiryDate: document.expires_at.toISOString(),
        ...(expired ? { daysOverdue: Math.abs(days) } : { daysUntilDue: days }),
      },
    });

    if (expired) result.documentExpired++;
    else result.documentExpiring++;
  }

  return result;
}

type DailyNotificationResult = Awaited<ReturnType<typeof runDailyNotificationChecks>>;
type NotificationInput = Parameters<typeof createNotification>[0];

async function notify(
  result: DailyNotificationResult,
  input: NotificationInput,
) {
  result.processed++;
  try {
    const created = await createNotification(input);
    result.created += created.length;
    result.sent += created.filter((notification) => notification.status === "SENT").length;
    result.failed += created.filter(
      (notification) => notification.status === "FAILED",
    ).length;
    if (created.length === 0) result.ignored++;
  } catch {
    result.failed++;
  }
}

function dedupeReference(date: Date, days: number) {
  const day = date.toISOString().slice(0, 10);
  return `${day}:${days < 0 ? "EXPIRED" : `D-${days}`}`;
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function daysUntil(today: Date, target: Date) {
  return dayNumber(target) - dayNumber(today);
}

function dayNumber(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}
