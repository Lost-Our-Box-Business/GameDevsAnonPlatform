-- Allow unauthenticated (guest) voting and feedback for live pitch day events

-- pitch_votes: make user_id nullable, add guest_token, update constraints
ALTER TABLE pitch_votes
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS guest_token uuid;

ALTER TABLE pitch_votes
  DROP CONSTRAINT IF EXISTS pitch_votes_pitch_item_id_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS pitch_votes_user_item
  ON pitch_votes(pitch_item_id, user_id) WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pitch_votes_guest_item
  ON pitch_votes(pitch_item_id, guest_token) WHERE guest_token IS NOT NULL;

-- pitch_feedback: make user_id nullable, add guest_token, update constraints
ALTER TABLE pitch_feedback
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS guest_token uuid;

ALTER TABLE pitch_feedback
  DROP CONSTRAINT IF EXISTS pitch_feedback_pitch_item_id_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS pitch_feedback_user_item
  ON pitch_feedback(pitch_item_id, user_id) WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pitch_feedback_guest_item
  ON pitch_feedback(pitch_item_id, guest_token) WHERE guest_token IS NOT NULL;

-- Open RLS for live event access
DROP POLICY IF EXISTS "user manage own votes" ON pitch_votes;
DROP POLICY IF EXISTS "authenticated read votes" ON pitch_votes;

CREATE POLICY "read votes" ON pitch_votes FOR SELECT USING (true);
CREATE POLICY "insert votes" ON pitch_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "delete votes" ON pitch_votes FOR DELETE USING (
  (user_id IS NOT NULL AND auth.uid() = user_id) OR user_id IS NULL
);

DROP POLICY IF EXISTS "user manage own feedback" ON pitch_feedback;
DROP POLICY IF EXISTS "admin read all feedback" ON pitch_feedback;

CREATE POLICY "read feedback" ON pitch_feedback FOR SELECT USING (true);
CREATE POLICY "insert feedback" ON pitch_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "update feedback" ON pitch_feedback FOR UPDATE USING (true);
