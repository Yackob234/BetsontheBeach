"use client";

import React, { useEffect, useState, useCallback } from 'react';
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
  const [isDesktop, setIsDesktop] = useState(false);
  const [commentCounts, setCommentCounts] = useState<Record<number, number>>({});
  const [betComment, setBetComment] = useState("");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      // Get current time in EST
      const nowEST = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
      const estDate = new Date(nowEST);

      // Set cutoff to 6pm EST today
      const cutoff = new Date(nowEST);
      cutoff.setHours(18, 0, 0, 0);

      // If before 6pm EST, include today's events, otherwise only future dates
      const cutoffISO = estDate < cutoff
        ? estDate.toISOString().slice(0, 10) // include today
        : new Date(cutoff.setDate(cutoff.getDate() + 1)).toISOString().slice(0, 10); // exclude today

      let query = supabase
        .from('events')
        .select('id, name, event_date, starting_odds, volume, tags, status')
        .gte('event_date', cutoffISO)
        .order('event_date', { ascending: true })
        .limit(50)

      // Filter out test events in production
      if (process.env.NODE_ENV === 'production') {
        query = query.not('tags', 'cs', '["test"]')
      }
      query = query.neq('status', 'cancelled')

      const { data, error } = await query

      if (error) {
        console.error('Error fetching events:', error);
        setEvents([]);
        return [];
      }
      // Fetch comment counts for all events
      if (data && data.length > 0) {
        const eventIds = data.map((e: any) => e.id);
        const { data: commentsData } = await supabase
          .from('comments')
          .select('event_id', { count: 'exact', head: true })
          .in('event_id', eventIds);
        
        // Count comments per event
        const counts: Record<number, number> = {};
        const { data: allComments } = await supabase
          .from('comments')
          .select('event_id')
          .in('event_id', eventIds);
        
        (allComments ?? []).forEach((c: any) => {
          counts[c.event_id] = (counts[c.event_id] || 0) + 1;
        });
        
        setCommentCounts(counts);
      }

      setEvents(data ?? []);
      return data ?? [];
    } catch (e) {
      console.error('Exception fetching events:', e);
      setEvents([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(min-width: 768px)') : null;
    if (!mq) return;
    const set = (val: boolean) => setIsDesktop(val);
    set(mq.matches);
    const handler = (e: MediaQueryListEvent) => set(e.matches);
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler as any);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler as any);
    };
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

      const { data: insertData, error: insertError } = await supabase
        .from('bets')
        .insert(payload)
        .select()
        .single()
      if (insertError) throw insertError;

      await supabase.from('wallet').update({ balance: balance - amt }).eq('user_id', userId);

      // Insert mandatory comment linked to bet
      const { error: commentError } = await supabase.from('comments').insert({
        event_id: selected.id,
        user_id: userId,
        content: betComment.trim(),
        is_bet_comment: true,
        bet_id: insertData.id,
        bet_pick: selected._choice,
        bet_amount: amt,
      })

      if (commentError) throw commentError

      // Reset comment after successful bet
      setBetComment("")

      setMessage('Bet placed successfully');
      setAmount('');

      // Reload events so volume/aggregates update and reflect the new bet
      const newEvents = await loadEvents();
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
            {isDesktop ? (
              (() => {
                const nodes: React.ReactNode[] = [];
                for (let i = 0; i < events.length; i += 2) {
                  const a = events[i];
                  const b = events[i + 1];

                  nodes.push(
                    <React.Fragment key={`row-${i}`}>
                      <div
                        onClick={() => {
                          setAmount('');
                          setMessage(null);
                          setBetComment("");
                          setSelected(a);
                        }}
                        className={`relative w-full min-w-0 p-4 rounded-lg border cursor-pointer transition ${
                          selected?.id === a.id
                            ? 'border-primary bg-primary/10'
                            : 'border-muted-foreground/20 hover:border-primary/50'
                        }`}
                      >
                        {/* Comment count badge */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          </svg>
                          <span>{commentCounts[a.id] ?? 0}</span>
                        </div>

                        <div className="font-semibold">{a.name ?? `Event ${a.id}`}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Odds: <span className="font-medium text-foreground">{(a.starting_odds * 100).toFixed(0)}%</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Volume: <span className="font-medium">{a.volume ? a.volume - 1000 : 0}</span></div>
                        {a.event_date && <div className="text-xs text-muted-foreground mt-1">{a.event_date}</div>}
                      </div>

                      {b ? (
                        <div
                          onClick={() => {
                            setAmount('');
                            setMessage(null);
                            setBetComment("");
                            setSelected(b);
                          }}
                          className={`relative w-full min-w-0 p-4 rounded-lg border cursor-pointer transition ${
                            selected?.id === b.id
                              ? 'border-primary bg-primary/10'
                              : 'border-muted-foreground/20 hover:border-primary/50'
                          }`}
                        >
                          {/* Comment count badge */}
                          <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                            <span>{commentCounts[b.id] ?? 0}</span>
                          </div>
                          <div className="font-semibold">{b.name ?? `Event ${b.id}`}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Odds: <span className="font-medium text-foreground">{(b.starting_odds * 100).toFixed(0)}%</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Volume: <span className="font-medium">{b.volume ? b.volume - 1000 : 0}</span></div>
                          {b.event_date && <div className="text-xs text-muted-foreground mt-1">{b.event_date}</div>}
                        </div>
                      ) : (
                        <div />
                      )}

                      {
                        // If the selected event is in this row, render the widget after the row
                        selected && (selected.id === a.id || (b && selected.id === b.id)) && (
                          <div key={`widget-${selected.id}`} className="md:col-span-2 w-full min-w-0 rounded-lg border p-4 space-y-3 bg-muted/50 mt-3">
                            <div>
                              <p className="text-sm font-medium">Betting on: {selected.name ?? `Event ${selected.id}`}</p>
                              <p className="text-xs text-muted-foreground">Odds: {(selected.starting_odds * 100).toFixed(0)}%</p>
                              <p className="text-xs text-muted-foreground">Volume: {selected.volume ? selected.volume - 1000 : 0}</p>
                            </div>

                            <div className="flex gap-2 items-center">
                              <label className="text-sm font-medium">Side:</label>
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

                            <div>
                              <label className="text-sm font-medium">
                                Comment <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={betComment}
                                onChange={(e) => setBetComment(e.target.value)}
                                placeholder="You must say something about your bet..."
                                disabled={placing}
                                className="w-full border rounded p-2 mt-1 text-sm resize-none bg-background text-foreground"
                                rows={2}
                              />
                            </div>

                            <div className="flex gap-2">
                              <Button 
                                onClick={placeBet} 
                                className="flex-1" 
                                disabled={placing || !betComment.trim() || !amount || Number(amount) <= 0 || selected._choice === undefined}
                              >
                                {placing ? 'Placing…' : 'Place Bet'}
                              </Button>
                              <Button onClick={() => setSelected(null)} variant="outline" disabled={placing}>
                                Cancel
                              </Button>
                            </div>

                            {message && (
                              <div className={`text-sm p-2 rounded ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {message}
                              </div>
                            )}

                            {/* Comments section */}
                            <CommentsList 
                              eventId={selected.id}
                              isBetMode={true}
                              betComment={betComment}
                              onBetCommentChange={setBetComment}
                            />
                          </div>
                        )
                      }
                    </React.Fragment>
                  );
                }
                return nodes;
              })()
            ) : (
              // mobile: single column, render each event and widget inline under selected without grouping
              events.map((ev) => (
                <div key={ev.id} className="w-full max-w-sm mx-auto">
                  <div
                    onClick={() => {
                      setAmount('');
                      setMessage(null);
                      setBetComment("");
                      setSelected(ev);
                    }}
                    className={`relative w-full min-w-0 p-4 rounded-lg border cursor-pointer transition ${
                      selected?.id === ev.id
                        ? 'border-primary bg-primary/10'
                        : 'border-muted-foreground/20 hover:border-primary/50'
                    }`}
                  >
                    {/* Comment count badge */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      <span>{commentCounts[ev.id] ?? 0}</span>
                    </div>

                    <div className="font-semibold">{ev.name ?? `Event ${ev.id}`}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Odds: <span className="font-medium text-foreground">{(ev.starting_odds * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Volume: <span className="font-medium">{ev.volume ? ev.volume - 1000 : 0}</span></div>
                    {ev.event_date && <div className="text-xs text-muted-foreground mt-1">{ev.event_date}</div>}
                  </div>

                  {selected?.id === ev.id && (
                    <div className="w-full min-w-0 rounded-lg border p-4 space-y-3 bg-muted/50 mt-3">
                      <div>
                        <p className="text-sm font-medium">Betting on: {selected.name ?? `Event ${selected.id}`}</p>
                        <p className="text-xs text-muted-foreground">Odds: {(selected.starting_odds * 100).toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground">Volume: {selected.volume ? selected.volume - 1000 : 0}</p>
                      </div>

                      <div className="flex gap-2 items-center">
                        <label className="text-sm font-medium">Side:</label>
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

                      <div>
                        <label className="text-sm font-medium">
                          Comment <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={betComment}
                          onChange={(e) => setBetComment(e.target.value)}
                          placeholder="You must say something about your bet..."
                          disabled={placing}
                          className="w-full border rounded p-2 mt-1 text-sm resize-none bg-background text-foreground"
                          rows={2}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          onClick={placeBet} 
                          className="flex-1" 
                          disabled={placing || !betComment.trim() || !amount || Number(amount) <= 0 || selected._choice === undefined}
                        >
                          {placing ? 'Placing…' : 'Place Bet'}
                        </Button>
                        <Button onClick={() => setSelected(null)} variant="outline" disabled={placing}>
                          Cancel
                        </Button>
                      </div>

                      {message && (
                        <div className={`text-sm p-2 rounded ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {message}
                        </div>
                      )}

                      {/* Comments section */}
                      <CommentsList 
                        eventId={selected.id}
                        isBetMode={true}
                        betComment={betComment}
                        onBetCommentChange={setBetComment}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      
    </div>
  );
}

