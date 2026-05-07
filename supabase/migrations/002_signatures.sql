ALTER TABLE project_members
  ADD COLUMN IF NOT EXISTS agreement_signature_url text,
  ADD COLUMN IF NOT EXISTS agreement_text_snapshot text;
