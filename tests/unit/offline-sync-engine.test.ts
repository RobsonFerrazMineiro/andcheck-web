import { processSyncQueue } from "@/lib/offline/sync-engine";
import {
  localDb,
  replaceOfflineRecordId,
  replaceOfflineReferences,
} from "@/lib/offline/local-db";
import type { SyncQueueItem, SyncQueueStatus } from "@/lib/offline/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  items: [] as SyncQueueItem[],
  metadata: new Map<string, unknown>(),
}));

vi.mock("@/lib/offline/local-db", () => {
  function summary() {
    const result = {
      pending: 0,
      syncing: 0,
      synced: 0,
      failed: 0,
      conflict: 0,
      total: 0,
    } satisfies Record<SyncQueueStatus, number> & { total: number };

    for (const item of state.items) {
      result[item.status] += 1;
      result.total += 1;
    }

    return result;
  }

  function patchItem(
    id: string,
    patch: Partial<
      Pick<
        SyncQueueItem,
        "status" | "attempts" | "lastError" | "serverId" | "syncedAt"
      >
    >,
  ) {
    const index = state.items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    state.items[index] = {
      ...state.items[index],
      ...patch,
      updatedAt: "2026-01-01T00:00:01.000Z",
    };
    return state.items[index];
  }

  return {
    localDb: {
      syncQueue: {
        all: vi.fn(async () => state.items),
        setStatus: vi.fn(
          async (id: string, status: SyncQueueStatus, lastError?: string) => {
            const item = state.items.find((current) => current.id === id);
            return patchItem(id, {
              status,
              lastError,
              attempts:
                status === "syncing" || status === "failed"
                  ? (item?.attempts ?? 0) + 1
                  : item?.attempts,
            });
          },
        ),
        update: vi.fn(
          async (
            id: string,
            patch: Partial<
              Pick<
                SyncQueueItem,
                | "status"
                | "attempts"
                | "lastError"
                | "serverId"
                | "syncedAt"
                | "entityId"
                | "payload"
              >
            >,
          ) => patchItem(id, patch),
        ),
        summary: vi.fn(async () => summary()),
      },
      metadata: {
        set: vi.fn(async (id: string, value: unknown) => {
          state.metadata.set(id, value);
          return {
            id,
            value,
            updatedAt: "2026-01-01T00:00:01.000Z",
          };
        }),
        get: vi.fn(async (id: string) => state.metadata.get(id)),
      },
    },
    replaceOfflineRecordId: vi.fn(async () => null),
    replaceOfflineReferences: vi.fn(async () => undefined),
  };
});

