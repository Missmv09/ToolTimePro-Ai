'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Quote, Company, Customer } from '@/types/database';

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

// Demo quote data as fallback
const demoQuote = {
  id: 'demo',
  quote_number: 'QT-2024-001',
  status: 'sent' as const,
  created_at: '2024-01-15',
  valid_until: '2024-02-15',
  company: {
    id: 'demo-company',
    name: 'Green Valley Landscaping',
    phone: '(555) 123-4567',
    email: 'info@greenvalley.com',
    logo_url: null,
    address: '456 Business Ave',
    city: 'Sacramento',
    state: 'CA',
    zip: '95814',
  },
  customer: {
    id: 'demo-customer',
    name: 'John Smith',
    phone: '(555) 987-6543',
    email: 'john@email.com',
    address: '123 Oak Street',
    city: 'San Jose',
    state: 'CA',
    zip: '95123',
  },
  items: [
    { id: '1', description: 'Front yard lawn mowing (1/4 acre)', quantity: 1, unit_price: 45, total_price: 45 },
    { id: '2', description: 'Hedge trimming - front yard', quantity: 1, unit_price: 65, total_price: 65 },
    { id: '3', description: 'Edge trimming along walkway & driveway', quantity: 1, unit_price: 25, total_price: 25 },
    { id: '4', description: 'Gutter cleaning', quantity: 1, unit_price: 95, total_price: 95 },
    { id: '5', description: 'Yard debris cleanup & haul away', quantity: 1, unit_price: 50, total_price: 50 },
  ],
  subtotal: 280,
  tax_rate: 8.25,
  tax_amount: 23.10,
  discount_amount: 0,
  total: 303.10,
  notes: 'Work will be completed within 1-2 business days of approval. All debris will be hauled away. Please ensure gate access is available.',
};

