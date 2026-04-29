const CACHE_NAME = "sp-v3";
const STATIC_ASSETS = [
  "/manifest.json",
  "/swastha_parivar_fast.svg",
  "/icon-health.svg",
];

const isCacheableAssetRequest = (request) => {
  if (request.method !== "GET") {
    return false;
  }

  const url = new URL(request.url);
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/assets/") ||
      ["style", "script", "worker", "image", "font"].includes(request.destination))
  );
};

const shouldCacheResponse = (response) => {
  const contentType = response?.headers?.get("content-type") || "";
  return Boolean(response?.ok) && !contentType.includes("text/html");
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
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

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", cloned));
          return response;
        })
        .catch(async () => {
          const cachedShell = await caches.match("/index.html");
          return (
            cachedShell ||
            new Response("Offline", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        })
    );
    return;
  }

  if (!isCacheableAssetRequest(event.request)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      if (cached) {
        return cached;
      }

      const response = await fetch(event.request);
      if (shouldCacheResponse(response)) {
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
      }
      return response;
    })
  );
});

self.addEventListener("push", (event) => {
  let data = {
    title: "SwasthaParivar",
    body: "You have a new health notification.",
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    data.body = event.data.text() || data.body;
  }

  const options = {
    body: data.body,
    icon: "/swastha_parivar_fast.svg",
    badge: "/swastha_parivar_fast.svg",
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    renotify: true,
    tag: data.tag || "sp-notification-" + (data.id || "default"),
    image: data.image || null,
    data: data.data || { url: data.url || "/reminders" },
    actions: data.actions || [
      { action: "view", title: "View details" },
      { action: "dismiss", title: "Dismiss" }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = new URL(
    event.notification.data?.url || event.notification.data?.data?.url || "/reminders",
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
