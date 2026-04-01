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
          <h1 className="text-3xl font-extrabold mt-4 drop-shadow-lg">SMS Messaging Terms &amp; Opt-In</h1>
          <p className="text-white/90 mt-2">Last updated: April 1, 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[900px] mx-auto px-6 py-12">
        <div className="bg-white rounded-xl p-8 shadow-sm space-y-8 text-[#1a1a2e] leading-relaxed">

          <section>
            <h2 className="text-xl font-bold mb-3">Brand Identification</h2>
            <p>
              <strong>ToolTime Pro</strong> is a field service management platform operated by ToolTime Pro, Inc.
              SMS messages are sent on behalf of contractors and service businesses that use the ToolTime Pro
              platform to manage appointments, communicate with customers, and send service notifications.
              All messages are sent from ToolTime Pro&apos;s registered business phone number(s).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Program Name</h2>
            <p>ToolTime Pro Service Notifications</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">How You Opt In (All Consent Methods)</h2>
            <p className="mb-4">
              ToolTime Pro collects SMS consent through the following methods. <strong>No SMS messages are
              sent to any end user without prior express consent.</strong>
            </p>

            {/* Method 1: Web Booking Form */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-2">1. Web Booking Form (Primary Method)</h3>
              <p className="mb-3">
                When booking a service appointment at <code>tooltimepro.com/book/[companyId]</code>,
                customers are presented with an explicit opt-in checkbox. The checkbox is
                <strong> unchecked by default</strong> &mdash; the customer must actively check it to consent.
                Consent is recorded with a timestamp in our database.
              </p>

              {/* Visual representation of the opt-in CTA */}
              <div className="border-2 border-dashed border-[#f5a623] rounded-xl p-6 bg-[#fef3d6]/50">
                <p className="text-sm font-bold text-[#5c5c70] mb-3 uppercase tracking-wide">
                  Screenshot: Opt-In Checkbox on Booking Page
                </p>
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
            </div>

            {/* Method 2: Customer-Initiated Inbound SMS */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-2">2. Customer-Initiated Inbound Text Message</h3>
              <p>
                Customers may initiate a conversation by texting the business&apos;s ToolTime Pro phone number
                directly. When a customer sends an inbound text message to the business, they are
                initiating contact and implicitly consenting to receive a reply. The business owner
                reviews and responds to inbound messages through the ToolTime Pro dashboard. These
                are conversational, one-to-one exchanges &mdash; not automated marketing messages.
                The first reply to an inbound message includes opt-out instructions
                (&quot;Reply STOP to opt out&quot;).
              </p>
            </div>

            {/* Method 3: In-Person / Verbal */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-2">3. In-Person or Verbal Consent (Contractor-Collected)</h3>
              <p>
                Service contractors using ToolTime Pro may collect verbal or written consent in person
                (e.g., at a job site or during an estimate). In these cases, the contractor records
                the customer&apos;s phone number and consent status in the ToolTime Pro system. The
                platform requires the contractor to confirm consent before any SMS can be sent.
                Contractors are instructed to inform the customer: &quot;You will receive text message
                updates about your service from [Business Name] via ToolTime Pro. Message and data
                rates may apply. You can reply STOP at any time to opt out.&quot;
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">What Messages You Will Receive</h2>
            <p className="mb-2">
              If you opt in, you will receive <strong>service-related, non-marketing</strong> text
              messages including:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Appointment confirmations</li>
              <li>Appointment reminders (typically sent one day before)</li>
              <li>Schedule updates (e.g., technician running late with updated ETA)</li>
              <li>Job completion notifications</li>
              <li>Review requests after service completion</li>
              <li>Quote and invoice notifications with links to view documents</li>
              <li>Replies to customer-initiated text conversations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Message Frequency</h2>
            <p>
              This is a recurring message program. Message frequency varies based on your service
              activity. You will typically receive <strong>1&ndash;5 messages per service appointment
              or customer interaction</strong>. You will not receive more than 10 messages per month
              unless you are actively scheduling multiple appointments.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Message and Data Rates</h2>
            <p>
              <strong>Message and data rates may apply.</strong> Standard message and data rates from
              your mobile carrier apply. ToolTime Pro does not charge separately for SMS messages.
              Contact your wireless provider for details about your messaging plan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">How to Opt Out</h2>
            <p className="mb-2">
              You can opt out of SMS notifications at any time by replying <strong>STOP</strong> to
              any message you receive from ToolTime Pro. You will receive a single confirmation
              message acknowledging your opt-out, and no further text messages will be sent.
            </p>
            <p>
              You may also contact us at <strong>support@tooltimepro.com</strong> to request removal
              from SMS communications.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">How to Get Help</h2>
            <p>
              Reply <strong>HELP</strong> to any message for assistance. You will receive a message
              with contact information and instructions. You can also reach us at:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Email: <strong>support@tooltimepro.com</strong></li>
              <li>Website: <a href="https://tooltimepro.com" className="text-[#f5a623] hover:underline">tooltimepro.com</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Sample Messages</h2>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="text-xs font-bold text-[#5c5c70] mb-1">Appointment Confirmation</p>
                <p className="text-sm">&quot;Hi [Name]! Your [Service] appointment with [Business] is confirmed for [Date] at [Time]. Reply STOP to opt out.&quot;</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="text-xs font-bold text-[#5c5c70] mb-1">Appointment Reminder</p>
                <p className="text-sm">&quot;Reminder: Your [Service] appointment with [Business] is tomorrow ([Date]) at [Time]. See you then! Reply STOP to opt out.&quot;</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="text-xs font-bold text-[#5c5c70] mb-1">Running Late</p>
                <p className="text-sm">&quot;Hi [Name], [Business] here. Our team is running a bit late - estimated arrival: [Time]. We apologize for any inconvenience. Reply STOP to opt out.&quot;</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="text-xs font-bold text-[#5c5c70] mb-1">Review Request</p>
                <p className="text-sm">&quot;Hi [Name]! Thanks for choosing [Business]. We&apos;d love your feedback: [Link]. Reply STOP to opt out.&quot;</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Supported Carriers</h2>
            <p>
              AT&amp;T, T-Mobile, Verizon, Sprint, and most major US carriers are supported.
              Carriers are not liable for delayed or undelivered messages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Data Privacy</h2>
            <p>
              We do not sell, share, or use phone numbers or SMS data for marketing or advertising
              purposes. Phone numbers collected as part of the SMS consent process are solely used
              to deliver service-related notifications on behalf of the business you booked with.
              No mobile information will be shared with third parties or affiliates for
              marketing or promotional purposes. For full details, see our{' '}
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
