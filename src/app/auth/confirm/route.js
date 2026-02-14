import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  // Default redirect if something goes wrong
  const fallbackUrl = `${origin}/auth/login`

  // Need at least a code or token_hash to proceed
  if (!code && !token_hash) {
    return NextResponse.redirect(fallbackUrl)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(fallbackUrl)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  try {
    let session = null

    // PKCE flow: exchange code for session
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        console.error('Code exchange failed:', error.message)
        return NextResponse.redirect(fallbackUrl)
      }
      session = data.session
    }

    // Magic link / OTP flow: verify with token hash
    if (token_hash && type) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type,
      })
      if (error) {
        console.error('OTP verification failed:', error.message)
        return NextResponse.redirect(fallbackUrl)
      }
      session = data.session
    }

    if (!session?.user) {
      return NextResponse.redirect(fallbackUrl)
    }

    // Check if user has completed onboarding
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', session.user.id)
      .single()

    if (userData?.company_id) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('onboarding_completed')
        .eq('id', userData.company_id)
        .single()

      if (companyData?.onboarding_completed) {
        return NextResponse.redirect(`${origin}/dashboard`)
      }
    }

    // New user or onboarding not completed — go to onboarding
    return NextResponse.redirect(`${origin}/onboarding`)

  } catch (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(fallbackUrl)
  }
}
