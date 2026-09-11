"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export function useSubscribeToPush() {
  const supabase = createClient();
  return useMutation({
    mutationFn: async () => {
      if (!pushSupported()) {
        throw new Error("This browser doesn't support push notifications");
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Notification permission wasn't granted");
      }

      const registration = await navigator.serviceWorker.ready;

      // The browser hangs on to its push subscription even after the push
      // service has expired the endpoint and the server has dropped the row
      // for it. Reusing that object re-registers the same dead endpoint, the
      // next send comes back 410 Gone, the row is deleted again, and turning
      // notifications on never sticks. Always start from a fresh endpoint.
      const existing = await registration.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) throw new Error("Push notifications aren't configured yet");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const json = subscription.toJSON();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: userData.user.id,
          endpoint: json.endpoint!,
          p256dh: json.keys!.p256dh!,
          auth: json.keys!.auth!,
        },
        { onConflict: "endpoint" }
      );
      if (error) throw error;

      return subscription;
    },
  });
}

export function useUnsubscribeFromPush() {
  const supabase = createClient();
  return useMutation({
    mutationFn: async () => {
      if (!pushSupported()) return;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return;
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    },
  });
}
