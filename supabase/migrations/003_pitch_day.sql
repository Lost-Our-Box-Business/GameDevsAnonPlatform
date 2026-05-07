-- Pitch Day Voting System
-- Sessions are standalone (not tied to a project)

CREATE TABLE pitch_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'setup', -- 'setup' | 'pitching' | 'feedback' | 'voting' | 'closed'
  -- settings (editable while status='setup')
  pitch_timer_seconds int,
  qa_timer_seconds int,
  voting_timer_seconds int,
  enable_feedback boolean NOT NULL DEFAULT true,
  result_display text NOT NULL DEFAULT 'winner', -- 'winner' | 'pie_chart'
  votes_per_user int NOT NULL DEFAULT 1,
  max_votes_per_entry int,
  -- live state
  current_pitch_item_id uuid,
  current_sub_phase text,        -- 'presenting' | 'qa' | null
  phase_started_at timestamptz,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pitch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES pitch_sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  pitcher_name text NOT NULL,
  pitcher_email text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  pitched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pitch_sessions
  ADD CONSTRAINT fk_current_pitch_item
  FOREIGN KEY (current_pitch_item_id) REFERENCES pitch_items(id);

CREATE TABLE pitch_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES pitch_sessions(id) ON DELETE CASCADE,
  pitch_item_id uuid NOT NULL REFERENCES pitch_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  feasibility smallint CHECK (feasibility BETWEEN 1 AND 5),
  originality smallint CHECK (originality BETWEEN 1 AND 5),
  money_potential smallint CHECK (money_potential BETWEEN 1 AND 5),
  fun_to_play smallint CHECK (fun_to_play BETWEEN 1 AND 5),
  fun_to_make smallint CHECK (fun_to_make BETWEEN 1 AND 5),
  pitching_skills smallint CHECK (pitching_skills BETWEEN 1 AND 5),
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pitch_item_id, user_id)
);

CREATE TABLE pitch_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES pitch_sessions(id) ON DELETE CASCADE,
  pitch_item_id uuid NOT NULL REFERENCES pitch_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pitch_item_id, user_id)
);

-- Indexes
CREATE INDEX idx_pitch_items_session ON pitch_items(session_id);
CREATE INDEX idx_pitch_feedback_item ON pitch_feedback(pitch_item_id);
CREATE INDEX idx_pitch_votes_session ON pitch_votes(session_id);
CREATE INDEX idx_pitch_votes_user ON pitch_votes(user_id);

-- RLS
ALTER TABLE pitch_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitch_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitch_votes ENABLE ROW LEVEL SECURITY;

-- Sessions: non-setup sessions are public; setup-only visible to admins
CREATE POLICY "public read pitch_sessions" ON pitch_sessions
  FOR SELECT USING (
    status <> 'setup'
    OR (SELECT is_admin FROM users WHERE id = auth.uid())
  );
CREATE POLICY "admin write pitch_sessions" ON pitch_sessions
  FOR ALL USING ((SELECT is_admin FROM users WHERE id = auth.uid()));

-- Items: visible when session is not in setup
CREATE POLICY "public read pitch_items" ON pitch_items
  FOR SELECT USING (
    (SELECT status FROM pitch_sessions WHERE id = session_id) <> 'setup'
    OR (SELECT is_admin FROM users WHERE id = auth.uid())
  );
CREATE POLICY "admin write pitch_items" ON pitch_items
  FOR ALL USING ((SELECT is_admin FROM users WHERE id = auth.uid()));

-- Feedback: users manage their own rows; admins read all (to compile emails)
CREATE POLICY "user manage own feedback" ON pitch_feedback
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "admin read all feedback" ON pitch_feedback
  FOR SELECT USING ((SELECT is_admin FROM users WHERE id = auth.uid()));

-- Votes: users manage their own; all authenticated can read (for total count)
CREATE POLICY "user manage own votes" ON pitch_votes
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "authenticated read votes" ON pitch_votes
  FOR SELECT USING (auth.uid() IS NOT NULL);
