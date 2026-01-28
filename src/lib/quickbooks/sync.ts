import { getSupabaseAdmin } from '@/lib/supabase-server'
import { makeQBORequest, logSync, updateLastSync, getQBOConnection } from './client'

// QBO Customer type
interface QBOCustomer {
  Id?: string
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
  sparse?: boolean
}

// QBO Invoice type
interface QBOInvoice {
  Id?: string
  CustomerRef: { value: string; name?: string }
  Line: QBOInvoiceLine[]
  DueDate?: string
  TxnDate?: string
  DocNumber?: string
  TotalAmt?: number
  Balance?: number
  sparse?: boolean
}

interface QBOInvoiceLine {
  Id?: string
  DetailType: 'SalesItemLineDetail' | 'SubTotalLineDetail' | 'DescriptionOnly'
  Amount: number
  Description?: string
  SalesItemLineDetail?: {
    ItemRef?: { value: string; name?: string }
    Qty?: number
    UnitPrice?: number
  }
}

// Local customer type
interface LocalCustomer {
  id: string
  company_id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  notes: string | null
  qbo_id: string | null
  qbo_synced_at: string | null
}

// Local invoice type
interface LocalInvoice {
  id: string
  company_id: string
  customer_id: string
  invoice_number: string | null
  subtotal: number
  total: number
  amount_paid: number
  status: string
  due_date: string | null
  notes: string | null
  qbo_id: string | null
  qbo_synced_at: string | null
  customer?: LocalCustomer
}

// Sync a single customer to QuickBooks
export async function syncCustomerToQBO(
  userId: string,
  customerId: string
): Promise<{ success: boolean; qboId?: string; error?: string }> {
  // Get the customer from local database
  const { data: customer, error: fetchError } = await getSupabaseAdmin()
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single()

  if (fetchError || !customer) {
    await logSync(userId, 'customer', 'to_qbo', 'error', customerId, undefined, 'Customer not found')
    return { success: false, error: 'Customer not found' }
  }

  // Build QBO customer object
  const qboCustomer: QBOCustomer = {
    DisplayName: customer.name,
    sparse: true, // Sparse update - only send fields we want to change
  }

  if (customer.email) {
    qboCustomer.PrimaryEmailAddr = { Address: customer.email }
  }

  if (customer.phone) {
    qboCustomer.PrimaryPhone = { FreeFormNumber: customer.phone }
  }

  if (customer.address || customer.city || customer.state || customer.zip) {
    qboCustomer.BillAddr = {
      Line1: customer.address || undefined,
      City: customer.city || undefined,
      CountrySubDivisionCode: customer.state || undefined,
      PostalCode: customer.zip || undefined,
    }
  }

  if (customer.notes) {
    qboCustomer.Notes = customer.notes
  }

  // If customer already has QBO ID, update; otherwise create
  if (customer.qbo_id) {
    qboCustomer.Id = customer.qbo_id
  }

  // Make API request
  const endpoint = '/customer'
  const { data: response, error: apiError } = await makeQBORequest<{ Customer: QBOCustomer }>(
    userId,
    endpoint,
    'POST',
    qboCustomer
  )

  if (apiError || !response?.Customer) {
    await logSync(userId, 'customer', 'to_qbo', 'error', customerId, undefined, apiError || 'Unknown error')
    return { success: false, error: apiError || 'Failed to sync customer' }
  }

  const qboId = response.Customer.Id

  // Update local customer with QBO ID
  await getSupabaseAdmin()
    .from('customers')
    .update({
      qbo_id: qboId,
      qbo_synced_at: new Date().toISOString(),
    })
    .eq('id', customerId)

  await logSync(userId, 'customer', 'to_qbo', 'success', customerId, qboId)
  return { success: true, qboId }
}

