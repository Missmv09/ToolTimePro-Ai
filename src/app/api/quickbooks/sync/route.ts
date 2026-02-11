import { NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

// QuickBooks API configuration
const QUICKBOOKS_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID || ''
const QUICKBOOKS_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET || ''
const QUICKBOOKS_ENVIRONMENT = process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox'

// QuickBooks API base URL
const QBO_API_BASE =
  QUICKBOOKS_ENVIRONMENT === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com'

// Token endpoint for refresh
const QBO_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'

interface QBOConnection {
  id: string
  company_id: string
  realm_id: string
  access_token: string
  refresh_token: string
  token_expires_at: string
  last_sync_at: string | null
}

interface QBOCustomer {
  Id: string
  DisplayName: string
  PrimaryEmailAddr?: { Address: string }
  PrimaryPhone?: { FreeFormNumber: string }
  BillAddr?: {
    Line1?: string
    City?: string
    CountrySubDivisionCode?: string
    PostalCode?: string
  }
  Notes?: string
}

interface QBOInvoice {
  Id: string
  DocNumber?: string
  TotalAmt: number
  Balance: number
  DueDate?: string
  TxnDate?: string
  CustomerRef?: { value: string; name: string }
  EmailStatus?: string
  PrivateNote?: string
}

async function refreshToken(connection: QBOConnection, supabase: SupabaseClient) {
  const response = await fetch(QBO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`).toString('base64')}`,
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token,
    }).toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to refresh token: ${errorText}`)
  }

  const tokenData = await response.json()
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

  // Update tokens in database
  await supabase
    .from('qbo_connections')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', connection.id)

  return tokenData.access_token
}

async function fetchQBOData(
  endpoint: string,
  accessToken: string,
  realmId: string
): Promise<unknown> {
  const url = `${QBO_API_BASE}/v3/company/${realmId}/${endpoint}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`QBO API error: ${response.status} - ${errorText}`)
  }

  return response.json()
}

