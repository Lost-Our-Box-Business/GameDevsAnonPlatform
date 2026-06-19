-- Add Discord and GitHub team assignment fields to projects
-- Add Discord user ID to users for role assignment via bot API
-- All ADD COLUMN IF NOT EXISTS — no existing data is altered or deleted

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS github_team_slug text,
  ADD COLUMN IF NOT EXISTS discord_role_id text;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS discord_user_id text;

-- Allow admins to generate signed URLs for the private agreements storage bucket
CREATE POLICY "admins read agreements" ON storage.objects FOR SELECT
  USING (bucket_id = 'agreements' AND (SELECT is_admin FROM public.users WHERE id = auth.uid()));