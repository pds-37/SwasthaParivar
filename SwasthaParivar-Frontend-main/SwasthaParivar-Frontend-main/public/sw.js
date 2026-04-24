const CACHE_NAME = "sp-v2";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/swastha_parivar_fast.svg",
  "/icon-health.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  if (event.request.url.includes("/api/")) {
    event.respondWith(
      fetch(event.request).catch(
        () =>
          new Response(
            JSON.stringify({
              message: "You are offline. Please check your connection.",
            }),
            {
              status: 503,
              headers: {
                "Content-Type": "application/json",
              },
            }
          )
      )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          return response;
        })
    )
  );
});

self.addEventListener("push", (event) => {
  const data = event.data?.json?.() || {
    title: "SwasthaParivar",
    body: "You have a new health notification.",
  };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/swastha_parivar_fast.svg",
      badge: "/swastha_parivar_fast.svg",
      vibrate: [200, 100, 200],
      data: data.data || { url: "/reminders" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/reminders";
  event.waitUntil(self.clients.openWindow(targetUrl));
});
