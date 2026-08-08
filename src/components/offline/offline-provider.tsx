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
  isChecking: boolean;
  lastCheckedAt?: string;
  latency?: number;
  summary: SyncSummary;
  lastSyncAt?: string;
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue | null>(null);
const ONLINE_POLL_INTERVAL_MS = 60_000;
const OFFLINE_BACKOFF_INTERVALS_MS = [5_000, 10_000, 20_000, 30_000, 60_000];

function hasAutoSyncCandidates(summary: SyncSummary) {
  return summary.pending > 0 || summary.syncing > 0;
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(() => browserIsOnline());
  const [status, setStatus] = useState<ConnectivityStatus>("online");
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | undefined>();
  const [latency, setLatency] = useState<number | undefined>();
  const [summary, setSummary] = useState<SyncSummary>(EMPTY_SYNC_SUMMARY);
  const [lastSyncAt, setLastSyncAt] = useState<string | undefined>();
  const queueRefreshTimerRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const offlineBackoffStepRef = useRef(0);

  const updateConnectivity = useCallback(async ({ force = false } = {}) => {
    setIsChecking(true);
    const startedAt = performance.now();
    try {
      const connectivity = await checkServerConnectivity({ force });
      const checkedAt = new Date().toISOString();
      const nextLatency = Math.round(performance.now() - startedAt);

      setLastCheckedAt(checkedAt);
      setLatency(nextLatency);
      setIsOnline(connectivity === "online");
      if (connectivity === "online") {
        offlineBackoffStepRef.current = 0;
      }

      return connectivity;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [connectivity, nextSummary, nextLastSyncAt] = await Promise.all([
        updateConnectivity(),
        localDb.syncQueue.summary(),
        localDb.metadata.get<string>("lastSyncAt"),
      ]);

      setSummary(nextSummary);
      setLastSyncAt(nextLastSyncAt);

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
  }, [updateConnectivity]);

  const syncNow = useCallback(async () => {
    const connectivity = await updateConnectivity({ force: true });
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
  }, [updateConnectivity]);

  const autoSyncIfReady = useCallback(async () => {
    try {
      const [connectivity, nextSummary] = await Promise.all([
        updateConnectivity(),
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
  }, [refresh, syncNow, updateConnectivity]);

  useEffect(() => {
    function clearPollTimer() {
      if (pollTimerRef.current) {
        window.clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }

    function scheduleNextPoll() {
      clearPollTimer();
      const browserOnline = browserIsOnline();
      const delay = browserOnline
        ? ONLINE_POLL_INTERVAL_MS
        : OFFLINE_BACKOFF_INTERVALS_MS[
            Math.min(
              offlineBackoffStepRef.current,
              OFFLINE_BACKOFF_INTERVALS_MS.length - 1,
            )
          ];

      if (!browserOnline) {
        offlineBackoffStepRef.current += 1;
      }

      pollTimerRef.current = window.setTimeout(() => {
        void autoSyncIfReady().finally(scheduleNextPoll);
      }, delay);
    }

    queueMicrotask(() => {
      void autoSyncIfReady().finally(scheduleNextPoll);
    });

    function handleOnline() {
      offlineBackoffStepRef.current = 0;
      clearPollTimer();
      setIsOnline(true);
      void syncNow().finally(scheduleNextPoll);
    }

    function handleOffline() {
      clearPollTimer();
      setIsOnline(false);
      setStatus("offline");
      void localDb.syncQueue.summary().then(setSummary);
      scheduleNextPoll();
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

    function handleFocus() {
      clearPollTimer();
      void autoSyncIfReady().finally(scheduleNextPoll);
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      handleFocus();
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("andcheck:sync-queue-updated", handleQueueUpdated);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (queueRefreshTimerRef.current) {
        window.clearTimeout(queueRefreshTimerRef.current);
      }
      clearPollTimer();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "andcheck:sync-queue-updated",
        handleQueueUpdated,
      );
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autoSyncIfReady, syncNow]);

  const value = useMemo(
    () => ({
      status,
      isOnline,
      isChecking,
      lastCheckedAt,
      latency,
      summary,
      lastSyncAt,
      refresh,
      syncNow,
    }),
    [
      isChecking,
      isOnline,
      lastCheckedAt,
      lastSyncAt,
      latency,
      refresh,
      status,
      summary,
      syncNow,
    ],
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
