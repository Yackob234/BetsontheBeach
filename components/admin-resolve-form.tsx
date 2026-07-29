"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Loader2 } from "lucide-react";
import Link from "next/link";

type EventRow = {
  id: number;
  name: string;
  event_date: string | null;
  result: boolean | null;
  status: string | null;
};

export function AdminResolveForm() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedOutcome, setSelectedOutcome] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

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

      const { data, error } = await supabase
        .from("events")
        .select("id,name,event_date,result,status")
        .order("event_date", { ascending: true })
        .gte("event_date", oneWeekAgo.toISOString());

      if (error) {
        setError(error.message);
      } else {
        setEvents(data ?? []);
      }

      setLoading(false);
    };

    void init();
  }, []);

  const pendingEvents = useMemo(() => events.filter((event) => event.result===null && event.status === "open"), [events]);

  const handleResolve = async (eventId: number, outcome: boolean | "canceled") => {
    if (!authorized) return;

    setSubmitting(true);
    setError(null);
    setStatus(null);

    const supabase = createClient();
    if (outcome === "canceled") {
        const { error } = await supabase.rpc("cancel_event", {
        p_event_id: eventId,
        });
        if(error) setError(error.message);
    } else {
        const { error } = await supabase.rpc("resolve_event", {
        p_event_id: eventId,
        p_result: outcome,
        });
        if(error) setError(error.message);
    }

    if (!error) {
      if (outcome === "canceled") {
        setStatus(`Event ${eventId} has been canceled.`);
      } else {
        setStatus(`Resolved event ${eventId} as ${outcome ? "yes" : "no"}.`);
      }
      const { data, error } = await supabase
        .from("events")
        .select("id,name,event_date,result,status")
        .order("event_date", { ascending: true })
        .gte("event_date", oneWeekAgo.toISOString());
      if (error) {
        setError(error.message);
      } else {
        setEvents(data ?? []);
      }
      setEvents(data ?? []);
      setSelectedEventId("");
      setSelectedOutcome("");
    }

    setSubmitting(false);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link 
          href="/admin/create" 
          className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/2 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 transition"
        >
          + Create Event
        </Link>
        <Link 
          href="/admin/notifications" 
          className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/2 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 transition"
        >
          + Create Notification
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Resolve events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose an unresolved event and mark the winning outcome. This uses the database resolver function.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event">Event</Label>
              <select
                id="event"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={selectedEventId}
                onChange={(event) => setSelectedEventId(event.target.value)}
              >
                <option value="">Select an event</option>
                {pendingEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="outcome">Outcome</Label>
              <select
                id="outcome"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={selectedOutcome}
                onChange={(event) => setSelectedOutcome(event.target.value)}
              >
                <option value="">Select outcome</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
                <option value="canceled">Cancel</option>
              </select>
            </div>
          </div>

          <Button
            onClick={() => {
              if (selectedEventId && selectedOutcome) {
                void handleResolve(Number(selectedEventId), selectedOutcome as boolean | "canceled");
              }
            }}
            disabled={submitting || !selectedEventId || !selectedOutcome}
          >
            {submitting ? "Resolving..." : "Resolve event"}
          </Button>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          {status ? <p className="text-sm text-green-600">{status}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent/Pending events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events found.</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{event.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.event_date ? new Date(event.event_date).toLocaleString() : "No date"}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className={`rounded-full px-2 py-1 ${event.result !== null ? "bg-green-500/10 text-green-600" : event.status === "open" ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-600"}`}>
                      {event.result !== null ? "Resolved" : event.status === "open" ? "Open" : "Cancelled"}
                    </p>
                    <p className="mt-1 text-muted-foreground">Outcome: {event.result == null ? '-' : (event.result ? 'Yes' : 'No')}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
