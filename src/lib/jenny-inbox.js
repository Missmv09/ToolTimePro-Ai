// Owner-side of the Jenny Pro SMS inbox.
//
// Jenny answers texts on her own, but the contractor needs to be able to jump
// into any thread and reply as a human — "can I text my customer back" is the
// first thing a Housecall Pro / GoHighLevel switcher asks. When the owner
// replies, Jenny steps back for a takeover window so the two never talk over
// each other; the owner can hand the thread back to her at any time.

const { sendSMS } = require('./twilio');

/** How long Jenny stays quiet on a thread after the owner replies. */
const HUMAN_TAKEOVER_HOURS = 4;

const MAX_SMS_LENGTH = 1200; // Twilio concatenates; keep the owner from pasting a novel

/**
 * Is a human currently driving this conversation?
 * @param {{ human_takeover_until?: string|null } | null | undefined} conversation
 * @param {Date} [now]
 */
function isHumanTakeoverActive(conversation, now = new Date()) {
  const until = conversation?.human_takeover_until;
  if (!until) return false;
  const ts = new Date(until).getTime();
  return Number.isFinite(ts) && ts > now.getTime();
}

function takeoverDeadline(now = new Date()) {
  return new Date(now.getTime() + HUMAN_TAKEOVER_HOURS * 3600 * 1000).toISOString();
}

/**
 * Load a conversation and confirm it belongs to the caller's company. Every
 * inbox mutation goes through this so a forged conversationId can never reach
 * another tenant's customer.
 */
async function loadOwnedConversation(supabase, companyId, conversationId) {
  if (!conversationId) return { error: 'conversationId is required' };
  const { data, error } = await supabase
    .from('jenny_sms_conversations')
    .select('id, company_id, customer_phone, customer_name, message_count, status, human_takeover_until')
    .eq('id', conversationId)
    .eq('company_id', companyId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: 'Conversation not found' };
  return { conversation: data };
}

/**
 * Send a human reply on a Jenny thread.
 *
 * @param {object} opts
 * @param {object} opts.supabase   service-role client
 * @param {string} opts.companyId
 * @param {string} opts.userId     the owner/admin sending the reply
 * @param {string} opts.conversationId
 * @param {string} opts.body
 * @returns {Promise<{ ok: boolean, error?: string, messageId?: string, takeoverUntil?: string }>}
 */
async function sendOwnerReply({ supabase, companyId, userId, conversationId, body }) {
  const text = String(body || '').trim();
  if (!text) return { ok: false, error: 'Message is required' };
  if (text.length > MAX_SMS_LENGTH) return { ok: false, error: `Message is too long (max ${MAX_SMS_LENGTH} characters)` };

  const { conversation, error: loadError } = await loadOwnedConversation(supabase, companyId, conversationId);
  if (loadError) return { ok: false, error: loadError };

  const result = await sendSMS({ to: conversation.customer_phone, body: text });
  if (!result.success) return { ok: false, error: result.error || 'Failed to send SMS' };

  const now = new Date();
  const takeoverUntil = takeoverDeadline(now);

  const { error: msgError } = await supabase.from('jenny_sms_messages').insert({
    conversation_id: conversation.id,
    direction: 'outbound',
    body: text,
    twilio_sid: result.messageId || null,
    status: 'sent',
    sender: 'owner',
    sent_by: userId || null,
  });
  if (msgError) console.error('[jenny-inbox] failed to log owner reply:', msgError.message);

  const { error: convError } = await supabase
    .from('jenny_sms_conversations')
    .update({
      last_message: text,
      last_message_at: now.toISOString(),
      status: 'active',
      message_count: (conversation.message_count || 0) + 1,
      human_takeover_until: takeoverUntil,
      updated_at: now.toISOString(),
    })
    .eq('id', conversation.id);
  if (convError) console.error('[jenny-inbox] failed to update conversation:', convError.message);

  return { ok: true, messageId: result.messageId, takeoverUntil };
}

/**
 * Close a thread. Jenny starts a fresh conversation the next time this
 * customer texts (the webhook ignores resolved threads).
 */
async function resolveConversation({ supabase, companyId, conversationId }) {
  const { conversation, error } = await loadOwnedConversation(supabase, companyId, conversationId);
  if (error) return { ok: false, error };
  const { error: updError } = await supabase
    .from('jenny_sms_conversations')
    .update({ status: 'resolved', human_takeover_until: null, updated_at: new Date().toISOString() })
    .eq('id', conversation.id);
  if (updError) return { ok: false, error: updError.message };
  return { ok: true };
}

/** Let Jenny answer this thread again. */
async function handBackToJenny({ supabase, companyId, conversationId }) {
  const { conversation, error } = await loadOwnedConversation(supabase, companyId, conversationId);
  if (error) return { ok: false, error };
  const { error: updError } = await supabase
    .from('jenny_sms_conversations')
    .update({
      human_takeover_until: null,
      status: conversation.status === 'resolved' ? 'active' : conversation.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversation.id);
  if (updError) return { ok: false, error: updError.message };
  return { ok: true };
}

/** Owner wants Jenny quiet on this thread (without sending anything yet). */
async function takeOverConversation({ supabase, companyId, conversationId }) {
  const { conversation, error } = await loadOwnedConversation(supabase, companyId, conversationId);
  if (error) return { ok: false, error };
  const takeoverUntil = takeoverDeadline();
  const { error: updError } = await supabase
    .from('jenny_sms_conversations')
    .update({ human_takeover_until: takeoverUntil, status: 'active', updated_at: new Date().toISOString() })
    .eq('id', conversation.id);
  if (updError) return { ok: false, error: updError.message };
  return { ok: true, takeoverUntil };
}

module.exports = {
  HUMAN_TAKEOVER_HOURS,
  isHumanTakeoverActive,
  takeoverDeadline,
  sendOwnerReply,
  resolveConversation,
  handBackToJenny,
  takeOverConversation,
};
