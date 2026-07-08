"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ShieldAlert } from "lucide-react";

const TEAM_MEMBERS = [
  "team",
  "test",
  "jacob",
  "katie",
  "riley",
  "samson",
  "enika",
  "ryan",
  "montana",
  "nic",
];

function getNextMonday(): string {
  const today = new Date();
  const day = today.getDay();
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);

  const yyyy = nextMonday.getFullYear();
  const mm = String(nextMonday.getMonth() + 1).padStart(2, "0");
  const dd = String(nextMonday.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CreateEventPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [odds, setOdds] = useState(0.5);
  const [eventDate, setEventDate] = useState(getNextMonday());
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.id) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase.from("profiles").select("is_admin").eq("user_id", user?.id).single();

      console.log("Profile data:", profileData);
      const isAllowed = profileData?.is_admin;
      setAuthorized(isAllowed);

      if (!isAllowed) {
        setLoading(false);
        return;
      }

      setLoading(false);
    };

    void init();
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Event name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.from("events").insert({
      name: name.trim(),
      description: description.trim() || null,
      starting_odds: odds,
      event_date: eventDate,
      result: null,
      volume: 1000,
      tags: selectedTags.length > 0 ? selectedTags : null,
      status: "open",
    });

    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
    setName("");
    setDescription("");
    setOdds(0.5);
    setEventDate(getNextMonday());
    setSelectedTags([]);
    setTimeout(() => setSuccess(false), 1200);
    // setTimeout(() => router.push("/admin"), 1200);
  }; 
  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Checking access...
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
        <div className="flex items-center gap-2 text-amber-600">
          <ShieldAlert className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Access denied</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Your account is not on the admin whitelist.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl w-full mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Create Event</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add a new betting event for the group.
        </p>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Event Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          placeholder="e.g. Will it rain on Friday?"
          className="w-full rounded-lg border border-muted-foreground/20 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <span className="text-xs text-muted-foreground text-right">
          {name.length}/120
        </span>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">
          Description{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder="Any extra context for bettors..."
          className="w-full rounded-lg border border-muted-foreground/20 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        <span className="text-xs text-muted-foreground text-right">
          {description.length}/300
        </span>
      </div>

      {/* Event Date */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Event Date</label>
        <input
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          className="w-full rounded-lg border border-muted-foreground/20 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Odds Slider */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">
          Starting Odds —{" "}
          <span className="text-primary font-semibold">
            {(odds * 100).toFixed(0)}%
          </span>
        </label>
        <input
          type="range"
          min={0.01}
          max={0.99}
          step={0.01}
          value={odds}
          onChange={(e) => setOdds(parseFloat(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1% (unlikely)</span>
          <span>50% (even)</span>
          <span>99% (likely)</span>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">
          Tags{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {TEAM_MEMBERS.map((member) => {
            const selected = selectedTags.includes(member);
            return (
              <button
                key={member}
                onClick={() => toggleTag(member)}
                className={`px-3 py-1 rounded-full text-sm border transition ${
                  selected
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-muted-foreground/20 hover:border-primary/50 text-muted-foreground"
                }`}
              >
                {member}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-muted-foreground/10 bg-muted/30 px-4 py-3 text-xs text-muted-foreground flex flex-col gap-1">
        <span>
          <span className="font-medium text-foreground">Volume:</span> 1000
          (default)
        </span>
        <span>
          <span className="font-medium text-foreground">Status:</span> open
        </span>
        <span>
          <span className="font-medium text-foreground">Result:</span> set on
          resolution
        </span>
      </div>

      {error && (
        <p className="text-sm text-destructive rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2">
          {error}
        </p>
      )}

      {success && (
        <p className="text-sm text-green-600 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
          Event created!
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || success}
        className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
      >
        {submitting ? "Creating..." : "Create Event"}
      </button>
    </div>
  );
}