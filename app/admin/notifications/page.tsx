"use client";

import { useState } from "react";
import { Bell, Loader2, Send } from "lucide-react";

const QUICK_MESSAGES = [
  { title: "🎲 Bets are live!", body: "Events are open, place your bets!" },
  { title: "⏰ Closing soon", body: "Events are closing soon. Get your bets in!" },
];

export default function SendNotificationPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/betting");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyQuick = (msg: { title: string; body: string }) => {
    setTitle(msg.title);
    setBody(msg.body);
    setResult(null);
    setError(null);
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setError(null);
    setResult(null);

    const res = await fetch("/api/send-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, url }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
    } else {
      setResult(data);
    }
    setSending(false);
  };

  return (
    <div className="max-w-xl w-full mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Send Notification</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Push a message to all subscribed users.
        </p>
      </div>

      {/* Quick messages */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Quick messages</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {QUICK_MESSAGES.map((msg) => (
            <button
              key={msg.title}
              onClick={() => applyQuick(msg)}
              className="text-left rounded-lg border border-muted-foreground/20 px-3 py-2.5 hover:border-primary/50 hover:bg-primary/5 transition"
            >
              <p className="text-sm font-medium">{msg.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{msg.body}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-muted-foreground/10" />

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder="e.g. 🎲 Bets are live!"
          className="w-full rounded-lg border border-muted-foreground/20 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Body */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Message</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="e.g. New events are open — place your bets now."
          className="w-full rounded-lg border border-muted-foreground/20 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        <span className="text-xs text-muted-foreground text-right">{body.length}/200</span>
      </div>

      {/* URL */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Link when tapped</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="/betting"
          className="w-full rounded-lg border border-muted-foreground/20 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Preview */}
      {(title || body) && (
        <div className="rounded-lg border border-muted-foreground/20 bg-muted/30 p-4 flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-primary/10 p-1.5">
            <Bell size={14} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{title || "Title"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{body || "Message body"}</p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2">
          {error}
        </p>
      )}

      {result && (
        <p className="text-sm text-green-600 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
          Sent to {result.sent} device{result.sent !== 1 ? "s" : ""}.
          {result.failed > 0 && ` ${result.failed} failed (stale subscriptions).`}
        </p>
      )}

      <button
        onClick={handleSend}
        disabled={sending || !title.trim() || !body.trim()}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
      >
        {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        {sending ? "Sending..." : "Send to all users"}
      </button>
    </div>
  );
}