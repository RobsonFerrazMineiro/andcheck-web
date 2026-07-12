"use client";

import { useEffect } from "react";

const OFFLINE_CACHE_NAME = "andcheck-offline-v6";
const ENABLE_SERVICE_WORKER =
  process.env.NEXT_PUBLIC_ENABLE_SERVICE_WORKER !== "false";
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

function cacheableAssetUrlsFromHtml(html: string) {
  const document = new DOMParser().parseFromString(html, "text/html");
  const urls = new Set<string>();

  document
    .querySelectorAll<HTMLScriptElement>("script[src]")
    .forEach((script) => {
      if (script.src) urls.add(script.src);
    });

  document
    .querySelectorAll<HTMLLinkElement>(
      'link[rel="stylesheet"][href], link[rel="preload"][href], link[rel="modulepreload"][href]',
    )
    .forEach((link) => {
      if (link.href) urls.add(link.href);
    });

  return [...urls].filter((url) => {
    const parsed = new URL(url);
    return (
      parsed.origin === window.location.origin &&
      !parsed.pathname.includes("webpack-hmr") &&
      (parsed.pathname.startsWith("/_next/") ||
        STATIC_OFFLINE_ASSETS.includes(parsed.pathname))
    );
  });
}

async function cacheRouteDependencies(cache: Cache, response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return;

  const html = await response.text();
  const urls = cacheableAssetUrlsFromHtml(html);
  await Promise.allSettled(
    urls.map(async (url) => {
      const assetResponse = await fetch(url, {
        credentials: "same-origin",
      });
      if (assetResponse.ok) {
        await cache.put(url, assetResponse);
      }
    }),
  );
}

async function preheatOperationalRoutesCache() {
  if (!navigator.onLine || !("caches" in window)) return;

  const cache = await caches.open(OFFLINE_CACHE_NAME);
  await Promise.allSettled(
    [...STATIC_OFFLINE_ASSETS, ...OPERATIONAL_OFFLINE_ROUTES].map(async (route) => {
      const response = await fetch(route, {
        credentials: "same-origin",
      });
      if (!response.ok) return;
      const responseClone = response.clone();
      await cache.put(route, response);
      await cacheRouteDependencies(cache, responseClone);
    }),
  );
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (!ENABLE_SERVICE_WORKER) {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(
            registrations
              .filter((registration) =>
                registration.active?.scriptURL.startsWith(window.location.origin),
              )
              .map((registration) => registration.unregister()),
          ),
        )
        .catch((error) => {
          console.error("Falha ao limpar service worker local:", error);
        });
      return;
    }

    void navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        void registration.update();
        return navigator.serviceWorker.ready;
      })
      .then(() => {
        return preheatOperationalRoutesCache();
      })
      .catch((error) => {
        console.error("Falha ao registrar service worker:", error);
      });
  }, []);

  return null;
}
