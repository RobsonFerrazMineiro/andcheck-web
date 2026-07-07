const CACHE_NAME = "andcheck-offline-v5";
const OFFLINE_URL = "/offline.html";
const ASSET_DESTINATIONS = new Set(["script", "style", "font", "image"]);
const STATIC_CACHE_PATHS = [OFFLINE_URL, "/favicon.ico", "/manifest.webmanifest"];
const NAVIGATION_CACHE_PATHS = new Set([
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
]);

function matchOfflineNavigation(request) {
  const requestUrl = new URL(request.url);

  return caches
    .match(request)
    .then(
      (cached) =>
        cached ||
        caches.match(requestUrl.pathname).then((pathCached) => pathCached),
    )
    .then((cached) => cached || caches.match(OFFLINE_URL));
}

function shouldCacheNavigation(requestUrl) {
  return (
    requestUrl.origin === self.location.origin &&
    NAVIGATION_CACHE_PATHS.has(requestUrl.pathname)
  );
}

function shouldHandleAsset(request, requestUrl) {
  if (requestUrl.origin !== self.location.origin) return false;
  if (requestUrl.pathname.includes("webpack-hmr")) return false;
  return (
    ASSET_DESTINATIONS.has(request.destination) ||
    requestUrl.pathname.startsWith("/_next/")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_CACHE_PATHS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const requestUrl = new URL(request.url);
          if (response.ok && shouldCacheNavigation(requestUrl)) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => matchOfflineNavigation(request)),
    );
    return;
  }

  const requestUrl = new URL(request.url);
  if (!shouldHandleAsset(request, requestUrl)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          if (cached) return cached;
          if (request.destination === "image") {
            return new Response(null, { status: 204 });
          }
          return new Response(null, { status: 503 });
        });

      return cached || networkFetch;
    }),
  );
});
