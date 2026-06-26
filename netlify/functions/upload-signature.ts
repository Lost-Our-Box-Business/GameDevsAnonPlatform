import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) }
  }

  const { project_id, image_base64 } = JSON.parse(event.body ?? '{}')
  if (!project_id || !image_base64) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'project_id and image_base64 required' }) }
  }

  const { data: member } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', project_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Not a member of this project' }) }
  }

  const path = `${project_id}/${user.id}.png`
  const buffer = Buffer.from(image_base64, 'base64')

  const { error: uploadError } = await supabase.storage
    .from('agreements')
    .upload(path, buffer, { contentType: 'image/png', upsert: true })

  if (uploadError) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Upload failed', details: uploadError.message }) }
  }

  const { data: urlData } = supabase.storage.from('agreements').getPublicUrl(path)

  return { statusCode: 200, headers, body: JSON.stringify({ url: urlData.publicUrl }) }
}