export default function CustomerQuoteView({ params }: { params: { id: string } }) {
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // Fetch quote from Supabase
  const fetchQuote = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check for demo quote
      if (params.id === 'demo' || params.id === 'QT-2024-001') {
        setQuote(demoQuote as unknown as QuoteWithDetails);
        setItems(demoQuote.items);
        setIsLoading(false);
        return;
      }

      // Fetch quote with company and customer details
      const { data, error: fetchError } = await supabase
        .from('quotes')
        .select(`
          *,
          company:companies(*),
          customer:customers(*)
        `)
        .eq('id', params.id)
        .single();

      if (fetchError) {
        // Try by quote_number
        const { data: byNumber, error: numberError } = await supabase
          .from('quotes')
          .select(`
            *,
            company:companies(*),
            customer:customers(*)
          `)
          .eq('quote_number', params.id)
          .single();

        if (numberError) throw fetchError;

        setQuote(byNumber as unknown as QuoteWithDetails);

        // Fetch line items
        const { data: lineItems } = await supabase
          .from('quote_items')
          .select('*')
          .eq('quote_id', byNumber.id)
          .order('created_at', { ascending: true });

        setItems((lineItems as QuoteLineItem[]) || []);
      } else {
        setQuote(data as unknown as QuoteWithDetails);

        // Fetch line items
        const { data: lineItems } = await supabase
          .from('quote_items')
          .select('*')
          .eq('quote_id', data.id)
          .order('created_at', { ascending: true });

        setItems((lineItems as QuoteLineItem[]) || []);

        // Mark as viewed if not already
        if (data.status === 'sent') {
          await supabase
            .from('quotes')
            .update({
              status: 'viewed',
              viewed_at: new Date().toISOString()
            })
            .eq('id', data.id);
        }
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

    try {
      // Update quote in database (skip for demo)
      if (quote.id !== 'demo' && quote.id !== 'QT-2024-001') {
        const { error: updateError } = await supabase
          .from('quotes')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
            signature_url: signature,
          })
          .eq('id', quote.id);

        if (updateError) throw updateError;
      }

      setQuoteStatus('approved');
    } catch (err) {
      console.error('Error approving quote:', err);
      alert('Failed to approve quote. Please try again.');
    } finally {
      setIsProcessing(false);
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

    try {
      // Update quote in database (skip for demo)
      if (quote.id !== 'demo' && quote.id !== 'QT-2024-001') {
        const { error: updateError } = await supabase
          .from('quotes')
          .update({
            status: 'rejected',
            notes: quote.notes ? `${quote.notes}\n\nRejection reason: ${rejectReason}` : `Rejection reason: ${rejectReason}`,
          })
          .eq('id', quote.id);

        if (updateError) throw updateError;
      }

      setQuoteStatus('rejected');
    } catch (err) {
      console.error('Error rejecting quote:', err);
      alert('Failed to decline quote. Please try again.');
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
        <h1 className="text-2xl font-bold text-navy-500 mb-2">Quote Not Found</h1>
        <p className="text-gray-600 text-center">
          The quote you&apos;re looking for doesn&apos;t exist or has expired.
        </p>
      </div>
    );
  }

  // Check if quote is expired
  const isExpired = quote.valid_until ? new Date(quote.valid_until) < new Date() : false;
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
              <div className="text-sm text-gray-500">Quote #{quote.quote_number || quote.id.slice(0, 8)}</div>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                quoteStatus === 'approved'
                  ? 'bg-green-100 text-green-700'
                  : quoteStatus === 'rejected'
                  ? 'bg-red-100 text-red-700'
                  : isExpired
                  ? 'bg-gray-100 text-gray-700'
                  : 'bg-gold-100 text-gold-700'
              }`}>
                {quoteStatus === 'approved' ? '✓ Approved' : quoteStatus === 'rejected' ? 'Declined' : isExpired ? 'Expired' : 'Awaiting Response'}
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
            <h2 className="text-2xl font-bold text-green-700 mb-2">Quote Approved!</h2>
            <p className="text-green-600 mb-4">
              Thank you for your business! You can schedule your service now or we&apos;ll be in touch shortly.
            </p>
            {signature && (
              <div className="inline-block p-2 bg-white rounded border border-green-200 mb-4">
                <Image src={signature} alt="Your signature" className="h-16 w-auto" width={200} height={64} />
              </div>
            )}
            {quote.company?.id && (
              <div className="mt-4">
                <a
                  href={`/book/${quote.company.id}?${new URLSearchParams({
                    ...(quote.customer?.name ? { name: quote.customer.name } : {}),
                    ...(quote.customer?.email ? { email: quote.customer.email } : {}),
                    ...(quote.customer?.phone ? { phone: quote.customer.phone } : {}),
                    ...(quote.customer?.address ? { address: quote.customer.address } : {}),
                    ...(quote.customer?.city ? { city: quote.customer.city } : {}),
                    ...(quote.customer?.state ? { state: quote.customer.state } : {}),
                    ...(quote.customer?.zip ? { zip: quote.customer.zip } : {}),
                    from: 'quote',
                    quoteId: quote.id,
                  }).toString()}`}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gold-500 text-navy-900 rounded-xl font-semibold text-lg hover:bg-gold-600 transition-colors no-underline"
                >
                  📅 Schedule Your Service
                </a>
                <p className="text-sm text-green-600 mt-2">
                  Pick a date and time that works best for you
                </p>
              </div>
            )}
          </div>
        )}

        {quoteStatus === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6 text-center">
            <div className="text-5xl mb-4">😔</div>
            <h2 className="text-2xl font-bold text-red-700 mb-2">Quote Declined</h2>
            <p className="text-red-600 mb-4">
              We&apos;re sorry this quote didn&apos;t work out. Feel free to reach out if you&apos;d like to discuss other options.
            </p>
            {rejectReason && (
              <p className="text-sm text-red-500">Reason: {rejectReason}</p>
            )}
          </div>
        )}

        {/* Quote Details Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          {/* Customer Info */}
          <div className="p-6 border-b border-gray-100">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Prepared for</div>
                <div className="font-semibold text-navy-500">{quote.customer?.name || 'Customer'}</div>
                <div className="text-sm text-gray-600">{customerAddress}</div>
              </div>
              <div className="md:text-right">
                <div className="text-sm text-gray-500 mb-1">Quote Date</div>
                <div className="font-medium text-navy-500">{formatDate(quote.created_at)}</div>
                <div className="text-sm text-gray-500 mt-2">Valid Until</div>
                <div className={`font-medium ${isExpired ? 'text-red-500' : 'text-navy-500'}`}>
                  {formatDate(quote.valid_until)}
                  {isExpired && ' (Expired)'}
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="p-6">
            <h3 className="font-semibold text-navy-500 mb-4">Service Details</h3>
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
                      <td className="py-3 text-navy-500">{item.description}</td>
                      <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                      <td className="py-3 text-right text-gray-600">${(item.unit_price || 0).toFixed(2)}</td>
                      <td className="py-3 text-right font-medium text-navy-500">${(item.total_price || 0).toFixed(2)}</td>
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
                    <span className="text-navy-500">${(quote.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tax ({quote.tax_rate || 0}%)</span>
                    <span className="text-navy-500">${(quote.tax_amount || 0).toFixed(2)}</span>
                  </div>
                  {(quote.discount_amount || 0) > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-${(quote.discount_amount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-200">
                    <span className="text-navy-500">Total</span>
                    <span className="text-gold-600">${(quote.total || 0).toFixed(2)}</span>
                  </div>
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

        {/* Action Buttons */}
        {quoteStatus === 'viewing' && !isExpired && !showRejectReason && (
          <div className="bg-white rounded-xl shadow-sm p-6">
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
                    ✓ Approve Quote (${(quote.total || 0).toFixed(2)})
                  </>
                ) : (
                  <>
                    ✍️ Sign & Approve
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
