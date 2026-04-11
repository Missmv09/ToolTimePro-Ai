'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Quote, Company, Customer } from '@/types/database';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface QuoteLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface QuoteWithDetails extends Quote {
  company: Company | null;
  customer: Customer | null;
  quote_line_items?: QuoteLineItem[];
}


export default function CustomerQuoteView({ params }: { params: { id: string } }) {
  const t = useTranslations('misc.quote');
  const [quote, setQuote] = useState<QuoteWithDetails | null>(null);
  const [items, setItems] = useState<QuoteLineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showSignature, setShowSignature] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [quoteStatus, setQuoteStatus] = useState<'viewing' | 'approved' | 'rejected'>('viewing');
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [schedulingRequested, setSchedulingRequested] = useState(false);
  const [requestingSchedule, setRequestingSchedule] = useState(false);
  const [preferredContact, setPreferredContact] = useState<string>('');
  const [depositPaid, setDepositPaid] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // Fetch quote from Supabase
  const fetchQuote = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch quote via server-side API (bypasses RLS for public access)
      const res = await fetch(`/api/quote/public?id=${encodeURIComponent(params.id)}`);

      if (!res.ok) {
        throw new Error('Quote not found');
      }

      const { quote: fetchedQuote, lineItems } = await res.json();
      setQuote(fetchedQuote as QuoteWithDetails);
      setItems((lineItems as QuoteLineItem[]) || []);

      // Reflect already-decided quotes from the database
      if (fetchedQuote.status === 'approved') {
        setQuoteStatus('approved');
      } else if (fetchedQuote.status === 'rejected') {
        setQuoteStatus('rejected');
      }
    } catch (err) {
      console.error('Error fetching quote:', err);
      setError('Quote not found');
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchQuote();
    // Check for deposit paid return
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('deposit_paid') === 'true') {
      setDepositPaid(true);
      setQuoteStatus('approved');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchQuote]);

  // Initialize canvas for signature
  useEffect(() => {
    if (showSignature && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      canvas.style.width = `${canvas.offsetWidth}px`;
      canvas.style.height = `${canvas.offsetHeight}px`;

      const context = canvas.getContext('2d');
      if (context) {
        context.scale(2, 2);
        context.lineCap = 'round';
        context.strokeStyle = '#1a365d';
        context.lineWidth = 2;
        contextRef.current = context;
      }
    }
  }, [showSignature]);

  // Signature drawing functions
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;

    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !contextRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;

    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
  };

  const stopDrawing = () => {
    if (contextRef.current) {
      contextRef.current.closePath();
    }
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas && contextRef.current) {
      contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignature(null);
  };

  const saveSignature = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      setSignature(dataUrl);
      setShowSignature(false);
    }
  };

  // Approve quote
  const approveQuote = async () => {
    if (!signature) {
      setShowSignature(true);
      return;
    }

    if (!quote) return;

    setIsProcessing(true);
    setActionError(null);

    try {
      // Update quote in database (skip for demo)
      if (quote.id !== 'demo' && quote.id !== 'QT-2024-001') {
        const res = await fetch('/api/quote/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quoteId: quote.id, action: 'approve', signature }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to approve');
        }

        // Save SMS consent if customer opted in
        if (smsOptIn && quote.customer?.id) {
          try {
            await fetch('/api/quote/sms-consent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ customerId: quote.customer.id, quoteId: quote.id, consent: true }),
            });
          } catch {
            // SMS consent save is best-effort, don't block approval
          }
        }

        // Notify company owner that customer approved the quote
        try {
          await fetch('/api/quote/notify-approval', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quoteId: quote.id,
              to: quote.company?.email,
              ownerName: quote.company?.name || 'Team',
              quoteNumber: quote.quote_number || quote.id.slice(0, 8),
              customerName: quote.customer?.name || 'Customer',
              total: quote.total || 0,
              itemCount: items.length,
              dashboardLink: `${window.location.origin}/dashboard/quotes`,
            }),
          });
        } catch {
          // Notification is best-effort, don't block approval
        }
      }

      // If deposit required, redirect to payment
      if (quote.deposit_required && !quote.deposit_paid && quote.id !== 'demo') {
        try {
          const payRes = await fetch('/api/quote/deposit-pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quoteId: quote.id }),
          });
          const payData = await payRes.json();
          if (payRes.ok && payData.url) {
            window.location.href = payData.url;
            return;
          }
        } catch {
          // If deposit payment fails, still show approval success
        }
      }

      setQuoteStatus('approved');
    } catch (err) {
      console.error('Error approving quote:', err);
      setActionError('Failed to approve quote. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Request scheduling - notifies the business owner
  const requestScheduling = async () => {
    if (!quote) return;
    setRequestingSchedule(true);
    try {
      await fetch('/api/quote/request-scheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: quote.id,
          quoteNumber: quote.quote_number || quote.id.slice(0, 8),
          customerName: quote.customer?.name || 'Customer',
          customerPhone: quote.customer?.phone || '',
          customerEmail: quote.customer?.email || '',
          companyId: quote.company?.id,
          total: quote.total,
          preferredContact: preferredContact || 'anytime',
        }),
      });
      setSchedulingRequested(true);
    } catch (err) {
      console.error('Error requesting scheduling:', err);
    } finally {
      setRequestingSchedule(false);
    }
  };

  // Reject quote
  const rejectQuote = async () => {
    if (!showRejectReason) {
      setShowRejectReason(true);
      return;
    }

    if (!quote) return;

    setIsProcessing(true);
    setActionError(null);

    try {
      // Update quote in database (skip for demo)
      if (quote.id !== 'demo' && quote.id !== 'QT-2024-001') {
        const res = await fetch('/api/quote/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quoteId: quote.id, action: 'reject', rejectReason }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to decline');
        }

        // Notify owner(s) about the declined quote
        try {
          await fetch('/api/quote/notify-cancellation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quoteId: quote.id,
              reason: rejectReason || undefined,
            }),
          });
        } catch {
          // Notification failure should not block the decline flow
          console.log('Owner cancellation notification skipped or failed');
        }
      }

      setQuoteStatus('rejected');
    } catch (err) {
      console.error('Error rejecting quote:', err);
      setActionError('Failed to decline quote. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Format date
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
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-navy-500 mb-2">{t('quoteNotFound')}</h1>
        <p className="text-gray-600 text-center">
          {t('quoteNotFoundMessage')}
        </p>
      </div>
    );
  }

  // Check if quote is expired – compare dates only (ignore time-of-day / timezone).
  // Parsing "YYYY-MM-DD" with the Date constructor can shift by ±1 day depending
  // on the browser timezone, so we split and compare date parts explicitly.
  const isExpired = (() => {
    if (!quote.valid_until) return false;
    const [y, m, d] = quote.valid_until.split('-').map(Number);
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const validUntilUTC = new Date(Date.UTC(y, m - 1, d));
    return validUntilUTC < todayUTC;
  })();
  const companyAddress = [quote.company?.address, quote.company?.city, quote.company?.state, quote.company?.zip]
    .filter(Boolean)
    .join(', ');
  const customerAddress = [quote.customer?.address, quote.customer?.city, quote.customer?.state, quote.customer?.zip]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Company Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              {quote.company?.logo_url ? (
                <Image src={quote.company.logo_url} alt={quote.company.name} className="h-12 w-auto" width={200} height={48} />
              ) : (
                <h1 className="text-2xl font-bold text-navy-500">{quote.company?.name || 'Company'}</h1>
              )}
              <p className="text-sm text-gray-500 mt-1">{quote.company?.phone}</p>
            </div>
            <div className="text-right">
              <LanguageSwitcher />
              <div className="text-sm text-gray-500 mt-2">{t('quoteNumber')}{quote.quote_number || quote.id.slice(0, 8)}</div>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                quoteStatus === 'approved'
                  ? 'bg-green-100 text-green-700'
                  : quoteStatus === 'rejected'
                  ? 'bg-red-100 text-red-700'
                  : isExpired
                  ? 'bg-gray-100 text-gray-700'
                  : 'bg-gold-100 text-gold-700'
              }`}>
                {quoteStatus === 'approved' ? `✓ ${t('approved')}` : quoteStatus === 'rejected' ? t('declined') : isExpired ? t('expired') : t('awaitingResponse')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Success/Rejection Messages */}
        {quoteStatus === 'approved' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-green-700 mb-2">
              {depositPaid ? t('quoteApprovedDeposit') : t('quoteApproved')}
            </h2>
            <p className="text-green-600 mb-4">
              {depositPaid
                ? t('depositReceived')
                : t('thankYouBusiness')}
            </p>
            {signature && (
              <div className="inline-block p-2 bg-white rounded border border-green-200 mb-4">
                <Image src={signature} alt="Your signature" className="h-16 w-auto" width={200} height={64} />
              </div>
            )}

            {/* Scheduling Request Section */}
            {!schedulingRequested ? (
              <div className="mt-6 bg-white rounded-xl border border-green-200 p-6 text-left max-w-md mx-auto">
                <h3 className="font-semibold text-gray-800 text-center mb-2">{t('readyToSchedule')}</h3>
                <p className="text-sm text-gray-600 text-center mb-4">
                  {t('scheduleMessage')}
                </p>
                <div className="space-y-2 mb-4">
                  {[
                    { value: 'morning', label: t('morning') },
                    { value: 'afternoon', label: t('afternoon') },
                    { value: 'evening', label: t('evening') },
                    { value: 'anytime', label: t('anytime') },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setPreferredContact(option.value)}
                      className={`w-full p-3 text-left rounded-lg border transition-colors text-sm ${
                        preferredContact === option.value
                          ? 'border-blue-500 bg-blue-50 text-blue-800'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={requestScheduling}
                  disabled={requestingSchedule}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {requestingSchedule ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('sending')}
                    </>
                  ) : (
                    t('requestCall')
                  )}
                </button>
                {quote.company?.phone && (
                  <p className="text-xs text-gray-500 text-center mt-3">
                    {t('callDirectly')}{' '}
                    <a href={`tel:${quote.company.phone}`} className="text-blue-600 font-medium">
                      {quote.company.phone}
                    </a>
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-6 bg-white rounded-xl border border-green-200 p-6 max-w-md mx-auto">
                <div className="text-3xl mb-2">&#10003;</div>
                <h3 className="font-semibold text-green-700 mb-2">{t('scheduleSent')}</h3>
                <p className="text-sm text-gray-600">
                  We&apos;ve notified {quote.company?.name || 'the team'} and they&apos;ll reach out
                  {preferredContact && preferredContact !== 'anytime'
                    ? ` during your preferred time (${preferredContact})`
                    : ' shortly'
                  } to schedule your service.
                </p>
                {quote.company?.phone && (
                  <p className="text-sm text-gray-500 mt-3">
                    {t('reachSooner')}{' '}
                    <a href={`tel:${quote.company.phone}`} className="text-blue-600 font-medium">
                      {quote.company.phone}
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {quoteStatus === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6 text-center">
            <div className="text-5xl mb-4">😔</div>
            <h2 className="text-2xl font-bold text-red-700 mb-2">{t('quoteDeclined')}</h2>
            <p className="text-red-600 mb-4">
              {t('quoteDeclinedMessage')}
            </p>
            {rejectReason && (
              <p className="text-sm text-red-500">{t('reason')} {rejectReason}</p>
            )}
          </div>
        )}

        {/* Quote Details Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          {/* Customer Info */}
          <div className="p-6 border-b border-gray-100">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">{t('preparedFor')}</div>
                <div className="font-semibold text-navy-500">{quote.customer?.name || 'Customer'}</div>
                <div className="text-sm text-gray-600">{customerAddress}</div>
              </div>
              <div className="md:text-right">
                <div className="text-sm text-gray-500 mb-1">{t('quoteDate')}</div>
                <div className="font-medium text-navy-500">{formatDate(quote.created_at)}</div>
                <div className="text-sm text-gray-500 mt-2">{t('validUntil')}</div>
                <div className={`font-medium ${isExpired ? 'text-red-500' : 'text-navy-500'}`}>
                  {formatDate(quote.valid_until)}
                  {isExpired && ` (${t('expired')})`}
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="p-6">
            <h3 className="font-semibold text-navy-500 mb-4">{t('serviceDetails')}</h3>
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
                      <td className="py-3 text-navy-500">{item.description}</td>
                      <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                      <td className="py-3 text-right text-gray-600">${(item.unit_price || 0).toFixed(2)}</td>
                      <td className="py-3 text-right font-medium text-navy-500">${(item.total_price || 0).toFixed(2)}</td>
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
                    <span className="text-navy-500">${(quote.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('tax')} ({quote.tax_rate || 0}%)</span>
                    <span className="text-navy-500">${(quote.tax_amount || 0).toFixed(2)}</span>
                  </div>
                  {(quote.discount_amount || 0) > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>{t('discount')}</span>
                      <span>-${(quote.discount_amount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-200">
                    <span className="text-navy-500">{t('total')}</span>
                    <span className="text-gold-600">${(quote.total || 0).toFixed(2)}</span>
                  </div>
                  {quote.deposit_required && (
                    <div className="flex justify-between text-sm pt-2 mt-2 border-t border-dashed border-gray-200">
                      <span className="text-gray-600 font-medium">Deposit Required</span>
                      <span className="text-gray-800 font-bold">
                        ${(quote.deposit_amount || (quote.deposit_percentage ? (quote.deposit_percentage / 100) * (quote.total || 0) : 0)).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {quote.deposit_paid && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Deposit Paid</span>
                      <span>&#10003;</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="px-6 pb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-1">Notes</div>
                <div className="text-sm text-gray-600">{quote.notes}</div>
              </div>
            </div>
          )}

          {/* Terms & Conditions */}
          {(() => {
            const terms = (quote as unknown as Record<string, unknown>).terms as string | undefined
            if (!terms) return null
            return (
              <div className="px-6 pb-6">
                <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400">
                  <div className="text-sm font-medium text-blue-800 mb-1">Terms & Conditions</div>
                  <div className="text-sm text-blue-700 whitespace-pre-line">{terms}</div>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Signature Section */}
        {signature && quoteStatus === 'viewing' && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Your Signature</div>
                <Image src={signature} alt="Signature" className="h-16 w-auto border border-gray-200 rounded p-1" width={200} height={64} />
              </div>
              <button
                onClick={() => {
                  setSignature(null);
                  setShowSignature(true);
                }}
                className="text-sm text-gold-600 hover:text-gold-700"
              >
                Re-sign
              </button>
            </div>
          </div>
        )}

        {/* Signature Modal */}
        {showSignature && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-navy-500">Sign to Approve</h3>
                <p className="text-sm text-gray-500">Draw your signature below</p>
              </div>
              <div className="p-4">
                <div className="border-2 border-gray-300 rounded-lg bg-gray-50 relative">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-40 cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  <div className="absolute bottom-2 left-2 right-2 border-t border-gray-300 pointer-events-none">
                    <span className="text-xs text-gray-400 bg-gray-50 px-1 relative -top-2">Sign here</span>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 flex gap-3">
                <button
                  onClick={clearSignature}
                  className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowSignature(false)}
                  className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSignature}
                  className="flex-1 py-2 bg-gold-500 text-navy-900 rounded-lg hover:bg-gold-600 transition-colors font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Reason Modal */}
        {showRejectReason && quoteStatus === 'viewing' && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h3 className="font-semibold text-navy-500 mb-3">Why are you declining?</h3>
            <p className="text-sm text-gray-500 mb-4">This helps us improve our quotes (optional)</p>
            <div className="space-y-2 mb-4">
              {['Price too high', 'Found another provider', 'Project cancelled', 'Need different services', 'Other'].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setRejectReason(reason)}
                  className={`w-full p-3 text-left rounded-lg border transition-colors ${
                    rejectReason === reason
                      ? 'border-navy-500 bg-navy-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectReason(false)}
                className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={rejectQuote}
                disabled={isProcessing}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Decline Quote'}
              </button>
            </div>
          </div>
        )}

        {/* Inline Error Banner */}
        {actionError && quoteStatus === 'viewing' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3" role="alert">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700 font-medium">{actionError}</p>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-red-400 hover:text-red-600 text-sm font-medium"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* SMS Opt-In + Action Buttons */}
        {quoteStatus === 'viewing' && !isExpired && !showRejectReason && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            {/* SMS Opt-In */}
            {quote.customer?.phone && (
              <div className="mb-5 border border-gray-200 rounded-lg p-4 bg-gray-50">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smsOptIn}
                    onChange={(e) => setSmsOptIn(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-800">
                      I&apos;d like to receive text message updates
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Get SMS notifications about your quote status, appointment reminders, and invoices.
                      Message &amp; data rates may apply. You can opt out anytime by replying STOP.
                    </p>
                  </div>
                </label>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={approveQuote}
                disabled={isProcessing}
                className="flex-1 py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Processing...
                  </>
                ) : signature ? (
                  <>
                    &#10003; Approve Quote (${(quote.total || 0).toFixed(2)})
                  </>
                ) : (
                  <>
                    Sign &amp; Approve
                  </>
                )}
              </button>
              <button
                onClick={() => setShowRejectReason(true)}
                className="sm:w-auto px-6 py-4 border-2 border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl font-medium transition-colors"
              >
                Decline
              </button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                Questions? Call us at{' '}
                <a href={`tel:${quote.company?.phone}`} className="text-gold-600 font-medium">
                  {quote.company?.phone}
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Expired Notice */}
        {isExpired && quoteStatus === 'viewing' && (
          <div className="bg-gray-100 rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">⏰</div>
            <h3 className="font-semibold text-gray-700 mb-2">This quote has expired</h3>
            <p className="text-gray-500 mb-4">Please contact us for an updated quote.</p>
            <a
              href={`tel:${quote.company?.phone}`}
              className="inline-block px-6 py-3 bg-gold-500 text-navy-900 rounded-lg font-semibold hover:bg-gold-600 transition-colors"
            >
              Call {quote.company?.phone}
            </a>
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
