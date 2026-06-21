'use client';

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function SmsPage() {
  const t = useTranslations('legal.sms');

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <div className="bg-[#1a1a2e] text-white py-8">
        <div className="max-w-[900px] mx-auto px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-[#f5a623] font-bold text-lg hover:underline">
              &larr; {t('backLink')}
            </Link>
            <LanguageSwitcher />
          </div>
          <h1 className="text-3xl font-extrabold mt-4 drop-shadow-lg">{t('title')}</h1>
          <p className="text-white/90 mt-2">{t('lastUpdated')}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[900px] mx-auto px-6 py-12">
        <div className="bg-white rounded-xl p-8 shadow-sm space-y-8 text-[#1a1a2e] leading-relaxed">

          <section>
            <h2 className="text-xl font-bold mb-3">{t('programName')}</h2>
            <p>ToolTime Pro Service Notifications</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t('howYouOptIn')}</h2>
            <p className="mb-4">
              When booking a service appointment through ToolTime Pro, customers are presented with an
              explicit opt-in checkbox to consent to receiving SMS/text message notifications. The
              checkbox is <strong>unchecked by default</strong> &mdash; you must actively check it to opt in.
              No SMS messages are sent without your explicit consent.
            </p>

            {/* Visual representation of the opt-in CTA */}
            <div className="border-2 border-dashed border-[#f5a623] rounded-xl p-6 bg-[#fef3d6]/50">
              <p className="text-sm font-bold text-[#5c5c70] mb-3 uppercase tracking-wide">{t('optInLabel')}</p>
              <div className="bg-[#fef3d6] rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked
                    readOnly
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-[#f5a623] focus:ring-[#f5a623] cursor-pointer"
                  />
                  <span className="text-sm text-[#1a1a2e]">
                    I agree to receive SMS/text message notifications about my appointment
                    (confirmations, reminders, and updates) from [Business Name] via ToolTime Pro.
                    Message and data rates may apply. Message frequency varies. Reply <strong>STOP</strong> to
                    opt out or <strong>HELP</strong> for help at any time.
                  </span>
                </label>
                <p className="text-xs text-[#5c5c70] mt-2 ml-8">
                  By checking this box, you consent to receive service-related text messages.
                  View our{' '}
                  <Link href="/privacy" className="text-[#f5a623] underline">
                    Privacy Policy
                  </Link>{' '}
                  and{' '}
                  <Link href="/terms" className="text-[#f5a623] underline">
                    Terms &amp; Conditions
                  </Link>.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t('whatMessages')}</h2>
            <p className="mb-2">
              If you opt in, you will receive service-related text messages including:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Appointment confirmations</li>
              <li>Appointment reminders</li>
              <li>Schedule updates (e.g., technician running late)</li>
              <li>Job completion notifications</li>
              <li>Review requests after service</li>
              <li>Quote and invoice notifications with links to view documents</li>
            </ul>
          </section>

          <section id="two-factor-authentication">
            <h2 className="text-xl font-bold mb-3">Two-Factor Authentication (2FA) SMS &mdash; Public Opt-In Walk-Through</h2>
            <p className="mb-2">
              If you enable two-factor authentication (2FA) in your ToolTime Pro account settings,
              you will receive SMS messages containing one-time verification codes when logging in
              from unrecognized devices. By affirmatively checking the unchecked SMS consent checkbox
              shown in Step 4 below, you explicitly consent to receive these security-related text messages.
            </p>
            <div className="border-l-4 border-[#f5a623] bg-[#fef3d6]/50 rounded-r-lg p-4 my-4">
              <p className="text-sm text-[#1a1a2e]">
                <strong>Public CTA evidence for A2P 10DLC reviewers:</strong> The screenshots below
                document the complete opt-in journey end-users follow to provide express written
                consent to receive 2FA SMS. No account or login is required to view this evidence.
                The opt-in CTA is highlighted in <strong>Step 4</strong>.
              </p>
            </div>

            <h3 className="font-bold mt-6 mb-3 text-lg">Step 1 &mdash; Sign in to ToolTime Pro and open the Dashboard</h3>
            <figure className="border border-gray-200 rounded-xl p-4 bg-white">
              <img
                src="/2fa-step-1.png"
                alt="Screenshot of the ToolTime Pro Dashboard after sign-in, showing the left navigation sidebar with the Settings menu item."
                className="w-full max-w-[820px] mx-auto rounded-lg border border-gray-200 shadow-sm"
                loading="lazy"
              />
              <figcaption className="text-xs text-[#5c5c70] mt-3 text-center">
                Account holders sign in at <strong>tooltimepro.com</strong> and are taken to the Dashboard.
                The <em>Settings</em> link is in the left navigation sidebar.
              </figcaption>
            </figure>

            <h3 className="font-bold mt-6 mb-3 text-lg">Step 2 &mdash; Open Settings and locate the Two-Factor Authentication card</h3>
            <figure className="border border-gray-200 rounded-xl p-4 bg-white">
              <img
                src="/2fa-step-2.png"
                alt="Screenshot of the ToolTime Pro Settings page with the Two-Factor Authentication card visible."
                className="w-full max-w-[820px] mx-auto rounded-lg border border-gray-200 shadow-sm"
                loading="lazy"
              />
              <figcaption className="text-xs text-[#5c5c70] mt-3 text-center">
                The <em>Two-Factor Authentication</em> card appears on the Settings page with a
                <em> Set Up 2FA</em> button.
              </figcaption>
            </figure>

            <h3 className="font-bold mt-6 mb-3 text-lg">Step 3 &mdash; Click &ldquo;Set Up 2FA&rdquo; and enter phone number</h3>
            <figure className="border border-gray-200 rounded-xl p-4 bg-white">
              <img
                src="/2fa.png"
                alt="Screenshot of the ToolTime Pro Two-Factor Authentication form showing the phone number entry field and the unchecked SMS consent checkbox with the full opt-in disclosure label."
                className="w-full max-w-[820px] mx-auto rounded-lg border border-gray-200 shadow-sm"
                loading="lazy"
              />
              <figcaption className="text-xs text-[#5c5c70] mt-3 text-center">
                Phone number entry field is shown above the consent checkbox. The checkbox is
                <strong> unchecked by default</strong> &mdash; no SMS is sent unless the user
                affirmatively checks it.
              </figcaption>
            </figure>

            <h3 className="font-bold mt-6 mb-3 text-lg">
              <span className="inline-block bg-[#f5a623] text-white px-2 py-0.5 rounded mr-2 text-sm">CTA</span>
              Step 4 &mdash; Affirmatively check the SMS consent box (the opt-in action)
            </h3>
            <figure className="border-2 border-[#f5a623] rounded-xl p-4 bg-[#fef3d6]/30">
              <img
                src="/2fa-step-4.png"
                alt="Screenshot of the ToolTime Pro Two-Factor Authentication form with the SMS consent checkbox now affirmatively checked by the user, indicating express written consent to receive 2FA SMS."
                className="w-full max-w-[820px] mx-auto rounded-lg border border-gray-200 shadow-sm"
                loading="lazy"
              />
              <figcaption className="text-xs text-[#1a1a2e] mt-3 text-center">
                <strong>This is the explicit opt-in CTA.</strong> The user has now checked the SMS
                consent box, providing express written consent. The exact disclosure text presented
                to the user reads:
              </figcaption>
              <blockquote className="text-xs italic text-[#1a1a2e] mt-2 mx-auto max-w-[700px] border-l-2 border-[#f5a623] pl-3">
                &ldquo;I agree to receive SMS text messages containing verification codes for
                two-factor authentication at the phone number provided above. Msg &amp; data rates
                may apply. Frequency varies based on login activity. Reply <strong>STOP</strong> to opt out
                or <strong>HELP</strong> for help at any time.&rdquo;
              </blockquote>
            </figure>

            <h3 className="font-bold mt-6 mb-3 text-lg">Step 5 &mdash; Click &ldquo;Enable 2FA&rdquo; to save consent</h3>
            <figure className="border border-gray-200 rounded-xl p-4 bg-white">
              <img
                src="/2fa-step-5.png"
                alt="Screenshot confirming Two-Factor Authentication SMS is now enabled on the account, with consent recorded."
                className="w-full max-w-[820px] mx-auto rounded-lg border border-gray-200 shadow-sm"
                loading="lazy"
              />
              <figcaption className="text-xs text-[#5c5c70] mt-3 text-center">
                After clicking <em>Enable 2FA</em>, consent is recorded with a timestamp and 2FA SMS
                is now active for the account. Users will receive a 6-digit code at the registered
                phone number the next time they log in from an unrecognized device.
              </figcaption>
            </figure>

            <h3 className="font-bold mt-6 mb-2">Sample 2FA messages</h3>
            <ul className="list-disc pl-6 space-y-1 mb-4 text-sm">
              <li><code className="bg-gray-100 px-1 rounded">Your ToolTime Pro verification code is: 123456. It expires in 10 minutes. Reply STOP to opt out, HELP for help. Msg&amp;Data rates may apply.</code></li>
              <li><code className="bg-gray-100 px-1 rounded">Your ToolTime Pro verification code is: 789012. It expires in 10 minutes. Reply STOP to opt out, HELP for help. Msg&amp;Data rates may apply.</code></li>
            </ul>

            <p className="mt-2">
              <strong>Message frequency:</strong> 2FA codes are only sent on login attempts from unrecognized
              devices (typically 0&ndash;3 messages per month per user).
            </p>
            <p className="mt-2">
              <strong>Opt out:</strong> Reply <strong>STOP</strong> to any 2FA message, or disable 2FA from
              your account settings at any time. Reply <strong>HELP</strong> for assistance.
            </p>
            <p className="mt-2">
              <strong>Privacy:</strong> Phone numbers and 2FA verification data are never sold, shared, or
              disclosed to third parties or affiliates for marketing or promotional purposes. See our{' '}
              <Link href="/privacy#2fa-sms" className="text-[#f5a623] hover:underline">Privacy Policy &mdash; 2FA SMS section</Link>{' '}
              for full details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t('messageFrequency')}</h2>
            <p>
              Message frequency varies based on your service activity. You will typically receive
              1&ndash;5 messages per service appointment or customer interaction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t('messageDataRates')}</h2>
            <p>
              Standard message and data rates may apply depending on your mobile carrier and plan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t('howToOptOut')}</h2>
            <p>
              You can opt out of SMS notifications at any time by replying <strong>STOP</strong> to
              any message you receive from ToolTime Pro. You will receive a confirmation message and
              no further texts will be sent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t('howToGetHelp')}</h2>
            <p>
              Reply <strong>HELP</strong> to any message for assistance, or contact us at{' '}
              <strong>support@tooltimepro.com</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t('supportedCarriers')}</h2>
            <p>
              AT&amp;T, T-Mobile, Verizon, Sprint, and most major US carriers are supported.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t('dataPrivacy')}</h2>
            <p>
              We do not sell, share, or use phone numbers or SMS data for marketing or advertising
              purposes. Phone numbers are only used to deliver service-related notifications on behalf
              of the business you booked with. For full details, see our{' '}
              <Link href="/privacy" className="text-[#f5a623] hover:underline">Privacy Policy</Link>{' '}
              and{' '}
              <Link href="/terms" className="text-[#f5a623] hover:underline">Terms &amp; Conditions</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{t('contactUs')}</h2>
            <p>
              {t('contactQuestion')}
            </p>
            <p className="mt-2">
              <strong>Email:</strong> support@tooltimepro.com<br />
              <strong>Website:</strong>{' '}
              <a href="https://tooltimepro.com" className="text-[#f5a623] hover:underline">
                tooltimepro.com
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
