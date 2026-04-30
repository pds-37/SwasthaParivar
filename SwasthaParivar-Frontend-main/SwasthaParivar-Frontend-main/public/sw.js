const CACHE_NAME = "sp-v4";
const STATIC_ASSETS = [
  "/manifest.json",
  "/swastha_parivar_fast.svg",
  "/icon-health.svg",
  "/notification-icon.png",
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
    // Exclude AI streaming and authentication refresh from caching
    if (event.request.url.includes("/api/ai/") || event.request.url.includes("/auth/refresh")) {
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && event.request.method === "GET") {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          
          return new Response(
            JSON.stringify({
              message: "You are offline. Showing cached data.",
              offline: true,
            }),
            {
              status: 200, // Return 200 so the frontend can handle the 'offline' flag
              headers: { "Content-Type": "application/json" },
            }
          );
        })
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
    icon: "/notification-icon.png",
    badge: "/notification-icon.png",
    vibrate: [200, 100, 200, 100, 200, 100, 400],
    timestamp: Date.now(),
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
