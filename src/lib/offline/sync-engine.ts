"use client";

import {
  localDb,
  replaceOfflineReferences,
  replaceOfflineRecordId,
  type OfflineEntityStoreName,
} from "@/lib/offline/local-db";
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

type SyncIdMetadata = {
  serverId?: unknown;
};

const ENTITY_STORE_BY_TYPE: Partial<Record<string, OfflineEntityStoreName>> = {
  scaffold: "scaffolds",
  inspection: "inspections",
  nonConformity: "nonConformities",
  document: "documents",
  notification: "notifications",
};

let activeSyncPromise: Promise<Awaited<ReturnType<typeof runSyncQueue>>> | null =
  null;

async function getMappedServerId(entityType: string, entityId: string) {
  const metadata = await localDb.metadata.get<SyncIdMetadata>(
    `syncId:${entityType}:${entityId}`,
  );
  return typeof metadata?.serverId === "string" ? metadata.serverId : undefined;
}

async function resolvePayloadFieldReference(
  payload: unknown,
  field: string,
  entityType: string,
) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  const current = (payload as Record<string, unknown>)[field];
  if (typeof current !== "string") return payload;

  const serverId = await getMappedServerId(entityType, current);
  return serverId ? { ...payload, [field]: serverId } : payload;
}

async function prepareQueueItemForSync(item: SyncQueueItem) {
  let next: SyncQueueItem = { ...item };
  const mappedEntityId = await getMappedServerId(item.entityType, item.entityId);

  if (mappedEntityId) {
    next = { ...next, entityId: mappedEntityId };
  }

  if (
    next.action === "inspection.create" ||
    next.action === "scaffold.document.add"
  ) {
    next = {
      ...next,
      payload: await resolvePayloadFieldReference(
        next.payload,
        "scaffold_id",
        "scaffold",
      ),
    };
  }

  if (
    next.action === "scaffold.assembly.complete" ||
    next.action === "scaffold.dismantle" ||
    next.action === "scaffold.update"
  ) {
    next = {
      ...next,
      payload: await resolvePayloadFieldReference(
        next.payload,
        "id",
        "scaffold",
      ),
    };
  }

  if (
    next.action === "nonConformity.comment.add" ||
    next.action === "nonConformity.status.update" ||
    next.action === "nonConformity.responsible.update" ||
    next.action === "nonConformity.dueDate.update"
  ) {
    next = {
      ...next,
      payload: await resolvePayloadFieldReference(
        next.payload,
        "id",
        "nonConformity",
      ),
    };
  }

  return next;
}

async function sendQueueItem(item: SyncQueueItem): Promise<ServerSyncResult> {
  const resolvedItem = await prepareQueueItemForSync(item);
  const response = await fetch("/api/sincronizacao/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(resolvedItem),
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
  if (!activeSyncPromise) {
    activeSyncPromise = runSyncQueue({ includeFailed }).finally(() => {
      activeSyncPromise = null;
    });
  }

  return activeSyncPromise;
}

async function runSyncQueue({
  includeFailed,
}: {
  includeFailed: boolean;
}) {
  const queue = await localDb.syncQueue.all();
  const candidates = queue.filter((item) =>
    includeFailed
      ? item.status === "pending" ||
        item.status === "failed" ||
        item.status === "syncing"
      : item.status === "pending",
  );

  for (const item of candidates) {
    await localDb.syncQueue.setStatus(item.id, "syncing");

    try {
      const result = await sendQueueItem(item);
      await localDb.syncQueue.update(item.id, {
        status: result.status,
        lastError: result.error,
        serverId: result.serverId,
        syncedAt:
          result.status === "synced" ? new Date().toISOString() : undefined,
      });
      if (result.status === "synced" && result.serverId) {
        await recordServerIdMapping(item, result.serverId);
      }
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

async function recordServerIdMapping(item: SyncQueueItem, serverId: string) {
  await localDb.metadata.set(`syncId:${item.entityType}:${item.entityId}`, {
    serverId,
    syncedAt: new Date().toISOString(),
  });

  const storeName = ENTITY_STORE_BY_TYPE[item.entityType];
  if (!storeName || item.entityId === serverId) return;

  await replaceOfflineRecordId(storeName, item.entityId, serverId);
  await replaceOfflineReferences(item.entityId, serverId);
}
