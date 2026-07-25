import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  notificationPreferenceFindUnique: vi.fn(),
  userFindMany: vi.fn(),
  notificationCreate: vi.fn(),
  notificationFindUnique: vi.fn(),
  notificationUpdate: vi.fn(),
  emailDeliveryLogCreate: vi.fn(),
  emailDeliveryLogUpdate: vi.fn(),
  transaction: vi.fn(),
  createAuditLog: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notificationPreference: {
      findUnique: prismaMocks.notificationPreferenceFindUnique,
    },
    user: {
      findMany: prismaMocks.userFindMany,
    },
    notification: {
      create: prismaMocks.notificationCreate,
      findUnique: prismaMocks.notificationFindUnique,
      update: prismaMocks.notificationUpdate,
    },
    emailDeliveryLog: {
      create: prismaMocks.emailDeliveryLogCreate,
      update: prismaMocks.emailDeliveryLogUpdate,
    },
    $transaction: prismaMocks.transaction,
  },
}));

vi.mock("@/lib/audit", () => {
  return {
    AuditAction: {
      NOTIFICATION_CREATED: "NOTIFICATION_CREATED",
    },
    AuditEntityType: {
      NOTIFICATION: "NOTIFICATION",
    },
    createAuditLog: prismaMocks.createAuditLog,
  };
});

const originalEnv = {
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
  EMAIL_NOTIFICATIONS_ENABLED: process.env.EMAIL_NOTIFICATIONS_ENABLED,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
};

