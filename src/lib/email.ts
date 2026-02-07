import { Resend } from 'resend';

let resend: Resend | null = null;

function getResend() {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'ToolTime Pro <no-reply@send.tooltimepro.com>';

function formatPlanName(plan: string): string {
  return plan
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function sendWelcomeEmail({
  to,
  plan,
  billing,
}: {
  to: string;
  plan: string;
  billing: string;
}) {
  const planName = formatPlanName(plan);
  const billingLabel = billing === 'annual' ? 'Annual' : 'Monthly';

  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Welcome to ToolTime Pro! Your subscription is active',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f97316; margin: 0;">ToolTime Pro</h1>
        </div>

        <h2 style="color: #111827;">Welcome aboard! 🎉</h2>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Your subscription is now active and your 14-day free trial has started. Here's your order summary:
        </p>

        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0; color: #374151;"><strong>Plan:</strong> ${planName}</p>
          <p style="margin: 4px 0; color: #374151;"><strong>Billing:</strong> ${billingLabel}</p>
        </div>

        <h3 style="color: #111827;">Get started in 4 easy steps:</h3>
        <ol style="color: #4b5563; font-size: 15px; line-height: 1.8;">
          <li>Log in to your dashboard</li>
          <li>Complete your company profile</li>
          <li>Add your services and pricing</li>
          <li>Invite your team to the worker app</li>
        </ol>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://tooltimepro.com/dashboard"
             style="background: #f97316; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Go to Dashboard
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

        <p style="color: #9ca3af; font-size: 13px; text-align: center;">
          Questions? Email us at
          <a href="mailto:support@tooltimepro.com" style="color: #f97316;">support@tooltimepro.com</a>
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}
