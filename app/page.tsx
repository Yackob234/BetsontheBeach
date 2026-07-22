import { createClient } from "@/lib/supabase/server";
import { InfoIcon, Newspaper, TrendingUp, Coins, Calendar, LineChart } from "lucide-react";
import { NewsCard, NewsRecord } from "@/components/news-card";
import { FormattedTime } from "@/components/formatted-time";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type BetRecord = {
  id: number;
  created_at: string;
  event: number;
  odds: number;
  outcome: boolean | null;
  amount: number | string;
  pick?: boolean;
};

type WalletRecord = {
  balance: number | string;
};

type EventRecord = {
  id: number;
  name: string;
  status: "open" | "closed" | "cancelled";
  starting_odds?: number;
  event_date?: string;
  volume?: number;
  tags?: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBetStatus(outcome: boolean | null) {
  if (outcome === null) return "Pending";
  return outcome ? "Won" : "Lost";
}

function formatAmount(value: number | string) {
  const amount = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(amount)) return "0 coins";
  return `${amount.toFixed(0)} coins`;
}

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function getStatusBadgeClasses(outcome: boolean | null) {
  if (outcome === null) return "bg-slate-100 text-slate-700";
  return outcome ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";
}

function NewsIcon({ title }: { title: string }) {
  const t = title.toLowerCase();
  if (t.includes("website") || t.includes("ai") || t.includes("comment")) return <>💻</>;
  if (t.includes("sport") || t.includes("volleyball") || t.includes("championship") || t.includes("game")) return <>🏆</>;
  return <>📈</>;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getLandingData() {
  const supabase = await createClient();

  // Events: same query pattern as provided
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 1); // include events from yesterday onward
  const cutoffISO = cutoff.toISOString();

  let query = supabase
    .from("events")
    .select("id, name, event_date, starting_odds, volume, tags, status")
    .gte("event_date", cutoffISO)
    .order("event_date", { ascending: true })
    .limit(4); // only need a preview on the landing page

  if (process.env.NODE_ENV === "production") {
    query = query.not("tags", "cs", '{"test"}');
  }
  query = query.neq("status", "cancelled");

  const { data: eventsData, error: eventsError } = await query;

  if (eventsError) {
    console.error("Error fetching events:", eventsError);
  }

  // News: same query + author username join as original page.tsx
  const newsResponse = await supabase
    .from("news")
    .select("id, created_at, title, content, image_url, author")
    .order("created_at", { ascending: false })
    .limit(3); // preview — fewer items for landing

  let newsWithUsernames: NewsRecord[] = [];
  if (newsResponse.data && newsResponse.data.length > 0) {
    const authorIds = newsResponse.data.map((n: any) => n.author);
    const profilesResponse = await supabase
      .from("profiles")
      .select("user_id, username")
      .in("user_id", authorIds);

    const profileMap: { [key: string]: string } = {};
    (profilesResponse.data || []).forEach((p: any) => {
      profileMap[p.user_id] = p.username;
    });

    newsWithUsernames = newsResponse.data.map((n: any) => ({
      ...n,
      author_username: profileMap[n.author] || "Unknown",
    }));
  }

  return {
    events: (eventsData ?? []) as EventRecord[],
    news: newsWithUsernames,
  };
}

async function enrichNewsItems(supabase: Awaited<ReturnType<typeof createClient>>, newsItems: any[]) {
  if (!newsItems.length) return [];

  const newsIds = newsItems.map((item) => item.id);
  
  const { data: stats } = await supabase
    .from("news_comment_stats")
    .select("news_id, comment_count, like_count")
    .in("news_id", newsIds);

  const statsMap = Object.fromEntries(
    (stats ?? []).map((row) => [row.news_id, row])
  );

  return newsItems.map((item) => ({
    ...item,
    comment_count: statsMap[item.id]?.comment_count ?? 0,
    like_count: statsMap[item.id]?.like_count ?? 0,
  }));
}

