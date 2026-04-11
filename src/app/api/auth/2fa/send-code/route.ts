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

    // Get user's 2FA phone
    const { data: userData } = await supabase
      .from('users')
      .select('two_fa_enabled, two_fa_phone')
      .eq('id', user.id)
      .single()

    if (!userData?.two_fa_enabled || !userData?.two_fa_phone) {
      return NextResponse.json({ error: '2FA not configured' }, { status: 400 })
    }

    // Generate 6-digit code using cryptographically secure random
    const code = (crypto.randomInt(100000, 999999 + 1)).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Invalidate any existing unused codes for this user
    await supabase
      .from('two_fa_codes')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('used', false)

    // Store the new code
    const { error: insertError } = await supabase
      .from('two_fa_codes')
      .insert({
        user_id: user.id,
        code,
        expires_at: expiresAt.toISOString(),
      })

    if (insertError) {
      console.error('Failed to store 2FA code:', insertError)
      return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 })
    }

    // Send SMS via Twilio (2FA verification - user consented during setup)
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken2 = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER
    // Prefer shared A2P campaign SID; fall back to legacy 2FA-specific SID
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_2FA_MESSAGING_SERVICE_SID

    if (!accountSid || !authToken2 || (!fromNumber && !messagingServiceSid)) {
      return NextResponse.json({ error: 'SMS service not configured' }, { status: 500 })
    }

    const Twilio = (await import('twilio')).default
    const twilioClient = Twilio(accountSid, authToken2)

    // Format phone to E.164
    const digits = userData.two_fa_phone.replace(/\D/g, '')
    const toPhone = digits.length === 10 ? `+1${digits}` :
      digits.length === 11 && digits.startsWith('1') ? `+${digits}` :
      userData.two_fa_phone.startsWith('+') ? userData.two_fa_phone : `+${digits}`

    const smsBody = `Your ToolTime Pro verification code is: ${code}. It expires in 10 minutes. Reply STOP to opt out, HELP for help. Msg&Data rates may apply.`

    // Prefer messaging service SID (linked to 2FA A2P campaign) over raw phone number
    if (messagingServiceSid) {
      await twilioClient.messages.create({
        body: smsBody,
        to: toPhone,
        messagingServiceSid,
      })
    } else {
      await twilioClient.messages.create({
        body: smsBody,
        to: toPhone,
        from: fromNumber!,
      })
    }

    // Return masked phone for UI
    const phoneLast4 = userData.two_fa_phone.slice(-4)

    return NextResponse.json({ sent: true, phoneLast4 })
  } catch (err) {
    console.error('2FA send-code error:', err)
    return NextResponse.json({ error: 'Failed to send code' }, { status: 500 })
  }
}
