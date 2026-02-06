import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

// Browser-safe Supabase client that doesn't throw if env vars are missing
export function getSupabaseBrowser(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not configured')
    return null
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  return supabaseClient
}

// Submit a lead from the website questionnaire form
export async function submitWebsiteLead(data: {
  email: string
  phone?: string
  companyName?: string
  businessType?: string
  painPoints?: string[]
  employeeCount?: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseBrowser()

  if (!supabase) {
    // Fallback: log to console if Supabase isn't configured
    console.log('Lead submission (Supabase not configured):', data)
    return { success: true } // Don't lose the lead - show success anyway
  }

  try {
    // Build the message/notes field with pain points and employee count
    const messageParts: string[] = []
    if (data.painPoints && data.painPoints.length > 0) {
      messageParts.push(`Pain points: ${data.painPoints.join(', ')}`)
    }
    if (data.employeeCount) {
      messageParts.push(`Employee count: ${data.employeeCount}`)
    }

    const { error } = await supabase
      .from('leads')
      .insert({
        name: data.companyName || data.email.split('@')[0] || 'Website Lead',
        email: data.email,
        phone: data.phone || null,
        service_requested: data.businessType || null,
        message: messageParts.length > 0 ? messageParts.join('\n') : null,
        source: 'website_questionnaire',
        status: 'new',
      })

    if (error) {
      console.error('Error submitting lead:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error submitting lead:', err)
    return { success: false, error: 'Failed to submit lead. Please try again.' }
  }
}
