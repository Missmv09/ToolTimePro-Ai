'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Company, Customer } from '@/types/database';
import { computeBalanceDue } from '@/lib/totals';
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

type PaymentTerms = 'due_on_receipt' | 'net_15' | 'net_30' | 'net_60';

const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  due_on_receipt: 'Due on receipt',
  net_15: 'Net 15',
  net_30: 'Net 30',
  net_60: 'Net 60',
};

interface PaymentRecord {
  id: string;
  amount: number;
  payment_method: string | null;
  paid_at: string | null;
  card_brand: string | null;
  card_last4: string | null;
  receipt_sent_at: string | null;
  notes: string | null;
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
  paid_at?: string | null;
  po_number: string | null;
  payment_terms: PaymentTerms | null;
  company: (Company & { google_review_link?: string | null; yelp_review_link?: string | null }) | null;
  customer: (Customer & { customer_type?: 'residential' | 'commercial' | null; business_name?: string | null; card_last4?: string | null }) | null;
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
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [saveCard, setSaveCard] = useState(false);

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

      // Fetch via the service-role public route. The invoices table is behind
      // company-scoped RLS, so a logged-out customer cannot read it with the
      // anon client — this endpoint reads server-side and marks it viewed.
      const res = await fetch(`/api/invoice/public?id=${encodeURIComponent(params.id)}`);
      const data = await res.json();

      if (!res.ok || !data?.invoice) {
        setError('Invoice not found');
        setIsLoading(false);
        return;
      }

      setInvoice(data.invoice as InvoiceWithDetails);
      setItems((data.items as InvoiceItem[]) || []);
      setCompanyPaymentMethods((data.paymentMethods as PaymentMethod[]) || []);
      setPayments((data.payments as PaymentRecord[]) || []);
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError('Invoice not found');
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    // Check for payment success return
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    if (urlParams.get('paid') === 'true') {
      setPaymentSuccess(true);
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (sessionId) {
      // Confirm server-side with Stripe so the invoice flips to paid even if
      // the webhook is late or not configured; then load the updated invoice.
      setConfirming(true);
      fetch('/api/stripe/checkout/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
        .catch(() => null)
        .finally(() => {
          setConfirming(false);
          fetchInvoice();
        });
    } else {
      fetchInvoice();
    }
  }, [fetchInvoice]);

