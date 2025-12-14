// ============================================
// SERVICE WORKER với Workbox injectManifest
// ============================================
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

console.log("🔧 Custom Service Worker with Workbox Loaded");

// ============================================
// 1. PRECACHE - Workbox sẽ inject manifest tại đây
// ============================================
// @ts-ignore
precacheAndRoute(self.__WB_MANIFEST);

// Cleanup old caches
cleanupOutdatedCaches();

// ============================================
// 2. RUNTIME CACHING - API calls
// ============================================
registerRoute(
  ({ url }) => url.origin === 'https://todo-app-t1g9.onrender.com' && url.pathname.startsWith('/api'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// ============================================
// 3. GOOGLE FONTS CACHING
// ============================================
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
      }),
    ],
  })
);

// ============================================
// 4. PUSH NOTIFICATIONS
// ============================================
self.addEventListener("push", (event) => {
  console.log("📬 PUSH EVENT RECEIVED");

  if (!event.data) {
    console.log("❌ No data in push event");
    return;
  }

  let payload;
  try {
    payload = event.data.json();
    console.log("✅ JSON payload:", payload);
  } catch {
    try {
      const text = event.data.text();
      payload = JSON.parse(text);
      console.log("✅ Text payload:", payload);
    } catch (err) {
      console.error("❌ Failed to parse push data:", err);
      payload = {
        title: "Thông báo",
        body: "Bạn có thông báo mới",
        data: {}
      };
    }
  }

  const title = payload.title || "Thông báo";
  const options = {
    body: payload.body || "",
    icon: "/icons/pwa-192.png",
    badge: "/icons/pwa-192.png",
    data: payload.data || {},
    tag: "todo-notification",
    vibrate: [200, 100, 200],
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      console.log("🔔 Notification shown");
    })
  );
});

// ============================================
// 5. NOTIFICATION CLICK
// ============================================
self.addEventListener("notificationclick", (event) => {
  console.log("🖱 Notification clicked:", event.notification.data);
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow("/");
        }
      })
  );
});

// ============================================
// 6. MESSAGE FROM CLIENT
// ============================================
self.addEventListener("message", (event) => {
  console.log("📨 SW Message Received:", event.data);

  if (event.data?.type === "test-notification") {
    event.waitUntil(
      self.registration.showNotification("🔔 Test thông báo", {
        body: "Service Worker hoạt động tốt!",
        icon: "/icons/pwa-192.png",
        badge: "/icons/pwa-192.png",
      })
    );
  }

  // SKIP_WAITING - force activate new SW immediately
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ============================================
// 7. INSTALL & ACTIVATE
// ============================================
self.addEventListener("install", () => {
  console.log("🚀 SW Installing...");
  self.skipWaiting(); // Force activate immediately
});

self.addEventListener("activate", (event) => {
  console.log("🔧 SW Activated");
  event.waitUntil(
    // Take control of all pages immediately
    self.clients.claim()
  );
});