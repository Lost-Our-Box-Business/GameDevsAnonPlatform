# Lost Our Box — Game Dev Group Web Platform

## Project Directory
`D:\Dropbox\PC Backup\L-O-B\Game Devs Anon Platform`

All source files, CLAUDE.md, and this plan live in that directory.

## Context
Brandon runs a weekly game dev meetup (Lost Our Box) that follows a structured process from pitch day to game release. The current process relies on manual steps across Discord, SignNow, GitHub, Google Drive, and email. The goal is a web platform that:
- Markets the group on a public home page to recruit contributors
- Guides new members through project onboarding end-to-end (agreement, roles, access links)
- Serves as a central dashboard (tasks, points, next meeting, project links)
- Tracks social media marketing contributions via manual submission + admin approval
- Archives past project history and each member's earnings

**Key decisions made:**
- Social media: manual post submission + admin approval queue (avoids $100+/mo API costs)
- Contracts: in-platform text + checkbox acknowledgment + timestamp; Brandon sends actual SignNow doc separately
- GitHub kanban: embedded read-only board synced from GitHub Projects v2, GitHub stays source of truth
- Build: phased — ship Phase 1 (core) first, then Phase 2 (enrichment), then Phase 3 (social)

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Frontend | React + Vite + TypeScript | SPA compatible with Netlify free plan |
| Styling | Tailwind CSS + shadcn/ui | Fast UI, pre-built accessible components |
| Routing | React Router v6 | Client-side SPA routing |
| Auth | **Supabase Auth** (not Netlify Identity) | Both are GoTrue; using one instance avoids bridging two JWT systems |
| Database | Supabase (PostgreSQL + RLS) | Free tier, 500MB, real-time capable |
| File storage | Supabase Storage | GDD docs, cover images |
| Serverless | Netlify Functions | GitHub API sync (on-demand, not scheduled — free tier) |
| Hosting | Netlify free plan | Static SPA deploy |

---

## Database Schema

```sql
-- Extends Supabase auth.users
users
  id uuid pk (= auth.users.id)
  display_name text
  discord_name text
  github_username text
  is_admin boolean default false
  created_at timestamptz

projects
  id uuid pk
  title text
  slug text unique          -- used in URLs: /projects/bullet-barrage
  status enum('active','completed','archived')
  description text
  cover_image_url text
  steam_url text
  github_repo_url text
  github_repo_owner text    -- for API calls
  github_repo_name text
  github_project_number int -- GitHub Project number for GraphQL
  drive_folder_url text
  discord_invite_url text
  discord_channel_id text
  hashtag text              -- e.g. #BulletBarrage
  gdd_content text          -- markdown stored in DB
  profit_share_text text    -- agreement text displayed in onboarding
  created_at timestamptz
  released_at timestamptz

project_members
  id uuid pk
  project_id uuid fk projects
  user_id uuid fk users
  roles text[]              -- ['programmer','artist','designer','lead']
  joined_at timestamptz
  agreement_acknowledged_at timestamptz
  agreement_ip text
  onboarding_completed_at timestamptz

point_ledger               -- single source of truth for all points
  id uuid pk
  project_id uuid fk projects
  user_id uuid fk users
  source enum('task','social_post','bonus','penalty')
  points integer
  reference_id text         -- github task id or social_post id
  note text
  awarded_by uuid fk users  -- null = system/auto
  created_at timestamptz

meetings
  id uuid pk
  project_id uuid fk projects
  title text
  date timestamptz
  location text
  meetup_url text
  description text

github_tasks               -- cache of GitHub project items
  id uuid pk
  project_id uuid fk projects
  github_issue_number int
  github_project_item_id text unique
  title text
  description text
  status text               -- kanban column name from GitHub
  assignee_github_username text
  assignee_user_id uuid fk users  -- resolved from github_username
  points int                -- stored here, not on GitHub
  labels text[]
  html_url text
  last_synced_at timestamptz

social_posts               -- member-submitted marketing posts
  id uuid pk
  project_id uuid fk projects
  user_id uuid fk users
  platform enum('x','instagram','tiktok','youtube')
  post_url text
  submitted_at timestamptz
  status enum('pending','approved','rejected')
  reviewed_by uuid fk users
  reviewed_at timestamptz
  points_awarded int
  review_note text

project_revenue            -- entered by admin for earnings calc
  id uuid pk
  project_id uuid fk projects
  amount_cents int
  currency text default 'USD'
  platform text             -- 'steam', 'itch', etc.
  period_start date
  period_end date
  recorded_at timestamptz
  recorded_by uuid fk users
```

