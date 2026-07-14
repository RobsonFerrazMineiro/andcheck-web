"use client";

import { localDb } from "@/lib/offline/local-db";
import { browserIsOnline } from "@/lib/offline/connectivity";
import { useEffect, useMemo, useRef, useState } from "react";

type OfflineSnapshot<T> = {
  records: T[];
  cachedAt: string;
};

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
  const lastInitialDataKeyRef = useRef<string | null>(null);
  const initialDataRef = useRef(initialData);

  const initialDataKey = useMemo(
    () => JSON.stringify(initialData),
    [initialData],
  );

  useEffect(() => {
    initialDataRef.current = initialData;
  }, [initialData, initialDataKey]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateCache() {
      try {
        const online = browserIsOnline();
        const currentInitialData = initialDataRef.current;

        if (online && currentInitialData.length > 0) {
          if (lastInitialDataKeyRef.current === initialDataKey) {
            if (!cancelled) {
              setIsOfflineFallback(false);
              setCachedData(null);
            }
            return;
          }

          const cachedAt = new Date().toISOString();
          await localDb.metadata.set(cacheKey, {
            records: currentInitialData,
            cachedAt,
          } satisfies OfflineSnapshot<T>);
          lastInitialDataKeyRef.current = initialDataKey;

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
  }, [cacheKey, initialDataKey]);

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
