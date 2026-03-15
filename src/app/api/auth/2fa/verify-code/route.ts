import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 })
    }

    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { code, trustDevice, deviceLabel } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    // Find the most recent unused, non-expired code
    const { data: codeRow } = await supabase
      .from('two_fa_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!codeRow) {
      return NextResponse.json({ error: 'Code expired or invalid. Please request a new code.' }, { status: 400 })
    }

    if (codeRow.code !== code.trim()) {
      return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 400 })
    }

    // Mark code as used
    await supabase
      .from('two_fa_codes')
      .update({ used: true })
      .eq('id', codeRow.id)

    let deviceToken: string | undefined

    // Trust this device if requested
    if (trustDevice) {
      deviceToken = crypto.randomUUID()

      const { error: deviceError } = await supabase
        .from('trusted_devices')
        .insert({
          user_id: user.id,
          device_token: deviceToken,
          device_label: deviceLabel || 'Unknown device',
        })

      if (deviceError) {
        console.error('Failed to save trusted device:', deviceError)
        // Don't fail the verification over this
      }
    }

    return NextResponse.json({ verified: true, deviceToken })
  } catch (err) {
    console.error('2FA verify-code error:', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
