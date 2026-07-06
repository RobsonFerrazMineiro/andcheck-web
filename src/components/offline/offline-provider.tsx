"use client";

import { localDb } from "@/lib/offline/local-db";
import { processSyncQueue } from "@/lib/offline/sync-engine";
import {
  EMPTY_SYNC_SUMMARY,
  type ConnectivityStatus,
  type SyncSummary,
} from "@/lib/offline/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type OfflineContextValue = {
  status: ConnectivityStatus;
  isOnline: boolean;
  summary: SyncSummary;
  lastSyncAt?: string;
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue | null>(null);

function browserIsOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(() => browserIsOnline());
  const [status, setStatus] = useState<ConnectivityStatus>("online");
  const [summary, setSummary] = useState<SyncSummary>(EMPTY_SYNC_SUMMARY);
  const [lastSyncAt, setLastSyncAt] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    try {
      const [nextSummary, nextLastSyncAt] = await Promise.all([
        localDb.syncQueue.summary(),
        localDb.metadata.get<string>("lastSyncAt"),
      ]);

      setSummary(nextSummary);
      setLastSyncAt(nextLastSyncAt);

      if (!browserIsOnline()) {
        setStatus("offline");
      } else if (nextSummary.failed > 0 || nextSummary.conflict > 0) {
        setStatus("sync-error");
      } else {
        setStatus("online");
      }
    } catch {
      setStatus(browserIsOnline() ? "sync-error" : "offline");
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!browserIsOnline()) {
      setIsOnline(false);
      setStatus("offline");
      return;
    }

    setIsOnline(true);
    setStatus("syncing");

    try {
      const nextSummary = await processSyncQueue();
      setSummary(nextSummary);
      setLastSyncAt(await localDb.metadata.get<string>("lastSyncAt"));
      setStatus(
        nextSummary.failed > 0 || nextSummary.conflict > 0
          ? "sync-error"
          : "online",
      );
    } catch {
      setStatus("sync-error");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void refresh());

    function handleOnline() {
      setIsOnline(true);
      void syncNow();
    }

    function handleOffline() {
      setIsOnline(false);
      setStatus("offline");
      void refresh();
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("andcheck:sync-queue-updated", refresh);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("andcheck:sync-queue-updated", refresh);
    };
  }, [refresh, syncNow]);

  const value = useMemo(
    () => ({
      status,
      isOnline,
      summary,
      lastSyncAt,
      refresh,
      syncNow,
    }),
    [isOnline, lastSyncAt, refresh, status, summary, syncNow],
  );

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  );
}

export function useOfflineStatus() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOfflineStatus deve ser usado dentro de OfflineProvider.");
  }
  return context;
}
