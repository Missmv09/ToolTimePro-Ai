import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * GET /api/quote/edit-history?quoteId=xxx
 * Returns the edit history for a quote (business-side, auth required).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const quoteId = searchParams.get('quoteId')

    if (!quoteId) {
      return NextResponse.json({ error: 'Missing quoteId' }, { status: 400 })
    }

    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verify caller
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: callerProfile } = await adminClient
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!callerProfile?.company_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 })
    }

    // Verify quote belongs to caller's company
    const { data: quote } = await adminClient
      .from('quotes')
      .select('id, company_id')
      .eq('id', quoteId)
      .single()

    if (!quote || quote.company_id !== callerProfile.company_id) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Fetch edit history with editor names
    const { data: history, error: historyError } = await adminClient
      .from('quote_edit_history')
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: false })

    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 500 })
    }

    // Fetch editor names
    const editorIds = [...new Set((history || []).filter(h => h.edited_by).map(h => h.edited_by as string))]
    let editorsMap: Record<string, string> = {}
    if (editorIds.length > 0) {
      const { data: editors } = await adminClient
        .from('users')
        .select('id, full_name')
        .in('id', editorIds)
      if (editors) {
        for (const e of editors) {
          editorsMap[e.id] = e.full_name
        }
      }
    }

    const enrichedHistory = (history || []).map(h => ({
      ...h,
      editor_name: h.edited_by ? editorsMap[h.edited_by] || 'Unknown' : 'System',
    }))

    return NextResponse.json({ history: enrichedHistory })
  } catch (error) {
    console.error('Error fetching quote edit history:', error)
    return NextResponse.json({ error: 'Failed to fetch edit history' }, { status: 500 })
  }
}

/**
 * POST /api/quote/edit-history
 * Log an edit to a quote. Compares old vs new values and records the diff.
 * Also bumps the quote's revision_number if the quote was already sent.
 *
 * Body: { quoteId, oldData, newData, oldItems, newItems }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { quoteId, oldData, newData, oldItems, newItems } = body

    if (!quoteId || !oldData || !newData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verify caller
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: callerProfile } = await adminClient
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!callerProfile?.company_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 })
    }

    // Verify quote belongs to caller's company
    const { data: quote } = await adminClient
      .from('quotes')
      .select('id, company_id, revision_number, status')
      .eq('id', quoteId)
      .single()

    if (!quote || quote.company_id !== callerProfile.company_id) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Build the diff
    const changes: Record<string, { old: unknown; new: unknown }> = {}
    const summaryParts: string[] = []

    // Compare tracked fields
    const trackedFields = ['subtotal', 'tax_rate', 'tax_amount', 'total', 'notes', 'valid_until', 'customer_id', 'deposit_required', 'deposit_amount', 'deposit_percentage']
    for (const field of trackedFields) {
      const oldVal = oldData[field]
      const newVal = newData[field]
      if (String(oldVal ?? '') !== String(newVal ?? '')) {
        changes[field] = { old: oldVal, new: newVal }
        if (field === 'total') {
          summaryParts.push(`Total: $${Number(oldVal || 0).toFixed(2)} → $${Number(newVal || 0).toFixed(2)}`)
        } else if (field === 'notes') {
          summaryParts.push('Notes updated')
        } else if (field === 'valid_until') {
          summaryParts.push(`Valid until: ${oldVal || 'none'} → ${newVal || 'none'}`)
        } else if (field === 'deposit_required') {
          summaryParts.push(newVal ? 'Deposit added' : 'Deposit removed')
        } else if (field === 'deposit_amount' || field === 'deposit_percentage') {
          // Already covered by deposit_required change in most cases
        }
      }
    }

    // Compare line items
    if (oldItems && newItems) {
      const oldItemsSorted = [...oldItems].sort((a: { description: string }, b: { description: string }) => a.description.localeCompare(b.description))
      const newItemsSorted = [...newItems].sort((a: { description: string }, b: { description: string }) => a.description.localeCompare(b.description))

      const oldItemsStr = JSON.stringify(oldItemsSorted.map((i: { description: string; quantity: number; unit_price: number }) => ({
        d: i.description, q: Number(i.quantity), p: Number(i.unit_price),
      })))
      const newItemsStr = JSON.stringify(newItemsSorted.map((i: { description: string; quantity: number; unit_price: number }) => ({
        d: i.description, q: Number(i.quantity), p: Number(i.unit_price),
      })))

      if (oldItemsStr !== newItemsStr) {
        changes['line_items'] = {
          old: oldItems.map((i: { description: string; quantity: number; unit_price: number }) => ({
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unit_price,
          })),
          new: newItems.map((i: { description: string; quantity: number; unit_price: number }) => ({
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unit_price,
          })),
        }

        const added = newItems.length - oldItems.length
        if (added > 0) {
          summaryParts.push(`${added} line item(s) added`)
        } else if (added < 0) {
          summaryParts.push(`${Math.abs(added)} line item(s) removed`)
        } else {
          summaryParts.push('Line items modified')
        }
      }
    }

    // If nothing changed, skip
    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const changeSummary = summaryParts.join('; ') || 'Quote updated'

    // Bump revision_number on the quote
    const newRevision = (quote.revision_number || 0) + 1

    await adminClient
      .from('quotes')
      .update({ revision_number: newRevision })
      .eq('id', quoteId)

    // Insert audit log entry
    const { error: insertError } = await adminClient
      .from('quote_edit_history')
      .insert({
        quote_id: quoteId,
        company_id: callerProfile.company_id,
        edited_by: user.id,
        revision_number: newRevision,
        change_summary: changeSummary,
        changes,
      })

    if (insertError) {
      console.error('Error logging quote edit:', insertError)
      // Don't fail the edit - the audit log is best-effort
      return NextResponse.json({ success: true, auditError: insertError.message })
    }

    return NextResponse.json({ success: true, revision_number: newRevision })
  } catch (error) {
    console.error('Error logging quote edit:', error)
    return NextResponse.json({ error: 'Failed to log edit' }, { status: 500 })
  }
}
