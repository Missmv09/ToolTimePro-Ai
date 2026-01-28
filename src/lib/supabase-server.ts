import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Server-side Supabase client singleton (uses service role key)
let supabaseAdmin: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdmin) {
    return supabaseAdmin
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables')
  }

  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return supabaseAdmin
}
