import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const GITHUB_PAT = process.env.GITHUB_PAT!
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  // Verify caller via Supabase JWT
  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
  }
  const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !caller) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) }
  }

  const body = JSON.parse(event.body ?? '{}')
  const { project_id, user_id } = body
  if (!project_id || !user_id) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'project_id and user_id required' }) }
  }

  // Caller must be the user themselves or an admin
  if (caller.id !== user_id) {
    const { data: callerRow } = await supabase.from('users').select('is_admin').eq('id', caller.id).single()
    if (!callerRow?.is_admin) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) }
    }
  }

  // Fetch project config
  const { data: project } = await supabase
    .from('projects')
    .select('github_repo_owner, github_team_slug, discord_role_id')
    .eq('id', project_id)
    .single()

  // Fetch member's GitHub username and Discord user ID
  const { data: member } = await supabase
    .from('users')
    .select('github_username, discord_user_id')
    .eq('id', user_id)
    .single()

  const results: { github: string; discord: string } = { github: 'skipped', discord: 'skipped' }

  // GitHub team assignment
  const { github_repo_owner, github_team_slug } = project ?? {}
  const { github_username } = member ?? {}
  if (github_repo_owner && github_team_slug && github_username && GITHUB_PAT) {
    try {
      const res = await fetch(
        `https://api.github.com/orgs/${github_repo_owner}/teams/${github_team_slug}/memberships/${github_username}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${GITHUB_PAT}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role: 'member' }),
        }
      )
      results.github = res.ok ? 'ok' : `error ${res.status}`
    } catch (e: any) {
      results.github = `error: ${e.message}`
    }
  }

  // Discord role assignment
  const { discord_role_id } = project ?? {}
  const { discord_user_id } = member ?? {}
  if (discord_role_id && discord_user_id && DISCORD_BOT_TOKEN && DISCORD_GUILD_ID) {
    try {
      const res = await fetch(
        `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discord_user_id}/roles/${discord_role_id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      )
      results.discord = res.ok ? 'ok' : `error ${res.status}`
    } catch (e: any) {
      results.discord = `error: ${e.message}`
    }
  }

  return { statusCode: 200, headers, body: JSON.stringify(results) }
}