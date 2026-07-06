const CACHE_NAME = "andcheck-offline-v2";
const OFFLINE_URL = "/offline.html";
const ASSET_DESTINATIONS = new Set(["script", "style", "font", "image"]);
const NAVIGATION_CACHE_PATHS = new Set(["/sincronizacao"]);

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

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL])),
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
          if (
            response.ok &&
            requestUrl.origin === self.location.origin &&
            NAVIGATION_CACHE_PATHS.has(requestUrl.pathname)
          ) {
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
  if (
    requestUrl.origin !== self.location.origin ||
    !ASSET_DESTINATIONS.has(request.destination)
  ) {
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
        .catch(() => cached || Response.error());

      return cached || networkFetch;
    }),
  );
});
