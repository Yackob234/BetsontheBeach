import { createClient as createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PlaceBetForm from '@/components/place-bet-form';

export default async function BettingPage() {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session) redirect('/auth/login');

  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Place a Bet</h1>
      <p className="text-sm text-muted-foreground">Select an active event and place a bet using your wallet balance.</p>
      <div className="mt-6">
        {/* client component handles events and placing bets */}
        <PlaceBetForm />
      </div>
    </div>
  );
}
