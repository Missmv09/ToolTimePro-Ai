import { NextResponse } from 'next/server';
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, customerName, invoiceNumber, total, dueDate, invoiceLink, companyId } = body;

    if (!to) {
      return NextResponse.json({ error: 'Recipient email required' }, { status: 400 });
    }

    if (!invoiceLink) {
      return NextResponse.json({ error: 'Invoice link required' }, { status: 400 });
    }

    const formattedTotal = typeof total === 'number' ? `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : total;
    const formattedDueDate = dueDate
      ? new Date(dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : null;

    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Invoice ${invoiceNumber} - ${formattedTotal} due${formattedDueDate ? ` by ${formattedDueDate}` : ''}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f97316; margin: 0;">ToolTime Pro</h1>
          </div>

          <h2 style="color: #111827;">Hi ${customerName || 'there'},</h2>

          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            A new invoice has been created for you. Here are the details:
          </p>

          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 4px 0; color: #374151;"><strong>Invoice:</strong> ${invoiceNumber}</p>
            <p style="margin: 4px 0; color: #374151;"><strong>Amount:</strong> ${formattedTotal}</p>
            ${formattedDueDate ? `<p style="margin: 4px 0; color: #374151;"><strong>Due Date:</strong> ${formattedDueDate}</p>` : ''}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${invoiceLink}"
               style="background: #3b82f6; color: white; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; font-size: 16px;">
              View Invoice
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            You can view your invoice and details by clicking the button above or copying this link into your browser:
          </p>
          <p style="color: #3b82f6; font-size: 14px; word-break: break-all;">
            <a href="${invoiceLink}" style="color: #3b82f6;">${invoiceLink}</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

          <p style="color: #9ca3af; font-size: 13px; text-align: center;">
            Questions? Reply to this email or contact us directly.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Email send error:', error);
      return NextResponse.json({ error: `Failed to send email: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: data?.id });
  } catch (error) {
    console.error('Invoice email API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send invoice email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
