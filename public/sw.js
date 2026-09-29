// Service worker for Web Push (lib/push-client.ts registers it). It only
// shows notifications and opens the channel when one is clicked.

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Share', {
      body: data.body,
      tag: data.tag,
      icon: '/icons/icon-192.png',
      data: { url: data.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Only ever open pages of this site.
  const url = new URL(event.notification.data?.url || '/', self.location.origin);
  if (url.origin !== self.location.origin) {
    return;
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).pathname === url.pathname);
      return open ? open.focus() : self.clients.openWindow(url.href);
    }),
  );
});
