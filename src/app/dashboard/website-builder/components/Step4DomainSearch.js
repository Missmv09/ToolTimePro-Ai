'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Globe, Link2, ShoppingCart, Check } from 'lucide-react';
import DomainCard from './DomainCard';

export default function Step4DomainSearch({ wizardData, setWizardData }) {
  const [mode, setMode] = useState(wizardData.domainMode || 'search'); // 'search' | 'existing' | 'subdomain'
  const [searchTerm, setSearchTerm] = useState('');
  const [existingDomain, setExistingDomain] = useState(wizardData.existingDomain || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Auto-populate search term from business name
  useEffect(() => {
    if (wizardData.businessName && !hasSearched) {
      const sanitized = wizardData.businessName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
      setSearchTerm(sanitized);
    }
  }, [wizardData.businessName, hasSearched]);

  // Auto-search on first mount with business name (only in search mode)
  useEffect(() => {
    if (mode === 'search' && searchTerm && !hasSearched && wizardData.domainSearchResults.length === 0) {
      searchDomains();
    }
  }, [searchTerm, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const searchDomains = useCallback(async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/website-builder/domain-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: searchTerm.trim(),
          state: 'CA',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setWizardData((prev) => ({
        ...prev,
        domainSearchResults: data.suggestions || [],
      }));
      setHasSearched(true);
    } catch (err) {
      setError(err.message || 'Failed to search domains. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, setWizardData]);

  const handleSelectDomain = (domain) => {
    setWizardData((prev) => ({
      ...prev,
      domainMode: 'search',
      selectedDomain: {
        domainName: domain.domainName,
        price: domain.price || '12.99',
        renewalPrice: domain.renewalPrice || '12.99',
        type: 'new',
      },
      existingDomain: '',
    }));
  };

  const handleExistingDomain = () => {
    const cleaned = existingDomain.trim().toLowerCase();
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
        domainName: `${slug}.tooltimepro.com`,
        price: '0',
        renewalPrice: '0',
        type: 'subdomain',
      },
      existingDomain: '',
    }));
  };

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setError(null);
    // Clear selection when switching modes
    setWizardData((prev) => ({
      ...prev,
      domainMode: newMode,
      selectedDomain: null,
    }));

    // Auto-select subdomain when switching to that mode
    if (newMode === 'subdomain') {
      handleSubdomain();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (mode === 'search') {
        searchDomains();
      } else if (mode === 'existing') {
        handleExistingDomain();
      }
    }
  };

  const results = wizardData.domainSearchResults || [];
  const availableResults = results.filter((d) => d.available);
  const takenResults = results.filter((d) => !d.available);
  const displayResults = [...availableResults, ...takenResults].slice(0, 15);

  return (
    <div>
      <h2 className="text-2xl font-bold text-navy-500 mb-2">Set up your domain</h2>
      <p className="text-gray-500 mb-6">
        Choose how you want customers to find your website.
      </p>

      {/* Mode selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        <button
          onClick={() => handleModeSwitch('search')}
          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
            mode === 'search'
              ? 'border-gold-500 bg-gold-50'
              : 'border-gray-200 bg-white hover:border-gold-300'
          }`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            mode === 'search' ? 'bg-gold-500 text-navy-500' : 'bg-gray-100 text-gray-500'
          }`}>
            <ShoppingCart size={20} />
          </div>
          <div>
            <p className="font-semibold text-navy-500 text-sm">Register new domain</p>
            <p className="text-xs text-gray-500">Search &amp; buy a new domain</p>
          </div>
        </button>

        <button
          onClick={() => handleModeSwitch('existing')}
          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
            mode === 'existing'
              ? 'border-gold-500 bg-gold-50'
              : 'border-gray-200 bg-white hover:border-gold-300'
          }`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            mode === 'existing' ? 'bg-gold-500 text-navy-500' : 'bg-gray-100 text-gray-500'
          }`}>
            <Link2 size={20} />
          </div>
          <div>
            <p className="font-semibold text-navy-500 text-sm">I have a domain</p>
            <p className="text-xs text-gray-500">Connect a domain you own</p>
          </div>
        </button>

        <button
          onClick={() => handleModeSwitch('subdomain')}
          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
            mode === 'subdomain'
              ? 'border-gold-500 bg-gold-50'
              : 'border-gray-200 bg-white hover:border-gold-300'
          }`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            mode === 'subdomain' ? 'bg-gold-500 text-navy-500' : 'bg-gray-100 text-gray-500'
          }`}>
            <Globe size={20} />
          </div>
          <div>
            <p className="font-semibold text-navy-500 text-sm">Free subdomain</p>
            <p className="text-xs text-gray-500">Use yourname.tooltimepro.com</p>
          </div>
        </button>
      </div>

      {/* ====== SEARCH MODE ====== */}
      {mode === 'search' && (
        <>
          <div className="flex gap-3 mb-6 max-w-xl">
            <div className="relative flex-1">
              <Globe size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="input pl-10"
                placeholder="Search for a domain name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <button
              onClick={searchDomains}
              disabled={loading || !searchTerm.trim()}
              className="btn-secondary px-5 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              Search
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gold-600 mb-4">
                <RefreshCw size={18} className="animate-spin" />
                <span className="text-sm font-medium">Searching for the perfect domain...</span>
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
                  <div className="space-y-2">
                    <div className="h-5 w-48 bg-gray-200 animate-pulse rounded" />
                    <div className="h-3 w-24 bg-gray-100 animate-pulse rounded" />
                  </div>
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded-lg" />
                </div>
              ))}
            </div>
          )}

          {!loading && displayResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">
                  {availableResults.length} available domain{availableResults.length !== 1 ? 's' : ''} found
                </p>
                {availableResults.length === 0 && (
                  <p className="text-sm text-gold-600 font-medium">Try a different name?</p>
                )}
              </div>

              <div className="space-y-3">
                {displayResults.map((domain) => (
                  <DomainCard
                    key={domain.domainName}
                    domain={domain}
                    isSelected={wizardData.selectedDomain?.domainName === domain.domainName}
                    onSelect={handleSelectDomain}
                  />
                ))}
              </div>
            </div>
          )}

          {!loading && hasSearched && displayResults.length === 0 && (
            <div className="text-center py-12">
              <Globe size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No domains found. Try a different search term.</p>
            </div>
          )}
        </>
      )}

      {/* ====== EXISTING DOMAIN MODE ====== */}
      {mode === 'existing' && (
        <div className="max-w-xl">
          <p className="text-sm text-gray-600 mb-4">
            Enter the domain you already own. After launching, you&apos;ll get DNS settings to point it to your new website.
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
                After launch, we&apos;ll provide DNS records to point this domain to your site. No extra charge.
              </p>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="font-medium text-blue-700 text-sm mb-2">How to connect your domain</p>
            <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
              <li>Enter your domain name above and click Connect</li>
              <li>Complete the website builder wizard</li>
              <li>After launch, go to your domain registrar (GoDaddy, Namecheap, etc.)</li>
              <li>Update the DNS records to the values we provide</li>
              <li>Your site will be live on your domain within 24-48 hours</li>
            </ol>
          </div>
        </div>
      )}

      {/* ====== SUBDOMAIN MODE ====== */}
      {mode === 'subdomain' && (
        <div className="max-w-xl">
          {wizardData.selectedDomain?.type === 'subdomain' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl mb-4">
              <p className="text-sm text-green-700 font-medium">
                Your free address: <span className="font-bold">{wizardData.selectedDomain.domainName}</span>
              </p>
              <p className="text-xs text-green-600 mt-1">
                Free forever — included with your ToolTime Pro plan. You can add a custom domain anytime later.
              </p>
            </div>
          )}

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <p className="text-sm text-gray-600">
              Start with a free subdomain now and upgrade to a custom domain (like yourbusiness.com) whenever you&apos;re ready. No commitment needed.
            </p>
          </div>
        </div>
      )}

      {/* Selected domain summary (for search mode) */}
      {mode === 'search' && wizardData.selectedDomain?.type === 'new' && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-sm text-green-700 font-medium">
            Selected: <span className="font-bold">{wizardData.selectedDomain.domainName}</span>
            {' '} — ${wizardData.selectedDomain.price}/year
          </p>
        </div>
      )}
    </div>
  );
}