  const handlePay = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const res = await fetch('/api/invoice/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice?.id, saveCard }),
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
    // due_date is a DATE column ('YYYY-MM-DD'); new Date() parses it as UTC
    // midnight and renders a day early in timezones behind UTC. Append a local
    // time for date-only strings; leave full timestamps (created_at) untouched.
    const d = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? new Date(dateStr + 'T00:00:00') : new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading || confirming) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        {confirming && (
          <div className="text-center">
            <p className="text-gray-700 font-medium">{t('confirmingPayment')}</p>
            <p className="text-gray-500 text-sm">{t('confirmingPaymentMessage')}</p>
          </div>
        )}
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
  const balanceDue = computeBalanceDue(invoice.total, invoice.amount_paid || 0);
  const isPaid = invoice.status === 'paid';
  const isPartial = !isPaid && (invoice.amount_paid || 0) > 0;
  const latestPayment = payments[0] || null;
  const reviewLink = invoice.company?.google_review_link || invoice.company?.yelp_review_link || null;
  const bookingLink = invoice.company?.id ? `/book/${invoice.company.id}` : null;
  const customerFirstName = (invoice.customer?.name || '').split(' ')[0];
  const receiptContact = invoice.customer?.email || invoice.customer?.phone || null;
  const paidWithLabel = latestPayment?.card_last4
    ? `${latestPayment.card_brand ? latestPayment.card_brand.charAt(0).toUpperCase() + latestPayment.card_brand.slice(1) : 'Card'} •••• ${latestPayment.card_last4}`
    : latestPayment?.payment_method === 'stripe' || latestPayment?.payment_method === 'card_on_file'
    ? 'Card'
    : latestPayment?.payment_method
    ? latestPayment.payment_method.charAt(0).toUpperCase() + latestPayment.payment_method.slice(1)
    : null;

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
        {paymentSuccess && !isPaid && !isPartial && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6 text-center">
            <div className="text-4xl mb-2">&#10003;</div>
            <h2 className="text-xl font-bold text-green-700">{t('paymentSubmitted')}</h2>
            <p className="text-green-600 text-sm mt-1">
              {t('paymentProcessing')}
            </p>
          </div>
        )}

        {/* Paid Banner + Receipt */}
        {isPaid && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6" data-testid="paid-banner">
            <div className="text-center">
              <div className="text-4xl mb-2">&#10003;</div>
              <h2 className="text-xl font-bold text-green-700">{t('paymentReceived')}</h2>
              <p className="text-green-700 text-sm mt-1">
                {customerFirstName ? t('paymentReceivedThanks', { name: customerFirstName }) : t('thankYouPayment')}
              </p>
              {receiptContact && (
                <p className="text-green-600 text-xs mt-1">{t('receiptSentTo', { contact: receiptContact })}</p>
              )}
            </div>

            <div className="bg-white rounded-lg border border-green-100 mt-5 p-4 print:border-0">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('receiptTitle')}</div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="text-xs text-blue-600 hover:text-blue-800 print:hidden"
                >
                  {t('printReceipt')}
                </button>
              </div>
              <dl className="grid grid-cols-2 gap-y-1 text-sm">
                <dt className="text-gray-500">{t('amountPaid')}</dt>
                <dd className="text-right font-semibold text-gray-800">${(invoice.amount_paid || invoice.total || 0).toFixed(2)}</dd>
                <dt className="text-gray-500">{t('paidOn')}</dt>
                <dd className="text-right text-gray-800">{formatDate(latestPayment?.paid_at || invoice.paid_at || invoice.created_at)}</dd>
                {paidWithLabel && (
                  <>
                    <dt className="text-gray-500">{t('paidWith')}</dt>
                    <dd className="text-right text-gray-800">{paidWithLabel}</dd>
                  </>
                )}
                <dt className="text-gray-500">{t('invoiceNumber')}</dt>
                <dd className="text-right text-gray-800">{invoice.invoice_number || invoice.id.slice(0, 8)}</dd>
                <dt className="text-gray-500 pt-2 border-t border-gray-100">{t('balanceDue')}</dt>
                <dd className="text-right text-green-700 font-semibold pt-2 border-t border-gray-100">{t('paidInFull')}</dd>
              </dl>
              {invoice.customer?.card_last4 && (
                <p className="text-xs text-gray-500 mt-3">{t('cardSavedNotice', { last4: invoice.customer.card_last4 })}</p>
              )}
            </div>
          </div>
        )}

        {/* Deposit / Partial Payment Banner */}
        {isPartial && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6 text-center" data-testid="deposit-banner">
            <div className="text-4xl mb-2">&#10003;</div>
            <h2 className="text-xl font-bold text-green-700">{t('depositReceived')}</h2>
            <p className="text-green-700 text-sm mt-1">
              {t('depositReceivedMessage', { amount: `$${balanceDue.toFixed(2)}` })}
            </p>
            {receiptContact && (
              <p className="text-green-600 text-xs mt-1">{t('receiptSentTo', { contact: receiptContact })}</p>
            )}
          </div>
        )}

        {/* What's next — rebook, review, contact */}
        {isPaid && (bookingLink || reviewLink || invoice.company?.phone) && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 print:hidden" data-testid="next-steps">
            <h3 className="font-semibold text-gray-800 mb-4">{t('whatsNext')}</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {bookingLink && (
                <a
                  href={bookingLink}
                  className="block border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <div className="text-2xl mb-2">📅</div>
                  <div className="font-medium text-gray-800">{t('bookAgainTitle')}</div>
                  <div className="text-sm text-gray-500 mt-1">{t('bookAgainText')}</div>
                  <div className="text-sm font-semibold text-blue-600 mt-3">{t('bookAgainButton')} &rarr;</div>
                </a>
              )}
              {reviewLink && (
                <a
                  href={reviewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border border-gray-200 rounded-lg p-4 hover:border-amber-400 hover:bg-amber-50 transition-colors"
                >
                  <div className="text-2xl mb-2">⭐</div>
                  <div className="font-medium text-gray-800">{t('reviewTitle')}</div>
                  <div className="text-sm text-gray-500 mt-1">{t('reviewText', { company: invoice.company?.name || 'us' })}</div>
                  <div className="text-sm font-semibold text-amber-600 mt-3">{t('reviewButton')} &rarr;</div>
                </a>
              )}
              {invoice.company?.phone && (
                <a
                  href={`tel:${invoice.company.phone}`}
                  className="block border border-gray-200 rounded-lg p-4 hover:border-green-400 hover:bg-green-50 transition-colors"
                >
                  <div className="text-2xl mb-2">📞</div>
                  <div className="font-medium text-gray-800">{t('contactTitle')}</div>
                  <div className="text-sm text-gray-500 mt-1">{t('contactText')}</div>
                  <div className="text-sm font-semibold text-green-600 mt-3">{t('contactButton', { phone: invoice.company.phone })}</div>
                </a>
              )}
            </div>
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
                {invoice.customer?.customer_type === 'commercial' && invoice.customer?.business_name ? (
                  <>
                    <div className="font-semibold text-gray-800">{invoice.customer.business_name}</div>
                    <div className="text-sm text-gray-600">Attn: {invoice.customer.name}</div>
                  </>
                ) : (
                  <div className="font-semibold text-gray-800">{invoice.customer?.name || 'Customer'}</div>
                )}
                {customerAddress && <div className="text-sm text-gray-600">{customerAddress}</div>}
                {invoice.customer?.email && <div className="text-sm text-gray-600">{invoice.customer.email}</div>}
                {invoice.customer?.phone && <div className="text-sm text-gray-600">{invoice.customer.phone}</div>}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
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
              {invoice.payment_terms && (
                <div>
                  <div className="text-xs text-gray-400">Terms</div>
                  <div className="text-sm font-medium text-gray-800">
                    {PAYMENT_TERMS_LABELS[invoice.payment_terms] || invoice.payment_terms}
                  </div>
                </div>
              )}
              {invoice.po_number && (
                <div>
                  <div className="text-xs text-gray-400">PO Number</div>
                  <div className="text-sm font-medium text-gray-800">{invoice.po_number}</div>
                </div>
              )}
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

          {/* Pay Now Button — only when the company has actually onboarded Stripe Connect.
              Otherwise the API returns 500 and the customer hits a dead-end.
              Customers can still pay via the alternative methods below (Zelle/Venmo/check/etc). */}
          {invoice.status !== 'paid' && balanceDue > 0 && !paymentSuccess && invoice.company?.stripe_connect_onboarded && (
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
              <label className="flex items-start gap-2 mt-3 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveCard}
                  onChange={(e) => setSaveCard(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  data-testid="save-card-checkbox"
                />
                <span>
                  <span className="font-medium text-gray-700">{t('saveCardLabel')}</span>
                  <span className="block text-xs text-gray-400 mt-0.5">{t('saveCardHelp', { company: invoice.company?.name || 'This company' })}</span>
                </span>
              </label>
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
          <p>{t('poweredBy')} <span className="font-semibold">Task Iguana</span></p>
        </div>
      </div>
    </div>
  );
}
