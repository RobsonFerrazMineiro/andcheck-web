import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createNotification: vi.fn(),
  scaffoldFindMany: vi.fn(),
  nonConformityFindMany: vi.fn(),
  documentFindMany: vi.fn(),
  scaffoldDocumentFindMany: vi.fn(),
}));

vi.mock("@/lib/notifications/service", () => ({
  createNotification: mocks.createNotification,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    scaffold: { findMany: mocks.scaffoldFindMany },
    nonConformity: { findMany: mocks.nonConformityFindMany },
    document: { findMany: mocks.documentFindMany },
    scaffoldDocument: { findMany: mocks.scaffoldDocumentFindMany },
  },
}));

describe("runDailyNotificationChecks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.scaffoldFindMany.mockResolvedValue([]);
    mocks.nonConformityFindMany.mockResolvedValue([]);
    mocks.documentFindMany.mockResolvedValue([]);
    mocks.scaffoldDocumentFindMany.mockResolvedValue([]);
    mocks.createNotification.mockResolvedValue([]);
  });

  it("uses milestone-specific dedupe references for scaffold expiration warnings", async () => {
    const { runDailyNotificationChecks } = await import(
      "@/lib/notifications/scheduled"
    );
    mocks.scaffoldFindMany.mockResolvedValue([
      {
        id: "scaffold-1",
        code: "AND-001",
        status: "liberado",
        area: "Murucupi",
        companyId: "company-a",
        workspaceId: "workspace-a",
        validity_date: new Date("2026-08-01T12:00:00.000Z"),
      },
    ]);

    await runDailyNotificationChecks(new Date("2026-07-25T12:00:00.000Z"));
    await runDailyNotificationChecks(new Date("2026-07-29T12:00:00.000Z"));

    expect(mocks.createNotification).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: "SCAFFOLD_EXPIRING_SOON",
        referenceDate: "2026-08-01:D-7",
      }),
    );
    expect(mocks.createNotification).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: "SCAFFOLD_EXPIRING_SOON",
        referenceDate: "2026-08-01:D-3",
      }),
    );
  });

  it("counts processed, created, sent, failed and ignored notifications", async () => {
    const { runDailyNotificationChecks } = await import(
      "@/lib/notifications/scheduled"
    );
    mocks.scaffoldFindMany.mockResolvedValue([
      {
        id: "scaffold-1",
        code: "AND-001",
        status: "liberado",
        area: "Murucupi",
        companyId: "company-a",
        workspaceId: "workspace-a",
        validity_date: new Date("2026-08-01T12:00:00.000Z"),
      },
      {
        id: "scaffold-2",
        code: "AND-002",
        status: "liberado",
        area: "Murucupi",
        companyId: "company-a",
        workspaceId: "workspace-a",
        validity_date: new Date("2026-08-01T12:00:00.000Z"),
      },
    ]);
    mocks.createNotification
      .mockResolvedValueOnce([
        { id: "n1", status: "SENT" },
        { id: "n2", status: "FAILED" },
      ])
      .mockResolvedValueOnce([]);

    const result = await runDailyNotificationChecks(
      new Date("2026-07-25T12:00:00.000Z"),
    );

    expect(result).toMatchObject({
      processed: 2,
      created: 2,
      sent: 1,
      failed: 1,
      ignored: 1,
      scaffoldExpiring: 2,
    });
  });

  it("continues processing daily items after one notification fails", async () => {
    const { runDailyNotificationChecks } = await import(
      "@/lib/notifications/scheduled"
    );
    mocks.scaffoldFindMany.mockResolvedValue([
      {
        id: "scaffold-1",
        code: "AND-001",
        status: "liberado",
        area: "Murucupi",
        companyId: "company-a",
        workspaceId: "workspace-a",
        validity_date: new Date("2026-08-01T12:00:00.000Z"),
      },
      {
        id: "scaffold-2",
        code: "AND-002",
        status: "liberado",
        area: "Murucupi",
        companyId: "company-a",
        workspaceId: "workspace-a",
        validity_date: new Date("2026-08-01T12:00:00.000Z"),
      },
    ]);
    mocks.createNotification
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce([{ id: "n2", status: "SENT" }]);

    const result = await runDailyNotificationChecks(
      new Date("2026-07-25T12:00:00.000Z"),
    );

    expect(mocks.createNotification).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      processed: 2,
      created: 1,
      sent: 1,
      failed: 1,
      scaffoldExpiring: 2,
    });
  });
});
