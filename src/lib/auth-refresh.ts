import type { SupabaseClient } from '@supabase/supabase-js'

export const SESSION_EXPIRED_MESSAGE =
  'Your session expired. Redirecting to the login page…'

export async function getFreshAccessToken(
  supabase: SupabaseClient
): Promise<string | null> {
  try {
    const { data: refreshed } = await supabase.auth.refreshSession()
    if (refreshed?.session?.access_token) {
      return refreshed.session.access_token
    }
  } catch {
    // fall through to getSession
  }

  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}

export function redirectToLogin(delayMs = 1500): void {
  if (typeof window === 'undefined') return
  const redirect = encodeURIComponent(
    window.location.pathname + window.location.search
  )
  setTimeout(() => {
    window.location.href = `/auth/login?redirect=${redirect}`
  }, delayMs)
}
