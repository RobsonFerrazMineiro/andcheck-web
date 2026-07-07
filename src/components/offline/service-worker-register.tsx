"use client";

import { useEffect } from "react";

const OFFLINE_CACHE_NAME = "andcheck-offline-v4";
const STATIC_OFFLINE_ASSETS = ["/favicon.ico", "/manifest.webmanifest"];
const OPERATIONAL_OFFLINE_ROUTES = [
  "/dashboard",
  "/andaimes",
  "/andaimes/novo",
  "/inspecoes",
  "/inspecoes/nova",
  "/nao-conformidades",
  "/acervo",
  "/mapa",
  "/notificacoes",
  "/perfil",
  "/perfil/notificacoes",
  "/sincronizacao",
];

async function preheatOperationalRoutesCache() {
  if (!navigator.onLine || !("caches" in window)) return;

  const cache = await caches.open(OFFLINE_CACHE_NAME);
  await Promise.allSettled(
    [...STATIC_OFFLINE_ASSETS, ...OPERATIONAL_OFFLINE_ROUTES].map(async (route) => {
      const response = await fetch(route, {
        credentials: "same-origin",
      });
      if (!response.ok) return;
      await cache.put(route, response);
    }),
  );
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        void preheatOperationalRoutesCache().catch((error) => {
          console.error("Falha ao preparar rotas offline:", error);
        });
      })
      .catch((error) => {
        console.error("Falha ao registrar service worker:", error);
      });
  }, []);

  return null;
}
