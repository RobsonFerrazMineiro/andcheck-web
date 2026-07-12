import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SyncClient } from "@/app/(dashboard)/sincronizacao/sync-client";
import { localDb } from "@/lib/offline/local-db";
import type { SyncQueueItem, SyncSummary } from "@/lib/offline/types";

const state = vi.hoisted(() => ({
  items: [] as SyncQueueItem[],
  refresh: vi.fn(async () => undefined),
  syncNow: vi.fn(async () => undefined),
}));

const summary: SyncSummary = {
  pending: 0,
  syncing: 0,
  synced: 0,
  failed: 0,
  conflict: 1,
  total: 1,
};

vi.mock("@/components/offline/offline-provider", () => ({
  useOfflineStatus: () => ({
    status: "sync-error",
    summary,
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

describe("SyncClient", () => {
  beforeEach(() => {
    state.items = [queueItem("conflict")];
    state.refresh.mockClear();
    state.syncNow.mockClear();
    vi.clearAllMocks();
  });

  it("lets the user keep the server version for a conflict", async () => {
    render(<SyncClient />);

    expect(await screen.findByText("Conflito de sincronizacao")).toBeVisible();
    fireEvent.click(screen.getByText("Ver dados locais"));
    expect(screen.getByText(/"status": "CLOSED"/)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /manter servidor/i }));

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
});
