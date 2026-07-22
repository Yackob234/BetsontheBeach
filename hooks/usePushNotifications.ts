"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setSupported(false);
        setLoading(false);
        return;
      }
      setSupported(true);

      const reg = await navigator.serviceWorker.register("/service-worker.js");
      const existing = await reg.pushManager.getSubscription();
      setSubscribed(!!existing);
      setLoading(false);
    };
    void check();
  }, []);

  const subscribe = async () => {
    setError(null);
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notification permission denied.");
        setLoading(false);
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { error: dbError } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("subscription->>endpoint", sub.endpoint);

      if (!dbError) {
        await supabase.from("push_subscriptions").insert({
          user_id: user.id,
          subscription: sub.toJSON(),
        });
      }

      if (dbError) throw new Error(dbError.message);
      setSubscribed(true);
      } catch (err: any) {
        setError(err.message ?? "Failed to subscribe. (Brave browser users may need to enable notifications in settings.)");
      }
    setLoading(false);
  };

  const unsubscribe = async () => {
    setError(null);
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();

        const supabase = createClient();
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("subscription->>endpoint", endpoint);
      }
      setSubscribed(false);
    } catch (err: any) {
        setError(err.message ?? "Failed to subscribe.");
      }
    setLoading(false);
  };

  return { supported, subscribed, loading, error, subscribe, unsubscribe };
}