import "server-only";

import {
  CRITICAL_DEFAULT_EMAIL_ROLES,
  NOTIFICATION_DEFAULT_SEVERITY,
  normalizeChannels,
} from "@/lib/notifications/catalog";
import { AuditAction, AuditEntityType, createAuditLog } from "@/lib/audit";
import { normalizeEmail, sendEmail } from "@/lib/notifications/email";
import { buildNotificationEmail } from "@/lib/notifications/email-template";
import { prisma } from "@/lib/prisma";
import {
  CompanyWorkspaceRole,
  Prisma,
  type NotificationChannel,
  type NotificationSeverity,
  type NotificationType,
} from "@prisma/client";

const WORKSPACE_NOTIFICATION_RECIPIENT_ROLES = [
  CompanyWorkspaceRole.OWNER,
  CompanyWorkspaceRole.HSE_MANAGER,
];

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
  companyId: string;
  workspaceId: string;
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
            companyId: recipient.companyId,
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
        try {
          const delivery = await sendNotificationEmail(
            notificationWithContext,
            recipient,
          );
          if (delivery) {
            notificationWithContext.status = delivery.status;
          }
        } catch {
          await prisma.notification
            .update({
              where: { id: notificationWithContext.id },
              data: {
                status: "FAILED",
                failedAt: new Date(),
                error: "Falha inesperada ao enviar e-mail.",
              },
            })
            .catch(() => undefined);
          notificationWithContext.status = "FAILED";
        }
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
    type: NotificationType;
    severity: NotificationSeverity;
    title: string;
    message: string;
    entityType: string | null;
    entityId: string | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    company: { name: string } | null;
    workspace: { name: string } | null;
  },
  recipient?: string | Pick<NotificationRecipient, "name" | "email"> | null,
) {
  const recipientEmail =
    typeof recipient === "string" ? recipient : recipient?.email;
  const email = normalizeEmail(recipientEmail);
  if (!email) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        error: "Destinatario de e-mail invalido.",
      },
    });
    return { status: "FAILED" as const };
  }

  const metadata =
    notification.metadata &&
    typeof notification.metadata === "object" &&
    !Array.isArray(notification.metadata)
      ? (notification.metadata as Record<string, unknown>)
      : {};
  const emailContent = buildNotificationEmail({
    title: notification.title,
    message: notification.message,
    severity: notification.severity,
    notificationType: notification.type,
    recipientName: typeof recipient === "string" ? null : recipient?.name,
    companyName: notification.company?.name,
    workspaceName: notification.workspace?.name,
    entityType: notification.entityType,
    entityId: notification.entityId,
    metadata,
    occurredAt: notification.createdAt,
  });

  const log = await prisma.emailDeliveryLog.create({
    data: {
      notificationId: notification.id,
      recipientEmail: email,
      subject: emailContent.subject,
      status: "PENDING",
      provider: process.env.EMAIL_PROVIDER || "mock",
    },
  });

  const result = await sendEmail({
    to: email,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  });

  if (result.success) {
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
        data: { status: "SENT", sentAt: new Date(), error: null },
      }),
    ]);
    return { status: "SENT" as const };
  } else {
    const message = result.error ?? "Falha ao enviar e-mail.";
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
          status: "FAILED",
          failedAt: new Date(),
          error: message,
        },
      }),
    ]);
    return { status: "FAILED" as const };
  }
}

async function resolveRecipients(input: CreateNotificationInput) {
  const companyWhere = input.workspaceId
    ? {
        OR: [
          { companyId: input.companyId },
          {
            tenantCompany: {
              workspaceLinks: {
                some: {
                  workspaceId: input.workspaceId,
                  active: true,
                  role: { in: WORKSPACE_NOTIFICATION_RECIPIENT_ROLES },
                },
              },
            },
          },
        ],
      }
    : { companyId: input.companyId };
  const users = await prisma.user.findMany({
    where: {
      is_active: true,
      ...(input.userId
        ? {
            id: input.userId,
            ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
            ...companyWhere,
          }
        : {
            ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
            ...companyWhere,
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
    companyId: user.companyId,
    workspaceId: user.workspaceId,
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
  return roleCodes.some((roleCode: string) =>
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
        ? String(input.referenceDate)
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

function isMissingNotificationTables(error: unknown) {
  const knownError = error as { code?: string; message?: string };
  return (
    knownError.code === "P2021" ||
    knownError.message?.includes("notifications") ||
    knownError.message?.includes("notification_preferences") ||
    knownError.message?.includes("email_delivery_logs")
  );
}
