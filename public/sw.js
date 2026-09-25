const CACHE_NAME = "garden-shell-v1";
const APP_SHELL = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icon.svg",
  "/apple-icon.svg",
  "/icon-192.png",
  "/icon-512.png",
];

function isCacheableAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/") || APP_SHELL.includes(url.pathname))
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }

          return Promise.resolve(false);
        }),
      ),
    ),
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  if (event.request.method !== "GET") {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/offline.html")),
    );

    return;
  }

  if (!isCacheableAsset(requestUrl)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedMatch = await cache.match(event.request);

      if (cachedMatch) {
        return cachedMatch;
      }

      const response = await fetch(event.request);

      if (response.ok) {
        cache.put(event.request, response.clone());
      }

      return response;
    }),
  );
});
