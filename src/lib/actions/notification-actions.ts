"use server";

import { getCurrentUserAccess, requireAnyPermission } from "@/lib/authz";
import {
  NOTIFICATION_ENTITY_GROUPS,
  NOTIFICATION_GROUP_LABELS,
  NOTIFICATION_SEVERITY_LABELS,
  NOTIFICATION_DEFAULT_SEVERITY,
  NOTIFICATION_TYPE_LABELS,
} from "@/lib/notifications/catalog";
import { sendNotificationEmail } from "@/lib/notifications/service";
import { dataScopeWhere, getDataScope } from "@/lib/data-scope";
import { prisma } from "@/lib/prisma";
import {
  type NotificationType,
  type Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

const ADMIN_NOTIFICATION_ROLES = new Set([
  "SUPER_ADMIN",
  "HSE_HYDRO",
  "HSE_GERENCIADORA",
  "ADMIN_EMPRESA",
  "HSE_EMPRESA",
]);

export type NotificationFilter =
  | "all"
  | "unread"
  | "critical"
  | "scaffolds"
  | "inspections"
  | "nonconformities"
  | "documents";

export async function getNotificationBellData() {
  const access = await getCurrentUserAccess();
  if (!access) return { unreadCount: 0, latest: [] };

  try {
    const where = userNotificationWhere(access.userId);
    const [unreadCount, latest] = await Promise.all([
      prisma.notification.count({
        where: { ...where, status: { notIn: ["READ", "ARCHIVED"] } },
      }),
      prisma.notification.findMany({
        where: { ...where, status: { not: "ARCHIVED" } },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          title: true,
          message: true,
          severity: true,
          status: true,
          entityType: true,
          entityId: true,
          createdAt: true,
        },
      }),
    ]);

    return { unreadCount, latest };
  } catch (error) {
    if (isMissingNotificationTables(error)) {
      return { unreadCount: 0, latest: [] };
    }
    throw error;
  }
}

export async function getNotifications(filter: NotificationFilter = "all") {
  const access = await getCurrentUserAccess();
  if (!access) return [];

  try {
    return await prisma.notification.findMany({
      where: {
        ...userNotificationWhere(access.userId),
        ...filterWhere(filter),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        company: { select: { name: true } },
        workspace: { select: { name: true } },
        emailDeliveryLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true, error: true, sentAt: true, failedAt: true },
        },
      },
    });
  } catch (error) {
    if (isMissingNotificationTables(error)) return [];
    throw error;
  }
}

export async function markNotificationAsRead(id: string) {
  const access = await getCurrentUserAccess();
  if (!access) throw new Error("Usuario nao autenticado.");

  try {
    await prisma.notification.updateMany({
      where: { id, ...userNotificationWhere(access.userId) },
      data: { status: "READ", readAt: new Date() },
    });
  } catch (error) {
    if (!isMissingNotificationTables(error)) throw error;
  }

  revalidatePath("/notificacoes");
}

export async function markAllNotificationsAsRead() {
  const access = await getCurrentUserAccess();
  if (!access) throw new Error("Usuario nao autenticado.");

  try {
    await prisma.notification.updateMany({
      where: {
        ...userNotificationWhere(access.userId),
        status: { notIn: ["READ", "ARCHIVED"] },
      },
      data: { status: "READ", readAt: new Date() },
    });
  } catch (error) {
    if (!isMissingNotificationTables(error)) throw error;
  }

  revalidatePath("/notificacoes");
}

export async function archiveNotification(id: string) {
  const access = await getCurrentUserAccess();
  if (!access) throw new Error("Usuario nao autenticado.");

  try {
    await prisma.notification.updateMany({
      where: { id, ...userNotificationWhere(access.userId) },
      data: { status: "ARCHIVED" },
    });
  } catch (error) {
    if (!isMissingNotificationTables(error)) throw error;
  }

  revalidatePath("/notificacoes");
}

