import "server-only";

import {
  CRITICAL_DEFAULT_EMAIL_ROLES,
  NOTIFICATION_DEFAULT_SEVERITY,
  normalizeChannels,
  notificationEntityPath,
} from "@/lib/notifications/catalog";
import { AuditAction, AuditEntityType, createAuditLog } from "@/lib/audit";
import { renderNotificationEmail, sendEmail } from "@/lib/notifications/email";
import { prisma } from "@/lib/prisma";
import { sanitizeForLog } from "@/lib/safe-log";
import {
  Prisma,
  type NotificationChannel,
  type NotificationSeverity,
  type NotificationType,
} from "@prisma/client";

type CreateNotificationInput = {
  companyId: string;
  workspaceId?: string | null;
  userId?: string | null;
  type: NotificationType;
  severity?: NotificationSeverity;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  channels?: NotificationChannel[];
  metadata?: Prisma.InputJsonValue;
  referenceDate?: Date | string | null;
};

type NotificationRecipient = {
  id: string;
  name: string;
  email: string;
  roleCodes: string[];
};

export async function createNotification(input: CreateNotificationInput) {
  try {
    const severity =
      input.severity ?? NOTIFICATION_DEFAULT_SEVERITY[input.type];
    const channels = normalizeChannels(input.channels, severity);
    const recipients = await resolveRecipients(input);
    const created = [];

    for (const recipient of recipients) {
      const preference = await prisma.notificationPreference.findUnique({
        where: {
          userId_companyId_type: {
            userId: recipient.id,
            companyId: input.companyId,
            type: input.type,
          },
        },
      });
      const shouldCreateInternal =
        channels.includes("INTERNAL") &&
        (severity === "CRITICAL" || preference?.internal !== false);
      const shouldSendEmail =
        channels.includes("EMAIL") &&
        (preference?.email ??
          defaultEmailPreference(severity, recipient.roleCodes)) &&
        (await isEmailEnabledForCompany(input.companyId));

      if (!shouldCreateInternal && !shouldSendEmail) continue;

      const dedupeKey = buildDedupeKey({
        ...input,
        userId: recipient.id,
        referenceDate: input.referenceDate,
      });

      const notification = await prisma.notification
        .create({
          data: {
            companyId: input.companyId,
            workspaceId: input.workspaceId ?? null,
            userId: recipient.id,
            type: input.type,
            severity,
            title: input.title,
            message: input.message,
            entityType: input.entityType ?? null,
            entityId: input.entityId ?? null,
            channels: channels.filter((channel) =>
              channel === "EMAIL" ? shouldSendEmail : shouldCreateInternal,
            ),
            metadata: input.metadata ?? Prisma.JsonNull,
            dedupeKey,
          },
        })
        .catch((error: unknown) => {
          if (
            error instanceof Error &&
            error.message.includes("Unique constraint")
          ) {
            return null;
          }
          throw error;
        });

      if (!notification) continue;
      const notificationWithContext = await prisma.notification.findUnique({
        where: { id: notification.id },
        include: {
          company: { select: { name: true } },
          workspace: { select: { name: true } },
        },
      });
      if (!notificationWithContext) continue;
      created.push(notificationWithContext);

      await createAuditLog({
        entityType: AuditEntityType.NOTIFICATION,
        entityId: notificationWithContext.id,
        entityLabel: notificationWithContext.title,
        action: AuditAction.NOTIFICATION_CREATED,
        description: `Notificacao ${notificationWithContext.title} gerada`,
        newValue: {
          type: notificationWithContext.type,
          severity: notificationWithContext.severity,
          status: notificationWithContext.status,
          entityType: notificationWithContext.entityType,
          entityId: notificationWithContext.entityId,
          channels: notificationWithContext.channels,
          recipientUserId: notificationWithContext.userId,
        },
        companyId: notificationWithContext.companyId,
        workspaceId: notificationWithContext.workspaceId,
      });

      if (shouldSendEmail) {
        await sendNotificationEmail(notificationWithContext, recipient.email);
      }
    }

    return created;
  } catch (error) {
    if (isMissingNotificationTables(error)) return [];
    throw error;
  }
}

