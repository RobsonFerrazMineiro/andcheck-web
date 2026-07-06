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
const DB_VERSION = 1;

const STORE_NAMES = [
  "metadata",
  "scaffolds",
  "inspections",
  "nonConformities",
  "documents",
  "syncQueue",
] as const;

type OfflineStoreName = (typeof STORE_NAMES)[number];
type OfflineRecord = { id: string; updatedAt?: string; [key: string]: unknown };

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
  };
}

export const localDb = {
  scaffolds: createEntityStore<OfflineRecord>("scaffolds"),
  inspections: createEntityStore<OfflineRecord>("inspections"),
  nonConformities: createEntityStore<OfflineRecord>("nonConformities"),
  documents: createEntityStore<OfflineRecord>("documents"),
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
      };
      const { store, done } = await getStore("syncQueue", "readwrite");
      store.put(item);
      await done;
      emitQueueUpdated();
      return item;
    },
    async update(
      id: string,
      patch: Partial<Pick<SyncQueueItem, "status" | "attempts" | "lastError">>,
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
