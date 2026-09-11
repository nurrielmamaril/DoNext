// DoNext service worker: enables installability and background push notifications.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Fires when a push notification arrives from the server, even if no tab
// is open (as long as the browser is running).
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "DoNext", body: event.data.text() };
  }

  const title = payload.title || "DoNext";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: payload.url || "/dashboard" },
    // Stay on screen until it is dealt with, rather than sliding away after a
    // few seconds — a reminder you missed is a reminder that did not work.
    requireInteraction: true,
    // Tagged per task, so a repeat for the same task replaces its own toast
    // (and still chimes) while two different tasks coming due together each
    // get their own.
    tag: payload.tag || "donext-reminder",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Focuses an existing DoNext tab if one is open, otherwise opens a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
