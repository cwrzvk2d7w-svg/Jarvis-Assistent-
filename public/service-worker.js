
const CACHE_NAME = "jarvis-v1";

const APP_FILES = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(APP_FILES)
    )
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  // KI-Anfragen niemals aus dem Cache beantworten
  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(request);

      if (cached) return cached;

      if (request.mode === "navigate") {
        return caches.match("/");
      }

      return new Response("Offline – Verbindung nicht verfügbar.", {
        status: 503
      });
    })
  );
});
