"use client";

import { localDb } from "@/lib/offline/local-db";
import {
  isSyncQueueStatus,
  type SyncQueueItem,
  type SyncQueueStatus,
} from "@/lib/offline/types";

type ServerSyncResult = {
  id: string;
  status: SyncQueueStatus;
  serverId?: string;
  error?: string;
};

async function sendQueueItem(item: SyncQueueItem): Promise<ServerSyncResult> {
  const response = await fetch("/api/sincronizacao/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });

  const result = (await response.json().catch(() => null)) as
    | ServerSyncResult
    | null;

  if (!response.ok) {
    return {
      id: item.id,
      status: isSyncQueueStatus(result?.status) ? result.status : "failed",
      error: result?.error ?? "Falha ao enviar item para sincronizacao.",
    };
  }

  return (
    result ?? {
      id: item.id,
      status: "failed",
      error: "Resposta invalida do servidor de sincronizacao.",
    }
  );
}

export async function processSyncQueue({
  includeFailed = true,
}: {
  includeFailed?: boolean;
} = {}) {
  const queue = await localDb.syncQueue.all();
  const candidates = queue.filter((item) =>
    includeFailed
      ? item.status === "pending" || item.status === "failed"
      : item.status === "pending",
  );

  for (const item of candidates) {
    await localDb.syncQueue.setStatus(item.id, "syncing");

    try {
      const result = await sendQueueItem(item);
      await localDb.syncQueue.update(item.id, {
        status: result.status,
        lastError: result.error,
      });
    } catch (error) {
      await localDb.syncQueue.update(item.id, {
        status: "failed",
        lastError:
          error instanceof Error
            ? error.message
            : "Falha desconhecida na sincronizacao.",
      });
    }
  }

  await localDb.metadata.set("lastSyncAt", new Date().toISOString());
  return localDb.syncQueue.summary();
}
