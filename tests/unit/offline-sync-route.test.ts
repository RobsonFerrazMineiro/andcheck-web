import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SyncQueueItem } from "@/lib/offline/types";
import { POST } from "@/app/api/sincronizacao/sync/route";

const mocks = vi.hoisted(() => ({
  addNonConformityComment: vi.fn(),
  addNonConformityItemEvidence: vi.fn(),
  addScaffoldDocument: vi.fn(),
  completeAssembly: vi.fn(),
  createAuditLog: vi.fn(),
  createInspection: vi.fn(),
  createScaffold: vi.fn(),
  dismantleScaffold: vi.fn(),
  getCurrentUserAccess: vi.fn(),
  nonConformityFindUnique: vi.fn(),
  scaffoldFindUnique: vi.fn(),
  storeUploadedFile: vi.fn(),
  updateScaffold: vi.fn(),
  updateNonConformityDueDate: vi.fn(),
  updateNonConformityResponsible: vi.fn(),
  updateNonConformityStatus: vi.fn(),
  validateUploadedFile: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserAccess: mocks.getCurrentUserAccess,
}));

vi.mock("@/lib/audit", () => ({
  AuditAction: {
    UPDATE: "UPDATE",
  },
  AuditEntityType: {
    SETTINGS: "SETTINGS",
  },
  createAuditLog: mocks.createAuditLog,
}));

vi.mock("@/lib/actions/document-actions", () => ({
  addScaffoldDocument: mocks.addScaffoldDocument,
}));

vi.mock("@/lib/actions/inspection-actions", () => ({
  createInspection: mocks.createInspection,
}));

vi.mock("@/lib/actions/non-conformity-actions", () => ({
  addNonConformityComment: mocks.addNonConformityComment,
  addNonConformityItemEvidence: mocks.addNonConformityItemEvidence,
  updateNonConformityDueDate: mocks.updateNonConformityDueDate,
  updateNonConformityResponsible: mocks.updateNonConformityResponsible,
  updateNonConformityStatus: mocks.updateNonConformityStatus,
}));

vi.mock("@/lib/actions/scaffold-actions", () => ({
  completeAssembly: mocks.completeAssembly,
  createScaffold: mocks.createScaffold,
  dismantleScaffold: mocks.dismantleScaffold,
  updateScaffold: mocks.updateScaffold,
}));

vi.mock("@/lib/file-storage", () => ({
  storeUploadedFile: mocks.storeUploadedFile,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    scaffold: {
      findUnique: mocks.scaffoldFindUnique,
    },
    nonConformity: {
      findUnique: mocks.nonConformityFindUnique,
    },
  },
}));

vi.mock("@/lib/upload-security", () => ({
  validateUploadedFile: mocks.validateUploadedFile,
}));

