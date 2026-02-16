'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface ChatbotSettings {
  businessName: string;
  greeting: string;
  businessType: string;
  phone: string;
  faqs: { question: string; answer: string }[];
  accentColor: string;
  position: 'right' | 'left';
}

const DEFAULT_SETTINGS: ChatbotSettings = {
  businessName: '',
  greeting: "Hi! I'm Jenny, your virtual assistant. How can I help you today?",
  businessType: 'home services',
  phone: '',
  faqs: [
    { question: 'What services do you offer?', answer: '' },
    { question: 'What areas do you serve?', answer: '' },
    { question: 'How do I get a quote?', answer: '' },
  ],
  accentColor: '#f5a623',
  position: 'right',
};

const STORAGE_KEY = 'tooltimepro_jenny_lite_settings';

function loadSettings(company: { name: string; phone: string | null; industry: string | null } | null): ChatbotSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return {
    ...DEFAULT_SETTINGS,
    businessName: company?.name || '',
    phone: company?.phone || '',
    businessType: company?.industry || 'home services',
  };
}

export default function JennyLitePage() {
  const { company, isLoading: authLoading } = useAuth();
  const [settings, setSettings] = useState<ChatbotSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'setup' | 'preview' | 'embed'>('setup');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const embedRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!authLoading && company) {
      setSettings(loadSettings(company));
    }
  }, [authLoading, company]);

  const saveSettings = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...settings.faqs];
    updated[index] = { ...updated[index], [field]: value };
    setSettings({ ...settings, faqs: updated });
  };

  const addFaq = () => {
    if (settings.faqs.length >= 8) return;
    setSettings({ ...settings, faqs: [...settings.faqs, { question: '', answer: '' }] });
  };

  const removeFaq = (index: number) => {
    setSettings({ ...settings, faqs: settings.faqs.filter((_, i) => i !== index) });
  };

  const embedCode = `<!-- Jenny Lite Chat Widget — ToolTime Pro -->
<script>
  window.JennyLiteConfig = {
    businessName: ${JSON.stringify(settings.businessName)},
    greeting: ${JSON.stringify(settings.greeting)},
    businessType: ${JSON.stringify(settings.businessType)},
    phone: ${JSON.stringify(settings.phone)},
    accentColor: ${JSON.stringify(settings.accentColor)},
    position: ${JSON.stringify(settings.position)},
    faqs: ${JSON.stringify(settings.faqs.filter(f => f.question && f.answer), null, 2)}
  };
</script>
<script src="https://cdn.tooltimepro.com/jenny-lite/widget.js" async></script>`;

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const isBetaTester = company?.is_beta_tester;
  const plan = company?.plan || 'free_trial';
  const planLabel = plan === 'free_trial' ? 'Free Trial' : plan.charAt(0).toUpperCase() + plan.slice(1);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            {isBetaTester ? 'Jenny AI' : 'Jenny Lite'}
            {isBetaTester && (
              <span className="text-xs font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                All Access
              </span>
            )}
          </h1>
          <p className="text-gray-500 mt-1">AI-powered chat widget for your website</p>
        </div>
        {!isBetaTester && (
          <Link
            href="/jenny"
            className="text-sm text-orange-500 font-semibold hover:text-orange-600 no-underline"
          >
            Upgrade to Jenny Pro →
          </Link>
        )}
      </div>

      {/* Plan Status Card */}
      <div className={`bg-gradient-to-r ${isBetaTester ? 'from-green-50 to-emerald-50 border-green-200' : 'from-emerald-50 to-teal-50 border-emerald-200'} border rounded-xl p-6 mb-8`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl">
              🤖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold text-lg">
                  {isBetaTester ? 'Jenny AI — All Access' : 'Jenny Lite — Active'}
                </span>
                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  {isBetaTester ? 'Beta Tester — Elite Plan' : `Included with ${planLabel}`}
                </span>
              </div>
              <p className="text-emerald-600 text-sm mt-0.5">
                {isBetaTester
                  ? 'Full Jenny AI suite — chat widget, lead capture, FAQ answering, and all Pro features unlocked.'
                  : '24/7 AI chat widget, lead capture, and FAQ answering — included free on your plan.'}
              </p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-2xl font-extrabold text-emerald-700">$0</div>
            <div className="text-emerald-600 text-xs">/month</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
        {[
          { id: 'setup' as const, label: 'Settings', icon: '⚙️' },
          { id: 'preview' as const, label: 'Preview', icon: '👀' },
          { id: 'embed' as const, label: 'Embed Code', icon: '📋' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Setup Tab */}
      {activeTab === 'setup' && (
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Business Info</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input
                  type="text"
                  value={settings.businessName}
                  onChange={e => setSettings({ ...settings, businessName: e.target.value })}
                  placeholder="Your Business Name"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={settings.phone}
                  onChange={e => setSettings({ ...settings, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                <select
                  value={settings.businessType}
                  onChange={e => setSettings({ ...settings, businessType: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="landscaping">Landscaping</option>
                  <option value="lawn care">Lawn Care</option>
                  <option value="pool service">Pool Service</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="hvac">HVAC</option>
                  <option value="painting">Painting</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="roofing">Roofing</option>
                  <option value="pest control">Pest Control</option>
                  <option value="auto detailing">Auto Detailing</option>
                  <option value="pressure washing">Pressure Washing</option>
                  <option value="flooring">Flooring</option>
                  <option value="handyman">Handyman</option>
                  <option value="tree service">Tree Service</option>
                  <option value="moving">Moving</option>
                  <option value="junk removal">Junk Removal</option>
                  <option value="home services">Home Services (General)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Widget Position</label>
                <select
                  value={settings.position}
                  onChange={e => setSettings({ ...settings, position: e.target.value as 'right' | 'left' })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="right">Bottom Right</option>
                  <option value="left">Bottom Left</option>
                </select>
              </div>
            </div>
          </div>

          {/* Greeting */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Greeting Message</h3>
            <p className="text-sm text-gray-500 mb-3">
              This is the first message visitors see when the chat opens.
            </p>
            <textarea
              value={settings.greeting}
              onChange={e => setSettings({ ...settings, greeting: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Hi! How can I help you today?"
            />
          </div>

          {/* Accent Color */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Widget Color</h3>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={settings.accentColor}
                onChange={e => setSettings({ ...settings, accentColor: e.target.value })}
                className="w-12 h-12 rounded-lg border cursor-pointer"
              />
              <div>
                <div className="text-sm font-medium text-gray-700">{settings.accentColor}</div>
                <div className="text-xs text-gray-400">Used for chat bubble and header</div>
              </div>
              <div className="flex gap-2 ml-4">
                {['#f5a623', '#2563eb', '#059669', '#dc2626', '#7c3aed', '#1a1a2e'].map(color => (
                  <button
                    key={color}
                    onClick={() => setSettings({ ...settings, accentColor: color })}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      settings.accentColor === color ? 'border-gray-800 scale-110' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* FAQs */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900">FAQ Answers</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Jenny uses these to answer common questions. Leave blank and she&apos;ll use AI to respond.
                </p>
              </div>
              {settings.faqs.length < 8 && (
                <button
                  onClick={addFaq}
                  className="text-sm font-semibold text-orange-500 hover:text-orange-600"
                >
                  + Add FAQ
                </button>
              )}
            </div>
            <div className="space-y-4">
              {settings.faqs.map((faq, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">FAQ {i + 1}</span>
                    {settings.faqs.length > 1 && (
                      <button
                        onClick={() => removeFaq(i)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={faq.question}
                    onChange={e => updateFaq(i, 'question', e.target.value)}
                    placeholder="Customer question..."
                    className="w-full px-3 py-2 border rounded-lg mb-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <textarea
                    value={faq.answer}
                    onChange={e => updateFaq(i, 'answer', e.target.value)}
                    placeholder="Your answer..."
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={saveSettings}
              className="px-8 py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors"
            >
              Save Settings
            </button>
            {saved && (
              <span className="text-emerald-600 font-medium text-sm">Settings saved!</span>
            )}
          </div>
        </div>
      )}

      {/* Preview Tab */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-2">Chat Widget Preview</h3>
            <p className="text-sm text-gray-500 mb-6">
              This is how Jenny Lite will appear on your website.
            </p>

            {/* Preview Area */}
            <div className="relative bg-gray-100 rounded-xl min-h-[500px] overflow-hidden border border-gray-200">
              {/* Fake website background */}
              <div className="p-8 text-gray-400">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-6" />
                <div className="h-32 bg-gray-200 rounded mb-4" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>

              {/* Chat Widget */}
              <div className={`absolute bottom-4 ${settings.position === 'right' ? 'right-4' : 'left-4'}`}>
                {/* Chat Window */}
                <div className="w-[340px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 mb-3">
                  {/* Header */}
                  <div className="p-4 text-white" style={{ backgroundColor: settings.accentColor }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg">
                        🤖
                      </div>
                      <div>
                        <div className="font-bold text-sm">Jenny</div>
                        <div className="text-xs opacity-80">{settings.businessName || 'Your Business'}</div>
                      </div>
                      <div className="ml-auto flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full" />
                        <span className="text-xs opacity-80">Online</span>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="p-4 min-h-[240px] bg-gray-50">
                    {/* Bot greeting */}
                    <div className="flex gap-2 mb-4">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0" style={{ backgroundColor: settings.accentColor + '20' }}>
                        🤖
                      </div>
                      <div className="bg-white rounded-2xl rounded-tl-md px-4 py-2.5 text-sm text-gray-700 max-w-[260px] shadow-sm border border-gray-100">
                        {settings.greeting || "Hi! How can I help you today?"}
                      </div>
                    </div>

                    {/* Quick replies */}
                    <div className="flex flex-wrap gap-2 ml-9">
                      {settings.faqs.slice(0, 3).map((faq, i) => (
                        faq.question && (
                          <span
                            key={i}
                            className="text-xs px-3 py-1.5 rounded-full border font-medium"
                            style={{ borderColor: settings.accentColor, color: settings.accentColor }}
                          >
                            {faq.question.length > 30 ? faq.question.slice(0, 30) + '...' : faq.question}
                          </span>
                        )
                      ))}
                    </div>
                  </div>

                  {/* Input */}
                  <div className="p-3 border-t border-gray-100 bg-white">
                    <div className="flex gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm text-gray-400">
                        Type a message...
                      </div>
                      <button
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm"
                        style={{ backgroundColor: settings.accentColor }}
                      >
                        ↑
                      </button>
                    </div>
                  </div>
                </div>

                {/* Chat Bubble */}
                <div className={`flex ${settings.position === 'right' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl shadow-lg cursor-pointer"
                    style={{ backgroundColor: settings.accentColor }}
                  >
                    💬
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embed Tab */}
      {activeTab === 'embed' && (
        <div className="space-y-6">
          {/* Steps */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Add Jenny Lite to Your Website</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  1
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Configure your settings</div>
                  <div className="text-sm text-gray-500">
                    Go to the Settings tab and fill in your business info, greeting, and FAQs.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  2
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Copy the embed code</div>
                  <div className="text-sm text-gray-500">
                    Click the copy button below to copy the code snippet.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  3
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Paste before {`</body>`}</div>
                  <div className="text-sm text-gray-500">
                    Add the code right before the closing {`</body>`} tag on every page of your website.
                    If we built your site, we&apos;ll add it for you — just hit save and we&apos;ll handle it.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Code Block */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">Your Embed Code</h3>
              <button
                onClick={copyEmbed}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  copied
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
            <div className="relative">
              <textarea
                ref={embedRef}
                readOnly
                value={embedCode}
                className="w-full h-56 p-4 bg-gray-900 text-green-400 font-mono text-xs rounded-lg border-0 resize-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <p className="text-xs text-gray-400 mt-3">
              The widget loads asynchronously and won&apos;t slow down your website.
            </p>
          </div>

          {/* ToolTime-built site note */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <span className="text-xl">🌐</span>
              <div>
                <div className="font-semibold text-gray-900 text-sm">Using a ToolTime Pro website?</div>
                <p className="text-sm text-gray-600 mt-1">
                  If we built your website, you don&apos;t need the embed code. Just save your settings above
                  and Jenny Lite will automatically appear on your site within a few minutes.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade CTA — hidden for beta testers who already have full access */}
      {!isBetaTester && (
        <div className="mt-10 bg-gradient-to-r from-[#1a1a2e] to-[#2d2d44] rounded-xl p-8 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-bold mb-1">Want Jenny to answer your phone calls too?</h3>
              <p className="text-white/60 text-sm">
                Upgrade to Jenny Pro ($49/mo) for AI phone answering, SMS conversations, and direct booking.
              </p>
            </div>
            <Link
              href="/pricing"
              className="px-6 py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors no-underline text-sm whitespace-nowrap"
            >
              Upgrade to Jenny Pro →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
