import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SyncClient } from "@/app/(dashboard)/sincronizacao/sync-client";
import { localDb } from "@/lib/offline/local-db";
import type { SyncQueueItem, SyncSummary } from "@/lib/offline/types";

const state = vi.hoisted(() => ({
  items: [] as SyncQueueItem[],
  summary: {
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
    conflict: 1,
    total: 1,
  } as SyncSummary,
  refresh: vi.fn(async () => undefined),
  syncNow: vi.fn(async () => undefined),
}));

vi.mock("@/components/offline/offline-provider", () => ({
  useOfflineStatus: () => ({
    status: "sync-error",
    summary: state.summary,
    lastSyncAt: undefined,
    refresh: state.refresh,
    syncNow: state.syncNow,
  }),
}));

vi.mock("@/lib/offline/local-db", () => ({
  localDb: {
    syncQueue: {
      all: vi.fn(async () => state.items),
      update: vi.fn(async (id: string, patch: Partial<SyncQueueItem>) => {
        state.items = state.items.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        );
        return state.items.find((item) => item.id === id) ?? null;
      }),
      deleteByStatus: vi.fn(async (status: SyncQueueItem["status"]) => {
        const deleted = state.items.filter((item) => item.status === status);
        state.items = state.items.filter((item) => item.status !== status);
        return deleted.length;
      }),
    },
  },
}));

function queueItem(status: SyncQueueItem["status"]): SyncQueueItem {
  return {
    id: "queue-1",
    action: "nonConformity.status.update",
    entityType: "nonConformity",
    entityId: "nc-1",
    payload: { id: "nc-1", status: "CLOSED" },
    status,
    attempts: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    lastError: "Registro alterado no servidor.",
  };
}

function failedQueueItem(): SyncQueueItem {
  return {
    ...queueItem("failed"),
    id: "queue-failed",
    action: "scaffold.update",
    entityType: "scaffold",
    entityId: "scaffold-1",
    payload: { id: "scaffold-1", code: "AND-001", location: "Area 2" },
    lastError: "Falha de rede.",
  };
}

describe("SyncClient", () => {
  beforeEach(() => {
    state.items = [queueItem("conflict")];
    state.summary = {
      pending: 0,
      syncing: 0,
      synced: 0,
      failed: 0,
      conflict: 1,
      total: 1,
    };
    state.refresh.mockClear();
    state.syncNow.mockClear();
    vi.clearAllMocks();
  });

  it("lets the user keep the server version for a conflict", async () => {
    render(<SyncClient />);

    expect(await screen.findByText("Conflito de sincronizacao")).toBeVisible();
    expect(screen.getAllByText("Alterar status da NC")[0]).toBeVisible();
    expect(screen.getAllByText("nc-1")[0]).toBeVisible();
    fireEvent.click(screen.getAllByText("Ver dados locais")[0]);
    expect(screen.getAllByText(/"status": "CLOSED"/)[0]).toBeVisible();

    fireEvent.click(
      screen.getAllByRole("button", { name: /^manter servidor$/i })[0],
    );

    await waitFor(() => {
      expect(localDb.syncQueue.update).toHaveBeenCalledWith(
        "queue-1",
        expect.objectContaining({
          status: "synced",
          lastError: undefined,
          syncedAt: expect.any(String),
        }),
      );
    });
    expect(state.refresh).toHaveBeenCalled();
  });

  it("lets the user keep all server versions for conflicts", async () => {
    state.items = [
      queueItem("conflict"),
      { ...queueItem("conflict"), id: "queue-2", entityId: "nc-2" },
    ];

    render(<SyncClient />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: /manter servidor em lote/i,
      }),
    );

    await waitFor(() => {
      expect(localDb.syncQueue.update).toHaveBeenCalledWith(
        "queue-1",
        expect.objectContaining({ status: "synced" }),
      );
      expect(localDb.syncQueue.update).toHaveBeenCalledWith(
        "queue-2",
        expect.objectContaining({ status: "synced" }),
      );
    });
    expect(state.refresh).toHaveBeenCalled();
  });

  it("lets the user retry all failed items", async () => {
    state.items = [failedQueueItem()];

    render(<SyncClient />);

    expect((await screen.findAllByText("Editar andaime"))[0]).toBeVisible();
    expect(screen.getAllByText("AND-001")[0]).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: /tentar falhas em lote/i }),
    );

    await waitFor(() => {
      expect(localDb.syncQueue.update).toHaveBeenCalledWith(
        "queue-failed",
        expect.objectContaining({
          status: "pending",
          lastError: undefined,
        }),
      );
    });
    expect(state.syncNow).toHaveBeenCalled();
  });

  it("lets the user clear synced items", async () => {
    state.items = [{ ...queueItem("synced"), id: "queue-synced" }];
    state.summary = {
      pending: 0,
      syncing: 0,
      synced: 1,
      failed: 0,
      conflict: 0,
      total: 1,
    };

    render(<SyncClient />);

    fireEvent.click(
      await screen.findByRole("button", { name: /limpar sincronizados/i }),
    );

    await waitFor(() => {
      expect(localDb.syncQueue.deleteByStatus).toHaveBeenCalledWith("synced");
    });
    expect(state.refresh).toHaveBeenCalled();
  });
});
