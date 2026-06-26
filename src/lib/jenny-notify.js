// Operator notifications for Jenny Pro events (new booking, new lead, missed call).
//
// Notifies the contractor in-app for every user on the company, and optionally
// fires a heads-up SMS to their escalation/cell number.

const { sendSMS } = require('./twilio');

/**
 * Create an in-app notification for every user on a company.
 *
 * @param {object} supabase - service-role client
 * @param {object} params - { companyId, type, title, message, link }
 */
async function notifyOperatorInApp(supabase, { companyId, type, title, message, link }) {
  try {
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('company_id', companyId);

    if (!users || users.length === 0) return;

    const rows = users.map((u) => ({
      company_id: companyId,
      user_id: u.id,
      type,
      title,
      message,
      link: link || null,
    }));

    await supabase.from('notifications').insert(rows);
  } catch (err) {
    console.error('[jenny-notify] in-app notify failed:', err.message);
  }
}

/**
 * Send a heads-up SMS to the operator's escalation number (their own phone).
 * Best-effort: failures never block the customer-facing flow.
 */
async function notifyOperatorSMS(escalationPhone, body) {
  if (!escalationPhone) return;
  try {
    await sendSMS({ to: escalationPhone, body });
  } catch (err) {
    console.error('[jenny-notify] operator SMS failed:', err.message);
  }
}

module.exports = { notifyOperatorInApp, notifyOperatorSMS };
