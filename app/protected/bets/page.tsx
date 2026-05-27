import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatAmount(value: number | string) {
  const amount = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(amount)) return '0 coins';
  return `${amount.toLocaleString('en-US')} coins`;
}

export default async function BetsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();

  if (error || !data?.session) redirect('/auth/login');

  const userId = data.session.user.id;

  const { data: walletData } = await supabase
    .from('wallet')
    .select('balance')
    .eq('user_id', userId)
    .single();

  const { data: betsData } = await supabase
    .from('bets')
    .select('id, created_at, event, odds, outcome, amount')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  console.log('betsData', betsData);
  const bets = betsData ?? [];

  // Fetch event names
  const eventIds = [...new Set(bets.map((b: any) => b.event))];
  console.log('eventIds', eventIds);
  let eventsData: any[] = [];
  if (eventIds.length > 0) {
    const { data, error: eventsError } = await supabase
      .from('events')
      .select('id, name')
      .in('id', eventIds);
    console.log('eventsData', data);
    console.log('eventsError', eventsError);
    eventsData = data ?? [];
  }

  const eventMap: Record<number, string> = {};
  (eventsData ?? []).forEach((e: any) => {
    eventMap[e.id] = e.name;
  });

  const pending = bets.filter((b: any) => b.outcome === null);
  const resolved = bets.filter((b: any) => b.outcome !== null);

  // Calculate potential amount: wallet balance + sum of (pending bet amount * odds)
  const currentBalance = Number(walletData?.balance ?? 0);
  const pendingWinnings = pending.reduce((sum: number, b: any) => sum + b.amount * b.odds, 0);
  const potentialAmount = currentBalance + pendingWinnings;

  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">My Bets</h1>
        <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
          Potential amount: <span className="font-semibold text-foreground">{formatAmount(potentialAmount)}</span>
        </div>
      </div>

      <section>
        <h2 className="font-semibold">Pending</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending bets.</p>
        ) : (
          <div className="space-y-3 mt-3">
            {pending.map((b: any) => (
              <div key={b.id} className="rounded border p-3 flex justify-between">
                <div>
                  <div className="font-semibold">{eventMap[b.event] || `Eent ${b.event}`}</div>
                  <div className="text-xs text-muted-foreground">Placed {formatTimestamp(b.created_at)}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatAmount(b.amount)}</div>
                  <div className="text-sm text-muted-foreground">Odds: {b.odds}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-semibold mt-6">Resolved</h2>
        {resolved.length === 0 ? (
          <p className="text-sm text-muted-foreground">No resolved bets yet.</p>
        ) : (
          <div className="space-y-3 mt-3">
            {resolved.map((b: any) => (
              <div key={b.id} className="rounded border p-3 flex justify-between">
                <div>
                  <div className="font-semibold">{eventMap[b.event] || `Event ${b.event}`}</div>
                  <div className="text-xs text-muted-foreground">Placed {formatTimestamp(b.created_at)}</div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${b.outcome ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatAmount(b.outcome ? b.amount * b.odds : b.amount)}
                  </div>
                  <div className="text-sm text-muted-foreground">{b.outcome ? 'Won' : 'Lost'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
