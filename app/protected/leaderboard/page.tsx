import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

function formatAmount(value: number | string) {
  const amount = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(amount)) return '0 coins';
  return `${amount.toFixed(0)} coins`;
}

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();

  if (error || !data?.session) redirect('/auth/login');

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

  const rows = wallets.map((w: any) => ({
    ...w,
    profile: profileMap[w.user_id],
  }));

  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Leaderboard</h1>
      <p className="text-sm text-muted-foreground">Top balances among degenerates.</p>

      <div className="mt-4 space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No wallet data yet.</p>
        ) : (
          <ol className="space-y-3">
            {rows.map((r: any, idx: number) => {
              const profile = r.profile;
              console.log('profile', profile);
              return (
                <li key={r.user_id} className="flex items-center justify-between rounded border p-3">
                  <div className="flex items-center gap-3">
                    {profile?.avatar_url && (
                      <img
                        src={profile.avatar_url}
                        alt={profile.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <div className="font-semibold">#{idx + 1}</div>
                      <div className="text-sm text-muted-foreground">{profile?.username || 'Unknown'}</div>
                    </div>
                  </div>
                  <div className="font-medium">{formatAmount(r.balance)}</div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
