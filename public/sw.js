// Bump CACHE + the ?v= on icon URLs together whenever icons change. A new
// CACHE name forces this SW to reinstall and purge the stale precache; the
// new ?v= makes it fetch the fresh icon bytes. Keep ?v= in sync with
// src/app/manifest.ts.
const CACHE = "ssm-v3";
const PRECACHE = ["/offline.html", "/icons/icon-192.png?v=3", "/icons/icon-512.png?v=3"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Page navigations: network-first with an offline fallback. Static assets are
// left to the browser's HTTP cache (Next sets immutable headers).
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.mode !== "navigate") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/auth") || url.pathname.startsWith("/auth")) return;

  event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
});

// Web Push: show the notification.
self.addEventListener("push", (event) => {
  let payload = { title: "Strativ Games", body: "", url: "/" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png?v=3",
      badge: "/icons/icon-192.png?v=3",
      data: { url: payload.url || "/" },
      tag: payload.tag || undefined,
    }),
  );
});

// Focus an existing tab or open the target URL when a notification is clicked.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
