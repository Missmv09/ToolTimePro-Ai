'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, Edit2, Globe, Palette, FileText, ExternalLink, ArrowRight, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import SitePreviewFrame from './SitePreviewFrame';

export default function Step6ReviewLaunch({ wizardData, setWizardData, onGoToStep }) {
  const { company, session } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [launchError, setLaunchError] = useState(null);
  const [siteId, setSiteId] = useState(null);
  const [publishSteps, setPublishSteps] = useState({
    domain_registered: false,
    dns_configured: false,
    site_generated: false,
    deployed: false,
    live: false,
  });
  const pollRef = useRef(null);
  const sessionRef = useRef(session);

  // Keep sessionRef in sync so the polling interval always has the latest token
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Determine if user is on a free trial (has trial_ends_at but no paid subscription)
  const isOnTrial = company?.trial_ends_at && !company?.stripe_customer_id;
  const trialDaysLeft = isOnTrial
    ? Math.max(0, Math.ceil((new Date(company.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Poll for publish status
  useEffect(() => {
    if (siteId && !publishSteps.live) {
      pollRef.current = setInterval(async () => {
        try {
          // Always get a fresh token — the stored one may have expired
          const { data: { session: pollSession } } = await supabase.auth.getSession();
          const pollToken = pollSession?.access_token || sessionRef.current?.access_token;
          const res = await fetch(`/api/website-builder/publish-status?siteId=${siteId}`, {
            headers: pollToken ? { Authorization: `Bearer ${pollToken}` } : {},
          });
          const data = await res.json();
          if (data.steps) {
            setPublishSteps(data.steps);
          }
          if (data.status === 'live' || data.status === 'error') {
            clearInterval(pollRef.current);
            if (data.status === 'live') {
              setLaunched(true);
            }
            if (data.status === 'error') {
              setLaunchError(data.error || 'Something went wrong during deployment.');
            }
          }
        } catch {
          // Silently retry
        }
      }, 5000);
    }
    return () => clearInterval(pollRef.current);
  }, [siteId, publishSteps.live]);

  const handleLaunch = async () => {
    setLaunching(true);
    setLaunchError(null);

    try {
      // Force a token refresh — getSession() can return a stale/expired token.
      // refreshSession() guarantees a fresh access_token from Supabase.
      const { data: { session: freshSession } } = await supabase.auth.refreshSession();
      const token = freshSession?.access_token || session?.access_token;

      if (!token) {
        throw new Error('You must be logged in to launch your website. Please refresh the page and try again.');
      }

      const response = await fetch('/api/website-builder/create-site', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          trade: wizardData.trade,
          templateId: wizardData.templateId,
          businessName: wizardData.businessName,
          tagline: wizardData.tagline,
          phone: wizardData.phone,
          email: wizardData.email,
          serviceArea: wizardData.serviceArea,
          services: wizardData.services,
          licenseNumber: wizardData.licenseNumber,
          yearsInBusiness: wizardData.yearsInBusiness,
          selectedDomain: wizardData.selectedDomain,
          colors: wizardData.colors,
          enabledSections: wizardData.enabledSections,
          heroImage: wizardData.heroImage ? { type: wizardData.heroImage.type, url: wizardData.heroImage.url } : null,
          galleryImages: wizardData.galleryImages.map((p) => ({ type: p.type, url: p.url })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create site');
      }

      setSiteId(data.siteId);

      // API now sets site live synchronously — mark all steps done if already live
      if (data.status === 'live') {
        setPublishSteps({ domain_registered: true, dns_configured: true, site_generated: true, deployed: true, live: true });
        setLaunched(true);
      } else {
        setPublishSteps((prev) => ({ ...prev, domain_registered: true, dns_configured: true }));
      }
    } catch (err) {
      setLaunchError(err.message);
      setLaunching(false);
    }
  };

  // Launch success screen
  if (siteId) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${launched ? 'bg-green-100' : 'bg-gold-100'}`}>
          {launched ? (
            <Check size={40} className="text-green-600" />
          ) : (
            <RefreshCw size={32} className="text-gold-600 animate-spin" />
          )}
        </div>

        <h2 className="text-2xl font-bold text-navy-500 mb-2">
          {launched ? 'Your Website is LIVE!' : 'Your Website is Being Built!'}
        </h2>
        <p className="text-gray-500 mb-8">
          {launched
            ? `${wizardData.selectedDomain?.domainName} is live and ready for customers.`
            : `We're setting up ${wizardData.selectedDomain?.domainName} right now. You'll be notified when it's live.`}
        </p>

        {/* Progress steps */}
        <div className="card text-left mb-8">
          <p className="text-sm font-semibold text-navy-500 mb-4">What&apos;s happening now:</p>
          <div className="space-y-3">
            {[
              { key: 'domain_registered', label: 'Domain registered' },
              { key: 'dns_configured', label: 'Setting up hosting' },
              { key: 'site_generated', label: 'Building your pages' },
              { key: 'deployed', label: 'Deploying to the web' },
              { key: 'live', label: 'Going live!' },
            ].map((step) => (
              <div key={step.key} className="flex items-center gap-3">
                {publishSteps[step.key] ? (
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <Check size={14} className="text-green-600" />
                  </div>
                ) : (
                  <div className="w-6 h-6 border-2 border-gray-200 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-gray-300 rounded-full" />
                  </div>
                )}
                <span className={`text-sm ${publishSteps[step.key] ? 'text-navy-500 font-medium' : 'text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Error state */}
        {launchError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 text-left">
            {launchError}
          </div>
        )}

        {/* CTAs */}
        {launched && (
          <div className="space-y-3 mb-8">
            <a
              href={`https://${wizardData.selectedDomain?.domainName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary w-full flex items-center justify-center gap-2 py-3"
            >
              <ExternalLink size={18} />
              Visit Your Website
            </a>
          </div>
        )}

        <div className="card bg-gold-50 border border-gold-200">
          <h3 className="font-semibold text-navy-500 mb-2">While you wait...</h3>
          <p className="text-sm text-gray-600 mb-4">Set up Jenny AI Chatbot to capture leads from your website 24/7.</p>
          <a href="/dashboard/settings" className="btn-primary inline-flex items-center gap-2 text-sm">
            Set up Jenny AI Chatbot
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    );
  }

  // Review screen
  return (
    <div>
      <h2 className="text-2xl font-bold text-navy-500 mb-2">Review & launch</h2>
      <p className="text-gray-500 mb-8">Everything look right? Hit launch and we&apos;ll get your site live.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column — Summary */}
        <div className="space-y-4">
          {/* Business Info */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-gold-500" />
                <h3 className="font-semibold text-navy-500">Business Info</h3>
              </div>
              <button onClick={() => onGoToStep(3)} className="text-gold-500 hover:text-gold-600 text-sm flex items-center gap-1">
                <Edit2 size={14} />
                Edit
              </button>
            </div>
            <dl className="space-y-1.5 text-sm">
              <div className="flex">
                <dt className="text-gray-500 w-28">Business:</dt>
                <dd className="text-navy-500 font-medium">{wizardData.businessName}</dd>
              </div>
              <div className="flex">
                <dt className="text-gray-500 w-28">Phone:</dt>
                <dd className="text-navy-500">{wizardData.phone}</dd>
              </div>
              {wizardData.email && (
                <div className="flex">
                  <dt className="text-gray-500 w-28">Email:</dt>
                  <dd className="text-navy-500">{wizardData.email}</dd>
                </div>
              )}
              {wizardData.serviceArea && (
                <div className="flex">
                  <dt className="text-gray-500 w-28">Service Area:</dt>
                  <dd className="text-navy-500">{wizardData.serviceArea}</dd>
                </div>
              )}
              <div className="flex">
                <dt className="text-gray-500 w-28">Services:</dt>
                <dd className="text-navy-500">{wizardData.services.join(', ')}</dd>
              </div>
            </dl>
          </div>

          {/* Template & Design */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Palette size={18} className="text-gold-500" />
                <h3 className="font-semibold text-navy-500">Template & Design</h3>
              </div>
              <button onClick={() => onGoToStep(5)} className="text-gold-500 hover:text-gold-600 text-sm flex items-center gap-1">
                <Edit2 size={14} />
                Edit
              </button>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex gap-1.5">
                <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: wizardData.colors.primary }} />
                <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: wizardData.colors.accent }} />
                <div className="w-5 h-5 rounded-full border border-gray-300" style={{ backgroundColor: wizardData.colors.background }} />
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Sections: {wizardData.enabledSections.join(', ')}
            </p>
          </div>

          {/* Domain */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-gold-500" />
                <h3 className="font-semibold text-navy-500">Domain</h3>
              </div>
              <button onClick={() => onGoToStep(4)} className="text-gold-500 hover:text-gold-600 text-sm flex items-center gap-1">
                <Edit2 size={14} />
                Edit
              </button>
            </div>
            {wizardData.selectedDomain && (
              <div>
                <p className="text-navy-500 font-semibold">{wizardData.selectedDomain.domainName}</p>
                {wizardData.selectedDomain.type === 'new' && (
                  <p className="text-sm text-gray-500">${wizardData.selectedDomain.price}/year (auto-renews)</p>
                )}
                {wizardData.selectedDomain.type === 'existing' && (
                  <p className="text-sm text-green-600">Your existing domain — DNS setup after launch</p>
                )}
                {wizardData.selectedDomain.type === 'subdomain' && (
                  <p className="text-sm text-green-600">Free subdomain — included with your plan</p>
                )}
              </div>
            )}
          </div>

          {/* Cost Summary */}
          <div className="card border-2 border-gold-200 bg-gold-50/30">
            <h3 className="font-semibold text-navy-500 mb-4">Your Website Plan</h3>
            {isOnTrial && (
              <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                Included in your free trial — <strong>{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining</strong>. Billing starts after your trial ends.
              </div>
            )}
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Website Builder Add-on</span>
                {isOnTrial ? (
                  <span className="font-semibold">
                    <span className="line-through text-gray-400">$15/month</span>{' '}
                    <span className="text-green-600">Free during trial</span>
                  </span>
                ) : (
                  <span className="font-semibold text-navy-500">$15/month</span>
                )}
              </div>
              {wizardData.selectedDomain?.type === 'new' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Domain Registration</span>
                  <span className="font-semibold text-navy-500">${wizardData.selectedDomain?.price || '12.99'}/year</span>
                </div>
              )}
              {wizardData.selectedDomain?.type === 'existing' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Custom Domain</span>
                  <span className="font-semibold text-green-600">Included</span>
                </div>
              )}
              {wizardData.selectedDomain?.type === 'subdomain' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Free Subdomain</span>
                  <span className="font-semibold text-green-600">Free</span>
                </div>
              )}
            </div>
            <div className="border-t border-gold-200 pt-3 space-y-1.5">
              {[
                'Professional website',
                'Custom domain',
                'Lead capture form → your CRM',
                'Mobile-responsive design',
                'SSL certificate included',
                'Automatic lead notifications',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm text-navy-500">
                  <Check size={14} className="text-green-500 flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Confirmation & Launch */}
          <div>
            <label className="flex items-start gap-3 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-gray-300 text-gold-500 focus:ring-gold-500"
              />
              <span className="text-sm text-gray-600">
                {isOnTrial
                  ? `I confirm the above information is correct and I agree to the Website Builder terms. The Website Builder is included in my free trial — billing of $15/month${wizardData.selectedDomain?.type === 'new' ? ' + domain registration fee' : ''} begins when my trial ends.`
                  : `I confirm the above information is correct and I agree to the Website Builder terms ($15/month${wizardData.selectedDomain?.type === 'new' ? ' + domain registration fee' : ''}).`
                }
              </span>
            </label>

            {launchError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {launchError}
              </div>
            )}

            <button
              onClick={handleLaunch}
              disabled={!confirmed || launching}
              className="btn-secondary w-full py-3 text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {launching ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  Setting up your website...
                </>
              ) : (
                <>
                  Launch My Website
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right column — Preview */}
        <div className="hidden lg:block">
          <p className="text-sm font-medium text-navy-500 mb-3">Preview</p>
          <SitePreviewFrame wizardData={wizardData} />
        </div>
      </div>
    </div>
  );
}
