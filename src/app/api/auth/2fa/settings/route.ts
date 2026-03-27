import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function getAuthUser(request: Request) {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

// GET - Get 2FA settings for the current user
export async function GET(request: Request) {
  try {
    const token = getAuthUser(request)
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

    const { data: userData } = await supabase
      .from('users')
      .select('two_fa_enabled, two_fa_phone')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      enabled: userData?.two_fa_enabled || false,
      phone: userData?.two_fa_phone || null,
    })
  } catch (error) {
    console.error('2FA settings error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST - Enable 2FA
export async function POST(request: Request) {
  try {
    const token = getAuthUser(request)
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

    const { phone } = await request.json()

    if (!phone || typeof phone !== 'string' || phone.replace(/\D/g, '').length < 10) {
      return NextResponse.json({ error: 'Valid phone number required' }, { status: 400 })
    }

    // Update user with 2FA settings
    const { error: updateError } = await supabase
      .from('users')
      .update({
        two_fa_enabled: true,
        two_fa_phone: phone,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to enable 2FA:', updateError)
      return NextResponse.json({ error: 'Failed to enable 2FA' }, { status: 500 })
    }

    return NextResponse.json({ success: true, enabled: true })
  } catch (error) {
    console.error('2FA settings error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE - Disable 2FA and remove trusted devices
export async function DELETE(request: Request) {
  try {
    const token = getAuthUser(request)
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

    // Disable 2FA
    await supabase
      .from('users')
      .update({ two_fa_enabled: false, two_fa_phone: null })
      .eq('id', user.id)

    // Remove all trusted devices
    await supabase
      .from('trusted_devices')
      .delete()
      .eq('user_id', user.id)

    // Remove unused codes
    await supabase
      .from('two_fa_codes')
      .delete()
      .eq('user_id', user.id)

    return NextResponse.json({ success: true, enabled: false })
  } catch (error) {
    console.error('2FA settings error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