function queueItem(
  action: string,
  payload: unknown,
  overrides: Partial<SyncQueueItem> = {},
): SyncQueueItem {
  return {
    id: `queue-${action}`,
    action,
    entityType: "unknown",
    entityId: "entity-1",
    payload,
    status: "pending",
    attempts: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

async function postSync(item: SyncQueueItem) {
  return POST(
    new Request("http://localhost/api/sincronizacao/sync", {
      method: "POST",
      body: JSON.stringify(item),
    }),
  );
}

describe("sync route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUserAccess.mockResolvedValue({
      userId: "user-1",
      companyId: "company-1",
      workspaceId: "workspace-1",
      roleCode: "ADMIN",
    });
    mocks.createInspection.mockResolvedValue({ id: "inspection-1" });
    mocks.createScaffold.mockResolvedValue({ id: "scaffold-1" });
    mocks.completeAssembly.mockResolvedValue({ id: "scaffold-1" });
    mocks.dismantleScaffold.mockResolvedValue({ id: "scaffold-1" });
    mocks.updateScaffold.mockResolvedValue({ id: "scaffold-1" });
    mocks.addScaffoldDocument.mockResolvedValue({ id: "document-1" });
    mocks.validateUploadedFile.mockResolvedValue({ ok: true });
    mocks.storeUploadedFile.mockResolvedValue({
      reference: "/uploads/offline-file.pdf",
      size: 12,
      contentType: "application/pdf",
    });
    mocks.nonConformityFindUnique.mockResolvedValue(null);
    mocks.scaffoldFindUnique.mockResolvedValue(null);
  });

  it("syncs an offline inspection creation", async () => {
    const response = await postSync(
      queueItem("inspection.create", {
        scaffold_id: "scaffold-1",
        scaffold_code: "AND-001",
        inspector_name: "Inspetor",
        result: "aprovado",
        validity_days: 7,
        checklist: [],
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      status: "synced",
      serverId: "inspection-1",
    });
    expect(mocks.createInspection).toHaveBeenCalledWith(
      expect.objectContaining({
        scaffold_id: "scaffold-1",
        inspector_name: "Inspetor",
      }),
    );
    expect(mocks.createAuditLog).toHaveBeenCalled();
  });

  it("syncs an offline scaffold creation", async () => {
    const response = await postSync(
      queueItem("scaffold.create", {
        type: "tubular",
        location: "Area 5",
        area: "Montagem",
        height: 4,
        responsible: "Equipe A",
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      status: "synced",
      serverId: "scaffold-1",
    });
    expect(mocks.createScaffold).toHaveBeenCalledWith(
      expect.objectContaining({ location: "Area 5" }),
    );
  });

  it("syncs an offline scaffold update", async () => {
    const response = await postSync(
      queueItem("scaffold.update", {
        id: "scaffold-1",
        type: "tubular",
        location: "Area 6",
        area: "Montagem",
        height: 4,
        responsible: "Equipe B",
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      status: "synced",
      serverId: "scaffold-1",
    });
    expect(mocks.updateScaffold).toHaveBeenCalledWith(
      "scaffold-1",
      expect.objectContaining({ location: "Area 6" }),
    );
  });

  it("marks offline scaffold update as conflict when server changed first", async () => {
    mocks.scaffoldFindUnique.mockResolvedValue({
      code: "AND-001",
      updated_at: new Date("2026-01-01T01:00:00.000Z"),
    });

    const response = await postSync(
      queueItem("scaffold.update", {
        id: "scaffold-1",
        type: "tubular",
        location: "Area 6",
        area: "Montagem",
        height: 4,
        responsible: "Equipe B",
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      status: "conflict",
      error: "Andaime AND-001 foi alterado no servidor antes da sincronizacao.",
    });
    expect(mocks.updateScaffold).not.toHaveBeenCalled();
  });

  it("syncs an offline scaffold assembly completion", async () => {
    const response = await postSync(
      queueItem("scaffold.assembly.complete", {
        id: "scaffold-1",
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      status: "synced",
      serverId: "scaffold-1",
    });
    expect(mocks.completeAssembly).toHaveBeenCalledWith("scaffold-1");
  });

  it("syncs an offline scaffold dismantle", async () => {
    const response = await postSync(
      queueItem("scaffold.dismantle", {
        id: "scaffold-1",
        reason: "Finalizacao da atividade",
        reasonDescription: "Atividade encerrada em campo.",
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      status: "synced",
      serverId: "scaffold-1",
    });
    expect(mocks.dismantleScaffold).toHaveBeenCalledWith("scaffold-1", {
      reason: "Finalizacao da atividade",
      reasonDescription: "Atividade encerrada em campo.",
    });
  });

  it("syncs an offline nonconformity comment", async () => {
    const response = await postSync(
      queueItem("nonConformity.comment.add", {
        id: "nc-1",
        comment: "Acao realizada em campo.",
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      status: "synced",
      serverId: "nc-1",
    });
    const formData = mocks.addNonConformityComment.mock.calls[0]?.[0] as
      | FormData
      | undefined;
    expect(formData?.get("id")).toBe("nc-1");
    expect(formData?.get("comment")).toBe("Acao realizada em campo.");
  });

  it("syncs an offline nonconformity responsible update", async () => {
    const response = await postSync(
      queueItem("nonConformity.responsible.update", {
        id: "nc-1",
        responsibleUserId: "user-2",
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      status: "synced",
      serverId: "nc-1",
    });
    const formData = mocks.updateNonConformityResponsible.mock.calls[0]?.[0] as
      | FormData
      | undefined;
    expect(formData?.get("id")).toBe("nc-1");
    expect(formData?.get("responsibleUserId")).toBe("user-2");
  });

  it("syncs an offline nonconformity due date update", async () => {
    const response = await postSync(
      queueItem("nonConformity.dueDate.update", {
        id: "nc-1",
        dueDate: "2026-07-20",
        reason: "Replanejamento em campo.",
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      status: "synced",
      serverId: "nc-1",
    });
    const formData = mocks.updateNonConformityDueDate.mock.calls[0]?.[0] as
      | FormData
      | undefined;
    expect(formData?.get("id")).toBe("nc-1");
    expect(formData?.get("dueDate")).toBe("2026-07-20");
    expect(formData?.get("reason")).toBe("Replanejamento em campo.");
  });

  it("syncs an offline nonconformity evidence", async () => {
    const response = await postSync(
      queueItem("nonConformity.itemEvidence.add", {
        id: "evidence-1",
        nonConformityItemId: "item-1",
        fileUrl: "/uploads/local.jpg",
        fileName: "evidencia.jpg",
        evidenceType: "PHOTO",
        observation: "Foto coletada offline.",
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      status: "synced",
      serverId: "item-1",
    });
    const formData = mocks.addNonConformityItemEvidence.mock.calls[0]?.[0] as
      | FormData
      | undefined;
    expect(formData?.get("nonConformityItemId")).toBe("item-1");
    expect(formData?.get("fileName")).toBe("evidencia.jpg");
  });

  it("syncs an offline scaffold document", async () => {
    const response = await postSync(
      queueItem("scaffold.document.add", {
        scaffold_id: "scaffold-1",
        type: "ART",
        title: "ART do andaime",
        file_url: "/uploads/art.pdf",
        file_name: "art.pdf",
        uploaded_by: "Responsavel",
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      status: "synced",
      serverId: "document-1",
    });
    expect(mocks.addScaffoldDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        scaffold_id: "scaffold-1",
        title: "ART do andaime",
      }),
    );
  });

  it("marks a nonconformity status update as conflict when server changed first", async () => {
    mocks.nonConformityFindUnique.mockResolvedValue({
      code: "NC-001",
      status: "IN_PROGRESS",
      updatedAt: new Date("2026-01-01T00:01:00.000Z"),
    });

    const response = await postSync(
      queueItem("nonConformity.status.update", {
        id: "nc-1",
        status: "CLOSED",
        comment: "Resolvido offline.",
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      status: "conflict",
      error: "NC NC-001 foi alterada no servidor antes da sincronizacao.",
    });
    expect(mocks.updateNonConformityStatus).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company-1",
        workspaceId: "workspace-1",
      }),
    );
  });

  it("audits failed offline sync attempts", async () => {
    mocks.createScaffold.mockRejectedValueOnce(new Error("Banco indisponivel."));

    const response = await postSync(
      queueItem("scaffold.create", {
        type: "tubular",
        location: "Area 5",
        area: "Montagem",
        height: 4,
        responsible: "Equipe A",
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      status: "failed",
      error: "Banco indisponivel.",
    });
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        newValue: expect.objectContaining({
          status: "failed",
          error: "Banco indisponivel.",
        }),
      }),
    );
  });
});
