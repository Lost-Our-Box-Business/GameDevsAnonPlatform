-- Update handle_new_user trigger for GitHub OAuth
-- GitHub OAuth sets raw_user_meta_data.name (full name) and raw_user_meta_data.user_name (handle)
-- but NOT display_name, which the old trigger relied on.
-- Also pre-populate github_username from OAuth metadata.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, display_name, github_username)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'user_name',
      SPLIT_PART(COALESCE(new.email, ''), '@', 1),
      'New Member'
    ),
    new.raw_user_meta_data->>'user_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
