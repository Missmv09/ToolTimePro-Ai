'use client';

import { useState } from 'react';
import { Globe, ArrowUpCircle, Check, Link2, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isValidDomain, normalizeDomain, dnsRecordsFor } from '@/lib/site-dns';

export default function DomainUpgradeCard({ site, onUpgraded }) {
  const [expanded, setExpanded] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(null);
  const [copiedRow, setCopiedRow] = useState(null);

  const handleConnect = async () => {
    setError(null);
    const clean = normalizeDomain(domainInput);
    if (!isValidDomain(clean)) {
      setError('Please enter a valid domain like yourbusiness.com (no http:// or www.).');
      return;
    }
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch('/api/website-builder/connect-domain/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          _authToken: token,
          siteId: site.id,
          domainName: clean,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to connect domain');
      setConnected({ domain: data.domain, dnsRecords: data.dnsRecords });
      if (onUpgraded) onUpgraded();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copy = (text, rowKey) => {
    navigator.clipboard.writeText(text);
    setCopiedRow(rowKey);
    setTimeout(() => setCopiedRow(null), 1500);
  };

  // If the customer already has a custom (non-subdomain) domain, show the DNS records.
  const existing = site.custom_domain && !site.custom_domain.endsWith('.tooltimepro.com')
    ? { domain: site.custom_domain, dnsRecords: dnsRecordsFor(site.custom_domain), status: site.domain_status }
    : null;

  const showDnsPanel = connected || existing;

  if (showDnsPanel) {
    const view = connected || existing;
    return (
      <div className="card border-2 border-green-200 bg-green-50">
        <div className="flex items-center gap-3 mb-3">
          <Check size={22} className="text-green-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-green-800">
              {connected ? 'Domain connected!' : `Custom domain: ${view.domain}`}
            </h3>
            <p className="text-xs text-green-700 mt-0.5">
              Add these records at your registrar (GoDaddy, Namecheap, Google Domains, etc.) to point{' '}
              <strong>{view.domain}</strong> at your site. Changes can take 24-48 hours to propagate.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-green-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Host</th>
                <th className="text-left px-3 py-2">Value</th>
                <th className="text-left px-3 py-2">TTL</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {view.dnsRecords.map((r, i) => {
                const rowKey = `${r.type}-${r.host}`;
                return (
                  <tr key={rowKey} className={i > 0 ? 'border-t border-gray-100' : ''}>
                    <td className="px-3 py-2 font-mono font-semibold text-navy-500">{r.type}</td>
                    <td className="px-3 py-2 font-mono">{r.host}</td>
                    <td className="px-3 py-2 font-mono text-navy-500">{r.value}</td>
                    <td className="px-3 py-2 text-gray-500">{r.ttl}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => copy(r.value, rowKey)}
                        className="text-gold-600 hover:text-gold-700 text-xs inline-flex items-center gap-1"
                      >
                        {copiedRow === rowKey ? <Check size={12} /> : <Copy size={12} />}
                        {copiedRow === rowKey ? 'Copied' : 'Copy'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <a href="https://www.godaddy.com/help/manage-dns-records-680" target="_blank" rel="noopener noreferrer"
            className="text-green-700 hover:text-green-800 inline-flex items-center gap-1 underline">
            <ExternalLink size={12} /> GoDaddy guide
          </a>
          <a href="https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-an-a-address-record-for-my-domain/" target="_blank" rel="noopener noreferrer"
            className="text-green-700 hover:text-green-800 inline-flex items-center gap-1 underline">
            <ExternalLink size={12} /> Namecheap guide
          </a>
          <a href="https://support.google.com/domains/answer/3290309" target="_blank" rel="noopener noreferrer"
            className="text-green-700 hover:text-green-800 inline-flex items-center gap-1 underline">
            <ExternalLink size={12} /> Google Domains guide
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-2 border-gold-200">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center">
            <ArrowUpCircle size={22} className="text-gold-600" />
          </div>
          <div>
            <h3 className="font-semibold text-navy-500">Connect your own domain</h3>
            <p className="text-xs text-gray-500">
              Your site is on <span className="font-medium">{site.custom_domain}</span> — point a domain you own (like yourbusiness.com) at it.
            </p>
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="btn-secondary text-sm px-4">
          {expanded ? 'Close' : 'Connect a domain'}
        </button>
      </div>

      {expanded && (
        <div className="mt-6 pt-6 border-t border-gray-200 max-w-xl">
          <p className="text-sm text-gray-600 mb-4">
            <strong>Don&apos;t have a domain yet?</strong> Register one at{' '}
            <a href="https://www.godaddy.com" target="_blank" rel="noopener noreferrer" className="underline text-gold-600">GoDaddy</a>,{' '}
            <a href="https://www.namecheap.com" target="_blank" rel="noopener noreferrer" className="underline text-gold-600">Namecheap</a>, or any registrar
            (~$12/yr), then come back here.
          </p>

          <div className="flex gap-3 mb-3">
            <div className="relative flex-1">
              <Globe size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="input pl-10"
                placeholder="yourbusiness.com"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleConnect(); } }}
                disabled={submitting}
              />
            </div>
            <button
              onClick={handleConnect}
              disabled={submitting || !domainInput.trim()}
              className="btn-primary px-5 flex items-center gap-2 disabled:opacity-50"
            >
              <Link2 size={16} />
              {submitting ? 'Connecting...' : 'Connect'}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
