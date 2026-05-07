ALTER TABLE pitch_sessions
  ADD COLUMN IF NOT EXISTS tiebreaker_item_ids uuid[];
