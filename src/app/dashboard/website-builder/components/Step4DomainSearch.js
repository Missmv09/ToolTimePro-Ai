'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Globe } from 'lucide-react';
import DomainCard from './DomainCard';

export default function Step4DomainSearch({ wizardData, setWizardData }) {
  const [searchTerm, setSearchTerm] = useState('');
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

  // Auto-search on first mount with business name
  useEffect(() => {
    if (searchTerm && !hasSearched && wizardData.domainSearchResults.length === 0) {
      searchDomains();
    }
  }, [searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

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
      selectedDomain: {
        domainName: domain.domainName,
        price: domain.price || '12.99',
        renewalPrice: domain.renewalPrice || '12.99',
      },
    }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchDomains();
    }
  };

  const results = wizardData.domainSearchResults || [];
  const availableResults = results.filter((d) => d.available);
  const takenResults = results.filter((d) => !d.available);
  const displayResults = [...availableResults, ...takenResults].slice(0, 15);

  return (
    <div>
      <h2 className="text-2xl font-bold text-navy-500 mb-2">Find your perfect domain</h2>
      <p className="text-gray-500 mb-6">
        This is your web address — where customers will find you online.
      </p>

      {/* Search bar */}
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

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading state */}
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

      {/* Results */}
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

      {/* No results */}
      {!loading && hasSearched && displayResults.length === 0 && (
        <div className="text-center py-12">
          <Globe size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No domains found. Try a different search term.</p>
        </div>
      )}

      {/* Selected domain summary */}
      {wizardData.selectedDomain && (
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
