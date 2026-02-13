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
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tooltimepro.com';

function formatPlanName(plan: string): string {
  return plan
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Shared branded email wrapper
function emailLayout(content: string): string {
  return `
    <div style="background-color: #f3f4f6; padding: 40px 0;">
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px 40px; text-align: center;">
          <table cellpadding="0" cellspacing="0" border="0" align="center"><tr>
            <td style="width: 40px; height: 40px; background: #f59e0b; border-radius: 10px; text-align: center; vertical-align: middle; font-size: 20px;">&#9881;</td>
            <td style="padding-left: 12px;"><span style="color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">ToolTime Pro</span></td>
          </tr></table>
        </div>
        <!-- Body -->
        <div style="padding: 40px;">
          ${content}
        </div>
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 13px;">
            Questions? Email us at
            <a href="mailto:support@tooltimepro.com" style="color: #f97316; text-decoration: none;">support@tooltimepro.com</a>
          </p>
          <p style="margin: 0; color: #d1d5db; font-size: 12px;">
            ToolTime Pro &middot; Job management for field service teams
          </p>
        </div>
      </div>
    </div>
  `;
}

function ctaButton(text: string, href: string, color: string = '#f97316'): string {
  return `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${href}"
         style="background: ${color}; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
        ${text}
      </a>
    </div>
  `;
}

// ============================================
// Signup Confirmation Email (branded replacement for Supabase default)
// ============================================

export async function sendSignupConfirmationEmail({
  to,
  name,
  companyName,
  confirmationUrl,
}: {
  to: string;
  name: string;
  companyName: string;
  confirmationUrl: string;
}) {
  const firstName = name.split(' ')[0] || 'there';

  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${firstName}, confirm your email to start your free ToolTime Pro trial`,
    html: emailLayout(`
      <h2 style="color: #111827; margin: 0 0 8px 0; font-size: 22px;">Welcome to ToolTime Pro, ${firstName}!</h2>
      <p style="color: #6b7280; font-size: 15px; margin: 0 0 24px 0;">
        Your account for <strong>${companyName}</strong> has been created. You're one click away from simplifying how you run your business.
      </p>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        Click the button below to verify your email and set your password. Your <strong>14-day free Pro trial</strong> starts immediately &mdash; no credit card required, cancel anytime.
      </p>

      ${ctaButton('Verify Email & Get Started', confirmationUrl, '#3b82f6')}

      <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #3b82f6;">
        <p style="margin: 0 0 8px 0; color: #1e40af; font-weight: 600; font-size: 15px;">Your Pro trial includes everything:</p>
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="padding: 6px 0; color: #374151; font-size: 14px; vertical-align: top; width: 50%;">&#10003; Job scheduling &amp; dispatch</td>
            <td style="padding: 6px 0; color: #374151; font-size: 14px; vertical-align: top; width: 50%;">&#10003; Professional quotes &amp; invoices</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #374151; font-size: 14px; vertical-align: top;">&#10003; Worker app with GPS clock-in</td>
            <td style="padding: 6px 0; color: #374151; font-size: 14px; vertical-align: top;">&#10003; Time tracking &amp; timesheets</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #374151; font-size: 14px; vertical-align: top;">&#10003; CA labor compliance tools</td>
            <td style="padding: 6px 0; color: #374151; font-size: 14px; vertical-align: top;">&#10003; SMS &amp; review automation</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #374151; font-size: 14px; vertical-align: top;">&#10003; Customer management (CRM)</td>
            <td style="padding: 6px 0; color: #374151; font-size: 14px; vertical-align: top;">&#10003; Up to 15 team members</td>
          </tr>
        </table>
      </div>

      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 12px 0; color: #111827; font-weight: 600; font-size: 15px;">What happens next?</p>
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="padding: 8px 0;">
              <table cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="width: 28px; height: 28px; background: #dbeafe; border-radius: 50%; text-align: center; vertical-align: middle; color: #3b82f6; font-weight: 700; font-size: 13px;">1</td>
                <td style="padding-left: 12px; color: #374151; font-size: 14px;"><strong>Verify your email</strong> &mdash; click the button above</td>
              </tr></table>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <table cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="width: 28px; height: 28px; background: #dbeafe; border-radius: 50%; text-align: center; vertical-align: middle; color: #3b82f6; font-weight: 700; font-size: 13px;">2</td>
                <td style="padding-left: 12px; color: #374151; font-size: 14px;"><strong>Set your password</strong> &mdash; choose a secure password for your account</td>
              </tr></table>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <table cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="width: 28px; height: 28px; background: #dbeafe; border-radius: 50%; text-align: center; vertical-align: middle; color: #3b82f6; font-weight: 700; font-size: 13px;">3</td>
                <td style="padding-left: 12px; color: #374151; font-size: 14px;"><strong>Set up your company</strong> &mdash; add your services, rates &amp; team in ~10 minutes</td>
              </tr></table>
            </td>
          </tr>
        </table>
      </div>

      <div style="background: #fefce8; border-radius: 8px; padding: 16px; margin: 24px 0; border-left: 4px solid #eab308;">
        <p style="margin: 0; color: #854d0e; font-size: 14px;">
          <strong>Questions?</strong> Reply to this email or reach us at <a href="mailto:support@tooltimepro.com" style="color: #854d0e;">support@tooltimepro.com</a> &mdash; we're here to help you get set up.
        </p>
      </div>

      <p style="color: #9ca3af; font-size: 13px; margin: 24px 0 0 0;">
        If the button doesn't work, paste this link into your browser:<br />
        <a href="${confirmationUrl}" style="color: #3b82f6; word-break: break-all; font-size: 12px;">${confirmationUrl}</a>
      </p>
    `),
  });

  if (error) throw new Error(`Failed to send email: ${error.message}`);
  return data;
}

// ============================================
// Immediate Welcome Email (sent right after email verification + password set)
// ============================================

export async function sendImmediateWelcomeEmail({
  to,
  name,
  companyName,
}: {
  to: string;
  name: string;
  companyName: string;
}) {
  const firstName = name.split(' ')[0] || 'there';

  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `You're in! Here's how to set up ${companyName} on ToolTime Pro`,
    html: emailLayout(`
      <h2 style="color: #111827; margin: 0 0 8px 0; font-size: 22px;">You're all set, ${firstName}!</h2>
      <p style="color: #6b7280; font-size: 15px; margin: 0 0 24px 0;">
        Your email is verified and your <strong>14-day Pro trial</strong> for <strong>${companyName}</strong> is now active.
      </p>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        Most teams are up and running within 10 minutes. Here's how:
      </p>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="width: 32px; height: 32px; background: #eff6ff; border-radius: 50%; text-align: center; vertical-align: middle; color: #3b82f6; font-weight: 700; font-size: 14px;">1</td>
              <td style="padding-left: 12px; color: #374151; font-size: 15px;"><strong>Complete onboarding</strong> &mdash; add your company info &amp; logo</td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="width: 32px; height: 32px; background: #eff6ff; border-radius: 50%; text-align: center; vertical-align: middle; color: #3b82f6; font-weight: 700; font-size: 14px;">2</td>
              <td style="padding-left: 12px; color: #374151; font-size: 15px;"><strong>Add your services</strong> &mdash; define what you offer &amp; your rates</td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="width: 32px; height: 32px; background: #eff6ff; border-radius: 50%; text-align: center; vertical-align: middle; color: #3b82f6; font-weight: 700; font-size: 14px;">3</td>
              <td style="padding-left: 12px; color: #374151; font-size: 15px;"><strong>Invite your crew</strong> &mdash; they'll get the worker app with GPS clock-in</td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px;">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="width: 32px; height: 32px; background: #eff6ff; border-radius: 50%; text-align: center; vertical-align: middle; color: #3b82f6; font-weight: 700; font-size: 14px;">4</td>
              <td style="padding-left: 12px; color: #374151; font-size: 15px;"><strong>Create your first job</strong> &mdash; schedule, assign &amp; track in one place</td>
            </tr></table>
          </td>
        </tr>
      </table>

      ${ctaButton('Go to Your Dashboard', `${BASE_URL}/dashboard`)}

      <div style="background: #fefce8; border-radius: 8px; padding: 16px; margin: 24px 0; border-left: 4px solid #eab308;">
        <p style="margin: 0; color: #854d0e; font-size: 14px;">
          <strong>Pro tip:</strong> Create a quote for a recent customer &mdash; most owners say it's the feature that sold them on ToolTime Pro.
        </p>
      </div>
    `),
  });

  if (error) throw new Error(`Failed to send email: ${error.message}`);
  return data;
}

// ============================================
// Subscription Welcome Email (after Stripe payment)
// ============================================

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
    html: emailLayout(`
      <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">Welcome aboard!</h2>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        Your subscription is now active. Here's your order summary:
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

      ${ctaButton('Go to Dashboard', `${BASE_URL}/dashboard`)}
    `),
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
    html: emailLayout(`
      <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">Welcome, ${name}!</h2>

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

      ${ctaButton('Go to Dashboard', `${BASE_URL}/dashboard`, '#3b82f6')}
    `),
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
    html: emailLayout(`
      <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">Hi ${name},</h2>

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

      ${ctaButton(isUrgent ? 'Subscribe Now' : 'View Plans', `${BASE_URL}/pricing`, isUrgent ? '#f59e0b' : '#3b82f6')}
    `),
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
    subject: `${companyName || 'Your team'} - ToolTime Pro Worker App Access`,
    html: emailLayout(`
      <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">Welcome to ${companyName ? `the ${companyName} team` : 'the team'}, ${name}!</h2>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        ${companyName ? `<strong>${companyName}</strong> uses` : 'Your company uses'} <strong>ToolTime Pro</strong> to manage jobs, scheduling, and time tracking.
        You've been set up with access to the <strong>Worker App</strong> so you can view your assigned jobs, clock in/out, and stay connected with your team.
      </p>

      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Your Login Credentials</p>
        <p style="margin: 4px 0; color: #374151;"><strong>Email:</strong> ${to}</p>
        <p style="margin: 4px 0; color: #374151;"><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 2px 8px; border-radius: 4px; font-size: 15px;">${tempPassword}</code></p>
      </div>

      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e; font-weight: 600;">Important</p>
        <p style="margin: 8px 0 0 0; color: #92400e; font-size: 14px;">
          Please change your password after your first login to keep your account secure.
        </p>
      </div>

      ${ctaButton('Log In to the Worker App', `${BASE_URL}/auth/login`)}
    `),
  });

  if (error) throw new Error(`Failed to send email: ${error.message}`);
  return data;
}

// ============================================
// Invoice Email (sent to customer with full context)
// ============================================

export async function sendInvoiceEmail({
  to,
  customerName,
  invoiceNumber,
  items,
  subtotal,
  taxRate,
  taxAmount,
  discountAmount,
  total,
  dueDate,
  notes,
  invoiceLink,
  companyName,
}: {
  to: string;
  customerName: string;
  invoiceNumber: string;
  items?: { description: string; quantity: number; unit_price: number; total: number }[];
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  discountAmount?: number;
  total: number;
  dueDate?: string;
  notes?: string;
  invoiceLink: string;
  companyName?: string;
}) {
  const formattedTotal = `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedDueDate = dueDate
    ? new Date(dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Build line items table if items are available
  let lineItemsHtml = '';
  if (items && items.length > 0) {
    const rows = items.map(item => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px;">${item.description}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px; text-align: right;">${formatCurrency(item.unit_price)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px; text-align: right;">${formatCurrency(item.total)}</td>
      </tr>
    `).join('');

    lineItemsHtml = `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 10px 12px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Description</th>
            <th style="padding: 10px 12px; text-align: center; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Qty</th>
            <th style="padding: 10px 12px; text-align: right; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Rate</th>
            <th style="padding: 10px 12px; text-align: right; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  // Build totals breakdown
  let totalsHtml = '';
  if (subtotal !== undefined && subtotal !== total) {
    totalsHtml = `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 24px 0;">
        <tr>
          <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Subtotal</td>
          <td style="padding: 6px 0; color: #374151; font-size: 14px; text-align: right;">${formatCurrency(subtotal)}</td>
        </tr>
        ${discountAmount && discountAmount > 0 ? `
        <tr>
          <td style="padding: 6px 0; color: #16a34a; font-size: 14px;">Discount</td>
          <td style="padding: 6px 0; color: #16a34a; font-size: 14px; text-align: right;">-${formatCurrency(discountAmount)}</td>
        </tr>` : ''}
        ${taxAmount && taxAmount > 0 ? `
        <tr>
          <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Tax${taxRate ? ` (${taxRate}%)` : ''}</td>
          <td style="padding: 6px 0; color: #374151; font-size: 14px; text-align: right;">${formatCurrency(taxAmount)}</td>
        </tr>` : ''}
        <tr>
          <td style="padding: 10px 0 6px 0; color: #111827; font-size: 16px; font-weight: 700; border-top: 2px solid #e5e7eb;">Total Due</td>
          <td style="padding: 10px 0 6px 0; color: #111827; font-size: 16px; font-weight: 700; text-align: right; border-top: 2px solid #e5e7eb;">${formattedTotal}</td>
        </tr>
      </table>
    `;
  }

  const senderLabel = companyName || 'ToolTime Pro';

  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Invoice ${invoiceNumber} from ${senderLabel} - ${formattedTotal}${formattedDueDate ? ` due by ${formattedDueDate}` : ''}`,
    html: emailLayout(`
      <h2 style="color: #111827; margin: 0 0 8px 0; font-size: 22px;">Hi ${customerName},</h2>
      <p style="color: #6b7280; font-size: 15px; margin: 0 0 24px 0;">
        ${senderLabel} has sent you an invoice.
      </p>

      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 8px;" colspan="2">Invoice Summary</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #374151; font-size: 14px;"><strong>Invoice:</strong></td>
            <td style="padding: 4px 0; color: #374151; font-size: 14px; text-align: right;">${invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #374151; font-size: 14px;"><strong>Amount:</strong></td>
            <td style="padding: 4px 0; color: #374151; font-size: 14px; text-align: right; font-weight: 700;">${formattedTotal}</td>
          </tr>
          ${formattedDueDate ? `
          <tr>
            <td style="padding: 4px 0; color: #374151; font-size: 14px;"><strong>Due Date:</strong></td>
            <td style="padding: 4px 0; color: #374151; font-size: 14px; text-align: right;">${formattedDueDate}</td>
          </tr>` : ''}
          ${companyName ? `
          <tr>
            <td style="padding: 4px 0; color: #374151; font-size: 14px;"><strong>From:</strong></td>
            <td style="padding: 4px 0; color: #374151; font-size: 14px; text-align: right;">${companyName}</td>
          </tr>` : ''}
        </table>
      </div>

      ${lineItemsHtml}

      ${totalsHtml}

      ${notes ? `
      <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin: 24px 0; border-left: 4px solid #3b82f6;">
        <p style="margin: 0 0 4px 0; color: #1e40af; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Notes</p>
        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-line;">${notes}</p>
      </div>` : ''}

      ${ctaButton('View & Pay Invoice', invoiceLink, '#3b82f6')}

      <p style="color: #9ca3af; font-size: 13px; margin: 24px 0 0 0;">
        If the button doesn't work, paste this link into your browser:<br />
        <a href="${invoiceLink}" style="color: #3b82f6; word-break: break-all; font-size: 12px;">${invoiceLink}</a>
      </p>
    `),
  });

  if (error) throw new Error(`Failed to send email: ${error.message}`);
  return data;
}

export async function sendTrialExpiredEmail({ to, name }: { to: string; name: string }) {
  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Your ToolTime Pro trial has ended',
    html: emailLayout(`
      <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">Hi ${name},</h2>

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

      ${ctaButton('Choose a Plan', `${BASE_URL}/pricing`, '#3b82f6')}
    `),
  });

  if (error) throw new Error(`Failed to send email: ${error.message}`);
  return data;
}
