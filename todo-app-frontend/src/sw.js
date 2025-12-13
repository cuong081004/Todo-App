console.log("🔧 Service Worker Loaded");

// ---------------- INSTALL ----------------
self.addEventListener("install", () => {
  console.log("🚀 SW Installed");
  self.skipWaiting();
});

// ---------------- ACTIVATE ----------------
self.addEventListener("activate", () => {
  console.log("🔧 SW Activated");
  self.clients.claim();
});

// ---------------- PUSH EVENT ----------------
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

// ---------------- NOTIFICATION CLICK ----------------
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

// ---------------- MESSAGE FROM CLIENT ----------------
self.addEventListener("message", (msg) => {
  console.log("📨 SW Message Received:", msg.data);

  if (msg.data?.type === "test-notification") {
    self.registration.showNotification("🔔 Test thông báo", {
      body: "Service Worker hoạt động tốt!",
      icon: "/icons/pwa-192.png",
      badge: "/icons/pwa-192.png",
    });
  }
});
