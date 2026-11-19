# Strike World — Digital Lottery Machine

A prize-lottery system I built on my own for MIXI's Strike World booth at Comic Con Mumbai (10k+ visitors). Five tablets ran it side by side at the booth, all drawing from one shared, live prize inventory.

## The problem

Visitors spun a slot-machine-style lottery on any of five tablets to win merchandise. Every tablet drew from the same limited stock, so two tablets could pick the same last item at the same moment and both promise a prize that didn't exist. Staff also needed to change stock and odds during the event without restarting anything.

## How it works

- **No double-claiming.** Each prize row carries a version number. A win only counts if an atomic database update (`decrement_stock`) finds the version it expects and stock above zero. If another tablet got there first, the tablet quietly draws again from the refreshed pool.
- **Live sync.** Every tablet subscribes to inventory changes (Supabase Realtime) and refreshes its prize pool within 1–2 seconds of any spin or staff edit.
- **Tiers.** Each tablet is assigned a tier (A/B/C) and only offers that tier's prizes. Prizes are drawn at random, weighted by odds staff can set.
- **Staff console.** A PIN-protected dashboard to add products, set stock and odds, see sold-out alerts, and export the spin log as CSV.
- **Bug found and fixed:** stock was being decremented more than once per spin.

| Tier | Tablets | Prizes |
|------|---------|--------|
| C | C-1, C-2 | Regular merch |
| B | B-1, B-2 | Game merch |
| A | A-1 | Multi-event prizes |

## Tech stack

React + Vite, React Router, Tailwind CSS · Supabase (PostgreSQL, Realtime, row-level security) · static deployment (Vercel)

## Run it yourself

1. Create a Supabase project and run `supabase-schema.sql` in the SQL editor. Check that Realtime is enabled on `lottery_settings`.
2. `cp .env.example .env` and fill in `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and your own `VITE_ADMIN_PIN`.
3. `npm install && npm run dev`. To deploy, run `npm run build` and serve `dist/`.

Screens: `/` (staff assign each tablet's tier and number), `/lottery` (visitor-facing machine), `/admin` (staff console).