export async function sendNotificationEmail(
  notification: {
    id: string;
    title: string;
    message: string;
    entityType: string | null;
    entityId: string | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    company: { name: string } | null;
    workspace: { name: string } | null;
  },
  recipientEmail?: string | null,
) {
  const email = recipientEmail?.trim();
  if (!email) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const actionUrl = `${baseUrl}${notificationEntityPath(
    notification.entityType,
    notification.entityId,
  )}`;
  const metadata =
    notification.metadata &&
    typeof notification.metadata === "object" &&
    !Array.isArray(notification.metadata)
      ? (notification.metadata as Record<string, unknown>)
      : {};
  const subject = `[AndCheck] ${notification.title}`;
  const { html, text } = renderNotificationEmail({
    title: notification.title,
    message: notification.message,
    companyName: notification.company?.name,
    workspaceName: notification.workspace?.name,
    entityLabel: stringValue(metadata.entityLabel),
    status: stringValue(metadata.status),
    actionUrl,
    createdAt: notification.createdAt,
  });

  const log = await prisma.emailDeliveryLog.create({
    data: {
      notificationId: notification.id,
      recipientEmail: email,
      subject,
      status: "PENDING",
      provider: process.env.EMAIL_PROVIDER || "mock",
    },
  });

  try {
    const result = await sendEmail({ to: email, subject, html, text });
    await prisma.$transaction([
      prisma.emailDeliveryLog.update({
        where: { id: log.id },
        data: {
          status: "SENT",
          provider: result.provider,
          providerMessageId: result.providerMessageId ?? null,
          sentAt: new Date(),
        },
      }),
      prisma.notification.update({
        where: { id: notification.id },
        data: { sentAt: new Date(), error: null },
      }),
    ]);
  } catch (error) {
    const message = stringifySanitizedError(error);
    await prisma.$transaction([
      prisma.emailDeliveryLog.update({
        where: { id: log.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          error: message,
        },
      }),
      prisma.notification.update({
        where: { id: notification.id },
        data: {
          failedAt: new Date(),
          error: message,
        },
      }),
    ]);
  }
}

function stringifySanitizedError(error: unknown) {
  const sanitized = sanitizeForLog(error);
  return typeof sanitized === "string"
    ? sanitized
    : JSON.stringify(sanitized).slice(0, 2000);
}

async function resolveRecipients(input: CreateNotificationInput) {
  const users = await prisma.user.findMany({
    where: {
      is_active: true,
      ...(input.userId
        ? { id: input.userId }
        : {
            companyId: input.companyId,
            ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
          }),
    },
    include: {
      roles: {
        include: { role: { select: { code: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return users.map<NotificationRecipient>((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    roleCodes:
      user.roles.length > 0
        ? user.roles.map((userRole) => userRole.role.code)
        : legacyRoleCodes(user.role),
  }));
}

function legacyRoleCodes(role?: string | null) {
  if (role === "admin") return ["SUPER_ADMIN"];
  if (role === "inspector") return ["HSE_EMPRESA"];
  return ["AUDITOR"];
}

function defaultEmailPreference(
  severity: NotificationSeverity,
  roleCodes: string[],
) {
  if (severity !== "CRITICAL") return false;
  return roleCodes.some((roleCode) =>
    CRITICAL_DEFAULT_EMAIL_ROLES.has(roleCode),
  );
}

async function isEmailEnabledForCompany(companyId: string) {
  void companyId;
  return process.env.EMAIL_NOTIFICATIONS_ENABLED !== "false";
}

function buildDedupeKey(
  input: CreateNotificationInput & { userId: string | null },
) {
  const referenceDate =
    input.referenceDate instanceof Date
      ? input.referenceDate.toISOString().slice(0, 10)
      : input.referenceDate
        ? String(input.referenceDate).slice(0, 10)
        : new Date().toISOString().slice(0, 10);

  return [
    input.companyId,
    input.workspaceId ?? "workspace:null",
    input.userId ?? "user:null",
    input.type,
    input.entityType ?? "entity:null",
    input.entityId ?? "id:null",
    referenceDate,
  ].join(":");
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function isMissingNotificationTables(error: unknown) {
  const knownError = error as { code?: string; message?: string };
  return (
    knownError.code === "P2021" ||
    knownError.message?.includes("notifications") ||
    knownError.message?.includes("notification_preferences") ||
    knownError.message?.includes("email_delivery_logs")
  );
}
