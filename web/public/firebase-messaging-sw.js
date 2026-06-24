/* eslint-disable no-undef */
// Firebase Cloud Messaging — background/closed-tab push handler.
// Service workers can't read Next.js env vars at runtime, so this config is
// inlined directly. These values are PUBLIC (same ones shipped to the
// browser bundle in src/lib/firebase.ts) — safe to commit.
//
// TODO: paste your Firebase Web app config here (Firebase Console >
// Project Settings > General > Your apps > Web app).
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDc3aj_gr1_4sYYzMRctOE8Tp8zULKnbP8",
  authDomain: "smart-wardrobe-ai-cabba.firebaseapp.com",
  projectId: "smart-wardrobe-ai-cabba",
  storageBucket: "smart-wardrobe-ai-cabba.firebasestorage.app",
  messagingSenderId: "757997444095",
  appId: "1:757997444095:web:20d54363defd89b416a5ca",
});

const messaging = firebase.messaging();

// Shows a system notification when a push arrives while the app is closed
// or the tab is in the background. (Foreground messages are handled in
// src/lib/firebase.ts via onMessage instead, to avoid double notifications.)
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "StyleX";
  const options = {
    body: payload.notification?.body ?? "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: payload.data ?? {},
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
