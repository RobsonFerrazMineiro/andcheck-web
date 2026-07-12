"use client";

import {
  createOfflineId,
  getSyncSummaryFromItems,
  type NewSyncQueueItem,
  type OfflineMetadata,
  type SyncQueueItem,
  type SyncQueueStatus,
} from "@/lib/offline/types";

const DB_NAME = "andcheck-offline";
const DB_VERSION = 2;

const STORE_NAMES = [
  "metadata",
  "scaffolds",
  "inspections",
  "nonConformities",
  "documents",
  "notifications",
  "syncQueue",
] as const;

type OfflineStoreName = (typeof STORE_NAMES)[number];
type OfflineRecord = { id: string; updatedAt?: string; [key: string]: unknown };
export type OfflineEntityStoreName = Exclude<
  OfflineStoreName,
  "metadata" | "syncQueue"
>;

let dbPromise: Promise<IDBDatabase> | null = null;

function assertIndexedDbAvailable() {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    throw new Error("IndexedDB nao esta disponivel neste ambiente.");
  }
}

function openOfflineDatabase() {
  assertIndexedDbAvailable();

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        for (const storeName of STORE_NAMES) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: "id" });
          }
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("Falha ao abrir banco offline."));
    });
  }

  return dbPromise;
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Falha na operacao IndexedDB."));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Falha na transacao IndexedDB."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Transacao IndexedDB abortada."));
  });
}

async function getStore(storeName: OfflineStoreName, mode: IDBTransactionMode) {
  const db = await openOfflineDatabase();
  const transaction = db.transaction(storeName, mode);
  return {
    store: transaction.objectStore(storeName),
    done: transactionDone(transaction),
  };
}

function emitQueueUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("andcheck:sync-queue-updated"));
}

function getDeviceInfo() {
  if (typeof navigator === "undefined") return undefined;

  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
  };
}

function createEntityStore<T extends OfflineRecord>(storeName: OfflineStoreName) {
  return {
    async all() {
      const { store } = await getStore(storeName, "readonly");
      return requestToPromise<T[]>(store.getAll());
    },
    async get(id: string) {
      const { store } = await getStore(storeName, "readonly");
      return requestToPromise<T | undefined>(store.get(id));
    },
    async put(record: T) {
      const { store, done } = await getStore(storeName, "readwrite");
      store.put({
        ...record,
        updatedAt: record.updatedAt ?? new Date().toISOString(),
      });
      await done;
      return record;
    },
    async bulkPut(records: T[]) {
      const { store, done } = await getStore(storeName, "readwrite");
      const now = new Date().toISOString();

      for (const record of records) {
        store.put({ ...record, updatedAt: record.updatedAt ?? now });
      }

      await done;
      return records.length;
    },
    async delete(id: string) {
      const { store, done } = await getStore(storeName, "readwrite");
      store.delete(id);
      await done;
    },
    async clear() {
      const { store, done } = await getStore(storeName, "readwrite");
      store.clear();
      await done;
    },
    async replaceId(temporaryId: string, serverId: string) {
      const { store, done } = await getStore(storeName, "readwrite");
      const current = await requestToPromise<T | undefined>(
        store.get(temporaryId),
      );

      if (!current) {
        await done;
        return null;
      }

      store.delete(temporaryId);
      const next = {
        ...current,
        id: serverId,
        offlineId: temporaryId,
        serverId,
        syncStatus: "synced",
        updatedAt: new Date().toISOString(),
      } as T;
      store.put(next);
      await done;
      return next;
    },
  };
}

function replaceReferenceValue(
  value: unknown,
  temporaryId: string,
  serverId: string,
): { value: unknown; changed: boolean } {
  if (value === temporaryId) {
    return { value: serverId, changed: true };
  }

  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const result = replaceReferenceValue(item, temporaryId, serverId);
      changed ||= result.changed;
      return result.value;
    });
    return { value: changed ? next : value, changed };
  }

  if (value && typeof value === "object") {
    let changed = false;
    const next: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
      if (key === "offlineId") {
        next[key] = item;
        continue;
      }

      const result = replaceReferenceValue(item, temporaryId, serverId);
      changed ||= result.changed;
      next[key] = result.value;
    }

    return { value: changed ? next : value, changed };
  }

  return { value, changed: false };
}

