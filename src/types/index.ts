export type ProjectStatus = 'active' | 'completed' | 'archived'
export type PointSource = 'task' | 'social_post' | 'bonus' | 'penalty'
export type SocialPlatform = 'x' | 'instagram' | 'tiktok' | 'youtube'
export type PostStatus = 'pending' | 'approved' | 'rejected'

export interface User {
  id: string
  display_name: string
  discord_name: string | null
  github_username: string | null
  is_admin: boolean
  created_at: string
}

export interface Project {
  id: string
  title: string
  slug: string
  status: ProjectStatus
  description: string | null
  cover_image_url: string | null
  steam_url: string | null
  github_repo_url: string | null
  github_repo_owner: string | null
  github_repo_name: string | null
  github_project_number: number | null
  github_project_owner_type: string
  drive_folder_url: string | null
  discord_invite_url: string | null
  discord_channel_id: string | null
  hashtag: string | null
  gdd_content: string | null
  profit_share_text: string | null
  created_at: string
  released_at: string | null
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  roles: string[]
  joined_at: string
  agreement_acknowledged_at: string | null
  agreement_ip: string | null
  agreement_signature_url: string | null
  agreement_text_snapshot: string | null
  onboarding_completed_at: string | null
  users?: User
}

export interface PointLedgerEntry {
  id: string
  project_id: string
  user_id: string
  source: PointSource
  points: number
  reference_id: string | null
  note: string | null
  awarded_by: string | null
  created_at: string
}

export interface Meeting {
  id: string
  project_id: string
  title: string
  date: string
  location: string | null
  meetup_url: string | null
  description: string | null
  created_at: string
}

export interface GitHubTask {
  id: string
  project_id: string
  github_issue_number: number | null
  github_project_item_id: string | null
  title: string
  description: string | null
  status: string | null
  assignee_github_username: string | null
  assignee_user_id: string | null
  points: number
  labels: string[]
  html_url: string | null
  last_synced_at: string
  users?: User
}

export interface SocialPost {
  id: string
  project_id: string
  user_id: string
  platform: SocialPlatform
  post_url: string
  submitted_at: string
  status: PostStatus
  reviewed_by: string | null
  reviewed_at: string | null
  points_awarded: number | null
  review_note: string | null
  users?: User
  projects?: Project
}

export interface ProjectRevenue {
  id: string
  project_id: string
  amount_cents: number
  currency: string
  platform: string | null
  period_start: string | null
  period_end: string | null
  recorded_at: string
  recorded_by: string | null
}

export interface PointsSummary {
  userPoints: number
  totalPoints: number
  sharePercent: number
}

export type PitchSessionStatus = 'setup' | 'pitching' | 'voting' | 'closed'
export type PitchSubPhase = 'presenting' | 'qa' | 'feedback'
export type PitchResultDisplay = 'winner' | 'pie_chart'

export interface PitchSession {
  id: string
  title: string
  status: PitchSessionStatus
  pitch_timer_seconds: number | null
  qa_timer_seconds: number | null
  voting_timer_seconds: number | null
  enable_feedback: boolean
  result_display: PitchResultDisplay
  votes_per_user: number
  max_votes_per_entry: number | null
  current_pitch_item_id: string | null
  current_sub_phase: PitchSubPhase | null
  phase_started_at: string | null
  tiebreaker_item_ids: string[] | null
  created_by: string | null
  created_at: string
}

export interface PitchItem {
  id: string
  session_id: string
  name: string
  pitcher_name: string
  pitcher_email: string
  order_index: number
  pitched_at: string | null
  created_at: string
}

export interface PitchFeedback {
  id: string
  session_id: string
  pitch_item_id: string
  user_id: string
  feasibility: number | null
  originality: number | null
  money_potential: number | null
  fun_to_play: number | null
  fun_to_make: number | null
  pitching_skills: number | null
  comments: string | null
  created_at: string
}

export interface PitchVote {
  id: string
  session_id: string
  pitch_item_id: string
  user_id: string
  created_at: string
}
