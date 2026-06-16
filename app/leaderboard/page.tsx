import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

function formatAmount(value: number | string) {
  const amount = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(amount)) return '0 coins';
  return `${amount.toFixed(0)} coins`;
}

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.id) redirect('/auth/login');

  // Get wallets sorted by balance
  const walletResp = await supabase
    .from('wallet')
    .select('user_id, balance')
    .order('balance', { ascending: false })
    .limit(50);

  const wallets = walletResp.data ?? [];
  const userIds = wallets.map((w: any) => w.user_id);

  // Get profiles for these users
  const profileResp = await supabase
    .from('profiles')
    .select('user_id, username, avatar_url')
    .in('user_id', userIds);

  const profileMap: Record<string, any> = {};
  (profileResp.data ?? []).forEach((p: any) => {
    profileMap[p.user_id] = p;
  });

  // Get bets for these users
  const betsResp = await supabase
    .from('bets')
    .select('user_id, amount, outcome')
    .in('user_id', userIds).is('outcome', null); // Only consider pending bets
  console.log("betsResp", betsResp.data);

  const betsMap: Record<string, any> = {};
  (betsResp.data ?? []).forEach((b: any) => {
    betsMap[b.user_id] = (betsMap[b.user_id] || 0) + b.amount;
  });
  console.log("betsMap", betsMap);

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
          <p className="text-sm text-foreground">Exclusive 1 on 1 paid dinner*</p>
        </div>
        <div className="rounded-lg border border-slate-300 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🥈</span>
            <p className="font-semibold text-sm">2nd Place Prize</p>
          </div>
          <p className="text-sm text-foreground">A heartfelt hug</p>
        </div>
        <p className="text-sm text-muted-foreground">Open to pity 3rd place suggestions</p>
      </div>
      

      <div className="mt-2 space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No wallet data yet.</p>
        ) : (
          <ol className="space-y-2">
            {rows.map((r: any, idx: number) => {
              const profile = r.profile;
              let medalEmoji = '';
              let medalBgColor = '';
              
              if (idx === 0) {
                medalEmoji = '🥇';
                medalBgColor = 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800';
              } else if (idx === 1) {
                medalEmoji = '🥈';
                medalBgColor = 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700';
              } else if (idx === 2) {
                medalEmoji = '🥉';
                medalBgColor = 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800';
              }
              
              return (
                <li key={r.user_id} className={`flex items-center justify-between rounded-lg border p-4 transition-all hover:shadow-md ${medalBgColor || 'border-foreground/10 bg-background'}`}>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10">
                      {medalEmoji ? (
                        <span className="text-xl">{medalEmoji}</span>
                      ) : (
                        <div className="font-bold text-lg text-muted-foreground">#{idx + 1}</div>
                      )}
                    </div>
                    {profile?.avatar_url && (
                      <img
                        src={profile.avatar_url}
                        alt={profile.username}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-foreground/10"
                      />
                    )}
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
    </div>
  );
}
