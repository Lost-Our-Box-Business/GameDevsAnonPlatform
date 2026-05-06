import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const GITHUB_PAT = process.env.GITHUB_PAT!

async function githubGraphQL(query: string, variables: Record<string, unknown>) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
  const json = await res.json()
  if (json.errors) throw new Error(json.errors.map((e: any) => e.message).join(', '))
  return json.data
}

const ORG_PROJECT_QUERY = /* graphql */`
  query GetOrgProject($owner: String!, $number: Int!, $after: String) {
    organization(login: $owner) {
      projectV2(number: $number) {
        items(first: 100, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            content {
              ... on Issue {
                number title body url state
                assignees(first: 3) { nodes { login } }
                labels(first: 5) { nodes { name } }
              }
              ... on DraftIssue { title body }
            }
            fieldValues(first: 15) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  field { ... on ProjectV2SingleSelectField { name } }
                }
                ... on ProjectV2ItemFieldNumberValue {
                  number
                  field { ... on ProjectV2NumberField { name } }
                }
              }
            }
          }
        }
      }
    }
  }
`

const USER_PROJECT_QUERY = /* graphql */`
  query GetUserProject($owner: String!, $number: Int!, $after: String) {
    user(login: $owner) {
      projectV2(number: $number) {
        items(first: 100, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            content {
              ... on Issue {
                number title body url state
                assignees(first: 3) { nodes { login } }
                labels(first: 5) { nodes { name } }
              }
              ... on DraftIssue { title body }
            }
            fieldValues(first: 15) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  field { ... on ProjectV2SingleSelectField { name } }
                }
                ... on ProjectV2ItemFieldNumberValue {
                  number
                  field { ... on ProjectV2NumberField { name } }
                }
              }
            }
          }
        }
      }
    }
  }
`

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  }

  const projectId = event.queryStringParameters?.project_id
  if (!projectId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'project_id required' }) }
  }

  const { data: project, error: projError } = await supabase
    .from('projects')
    .select('id, github_repo_owner, github_repo_name, github_project_number, github_project_owner_type')
    .eq('id', projectId)
    .single()

  if (projError || !project) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Project not found' }) }
  }

  if (!project.github_repo_owner || !project.github_project_number) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Project missing GitHub project number config' }) }
  }

  const isOrg = project.github_project_owner_type === 'org'
  const query = isOrg ? ORG_PROJECT_QUERY : USER_PROJECT_QUERY

  try {
    // Fetch all project items directly from the GitHub project board
    const items: any[] = []
    let after: string | null = null

    do {
      const data = await githubGraphQL(query, {
        owner: project.github_repo_owner,
        number: project.github_project_number,
        after,
      })
      const projectData = isOrg ? data.organization?.projectV2 : data.user?.projectV2
      if (!projectData) throw new Error('Project not found on GitHub — check owner, number, and owner type')
      const page = projectData.items
      if (!page) break
      items.push(...page.nodes)
      after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null
    } while (after)

    // Fetch existing tasks to preserve manually-set point values
    const { data: existingTasks } = await supabase
      .from('github_tasks')
      .select('github_issue_number, points')
      .eq('project_id', projectId)

    const pointsMap = new Map(
      (existingTasks ?? []).map(t => [t.github_issue_number, t.points])
    )

    // Fetch users for assignee resolution
    const { data: users } = await supabase
      .from('users')
      .select('id, github_username')
      .not('github_username', 'is', null)

    const userMap = new Map((users ?? []).map(u => [u.github_username?.toLowerCase(), u.id]))

    // Collect all unique field names seen (for debugging)
    const fieldsFound = new Set<string>()

    // Transform project items into task records (skip draft issues with no issue number)
    const taskRecords = items
      .filter((item: any) => item.content?.number != null)
      .map((item: any) => {
        const issue = item.content
        const assigneeLogin = issue.assignees?.nodes?.[0]?.login
        const fieldNodes: any[] = item.fieldValues?.nodes ?? []

        fieldNodes.forEach((fv: any) => {
          const name = fv?.field?.name
          if (name) fieldsFound.add(name)
        })

        const statusField = fieldNodes.find(
          (fv: any) => fv?.field?.name?.toLowerCase() === 'status'
        )
        const pointField = fieldNodes.find(
          (fv: any) => fv?.field?.name?.toLowerCase() === 'point value'
        )

        // Prefer GitHub's Point value field; fall back to manually-set Supabase value
        const points = pointField?.number ?? pointsMap.get(issue.number) ?? 0

        return {
          project_id: projectId,
          github_issue_number: issue.number,
          github_project_item_id: item.id,
          title: issue.title,
          description: (issue.body ?? '').slice(0, 2000) || null,
          status: statusField?.name ?? (issue.state === 'CLOSED' ? 'Done' : 'Todo'),
          assignee_github_username: assigneeLogin ?? null,
          assignee_user_id: assigneeLogin ? (userMap.get(assigneeLogin.toLowerCase()) ?? null) : null,
          points,
          labels: issue.labels?.nodes?.map((l: any) => l.name) ?? [],
          html_url: issue.url,
          last_synced_at: new Date().toISOString(),
        }
      })

    if (taskRecords.length > 0) {
      const { error: upsertError } = await supabase
        .from('github_tasks')
        .upsert(taskRecords, { onConflict: 'github_project_item_id' })

      if (upsertError) throw upsertError
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        synced: taskRecords.length,
        fields_found: Array.from(fieldsFound).sort(),
      }),
    }
  } catch (err: any) {
    console.error('GitHub sync error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message ?? 'Sync failed' }),
    }
  }
}