RLS policies: members can read their own project data; admins can write everything; anonymous can read active projects list and home page content.

---

## Phase 1 — Core Platform

### 1. Project Setup
**Files to create:**
```
/
├── src/
│   ├── lib/supabase.ts         -- Supabase client singleton
│   ├── lib/github.ts           -- GitHub GraphQL helper
│   ├── hooks/useAuth.ts
│   ├── hooks/useProject.ts
│   ├── hooks/useTasks.ts
│   ├── hooks/usePoints.ts
│   ├── components/             -- shared UI
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Projects.tsx
│   │   ├── ProjectDetail.tsx
│   │   ├── Onboarding.tsx      -- multi-step join flow
│   │   ├── Dashboard.tsx       -- member project view
│   │   ├── Profile.tsx
│   │   └── admin/
│   │       ├── AdminLayout.tsx
│   │       ├── ProjectAdmin.tsx
│   │       ├── MeetingsAdmin.tsx
│   │       └── TasksAdmin.tsx
│   ├── App.tsx                 -- routes
│   └── main.tsx
├── netlify/functions/
│   └── sync-github-tasks.ts   -- callable serverless function
├── netlify.toml               -- SPA redirect + function config
└── vite.config.ts
```

### 2. Public Home Page (`/`)
- Hero: group name, tagline, CTA to see projects
- "How It Works" section: 3–4 card summary of the process (pitch → build → release)
- Current project spotlight: cover art, title, brief description, join CTA
- Past projects gallery: grid of completed games, each linking to Steam
- Footer: Meetup link, Discord link

### 3. Projects Listing (`/projects`)
- Cards for each active project (cover, title, status, member count)
- Section for completed projects
- Public — no login required to browse

### 4. Onboarding Flow (`/projects/:slug/join`) — multi-step
**Step 1 — Profile check**
- If not logged in → prompt to sign up / log in (Supabase Auth email or magic link)
- After auth, confirm display name, Discord name, GitHub username

**Step 2 — Select roles**
- Checkboxes: Programmer, Artist, Designer, Sound, Project Lead, Other
- Saves to `project_members.roles`

**Step 3 — Profit Share Agreement**
- Display `project.profit_share_text` in a scrollable box (max-height, scrollbar visible)
- Checkbox: "I have read and agree to the profit share agreement for [Project Title]"
- On submit: write `agreement_acknowledged_at` (timestamptz) to `project_members`
- Show notice: "A copy of the formal agreement will be sent to your email for signature."

**Step 4 — You're in! Access links**
- GitHub repo card: URL + instructions to clone (git clone, SSH vs HTTPS toggle)
- GitHub Project (kanban): link labeled "View the Project Board"
- Discord: invite link with instructions to say "I just joined via the platform" in #introductions
- Google Drive: link to project folder
- "Go to my dashboard" button

### 5. Member Dashboard (`/projects/:slug`)
Protected route — must be a project member.

Layout:
```
[Project Title + cover]
┌─────────────────────────────────────────────────────┐
│ Next Meeting                                         │
│ Thursday, May 8 · 7:00 PM · [Location] · [RSVP →]  │
└─────────────────────────────────────────────────────┘
┌─────────────────┐  ┌───────────────────────────────┐
│ My Points        │  │ Quick Links                   │
│ 340 / 2,100 pts  │  │ [GitHub Repo] [Kanban]        │
│ 16.2% share      │  │ [Discord]     [Google Drive]  │
└─────────────────┘  └───────────────────────────────┘
[My Assigned Tasks — cards from github_tasks]
[Team Task Board — phase 2]
```

### 6. GitHub Task Sync (Netlify Function)
File: `netlify/functions/sync-github-tasks.ts`
- Accepts `project_id` in query params
- Reads `github_repo_owner`, `github_repo_name`, `github_project_number` from Supabase
- Calls GitHub GraphQL API with a PAT stored in `GITHUB_PAT` env var
- Upserts results into `github_tasks` table
- Returns task count
- Triggered by a "Refresh" button in the dashboard (not scheduled — free tier compatible)