describe("notification service email flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EMAIL_PROVIDER = "mock";
    process.env.EMAIL_NOTIFICATIONS_ENABLED = "true";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.andcheck.com";
    prismaMocks.transaction.mockImplementation(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );
    prismaMocks.emailDeliveryLogCreate.mockResolvedValue({ id: "log-1" });
    prismaMocks.emailDeliveryLogUpdate.mockResolvedValue({});
    prismaMocks.notificationUpdate.mockResolvedValue({});
    prismaMocks.createAuditLog.mockResolvedValue(undefined);
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("respects disabled email preference and keeps only internal delivery", async () => {
    const { createNotification } = await import("@/lib/notifications/service");
    prismaMocks.userFindMany.mockResolvedValue([
      activeUser("user-1", "admin@andcheck.com", ["ADMIN_EMPRESA"]),
    ]);
    prismaMocks.notificationPreferenceFindUnique.mockResolvedValue({
      internal: true,
      email: false,
    });
    prismaMocks.notificationCreate.mockResolvedValue({ id: "notification-1" });
    prismaMocks.notificationFindUnique.mockResolvedValue(notificationRecord());

    await createNotification({
      companyId: "company-1",
      workspaceId: "workspace-1",
      type: "SCAFFOLD_REJECTED",
      severity: "WARNING",
      title: "Andaime AND-001 reprovado",
      message: "O andaime AND-001 foi reprovado.",
      entityType: "SCAFFOLD",
      entityId: "scaffold-1",
      channels: ["INTERNAL", "EMAIL"],
    });

    expect(prismaMocks.notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ channels: ["INTERNAL"] }),
      }),
    );
    expect(prismaMocks.emailDeliveryLogCreate).not.toHaveBeenCalled();
  });

  it("keeps email channel when the user preference enables it", async () => {
    const { createNotification } = await import("@/lib/notifications/service");
    prismaMocks.userFindMany.mockResolvedValue([
      activeUser("user-1", "admin@andcheck.com", ["ADMIN_EMPRESA"]),
    ]);
    prismaMocks.notificationPreferenceFindUnique.mockResolvedValue({
      internal: true,
      email: true,
    });
    prismaMocks.notificationCreate.mockResolvedValue({ id: "notification-1" });
    prismaMocks.notificationFindUnique.mockResolvedValue(notificationRecord());

    await createNotification({
      companyId: "company-1",
      workspaceId: "workspace-1",
      type: "SCAFFOLD_CREATED",
      severity: "INFO",
      title: "Andaime AND-001 criado",
      message: "O andaime AND-001 foi criado.",
      entityType: "SCAFFOLD",
      entityId: "scaffold-1",
      channels: ["INTERNAL", "EMAIL"],
    });

    expect(prismaMocks.notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ channels: ["INTERNAL", "EMAIL"] }),
      }),
    );
    expect(prismaMocks.emailDeliveryLogCreate).toHaveBeenCalled();
  });

  it("does not resolve inactive users as recipients", async () => {
    const { createNotification } = await import("@/lib/notifications/service");
    prismaMocks.userFindMany.mockResolvedValue([]);

    await createNotification({
      companyId: "company-1",
      workspaceId: "workspace-1",
      type: "SCAFFOLD_INTERDICTED",
      severity: "CRITICAL",
      title: "Andaime AND-001 interditado",
      message: "O andaime AND-001 foi interditado.",
      entityType: "SCAFFOLD",
      entityId: "scaffold-1",
      channels: ["INTERNAL", "EMAIL"],
    });

    expect(prismaMocks.userFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ is_active: true }),
      }),
    );
    expect(prismaMocks.notificationCreate).not.toHaveBeenCalled();
  });

  it("keeps explicit recipients scoped to the notification workspace and linked companies", async () => {
    const { createNotification } = await import("@/lib/notifications/service");
    prismaMocks.userFindMany.mockResolvedValue([]);

    await createNotification({
      companyId: "company-1",
      workspaceId: "workspace-1",
      userId: "user-2",
      type: "NONCONFORMITY_OPENED",
      severity: "WARNING",
      title: "NC aberta",
      message: "A NC foi aberta.",
      entityType: "NONCONFORMITY",
      entityId: "nc-1",
      channels: ["INTERNAL", "EMAIL"],
    });

    expect(prismaMocks.userFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "user-2",
          is_active: true,
          workspaceId: "workspace-1",
          OR: [
            { companyId: "company-1" },
            {
              tenantCompany: {
                workspaceLinks: {
                  some: {
                    workspaceId: "workspace-1",
                    active: true,
                    role: { in: ["OWNER", "HSE_MANAGER"] },
                  },
                },
              },
            },
          ],
        }),
      }),
    );
  });

  it("uses the recipient company when reading notification preferences", async () => {
    const { createNotification } = await import("@/lib/notifications/service");
    prismaMocks.userFindMany.mockResolvedValue([
      activeUser("user-1", "manager@andcheck.com", ["HSE_GERENCIADORA"], {
        companyId: "company-manager",
      }),
    ]);
    prismaMocks.notificationPreferenceFindUnique.mockResolvedValue({
      internal: true,
      email: true,
    });
    prismaMocks.notificationCreate.mockResolvedValue({ id: "notification-1" });
    prismaMocks.notificationFindUnique.mockResolvedValue(notificationRecord());

    await createNotification({
      companyId: "company-scaffold",
      workspaceId: "workspace-1",
      type: "SCAFFOLD_RELEASED",
      severity: "SUCCESS",
      title: "Andaime liberado",
      message: "O andaime foi liberado.",
      entityType: "SCAFFOLD",
      entityId: "scaffold-1",
      channels: ["INTERNAL", "EMAIL"],
    });

    expect(prismaMocks.notificationPreferenceFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_companyId_type: {
            userId: "user-1",
            companyId: "company-manager",
            type: "SCAFFOLD_RELEASED",
          },
        },
      }),
    );
    expect(prismaMocks.emailDeliveryLogCreate).toHaveBeenCalled();
  });

  it("continues delivering to other recipients after an unexpected email failure", async () => {
    const { createNotification } = await import("@/lib/notifications/service");
    prismaMocks.userFindMany.mockResolvedValue([
      activeUser("user-1", "admin-1@andcheck.com", ["ADMIN_EMPRESA"]),
      activeUser("user-2", "admin-2@andcheck.com", ["ADMIN_EMPRESA"]),
    ]);
    prismaMocks.notificationPreferenceFindUnique.mockResolvedValue({
      internal: true,
      email: true,
    });
    prismaMocks.notificationCreate
      .mockResolvedValueOnce({ id: "notification-1" })
      .mockResolvedValueOnce({ id: "notification-2" });
    prismaMocks.notificationFindUnique
      .mockResolvedValueOnce(notificationRecord({ id: "notification-1" }))
      .mockResolvedValueOnce(notificationRecord({ id: "notification-2" }));
    prismaMocks.emailDeliveryLogCreate
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValueOnce({ id: "log-2" });

    const created = await createNotification({
      companyId: "company-1",
      workspaceId: "workspace-1",
      type: "SCAFFOLD_CREATED",
      severity: "INFO",
      title: "Andaime AND-001 criado",
      message: "O andaime AND-001 foi criado.",
      entityType: "SCAFFOLD",
      entityId: "scaffold-1",
      channels: ["INTERNAL", "EMAIL"],
    });

    expect(created).toHaveLength(2);
    expect(prismaMocks.emailDeliveryLogCreate).toHaveBeenCalledTimes(2);
    expect(prismaMocks.notificationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "notification-1" },
        data: expect.objectContaining({
          status: "FAILED",
          failedAt: expect.any(Date),
          error: "Falha inesperada ao enviar e-mail.",
        }),
      }),
    );
    expect(prismaMocks.emailDeliveryLogUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "log-2" },
        data: expect.objectContaining({ status: "SENT" }),
      }),
    );
  });

  it("updates email log and notification on successful delivery", async () => {
    const { sendNotificationEmail } = await import("@/lib/notifications/service");

    await sendNotificationEmail(notificationRecord(), {
      name: "Admin",
      email: "admin@andcheck.com",
    });

    expect(prismaMocks.emailDeliveryLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          notificationId: "notification-1",
          recipientEmail: "admin@andcheck.com",
          status: "PENDING",
        }),
      }),
    );
    expect(prismaMocks.emailDeliveryLogUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "SENT",
          provider: "mock",
          providerMessageId: expect.stringMatching(/^mock_/),
          sentAt: expect.any(Date),
        }),
      }),
    );
    expect(prismaMocks.notificationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "SENT",
          sentAt: expect.any(Date),
          error: null,
        }),
      }),
    );
  });

  it("updates email log and notification on provider failure", async () => {
    process.env.EMAIL_PROVIDER = "resend";
    delete process.env.RESEND_API_KEY;
    const { sendNotificationEmail } = await import("@/lib/notifications/service");

    await sendNotificationEmail(notificationRecord(), "admin@andcheck.com");

    expect(prismaMocks.emailDeliveryLogUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          failedAt: expect.any(Date),
          error: "RESEND_API_KEY nao configurada.",
        }),
      }),
    );
    expect(prismaMocks.notificationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          failedAt: expect.any(Date),
          error: "RESEND_API_KEY nao configurada.",
        }),
      }),
    );
  });

  it("does not create a sent log for invalid recipient email", async () => {
    const { sendNotificationEmail } = await import("@/lib/notifications/service");

    await sendNotificationEmail(notificationRecord(), "sem-email");

    expect(prismaMocks.emailDeliveryLogCreate).not.toHaveBeenCalled();
    expect(prismaMocks.notificationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          failedAt: expect.any(Date),
          error: "Destinatario de e-mail invalido.",
        }),
      }),
    );
  });
});

function activeUser(
  id: string,
  email: string,
  roles: string[],
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    name: "Admin",
    email,
    role: "viewer",
    companyId: "company-1",
    workspaceId: "workspace-1",
    roles: roles.map((code) => ({ role: { code } })),
    ...overrides,
  };
}

function notificationRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "notification-1",
    companyId: "company-1",
    workspaceId: "workspace-1",
    userId: "user-1",
    type: "SCAFFOLD_REJECTED" as const,
    severity: "WARNING" as const,
    title: "Andaime AND-001 reprovado",
    message: "O andaime AND-001 foi reprovado.",
    entityType: "SCAFFOLD",
    entityId: "scaffold-1",
    channels: ["INTERNAL", "EMAIL"],
    status: "PENDING",
    readAt: null,
    sentAt: null,
    failedAt: null,
    error: null,
    metadata: {
      entityLabel: "AND-001",
      area: "Murucupi",
      status: "reprovado",
    },
    dedupeKey: "dedupe",
    createdAt: new Date("2026-07-25T12:00:00.000Z"),
    updatedAt: new Date("2026-07-25T12:00:00.000Z"),
    company: { name: "Montisol" },
    workspace: { name: "Hydro Alunorte" },
    ...overrides,
  };
}
