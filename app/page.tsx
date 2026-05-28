import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { InfoIcon } from "lucide-react";

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

type EventRecord = {
  id: number;
  name: string;
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

  return `${amount.toFixed(0)} coins`;
}

async function getDashboardData() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();

  if (error || !data?.session) {
    redirect("/auth/login");
  }

  const userId = data.session.user.id;

  const [walletResponse, betsResponse, eventsResponse] = await Promise.all([
    supabase.from("wallet").select("balance").eq("user_id", userId).single(),
    supabase
      .from("bets")
      .select("id, created_at, event, odds, outcome, amount")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("events").select("id, name"),
  ]);

  const walletError =
    walletResponse.error && walletResponse.status !== 406
      ? walletResponse.error
      : null;

  // Build a map of event ID to event name
  const eventMap: { [key: number]: string } = {};
  if (eventsResponse.data) {
    eventsResponse.data.forEach((event: EventRecord) => {
      eventMap[event.id] = event.name;
    });
  }

  return {
    userId,
    wallet: walletResponse.data as WalletRecord | null,
    walletError,
    bets: betsResponse.data ?? [],
    betsError: betsResponse.error,
    eventMap,
  };
}

export default async function Home() {
  const { wallet, bets, walletError, betsError, eventMap } = await getDashboardData();

  const pendingBets = bets.filter((bet) => bet.outcome === null);
  const resolvedBets = bets.filter((bet) => bet.outcome !== null);

  // Calculate potential wallet (current balance + pending bets winnings)
  const pendingWinnings = pendingBets.reduce((sum, bet) => {
    const betAmount = typeof bet.amount === "string" ? Number(bet.amount) : bet.amount;
    const potentialWin = betAmount * (typeof bet.odds === "string" ? Number(bet.odds) : bet.odds);
    return sum + potentialWin;
  }, 0);

  const currentBalance = wallet
    ? (typeof wallet.balance === "string" ? Number(wallet.balance) : wallet.balance)
    : 0;

  const potentialBalance = currentBalance + pendingWinnings;

  // Helper to get status badge color
  function getStatusBadgeClasses(outcome: boolean | null) {
    if (outcome === null) {
      return "bg-slate-100 text-slate-700";
    }
    return outcome ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} />
          Gambling is a issue. This project is for educational purposes only and not intended for real money betting. Don&apos;t be a degenerate, kids.
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <div className="rounded-lg border bg-background p-6 shadow-sm">
          <h2 className="font-bold text-2xl mb-3">Wallet</h2>
          {walletError ? (
            <p className="text-sm text-red-500">Unable to load wallet.</p>
          ) : wallet ? (
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-2">Current balance</p>
              <div className="text-4xl font-semibold mb-4">{formatAmount(currentBalance)}</div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Potential balance</p>
              <p className="text-2xl font-semibold text-amber-600">{formatAmount(potentialBalance)}</p>
              {pendingBets.length > 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                  +{formatAmount(pendingWinnings)} from {pendingBets.length} pending {pendingBets.length === 1 ? "bet" : "bets"}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No wallet found yet. Create a wallet row for your user in Supabase.
            </p>
          )}
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
                            <p className="font-semibold">{eventMap[bet.event] || `Event ${bet.event}`}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClasses(bet.outcome)}`}>
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
                            <p className="font-medium">{(bet.odds * 100).toFixed(0)}%</p>
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
                            <p className="font-semibold">{eventMap[bet.event] || `Event ${bet.event}`}</p>
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
                            <p className="font-medium">{(bet.odds * 100).toFixed(0)}%</p>
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

    </div>
  );
}
