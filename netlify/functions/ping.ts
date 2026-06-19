import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const handler: Handler = async () => {
  await supabase.from('projects').select('id').limit(1)
  return { statusCode: 200, body: 'ok' }
}