// Sync a single invoice to QuickBooks
export async function syncInvoiceToQBO(
  userId: string,
  invoiceId: string
): Promise<{ success: boolean; qboId?: string; error?: string }> {
  // Get the invoice with customer data
  const { data: invoice, error: fetchError } = await getSupabaseAdmin()
    .from('invoices')
    .select(`
      *,
      customer:customers(*)
    `)
    .eq('id', invoiceId)
    .single()

  if (fetchError || !invoice) {
    await logSync(userId, 'invoice', 'to_qbo', 'error', invoiceId, undefined, 'Invoice not found')
    return { success: false, error: 'Invoice not found' }
  }

  // Check if customer is synced to QBO
  const customer = invoice.customer as LocalCustomer | null
  if (!customer?.qbo_id) {
    // Try to sync customer first
    if (customer) {
      const customerSync = await syncCustomerToQBO(userId, customer.id)
      if (!customerSync.success) {
        await logSync(userId, 'invoice', 'to_qbo', 'error', invoiceId, undefined, 'Customer not synced to QuickBooks')
        return { success: false, error: 'Customer must be synced to QuickBooks first' }
      }
      // Re-fetch customer to get updated qbo_id
      const { data: updatedCustomer } = await getSupabaseAdmin()
        .from('customers')
        .select('qbo_id')
        .eq('id', customer.id)
        .single()
      if (!updatedCustomer?.qbo_id) {
        return { success: false, error: 'Failed to get customer QBO ID' }
      }
      customer.qbo_id = updatedCustomer.qbo_id
    } else {
      await logSync(userId, 'invoice', 'to_qbo', 'error', invoiceId, undefined, 'Invoice has no customer')
      return { success: false, error: 'Invoice has no customer' }
    }
  }

  // Get invoice items
  const { data: invoiceItems } = await getSupabaseAdmin()
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('sort_order')

  // Build QBO invoice lines
  const lines: QBOInvoiceLine[] = []

  if (invoiceItems && invoiceItems.length > 0) {
    for (const item of invoiceItems) {
      lines.push({
        DetailType: 'SalesItemLineDetail',
        Amount: item.total_price || 0,
        Description: item.description,
        SalesItemLineDetail: {
          Qty: item.quantity || 1,
          UnitPrice: item.unit_price || 0,
        },
      })
    }
  } else {
    // If no line items, create a single line with the total
    lines.push({
      DetailType: 'SalesItemLineDetail',
      Amount: invoice.total || 0,
      Description: 'Services',
      SalesItemLineDetail: {
        Qty: 1,
        UnitPrice: invoice.total || 0,
      },
    })
  }

  // Build QBO invoice object
  const qboInvoice: QBOInvoice = {
    CustomerRef: {
      value: customer.qbo_id!,
      name: customer.name,
    },
    Line: lines,
    sparse: true,
  }

  if (invoice.due_date) {
    qboInvoice.DueDate = invoice.due_date
  }

  if (invoice.invoice_number) {
    qboInvoice.DocNumber = invoice.invoice_number
  }

  // If invoice already has QBO ID, update; otherwise create
  if (invoice.qbo_id) {
    qboInvoice.Id = invoice.qbo_id
  }

  // Make API request
  const endpoint = '/invoice'
  const { data: response, error: apiError } = await makeQBORequest<{ Invoice: QBOInvoice }>(
    userId,
    endpoint,
    'POST',
    qboInvoice
  )

  if (apiError || !response?.Invoice) {
    await logSync(userId, 'invoice', 'to_qbo', 'error', invoiceId, undefined, apiError || 'Unknown error')
    return { success: false, error: apiError || 'Failed to sync invoice' }
  }

  const qboId = response.Invoice.Id

  // Update local invoice with QBO ID
  await getSupabaseAdmin()
    .from('invoices')
    .update({
      qbo_id: qboId,
      qbo_synced_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)

  await logSync(userId, 'invoice', 'to_qbo', 'success', invoiceId, qboId)
  return { success: true, qboId }
}

// Sync all unsynced customers
export async function syncAllCustomers(
  userId: string
): Promise<{ synced: number; errors: number }> {
  // Get user's company
  const { data: userData } = await getSupabaseAdmin()
    .from('users')
    .select('company_id')
    .eq('id', userId)
    .single()

  if (!userData?.company_id) {
    return { synced: 0, errors: 0 }
  }

  // Get all unsynced customers
  const { data: customers } = await getSupabaseAdmin()
    .from('customers')
    .select('id')
    .eq('company_id', userData.company_id)
    .is('qbo_synced_at', null)

  if (!customers || customers.length === 0) {
    return { synced: 0, errors: 0 }
  }

  let synced = 0
  let errors = 0

  for (const customer of customers) {
    const result = await syncCustomerToQBO(userId, customer.id)
    if (result.success) {
      synced++
    } else {
      errors++
    }
  }

  return { synced, errors }
}

// Sync all unsynced invoices
export async function syncAllInvoices(
  userId: string
): Promise<{ synced: number; errors: number }> {
  // Get user's company
  const { data: userData } = await getSupabaseAdmin()
    .from('users')
    .select('company_id')
    .eq('id', userId)
    .single()

  if (!userData?.company_id) {
    return { synced: 0, errors: 0 }
  }

  // Get all unsynced invoices (only sent, paid, partial, or overdue - not drafts)
  const { data: invoices } = await getSupabaseAdmin()
    .from('invoices')
    .select('id')
    .eq('company_id', userData.company_id)
    .is('qbo_synced_at', null)
    .in('status', ['sent', 'viewed', 'paid', 'partial', 'overdue'])

  if (!invoices || invoices.length === 0) {
    return { synced: 0, errors: 0 }
  }

  let synced = 0
  let errors = 0

  for (const invoice of invoices) {
    const result = await syncInvoiceToQBO(userId, invoice.id)
    if (result.success) {
      synced++
    } else {
      errors++
    }
  }

  return { synced, errors }
}

// Full sync - customers then invoices
export async function syncAll(userId: string): Promise<{
  customers: { synced: number; errors: number }
  invoices: { synced: number; errors: number }
}> {
  const connection = await getQBOConnection(userId)
  if (!connection) {
    return {
      customers: { synced: 0, errors: 0 },
      invoices: { synced: 0, errors: 0 },
    }
  }

  const customers = await syncAllCustomers(userId)
  const invoices = await syncAllInvoices(userId)

  // Update last sync timestamp
  await updateLastSync(userId)

  return { customers, invoices }
}
