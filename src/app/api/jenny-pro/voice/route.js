import { getServiceSupabase, resolveCompany, buildSay, voiceResponse } from '@/lib/jenny-voice';
import { pickGreeting } from '@/lib/jenny-greeting';

export const dynamic = 'force-dynamic';

// Health check — confirms the endpoint is live for a browser/validator. Twilio POSTs here.
export async function GET() {
  return new Response('Jenny voice webhook is live. Twilio sends inbound calls here via POST.', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

/**
 * Primary inbound-call webhook for Jenny Pro voice.
 *
 * Behavior (the "missed call" half):
 *   - If the company has an escalation/cell number, Jenny tries to connect the
 *     caller to the owner first. If the owner doesn't pick up, /after-dial
 *     texts the caller to keep the lead alive (missed call → booking).
 *   - If there's no owner number, the AI receptionist answers directly.
 *
 * Configure as the Twilio number's "A Call Comes In" webhook:
 *   POST https://yourdomain.com/api/jenny-pro/voice
 */
export async function POST(request) {
  try {
    const form = await request.formData();
    const to = form.get('To');

    const supabase = getServiceSupabase();
    const company = await resolveCompany(supabase, to);
    if (!company) {
      return voiceResponse(buildSay("Sorry, we can't take your call right now. Please try again later.", 'en'));
    }

    const { data: settings } = await supabase
      .from('jenny_pro_settings')
      .select('escalation_phone, language, business_hours_greeting, after_hours_greeting')
      .eq('company_id', company.id)
      .maybeSingle();

    const lang = settings?.language === 'es' ? 'es' : 'en';
    const { greeting, isCustom } = pickGreeting({ settings, company, lang });

    // If we have the owner's number, ring them first, then fall back to Jenny.
    if (settings?.escalation_phone) {
      const connecting = lang === 'es'
        ? 'Un momento, le conectamos con nuestro equipo.'
        : 'One moment while we connect you with our team.';
      const dial =
        `<Dial timeout="18" action="/api/jenny-pro/voice/after-dial" method="POST">` +
        `<Number>${settings.escalation_phone}</Number>` +
        `</Dial>`;
      // A tenant's custom greeting is spoken before the transfer attempt.
      const intro = isCustom ? buildSay(greeting, lang) : '';
      return voiceResponse(intro + buildSay(connecting, lang) + dial);
    }

    // No owner number — go straight to the AI receptionist.
    return voiceResponse(
      buildSay(greeting, lang) +
        `<Redirect method="POST">/api/jenny-pro/voice/gather</Redirect>`
    );
  } catch (error) {
    console.error('[Jenny Voice] Error:', error);
    return voiceResponse(buildSay('Sorry, something went wrong. Please call again.', 'en'));
  }
}
