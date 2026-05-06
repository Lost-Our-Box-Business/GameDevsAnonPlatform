-- ============================================================
-- Lost Our Box — Game Dev Platform Schema
-- Run this in your Supabase SQL Editor (or via Supabase CLI)
-- ============================================================

-- Enums
create type project_status as enum ('active', 'completed', 'archived');
create type point_source as enum ('task', 'social_post', 'bonus', 'penalty');
create type social_platform as enum ('x', 'instagram', 'tiktok', 'youtube');
create type post_status as enum ('pending', 'approved', 'rejected');

-- ============================================================
-- Users (extends auth.users)
-- ============================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  discord_name text,
  github_username text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create user profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- Projects
-- ============================================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  status project_status not null default 'active',
  description text,
  cover_image_url text,
  steam_url text,
  github_repo_url text,
  github_repo_owner text,
  github_repo_name text,
  github_project_number integer,
  github_project_owner_type text not null default 'user', -- 'user' or 'org'
  drive_folder_url text,
  discord_invite_url text,
  discord_channel_id text,
  hashtag text,
  gdd_content text,
  profit_share_text text,
  created_at timestamptz not null default now(),
  released_at timestamptz
);

-- ============================================================
-- Project Members
-- ============================================================
create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  roles text[] not null default '{}',
  joined_at timestamptz not null default now(),
  agreement_acknowledged_at timestamptz,
  agreement_ip text,
  onboarding_completed_at timestamptz,
  unique(project_id, user_id)
);

-- ============================================================
-- Point Ledger
-- ============================================================
create table public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  source point_source not null,
  points integer not null,
  reference_id text,
  note text,
  awarded_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Meetings
-- ============================================================
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  date timestamptz not null,
  location text,
  meetup_url text,
  description text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- GitHub Tasks (cache of GitHub project items)
-- ============================================================
create table public.github_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  github_issue_number integer,
  github_project_item_id text unique,
  title text not null,
  description text,
  status text,
  assignee_github_username text,
  assignee_user_id uuid references public.users(id),
  points integer default 0,
  labels text[] default '{}',
  html_url text,
  last_synced_at timestamptz not null default now()
);

-- ============================================================
-- Social Posts (member-submitted marketing)
-- ============================================================
create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  platform social_platform not null,
  post_url text not null,
  submitted_at timestamptz not null default now(),
  status post_status not null default 'pending',
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  points_awarded integer,
  review_note text
);

-- ============================================================
-- Project Revenue (admin-entered, for earnings calculations)
-- ============================================================
create table public.project_revenue (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  amount_cents integer not null,
  currency text not null default 'USD',
  platform text,
  period_start date,
  period_end date,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references public.users(id)
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.point_ledger enable row level security;
alter table public.meetings enable row level security;
alter table public.github_tasks enable row level security;
alter table public.social_posts enable row level security;
alter table public.project_revenue enable row level security;

-- Helper: is the current user an admin?
create or replace function is_admin()
returns boolean as $$
  select coalesce((select is_admin from public.users where id = auth.uid()), false);
$$ language sql security definer;

-- Helper: is the current user a member of a project?
create or replace function is_project_member(proj_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.project_members
    where project_id = proj_id and user_id = auth.uid()
  );
$$ language sql security definer;

-- Users
create policy "Users can read own profile" on public.users
  for select using (id = auth.uid() or is_admin());
create policy "Users can update own profile" on public.users
  for update using (id = auth.uid());
create policy "Admins can manage users" on public.users
  for all using (is_admin());

-- Projects: public read for active/completed; full admin access
create policy "Anyone can read projects" on public.projects
  for select using (status in ('active', 'completed'));
create policy "Admins can manage projects" on public.projects
  for all using (is_admin());

-- Project members
create policy "Members can read their memberships" on public.project_members
  for select using (user_id = auth.uid() or is_admin());
create policy "Users can join projects" on public.project_members
  for insert with check (user_id = auth.uid());
create policy "Users can update own membership" on public.project_members
  for update using (user_id = auth.uid() or is_admin());
create policy "Admins can manage members" on public.project_members
  for all using (is_admin());

-- Point ledger
create policy "Members can read their points" on public.point_ledger
  for select using (user_id = auth.uid() or is_project_member(project_id) or is_admin());
create policy "Admins can manage points" on public.point_ledger
  for all using (is_admin());

-- Meetings: members of the project can read
create policy "Project members can read meetings" on public.meetings
  for select using (is_project_member(project_id) or is_admin());
create policy "Admins can manage meetings" on public.meetings
  for all using (is_admin());

-- GitHub tasks
create policy "Project members can read tasks" on public.github_tasks
  for select using (is_project_member(project_id) or is_admin());
create policy "Admins can manage tasks" on public.github_tasks
  for all using (is_admin());

-- Social posts
create policy "Users can read own posts" on public.social_posts
  for select using (user_id = auth.uid() or is_admin());
create policy "Users can submit posts" on public.social_posts
  for insert with check (user_id = auth.uid());
create policy "Admins can manage social posts" on public.social_posts
  for all using (is_admin());

-- Project revenue
create policy "Admins can manage revenue" on public.project_revenue
  for all using (is_admin());
create policy "Members can read project revenue" on public.project_revenue
  for select using (is_project_member(project_id) or is_admin());

-- ============================================================
-- Indexes for common queries
-- ============================================================
create index on public.project_members(project_id);
create index on public.project_members(user_id);
create index on public.point_ledger(project_id, user_id);
create index on public.github_tasks(project_id);
create index on public.github_tasks(assignee_user_id);
create index on public.meetings(project_id, date);
create index on public.social_posts(project_id, status);
