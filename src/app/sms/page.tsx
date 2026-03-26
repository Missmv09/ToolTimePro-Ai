import Link from 'next/link'

export const metadata = {
  title: 'SMS Terms & Opt-In | ToolTime Pro',
  description: 'ToolTime Pro SMS messaging terms, opt-in details, and how to manage text message notifications.',
}

export default function SmsPage() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <div className="bg-[#1a1a2e] text-white py-8">
        <div className="max-w-[900px] mx-auto px-6">
          <Link href="/" className="text-[#f5a623] font-bold text-lg hover:underline">
            &larr; ToolTime Pro
          </Link>
          <h1 className="text-3xl font-bold mt-4">SMS Messaging Terms &amp; Opt-In</h1>
          <p className="text-white/70 mt-2">Last updated: March 26, 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[900px] mx-auto px-6 py-12">
        <div className="bg-white rounded-xl p-8 shadow-sm space-y-8 text-[#1a1a2e] leading-relaxed">

          <section>
            <h2 className="text-xl font-bold mb-3">Program Name</h2>
            <p>ToolTime Pro Service Notifications</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">How You Opt In</h2>
            <p className="mb-4">
              When booking a service appointment through ToolTime Pro, customers are presented with an
              explicit opt-in checkbox to consent to receiving SMS/text message notifications. The
              checkbox is <strong>unchecked by default</strong> &mdash; you must actively check it to opt in.
              No SMS messages are sent without your explicit consent.
            </p>

            {/* Visual representation of the opt-in CTA */}
            <div className="border-2 border-dashed border-[#f5a623] rounded-xl p-6 bg-[#fef3d6]/50">
              <p className="text-sm font-bold text-[#5c5c70] mb-3 uppercase tracking-wide">Opt-In As Shown on Booking Page</p>
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
            <h2 className="text-xl font-bold mb-3">What Messages You Will Receive</h2>
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

          <section>
            <h2 className="text-xl font-bold mb-3">Message Frequency</h2>
            <p>
              Message frequency varies based on your service activity. You will typically receive
              1&ndash;5 messages per service appointment or customer interaction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Message and Data Rates</h2>
            <p>
              Standard message and data rates may apply depending on your mobile carrier and plan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">How to Opt Out</h2>
            <p>
              You can opt out of SMS notifications at any time by replying <strong>STOP</strong> to
              any message you receive from ToolTime Pro. You will receive a confirmation message and
              no further texts will be sent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">How to Get Help</h2>
            <p>
              Reply <strong>HELP</strong> to any message for assistance, or contact us at{' '}
              <strong>support@tooltimepro.com</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Supported Carriers</h2>
            <p>
              AT&amp;T, T-Mobile, Verizon, Sprint, and most major US carriers are supported.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Data Privacy</h2>
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
            <h2 className="text-xl font-bold mb-3">Contact Us</h2>
            <p>
              If you have questions about our SMS messaging program, please contact us at:
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
