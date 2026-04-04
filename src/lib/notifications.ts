import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export type NotificationType =
  | 'new_lead' | 'job_assigned' | 'invoice_paid' | 'invoice_overdue'
  | 'compliance_alert' | 'review_received' | 'booking_received'
  | 'worker_clock_in' | 'quote_accepted' | 'quote_expired';

export async function createNotification(params: {
  companyId: string
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
}) {
  // Use service role for server-side notification creation
  // Falls back to no-op if not configured (dev/build environments)
  if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('placeholder')) return

  const admin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  await admin.from('notifications').insert({
    company_id: params.companyId,
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link || null,
  })
}
