// Twilio SMS Service
// Configure with environment variables:
// - TWILIO_ACCOUNT_SID
// - TWILIO_AUTH_TOKEN
// - TWILIO_PHONE_NUMBER

import Twilio from 'twilio';

// Lazy initialization to prevent build-time errors
let twilioClient: ReturnType<typeof Twilio> | null = null;

export function getTwilioClient() {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
    }

    twilioClient = Twilio(accountSid, authToken);
  }
  return twilioClient;
}

export function getTwilioPhoneNumber(): string {
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!phoneNumber) {
    throw new Error('TWILIO_PHONE_NUMBER not configured');
  }
  return phoneNumber;
}

// Format phone number to E.164 format for Twilio
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If it's a 10-digit US number, add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If it already has country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Return as-is with + prefix if not already present
  return phone.startsWith('+') ? phone : `+${digits}`;
}

export interface SendSMSOptions {
  to: string;
  body: string;
  from?: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSMS(options: SendSMSOptions): Promise<SMSResult> {
  try {
    const client = getTwilioClient();
    const fromNumber = options.from || getTwilioPhoneNumber();

    const message = await client.messages.create({
      body: options.body,
      to: formatPhoneNumber(options.to),
      from: fromNumber,
    });

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error) {
    console.error('Twilio SMS error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS',
    };
  }
}

// SMS Templates
export const SMS_TEMPLATES = {
  bookingConfirmation: (data: {
    customerName: string;
    serviceName: string;
    date: string;
    time: string;
    companyName: string;
  }) => `Hi ${data.customerName}! Your ${data.serviceName} appointment with ${data.companyName} is confirmed for ${data.date} at ${data.time}. Reply STOP to opt out.`,

  bookingReminder: (data: {
    customerName: string;
    serviceName: string;
    date: string;
    time: string;
    companyName: string;
  }) => `Reminder: Your ${data.serviceName} appointment with ${data.companyName} is tomorrow (${data.date}) at ${data.time}. See you then!`,

  jobComplete: (data: {
    customerName: string;
    companyName: string;
    reviewLink?: string;
  }) => data.reviewLink
    ? `Hi ${data.customerName}! Thanks for choosing ${data.companyName}. We'd love your feedback: ${data.reviewLink}`
    : `Hi ${data.customerName}! Thanks for choosing ${data.companyName}. We hope you're satisfied with our service!`,

  workerAssignment: (data: {
    workerName: string;
    customerName: string;
    address: string;
    time: string;
  }) => `Hi ${data.workerName}! New job assigned: ${data.customerName} at ${data.address}, ${data.time}. Check the app for details.`,

  runningLate: (data: {
    customerName: string;
    companyName: string;
    estimatedArrival: string;
  }) => `Hi ${data.customerName}, ${data.companyName} here. Our team is running a bit late - estimated arrival: ${data.estimatedArrival}. We apologize for any inconvenience.`,
};
