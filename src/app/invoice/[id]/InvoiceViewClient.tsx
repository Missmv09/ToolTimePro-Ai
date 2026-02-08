'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Company, Customer } from '@/types/database';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface InvoiceWithDetails {
  id: string;
  invoice_number: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  status: string;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  company: Company | null;
  customer: Customer | null;
}

export default function InvoiceViewClient({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoice = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('invoices')
        .select(`
          *,
          company:companies(*),
          customer:customers(*)
        `)
        .eq('id', params.id)
        .single();

      if (fetchError) {
        // Try by invoice_number
        const { data: byNumber, error: numberError } = await supabase
          .from('invoices')
          .select(`
            *,
            company:companies(*),
            customer:customers(*)
          `)
          .eq('invoice_number', params.id)
          .single();

        if (numberError) throw fetchError;

        setInvoice(byNumber as unknown as InvoiceWithDetails);

        const { data: lineItems } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', byNumber.id)
          .order('sort_order', { ascending: true });

        setItems((lineItems as InvoiceItem[]) || []);
      } else {
        setInvoice(data as unknown as InvoiceWithDetails);

        const { data: lineItems } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', data.id)
          .order('sort_order', { ascending: true });

        setItems((lineItems as InvoiceItem[]) || []);

        // Mark as viewed if sent
        if (data.status === 'sent') {
          await supabase
            .from('invoices')
            .update({
              status: 'viewed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', data.id);
        }
      }
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError('Invoice not found');
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="text-red-500 text-5xl mb-4">!</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Invoice Not Found</h1>
        <p className="text-gray-600 text-center">
          The invoice you&apos;re looking for doesn&apos;t exist or may have been removed.
        </p>
      </div>
    );
  }

  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && !['paid', 'cancelled'].includes(invoice.status);
  const companyAddress = [invoice.company?.address, invoice.company?.city, invoice.company?.state, invoice.company?.zip]
    .filter(Boolean)
    .join(', ');
  const customerAddress = [invoice.customer?.address, invoice.customer?.city, invoice.customer?.state, invoice.customer?.zip]
    .filter(Boolean)
    .join(', ');
  const balanceDue = invoice.total - (invoice.amount_paid || 0);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Company Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              {invoice.company?.logo_url ? (
                <img src={invoice.company.logo_url} alt={invoice.company.name} className="h-12" />
              ) : (
                <h1 className="text-2xl font-bold text-gray-800">{invoice.company?.name || 'Company'}</h1>
              )}
              {invoice.company?.phone && (
                <p className="text-sm text-gray-500 mt-1">{invoice.company.phone}</p>
              )}
              {invoice.company?.email && (
                <p className="text-sm text-gray-500">{invoice.company.email}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Invoice #{invoice.invoice_number || invoice.id.slice(0, 8)}</div>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                invoice.status === 'paid'
                  ? 'bg-green-100 text-green-700'
                  : isOverdue
                  ? 'bg-red-100 text-red-700'
                  : invoice.status === 'partial'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {invoice.status === 'paid' ? 'Paid' : isOverdue ? 'Overdue' : invoice.status === 'partial' ? 'Partially Paid' : 'Due'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Paid Banner */}
        {invoice.status === 'paid' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6 text-center">
            <div className="text-4xl mb-2">&#10003;</div>
            <h2 className="text-xl font-bold text-green-700">Payment Received</h2>
            <p className="text-green-600 text-sm mt-1">
              Thank you for your payment!
            </p>
          </div>
        )}

        {/* Overdue Banner */}
        {isOverdue && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700 font-medium text-center">
              This invoice is past due. It was due on {formatDate(invoice.due_date)}.
            </p>
          </div>
        )}

        {/* Invoice Details Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          {/* From / To Info */}
          <div className="p-6 border-b border-gray-100">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-medium text-gray-400 uppercase mb-1">From</div>
                <div className="font-semibold text-gray-800">{invoice.company?.name || 'Company'}</div>
                {companyAddress && <div className="text-sm text-gray-600">{companyAddress}</div>}
                {invoice.company?.phone && <div className="text-sm text-gray-600">{invoice.company.phone}</div>}
                {invoice.company?.email && <div className="text-sm text-gray-600">{invoice.company.email}</div>}
              </div>
              <div>
                <div className="text-xs font-medium text-gray-400 uppercase mb-1">Bill To</div>
                <div className="font-semibold text-gray-800">{invoice.customer?.name || 'Customer'}</div>
                {customerAddress && <div className="text-sm text-gray-600">{customerAddress}</div>}
                {invoice.customer?.email && <div className="text-sm text-gray-600">{invoice.customer.email}</div>}
                {invoice.customer?.phone && <div className="text-sm text-gray-600">{invoice.customer.phone}</div>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div>
                <div className="text-xs text-gray-400">Invoice Date</div>
                <div className="text-sm font-medium text-gray-800">{formatDate(invoice.created_at)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Due Date</div>
                <div className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-800'}`}>
                  {formatDate(invoice.due_date)}
                  {isOverdue && ' (Overdue)'}
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-sm font-medium text-gray-500">Description</th>
                    <th className="text-center py-2 text-sm font-medium text-gray-500 w-16">Qty</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-500 w-24">Price</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-500 w-24">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-3 text-gray-800">{item.description}</td>
                      <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                      <td className="py-3 text-right text-gray-600">${(item.unit_price || 0).toFixed(2)}</td>
                      <td className="py-3 text-right font-medium text-gray-800">${(item.total_price || item.quantity * item.unit_price || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-500">
                        No line items
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="text-gray-800">${(invoice.subtotal || 0).toFixed(2)}</span>
                  </div>
                  {(invoice.tax_rate || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tax ({invoice.tax_rate}%)</span>
                      <span className="text-gray-800">${(invoice.tax_amount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {(invoice.discount_amount || 0) > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-${(invoice.discount_amount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-200">
                    <span className="text-gray-800">Total</span>
                    <span className="text-gray-800">${(invoice.total || 0).toFixed(2)}</span>
                  </div>
                  {(invoice.amount_paid || 0) > 0 && invoice.status !== 'paid' && (
                    <>
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Paid</span>
                        <span>-${(invoice.amount_paid || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-red-600">
                        <span>Balance Due</span>
                        <span>${balanceDue.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="px-6 pb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-1">Notes</div>
                <div className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</div>
              </div>
            </div>
          )}
        </div>

        {/* Contact */}
        {invoice.company?.phone && (
          <div className="text-center mb-6">
            <p className="text-sm text-gray-500">
              Questions? Call us at{' '}
              <a href={`tel:${invoice.company.phone}`} className="text-blue-600 font-medium">
                {invoice.company.phone}
              </a>
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>Powered by <span className="font-semibold">ToolTime Pro</span></p>
        </div>
      </div>
    </div>
  );
}
