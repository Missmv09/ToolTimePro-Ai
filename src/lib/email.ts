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

// ============================================
// Trial Lifecycle Emails
// ============================================

export async function sendTrialWelcomeEmail({ to, name }: { to: string; name: string }) {
  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Welcome to ToolTime Pro - Your 14-day Pro trial has started!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f97316; margin: 0;">ToolTime Pro</h1>
        </div>

        <h2 style="color: #111827;">Welcome, ${name}!</h2>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Your <strong>14-day free trial</strong> of the <strong>Pro plan</strong> is now active.
          You have full access to all features &mdash; no credit card required.
        </p>

        <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <p style="margin: 0; color: #1e40af; font-weight: 600;">What's included in Pro:</p>
          <ul style="color: #374151; font-size: 14px; line-height: 1.8; margin: 8px 0 0 0; padding-left: 20px;">
            <li>Scheduling, quoting &amp; invoicing</li>
            <li>Worker app with GPS clock-in</li>
            <li>Time tracking &amp; CA compliance</li>
            <li>SMS &amp; review automation</li>
            <li>Up to 15 team members</li>
          </ul>
        </div>

        <h3 style="color: #111827;">Get started now:</h3>
        <ol style="color: #4b5563; font-size: 15px; line-height: 1.8;">
          <li>Complete your company profile</li>
          <li>Add your services and pricing</li>
          <li>Invite your team</li>
        </ol>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://tooltimepro.com/dashboard"
             style="background: #3b82f6; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Go to Dashboard
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="color: #9ca3af; font-size: 13px; text-align: center;">
          Questions? Email us at <a href="mailto:support@tooltimepro.com" style="color: #f97316;">support@tooltimepro.com</a>
        </p>
      </div>
    `,
  });

  if (error) throw new Error(`Failed to send email: ${error.message}`);
  return data;
}

export async function sendTrialReminderEmail({
  to,
  name,
  daysLeft,
}: {
  to: string;
  name: string;
  daysLeft: number;
}) {
  const isUrgent = daysLeft <= 3;
  const subject = isUrgent
    ? `Your ToolTime Pro trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}!`
    : `${daysLeft} days left in your ToolTime Pro trial`;

  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f97316; margin: 0;">ToolTime Pro</h1>
        </div>

        <h2 style="color: #111827;">Hi ${name},</h2>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          You have <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong> left in your free Pro trial.
          ${isUrgent ? 'Subscribe now to keep all your data and avoid any interruption.' : 'Make sure you\'re getting the most out of ToolTime Pro!'}
        </p>

        ${isUrgent ? `
        <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e; font-weight: 600;">Don't lose your data</p>
          <p style="margin: 8px 0 0 0; color: #92400e; font-size: 14px;">
            Your customers, jobs, quotes, and team data are safe. Subscribe to any plan to keep full access.
          </p>
        </div>
        ` : `
        <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #22c55e;">
          <p style="margin: 0; color: #166534; font-weight: 600;">Quick tip</p>
          <p style="margin: 8px 0 0 0; color: #166534; font-size: 14px;">
            Have you tried creating a quote or scheduling a job? These features save hours every week.
          </p>
        </div>
        `}

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://tooltimepro.com/pricing"
             style="background: ${isUrgent ? '#f59e0b' : '#3b82f6'}; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            ${isUrgent ? 'Subscribe Now' : 'View Plans'}
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="color: #9ca3af; font-size: 13px; text-align: center;">
          Questions? Email us at <a href="mailto:support@tooltimepro.com" style="color: #f97316;">support@tooltimepro.com</a>
        </p>
      </div>
    `,
  });

  if (error) throw new Error(`Failed to send email: ${error.message}`);
  return data;
}

export async function sendTeamMemberWelcomeEmail({
  to,
  name,
  tempPassword,
  companyName,
}: {
  to: string;
  name: string;
  tempPassword: string;
  companyName?: string;
}) {
  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `You've been added to ${companyName || 'a team'} on ToolTime Pro`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f97316; margin: 0;">ToolTime Pro</h1>
        </div>

        <h2 style="color: #111827;">Welcome to the team, ${name}!</h2>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          You've been added ${companyName ? `to <strong>${companyName}</strong>` : 'to a team'} on ToolTime Pro.
          Use the credentials below to log in for the first time.
        </p>

        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0; color: #374151;"><strong>Email:</strong> ${to}</p>
          <p style="margin: 4px 0; color: #374151;"><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 2px 8px; border-radius: 4px; font-size: 15px;">${tempPassword}</code></p>
        </div>

        <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e; font-weight: 600;">Important</p>
          <p style="margin: 8px 0 0 0; color: #92400e; font-size: 14px;">
            Please change your password after your first login to keep your account secure.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://tooltimepro.com/auth/login"
             style="background: #f97316; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Log In Now
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="color: #9ca3af; font-size: 13px; text-align: center;">
          Questions? Email us at <a href="mailto:support@tooltimepro.com" style="color: #f97316;">support@tooltimepro.com</a>
        </p>
      </div>
    `,
  });

  if (error) throw new Error(`Failed to send email: ${error.message}`);
  return data;
}

export async function sendTrialExpiredEmail({ to, name }: { to: string; name: string }) {
  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Your ToolTime Pro trial has ended',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f97316; margin: 0;">ToolTime Pro</h1>
        </div>

        <h2 style="color: #111827;">Hi ${name},</h2>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Your 14-day free trial has ended. But don't worry &mdash; <strong>all your data is safe</strong>.
          Subscribe to any plan to pick up right where you left off.
        </p>

        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; color: #374151; font-weight: 600;">Plans start at just $30/month:</p>
          <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li><strong>Starter</strong> - $30/mo (owner + 2 workers)</li>
            <li><strong>Pro</strong> - $59/mo (up to 15 workers)</li>
            <li><strong>Elite</strong> - $99/mo (up to 20 workers)</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://tooltimepro.com/pricing"
             style="background: #3b82f6; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Choose a Plan
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="color: #9ca3af; font-size: 13px; text-align: center;">
          Questions? Email us at <a href="mailto:support@tooltimepro.com" style="color: #f97316;">support@tooltimepro.com</a>
        </p>
      </div>
    `,
  });

  if (error) throw new Error(`Failed to send email: ${error.message}`);
  return data;
}
