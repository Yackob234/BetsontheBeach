import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserAvatar } from '@/components/user-avatar';

// Admin accounts that always appear on the leaderboard, even with no recent bets
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

function formatAmount(value: number | string) {
  const amount = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(amount)) return '0 coins';
  return `${amount.toFixed(0)} coins`;
}

function formatDate(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function medalFor(idx: number) {
  if (idx === 0)
    return { emoji: '🥇', bg: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800' };
  if (idx === 1)
    return { emoji: '🥈', bg: 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700' };
  if (idx === 2)
    return { emoji: '🥉', bg: 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800' };
  return { emoji: '', bg: '' };
}

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.id) redirect('/auth/login');

  const tournamentResp = await supabase
    .from('tournament')
    .select('id, name, started_at, ended_at')
    .order('ended_at', { ascending: false });
  const tournaments = tournamentResp.data ?? [];

  const resultsResp = tournaments.length
    ? await supabase
        .from('tournament_result')
        .select('tournament_id, user_id, final_balance, rank')
        .in('tournament_id', tournaments.map((t: any) => t.id))
        .order('rank', { ascending: true })
    : { data: [] as any[] };
  const pastResults = resultsResp.data ?? [];

  // ---- Active users (bet since the last tournament ended) ----
  const currentStart = tournaments[0]?.ended_at ?? null;

  let activeQuery = supabase.from('bets').select('user_id');
  if (currentStart) activeQuery = activeQuery.gte('created_at', currentStart);
  const activeResp = await activeQuery;

  const activeIds = new Set<string>((activeResp.data ?? []).map((b: any) => b.user_id));
  activeIds.add(user.id); // viewer always sees themselves
  ADMIN_USER_IDS.forEach((id) => activeIds.add(id)); // admin cutout

  const walletResp = await supabase
    .from('wallet')
    .select('user_id, balance')
    .in('user_id', Array.from(activeIds))
    .order('balance', { ascending: false })
    .limit(50);

  const wallets = walletResp.data ?? [];
  const userIds = wallets.map((w: any) => w.user_id);

  const allUserIds = Array.from(
    new Set([...userIds, ...pastResults.map((r: any) => r.user_id)])
  );

  const profileResp = await supabase
    .from('profiles')
    .select('user_id, username, avatar_url')
    .in('user_id', allUserIds);

  const profileMap: Record<string, any> = {};
  (profileResp.data ?? []).forEach((p: any) => {
    profileMap[p.user_id] = p;
  });

  const resultsByTournament: Record<string, any[]> = {};
  pastResults.forEach((r: any) => {
    (resultsByTournament[r.tournament_id] ||= []).push(r);
  });

  // Get bets for these users
  const betsResp = await supabase
    .from('bets')
    .select('user_id, amount, outcome')
    .in('user_id', userIds).is('outcome', null); // Only consider pending bets

  const betsMap: Record<string, any> = {};
  (betsResp.data ?? []).forEach((b: any) => {
    betsMap[b.user_id] = (betsMap[b.user_id] || 0) + b.amount;
  });

  const rows = wallets.map((w: any) => ({
    ...w,
    profile: profileMap[w.user_id],
    pendingBet: (betsMap[w.user_id] || 0),
  }))
  // Sort by total balance (current + pending bets) in descending order
  .sort((a: any, b: any) => {
    const aTotal = Number(a.balance) + Number(a.pendingBet);
    const bTotal = Number(b.balance) + Number(b.pendingBet);
    return bTotal - aTotal;
  });

  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Leaderboard</h1>
        <p className="text-sm text-foreground">Compete for glory and prizes.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 mb-6">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🥇</span>
            <p className="font-semibold text-sm">1st Place Prize</p>
          </div>
          <p className="text-sm text-foreground">TBD</p>
        </div>
        <div className="rounded-lg border border-slate-300 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🥈</span>
            <p className="font-semibold text-sm">2nd Place Prize</p>
          </div>
          <p className="text-sm text-foreground">TBD</p>
        </div>
        <p className="text-sm text-muted-foreground">Taking prize suggestions now!</p>
      </div>

      <div className="mt-2 space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No wallet data yet.</p>
        ) : (
          <ol className="space-y-2">
            {rows.map((r: any, idx: number) => {
              const profile = r.profile;
              const { emoji, bg } = medalFor(idx);

              return (
                <li key={r.user_id} className={`flex items-center justify-between rounded-lg border p-4 transition-all hover:shadow-md ${bg || 'border-foreground/10 bg-background'}`}>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10">
                      {emoji ? (
                        <span className="text-xl">{emoji}</span>
                      ) : (
                        <div className="font-bold text-lg text-muted-foreground">#{idx + 1}</div>
                      )}
                    </div>
                    <UserAvatar
                      name={profile?.username || 'Unknown'}
                      avatarUrl={profile?.avatar_url}
                      sizeClassName="h-12 w-12"
                    />
                    <div>
                      <div className="font-semibold text-base">{profile?.username || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">Rank #{idx + 1}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{formatAmount(r.balance + r.pendingBet)}</div>
                    <div className="text-xs text-muted-foreground">total</div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Past tournaments */}
      <div className="mt-6 space-y-3">
        <h2 className="text-2xl font-bold">Past Tournaments</h2>

        {tournaments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No past tournaments yet.</p>
        ) : (
          tournaments.map((t: any) => {
            const results = resultsByTournament[t.id] ?? [];
            const winner = results[0];
            const winnerName = winner ? profileMap[winner.user_id]?.username || 'Unknown' : null;

            return (
              <details
                key={t.id}
                className="group rounded-lg border border-foreground/10 bg-background p-4"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-base">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.started_at ? `${formatDate(t.started_at)} – ` : 'Ended '}
                      {formatDate(t.ended_at)}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    {winnerName && (
                      <div className="font-medium">🥇 {winnerName}</div>
                    )}
                    <div className="text-xs text-muted-foreground group-open:hidden">Show results</div>
                    <div className="text-xs text-muted-foreground hidden group-open:block">Hide results</div>
                  </div>
                </summary>

                {results.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">No results recorded.</p>
                ) : (
                  <ol className="mt-4 space-y-2">
                    {results.map((r: any) => {
                      const profile = profileMap[r.user_id];
                      const { emoji, bg } = medalFor(r.rank - 1);

                      return (
                        <li key={r.user_id} className={`flex items-center justify-between rounded-lg border p-4 transition-all hover:shadow-md ${bg || 'border-foreground/10 bg-background'}`}>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-10 h-10">
                              {emoji ? (
                                <span className="text-xl">{emoji}</span>
                              ) : (
                                <div className="font-bold text-lg text-muted-foreground">#{r.rank}</div>
                              )}
                            </div>
                            <UserAvatar
                              name={profile?.username || 'Unknown'}
                              avatarUrl={profile?.avatar_url}
                              sizeClassName="h-12 w-12"
                            />
                            <div>
                              <div className="font-semibold text-base">{profile?.username || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">Rank #{r.rank}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">{formatAmount(r.final_balance)}</div>
                            <div className="text-xs text-muted-foreground">final</div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </details>
            );
          })
        )}
      </div>
    </div>
  );
}