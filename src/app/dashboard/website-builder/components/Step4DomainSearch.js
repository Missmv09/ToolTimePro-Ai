'use client';

import { useState, useEffect } from 'react';
import { Globe, Link2, Check, Sparkles } from 'lucide-react';

export default function Step4DomainSearch({ wizardData, setWizardData }) {
  // Two modes only — Jobber/Housecall Pro style.
  // 'subdomain': free *.taskiguana.com address (default and recommended)
  // 'existing':  customer registers a domain elsewhere (GoDaddy, Namecheap,
  //              etc.) and points DNS at us. We never register domains
  //              in-app — too much support burden, no margin, ownership
  //              ambiguity.
  const initialMode = (() => {
    const saved = wizardData.domainMode;
    if (saved === 'subdomain' || saved === 'existing') return saved;
    return 'subdomain';
  })();

  const [mode, setMode] = useState(initialMode);
  const [existingDomain, setExistingDomain] = useState(wizardData.existingDomain || '');

  // If the wizard was restored from older state that used 'new' or 'search',
  // coerce to subdomain so we don't render with no selection.
  useEffect(() => {
    const legacyType = wizardData.selectedDomain?.type;
    if (legacyType === 'new' || wizardData.domainMode === 'search') {
      handleSubdomain();
    } else if (!wizardData.selectedDomain && mode === 'subdomain') {
      handleSubdomain();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExistingDomain = () => {
    const cleaned = existingDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    if (!cleaned || cleaned.length < 3 || !cleaned.includes('.')) return;

    setWizardData((prev) => ({
      ...prev,
      domainMode: 'existing',
      selectedDomain: {
        domainName: cleaned,
        price: '0',
        renewalPrice: '0',
        type: 'existing',
      },
      existingDomain: cleaned,
    }));
  };

  const handleSubdomain = () => {
    const slug = (wizardData.businessName || 'my-site')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30);

    setWizardData((prev) => ({
      ...prev,
      domainMode: 'subdomain',
      selectedDomain: {
        domainName: `${slug}.taskiguana.com`,
        price: '0',
        renewalPrice: '0',
        type: 'subdomain',
      },
      existingDomain: '',
    }));
  };

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setWizardData((prev) => ({
      ...prev,
      domainMode: newMode,
      selectedDomain: null,
    }));
    if (newMode === 'subdomain') handleSubdomain();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (mode === 'existing') handleExistingDomain();
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-navy-500 mb-2">Set up your web address</h2>
      <p className="text-gray-500 mb-6">
        Pick a free subdomain to launch fast, or connect a domain you already own.
      </p>

      <div className="mb-6 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
        <Sparkles size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-700">
          <strong>Need a brand-new domain?</strong> Register it at{' '}
          <a href="https://www.godaddy.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">GoDaddy</a>,{' '}
          <a href="https://www.namecheap.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">Namecheap</a>, or any registrar
          (~$12/yr), then come back and choose &ldquo;I have a domain.&rdquo;
        </div>
      </div>

      {/* Mode selector — two options only */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        <button
          onClick={() => handleModeSwitch('subdomain')}
          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
            mode === 'subdomain' ? 'border-gold-500 bg-gold-50' : 'border-gray-200 bg-white hover:border-gold-300'
          }`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mode === 'subdomain' ? 'bg-gold-500 text-navy-500' : 'bg-gray-100 text-gray-500'}`}>
            <Globe size={20} />
          </div>
          <div>
            <p className="font-semibold text-navy-500 text-sm">
              Free subdomain
              <span className="ml-2 text-xs font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">Recommended</span>
            </p>
            <p className="text-xs text-gray-500">yourname.taskiguana.com — launch in seconds</p>
          </div>
        </button>

        <button
          onClick={() => handleModeSwitch('existing')}
          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
            mode === 'existing' ? 'border-gold-500 bg-gold-50' : 'border-gray-200 bg-white hover:border-gold-300'
          }`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mode === 'existing' ? 'bg-gold-500 text-navy-500' : 'bg-gray-100 text-gray-500'}`}>
            <Link2 size={20} />
          </div>
          <div>
            <p className="font-semibold text-navy-500 text-sm">I have a domain</p>
            <p className="text-xs text-gray-500">Connect a domain you already own</p>
          </div>
        </button>
      </div>

      {mode === 'existing' && (
        <div className="max-w-xl">
          <p className="text-sm text-gray-600 mb-4">
            Enter the domain you already own. After launch you&apos;ll get DNS records to paste at your registrar.
          </p>

          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Globe size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="input pl-10"
                placeholder="yourbusiness.com"
                value={existingDomain}
                onChange={(e) => setExistingDomain(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <button
              onClick={handleExistingDomain}
              disabled={!existingDomain.trim() || existingDomain.trim().length < 3 || !existingDomain.includes('.')}
              className="btn-secondary px-5 flex items-center gap-2 disabled:opacity-50"
            >
              <Check size={16} />
              Connect
            </button>
          </div>

          {wizardData.selectedDomain?.type === 'existing' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm text-green-700 font-medium">
                Domain connected: <span className="font-bold">{wizardData.selectedDomain.domainName}</span>
              </p>
              <p className="text-xs text-green-600 mt-1">
                After launch we&apos;ll show you the DNS records to add at your registrar. No extra charge from us.
              </p>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="font-medium text-blue-700 text-sm mb-2">How this works</p>
            <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
              <li>Enter your domain above and click Connect</li>
              <li>Finish the wizard and launch your site</li>
              <li>Copy the DNS records we show you</li>
              <li>Paste them into your registrar (GoDaddy, Namecheap, etc.)</li>
              <li>Your site goes live on your domain within 24-48 hours</li>
            </ol>
          </div>
        </div>
      )}

      {mode === 'subdomain' && (
        <div className="max-w-xl">
          {wizardData.selectedDomain?.type === 'subdomain' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl mb-4">
              <p className="text-sm text-green-700 font-medium">
                Your free address: <span className="font-bold">{wizardData.selectedDomain.domainName}</span>
              </p>
              <p className="text-xs text-green-600 mt-1">
                Free forever — included with your Task Iguana plan. You can connect a custom domain anytime later.
              </p>
            </div>
          )}

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <p className="text-sm text-gray-600">
              Start with a free subdomain now and connect a custom domain (yourbusiness.com) whenever you&apos;re ready. No commitment.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
