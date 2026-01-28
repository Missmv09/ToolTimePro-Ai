import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// SECURITY: Check if a key is a service_role key (should NEVER be used in browser)
// Service role keys contain "service_role" in the JWT payload when decoded
function isServiceRoleKey(key: string): boolean {
  if (!key || key === 'placeholder') return false
  try {
    // JWT format: header.payload.signature
    const parts = key.split('.')
    if (parts.length !== 3) return false
    // Decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]))
    return payload.role === 'service_role'
  } catch {
    return false
  }
}

// Client-side Supabase client (singleton)
// IMPORTANT: This client is for BROWSER use only and must use the ANON key
// The service_role key should NEVER be used here - it bypasses Row Level Security
let supabaseInstance: SupabaseClient | null = null

export const supabase = (() => {
  if (supabaseInstance) return supabaseInstance

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not configured')
  }

  // SECURITY CHECK: Prevent accidental use of service_role key in browser
  if (typeof window !== 'undefined' && isServiceRoleKey(supabaseAnonKey)) {
    console.error(
      'SECURITY ERROR: Service role key detected in browser! ' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY must be the anon/public key, NOT the service_role key. ' +
      'The service_role key bypasses Row Level Security and must never be exposed to browsers.'
    )
    throw new Error('Forbidden: Service role key cannot be used in browser')
  }

  supabaseInstance = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder')
  return supabaseInstance
})()

// Helper to get the current user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error('Error getting user:', error)
    return null
  }
  return user
}

// Helper to get the current session
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Error getting session:', error)
    return null
  }
  return session
}

// Auth helpers
export const auth = {
  signUp: async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    return { data, error }
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email)
    return { data, error }
  },
}
