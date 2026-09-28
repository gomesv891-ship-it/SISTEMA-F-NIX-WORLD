// Service Worker para Notificações do Sistema Fênix World
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetTab = event.notification.data?.targetTab;
  const metadata = event.notification.data?.metadata;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if (targetTab) {
            client.postMessage({
              type: 'fenix_open_tab',
              tab: targetTab,
              metadata: metadata,
            });
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
