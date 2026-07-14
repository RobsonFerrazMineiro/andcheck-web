"use client";

import { localDb } from "@/lib/offline/local-db";
import { processSyncQueue } from "@/lib/offline/sync-engine";
import {
  browserIsOnline,
  checkServerConnectivity,
} from "@/lib/offline/connectivity";
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
  useRef,
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
const AUTO_SYNC_INTERVAL_MS = 10_000;

function hasAutoSyncCandidates(summary: SyncSummary) {
  return summary.pending > 0 || summary.syncing > 0;
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(() => browserIsOnline());
  const [status, setStatus] = useState<ConnectivityStatus>("online");
  const [summary, setSummary] = useState<SyncSummary>(EMPTY_SYNC_SUMMARY);
  const [lastSyncAt, setLastSyncAt] = useState<string | undefined>();
  const queueRefreshTimerRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const connectivity = await checkServerConnectivity();
      const [nextSummary, nextLastSyncAt] = await Promise.all([
        localDb.syncQueue.summary(),
        localDb.metadata.get<string>("lastSyncAt"),
      ]);

      setSummary(nextSummary);
      setLastSyncAt(nextLastSyncAt);

      setIsOnline(connectivity === "online");

      if (connectivity === "offline") {
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
    const connectivity = await checkServerConnectivity();
    if (connectivity === "offline") {
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

  const autoSyncIfReady = useCallback(async () => {
    try {
      const [connectivity, nextSummary] = await Promise.all([
        checkServerConnectivity(),
        localDb.syncQueue.summary(),
      ]);

      if (connectivity === "online" && hasAutoSyncCandidates(nextSummary)) {
        await syncNow();
        return;
      }

      await refresh();
    } catch {
      setStatus(browserIsOnline() ? "sync-error" : "offline");
    }
  }, [refresh, syncNow]);

  useEffect(() => {
    queueMicrotask(() => void autoSyncIfReady());
    const interval = window.setInterval(
      () => void autoSyncIfReady(),
      AUTO_SYNC_INTERVAL_MS,
    );

    function handleOnline() {
      setIsOnline(true);
      void syncNow();
    }

    function handleOffline() {
      setIsOnline(false);
      setStatus("offline");
      void refresh();
    }

    function handleQueueUpdated() {
      if (queueRefreshTimerRef.current) {
        window.clearTimeout(queueRefreshTimerRef.current);
      }

      queueRefreshTimerRef.current = window.setTimeout(() => {
        queueRefreshTimerRef.current = null;
        void localDb.syncQueue.summary().then(setSummary);
      }, 250);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("andcheck:sync-queue-updated", handleQueueUpdated);
    window.addEventListener("focus", autoSyncIfReady);
    document.addEventListener("visibilitychange", autoSyncIfReady);

    return () => {
      window.clearInterval(interval);
      if (queueRefreshTimerRef.current) {
        window.clearTimeout(queueRefreshTimerRef.current);
      }
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "andcheck:sync-queue-updated",
        handleQueueUpdated,
      );
      window.removeEventListener("focus", autoSyncIfReady);
      document.removeEventListener("visibilitychange", autoSyncIfReady);
    };
  }, [autoSyncIfReady, refresh, syncNow]);

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