export async function POST() {
  try {
    // Get current user using SSR client
    const userSupabase = await createSupabaseServerClient()

    const { data: { user }, error: userError } = await userSupabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Create admin client for database operations that need elevated permissions
    let supabase: SupabaseClient
    try {
      supabase = createSupabaseAdminClient()
    } catch {
      // Fall back to user client if admin client not available
      supabase = userSupabase
    }

    // Get user's company_id first
    const { data: dbUser, error: dbUserError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (dbUserError || !dbUser?.company_id) {
      return NextResponse.json(
        { error: 'User company not found' },
        { status: 400 }
      )
    }

    const companyId = dbUser.company_id

    // Get QBO connection by company_id
    const { data: connection, error: connectionError } = await supabase
      .from('qbo_connections')
      .select('*')
      .eq('company_id', companyId)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'QuickBooks not connected' },
        { status: 400 }
      )
    }

    // Check if token needs refresh
    let accessToken = connection.access_token
    const tokenExpiry = new Date(connection.token_expires_at)

    if (tokenExpiry <= new Date(Date.now() + 5 * 60 * 1000)) {
      // Token expires in less than 5 minutes, refresh it
      try {
        accessToken = await refreshToken(connection, supabase)
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
        return NextResponse.json(
          { error: 'QuickBooks token expired. Please reconnect.' },
          { status: 401 }
        )
      }
    }

    const realmId = connection.realm_id
    const syncResults = { customers: 0, invoices: 0, errors: [] as string[] }

    // Sync Customers
    try {
      const customerQuery = encodeURIComponent("SELECT * FROM Customer WHERE Active = true MAXRESULTS 100")
      const customersResponse = await fetchQBOData(
        `query?query=${customerQuery}`,
        accessToken,
        realmId
      ) as { QueryResponse?: { Customer?: QBOCustomer[] } }

      const qboCustomers = customersResponse?.QueryResponse?.Customer || []

      for (const qboCustomer of qboCustomers) {
        // Match by name + source='quickbooks' since schema doesn't have qbo_id
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('company_id', companyId)
          .eq('source', 'quickbooks')
          .eq('name', qboCustomer.DisplayName)
          .maybeSingle()

        const customerData = {
          company_id: companyId,
          name: qboCustomer.DisplayName,
          email: qboCustomer.PrimaryEmailAddr?.Address || null,
          phone: qboCustomer.PrimaryPhone?.FreeFormNumber || null,
          address: qboCustomer.BillAddr?.Line1 || null,
          city: qboCustomer.BillAddr?.City || null,
          state: qboCustomer.BillAddr?.CountrySubDivisionCode || null,
          zip: qboCustomer.BillAddr?.PostalCode || null,
          notes: qboCustomer.Notes || null,
          source: 'quickbooks',
        }

        if (existingCustomer) {
          await supabase
            .from('customers')
            .update(customerData)
            .eq('id', existingCustomer.id)
        } else {
          await supabase
            .from('customers')
            .insert(customerData)
        }

        syncResults.customers++
      }

      // Log sync batch
      await supabase.from('qbo_sync_log').insert({
        company_id: companyId,
        sync_type: 'customers',
        status: 'completed',
        records_synced: syncResults.customers,
      })
    } catch (customerError) {
      console.error('Error syncing customers:', customerError)
      syncResults.errors.push(`Customers: ${customerError instanceof Error ? customerError.message : 'Unknown error'}`)

      await supabase.from('qbo_sync_log').insert({
        company_id: companyId,
        sync_type: 'customers',
        status: 'failed',
        error_message: customerError instanceof Error ? customerError.message : 'Unknown error',
      })
    }

    // Sync Invoices
    try {
      const invoiceQuery = encodeURIComponent("SELECT * FROM Invoice MAXRESULTS 100")
      const invoicesResponse = await fetchQBOData(
        `query?query=${invoiceQuery}`,
        accessToken,
        realmId
      ) as { QueryResponse?: { Invoice?: QBOInvoice[] } }

      const qboInvoices = invoicesResponse?.QueryResponse?.Invoice || []

      for (const qboInvoice of qboInvoices) {
        // Find matching customer by name if we have a customer ref
        let customerId = null
        if (qboInvoice.CustomerRef?.name) {
          const { data: matchedCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('company_id', companyId)
            .eq('name', qboInvoice.CustomerRef.name)
            .maybeSingle()

          customerId = matchedCustomer?.id || null
        }

        // Check if invoice already exists by invoice_number
        const docNumber = qboInvoice.DocNumber || null
        let existingInvoice = null
        if (docNumber) {
          const { data } = await supabase
            .from('invoices')
            .select('id')
            .eq('company_id', companyId)
            .eq('invoice_number', docNumber)
            .maybeSingle()
          existingInvoice = data
        }

        // Determine invoice status based on balance
        let status: 'draft' | 'sent' | 'viewed' | 'paid' | 'partial' | 'overdue' = 'sent'
        if (qboInvoice.Balance === 0) {
          status = 'paid'
        } else if (qboInvoice.Balance < qboInvoice.TotalAmt) {
          status = 'partial'
        } else if (qboInvoice.DueDate && new Date(qboInvoice.DueDate) < new Date()) {
          status = 'overdue'
        }

        const invoiceData = {
          company_id: companyId,
          customer_id: customerId,
          invoice_number: docNumber,
          total: qboInvoice.TotalAmt,
          subtotal: qboInvoice.TotalAmt,
          tax_rate: 0,
          tax_amount: 0,
          discount_amount: 0,
          amount_paid: qboInvoice.TotalAmt - qboInvoice.Balance,
          status,
          due_date: qboInvoice.DueDate || null,
          notes: qboInvoice.PrivateNote ? `QBO: ${qboInvoice.PrivateNote}` : null,
        }

        if (existingInvoice) {
          await supabase
            .from('invoices')
            .update(invoiceData)
            .eq('id', existingInvoice.id)
        } else {
          await supabase
            .from('invoices')
            .insert(invoiceData)
        }

        syncResults.invoices++
      }

      // Log invoice sync batch
      await supabase.from('qbo_sync_log').insert({
        company_id: companyId,
        sync_type: 'invoices',
        status: 'completed',
        records_synced: syncResults.invoices,
      })
    } catch (invoiceError) {
      console.error('Error syncing invoices:', invoiceError)
      syncResults.errors.push(`Invoices: ${invoiceError instanceof Error ? invoiceError.message : 'Unknown error'}`)

      await supabase.from('qbo_sync_log').insert({
        company_id: companyId,
        sync_type: 'invoices',
        status: 'failed',
        error_message: invoiceError instanceof Error ? invoiceError.message : 'Unknown error',
      })
    }

    // Update last_sync_at
    await supabase
      .from('qbo_connections')
      .update({
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    return NextResponse.json({
      success: true,
      synced: {
        customers: syncResults.customers,
        invoices: syncResults.invoices,
      },
      errors: syncResults.errors.length > 0 ? syncResults.errors : undefined,
    })
  } catch (error) {
    console.error('Error in QuickBooks sync:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
