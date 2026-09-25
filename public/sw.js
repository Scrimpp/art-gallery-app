const CACHE_NAME = "garden-shell-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icon.svg", "/apple-icon.svg"];

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
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cachedMatch = await caches.match(event.request);

      if (cachedMatch) {
        return cachedMatch;
      }

      if (event.request.mode === "navigate") {
        return caches.match("/");
      }

      throw new Error("Network unavailable and no cached response was found.");
    }),
  );
});
