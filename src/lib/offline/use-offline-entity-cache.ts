"use client";

import {
  cacheOfflineRecords,
  getOfflineRecords,
  localDb,
  type OfflineEntityStoreName,
} from "@/lib/offline/local-db";
import { browserIsOnline } from "@/lib/offline/connectivity";
import { useEffect, useMemo, useState } from "react";

export function useOfflineEntityCache<T extends { id: string }>({
  storeName,
  initialData,
}: {
  storeName: OfflineEntityStoreName;
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
          const cachedAt = await cacheOfflineRecords(storeName, initialData);
          if (!cancelled) {
            setLastCachedAt(cachedAt);
            setIsOfflineFallback(false);
            setCachedData(null);
          }
          return;
        }

        const [records, cachedAt] = await Promise.all([
          getOfflineRecords<T>(storeName),
          localDb.metadata.get<string>(`${storeName}:lastCachedAt`),
        ]);

        if (!cancelled && records.length > 0) {
          setCachedData(records);
          setLastCachedAt(cachedAt);
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
  }, [initialData, storeName]);

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
