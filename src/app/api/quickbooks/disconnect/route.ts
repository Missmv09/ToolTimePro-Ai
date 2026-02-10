import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          cookie: cookieStore.toString(),
        },
      },
    })

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company_id
    const { data: dbUser } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!dbUser?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 })
    }

    // Delete the QBO connection for this company
    const { error } = await supabase.from('qbo_connections').delete().eq('company_id', dbUser.company_id)

    if (error) {
      console.error('Error deleting QBO connection:', error)
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disconnecting QuickBooks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
