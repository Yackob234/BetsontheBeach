"use client";

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

type Row = { t: number; odds: number };

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const W = 320;
const H = 190;
const PAD = { l: 38, r: 10, t: 12, b: 24 };

const fmtDay = (t: number) =>
  new Date(t).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
const fmtFull = (t: number) =>
  new Date(t).toLocaleString('en-CA', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });

export function OddsChart({ eventId, version }: { eventId: number; version?: number }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  // Load when opened, and reload whenever `version` changes (e.g. after a bet)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('event_odds_history')
        .select('odds, recorded_at')
        .eq('event_id', eventId)
        .order('recorded_at', { ascending: true });
      if (cancelled) return;
      if (error) {
        setError('Could not load history');
        return;
      }
      setError(null);
      setRows((data ?? []).map((r: any) => ({ t: new Date(r.recorded_at).getTime(), odds: Number(r.odds) })));
    })();
    return () => { cancelled = true; };
  }, [open, eventId, version]);

  const chart = useMemo(() => {
    if (!rows || rows.length === 0) return null;

    const now = Date.now();
    const start = now - WEEK_MS;

    // Last value before the window carries in so the line starts at the left edge
    const before = [...rows].reverse().find((r) => r.t <= start);
    const inWindow = rows.filter((r) => r.t > start);

    const real: Row[] = [...(before ? [{ t: start, odds: before.odds }] : []), ...inWindow];
    const last = rows[rows.length - 1];
    const pts: Row[] = [...real, { t: now, odds: last.odds }];

    // Auto-zoom y axis so small moves are visible (min span 20 points)
    const vals = pts.map((p) => p.odds * 100);
    let lo = Math.min(...vals) - 5;
    let hi = Math.max(...vals) + 5;
    if (hi - lo < 20) {
      const mid = (hi + lo) / 2;
      lo = mid - 10;
      hi = mid + 10;
    }
    lo = Math.max(0, Math.floor(lo / 5) * 5);
    hi = Math.min(100, Math.ceil(hi / 5) * 5);

    const x = (t: number) => PAD.l + ((t - start) / WEEK_MS) * (W - PAD.l - PAD.r);
    const y = (o: number) => PAD.t + (1 - (o * 100 - lo) / (hi - lo)) * (H - PAD.t - PAD.b);

    // Step line: odds hold their value until the next bet changes them
    let d = `M ${x(pts[0].t)} ${y(pts[0].odds)}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${x(pts[i].t)} ${y(pts[i - 1].odds)} L ${x(pts[i].t)} ${y(pts[i].odds)}`;
    }

    const yTicks = Array.from({ length: 4 }, (_, i) => lo + ((hi - lo) * i) / 3);
    const xTicks = [0, 1 / 3, 2 / 3, 1].map((f) => start + f * WEEK_MS);

    return { pts, real, d, x, y, yTicks, xTicks, start, now, firstOdds: pts[0].odds, lastOdds: last.odds };
  }, [rows]);

  function handlePointer(e: React.PointerEvent<SVGSVGElement>) {
    if (!chart || chart.real.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    chart.real.forEach((p, i) => {
      const dist = Math.abs(chart.x(p.t) - px);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    setHover(best);
  }

  const change = chart ? (chart.lastOdds - chart.firstOdds) * 100 : 0;
  const hovered = chart && hover !== null ? chart.real[hover] : null;

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        📈 {open ? 'Hide trend' : 'Trend (7d)'}
      </Button>

      {open && (
        <div className="rounded-lg border bg-background p-3">
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : rows === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !chart ? (
            <p className="text-sm text-muted-foreground">No history yet.</p>
          ) : (
            <>
              <div className="flex items-baseline justify-between mb-1">
                <div className="text-lg font-bold">{(chart.lastOdds * 100).toFixed(0)}%</div>
                <div className={`text-xs font-medium ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {change > 0 ? '▲' : change < 0 ? '▼' : '-'} {Math.abs(change).toFixed(0)} pts (7d)
                </div>
              </div>
              <div className="h-4 mb-1 text-xs text-muted-foreground">
                {hovered ? `${fmtFull(hovered.t)} — ${(hovered.odds * 100).toFixed(0)}%` : 'Tap the chart to inspect'}
              </div>

              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-auto touch-none select-none"
                onPointerMove={handlePointer}
                onPointerDown={handlePointer}
                onPointerLeave={() => setHover(null)}
              >
                {chart.yTicks.map((v) => (
                  <g key={v}>
                    <line x1={PAD.l} x2={W - PAD.r} y1={chart.y(v / 100)} y2={chart.y(v / 100)} className="stroke-muted-foreground/20" strokeWidth={1} />
                    <text x={PAD.l - 6} y={chart.y(v / 100) + 3} textAnchor="end" fontSize={9} className="fill-muted-foreground">
                      {v.toFixed(0)}%
                    </text>
                  </g>
                ))}
                {chart.xTicks.map((t, i) => (
                  <text
                    key={t}
                    x={chart.x(t)}
                    y={H - 6}
                    textAnchor={i === 0 ? 'start' : i === 3 ? 'end' : 'middle'}
                    fontSize={9}
                    className="fill-muted-foreground"
                  >
                    {i === 3 ? 'Now' : fmtDay(t)}
                  </text>
                ))}

                <path d={chart.d} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" />

                {chart.real.map((p, i) => (
                  <circle key={i} cx={chart.x(p.t)} cy={chart.y(p.odds)} r={hover === i ? 4.5 : 2.5} className="fill-primary" />
                ))}
                {hovered && (
                  <line x1={chart.x(hovered.t)} x2={chart.x(hovered.t)} y1={PAD.t} y2={H - PAD.b} className="stroke-primary/40" strokeWidth={1} strokeDasharray="3 3" />
                )}
              </svg>
            </>
          )}
        </div>
      )}
    </div>
  );
}