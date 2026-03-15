import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    // Check if user has 2FA enabled
    const { data: userData } = await supabase
      .from('users')
      .select('two_fa_enabled')
      .eq('id', user.id)
      .single()

    if (!userData?.two_fa_enabled) {
      return NextResponse.json({ required: false })
    }

    // Check device token
    const { deviceToken } = await request.json()

    if (!deviceToken) {
      return NextResponse.json({ required: true, trusted: false })
    }

    const { data: device } = await supabase
      .from('trusted_devices')
      .select('id')
      .eq('user_id', user.id)
      .eq('device_token', deviceToken)
      .single()

    if (device) {
      // Update last used timestamp
      await supabase
        .from('trusted_devices')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', device.id)

      return NextResponse.json({ required: true, trusted: true })
    }

    return NextResponse.json({ required: true, trusted: false })
  } catch (err) {
    console.error('2FA check-device error:', err)
    // Fail open — don't lock users out if check fails
    return NextResponse.json({ required: false })
  }
}
