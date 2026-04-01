import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | ToolTime Pro',
  description: 'ToolTime Pro privacy policy - how we collect, use, and protect your data.',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <div className="bg-[#1a1a2e] text-white py-8">
        <div className="max-w-[900px] mx-auto px-6">
          <Link href="/" className="text-[#f5a623] font-bold text-lg hover:underline">
            &larr; ToolTime Pro
          </Link>
          <h1 className="text-3xl font-extrabold mt-4 drop-shadow-lg">Privacy Policy</h1>
          <p className="text-white/90 mt-2">Last updated: March 15, 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[900px] mx-auto px-6 py-12">
        <div className="bg-white rounded-xl p-8 shadow-sm space-y-8 text-[#1a1a2e] leading-relaxed">

          <section>
            <h2 className="text-xl font-bold mb-3">1. Introduction</h2>
            <p>
              ToolTime Pro (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the tooltimepro.com website and the ToolTime Pro
              platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information
              when you use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">2. Information We Collect</h2>
            <p className="mb-2">We collect information that you provide directly to us, including:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Account Information:</strong> Name, email address, phone number, company name, and password when you create an account.</li>
              <li><strong>Customer Data:</strong> Names, email addresses, phone numbers, and service addresses of your customers that you enter into the platform.</li>
              <li><strong>Business Data:</strong> Quotes, invoices, job details, scheduling information, and other business records you create.</li>
              <li><strong>Payment Information:</strong> Billing details processed through our third-party payment providers.</li>
              <li><strong>Communications:</strong> Messages sent through our platform, including SMS and email notifications.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To provide, maintain, and improve our services.</li>
              <li>To send transactional notifications such as quote confirmations, invoice reminders, appointment reminders, and job updates via email and SMS.</li>
              <li>To process payments and maintain billing records.</li>
              <li>To provide customer support and respond to inquiries.</li>
              <li>To detect and prevent fraud or security issues.</li>
              <li>To comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">4. SMS/Text Messaging</h2>
            <p className="mb-2">
              We use SMS messaging to send service-related notifications to customers on behalf of businesses
              using our platform. These messages may include:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Quote and invoice notifications with links to view documents.</li>
              <li>Appointment confirmations and reminders.</li>
              <li>Job completion notifications and review requests.</li>
              <li>Schedule updates such as running late notifications.</li>
            </ul>
            <p className="mt-3">
              <strong>Consent:</strong> SMS messages are only sent to customers who have opted in to receive text
              messages. Consent is obtained by the business through their customer intake process.
            </p>
            <p className="mt-2">
              <strong>Opt-out:</strong> Recipients can opt out at any time by replying STOP to any message.
              Reply HELP for assistance. Message and data rates may apply. Message frequency varies based on
              service activity.
            </p>
            <p className="mt-2">
              <strong>We do not sell, share, or use phone numbers or SMS data for marketing or advertising purposes.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">5. Data Sharing</h2>
            <p className="mb-2">We do not sell your personal information. We may share information with:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Service Providers:</strong> Third-party services that help us operate our platform (e.g., Twilio for SMS, Resend for email, Supabase for data storage, Stripe for payments).</li>
              <li><strong>Business Partners:</strong> When you use integrations like QuickBooks, data is shared as needed for the integration to function.</li>
              <li><strong>Legal Requirements:</strong> When required by law, subpoena, or to protect our rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">6. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data, including encryption in
              transit (TLS/SSL), secure data storage, access controls, and regular security reviews.
              However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">7. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active or as needed to provide services.
              You may request deletion of your account and associated data by contacting us.
              Some data may be retained as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">8. Your Rights</h2>
            <p className="mb-2">Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your data.</li>
              <li>Opt out of certain data processing activities.</li>
              <li>Receive a copy of your data in a portable format.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">9. California Privacy Rights (CCPA/CPRA)</h2>
            <p className="mb-3">
              If you are a California resident, you have the following rights under the California Consumer
              Privacy Act (CCPA) and the California Privacy Rights Act (CPRA):
            </p>

            <h3 className="font-bold mt-4 mb-2">Right to Know</h3>
            <p>
              You have the right to request that we disclose the categories and specific pieces of personal
              information we have collected about you, the categories of sources from which it was collected,
              the business purpose for collecting it, and the categories of third parties with whom we share it.
            </p>

            <h3 className="font-bold mt-4 mb-2">Right to Delete</h3>
            <p>
              You have the right to request deletion of personal information we have collected from you,
              subject to certain exceptions (e.g., legal compliance, completing transactions).
            </p>

            <h3 className="font-bold mt-4 mb-2">Right to Correct</h3>
            <p>
              You have the right to request that we correct inaccurate personal information we maintain about you.
            </p>

            <h3 className="font-bold mt-4 mb-2">Right to Opt Out of Sale/Sharing</h3>
            <p>
              <strong>We do not sell or share your personal information</strong> as defined by the CCPA/CPRA.
              We do not use your data for cross-context behavioral advertising.
            </p>

            <h3 className="font-bold mt-4 mb-2">Right to Limit Use of Sensitive Personal Information</h3>
            <p>
              We only use sensitive personal information (such as phone numbers and email addresses) for the
              purposes of providing our services. We do not use sensitive personal information for purposes
              beyond what is necessary to perform the services you request.
            </p>

            <h3 className="font-bold mt-4 mb-2">Right to Non-Discrimination</h3>
            <p>
              We will not discriminate against you for exercising any of your CCPA/CPRA rights. We will not
              deny you services, charge you different prices, or provide a different quality of service.
            </p>

            <h3 className="font-bold mt-4 mb-2">Categories of Personal Information Collected</h3>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm border border-gray-200 rounded">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 border-b font-bold">Category</th>
                    <th className="text-left p-3 border-b font-bold">Examples</th>
                    <th className="text-left p-3 border-b font-bold">Business Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-3">Identifiers</td>
                    <td className="p-3">Name, email, phone number, account ID</td>
                    <td className="p-3">Account creation, service delivery, communications</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">Commercial Information</td>
                    <td className="p-3">Quotes, invoices, transaction history, service records</td>
                    <td className="p-3">Providing business management services</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">Internet/Electronic Activity</td>
                    <td className="p-3">Login history, feature usage, device information</td>
                    <td className="p-3">Security, service improvement, troubleshooting</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">Geolocation Data</td>
                    <td className="p-3">Worker GPS clock-in location (with consent)</td>
                    <td className="p-3">Job verification, dispatch, route optimization</td>
                  </tr>
                  <tr>
                    <td className="p-3">Professional Information</td>
                    <td className="p-3">Business name, license numbers, service types</td>
                    <td className="p-3">Account setup, compliance features</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="font-bold mt-4 mb-2">How to Exercise Your Rights</h3>
            <p>
              To submit a request, email us at <strong>support@tooltimepro.com</strong> with the subject line
              &quot;California Privacy Request.&quot; We will verify your identity before processing your request
              and respond within 45 days as required by law. You may also designate an authorized agent to
              make a request on your behalf.
            </p>

            <h3 className="font-bold mt-4 mb-2">Retention</h3>
            <p>
              We retain personal information for as long as reasonably necessary to fulfill the purposes
              for which it was collected, comply with legal obligations, resolve disputes, and enforce
              our agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">10. Do Not Track Signals</h2>
            <p>
              Our platform does not currently respond to &quot;Do Not Track&quot; browser signals. However,
              we do not engage in cross-site tracking of our users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">11. Children&apos;s Privacy</h2>
            <p>
              Our services are not directed to individuals under 18. We do not knowingly collect personal
              information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes
              by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">13. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or wish to exercise your data rights,
              please contact us at:
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
