import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Rate limiting: max 5 failed attempts per user per 15 minutes
const failedAttempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): { limited: boolean; remaining: number } {
  const now = Date.now()
  const entry = failedAttempts.get(userId)
  if (!entry || now > entry.resetAt) {
    return { limited: false, remaining: 5 }
  }
  if (entry.count >= 5) {
    return { limited: true, remaining: 0 }
  }
  return { limited: false, remaining: 5 - entry.count }
}

function recordFailedAttempt(userId: string) {
  const now = Date.now()
  const entry = failedAttempts.get(userId)
  if (!entry || now > entry.resetAt) {
    failedAttempts.set(userId, { count: 1, resetAt: now + 15 * 60 * 1000 })
  } else {
    entry.count++
  }
}

function clearFailedAttempts(userId: string) {
  failedAttempts.delete(userId)
}

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

    // Check rate limit before processing
    const rateCheck = checkRateLimit(user.id)
    if (rateCheck.limited) {
      return NextResponse.json({
        error: 'Too many failed attempts. Please wait 15 minutes and request a new code.',
      }, { status: 429 })
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
      recordFailedAttempt(user.id)
      return NextResponse.json({ error: 'Code expired or invalid. Please request a new code.' }, { status: 400 })
    }

    if (codeRow.code !== code.trim()) {
      recordFailedAttempt(user.id)
      const remaining = checkRateLimit(user.id).remaining
      return NextResponse.json({
        error: `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      }, { status: 400 })
    }

    // Successful verification - clear failed attempts
    clearFailedAttempts(user.id)

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
