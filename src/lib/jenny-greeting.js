// Which greeting Jenny speaks when a call comes in.
//
// Tenants configure `business_hours_greeting` / `after_hours_greeting` in the
// Jenny Pro settings page. Until this helper existed the voice webhook never
// read either column: every call got the built-in template, so paying Jenny
// Pro customers' custom greetings were dead configuration.
//
// "Open" is decided from the company's business hours and timezone
// (Settings → Company), never from the server's clock/zone.

const { t } = require('./jenny-language');
const { resolveBusinessHours, isOpenAt } = require('./business-hours');

/**
 * @param {object} opts
 * @param {object|null} opts.settings  - jenny_pro_settings row (greeting columns)
 * @param {object|null} opts.company   - { name, business_hours, timezone }
 * @param {'en'|'es'} opts.lang
 * @param {Date} [opts.now]
 * @returns {{ open: boolean, greeting: string, isCustom: boolean }}
 */
function pickGreeting({ settings, company, lang, now = new Date() }) {
  const hours = resolveBusinessHours(company?.business_hours);
  const open = isOpenAt(hours, company?.timezone, now);
  const custom = open
    ? settings?.business_hours_greeting
    : settings?.after_hours_greeting;
  const text = typeof custom === 'string' && custom.trim() ? custom.trim() : '';
  return {
    open,
    greeting: text || t(lang).voiceGreeting(company?.name || 'our office'),
    isCustom: !!text,
  };
}

module.exports = { pickGreeting };
