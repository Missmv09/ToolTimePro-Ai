'use client';

import { useState, useCallback } from 'react';
import { Search, RefreshCw, Globe, ArrowUpCircle, Check, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import DomainCard from './DomainCard';

export default function DomainUpgradeCard({ site, onUpgraded }) {
  const [expanded, setExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState(
    (site.business_name || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
  );
  const [results, setResults] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [searching, setSearching] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const searchDomains = useCallback(async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    setError(null);
    setSelectedDomain(null);

    try {
      const response = await fetch('/api/website-builder/domain-search/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: searchTerm.trim(), state: 'CA' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Search failed');
      setResults(data.suggestions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }, [searchTerm]);

  const handleRegister = async () => {
    if (!selectedDomain) return;
    setRegistering(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch('/api/website-builder/domain-register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          _authToken: token,  // Backup: survives 308 redirects that strip headers
          domainName: selectedDomain.domainName,
          siteId: site.id,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed');

      setSuccess(data.message);
      if (onUpgraded) onUpgraded();
    } catch (err) {
      setError(err.message);
    } finally {
      setRegistering(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchDomains();
    }
  };

  const available = results.filter((d) => d.available);
  const taken = results.filter((d) => !d.available);
  const display = [...available, ...taken].slice(0, 10);

  if (success) {
    return (
      <div className="card border-2 border-green-200 bg-green-50">
        <div className="flex items-center gap-3 mb-2">
          <Check size={24} className="text-green-600" />
          <h3 className="font-semibold text-green-800 text-lg">Domain upgraded!</h3>
        </div>
        <p className="text-sm text-green-700">{success}</p>
      </div>
    );
  }

  return (
    <div className="card border-2 border-gold-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center">
            <ArrowUpCircle size={22} className="text-gold-600" />
          </div>
          <div>
            <h3 className="font-semibold text-navy-500">Upgrade to a custom domain</h3>
            <p className="text-xs text-gray-500">
              Your site is on <span className="font-medium">{site.custom_domain}</span> — get a professional domain like yourbusiness.com
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="btn-secondary text-sm px-4"
        >
          {expanded ? 'Close' : 'Get a domain'}
        </button>
      </div>

      {expanded && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex gap-3 mb-4 max-w-xl">
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
              disabled={searching || !searchTerm.trim()}
              className="btn-secondary px-5 flex items-center gap-2 disabled:opacity-50"
            >
              {searching ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
              Search
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {searching && (
            <div className="flex items-center gap-3 text-gold-600 mb-4">
              <RefreshCw size={18} className="animate-spin" />
              <span className="text-sm font-medium">Searching for the perfect domain...</span>
            </div>
          )}

          {!searching && display.length > 0 && (
            <div className="space-y-3 mb-4">
              <p className="text-sm text-gray-500">
                {available.length} available domain{available.length !== 1 ? 's' : ''} found
              </p>
              {display.map((domain) => (
                <DomainCard
                  key={domain.domainName}
                  domain={domain}
                  isSelected={selectedDomain?.domainName === domain.domainName}
                  onSelect={setSelectedDomain}
                />
              ))}
            </div>
          )}

          {selectedDomain && (
            <div className="flex items-center justify-between p-4 bg-gold-50 border border-gold-200 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-navy-500">{selectedDomain.domainName}</p>
                <p className="text-xs text-gray-500">${selectedDomain.price || '12.99'}/year</p>
              </div>
              <button
                onClick={handleRegister}
                disabled={registering}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {registering ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <ExternalLink size={16} />
                )}
                {registering ? 'Registering...' : 'Register domain'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
