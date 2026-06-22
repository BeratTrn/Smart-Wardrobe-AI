"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
} from "firebase/messaging";

/**
 * Firebase Web config — these values are PUBLIC (safe to ship to the
 * browser, same as the mobile app's google-services.json). They come from
 * Firebase Console > Project Settings > General > Your apps > Web app.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

function isConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

function getFirebaseApp(): FirebaseApp | null {
  if (!isConfigured()) return null;
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

let messagingPromise: Promise<Messaging | null> | null = null;

async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  if (!messagingPromise) {
    messagingPromise = (async () => {
      const app = getFirebaseApp();
      if (!app) return null;
      const supported = await isSupported().catch(() => false);
      if (!supported) return null;
      return getMessaging(app);
    })();
  }
  return messagingPromise;
}

export type NotificationPermissionResult =
  | { ok: true; token: string }
  | { ok: false; reason: "unsupported" | "denied" | "not-configured" | "error" };

/**
 * Asks the browser for notification permission (if not already decided),
 * registers the Firebase Messaging service worker, and returns an FCM
 * registration token for this browser/device. Call `saveFcmToken` (in
 * lib/api/users.ts) with the result to attach it to the signed-in user.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionResult> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { ok: false, reason: "unsupported" };
  }
  if (!isConfigured()) {
    return { ok: false, reason: "not-configured" };
  }

  try {
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      return { ok: false, reason: "denied" };
    }

    const messaging = await getMessagingInstance();
    if (!messaging) return { ok: false, reason: "unsupported" };

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) return { ok: false, reason: "error" };
    return { ok: true, token };
  } catch (err) {
    console.error("Bildirim izni/token alınamadı:", err);
    return { ok: false, reason: "error" };
  }
}

/** Current (already-decided) browser permission state, without prompting. */
export function getNotificationPermissionState(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/**
 * Silently re-registers the FCM token if permission was already granted in
 * a previous visit — keeps the token fresh without prompting the user again.
 */
export async function refreshTokenIfPermitted(): Promise<NotificationPermissionResult | null> {
  if (getNotificationPermissionState() !== "granted") return null;
  return requestNotificationPermission();
}

/** Foreground message listener — fires while the tab is open/focused. */
export async function listenForForegroundMessages(
  onMessageReceived: (payload: { title?: string; body?: string }) => void
): Promise<() => void> {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  const unsubscribe = onMessage(messaging, (payload) => {
    onMessageReceived({
      title: payload.notification?.title,
      body: payload.notification?.body,
    });
  });
  return unsubscribe;
}
