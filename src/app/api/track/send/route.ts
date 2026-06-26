import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSMS } from '@/lib/twilio'

export const dynamic = 'force-dynamic'

// Texts the customer a link to the public tracking page for a job.
// Auth required; the caller must belong to the job's company.

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { jobId } = await request.json()
    if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })

    const admin = getAdmin()

    const { data: { user } } = await admin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: caller } = await admin.from('users').select('company_id').eq('id', user.id).single()
    if (!caller?.company_id) return NextResponse.json({ error: 'No company' }, { status: 403 })

    const { data: job, error } = await admin
      .from('jobs')
      .select(`
        id, company_id, tracking_token,
        company:companies(name),
        customer:customers(name, phone)
      `)
      .eq('id', jobId)
      .single()

    if (error || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    if (job.company_id !== caller.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer
    const company = Array.isArray(job.company) ? job.company[0] : job.company

    if (!customer?.phone) {
      return NextResponse.json({ error: 'Customer has no phone number on file' }, { status: 400 })
    }
    if (!job.tracking_token) {
      return NextResponse.json({ error: 'Job is missing a tracking token' }, { status: 400 })
    }

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, '')
    const link = `${baseUrl}/track/${job.tracking_token}`
    const companyName = company?.name || 'Your service provider'
    const hello = customer.name ? `Hi ${customer.name.split(' ')[0]}! ` : ''

    const result = await sendSMS({
      to: customer.phone,
      body: `${hello}${companyName} is on the way. Track your technician's arrival here: ${link}`,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send SMS' }, { status: 502 })
    }

    return NextResponse.json({ success: true, link })
  } catch (err) {
    console.error('Track send error:', err)
    return NextResponse.json({ error: 'Failed to send tracking link' }, { status: 500 })
  }
}
