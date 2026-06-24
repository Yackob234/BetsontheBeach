# 🏖️ Bets on the Beach

A social betting platform for friends and groups. Place bets on real-world events, compete on the leaderboard, and track your balance against the S&P 500.

---

## Features

- **Event Betting** — Bet yes or no on real-world events with dynamic odds that shift as money comes in
- **Dynamic Odds** — Odds are calculated as a pure ratio of money on each side, updating in real time as bets are placed
- **Leaderboard** — See who's up and who's down across the group
- **S&P 500 Benchmark** — A bot user tracks the S&P 500 return since June 1st 2026 so you can see if you're beating the market
- **News** — Admins can publish news stories with images to the homepage
- **Event Comments** — Discuss and trash talk on each event page
- **Bet History** — View all your past bets, outcomes, and payouts
- **Event Recap** — Post-event summaries and results
- **Dark Mode** — Full light/dark theme support
- **Event Tags** — Tag events by author, sport, or date - TBD

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Hosting | Vercel |
| Styling | Tailwind CSS + shadcn/ui |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- A Vercel account (for deployment)

### Local Development

```bash
# Clone the repo
git clone https://github.com/Yackob234/BetsontheBeach.git
cd BetsontheBeach

# Install dependencies
npm install

# Add environment variables
cp .env.example .env.local
# Fill in your Supabase URL and anon key

# Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALPHA_VANTAGE_KEY=your-alpha-vantage-api-key
```

---

## Database Schema

| Table | Description |
|---|---|
| `profiles` | Public user profiles linked to auth.users |
| `wallet` | Each user's balance, starting at $1000 |
| `events` | Bettable events with odds, volume, and result |
| `bets` | Individual bets placed by users |
| `news` | News stories published by verified humans |
| `comments` | Comments on individual events |

### Key Database Functions

- `resolve_event(event_id, result)` — Resolves an event, pays out winners, marks losers
- `handle_new_user()` — Trigger that auto-creates a profile and wallet on signup
- `handle_new_bet()` — Trigger that updates event volume and recalculates odds on each bet

---

## How Betting Works

1. Events are created by admins with a starting odds (e.g. `0.50` = 50/50)
2. Users bet yes (`true`) or no (`false`) with any amount from their wallet
3. Odds shift automatically as money comes in — more money on one side = worse odds for that side
4. Betting closes at **6pm EST** on the day of the event
5. Admin resolves the event with the true/false result
6. Winners are paid out based on the odds at the time they placed their bet:

```
payout = amount / odds_at_placement
```

---

## How Odds Work

Odds are a pure ratio of money on each side:

```
odds_true  = volume_true  / total_volume
odds_false = volume_false / total_volume
```

Always adds up to 1.0. No house edge.

**Example:**
```
$500 on yes, $500 on no → odds = 0.50 / 0.50
$1000 more on yes       → odds = 0.75 / 0.25
```

---

## S&P 500 Bot

A bot user called **S&P 500** tracks the market return since June 1st 2026 as a benchmark. Its balance updates daily via a Cron-Job.org that hits the Alpha Vantage API at 4pm EST on weekdays.

```
bot_balance = 1000 * (current_SPY_price / SPY_price_on_june1)
```

---

## Deployment

The app deploys automatically to Vercel on every push to `main`.

```bash
git add .
git commit -m "your message"
git push
```

Make sure all environment variables are set in **Vercel → Settings → Environment Variables**.

---

## Admin Features

Admins (`is_admin = true` on profiles) can:
- Create and manage events
- Resolve or cancel events
- Publish news stories

Humans (`is_human = true` on profiles) can:
- Publish news stories

These flags are set manually in the Supabase dashboard.

---
