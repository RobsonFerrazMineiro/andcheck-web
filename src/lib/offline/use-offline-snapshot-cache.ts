"use client";

import { localDb } from "@/lib/offline/local-db";
import { useEffect, useMemo, useState } from "react";

type OfflineSnapshot<T> = {
  records: T[];
  cachedAt: string;
};

function browserIsOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function useOfflineSnapshotCache<T>({
  cacheKey,
  initialData,
}: {
  cacheKey: string;
  initialData: T[];
}) {
  const [cachedData, setCachedData] = useState<T[] | null>(null);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  const [lastCachedAt, setLastCachedAt] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    async function hydrateCache() {
      try {
        const online = browserIsOnline();

        if (online && initialData.length > 0) {
          const cachedAt = new Date().toISOString();
          await localDb.metadata.set(cacheKey, {
            records: initialData,
            cachedAt,
          } satisfies OfflineSnapshot<T>);

          if (!cancelled) {
            setLastCachedAt(cachedAt);
            setIsOfflineFallback(false);
            setCachedData(null);
          }
          return;
        }

        const snapshot =
          await localDb.metadata.get<OfflineSnapshot<T>>(cacheKey);

        if (!cancelled && snapshot?.records?.length) {
          setCachedData(snapshot.records);
          setLastCachedAt(snapshot.cachedAt);
          setIsOfflineFallback(!online);
        }
      } catch {
        if (!cancelled) setIsOfflineFallback(false);
      }
    }

    queueMicrotask(() => void hydrateCache());

    function handleOffline() {
      void hydrateCache();
    }

    window.addEventListener("offline", handleOffline);
    return () => {
      cancelled = true;
      window.removeEventListener("offline", handleOffline);
    };
  }, [cacheKey, initialData]);

  const data = useMemo(
    () => (isOfflineFallback && cachedData ? cachedData : initialData),
    [cachedData, initialData, isOfflineFallback],
  );

  return {
    data,
    isOfflineFallback,
    lastCachedAt,
  };
}
