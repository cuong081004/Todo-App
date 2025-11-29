// src/sw.js - Simple Service Worker (Không dùng Workbox) - ĐÃ SỬA LỖI ESLINT
console.log('🔧 Simple Service Worker loaded!');

self.addEventListener('install', () => {
  console.log('🚀 SW installed - Simple Version');
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  console.log('🔧 SW activated - Simple Version');
  self.clients.claim();
});

// QUAN TRỌNG: Xử lý push event
self.addEventListener('push', (event) => {
  console.log('📬 PUSH EVENT RECEIVED - Simple SW!');
  
  if (!event.data) {
    console.log('❌ No data in push event');
    return;
  }

  let payload;
  try {
    payload = event.data.json();
    console.log('✅ Push data parsed as JSON:', payload);
  } catch {
    try {
      const text = event.data.text();
      payload = JSON.parse(text);
      console.log('✅ Push data parsed as text:', payload);
    } catch {
      console.error('❌ Failed to parse push data');
      payload = {
        title: 'Thông báo',
        body: 'Có thông báo mới',
        data: {}
      };
    }
  }

  const title = payload.title || 'Thông báo';
  const options = {
    body: payload.body || '',
    icon: '/icons/pwa-192.png',
    badge: '/icons/pwa-192.png',
    data: payload.data || {},
    vibrate: [200, 100, 200],
    tag: 'todo-notification',
    requireInteraction: false
  };

  console.log('🎯 Showing notification:', title);

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        console.log('✅ NOTIFICATION SHOWN SUCCESSFULLY!');
      })
      .catch(error => {
        console.error('❌ FAILED TO SHOW NOTIFICATION:', error);
      })
  );
});

// Xử lý click notification
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked:', event.notification.data);
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('/') && 'focus' in client) {
            console.log('🎯 Focusing existing client');
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          console.log('🪟 Opening new window');
          return self.clients.openWindow('/');
        }
      })
  );
});

// Xử lý message từ client
self.addEventListener('message', (event) => {
  console.log('📨 SW received message:', event.data);
  
  if (event.data && event.data.type === 'test-notification') {
    console.log('🧪 Test notification requested');
    self.registration.showNotification('🔔 TEST từ Simple SW', {
      body: 'Simple Service Worker đang hoạt động!',
      icon: '/icons/pwa-192.png',
      badge: '/icons/pwa-192.png'
    });
  }
});