'use client';

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function TermsPage() {
  const t = useTranslations('legal.terms');

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
            <h2 className="text-xl font-bold mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the ToolTime Pro platform (&quot;Service&quot;), you agree to be bound by these
              Terms &amp; Conditions. If you do not agree to these terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">2. Description of Service</h2>
            <p>
              ToolTime Pro is a business management platform designed for home service professionals. The Service
              includes quoting, invoicing, scheduling, dispatch, customer management, team management, and
              communication tools including SMS and email notifications.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">3. Account Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You are responsible for all activities that occur under your account.</li>
              <li>You must provide accurate and complete information when creating your account.</li>
              <li>You must notify us immediately of any unauthorized use of your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">4. SMS/Text Messaging Terms</h2>
            <p className="mb-2">
              By using our SMS features, you agree to the following:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Program Name:</strong> ToolTime Pro Service Notifications</li>
              <li><strong>Message Types:</strong> Quote notifications, invoice notifications, appointment confirmations and reminders, job updates, and review requests.</li>
              <li><strong>Message Frequency:</strong> Varies based on service activity. Typically 1-5 messages per customer interaction.</li>
              <li><strong>Message and Data Rates:</strong> Standard message and data rates may apply depending on your mobile carrier.</li>
              <li><strong>Opt-Out:</strong> Reply STOP to any message to unsubscribe from SMS notifications.</li>
              <li><strong>Help:</strong> Reply HELP to any message for assistance, or contact support@tooltimepro.com.</li>
              <li><strong>Supported Carriers:</strong> AT&amp;T, T-Mobile, Verizon, Sprint, and most major US carriers.</li>
            </ul>
            <p className="mt-3">
              As a business user, you are responsible for obtaining proper SMS consent from your customers
              before enabling text message notifications. You must clearly inform customers that they will
              receive service-related text messages and provide them the option to opt in or opt out.
            </p>
            <p className="mt-2">
              SMS data and phone numbers are not shared with third parties for marketing purposes.
              Phone numbers are only used for delivering service notifications on behalf of your business.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">5. Acceptable Use</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the Service for any unlawful purpose or in violation of any regulations.</li>
              <li>Send unsolicited or spam messages through the platform.</li>
              <li>Attempt to gain unauthorized access to other users&apos; accounts or data.</li>
              <li>Use the Service to transmit harmful, offensive, or misleading content.</li>
              <li>Resell or redistribute the Service without authorization.</li>
              <li>Interfere with or disrupt the Service or its infrastructure.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">6. Data Ownership</h2>
            <p>
              You retain ownership of all business data, customer information, and content you create or upload
              to the platform. We do not claim ownership of your data. We use your data only to provide and
              improve the Service as described in our{' '}
              <Link href="/privacy" className="text-[#f5a623] hover:underline">Privacy Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">7. Payment Terms</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Subscription fees are billed on a recurring basis according to your chosen plan.</li>
              <li>All fees are non-refundable unless otherwise stated.</li>
              <li>We reserve the right to change pricing with 30 days&apos; notice.</li>
              <li>Failure to pay may result in suspension or termination of your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">8. Service Availability</h2>
            <p>
              We strive to maintain high availability but do not guarantee uninterrupted access to the Service.
              We may perform scheduled maintenance, updates, or experience unforeseen outages. We are not
              liable for any losses resulting from Service unavailability.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, ToolTime Pro shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages, including loss of profits, data, or
              business opportunities, arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">10. Termination</h2>
            <p>
              Either party may terminate this agreement at any time. You may cancel your account through the
              platform settings or by contacting support. Upon termination, your access to the Service will
              cease, and your data may be deleted after a reasonable retention period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">11. Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. Material changes will be communicated via email or a
              notice within the platform. Continued use of the Service after changes constitutes acceptance
              of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of
              California, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">13. Contact Us</h2>
            <p>
              If you have questions about these Terms, please contact us at:
            </p>
            <p className="mt-2">
              <strong>Email:</strong> support@tooltimepro.com<br />
              <strong>Website:</strong> <a href="https://tooltimepro.com" className="text-[#f5a623] hover:underline">tooltimepro.com</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
