// =============================================================
// Service Worker — Browser Push Notifications (SLC-418)
// =============================================================
// Handles push events and notification clicks for meeting reminders.
// Registered from the Settings page when user enables push.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "StrategAIze", body: event.data.text() };
  }

  const title = payload.title || "StrategAIze";
  const options = {
    body: payload.body || "",
    icon: "/brand/logo-symbol.png",
    badge: "/brand/logo-symbol.png",
    tag: payload.tag || "meeting-reminder",
    data: {
      url: payload.url || "/",
    },
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if open
      for (const client of windowClients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      // Open new tab
      return clients.openWindow(url);
    })
  );
});