export async function getNotificationPreferences() {
  const access = await getCurrentUserAccess();
  if (!access) throw new Error("Usuario nao autenticado.");

  const preferences = await prisma.notificationPreference
    .findMany({
      where: { userId: access.userId, companyId: access.companyId },
    })
    .catch((error: unknown) => {
      if (isMissingNotificationTables(error)) return [];
      throw error;
    });
  const preferenceByType = new Map(
    preferences.map((preference) => [preference.type, preference]),
  );

  return notificationTypes().map((type) => {
    const preference = preferenceByType.get(type);
    const critical = defaultCriticalTypes.has(type);
    const group = NOTIFICATION_ENTITY_GROUPS[type];
    const severity = NOTIFICATION_DEFAULT_SEVERITY[type];
    return {
      type,
      label: NOTIFICATION_TYPE_LABELS[type],
      group,
      groupLabel: NOTIFICATION_GROUP_LABELS[group],
      severity,
      severityLabel: NOTIFICATION_SEVERITY_LABELS[severity],
      internal: preference?.internal ?? true,
      email: preference?.email ?? critical,
      critical,
    };
  });
}

export async function updateNotificationPreference(formData: FormData) {
  const access = await getCurrentUserAccess();
  if (!access) throw new Error("Usuario nao autenticado.");

  const type = String(formData.get("type") ?? "") as NotificationType;
  if (!notificationTypes().includes(type)) {
    throw new Error("Tipo de notificacao invalido.");
  }

  const internal = formData.get("internal") === "on";
  const email = formData.get("email") === "on";

  try {
    await prisma.notificationPreference.upsert({
      where: {
        userId_companyId_type: {
          userId: access.userId,
          companyId: access.companyId,
          type,
        },
      },
      create: {
        userId: access.userId,
        companyId: access.companyId,
        type,
        internal: defaultCriticalTypes.has(type) ? true : internal,
        email,
      },
      update: {
        internal: defaultCriticalTypes.has(type) ? true : internal,
        email,
      },
    });
  } catch (error) {
    if (!isMissingNotificationTables(error)) throw error;
  }

  revalidatePath("/notificacoes");
}

export async function updateNotificationPreferenceValue(input: {
  type: NotificationType;
  channel: "internal" | "email";
  enabled: boolean;
}) {
  const access = await getCurrentUserAccess();
  if (!access) throw new Error("Usuario nao autenticado.");
  if (!notificationTypes().includes(input.type)) {
    throw new Error("Tipo de notificacao invalido.");
  }

  const critical = defaultCriticalTypes.has(input.type);
  if (critical && input.channel === "internal" && !input.enabled) {
    throw new Error("Notificacoes criticas exigem canal interno.");
  }

  const current = await prisma.notificationPreference
    .findUnique({
      where: {
        userId_companyId_type: {
          userId: access.userId,
          companyId: access.companyId,
          type: input.type,
        },
      },
    })
    .catch((error: unknown) => {
      if (isMissingNotificationTables(error)) return null;
      throw error;
    });

  const internal =
    input.channel === "internal"
      ? input.enabled
      : (current?.internal ?? true);
  const email =
    input.channel === "email"
      ? input.enabled
      : (current?.email ?? critical);

  try {
    await prisma.notificationPreference.upsert({
      where: {
        userId_companyId_type: {
          userId: access.userId,
          companyId: access.companyId,
          type: input.type,
        },
      },
      create: {
        userId: access.userId,
        companyId: access.companyId,
        type: input.type,
        internal: critical ? true : internal,
        email,
      },
      update: {
        internal: critical ? true : internal,
        email,
      },
    });
  } catch (error) {
    if (!isMissingNotificationTables(error)) throw error;
  }

  revalidatePath("/perfil/notificacoes");
  revalidatePath("/notificacoes");
}