function queueItem(
  id: string,
  status: SyncQueueStatus = "pending",
): SyncQueueItem {
  return {
    id,
    action: "scaffold.create",
    entityType: "scaffold",
    entityId: id,
    payload: { id },
    status,
    attempts: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("processSyncQueue", () => {
  beforeEach(() => {
    state.items = [];
    state.metadata.clear();
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          id: "queue-1",
          status: "synced",
          serverId: "server-1",
        }),
      ),
    );
  });

  it("processes pending and failed items by default", async () => {
    state.items = [
      queueItem("queue-1", "pending"),
      queueItem("queue-2", "failed"),
      queueItem("queue-3", "synced"),
    ];

    const summary = await processSyncQueue();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(state.items.map((item) => item.status)).toEqual([
      "synced",
      "synced",
      "synced",
    ]);
    expect(summary).toMatchObject({ synced: 3, total: 3 });
    expect(localDb.metadata.set).toHaveBeenCalledWith(
      "lastSyncAt",
      expect.any(String),
    );
    expect(localDb.metadata.set).toHaveBeenCalledWith(
      "syncId:scaffold:queue-1",
      expect.objectContaining({ serverId: "server-1" }),
    );
    expect(replaceOfflineRecordId).toHaveBeenCalledWith(
      "scaffolds",
      "queue-1",
      "server-1",
    );
    expect(replaceOfflineReferences).toHaveBeenCalledWith(
      "queue-1",
      "server-1",
    );
  });

  it("can skip failed items when retry is disabled", async () => {
    state.items = [
      queueItem("queue-1", "pending"),
      queueItem("queue-2", "failed"),
    ];

    const summary = await processSyncQueue({ includeFailed: false });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(state.items.map((item) => item.status)).toEqual([
      "synced",
      "failed",
    ]);
    expect(summary).toMatchObject({ synced: 1, failed: 1, total: 2 });
  });

  it("retries items left as syncing after an interrupted sync", async () => {
    state.items = [
      queueItem("queue-1", "syncing"),
      queueItem("queue-2", "pending"),
    ];

    const summary = await processSyncQueue();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(state.items.map((item) => item.status)).toEqual([
      "synced",
      "synced",
    ]);
    expect(summary).toMatchObject({ synced: 2, total: 2 });
  });

  it("uses server ids for dependent queue items in the same sync run", async () => {
    state.items = [
      queueItem("offline_scaffold", "pending"),
      {
        ...queueItem("offline_inspection", "pending"),
        action: "inspection.create",
        entityType: "inspection",
        payload: {
          scaffold_id: "offline_scaffold",
          scaffold_code: "Pendente",
          inspector_name: "Robson",
          result: "aprovado",
          validity_days: 30,
          checklist: [],
        },
      },
    ];
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          id: "offline_scaffold",
          status: "synced",
          serverId: "server_scaffold",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "offline_inspection",
          status: "synced",
          serverId: "server_inspection",
        }),
      );

    await processSyncQueue();

    const secondBody = JSON.parse(
      String(vi.mocked(fetch).mock.calls[1]?.[1]?.body),
    ) as SyncQueueItem;
    expect(secondBody.payload).toMatchObject({
      scaffold_id: "server_scaffold",
    });
  });

  it("uses server ids for scaffold status actions in the same sync run", async () => {
    state.items = [
      queueItem("offline_scaffold", "pending"),
      {
        ...queueItem("offline_complete", "pending"),
        action: "scaffold.assembly.complete",
        entityType: "scaffold",
        entityId: "offline_scaffold",
        payload: {
          id: "offline_scaffold",
        },
      },
    ];
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          id: "offline_scaffold",
          status: "synced",
          serverId: "server_scaffold",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "offline_complete",
          status: "synced",
          serverId: "server_scaffold",
        }),
      );

    await processSyncQueue();

    const secondBody = JSON.parse(
      String(vi.mocked(fetch).mock.calls[1]?.[1]?.body),
    ) as SyncQueueItem;
    expect(secondBody).toMatchObject({
      entityId: "server_scaffold",
      payload: { id: "server_scaffold" },
    });
  });

  it("marks an item as failed when the server rejects the payload", async () => {
    state.items = [queueItem("queue-1", "pending")];
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ error: "Payload invalido." }, { status: 422 }),
    );

    const summary = await processSyncQueue();

    expect(state.items[0]).toMatchObject({
      status: "failed",
      lastError: "Payload invalido.",
    });
    expect(summary).toMatchObject({ failed: 1, total: 1 });
  });

  it("marks an item as conflict when the server detects a version conflict", async () => {
    state.items = [queueItem("queue-1", "pending")];
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(
        {
          id: "queue-1",
          status: "conflict",
          error: "Registro alterado no servidor.",
        },
        { status: 409 },
      ),
    );

    const summary = await processSyncQueue();

    expect(state.items[0]).toMatchObject({
      status: "conflict",
      lastError: "Registro alterado no servidor.",
    });
    expect(summary).toMatchObject({ conflict: 1, total: 1 });
  });

  it("marks an item as failed when the network request throws", async () => {
    state.items = [queueItem("queue-1", "pending")];
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Sem conexao."));

    const summary = await processSyncQueue();

    expect(state.items[0]).toMatchObject({
      status: "failed",
      lastError: "Sem conexao.",
    });
    expect(summary).toMatchObject({ failed: 1, total: 1 });
  });
});
