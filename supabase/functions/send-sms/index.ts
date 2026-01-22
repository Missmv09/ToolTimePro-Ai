import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error('Missing Twilio credentials')
    }

    const {
      to,
      message,
      // Optional structured data for quote SMS
      customer_name,
      quote_total,
      quote_url,
      business_name,
      type = 'generic' // 'generic', 'quote', 'reminder', 'review_request'
    } = await req.json()

    // Format phone number (ensure +1 for US)
    const toPhone = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '')}`

    // Build message based on type
    let smsBody = message

    if (type === 'quote' && !message) {
      smsBody = `Hi ${customer_name}! Here's your quote from ${business_name} for $${quote_total}. View & approve here: ${quote_url}`
    } else if (type === 'reminder' && !message) {
      smsBody = `Hi ${customer_name}! This is a reminder about your upcoming appointment with ${business_name}. Reply CONFIRM to confirm or call us to reschedule.`
    } else if (type === 'review_request' && !message) {
      smsBody = `Hi ${customer_name}! Thanks for choosing ${business_name}! We'd love your feedback. Leave us a quick review: ${quote_url}`
    }

    if (!smsBody) {
      throw new Error('Message content is required')
    }

    // Send via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: toPhone,
        From: TWILIO_PHONE_NUMBER,
        Body: smsBody,
      }),
    })

    const result = await response.json()

    if (response.ok) {
      console.log('SMS sent successfully:', result.sid)
      return new Response(
        JSON.stringify({
          success: true,
          message_sid: result.sid,
          to: toPhone,
          status: result.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } else {
      console.error('Twilio error:', result)
      throw new Error(result.message || 'Failed to send SMS')
    }

  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