export async function updateNotificationPreferenceGroup(input: {
  group: string;
  channel: "internal" | "email";
  enabled: boolean;
}) {
  const access = await getCurrentUserAccess();
  if (!access) throw new Error("Usuario nao autenticado.");

  const types = notificationTypes().filter(
    (type) => NOTIFICATION_ENTITY_GROUPS[type] === input.group,
  );
  if (types.length === 0) throw new Error("Grupo de notificacao invalido.");

  try {
    await prisma.$transaction(
      types.map((type) => {
        const critical = defaultCriticalTypes.has(type);
        return prisma.notificationPreference.upsert({
          where: {
            userId_companyId_type: {
              userId: access.userId,
              companyId: access.companyId,
              type,
            },
          },
          create: {
            userId: access.userId,
            companyId: access.companyId,
            type,
            internal:
              input.channel === "internal"
                ? critical || input.enabled
                : true,
            email:
              input.channel === "email"
                ? input.enabled
                : critical,
          },
          update: {
            ...(input.channel === "internal"
              ? { internal: critical ? true : input.enabled }
              : { email: input.enabled }),
          },
        });
      }),
    );
  } catch (error) {
    if (!isMissingNotificationTables(error)) throw error;
  }

  revalidatePath("/perfil/notificacoes");
}

export async function getEmailChannelStatus() {
  if (process.env.EMAIL_NOTIFICATIONS_ENABLED === "false") {
    return {
      status: "DISABLED_BY_COMPANY" as const,
      label: "Desativado pela empresa",
      available: false,
      detail: "A empresa desativou o envio de e-mails.",
    };
  }

  const provider = process.env.EMAIL_PROVIDER || "mock";
  if (provider === "mock") {
    return {
      status: "PENDING" as const,
      label: "Pendente de configuracao",
      available: true,
      detail: "Preferencias podem ser salvas; envio real depende do provedor.",
    };
  }

  if (provider === "resend" && !process.env.RESEND_API_KEY) {
    return {
      status: "CONFIG_ERROR" as const,
      label: "Erro de configuracao",
      available: false,
      detail: "RESEND_API_KEY nao configurada.",
    };
  }

  if (provider === "sendgrid" && !process.env.SENDGRID_API_KEY) {
    return {
      status: "CONFIG_ERROR" as const,
      label: "Erro de configuracao",
      available: false,
      detail: "SENDGRID_API_KEY nao configurada.",
    };
  }

  if (
    provider === "smtp" &&
    (!process.env.SMTP_HOST || !process.env.SMTP_PORT)
  ) {
    return {
      status: "CONFIG_ERROR" as const,
      label: "Erro de configuracao",
      available: false,
      detail: "SMTP_HOST e SMTP_PORT sao obrigatorios.",
    };
  }

  return {
    status: "CONFIGURED" as const,
    label: "Configurado",
    available: true,
    detail: `Provedor ativo: ${provider}.`,
  };
}

export async function getEmailTechnicalConfiguration() {
  await requireAnyPermission(["read.all", "audit.view", "logs.view"]);
  const access = await getCurrentUserAccess();
  if (!isNotificationAdmin(access?.roleCodes ?? [])) {
    throw new Error("Acesso restrito a administradores.");
  }

  const provider = process.env.EMAIL_PROVIDER || "mock";
  const status = await getEmailChannelStatus();

  return {
    provider,
    from: process.env.EMAIL_FROM || "Nao configurado",
    status,
    plannedProviders: ["Resend", "SMTP corporativo", "SendGrid", "Amazon SES"],
    variables: [
      { name: "EMAIL_PROVIDER", configured: Boolean(process.env.EMAIL_PROVIDER) },
      { name: "EMAIL_FROM", configured: Boolean(process.env.EMAIL_FROM) },
      { name: "RESEND_API_KEY", configured: Boolean(process.env.RESEND_API_KEY) },
      { name: "SENDGRID_API_KEY", configured: Boolean(process.env.SENDGRID_API_KEY) },
      { name: "SMTP_HOST", configured: Boolean(process.env.SMTP_HOST) },
      { name: "SMTP_PORT", configured: Boolean(process.env.SMTP_PORT) },
      { name: "SMTP_USER", configured: Boolean(process.env.SMTP_USER) },
      { name: "SMTP_PASS", configured: Boolean(process.env.SMTP_PASS) },
    ],
  };
}

