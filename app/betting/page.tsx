import { createClient as createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PlaceBetForm from '@/components/place-bet-form';

export default async function BettingPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) redirect('/auth/login');

  return (
    <div className="flex-1 w-full flex flex-col gap-6 min-w-[350px]">
      <h1 className="text-2xl font-bold">Ongoing Events</h1>
      <div className="mt-6">
        {/* client component handles events and placing bets */}
        <PlaceBetForm />
      </div>
    </div>
  );
}