GitHub GraphQL query fetches: issue number, title, body, html_url, assignees, labels, and the Status field value from the project board.

### 7. Admin Panel (`/admin`)
Protected by `users.is_admin = true`.

**Project Admin:**
- Create project (fill all fields, paste profit share text as markdown)
- Edit project details (links, hashtag, GDD content)
- Set project status (active → completed → archived)

**Tasks Admin:**
- View all `github_tasks` for a project
- Assign a point value to each task (stored in Supabase `github_tasks.points`)
- Manually link `assignee_github_username` to a platform user if auto-resolve fails

**Meetings Admin:**
- Create/edit/delete meeting entries

**Members Admin:**
- See all project members, their roles, agreement status
- Manually award bonus points (creates `point_ledger` entry with source='bonus')

---

## Phase 2 — Enrichment

### Embedded Kanban Board (`/projects/:slug/board`)
- Read `github_tasks` from Supabase (already synced)
- Group tasks into columns by `status` value (e.g., Todo, In Progress, Done)
- Each card shows: title, assignee avatar, point value, labels
- Click card → opens GitHub issue in new tab
- "Sync with GitHub" button → calls sync-github-tasks function, refreshes view
- Component: `src/components/KanbanBoard.tsx`

### GDD Display
- Render `project.gdd_content` as markdown using `react-markdown` + `remark-gfm`
- Full-page view: `src/pages/GDD.tsx`
- Linked from project dashboard and onboarding completion screen

### Profile Page (`/profile`)
- User info (editable: display name, Discord, GitHub username)
- Table: past projects → points earned → % share → estimated earnings
- Earnings formula: `(user_points / total_project_points) * total_revenue_cents / 100`

### Revenue Entry (Admin)
- Admin can add `project_revenue` entries per project
- Earnings shown on profile are calculated live from ledger + revenue records

---

## Phase 3 — Social Media Marketing

### Social Post Submission (`/projects/:slug/social`)
- Form: select platform (X / Instagram / TikTok / YouTube), paste post URL
- Optional: note field ("used hashtag #BulletBarrage and tagged the Steam page")
- Submits to `social_posts` with `status = 'pending'`
- Shows member's past submissions with their status

### Admin Approval Queue (`/admin/social`)
- List of pending posts across all projects
- Each entry: member name, platform, post URL (linked), submitted date
- Actions: Approve (set points, write point_ledger entry) / Reject (with note)
- Approved posts update member's point total automatically

---

## GitHub API Integration Notes

Environment variable needed: `GITHUB_PAT` (classic PAT with `read:project` and `repo` scopes, or fine-grained PAT)

The sync function uses GitHub's GraphQL endpoint `https://api.github.com/graphql`. Key fields to extract from `ProjectV2Item`:
- `content { ... on Issue { number, title, body, url, assignees, labels } }`
- `fieldValues { ... on ProjectV2ItemFieldSingleSelectValue { name } }` for Status column

Assignee resolution: when syncing, attempt to match `assignee_github_username` against `users.github_username` in Supabase and populate `assignee_user_id`.

---

## Deployment & Environment Variables

**Netlify:**
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
GITHUB_PAT=                    # server-side only (not VITE_ prefixed)
```

**netlify.toml:**
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[functions]
  directory = "netlify/functions"
```

---

## Verification Plan

**Phase 1 end-to-end test:**
1. Visit home page as anonymous — confirm public content loads, login not required
2. Click a project → Projects page → click "Join This Project"
3. Sign up with email → confirm redirect back to onboarding
4. Complete all 4 onboarding steps — verify `project_members` row created with agreement timestamp
5. Navigate to `/projects/:slug` dashboard — confirm next meeting, points (0/total), quick links display
6. Admin: trigger "Sync with GitHub" → confirm tasks appear in `github_tasks` and on dashboard
7. Admin: assign points to a task, mark it complete → confirm `point_ledger` entry created, user's point total updates

**Phase 2:**
8. Open kanban board — confirm columns match GitHub project board
9. Profile page shows past project with correct points and earnings %

**Phase 3:**
10. Submit a social post → appears in admin queue as pending
11. Admin approves → points appear in member's ledger and profile total
