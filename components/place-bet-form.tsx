"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CommentsList } from './comments-list';
import { Button } from '@/components/ui/button';

export default function PlaceBetForm() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      setLoading(true);
      try {
        // Get current time in EST
        const nowEST = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
        const estDate = new Date(nowEST)

        // Set cutoff to 6pm EST today
        const cutoff = new Date(nowEST)
        cutoff.setHours(18, 0, 0, 0)

        // If before 6pm EST, include today's events, otherwise only future dates
        const cutoffISO = estDate < cutoff
          ? estDate.toISOString().slice(0, 10)   // include today
          : new Date(cutoff.setDate(cutoff.getDate() + 1)).toISOString().slice(0, 10) // exclude today

        const { data, error } = await supabase
          .from('events')
          .select('id, name, event_date, starting_odds, volume')
          .gte('event_date', cutoffISO)
          .order('event_date', { ascending: true })
          .limit(50);

        if (error) {
          console.error('Error fetching events:', error);
          setEvents([]);
        } else {
          setEvents(data ?? []);
        }
      } catch (e) {
        console.error('Exception fetching events:', e);
        setEvents([]);
      } finally {
        setLoading(false);
      }
      console.log('events', events);
    }

    load();
  }, []);

  async function placeBet() {
    setMessage(null);
    if (!selected) return setMessage('Select an event');
    const amt = Number(amount);
    if (!amt || amt <= 0) return setMessage('Enter a valid amount');

    setPlacing(true);
    const supabase = createClient();

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const { data: walletData } = await supabase.from('wallet').select('balance').eq('user_id', userId).single();
      const balance = Number(walletData?.balance ?? 0);
      if (amt > balance) throw new Error('Insufficient balance');

      const payload: any = [{ event: selected.id, odds: selected.starting_odds ?? 0.5, amount: amt, user_id: userId }];
      if (typeof selected._choice !== 'undefined') {
        // store user's side as `choice` boolean (true = for, false = against)
        payload[0].pick = selected._choice;
      }

      const { data: insertData, error: insertError } = await supabase.from('bets').insert(payload);
      if (insertError) throw insertError;

      await supabase.from('wallet').update({ balance: balance - amt }).eq('user_id', userId);

      setMessage('Bet placed successfully');
      setAmount('');
      setSelected(null);
    } catch (err: any) {
      setMessage(err?.message ?? 'Error placing bet');
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading events…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Events grid */}
      <div>
        {/* <h3 className="text-sm font-medium mb-3">Available Events</h3> */}
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {events.map((ev) => (
              <div
                key={ev.id}
                onClick={() => setSelected(ev)}
                className={`p-4 rounded-lg border cursor-pointer transition ${
                  selected?.id === ev.id
                    ? 'border-primary bg-primary/10'
                    : 'border-muted-foreground/20 hover:border-primary/50'
                }`}
              >
                <div className="font-semibold">{ev.name ?? `Event ${ev.id}`}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Odds: <span className="font-medium text-foreground">{(ev.starting_odds * 100).toFixed(0)}%</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Volume: <span className="font-medium">{ev.volume ? ev.volume - 1000 : 0}</span></div>
                {ev.event_date && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {ev.event_date}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bet form */}
      {selected && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/50">
          <div>
            <p className="text-sm font-medium">Betting on: {selected.name ?? `Event ${selected.id}`}</p>
            <p className="text-xs text-muted-foreground">Odds: {(selected.starting_odds * 100).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Volume: {selected.volume ? selected.volume - 1000 : 0}</p>
          </div>

          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium">Side</label>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setSelected({ ...selected, _choice: true })}
                variant={selected?._choice === true ? 'default' : 'outline'}
                disabled={placing}
                type="button"
                size="sm"
              >
                Over
              </Button>
              <Button
                onClick={() => setSelected({ ...selected, _choice: false })}
                variant={selected?._choice === false ? 'default' : 'outline'}
                disabled={placing}
                type="button"
                size="sm"
              >
                Under
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border rounded p-2 mt-1"
              placeholder="Enter amount"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={placeBet}
              className="flex-1"
              disabled={placing}
            >
              {placing ? 'Placing…' : 'Place Bet'}
            </Button>
            <Button
              onClick={() => setSelected(null)}
              variant="outline"
              disabled={placing}
            >
              Cancel
            </Button>
          </div>

          {message && (
            <div className={`text-sm p-2 rounded ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message}
            </div>
          )}

          {/* Comments section */}
          <CommentsList eventId={selected.id} />
        </div>
      )}
    </div>
  );
}

