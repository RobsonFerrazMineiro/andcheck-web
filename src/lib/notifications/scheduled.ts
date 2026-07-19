import "server-only";

import { createNotification } from "@/lib/notifications/service";
import { prisma } from "@/lib/prisma";
import {
  DocumentStatus,
  NonConformityStatus,
  ScaffoldStatus,
} from "@prisma/client";

const WARNING_WINDOWS = new Set([7, 3, 1, 0]);
const FINAL_NC_STATUSES = [
  NonConformityStatus.CLOSED,
  NonConformityStatus.CANCELLED,
];

export async function runDailyNotificationChecks(now = new Date()) {
  const today = startOfDay(now);
  const maxDate = addDays(today, 7);
  const result = {
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
      await createNotification({
        companyId: scaffold.companyId,
        workspaceId: scaffold.workspaceId,
        type: "SCAFFOLD_EXPIRED",
        severity: "CRITICAL",
        title: `Andaime ${scaffold.code} vencido`,
        message: `O andaime ${scaffold.code} esta vencido.`,
        entityType: "SCAFFOLD",
        entityId: scaffold.id,
        channels: ["INTERNAL", "EMAIL"],
        referenceDate: scaffold.validity_date,
        metadata: {
          entityLabel: scaffold.code,
          status: scaffold.status,
          area: scaffold.area,
          validityDate: scaffold.validity_date.toISOString(),
        },
      });
      result.scaffoldExpired++;
    } else if (WARNING_WINDOWS.has(days)) {
      await createNotification({
        companyId: scaffold.companyId,
        workspaceId: scaffold.workspaceId,
        type: "SCAFFOLD_EXPIRING_SOON",
        severity: "WARNING",
        title: `Andaime ${scaffold.code} proximo do vencimento`,
        message: `O andaime ${scaffold.code} vence em ${days} dia(s).`,
        entityType: "SCAFFOLD",
        entityId: scaffold.id,
        channels: ["INTERNAL", "EMAIL"],
        referenceDate: scaffold.validity_date,
        metadata: {
          entityLabel: scaffold.code,
          status: scaffold.status,
          area: scaffold.area,
          validityDate: scaffold.validity_date.toISOString(),
        },
      });
      result.scaffoldExpiring++;
    }
  }

  for (const nc of nonConformities) {
    if (!nc.dueDate) continue;
    const days = daysUntil(today, nc.dueDate);
    if (days < 0) {
      await createNotification({
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
        referenceDate: nc.dueDate,
        metadata: {
          entityLabel: nc.code,
          status: nc.status,
          scaffoldCode: nc.scaffold.code,
          dueDate: nc.dueDate.toISOString(),
        },
      });
      result.nonConformityExpired++;
    } else if (WARNING_WINDOWS.has(days)) {
      await createNotification({
        companyId: nc.companyId,
        workspaceId: nc.workspaceId,
        userId: nc.responsibleUserId,
        type: "NONCONFORMITY_EXPIRING_SOON",
        severity: "WARNING",
        title: `NC ${nc.code} proxima do vencimento`,
        message: `A não conformidade ${nc.code} vence em ${days} dia(s).`,
        entityType: "NONCONFORMITY",
        entityId: nc.id,
        channels: ["INTERNAL", "EMAIL"],
        referenceDate: nc.dueDate,
        metadata: {
          entityLabel: nc.code,
          status: nc.status,
          scaffoldCode: nc.scaffold.code,
          dueDate: nc.dueDate.toISOString(),
        },
      });
      result.nonConformityExpiring++;
    }
  }

  for (const document of documents) {
    if (!document.expiryDate || !document.companyId) continue;
    const days = daysUntil(today, document.expiryDate);
    if (days < 0) {
      await createNotification({
        companyId: document.companyId,
        workspaceId: document.workspaceId,
        type: "DOCUMENT_EXPIRED",
        severity: "CRITICAL",
        title: `Documento ${document.title} vencido`,
        message: `O documento ${document.title} esta vencido.`,
        entityType: "DOCUMENT",
        entityId: document.id,
        channels: ["INTERNAL", "EMAIL"],
        referenceDate: document.expiryDate,
        metadata: {
          entityLabel: document.title,
          status: document.status,
          category: document.category,
          expiryDate: document.expiryDate.toISOString(),
        },
      });
      result.documentExpired++;
    } else if (WARNING_WINDOWS.has(days)) {
      await createNotification({
        companyId: document.companyId,
        workspaceId: document.workspaceId,
        type: "DOCUMENT_EXPIRING_SOON",
        severity: "WARNING",
        title: `Documento ${document.title} proximo do vencimento`,
        message: `O documento ${document.title} vence em ${days} dia(s).`,
        entityType: "DOCUMENT",
        entityId: document.id,
        channels: ["INTERNAL", "EMAIL"],
        referenceDate: document.expiryDate,
        metadata: {
          entityLabel: document.title,
          status: document.status,
          category: document.category,
          expiryDate: document.expiryDate.toISOString(),
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

    await createNotification({
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
        : `Documento ${document.title} proximo do vencimento`,
      message: expired
        ? `O documento ${document.title} do andaime ${document.scaffold.code} esta vencido.`
        : `O documento ${document.title} do andaime ${document.scaffold.code} vence em ${days} dia(s).`,
      entityType: "SCAFFOLD",
      entityId: document.scaffold_id,
      channels: ["INTERNAL", "EMAIL"],
      referenceDate: document.expires_at,
      metadata: {
        entityLabel: document.scaffold.code,
        status: document.type,
        area: document.scaffold.area,
        documentTitle: document.title,
        expiryDate: document.expires_at.toISOString(),
      },
    });

    if (expired) result.documentExpired++;
    else result.documentExpiring++;
  }

  return result;
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function daysUntil(today: Date, target: Date) {
  const targetDay = startOfDay(target);
  return Math.floor(
    (targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}