export const localDb = {
  scaffolds: createEntityStore<OfflineRecord>("scaffolds"),
  inspections: createEntityStore<OfflineRecord>("inspections"),
  nonConformities: createEntityStore<OfflineRecord>("nonConformities"),
  documents: createEntityStore<OfflineRecord>("documents"),
  notifications: createEntityStore<OfflineRecord>("notifications"),
  metadata: {
    async get<T = unknown>(id: string) {
      const { store } = await getStore("metadata", "readonly");
      const record = await requestToPromise<OfflineMetadata | undefined>(
        store.get(id),
      );
      return record?.value as T | undefined;
    },
    async set(id: string, value: unknown) {
      const { store, done } = await getStore("metadata", "readwrite");
      const record: OfflineMetadata = {
        id,
        value,
        updatedAt: new Date().toISOString(),
      };
      store.put(record);
      await done;
      return record;
    },
  },
  syncQueue: {
    async all() {
      const { store } = await getStore("syncQueue", "readonly");
      const items = await requestToPromise<SyncQueueItem[]>(store.getAll());
      return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async enqueue(input: NewSyncQueueItem) {
      const now = new Date().toISOString();
      const item: SyncQueueItem = {
        ...input,
        id: input.id ?? createOfflineId(input.entityType),
        status: input.status ?? "pending",
        attempts: 0,
        createdAt: now,
        updatedAt: now,
        deviceInfo: input.deviceInfo ?? getDeviceInfo(),
      };
      const { store, done } = await getStore("syncQueue", "readwrite");
      store.put(item);
      await done;
      emitQueueUpdated();
      return item;
    },
    async upsertLatest(input: NewSyncQueueItem) {
      const items = await this.all();
      const current = items
        .filter(
          (item) =>
            item.action === input.action &&
            item.entityType === input.entityType &&
            item.entityId === input.entityId &&
            ["pending", "failed", "conflict"].includes(item.status),
        )
        .at(-1);

      if (current) {
        return this.update(current.id, {
          status: input.status ?? "pending",
          attempts: 0,
          lastError: undefined,
          serverId: undefined,
          syncedAt: undefined,
          payload: input.payload,
        });
      }

      return this.enqueue(input);
    },
    async update(
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
    ) {
      const current = (await this.all()).find((item) => item.id === id);

      if (!current) return null;

      const next: SyncQueueItem = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      const { store, done } = await getStore("syncQueue", "readwrite");
      store.put(next);
      await done;
      emitQueueUpdated();
      return next;
    },
    async delete(id: string) {
      const { store, done } = await getStore("syncQueue", "readwrite");
      store.delete(id);
      await done;
      emitQueueUpdated();
    },
    async deleteByStatus(status: SyncQueueStatus) {
      const items = await this.all();
      const targets = items.filter((item) => item.status === status);
      const { store, done } = await getStore("syncQueue", "readwrite");

      for (const item of targets) {
        store.delete(item.id);
      }

      await done;
      if (targets.length > 0) emitQueueUpdated();
      return targets.length;
    },
    async setStatus(id: string, status: SyncQueueStatus, lastError?: string) {
      const items = await this.all();
      const current = items.find((item) => item.id === id);
      return this.update(id, {
        status,
        lastError,
        attempts:
          status === "syncing" || status === "failed"
            ? (current?.attempts ?? 0) + 1
            : current?.attempts,
      });
    },
    async summary() {
      return getSyncSummaryFromItems(await this.all());
    },
  },
};

const entityStores = {
  scaffolds: localDb.scaffolds,
  inspections: localDb.inspections,
  nonConformities: localDb.nonConformities,
  documents: localDb.documents,
  notifications: localDb.notifications,
} satisfies Record<OfflineEntityStoreName, ReturnType<typeof createEntityStore>>;

export async function cacheOfflineRecords<T extends { id: string }>(
  storeName: OfflineEntityStoreName,
  records: T[],
) {
  const now = new Date().toISOString();
  await entityStores[storeName].bulkPut(
    records.map((record) => ({ ...record, updatedAt: now })),
  );
  await localDb.metadata.set(`${storeName}:lastCachedAt`, now);
  return now;
}

export async function getOfflineRecords<T extends { id: string }>(
  storeName: OfflineEntityStoreName,
) {
  return (await entityStores[storeName].all()) as T[];
}

export async function replaceOfflineRecordId(
  storeName: OfflineEntityStoreName,
  temporaryId: string,
  serverId: string,
) {
  return entityStores[storeName].replaceId(temporaryId, serverId);
}

export async function replaceOfflineReferences(
  temporaryId: string,
  serverId: string,
) {
  for (const store of Object.values(entityStores)) {
    const records = await store.all();
    const changedRecords = records
      .map((record) => replaceReferenceValue(record, temporaryId, serverId))
      .filter((result) => result.changed)
      .map((result) => result.value as OfflineRecord);

    if (changedRecords.length > 0) {
      await store.bulkPut(changedRecords);
    }
  }

  const queueItems = await localDb.syncQueue.all();
  for (const item of queueItems) {
    const entityId = replaceReferenceValue(item.entityId, temporaryId, serverId);
    const payload = replaceReferenceValue(item.payload, temporaryId, serverId);

    if (entityId.changed || payload.changed) {
      await localDb.syncQueue.update(item.id, {
        entityId: entityId.value as string,
        payload: payload.value,
      });
    }
  }
}
