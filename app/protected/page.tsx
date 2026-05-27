import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { InfoIcon } from "lucide-react";
import { FetchDataSteps } from "@/components/tutorial/fetch-data-steps";

type BetRecord = {
  id: number;
  created_at: string;
  event: number;
  odds: number;
  outcome: boolean | null;
  amount: number | string;
};

type WalletRecord = {
  balance: number | string;
};

function formatBetStatus(outcome: boolean | null) {
  if (outcome === null) {
    return "Pending";
  }

  return outcome ? "Won" : "Lost";
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatAmount(value: number | string) {
  const amount = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(amount)) {
    return "0 coins";
  }

  return `${amount.toLocaleString("en-US")} coins`;
}

async function getProtectedData() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();

  if (error || !data?.session) {
    redirect("/auth/login");
  }

  const userId = data.session.user.id;

  const [walletResponse, betsResponse] = await Promise.all([
    // select the balance (not user_id)
    supabase.from("wallet").select("balance").eq("user_id", userId).single(),
    // let TS infer the row type to avoid generic-arity errors in some supabase client versions
    supabase
      .from("bets")
      .select("id, created_at, event, odds, outcome, amount")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const walletError =
    walletResponse.error && walletResponse.status !== 406
      ? walletResponse.error
      : null;

  return {
    userId,
    wallet: walletResponse.data as WalletRecord | null,
    walletError,
    bets: betsResponse.data ?? [],
    betsError: betsResponse.error,
  };
}

export default async function ProtectedPage() {
  const { wallet, bets, walletError, betsError } = await getProtectedData();

  const pendingBets = bets.filter((bet) => bet.outcome === null);
  const resolvedBets = bets.filter((bet) => bet.outcome !== null);

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} />
          This is a protected page that you can only see as an authenticated user.
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <div className="rounded-lg border bg-background p-6 shadow-sm">
          <h2 className="font-bold text-2xl mb-3">Wallet</h2>
          {walletError ? (
            <p className="text-sm text-red-500">Unable to load wallet.</p>
          ) : wallet ? (
            <div className="text-4xl font-semibold">{formatAmount(wallet.balance)}</div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No wallet found yet. Create a wallet row for your user in Supabase.
            </p>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            Your balance is stored in the `wallet` table using `user_id` from
            Supabase Auth.
          </p>
        </div>

        <div className="rounded-lg border bg-background p-6 shadow-sm">
          <h2 className="font-bold text-2xl mb-3">Bet history</h2>
          {betsError ? (
            <p className="text-sm text-red-500">Unable to load bets.</p>
          ) : bets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any bets yet. Place a bet to see the history here.
            </p>
          ) : (
            <div className="space-y-4">
              {resolvedBets.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Resolved bets</h3>
                  <div className="space-y-3">
                    {resolvedBets.map((bet) => (
                      <div key={bet.id} className="rounded-lg border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Bet ID {bet.id}</p>
                            <p className="font-semibold">Event {bet.event}</p>
                          </div>
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                            {formatBetStatus(bet.outcome)}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          <div>
                            <p className="text-xs uppercase text-muted-foreground">Amount</p>
                            <p className="font-medium">{formatAmount(bet.amount)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-muted-foreground">Odds</p>
                            <p className="font-medium">{bet.odds}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-muted-foreground">Placed</p>
                            <p>{formatTimestamp(bet.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingBets.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Pending bets</h3>
                  <div className="space-y-3">
                    {pendingBets.map((bet) => (
                      <div key={bet.id} className="rounded-lg border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Bet ID {bet.id}</p>
                            <p className="font-semibold">Event {bet.event}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                            Pending
                          </span>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          <div>
                            <p className="text-xs uppercase text-muted-foreground">Amount</p>
                            <p className="font-medium">{formatAmount(bet.amount)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-muted-foreground">Odds</p>
                            <p className="font-medium">{bet.odds}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-muted-foreground">Placed</p>
                            <p>{formatTimestamp(bet.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <div>
        <h2 className="font-bold text-2xl mb-4">Next steps</h2>
        <FetchDataSteps />
      </div>
    </div>
  );
}
