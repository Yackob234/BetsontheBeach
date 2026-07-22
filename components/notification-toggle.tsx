"use client";

import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Bell, BellOff, Loader2 } from "lucide-react";

export function NotificationToggle({ hideIfSubscribed = false }: { hideIfSubscribed?: boolean }) {
  const { supported, subscribed, loading, error, subscribe, unsubscribe } =
    usePushNotifications();

  if (!supported) return null;
  if (hideIfSubscribed && subscribed) return null;

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={loading}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
          subscribed
            ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
            : "border-muted-foreground/20 text-muted-foreground hover:border-primary/50 hover:text-foreground"
        }`}
      >
        {loading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : subscribed ? (
          <Bell size={15} />
        ) : (
          <BellOff size={15} />
        )}
        {subscribed ? "Notifications on" : "Enable notifications"}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}