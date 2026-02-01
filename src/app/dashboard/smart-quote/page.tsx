'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Types
interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: 'each' | 'hour' | 'sqft' | 'linear_ft';
  price: number;
  total: number;
  aiSuggestion?: { min: number; max: number };
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface QuoteOption {
  name: string;
  description: string;
  items: LineItem[];
  total: number;
}

// Quick add services
const quickAddServices = [
  { icon: '🌿', name: 'Lawn Care', price: 45, unit: 'each' as const },
  { icon: '🌳', name: 'Tree Trim', price: 120, unit: 'each' as const },
  { icon: '🧹', name: 'Cleanup', price: 65, unit: 'each' as const },
  { icon: '🔧', name: 'Repair', price: 85, unit: 'hour' as const },
  { icon: '🏊', name: 'Pool Service', price: 95, unit: 'each' as const },
  { icon: '🪟', name: 'Window Clean', price: 8, unit: 'each' as const },
  { icon: '🎨', name: 'Painting', price: 3, unit: 'sqft' as const },
  { icon: '💡', name: 'Electrical', price: 95, unit: 'hour' as const },
];

// AI market rate suggestions (mock data)
const marketRates: Record<string, { min: number; max: number }> = {
  'lawn': { min: 35, max: 75 },
  'mow': { min: 35, max: 75 },
  'tree': { min: 100, max: 300 },
  'trim': { min: 50, max: 150 },
  'hedge': { min: 40, max: 100 },
  'cleanup': { min: 50, max: 120 },
  'gutter': { min: 75, max: 200 },
  'pool': { min: 80, max: 150 },
  'paint': { min: 2, max: 5 },
  'repair': { min: 75, max: 150 },
  'electrical': { min: 85, max: 175 },
  'plumbing': { min: 90, max: 180 },
};

