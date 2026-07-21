# Aage Kya? — AI Career Guidance for Indian Students

A React + Vite + Tailwind app providing honest, AI-powered post-12th career guidance. Built with a Node/Express backend (Gemini proxy) and Supabase for auth + persistence.

---

## Quick Start

### 1. Install dependencies

```bash
# Frontend
npm install

# Backend
cd server && npm install && cd ..
```

### 2. Configure environment variables

**Frontend** — copy `.env.example` → `.env` and fill in:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Backend** — copy `server/.env.example` → `server/.env` and fill in:
```
PORT=5000
GEMINI_API_KEY=your-gemini-api-key
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # optional, for analytics
```

### 3. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the entire contents of [`supabase_schema.sql`](./supabase_schema.sql)
3. Go to **Authentication → Providers** and enable **Email (magic link)**
4. Copy your project URL and anon key from **Project Settings → API** into both `.env` files above

### 4. Run

```bash
# Terminal 1 — Express backend (port 5000)
cd server && node index.js

# Terminal 2 — Vite frontend (port 5173)
npm run dev
```

---

## Architecture

| Layer | Tech | Notes |
|-------|------|-------|
| Frontend | React 18, Vite, Tailwind CSS | `src/` |
| Backend | Node.js, Express | `server/index.js` |
| AI | Gemini 2.0 Flash | Server-side only — API key never reaches the browser |
| Auth | Supabase Magic Link (OTP email) | `src/components/AuthModal.jsx` |
| Database | Supabase (Postgres) | `supabase_schema.sql` |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/guidance` | Generate AI career guidance |
| POST | `/api/roadmap` | Generate 4-year learning roadmap |
| POST | `/api/sync` | Sync localStorage data to DB after sign-in |
| GET | `/api/analytics` | Stream/state counts (requires service role key) |

## Analytics (Pitch Deck Data)

With `SUPABASE_SERVICE_ROLE_KEY` set in `server/.env`:

```bash
curl http://localhost:5000/api/analytics
# → { total_students, by_stream: [...], by_state: [...] }
```

Or run the cross-tab query directly in Supabase SQL Editor:
```sql
SELECT stream, state, COUNT(*) AS n
FROM public.students
GROUP BY stream, state
ORDER BY n DESC LIMIT 30;
```
