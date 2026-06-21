// Wire an existing Twilio number to a company so Jenny answers on it.
//
// Used when a port-in completes (the number already lives in the Twilio account
// by SID): point its voice + SMS webhooks at Jenny, attach it to the A2P
// Messaging Service for SMS deliverability, and save the number → company map.

/**
 * @param {object} opts
 * @param {object} opts.client - Twilio client
 * @param {object} opts.supabase - service-role Supabase client
 * @param {string} opts.companyId
 * @param {string} opts.phoneNumberSid - Twilio IncomingPhoneNumber SID
 * @param {string} opts.phoneNumber - E.164 number
 * @param {string} opts.baseUrl - absolute app base URL (no trailing slash)
 * @param {string} [opts.messagingServiceSid]
 * @returns {Promise<{ attachedToCampaign: boolean }>}
 */
async function wireNumberToCompany({ client, supabase, companyId, phoneNumberSid, phoneNumber, baseUrl, messagingServiceSid }) {
  // 1. Point the number's webhooks at Jenny.
  await client.incomingPhoneNumbers(phoneNumberSid).update({
    voiceUrl: `${baseUrl}/api/jenny-pro/voice`,
    voiceMethod: 'POST',
    smsUrl: `${baseUrl}/api/jenny-pro/sms-webhook`,
    smsMethod: 'POST',
  });

  // 2. Attach to the A2P Messaging Service (best-effort).
  let attachedToCampaign = false;
  if (messagingServiceSid) {
    try {
      await client.messaging.v1
        .services(messagingServiceSid)
        .phoneNumbers.create({ phoneNumberSid });
      attachedToCampaign = true;
    } catch (e) {
      console.error('[wire] Messaging Service attach failed:', e.message);
    }
  }

  // 3. Save the number → company mapping.
  await supabase.from('company_phone_numbers').upsert(
    {
      company_id: companyId,
      phone_number: phoneNumber,
      label: 'jenny',
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'phone_number' }
  );

  return { attachedToCampaign };
}

module.exports = { wireNumberToCompany };