async function getDashboardData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.id) return null;

  const userId = user.id;

  const [walletResponse, betsResponse, eventsResponse, newsResponse] = await Promise.all([
    supabase.from("wallet").select("balance").eq("user_id", userId).single(),
    supabase
      .from("bets")
      .select("id, created_at, event, odds, outcome, amount, pick")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("events").select("id, name, status"),
    supabase
      .from("news")
      .select("id, created_at, title, content, image_url, author")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  let newsWithUsernames: NewsRecord[] = [];
  if (newsResponse.data && newsResponse.data.length > 0) {
    const authorIds = newsResponse.data.map((n: any) => n.author);
    const profilesResponse = await supabase
      .from("profiles")
      .select("user_id, username, avatar_url")
      .in("user_id", authorIds);

    const profileMap: { [key: string]: { username: string; avatar_url: string | null } } = {};
    (profilesResponse.data || []).forEach((p: any) => {
      profileMap[p.user_id] = { username: p.username, avatar_url: p.avatar_url };
    });

    const newsRows = (newsResponse.data ?? []).map((n: any) => ({
      ...n,
      author_username: profileMap[n.author]?.username || "Unknown",
      author_avatar_url: profileMap[n.author]?.avatar_url || null,
    }));

    newsWithUsernames = await enrichNewsItems(supabase, newsRows);
  }

  const walletError =
    walletResponse.error && walletResponse.status !== 406
      ? walletResponse.error
      : null;

  const eventMap: { [key: number]: EventRecord } = {};
  if (eventsResponse.data) {
    eventsResponse.data.forEach((event: EventRecord) => {
      eventMap[event.id] = event;
    });
  }

  return {
    userId,
    wallet: walletResponse.data as WalletRecord | null,
    walletError,
    bets: betsResponse.data ?? [],
    betsError: betsResponse.error,
    eventMap,
    news: newsWithUsernames,
  };
}

// ─── Landing page (logged out) ────────────────────────────────────────────────

async function LandingPage() {
  const { events, news } = await getLandingData();

  return (
    <div className="flex-1 w-full flex flex-col gap-0">

      {/* Nav */}
      {/* <nav className="flex items-center justify-between py-4 border-b mb-8">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <TrendingUp size={20} className="text-blue-500" />
          PropBet
        </div>
        <div className="flex items-center gap-2">
          <Link href="/news" className="text-sm px-3 py-1.5 rounded-md hover:bg-accent transition-colors">
            News
          </Link>
          <Link href="/events" className="text-sm px-3 py-1.5 rounded-md hover:bg-accent transition-colors">
            Events
          </Link>
          <Link
            href="/auth/login"
            className="text-sm px-4 py-1.5 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            Sign up
          </Link>
        </div>
      </nav> */}

      {/* Hero */}
      <section className="text-center py-10 mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
          Free to play · No real money
        </p>
        <h1 className="text-4xl font-semibold leading-tight mb-3">
          Predict the future.<br />Win prizes.
        </h1>
        <p className="text-muted-foreground text-base max-w-md mx-auto mb-6 leading-relaxed">
          Place bets on real-world volleyball games using virtual coins. Track your predictions, climb the leaderboard, and see how sharp your instincts really are.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/auth/sign-up"
            className="px-5 py-2 rounded-md bg-foreground text-background text-sm hover:opacity-90 transition-opacity"
          >
            Create an account
          </Link>
          {/* <Link
            href="/events"
            className="px-5 py-2 rounded-md border text-sm hover:bg-accent transition-colors"
          >
            Browse events
          </Link> */}
        </div>
      </section>

      {/* Feature cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-lg bg-muted/50 p-4">
          <Coins size={22} className="text-amber-500 mb-2" />
          <p className="text-sm font-medium mb-1">Virtual coins</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Start with a wallet of coins. No real money, ever (unless).
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 p-4">
          <Calendar size={22} className="text-blue-500 mb-2" />
          <p className="text-sm font-medium mb-1">Real-world volleyball games</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Bet on Jacob's world-class volleyball team, and more.
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 p-4">
          <LineChart size={22} className="text-green-500 mb-2" />
          <p className="text-sm font-medium mb-1">Track your record</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Watch your win streak and potential balance grow.
          </p>
        </div>
      </div>

      {/* Events + News */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">

        {/* Open events */}
        <div className="rounded-lg border bg-background p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Open events</h2>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              Live
            </span>
          </div>

          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open events right now.</p>
          ) : (
            <div className="divide-y divide-border">
              {events.map((event) => {
                const odds = event.starting_odds ?? 0.5;
                return (
                  <div key={event.id} className="py-3">
                    <p className="text-sm font-medium mb-2">{event.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-6">For</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.round(odds * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {Math.round(odds * 100)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Sign up to place bets on these events.
            </p>
          </div>
        </div>

        {/* News */}
        <div className="rounded-lg border bg-background p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Newspaper size={20} />
            <h2 className="font-semibold text-lg">Latest news</h2>
          </div>

          {news.length === 0 ? (
            <p className="text-sm text-muted-foreground">No news yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {news.map((item) => (
                <div key={item.id} className="flex gap-3 py-3">
                  <div className="w-11 h-11 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center text-lg">
                    {/* {item.image_url && (
                      <div className="w-full h-11 overflow-hidden bg-muted">
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) || ( */}
                      <NewsIcon title={item.title} />
                    {/* )} */}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.author_username} · {timeAgo(item.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground">
              More news after you sign in.
            </p>
          </div>
        </div>

      </div>

      {/* Footer note */}
      <div className="mt-8 pt-6 border-t text-center">
        <p className="text-xs text-muted-foreground">
          For educational purposes only. No real money involved. Don&apos;t gamble with real funds.
        </p>
      </div>

    </div>
  );
}

// ─── Dashboard (logged in) ────────────────────────────────────────────────────

async function Dashboard() {
  const data = await getDashboardData();

  // getDashboardData returns null if not logged in — shouldn't happen here
  // but guard just in case
  if (!data) return null;

  const { wallet, bets, walletError, betsError, eventMap, news } = data;

  const pendingBets = bets.filter((bet) => bet.outcome === null);
  const resolvedBets = bets.filter((bet) => bet.outcome !== null);

  const pendingWinnings = pendingBets.reduce((sum, bet) => {
    const betAmount = typeof bet.amount === "string" ? Number(bet.amount) : bet.amount;
    const odds = typeof bet.odds === "string" ? Number(bet.odds) : bet.odds;
    const potentialWin = betAmount / (bet.pick ? odds : 1 - odds);
    return sum + potentialWin;
  }, 0);

  const currentBalance = wallet
    ? (typeof wallet.balance === "string" ? Number(wallet.balance) : wallet.balance)
    : 0;

  const potentialBalance = currentBalance + pendingWinnings;

  function getStatusBadgeClasses(outcome: boolean | null) {
    if (outcome === null) return "bg-slate-100 text-slate-700";
    return outcome ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} width={16} height={16} className="flex-shrink-0 mt-0.5" />
          Gambling is a issue. This project is for educational purposes only and not intended for real money betting. Don&apos;t be a degenerate, kids.
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <div className="rounded-lg bg-background flex flex-col gap-6">
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

          <section className="w-full">
            <div className="rounded-lg border bg-background p-6 shadow-sm">
              <Link href="/news"  className="flex items-center gap-2 mb-4 hover:opacity-70 transition-opacity ">
                <Newspaper size={24} />
                <h2 className="font-bold text-2xl">Latest News</h2>
              </Link>
              {news && news.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-1">
                  {news.map((item: NewsRecord) => (
                    <NewsCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No news yet.</p>
              )}
            </div>
          </section>
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
                            <p className="font-semibold">{eventMap[bet.event]?.name || `Event ${bet.event}`}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {bet.pick ? "🟢 For" : "🔴 Against"}
                            </p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClasses(eventMap[bet.event]?.status === "cancelled" ? null : bet.outcome)}`}>
                            {eventMap[bet.event]?.status === "cancelled" ? "Cancelled" : formatBetStatus(bet.outcome)}
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
                            <p><FormattedTime timestamp={bet.created_at} /></p>
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
                            <p className="font-semibold">{eventMap[bet.event]?.name || `Event ${bet.event}`}</p>
                            <p className="text-xs text-muted-foreground mt-1">{bet.pick ? "🟢 For" : "🔴 Against"}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
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
                            <p><FormattedTime timestamp={bet.created_at} /></p>
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

// ─── Root page — auth gate ────────────────────────────────────────────────────

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <LandingPage />;
  }

  return <Dashboard />;
}