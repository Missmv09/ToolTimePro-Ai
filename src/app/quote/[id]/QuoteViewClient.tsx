'use client';

import { useState, useRef, useEffect } from 'react';

// Demo quote data (in real app, fetched from Supabase by ID)
const demoQuote = {
  id: 'QT-2024-001',
  status: 'sent' as const,
  createdAt: '2024-01-15',
  validUntil: '2024-02-15',
  company: {
    name: 'Green Valley Landscaping',
    phone: '(555) 123-4567',
    email: 'info@greenvalley.com',
    logo: null,
    address: '456 Business Ave, Sacramento, CA 95814',
  },
  customer: {
    name: 'John Smith',
    phone: '(555) 987-6543',
    email: 'john@email.com',
    address: '123 Oak Street, San Jose, CA 95123',
  },
  items: [
    { description: 'Front yard lawn mowing (1/4 acre)', quantity: 1, unit: 'each', price: 45, total: 45 },
    { description: 'Hedge trimming - front yard', quantity: 1, unit: 'each', price: 65, total: 65 },
    { description: 'Edge trimming along walkway & driveway', quantity: 1, unit: 'each', price: 25, total: 25 },
    { description: 'Gutter cleaning', quantity: 1, unit: 'each', price: 95, total: 95 },
    { description: 'Yard debris cleanup & haul away', quantity: 1, unit: 'each', price: 50, total: 50 },
  ],
  hasOptions: true,
  options: [
    {
      name: 'Good',
      description: 'Essential maintenance',
      items: ['Lawn mowing', 'Edge trimming'],
      total: 70,
    },
    {
      name: 'Better',
      description: 'Recommended package',
      items: ['Lawn mowing', 'Edge trimming', 'Hedge trimming', 'Cleanup'],
      total: 185,
    },
    {
      name: 'Best',
      description: 'Complete service',
      items: ['All services including gutter cleaning'],
      total: 280,
    },
  ],
  subtotal: 280,
  taxRate: 8.25,
  taxAmount: 23.10,
  discount: 0,
  total: 303.10,
  notes: 'Work will be completed within 1-2 business days of approval. All debris will be hauled away. Please ensure gate access is available.',
  terms: 'Payment due upon completion. We accept cash, check, and all major credit cards.',
};

export default function CustomerQuoteView({ params }: { params: { id: string } }) {
  const [quote] = useState(demoQuote);
  const [selectedOption, setSelectedOption] = useState<number | null>(quote.hasOptions ? 1 : null); // Default to "Better"
  const [showSignature, setShowSignature] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [quoteStatus, setQuoteStatus] = useState<'viewing' | 'approved' | 'rejected'>('viewing');
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

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

  // Calculate total based on selected option
  const getSelectedTotal = () => {
    if (quote.hasOptions && selectedOption !== null) {
      return quote.options[selectedOption].total;
    }
    return quote.total;
  };

  const getSelectedTax = () => {
    const subtotal = quote.hasOptions && selectedOption !== null
      ? quote.options[selectedOption].total
      : quote.subtotal;
    return subtotal * (quote.taxRate / 100);
  };

  const getFinalTotal = () => {
    const subtotal = getSelectedTotal();
    const tax = getSelectedTax();
    return subtotal + tax - quote.discount;
  };

  // Approve quote
  const approveQuote = () => {
    if (!signature) {
      setShowSignature(true);
      return;
    }

    setIsProcessing(true);
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      setQuoteStatus('approved');
    }, 1500);
  };

  // Reject quote
  const rejectQuote = () => {
    if (!showRejectReason) {
      setShowRejectReason(true);
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setQuoteStatus('rejected');
    }, 1000);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Check if quote is expired
  const isExpired = new Date(quote.validUntil) < new Date();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Company Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              {quote.company.logo ? (
                <img src={quote.company.logo} alt={quote.company.name} className="h-12" />
              ) : (
                <h1 className="text-2xl font-bold text-navy-500">{quote.company.name}</h1>
              )}
              <p className="text-sm text-gray-500 mt-1">{quote.company.phone}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Quote #{quote.id}</div>
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
              Thank you for your business! We&apos;ll be in touch shortly to schedule your service.
            </p>
            {signature && (
              <div className="inline-block p-2 bg-white rounded border border-green-200">
                <img src={signature} alt="Your signature" className="h-16" />
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
                <div className="font-semibold text-navy-500">{quote.customer.name}</div>
                <div className="text-sm text-gray-600">{quote.customer.address}</div>
              </div>
              <div className="md:text-right">
                <div className="text-sm text-gray-500 mb-1">Quote Date</div>
                <div className="font-medium text-navy-500">{formatDate(quote.createdAt)}</div>
                <div className="text-sm text-gray-500 mt-2">Valid Until</div>
                <div className={`font-medium ${isExpired ? 'text-red-500' : 'text-navy-500'}`}>
                  {formatDate(quote.validUntil)}
                  {isExpired && ' (Expired)'}
                </div>
              </div>
            </div>
          </div>

          {/* Good/Better/Best Options */}
          {quote.hasOptions && quoteStatus === 'viewing' && !isExpired && (
            <div className="p-6 bg-gray-50 border-b border-gray-100">
              <h3 className="font-semibold text-navy-500 mb-4">Choose Your Package</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {quote.options.map((option, index) => (
                  <button
                    key={option.name}
                    onClick={() => setSelectedOption(index)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedOption === index
                        ? 'border-gold-500 bg-white shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg">
                        {index === 0 ? '⭐' : index === 1 ? '⭐⭐' : '⭐⭐⭐'}
                      </span>
                      {index === 1 && (
                        <span className="text-xs bg-gold-500 text-navy-900 px-2 py-0.5 rounded-full font-medium">
                          Popular
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-navy-500">{option.name}</div>
                    <div className="text-sm text-gray-500 mb-2">{option.description}</div>
                    <div className="text-2xl font-bold text-navy-500">${option.total}</div>
                    <ul className="mt-2 space-y-1">
                      {option.items.map((item, i) => (
                        <li key={i} className="text-xs text-gray-500 flex items-start gap-1">
                          <span className="text-gold-500">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </div>
          )}

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
                  {quote.items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-3 text-navy-500">{item.description}</td>
                      <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                      <td className="py-3 text-right text-gray-600">${item.price.toFixed(2)}</td>
                      <td className="py-3 text-right font-medium text-navy-500">${item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="text-navy-500">${getSelectedTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tax ({quote.taxRate}%)</span>
                    <span className="text-navy-500">${getSelectedTax().toFixed(2)}</span>
                  </div>
                  {quote.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-${quote.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-200">
                    <span className="text-navy-500">Total</span>
                    <span className="text-gold-600">${getFinalTotal().toFixed(2)}</span>
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

          {/* Terms */}
          {quote.terms && (
            <div className="px-6 pb-6">
              <div className="text-xs text-gray-500">{quote.terms}</div>
            </div>
          )}
        </div>

        {/* Signature Section */}
        {signature && quoteStatus === 'viewing' && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Your Signature</div>
                <img src={signature} alt="Signature" className="h-16 border border-gray-200 rounded p-1" />
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
                    ✓ Approve Quote (${getFinalTotal().toFixed(2)})
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
                <a href={`tel:${quote.company.phone}`} className="text-gold-600 font-medium">
                  {quote.company.phone}
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
              href={`tel:${quote.company.phone}`}
              className="inline-block px-6 py-3 bg-gold-500 text-navy-900 rounded-lg font-semibold hover:bg-gold-600 transition-colors"
            >
              Call {quote.company.phone}
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
