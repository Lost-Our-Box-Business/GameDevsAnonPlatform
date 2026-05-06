# Lost Our Box — Game Dev Platform

## Project Overview
Web platform for the Lost Our Box weekly game dev meetup group. Manages everything from project onboarding to task tracking, points, and social media marketing.

**Live URL (when deployed):** TBD (Netlify)
**Supabase Project:** TBD
**Group Meetup:** https://www.meetup.com/lost-our-box-game-developers/

## Tech Stack
- **Frontend:** React 19 + Vite + TypeScript
- **Styling:** Tailwind CSS v4
- **Auth & DB:** Supabase (Auth + PostgreSQL + Storage)
- **Hosting:** Netlify free plan
- **Serverless:** Netlify Functions (GitHub task sync)

## Development

```bash
# Install dependencies
npm install

# Create .env.local from .env.example and fill in values
cp .env.example .env.local

# Start dev server
npm run dev

# Build for production
npm run build
```

## Environment Variables
See `.env.example` for all required variables.

| Variable | Where to get it |
|----------|----------------|
| `VITE_SUPABASE_URL` | Supabase project settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase project settings → API |
| `SUPABASE_URL` | Same as above (server-side, no VITE_ prefix) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings → API (keep secret!) |
| `GITHUB_PAT` | GitHub → Settings → Developer Settings → Tokens (needs `read:project`, `repo`) |

## Database
Schema is in `supabase/migrations/001_initial_schema.sql`. Run the contents in your Supabase SQL Editor to set up all tables, enums, RLS policies, and triggers.

## Key Features
- **Home page** — Marketing for new contributors
- **Onboarding flow** — 4-step join process (profile → roles → agreement → access links)
- **Member dashboard** — Tasks, points, next meeting, quick links
- **Kanban board** — Embedded read-only view synced from GitHub Projects v2
- **Admin panel** — Manage projects, meetings, tasks, members, points
- **Social post tracking** — Members submit post URLs; admin approves and awards points
- **Profile / Earnings** — View past projects, points, and revenue share

## Project Phase
Currently building **Phase 1 (Core)**. See `plan.md` for the full phased roadmap.

## Directory Structure
```
src/
  lib/          -- Supabase client, GitHub helper, utilities
  types/        -- TypeScript types for all DB entities
  hooks/        -- useAuth, useProject, useTasks, usePoints
  components/   -- Navbar, Footer, ProtectedRoute, shared UI
  pages/        -- Route-level page components
    admin/      -- Admin-only pages
netlify/
  functions/    -- sync-github-tasks.ts
supabase/
  migrations/   -- SQL schema files
```

## Admin Access
Set `is_admin = true` on a user row in the `users` table after they sign up. First admin must be set manually via Supabase SQL Editor:
```sql
update public.users set is_admin = true where id = 'your-user-uuid';
```
