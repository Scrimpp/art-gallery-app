const CACHE_NAME = "garden-shell-v1";
const NAVIGATION_CACHE_NAME = "garden-pages-v1";
const APP_SHELL = [
  "/app-shell.html",
  "/offline.html",
  "/icon.svg",
  "/apple-icon.svg",
  "/icon-192.png",
  "/icon-512.png",
];

function isCacheableAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") || APP_SHELL.includes(url.pathname))
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(APP_SHELL.map((asset) => cache.add(asset))),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== NAVIGATION_CACHE_NAME) {
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
      caches.open(NAVIGATION_CACHE_NAME).then(async (cache) => {
        try {
          const response = await fetch(event.request);
          const cacheControl = response.headers.get("cache-control") ?? "";

          if (
            response.ok &&
            !cacheControl.includes("no-store") &&
            !cacheControl.includes("private") &&
            !response.headers.has("set-cookie")
          ) {
            cache.put(event.request, response.clone());
          }

          return response;
        } catch {
          const cachedPage = await cache.match(event.request);

          if (cachedPage) {
            return cachedPage;
          }

          const appShell = await caches.match("/app-shell.html");

          if (appShell) {
            return appShell;
          }

          return caches.match("/offline.html");
        }
      }),
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

      try {
        const response = await fetch(event.request);

        if (response.ok) {
          cache.put(event.request, response.clone());
        }

        return response;
      } catch (error) {
        if (cachedMatch) {
          return cachedMatch;
        }

        throw error;
      }
    }),
  );
});