export async function getAdminNotificationData() {
  await requireAnyPermission(["read.all", "audit.view", "logs.view"]);
  const access = await getCurrentUserAccess();
  if (!isNotificationAdmin(access?.roleCodes ?? [])) {
    throw new Error("Acesso restrito a administradores.");
  }
  const scope = await getDataScope();
  const where = dataScopeWhere(scope);

  try {
    const [
      total,
      sent,
      pending,
      failed,
      emailSent,
      emailFailed,
      latestFailures,
    ] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { ...where, sentAt: { not: null } },
      }),
      prisma.notification.count({
        where: { ...where, status: "PENDING" },
      }),
      prisma.notification.count({
        where: { ...where, failedAt: { not: null } },
      }),
      prisma.emailDeliveryLog.count({
        where: { status: "SENT", notification: where },
      }),
      prisma.emailDeliveryLog.count({
        where: { status: "FAILED", notification: where },
      }),
      prisma.emailDeliveryLog.findMany({
        where: { status: "FAILED", notification: where },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          notification: {
            select: {
              id: true,
              title: true,
              type: true,
              company: { select: { name: true } },
              workspace: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    return {
      total,
      sent,
      pending,
      failed,
      emailSent,
      emailFailed,
      latestFailures,
    };
  } catch (error) {
    if (isMissingNotificationTables(error)) {
      return {
        total: 0,
        sent: 0,
        pending: 0,
        failed: 0,
        emailSent: 0,
        emailFailed: 0,
        latestFailures: [],
      };
    }
    throw error;
  }
}

export async function resendNotificationEmail(notificationId: string) {
  await requireAnyPermission(["read.all", "audit.view", "logs.view"]);
  const access = await getCurrentUserAccess();
  if (!isNotificationAdmin(access?.roleCodes ?? [])) {
    throw new Error("Acesso restrito a administradores.");
  }
  const scope = await getDataScope();

  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, ...dataScopeWhere(scope) },
    include: {
      user: { select: { email: true } },
      company: { select: { name: true } },
      workspace: { select: { name: true } },
    },
  });
  if (!notification) throw new Error("Notificacao nao encontrada.");
  if (!notification.user?.email) {
    throw new Error("Notificacao sem destinatario de e-mail.");
  }

  await sendNotificationEmail(notification, notification.user.email);
  revalidatePath("/admin/notificacoes");
}

function userNotificationWhere(userId: string): Prisma.NotificationWhereInput {
  return {
    userId,
    status: { not: "ARCHIVED" },
  };
}

function filterWhere(filter: NotificationFilter): Prisma.NotificationWhereInput {
  if (filter === "unread") {
    return { status: { notIn: ["READ", "ARCHIVED"] } };
  }
  if (filter === "critical") {
    return { severity: "CRITICAL" };
  }
  if (filter === "scaffolds") {
    return { entityType: "SCAFFOLD" };
  }
  if (filter === "inspections") {
    return { entityType: "INSPECTION" };
  }
  if (filter === "nonconformities") {
    return { entityType: "NONCONFORMITY" };
  }
  if (filter === "documents") {
    return { entityType: "DOCUMENT" };
  }
  return {};
}

function isNotificationAdmin(roleCodes: string[]) {
  return roleCodes.some((roleCode) => ADMIN_NOTIFICATION_ROLES.has(roleCode));
}

const defaultCriticalTypes = new Set<NotificationType>([
  "SCAFFOLD_INTERDICTED",
  "SCAFFOLD_EXPIRED",
  "INSPECTION_REJECTED",
  "NONCONFORMITY_EXPIRED",
  "DOCUMENT_EXPIRED",
]);

function notificationTypes() {
  return Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationType[];
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
