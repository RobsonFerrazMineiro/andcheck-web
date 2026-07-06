"use client";

import { useEffect } from "react";

const OFFLINE_CACHE_NAME = "andcheck-offline-v2";
const SYNC_PAGE_URL = "/sincronizacao";

async function preheatSyncPageCache() {
  if (!navigator.onLine || !("caches" in window)) return;

  const response = await fetch(SYNC_PAGE_URL, {
    credentials: "same-origin",
  });
  if (!response.ok) return;

  const cache = await caches.open(OFFLINE_CACHE_NAME);
  await cache.put(SYNC_PAGE_URL, response);
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker
      .register("/sw.js")
      .then(() => preheatSyncPageCache())
      .catch((error) => {
        console.error("Falha ao registrar service worker:", error);
      });
  }, []);

  return null;
}