export default function SmartQuotingPage() {
  const router = useRouter();
  const { user, dbUser, isLoading: authLoading } = useAuth();

  // Company and auth state - get from AuthContext
  const companyId = dbUser?.company_id || null;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);

  // Quote mode state
  const [quoteMode, setQuoteMode] = useState<'manual' | 'voice' | 'photo'>('manual');

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  // Photo state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Customer state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [language, setLanguage] = useState<'en' | 'es'>('en');

  // Line items state
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [showAiSuggestion, setShowAiSuggestion] = useState<string | null>(null);

  // Good/Better/Best options
  const [showMultipleOptions, setShowMultipleOptions] = useState(false);
  const [quoteOptions, setQuoteOptions] = useState<QuoteOption[]>([
    { name: 'Good', description: 'Basic service', items: [], total: 0 },
    { name: 'Better', description: 'Standard + extras', items: [], total: 0 },
    { name: 'Best', description: 'Premium full service', items: [], total: 0 },
  ]);

  // Quote details
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState(30);

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const discountAmount = discount;
  const grandTotal = subtotal + taxAmount - discountAmount;

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substring(2, 9);

  // Fetch customers once we have company_id from AuthContext
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    // Redirect if not authenticated
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Fetch customers once we have a company_id
    if (companyId) {
      const fetchCustomers = async () => {
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name, phone, email, address')
          .eq('company_id', companyId)
          .order('name');

        setCustomers(customersData || []);
        setIsLoadingCustomers(false);
      };
      fetchCustomers();
    } else {
      // No company_id yet, stop loading to avoid infinite loop
      setIsLoadingCustomers(false);
    }
  }, [authLoading, user, companyId, router]);

  // Voice quote functions
  const startVoiceRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition is not supported in your browser. Try Chrome.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === 'es' ? 'es-ES' : 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      setVoiceTranscript('');
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setVoiceTranscript(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();

    // Store recognition instance for stopping
    (window as any).currentRecognition = recognition;
  };

  const stopVoiceRecording = () => {
    if ((window as any).currentRecognition) {
      (window as any).currentRecognition.stop();
    }
    setIsRecording(false);

    if (voiceTranscript) {
      processVoiceToLineItems(voiceTranscript);
    }
  };

  const processVoiceToLineItems = (transcript: string) => {
    setIsProcessingVoice(true);

    // Simulate AI processing delay
    setTimeout(() => {
      const words = transcript.toLowerCase();
      const newItems: LineItem[] = [];

      // Parse common services from transcript
      if (words.includes('lawn') || words.includes('mow')) {
        newItems.push({
          id: generateId(),
          description: 'Lawn mowing service',
          quantity: 1,
          unit: 'each',
          price: 45,
          total: 45,
          aiSuggestion: marketRates['lawn'],
        });
      }
      if (words.includes('hedge') || words.includes('bush')) {
        newItems.push({
          id: generateId(),
          description: 'Hedge trimming',
          quantity: 1,
          unit: 'each',
          price: 65,
          total: 65,
          aiSuggestion: marketRates['hedge'],
        });
      }
      if (words.includes('gutter')) {
        newItems.push({
          id: generateId(),
          description: 'Gutter cleaning',
          quantity: 1,
          unit: 'each',
          price: 95,
          total: 95,
          aiSuggestion: marketRates['gutter'],
        });
      }
      if (words.includes('tree')) {
        newItems.push({
          id: generateId(),
          description: 'Tree trimming',
          quantity: 1,
          unit: 'each',
          price: 120,
          total: 120,
          aiSuggestion: marketRates['tree'],
        });
      }
      if (words.includes('cleanup') || words.includes('clean up')) {
        newItems.push({
          id: generateId(),
          description: 'Yard cleanup',
          quantity: 1,
          unit: 'each',
          price: 65,
          total: 65,
          aiSuggestion: marketRates['cleanup'],
        });
      }
      if (words.includes('pool')) {
        newItems.push({
          id: generateId(),
          description: 'Pool service',
          quantity: 1,
          unit: 'each',
          price: 95,
          total: 95,
          aiSuggestion: marketRates['pool'],
        });
      }

      // If no items parsed, add a generic one
      if (newItems.length === 0) {
        newItems.push({
          id: generateId(),
          description: transcript.slice(0, 100),
          quantity: 1,
          unit: 'each',
          price: 0,
          total: 0,
        });
      }

      setLineItems(prev => [...prev, ...newItems]);
      setIsProcessingVoice(false);
      setQuoteMode('manual');
    }, 1500);
  };

  // Photo quote functions
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        analyzePhoto();
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzePhoto = () => {
    setIsAnalyzingPhoto(true);

    // Simulate AI analysis
    setTimeout(() => {
      // Demo: Add some suggested items based on "AI analysis"
      const suggestedItems: LineItem[] = [
        {
          id: generateId(),
          description: 'Front yard lawn mowing (approx. 1/4 acre)',
          quantity: 1,
          unit: 'each',
          price: 45,
          total: 45,
          aiSuggestion: { min: 35, max: 55 },
        },
        {
          id: generateId(),
          description: 'Edge trimming along walkway',
          quantity: 1,
          unit: 'each',
          price: 25,
          total: 25,
          aiSuggestion: { min: 20, max: 35 },
        },
        {
          id: generateId(),
          description: 'Hedge trimming (estimated 30 linear ft)',
          quantity: 30,
          unit: 'linear_ft',
          price: 3,
          total: 90,
          aiSuggestion: { min: 2, max: 4 },
        },
      ];

      setLineItems(prev => [...prev, ...suggestedItems]);
      setIsAnalyzingPhoto(false);
      setQuoteMode('manual');
    }, 2500);
  };

  // Line item functions
  const addLineItem = (service?: typeof quickAddServices[0]) => {
    const newItem: LineItem = {
      id: generateId(),
      description: service?.name || '',
      quantity: 1,
      unit: service?.unit || 'each',
      price: service?.price || 0,
      total: service?.price || 0,
    };
    setLineItems(prev => [...prev, newItem]);
  };

  const updateLineItem = (id: string, updates: Partial<LineItem>) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        updated.total = updated.quantity * updated.price;
        return updated;
      }
      return item;
    }));
  };

  const removeLineItem = (id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const getAiSuggestion = (item: LineItem) => {
    const words = item.description.toLowerCase().split(' ');
    for (const word of words) {
      if (marketRates[word]) {
        updateLineItem(item.id, { aiSuggestion: marketRates[word] });
        setShowAiSuggestion(item.id);
        return;
      }
    }
    // Default suggestion if no match
    updateLineItem(item.id, { aiSuggestion: { min: item.price * 0.8, max: item.price * 1.3 } });
    setShowAiSuggestion(item.id);
  };

  // Customer search filter - use real customers from Supabase
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearch)) ||
    (c.email && c.email.toLowerCase().includes(customerSearch.toLowerCase()))
  );

  // Send quote
  const [sendMethod, setSendMethod] = useState<'sms' | 'email' | 'both'>('both');
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [quoteSent, setQuoteSent] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Save quote to Supabase (as draft)
  const saveQuote = async (asDraft: boolean = true) => {
    if (!companyId) {
      setSaveError('Please log in to save quotes');
      return null;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // First, find or create customer
      let customerId: string | null = selectedCustomer?.id || null;

      if (!customerId && newCustomer.name) {
        // Check if customer already exists by phone or email
        let existingCustomer = null;

        if (newCustomer.phone) {
          const { data } = await supabase
            .from('customers')
            .select('id')
            .eq('company_id', companyId)
            .eq('phone', newCustomer.phone)
            .single();
          existingCustomer = data;
        }

        if (!existingCustomer && newCustomer.email) {
          const { data } = await supabase
            .from('customers')
            .select('id')
            .eq('company_id', companyId)
            .eq('email', newCustomer.email)
            .single();
          existingCustomer = data;
        }

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          // Create new customer
          const { data: newCustomerData, error: customerError } = await supabase
            .from('customers')
            .insert({
              company_id: companyId,
              name: newCustomer.name,
              phone: newCustomer.phone || null,
              email: newCustomer.email || null,
              address: newCustomer.address || null,
            })
            .select()
            .single();

          if (customerError) {
            console.error('Error creating customer:', customerError);
            setSaveError('Failed to create customer');
            setIsSaving(false);
            return null;
          }
          customerId = newCustomerData.id;
        }
      }

      // Calculate valid_until date
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + validDays);

      // Create the quote
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          company_id: companyId,
          customer_id: customerId,
          subtotal: subtotal,
          tax: taxAmount,
          total: grandTotal,
          notes: notes,
          status: asDraft ? 'draft' : 'sent',
          valid_until: validUntil.toISOString().split('T')[0],
          sent_at: asDraft ? null : new Date().toISOString(),
        })
        .select()
        .single();

      if (quoteError) {
        console.error('Error creating quote:', quoteError);
        setSaveError('Failed to create quote');
        setIsSaving(false);
        return null;
      }

      // Create quote items
      if (lineItems.length > 0) {
        const quoteItems = lineItems
          .filter(item => item.description)
          .map((item, index) => ({
            quote_id: quoteData.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.price,
            total: item.total,
            sort_order: index,
          }));

        if (quoteItems.length > 0) {
          const { error: itemsError } = await supabase
            .from('quote_items')
            .insert(quoteItems);

          if (itemsError) {
            console.error('Error creating quote items:', itemsError);
            // Don't fail entirely if items fail, quote is already created
          }
        }
      }

      setIsSaving(false);
      return quoteData;
    } catch (err) {
      console.error('Error saving quote:', err);
      setSaveError('Failed to save quote');
      setIsSaving(false);
      return null;
    }
  };

  // Save as draft and redirect to dashboard
  const saveDraft = async () => {
    const quote = await saveQuote(true);
    if (quote) {
      router.push('/dashboard/quotes');
    }
  };

  // Send quote (save and mark as sent)
  const sendQuote = async () => {
    setIsSending(true);
    const quote = await saveQuote(false);

    if (quote) {
      // Optionally send SMS/Email notification
      if (selectedCustomer?.phone || newCustomer.phone) {
        try {
          const phone = selectedCustomer?.phone || newCustomer.phone;
          const customerName = selectedCustomer?.name || newCustomer.name;
          const quoteLink = `${window.location.origin}/quote/${quote.id}`;

          if (sendMethod === 'sms' || sendMethod === 'both') {
            await fetch('/api/sms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: phone,
                template: 'quote_sent',
                data: {
                  customerName: customerName || 'Customer',
                  quoteLink,
                },
                companyId: companyId,
              }),
            });
          }
        } catch {
          // SMS is optional - don't fail if it fails
          console.log('SMS notification skipped or failed');
        }
      }

      setIsSending(false);
      setQuoteSent(true);

      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        router.push('/dashboard/quotes');
      }, 1500);
    } else {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-navy-500 to-navy-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Link href="/dashboard/quotes" className="text-white/70 hover:text-white text-sm mb-4 inline-block">
            ← Back to Quotes
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">📝</span>
            <h1 className="text-3xl font-bold">Smart Quoting</h1>
          </div>
          <p className="text-white/80">Create quotes in 60 seconds. Win more jobs.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Quote Mode Selection */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-navy-500 mb-4">How would you like to create this quote?</h2>
          <div className="grid grid-cols-3 gap-4">
            {/* Voice Quote */}
            <button
              onClick={() => setQuoteMode('voice')}
              className={`p-6 rounded-xl border-2 transition-all text-center ${
                quoteMode === 'voice'
                  ? 'border-gold-500 bg-gold-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-4xl mb-2">🎤</div>
              <div className="font-semibold text-navy-500">Voice Quote</div>
              <div className="text-sm text-gray-500 mt-1">Speak your quote</div>
            </button>

            {/* Photo Quote */}
            <button
              onClick={() => setQuoteMode('photo')}
              className={`p-6 rounded-xl border-2 transition-all text-center ${
                quoteMode === 'photo'
                  ? 'border-gold-500 bg-gold-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-4xl mb-2">📸</div>
              <div className="font-semibold text-navy-500">Photo Quote</div>
              <div className="text-sm text-gray-500 mt-1">AI analyzes the job</div>
            </button>

            {/* Manual Quote */}
            <button
              onClick={() => setQuoteMode('manual')}
              className={`p-6 rounded-xl border-2 transition-all text-center ${
                quoteMode === 'manual'
                  ? 'border-gold-500 bg-gold-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-4xl mb-2">✏️</div>
              <div className="font-semibold text-navy-500">Manual Quote</div>
              <div className="text-sm text-gray-500 mt-1">Traditional form</div>
            </button>
          </div>

          {/* Voice Recording UI */}
          {quoteMode === 'voice' && (
            <div className="mt-6 p-6 bg-navy-50 rounded-xl">
              <div className="text-center">
                {!isRecording && !isProcessingVoice && (
                  <>
                    <p className="text-gray-600 mb-4">
                      Click the microphone and describe the job. For example:
                      <br />
                      <span className="italic">&quot;Lawn mowing for half acre, hedge trimming, and gutter cleaning&quot;</span>
                    </p>
                    <button
                      onClick={startVoiceRecording}
                      className="w-20 h-20 bg-gold-500 hover:bg-gold-600 rounded-full flex items-center justify-center mx-auto transition-colors"
                    >
                      <span className="text-4xl">🎤</span>
                    </button>
                  </>
                )}

                {isRecording && (
                  <>
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-600 font-medium">Recording...</span>
                    </div>
                    <div className="bg-white p-4 rounded-lg mb-4 min-h-[60px]">
                      <p className="text-gray-700">{voiceTranscript || 'Listening...'}</p>
                    </div>
                    <button
                      onClick={stopVoiceRecording}
                      className="w-20 h-20 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center mx-auto transition-colors"
                    >
                      <span className="text-4xl">⏹️</span>
                    </button>
                    <p className="text-sm text-gray-500 mt-2">Click to stop and process</p>
                  </>
                )}

                {isProcessingVoice && (
                  <div className="flex flex-col items-center">
                    <div className="animate-spin w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full mb-4"></div>
                    <p className="text-gray-600">AI is parsing your quote...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Photo Upload UI */}
          {quoteMode === 'photo' && (
            <div className="mt-6 p-6 bg-navy-50 rounded-xl">
              <div className="text-center">
                {!photoPreview && !isAnalyzingPhoto && (
                  <>
                    <p className="text-gray-600 mb-4">
                      Take a photo of the job site and our AI will suggest line items and pricing.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoCapture}
                      ref={fileInputRef}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 bg-gold-500 hover:bg-gold-600 rounded-full flex items-center justify-center mx-auto transition-colors"
                    >
                      <span className="text-4xl">📸</span>
                    </button>
                    <p className="text-sm text-gray-500 mt-2">Tap to take photo or upload</p>
                  </>
                )}

                {isAnalyzingPhoto && (
                  <div className="flex flex-col items-center">
                    {photoPreview && (
                      <img src={photoPreview} alt="Job site" className="w-48 h-48 object-cover rounded-lg mb-4" />
                    )}
                    <div className="animate-spin w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full mb-4"></div>
                    <p className="text-gray-600">AI is analyzing the photo...</p>
                    <p className="text-sm text-gray-500 mt-1">Identifying scope and suggesting prices</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Form Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-navy-500">Customer</h2>
                <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
                  <button
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      language === 'en' ? 'bg-white shadow-sm' : ''
                    }`}
                  >
                    🇺🇸 EN
                  </button>
                  <button
                    onClick={() => setLanguage('es')}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      language === 'es' ? 'bg-white shadow-sm' : ''
                    }`}
                  >
                    🇪🇸 ES
                  </button>
                </div>
              </div>

              {/* Customer Search/Select */}
              <div className="relative mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Existing Customer
                </label>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Search by name, phone, or email..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                />
                {showCustomerDropdown && customerSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setNewCustomer({
                            name: customer.name,
                            phone: customer.phone || '',
                            email: customer.email || '',
                            address: customer.address || '',
                          });
                          setCustomerSearch('');
                          setShowCustomerDropdown(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <div className="font-medium text-navy-500">{customer.name}</div>
                        <div className="text-sm text-gray-500">{customer.phone || 'No phone'} • {customer.address || 'No address'}</div>
                      </button>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <div className="px-4 py-3 text-gray-500 text-sm">No customers found</div>
                    )}
                  </div>
                )}
              </div>

              {/* Customer Form */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="John Smith"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    placeholder="john@email.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    placeholder="123 Main St, City, CA 12345"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>
              </div>
            </div>

            {/* Line Items Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-navy-500 mb-4">Line Items</h2>

              {/* Quick Add Buttons */}
              <div className="flex flex-wrap gap-2 mb-6">
                {quickAddServices.map((service) => (
                  <button
                    key={service.name}
                    onClick={() => addLineItem(service)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-navy-500 transition-colors flex items-center gap-1"
                  >
                    <span>{service.icon}</span>
                    <span>{service.name}</span>
                    <span className="text-gray-500">${service.price}</span>
                  </button>
                ))}
                <button
                  onClick={() => addLineItem()}
                  className="px-3 py-2 bg-gold-100 hover:bg-gold-200 rounded-lg text-sm font-medium text-gold-700 transition-colors"
                >
                  + Custom
                </button>
              </div>

              {/* Line Items Table */}
              {lineItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📋</div>
                  <p>No items yet. Use quick add buttons or voice/photo to add items.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 text-sm font-medium text-gray-500">Description</th>
                        <th className="text-center py-2 px-2 text-sm font-medium text-gray-500 w-20">Qty</th>
                        <th className="text-center py-2 px-2 text-sm font-medium text-gray-500 w-24">Unit</th>
                        <th className="text-right py-2 px-2 text-sm font-medium text-gray-500 w-24">Price</th>
                        <th className="text-right py-2 px-2 text-sm font-medium text-gray-500 w-24">Total</th>
                        <th className="text-center py-2 px-2 text-sm font-medium text-gray-500 w-16">AI</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100">
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
                              placeholder="Service description"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateLineItem(item.id, { quantity: Number(e.target.value) })}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-center focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
                              min="1"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <select
                              value={item.unit}
                              onChange={(e) => updateLineItem(item.id, { unit: e.target.value as LineItem['unit'] })}
                              className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
                            >
                              <option value="each">each</option>
                              <option value="hour">hour</option>
                              <option value="sqft">sq ft</option>
                              <option value="linear_ft">linear ft</option>
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                              <input
                                type="number"
                                value={item.price}
                                onChange={(e) => updateLineItem(item.id, { price: Number(e.target.value) })}
                                className="w-full px-2 py-1 pl-6 border border-gray-200 rounded text-right focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right font-medium text-navy-500">
                            ${item.total.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={() => getAiSuggestion(item)}
                              className="p-1 hover:bg-gold-100 rounded transition-colors"
                              title="Get AI price suggestion"
                            >
                              💡
                            </button>
                            {showAiSuggestion === item.id && item.aiSuggestion && (
                              <div className="absolute z-10 mt-1 p-3 bg-white border border-gray-200 rounded-lg shadow-lg text-left text-sm w-64">
                                <div className="font-medium text-navy-500 mb-1">AI Price Suggestion</div>
                                <div className="text-gray-600">
                                  Market rate: ${item.aiSuggestion.min} - ${item.aiSuggestion.max}
                                </div>
                                <div className={`mt-1 ${
                                  item.price >= item.aiSuggestion.min && item.price <= item.aiSuggestion.max
                                    ? 'text-green-600'
                                    : item.price < item.aiSuggestion.min
                                    ? 'text-amber-600'
                                    : 'text-red-600'
                                }`}>
                                  Your price: ${item.price} {
                                    item.price >= item.aiSuggestion.min && item.price <= item.aiSuggestion.max
                                      ? '✓ Competitive'
                                      : item.price < item.aiSuggestion.min
                                      ? '⚠️ Below market'
                                      : '⚠️ Above market'
                                  }
                                </div>
                                <button
                                  onClick={() => setShowAiSuggestion(null)}
                                  className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Close
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2">
                            <button
                              onClick={() => removeLineItem(item.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button
                onClick={() => addLineItem()}
                className="mt-4 px-4 py-2 border-2 border-dashed border-gray-300 hover:border-gold-500 rounded-lg text-gray-500 hover:text-gold-600 transition-colors w-full"
              >
                + Add Line Item
              </button>
            </div>

            {/* Good/Better/Best Toggle */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-navy-500">Good / Better / Best Options</h2>
                  <p className="text-sm text-gray-500">Offer multiple pricing tiers to win more jobs</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showMultipleOptions}
                    onChange={(e) => setShowMultipleOptions(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gold-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                </label>
              </div>

              {showMultipleOptions && (
                <div className="mt-6 grid md:grid-cols-3 gap-4">
                  {['Good', 'Better', 'Best'].map((tier, index) => (
                    <div
                      key={tier}
                      className={`p-4 rounded-xl border-2 ${
                        index === 1 ? 'border-gold-500 bg-gold-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="text-center mb-3">
                        <div className="text-2xl mb-1">
                          {index === 0 ? '⭐' : index === 1 ? '⭐⭐' : '⭐⭐⭐'}
                        </div>
                        <div className="font-bold text-navy-500">{tier}</div>
                        <div className="text-sm text-gray-500">
                          {index === 0 ? 'Basic service' : index === 1 ? 'Standard + extras' : 'Premium full service'}
                        </div>
                      </div>
                      <div className="text-center text-2xl font-bold text-navy-500">
                        ${(subtotal * (1 + index * 0.35)).toFixed(0)}
                      </div>
                      <p className="text-xs text-gray-500 text-center mt-2">
                        {index === 0 ? 'Essential items only' : index === 1 ? 'Recommended' : 'Everything included'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-navy-500 mb-4">Notes & Terms</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes, terms, or special instructions..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 min-h-[100px]"
              />
              <div className="mt-4 flex items-center gap-4">
                <label className="text-sm text-gray-600">Quote valid for:</label>
                <select
                  value={validDays}
                  onChange={(e) => setValidDays(Number(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quote Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-navy-500 mb-4">Quote Summary</h2>

              {/* Customer Preview */}
              {newCustomer.name && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-navy-500">{newCustomer.name}</div>
                  {newCustomer.phone && <div className="text-sm text-gray-500">{newCustomer.phone}</div>}
                  {newCustomer.address && <div className="text-sm text-gray-500">{newCustomer.address}</div>}
                </div>
              )}

              {/* Items Count */}
              <div className="text-sm text-gray-500 mb-4">
                {lineItems.length} item{lineItems.length !== 1 ? 's' : ''}
              </div>

              {/* Totals */}
              <div className="space-y-2 border-t border-gray-200 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-navy-500">${subtotal.toFixed(2)}</span>
                </div>

                {/* Tax */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Tax</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      className="w-16 px-2 py-1 border border-gray-200 rounded text-right text-sm"
                      min="0"
                      max="20"
                      step="0.5"
                    />
                    <span className="text-gray-400">%</span>
                    <span className="text-navy-500 w-20 text-right">${taxAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Discount */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Discount</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">$</span>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="w-20 px-2 py-1 border border-gray-200 rounded text-right text-sm"
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2 mt-2">
                  <span className="text-navy-500">Total</span>
                  <span className="text-gold-600">${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Send Options */}
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Send via:</label>
                  <div className="flex gap-2">
                    {['sms', 'email', 'both'].map((method) => (
                      <button
                        key={method}
                        onClick={() => setSendMethod(method as typeof sendMethod)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          sendMethod === method
                            ? 'bg-navy-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {method === 'sms' ? '📱 SMS' : method === 'email' ? '📧 Email' : '📱+📧 Both'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error display */}
                {saveError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                    <div className="text-sm text-red-600">{saveError}</div>
                  </div>
                )}

                {quoteSent ? (
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <div className="text-4xl mb-2">✅</div>
                    <div className="font-medium text-green-700">Quote Saved & Sent!</div>
                    <div className="text-sm text-green-600">Redirecting to dashboard...</div>
                  </div>
                ) : (
                  <button
                    onClick={sendQuote}
                    disabled={isSending || isSaving || lineItems.length === 0 || !newCustomer.name || !newCustomer.phone}
                    className="w-full py-3 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSending ? (
                      <>
                        <div className="animate-spin w-5 h-5 border-2 border-navy-900 border-t-transparent rounded-full"></div>
                        Saving & Sending...
                      </>
                    ) : (
                      <>
                        <span>📤</span>
                        Send Quote
                      </>
                    )}
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={saveDraft}
                    disabled={isSaving || isSending || lineItems.length === 0 || !newCustomer.name}
                    className="flex-1 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    {isSaving && !isSending ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full"></div>
                        Saving...
                      </>
                    ) : (
                      <>💾 Save Draft</>
                    )}
                  </button>
                  <Link
                    href="/dashboard/quotes"
                    className="flex-1 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-sm transition-colors text-center"
                  >
                    Cancel
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
