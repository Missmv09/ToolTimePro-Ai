import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const MAIN_DOMAIN = 'tooltimepro.com'

export async function middleware(request: NextRequest) {
  // --- Subdomain → path redirect for customer sites ---
  // If *.tooltimepro.com is hit (e.g. saldana-sons.tooltimepro.com),
  // redirect to the path-based URL so the user lands on a working page.
  // Subdomains require wildcard DNS which isn't configured, so we
  // redirect rather than rewrite to give the user a URL that always works.
  const hostname = request.headers.get('host') || ''
  if (
    hostname.endsWith(`.${MAIN_DOMAIN}`) &&
    hostname !== `www.${MAIN_DOMAIN}` &&
    hostname !== MAIN_DOMAIN
  ) {
    const subdomain = hostname.replace(`.${MAIN_DOMAIN}`, '')
    return NextResponse.redirect(
      new URL(`/site/${subdomain}/`, `https://${MAIN_DOMAIN}`)
    )
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Skip middleware if Supabase isn't configured
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
    return supabaseResponse
  }

  // Check if any Supabase auth cookies exist. This app currently uses
  // localStorage for auth (client-side createClient), so cookies may not
  // be present. Only attempt a session refresh when cookies ARE present —
  // otherwise getUser() always returns null and we'd incorrectly block
  // authenticated users.
  const hasAuthCookies = request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.includes('auth')
  )

  if (!hasAuthCookies) {
    // No Supabase cookies — nothing to refresh, let the request through.
    // Client-side auth (localStorage) handles protection via AuthContext.
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // Refresh the auth session when cookies exist — validates the token
  // with Supabase Auth and sets updated cookies on the response.
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Run on all routes EXCEPT:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, static assets
     * - API routes (they use Bearer tokens, not cookies)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
