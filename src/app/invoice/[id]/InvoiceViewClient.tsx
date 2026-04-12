'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Company, Customer } from '@/types/database';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface PaymentMethod {
  method: string;
  handle: string | null;
  is_preferred: boolean;
  sort_order: number;
}

const PAYMENT_METHOD_LABELS: Record<string, { label: string; icon: string }> = {
  zelle: { label: 'Zelle', icon: '💸' },
  venmo: { label: 'Venmo', icon: '💜' },
  cashapp: { label: 'Cash App', icon: '💚' },
  paypal: { label: 'PayPal', icon: '🅿️' },
  square: { label: 'Square', icon: '⬜' },
  check: { label: 'Check', icon: '📝' },
  cash: { label: 'Cash', icon: '💵' },
  other: { label: 'Other', icon: '💳' },
};

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
  const t = useTranslations('misc.invoice');
  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [companyPaymentMethods, setCompanyPaymentMethods] = useState<PaymentMethod[]>([]);

  const fetchInvoice = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Only look up by UUID — do not fallback to invoice_number to prevent enumeration
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(params.id)) {
        setError('Invoice not found');
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('invoices')
        .select(`
          *,
          company:companies(*),
          customer:customers(*)
        `)
        .eq('id', params.id)
        .single();

      if (fetchError || !data) {
        setError('Invoice not found');
        setIsLoading(false);
        return;
      }

      setInvoice(data as unknown as InvoiceWithDetails);

      const { data: lineItems } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', data.id)
        .order('sort_order', { ascending: true });

      setItems((lineItems as InvoiceItem[]) || []);

      // Fetch structured payment methods for this company
      if (data.company_id) {
        const { data: pmData } = await supabase
          .from('company_payment_methods')
          .select('method, handle, is_preferred, sort_order')
          .eq('company_id', data.company_id)
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        if (pmData) setCompanyPaymentMethods(pmData as PaymentMethod[]);
      }

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
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError('Invoice not found');
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchInvoice();
    // Check for payment success return
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('paid') === 'true') {
      setPaymentSuccess(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchInvoice]);

  const handlePay = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const res = await fetch('/api/invoice/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice?.id }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setPayError(data.error || 'Failed to start payment');
        setPaying(false);
      }
    } catch {
      setPayError('Failed to connect to payment service');
      setPaying(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{t('invoiceNotFound')}</h1>
        <p className="text-gray-600 text-center">
          {t('invoiceNotFoundMessage')}
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
              <LanguageSwitcher />
              <div className="text-sm text-gray-500 mt-2">{t('invoiceNumber')}{invoice.invoice_number || invoice.id.slice(0, 8)}</div>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                invoice.status === 'paid'
                  ? 'bg-green-100 text-green-700'
                  : isOverdue
                  ? 'bg-red-100 text-red-700'
                  : invoice.status === 'partial'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {invoice.status === 'paid' ? t('paid') : isOverdue ? t('overdue') : invoice.status === 'partial' ? t('partiallyPaid') : t('due')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Payment Success Banner */}
        {paymentSuccess && invoice.status !== 'paid' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6 text-center">
            <div className="text-4xl mb-2">&#10003;</div>
            <h2 className="text-xl font-bold text-green-700">{t('paymentSubmitted')}</h2>
            <p className="text-green-600 text-sm mt-1">
              {t('paymentProcessing')}
            </p>
          </div>
        )}

        {/* Paid Banner */}
        {invoice.status === 'paid' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6 text-center">
            <div className="text-4xl mb-2">&#10003;</div>
            <h2 className="text-xl font-bold text-green-700">{t('paymentReceived')}</h2>
            <p className="text-green-600 text-sm mt-1">
              {t('thankYouPayment')}
            </p>
          </div>
        )}

        {/* Overdue Banner */}
        {isOverdue && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700 font-medium text-center">
              {t('pastDue', { date: formatDate(invoice.due_date) })}
            </p>
          </div>
        )}

        {/* Invoice Details Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          {/* From / To Info */}
          <div className="p-6 border-b border-gray-100">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-medium text-gray-400 uppercase mb-1">{t('from')}</div>
                <div className="font-semibold text-gray-800">{invoice.company?.name || 'Company'}</div>
                {companyAddress && <div className="text-sm text-gray-600">{companyAddress}</div>}
                {invoice.company?.phone && <div className="text-sm text-gray-600">{invoice.company.phone}</div>}
                {invoice.company?.email && <div className="text-sm text-gray-600">{invoice.company.email}</div>}
              </div>
              <div>
                <div className="text-xs font-medium text-gray-400 uppercase mb-1">{t('billTo')}</div>
                <div className="font-semibold text-gray-800">{invoice.customer?.name || 'Customer'}</div>
                {customerAddress && <div className="text-sm text-gray-600">{customerAddress}</div>}
                {invoice.customer?.email && <div className="text-sm text-gray-600">{invoice.customer.email}</div>}
                {invoice.customer?.phone && <div className="text-sm text-gray-600">{invoice.customer.phone}</div>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div>
                <div className="text-xs text-gray-400">{t('invoiceDate')}</div>
                <div className="text-sm font-medium text-gray-800">{formatDate(invoice.created_at)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">{t('dueDate')}</div>
                <div className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-800'}`}>
                  {formatDate(invoice.due_date)}
                  {isOverdue && ` (${t('overdue')})`}
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="p-6">
            <h3 className="font-semibold text-gray-800 mb-4">{t('items')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-sm font-medium text-gray-500">{t('description')}</th>
                    <th className="text-center py-2 text-sm font-medium text-gray-500 w-16">{t('qty')}</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-500 w-24">{t('price')}</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-500 w-24">{t('total')}</th>
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
                        {t('noLineItems')}
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
                    <span className="text-gray-500">{t('subtotal')}</span>
                    <span className="text-gray-800">${(invoice.subtotal || 0).toFixed(2)}</span>
                  </div>
                  {(invoice.tax_rate || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('tax')} ({invoice.tax_rate}%)</span>
                      <span className="text-gray-800">${(invoice.tax_amount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {(invoice.discount_amount || 0) > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>{t('discount')}</span>
                      <span>-${(invoice.discount_amount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-200">
                    <span className="text-gray-800">{t('total')}</span>
                    <span className="text-gray-800">${(invoice.total || 0).toFixed(2)}</span>
                  </div>
                  {(invoice.amount_paid || 0) > 0 && invoice.status !== 'paid' && (
                    <>
                      <div className="flex justify-between text-sm text-green-600">
                        <span>{t('paid')}</span>
                        <span>-${(invoice.amount_paid || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-red-600">
                        <span>{t('balanceDue')}</span>
                        <span>${balanceDue.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pay Now Button */}
          {invoice.status !== 'paid' && balanceDue > 0 && !paymentSuccess && (
            <div className="px-6 pb-6">
              {payError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-3">
                  {payError}
                </div>
              )}
              <button
                onClick={handlePay}
                disabled={paying}
                className="w-full py-4 bg-green-600 text-white text-lg font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {paying ? t('redirectingPayment') : `${t('payNow')} - $${balanceDue.toFixed(2)}`}
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">
                {t('securePayment')}
              </p>
            </div>
          )}

          {/* Payment Methods */}
          {invoice.status !== 'paid' && balanceDue > 0 && !paymentSuccess && (companyPaymentMethods.length > 0 || invoice.company?.payment_instructions) && (
            <div className="px-6 pb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm font-medium text-blue-800 mb-3">{t('paymentInstructions')}</div>
                {companyPaymentMethods.length > 0 ? (
                  <div className="space-y-2">
                    {companyPaymentMethods.map((pm) => {
                      const info = PAYMENT_METHOD_LABELS[pm.method] || { label: pm.method, icon: '💳' };
                      return (
                        <div key={pm.method} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${pm.is_preferred ? 'bg-white border border-blue-300' : 'bg-blue-50/50'}`}>
                          <span className="text-lg">{info.icon}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-blue-900">{info.label}</span>
                            {pm.handle && (
                              <span className="text-sm text-blue-700 ml-2">{pm.handle}</span>
                            )}
                          </div>
                          {pm.is_preferred && (
                            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200">
                              {t('paymentMethodsPreferred')}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-blue-700 whitespace-pre-wrap">{invoice.company?.payment_instructions}</div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="px-6 pb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-1">{t('notes')}</div>
                <div className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</div>
              </div>
            </div>
          )}
        </div>

        {/* Contact */}
        {invoice.company?.phone && (
          <div className="text-center mb-6">
            <p className="text-sm text-gray-500">
              {t('questionsCall')}{' '}
              <a href={`tel:${invoice.company.phone}`} className="text-blue-600 font-medium">
                {invoice.company.phone}
              </a>
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>{t('poweredBy')} <span className="font-semibold">ToolTime Pro</span></p>
        </div>
      </div>
    </div>
  );
}
