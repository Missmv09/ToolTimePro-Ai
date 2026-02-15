'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Globe, ExternalLink, Calendar, Users, Settings, RefreshCw, Edit2 } from 'lucide-react';
import WebsiteWizard from './components/WebsiteWizard';
import WebsiteEditor from './components/WebsiteEditor';
import DomainUpgradeCard from './components/DomainUpgradeCard';

export default function WebsiteBuilderPage() {
  const [existingSite, setExistingSite] = useState(null);
  const [leadCount, setLeadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user, dbUser, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    checkExistingSite();
  }, [authLoading, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkExistingSite = async () => {
    if (!user) return;

    try {
      const { data: site, error } = await supabase
        .from('website_sites')
        .select('*, website_templates(id, slug, name, trade_category, style, primary_color, secondary_color, accent_color, font_heading, font_body, layout_config, default_content)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (site) {
        // Auto-recover sites stuck in 'building' for over 2 minutes.
        // Use updated_at (not created_at) — created_at never changes, so old
        // sites would ALWAYS trigger recovery even if just re-launched.
        if (site.status === 'building' && (site.updated_at || site.created_at)) {
          const lastTouch = site.updated_at || site.created_at;
          const ageMs = Date.now() - new Date(lastTouch).getTime();
          if (ageMs > 2 * 60 * 1000) {
            const { error: updateErr } = await supabase
              .from('website_sites')
              .update({ status: 'live', published_at: new Date().toISOString() })
              .eq('id', site.id);

            if (!updateErr) {
              site.status = 'live';
              site.published_at = new Date().toISOString();
            }
          }
        }

        setExistingSite(site);

        // Get lead count
        const { count } = await supabase
          .from('website_leads')
          .select('*', { count: 'exact', head: true })
          .eq('site_id', site.id);

        setLeadCount(count || 0);
      }
    } catch (err) {
      console.error('[Website Builder] Error checking site:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500" />
      </div>
    );
  }

  // State B: Site exists — show dashboard
  if (existingSite) {
    return <WebsiteDashboard site={existingSite} leadCount={leadCount} onRefresh={checkExistingSite} />;
  }

  // State A: No site — show wizard
  return <WebsiteWizard />;
}

function WebsiteDashboard({ site, leadCount, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const hasRealDomain = site.custom_domain && !site.custom_domain.endsWith('.tooltimepro.com');
  const domainUrl = hasRealDomain
    ? `https://${site.custom_domain}`
    : site.slug
      ? `https://tooltimepro.com/site/${site.slug}`
      : null;
  const isLive = site.status === 'live';
  const isBuilding = site.status === 'building';

  const statusColors = {
    live: 'bg-green-100 text-green-700',
    building: 'bg-yellow-100 text-yellow-700',
    draft: 'bg-gray-100 text-gray-700',
    error: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-500">Your Website</h1>
          <p className="text-gray-500 mt-1">{site.business_name}</p>
        </div>
        <button onClick={onRefresh} className="btn-ghost p-2">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Status card */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Globe size={24} className="text-gold-500" />
            <div>
              <p className="font-semibold text-navy-500">
                {hasRealDomain ? site.custom_domain : (site.slug ? `tooltimepro.com/site/${site.slug}` : 'No domain yet')}
              </p>
              <span className={`badge mt-1 ${statusColors[site.status] || statusColors.draft}`}>
                {site.status === 'live' ? 'Live' : site.status === 'building' ? 'Building...' : site.status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLive && (
              <button
                onClick={() => setEditing(true)}
                className="btn-ghost flex items-center gap-2"
              >
                <Edit2 size={16} />
                Edit Site
              </button>
            )}
            {isLive && domainUrl && (
              <a
                href={domainUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center gap-2"
              >
                <ExternalLink size={16} />
                Visit Site
              </a>
            )}
          </div>
        </div>

        {isBuilding && (
          <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700 flex items-center gap-2">
            <RefreshCw size={16} className="animate-spin" />
            Your website is being set up. This usually takes under 10 minutes.
          </div>
        )}
      </div>

      {/* Domain upgrade prompt for subdomain users */}
      {site.custom_domain?.endsWith('.tooltimepro.com') && (
        <div className="mb-6">
          <DomainUpgradeCard site={site} onUpgraded={onRefresh} />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Users size={18} className="text-gold-500" />
            <span className="stat-label">Leads</span>
          </div>
          <p className="stat-value">{leadCount}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Globe size={18} className="text-gold-500" />
            <span className="stat-label">Domain Status</span>
          </div>
          <p className="text-lg font-semibold text-navy-500 capitalize">{site.domain_status || 'None'}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={18} className="text-gold-500" />
            <span className="stat-label">Domain Expires</span>
          </div>
          <p className="text-lg font-semibold text-navy-500">
            {site.domain_expires_at
              ? new Date(site.domain_expires_at).toLocaleDateString()
              : '—'}
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Settings size={18} className="text-gold-500" />
            <span className="stat-label">Template</span>
          </div>
          <p className="text-lg font-semibold text-navy-500">
            {site.website_templates?.name || 'Custom'}
          </p>
        </div>
      </div>

      {/* Quick info */}
      <div className="card">
        <h2 className="font-semibold text-navy-500 mb-4">Site Details</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Phone</dt>
            <dd className="text-navy-500">{site.business_phone || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Email</dt>
            <dd className="text-navy-500">{site.business_email || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Auto-Renew</dt>
            <dd className="text-navy-500">{site.domain_auto_renew ? 'Yes' : 'No'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Created</dt>
            <dd className="text-navy-500">{new Date(site.created_at).toLocaleDateString()}</dd>
          </div>
        </dl>
      </div>

      {/* Website Editor modal */}
      {editing && (
        <WebsiteEditor
          site={site}
          template={site.website_templates || {}}
          onClose={() => setEditing(false)}
          onSaved={() => {
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
