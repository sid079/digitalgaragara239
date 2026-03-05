# Strike World — Digital Lottery Machine

A full-stack web application for the Strike World booth at ComicCon Mumbai. Runs on 5 tablets simultaneously with real-time inventory sync.

## Tech Stack

- **Frontend**: React + Vite, React Router v6, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Deployment**: Static (Vercel / Netlify)

## Quick Start

### 1. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase-schema.sql`
3. Enable **Realtime** on the `lottery_settings` table (should be done by the schema, but verify in Dashboard → Database → Replication)
4. Copy your project URL and anon key from **Settings → API**

### 2. Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_ADMIN_PIN=5544
```

### 3. Mascot Images

Place the two mascot images in the `public/` folder:
- `public/mascot-normal.png` — calm mascot (used on idle/ready states)
- `public/mascot-angry.png` — excited mascot with fire (used on win states)

Both images should have dark/black backgrounds for use with `mix-blend-mode: screen`.

### 4. Install & Run

```bash
npm install
npm run dev
```

### 5. Build for Production

```bash
npm run build
```

Deploy the `dist/` folder to Vercel, Netlify, or any static host.

## App Screens

### Setup Screen (`/`)
Staff-facing setup where you pick a Grade (A/B/C) and Device number. Saves to localStorage so tablets remember their assignment across refreshes.

### Lottery Display (`/lottery`)
Full-screen visitor-facing lottery machine with:
- Slot-machine reel animation
- Weighted random prize selection
- Win screen with confetti and mascot
- Real-time stock sync across all tablets

### Admin Console (`/admin`)
PIN-protected (default: `5544`) staff dashboard with:
- **Dashboard**: Overview stats, sold-out alerts, per-grade summaries
- **Products**: Add/edit/delete merchandise items
- **Lottery Settings**: Configure stock quantities, probability weights, active status
- **Lottery Log**: View spin history with date/machine filters and CSV export

## Tablet Configuration

| Grade | Devices | Products |
|-------|---------|----------|
| C | C-1, C-2 | Regular Merch |
| B | B-1, B-2 | Game Merch |
| A | A-1 | Multi Event |

## Architecture Notes

- **Grade Isolation**: Each tablet only shows products from its configured grade
- **Optimistic Concurrency**: Stock decrements use a version field to prevent double-claiming when multiple tablets spin simultaneously
- **Realtime Sync**: All tablets subscribe to `lottery_settings` changes and refresh their pool within ~1-2 seconds
- **Offline Recovery**: If a version conflict occurs during decrement, the system silently picks a new winner from the refreshed pool
