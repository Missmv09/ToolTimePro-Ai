'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// ============================================
// STRIPE PRICE IDS - Using environment variables
// ============================================

const PRICE_IDS = {
  // Base Tiers
  // Starter: $30/mo, $300/yr - Owner + 2 workers
  // Pro: $59/mo, $590/yr - Up to 15 workers
  // Elite: $99/mo, $990/yr - Up to 20 workers
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    annual: process.env.STRIPE_PRICE_STARTER_ANNUAL,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
  },
  elite: {
    monthly: process.env.STRIPE_PRICE_ELITE_MONTHLY,
    annual: process.env.STRIPE_PRICE_ELITE_ANNUAL,
  },
  // Standalone Lite
  booking_only: {
    monthly: process.env.STRIPE_PRICE_BOOKING_ONLY_MONTHLY,
    annual: process.env.STRIPE_PRICE_BOOKING_ONLY_ANNUAL,
  },
  invoicing_only: {
    monthly: process.env.STRIPE_PRICE_INVOICING_ONLY_MONTHLY,
    annual: process.env.STRIPE_PRICE_INVOICING_ONLY_ANNUAL,
  },
  // Jenny AI - Three Tiers
  jenny_lite: {
    monthly: process.env.STRIPE_PRICE_JENNY_LITE_MONTHLY,
    annual: process.env.STRIPE_PRICE_JENNY_LITE_ANNUAL,
  },
  jenny_pro: {
    monthly: process.env.STRIPE_PRICE_JENNY_PRO_MONTHLY,
    annual: process.env.STRIPE_PRICE_JENNY_PRO_ANNUAL,
  },
  jenny_exec_admin: {
    monthly: process.env.STRIPE_PRICE_JENNY_EXEC_ADMIN_MONTHLY,
    annual: process.env.STRIPE_PRICE_JENNY_EXEC_ADMIN_ANNUAL,
  },
  // Other Add-ons
  website_builder: {
    monthly: process.env.STRIPE_PRICE_WEBSITE_BUILDER_MONTHLY,
    annual: process.env.STRIPE_PRICE_WEBSITE_BUILDER_ANNUAL,
  },
  keep_me_legal: {
    monthly: process.env.STRIPE_PRICE_KEEP_ME_LEGAL_MONTHLY,
    annual: process.env.STRIPE_PRICE_KEEP_ME_LEGAL_ANNUAL,
  },
  extra_page: {
    monthly: process.env.STRIPE_PRICE_EXTRA_PAGE_MONTHLY,
    annual: process.env.STRIPE_PRICE_EXTRA_PAGE_ANNUAL,
  },
  extra_worker: {
    monthly: process.env.STRIPE_PRICE_EXTRA_WORKER,
  },
  quickbooks_sync: {
    monthly: process.env.STRIPE_PRICE_QUICKBOOKS_SYNC_MONTHLY,
    annual: process.env.STRIPE_PRICE_QUICKBOOKS_SYNC_ANNUAL,
  },
  // Onboarding
  assisted_onboarding: process.env.STRIPE_PRICE_ASSISTED_ONBOARDING,
  white_glove: process.env.STRIPE_PRICE_WHITE_GLOVE,
};

// ============================================
// PRICING DATA
// ============================================

const TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 30,
    annualPrice: 300,
    description: 'For small teams',
    workers: 'Owner + 2 workers',
    features: [
      'Online scheduling & booking',
      'Smart quoting & invoicing',
      'GPS clock-in',
      'AI-powered quotes & reviews',
      'Federal compliance (ToolTime Shield)',
      '1-page website',
      'Spanish language support',
      'Jenny Lite — AI Chat & Lead Capture',
      'Chat & email support',
    ],
    notIncluded: ['Worker App', 'Time Tracking', 'Dispatch Board'],
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 59,
    annualPrice: 590,
    description: 'For growing teams who need more tools',
    workers: 'Up to 15 workers',
    features: [
      'Everything in Starter, plus:',
      'Worker App with GPS',
      'Time Tracking & Breaks',
      'California state compliance rules',
      '3-page website',
      'SMS notifications',
      'Review automation',
      'Phone support',
    ],
    notIncluded: ['Dispatch Board', 'Route Optimization'],
    popular: true,
  },
  {
    id: 'elite',
    name: 'Elite',
    monthlyPrice: 99,
    annualPrice: 990,
    description: 'Full operations suite for serious businesses',
    workers: 'Up to 20 workers',
    features: [
      'Everything in Pro, plus:',
      'Dispatch Board',
      'Multi-tech management',
      'Route optimization',
      'Local/city compliance rules',
      '5-page website',
      'Compliance alerts',
      'Priority support',
    ],
    notIncluded: [],
    popular: false,
    highlight: 'dispatch',
  },
];

const STANDALONE = [
  {
    id: 'booking_only',
    name: 'Booking Only',
    monthlyPrice: 15,
    annualPrice: 150,
    icon: '📅',
    description: 'Just need online booking? Start here.',
  },
  {
    id: 'invoicing_only',
    name: 'Invoicing Only',
    monthlyPrice: 15,
    annualPrice: 150,
    icon: '🧾',
    description: 'Just need to send invoices? This is for you.',
  },
];

const ADDONS = [
  {
    id: 'jenny_lite',
    name: 'Jenny Lite',
    monthlyPrice: 19,
    annualPrice: 190,
    icon: '💬',
    description: 'Website chat, lead capture, bilingual',
    hasAnnual: true,
    isJenny: true,
    isCustomerFacing: true,
  },
  {
    id: 'jenny_pro',
    name: 'Jenny Pro',
    monthlyPrice: 49,
    annualPrice: 490,
    icon: '📞',
    description: 'Phone, SMS, direct booking, bilingual voice',
    hasAnnual: true,
    highlight: true,
    isJenny: true,
    isCustomerFacing: true,
  },
  {
    id: 'jenny_exec_admin',
    name: 'Jenny Exec Admin',
    monthlyPrice: 79,
    annualPrice: 790,
    icon: '📊',
    description: 'Compliance advisor, HR, business insights',
    hasAnnual: true,
    isJenny: true,
    isOwnerFacing: true,
  },
  {
    id: 'website_builder',
    name: 'Website Builder',
    monthlyPrice: 15,
    annualPrice: 150,
    icon: '🌐',
    description: 'Custom landing page built for you',
    hasAnnual: true,
  },
  {
    id: 'extra_page',
    name: 'Extra Website Page',
    monthlyPrice: 10,
    annualPrice: 100,
    icon: '📄',
    description: 'Add more pages to your site',
    hasAnnual: true,
  },
  {
    id: 'keep_me_legal',
    name: 'Keep Me Legal',
    monthlyPrice: 19,
    annualPrice: 190,
    icon: '🛡️',
    description: 'Compliance monitoring & alerts',
    hasAnnual: true,
  },
  {
    id: 'quickbooks_sync',
    name: 'QuickBooks Sync',
    monthlyPrice: 12,
    annualPrice: 120,
    icon: '📗',
    description: 'Two-way sync with QuickBooks Online',
    hasAnnual: true,
  },
];

const ONBOARDING = [
  {
    id: 'assisted_onboarding',
    name: 'Assisted Onboarding',
    price: 149,
    description: 'We help you set up your account',
    features: ['Account setup assistance', 'Import your customer list', '30-min training call'],
  },
  {
    id: 'white_glove',
    name: 'White Glove Setup',
    price: 349,
    description: 'We do everything for you',
    features: ['Full done-for-you setup', 'Website design & copy', 'Import all data', '1-hour training', '30-day priority support'],
    recommended: true,
  },
];

// ============================================
// COMPONENT
// ============================================

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [selectedStandalone, setSelectedStandalone] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [selectedOnboarding, setSelectedOnboarding] = useState(null);
  const [extraWorkers, setExtraWorkers] = useState(0);

  const toggleAddon = (addonId) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId]
    );
  };

  const isElite = selectedTier === 'elite';

  const selectTier = (tierId) => {
    setSelectedTier(tierId);
    setSelectedStandalone(null);
    // Auto-include Jenny Lite — included with all plans
    setSelectedAddons(prev => prev.includes('jenny_lite') ? prev : [...prev, 'jenny_lite']);
  };

  const selectStandalone = (standaloneId) => {
    setSelectedStandalone(standaloneId);
    setSelectedTier(null);
  };

  const calculateTotal = () => {
    let monthly = 0;
    let annual = 0;

    if (selectedTier) {
      const tier = TIERS.find((t) => t.id === selectedTier);
      monthly = tier?.monthlyPrice || 0;
      annual = tier?.annualPrice || 0;
    } else if (selectedStandalone) {
      const standalone = STANDALONE.find((s) => s.id === selectedStandalone);
      monthly = standalone?.monthlyPrice || 0;
      annual = standalone?.annualPrice || 0;
    }

    selectedAddons.forEach((addonId) => {
      // Jenny Lite is included free with all plans — don't charge for it
      if (addonId === 'jenny_lite' && selectedTier) return;
      const addon = ADDONS.find((a) => a.id === addonId);
      if (addon) {
        monthly += addon.monthlyPrice;
        annual += addon.annualPrice || addon.monthlyPrice * 12;
      }
    });

    monthly += extraWorkers * 7;
    annual += extraWorkers * 7 * 12;

    return { monthly, annual };
  };

  const totals = calculateTotal();
  const displayPrice = isAnnual ? Math.round(totals.annual / 12) : totals.monthly;
  const onboardingPrice = selectedOnboarding
    ? ONBOARDING.find((o) => o.id === selectedOnboarding)?.price || 0
    : 0;

  const handleCheckout = () => {
    const params = new URLSearchParams();

    if (selectedTier) params.set('tier', selectedTier);
    if (selectedStandalone) params.set('standalone', selectedStandalone);
    if (selectedAddons.length) params.set('addons', selectedAddons.join(','));
    if (selectedOnboarding) params.set('onboarding', selectedOnboarding);
    if (extraWorkers > 0) params.set('extraWorkers', extraWorkers.toString());
    params.set('billing', isAnnual ? 'annual' : 'monthly');

    window.location.href = `/api/checkout?${params.toString()}`;
  };

  const hasSelection = selectedTier || selectedStandalone;

  return (
    <div className="pricing-page">
      {/* Navigation */}
      <nav className="nav">
        <Link href="/"><Image src="/logo-horizontal-white-01262026.png" alt="ToolTime Pro" width={180} height={40} className="logo-img" /></Link>
        <div className="nav-links">
          <Link href="/#features">Features</Link>
          <Link href="/pricing" className="active">Pricing</Link>
          <Link href="/auth/login" className="btn-login">Login</Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="hero">
        <h1>Simple Pricing. Powerful Tools.</h1>
        <p>Start with what you need. Add more as you grow. No contracts.</p>

        <div className="billing-toggle">
          <span className={!isAnnual ? 'active' : ''}>Monthly</span>
          <button
            className={`toggle ${isAnnual ? 'on' : ''}`}
            onClick={() => setIsAnnual(!isAnnual)}
          >
            <span className="toggle-knob" />
          </button>
          <span className={isAnnual ? 'active' : ''}>
            Annual <span className="save-badge">Save ~17%</span>
          </span>
        </div>
      </header>

      <main className="main">
        {/* Main Tiers */}
        <section className="section">
          <h2>Choose Your Plan</h2>
          <div className="tiers-grid">
            {TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`tier-card ${selectedTier === tier.id ? 'selected' : ''} ${tier.popular ? 'popular' : ''}`}
                onClick={() => selectTier(tier.id)}
              >
                {tier.popular && <span className="popular-badge">Most Popular</span>}

                <h3>{tier.name}</h3>
                <p className="tier-desc">{tier.description}</p>

                <div className="tier-price">
                  <span className="currency">$</span>
                  <span className="amount">{isAnnual ? Math.round(tier.annualPrice / 12) : tier.monthlyPrice}</span>
                  <span className="period">/mo</span>
                </div>

                {isAnnual && (
                  <p className="annual-note">Billed ${tier.annualPrice}/year</p>
                )}

                <p className="workers-info">👷 {tier.workers}</p>
                <p className="workers-extra">+$7/user/mo for additional</p>

                <ul className="features">
                  {tier.features.map((f, i) => (
                    <li key={i} className={f.includes('Dispatch Board') ? 'highlight' : ''}>
                      <span className="check">✓</span> {f}
                    </li>
                  ))}
                  {tier.notIncluded.map((f, i) => (
                    <li key={`not-${i}`} className="not-included">
                      <span className="x">✗</span> {f}
                    </li>
                  ))}
                </ul>

                <button className={`select-btn ${selectedTier === tier.id ? 'selected' : ''}`}>
                  {selectedTier === tier.id ? '✓ Selected' : 'Select Plan'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Just Need One Thing */}
        <section className="section standalone-section">
          <h2>Just Need One Thing?</h2>
          <p className="section-desc">Not ready for a full plan? Start with just what you need.</p>

          <div className="standalone-grid">
            {STANDALONE.map((item) => (
              <div
                key={item.id}
                className={`standalone-card ${selectedStandalone === item.id ? 'selected' : ''}`}
                onClick={() => selectStandalone(item.id)}
              >
                <span className="standalone-icon">{item.icon}</span>
                <h4>{item.name}</h4>
                <p className="standalone-price">
                  ${isAnnual ? Math.round(item.annualPrice / 12) : item.monthlyPrice}/mo
                </p>
                <p className="standalone-desc">{item.description}</p>
                <div className="standalone-check">
                  {selectedStandalone === item.id ? '☑' : '☐'}
                </div>
              </div>
            ))}
          </div>

          <p className="upgrade-note">
            💡 Standalone products can be upgraded to full plans anytime — we&apos;ll credit what you&apos;ve paid!
          </p>
        </section>

        {/* Jenny AI Add-on */}
        <section className="section jenny-section">
          <div className="jenny-banner">
            <div className="jenny-banner-content">
              <div className="jenny-avatar">🎧</div>
              <div className="jenny-info">
                <h2>Add Jenny AI — Your Business Assistant</h2>
                <p>Jenny handles calls, chat, SMS, and keeps you compliant 24/7. Choose the tier that fits your needs.</p>
                <div className="jenny-compare">
                  <span className="jenny-price">Lite <strong>Included Free</strong> on all plans</span>
                  <span className="jenny-vs">Jobber charges $349/mo for this</span>
                </div>
              </div>
              <Link href="/jenny" className="jenny-learn-more">Learn More →</Link>
            </div>
          </div>

          <div className="jenny-section-label">
            <span className="section-label-badge">Customer-Facing</span>
          </div>

          <div className="jenny-tiers">
            <div
              className={`jenny-tier ${selectedAddons.includes('jenny_lite') ? 'selected' : ''} ${selectedTier ? 'included' : ''}`}
              onClick={() => {
                // Don't allow removing Jenny Lite when any plan is selected (it's included)
                if (selectedTier) return;
                if (selectedAddons.includes('jenny_pro')) {
                  setSelectedAddons(prev => prev.filter(id => id !== 'jenny_pro'));
                }
                toggleAddon('jenny_lite');
              }}
              style={selectedTier ? { cursor: 'default' } : {}}
            >
              {selectedTier && <span className="jenny-included-label">✓ Included in All Plans</span>}
              <div className="jenny-tier-header">
                <h4>Jenny Lite</h4>
                <span className="jenny-tier-price">{selectedTier ? 'Included' : `+$${isAnnual ? '16' : '19'}/mo`}</span>
              </div>
              <ul>
                <li>✓ Website chat widget</li>
                <li>✓ Lead capture & notifications</li>
                <li>✓ FAQ answering</li>
                <li>✓ English & Spanish</li>
              </ul>
              {!selectedTier && isAnnual && <p className="jenny-annual-note">Billed $190/year</p>}
              <div className="jenny-tier-check">{selectedAddons.includes('jenny_lite') ? '☑' : '☐'}</div>
            </div>

            <div
              className={`jenny-tier recommended ${selectedAddons.includes('jenny_pro') ? 'selected' : ''}`}
              onClick={() => {
                if (selectedAddons.includes('jenny_lite')) {
                  setSelectedAddons(prev => prev.filter(id => id !== 'jenny_lite'));
                }
                toggleAddon('jenny_pro');
              }}
            >
              <span className="best-value-badge">Most Popular</span>
              <div className="jenny-tier-header">
                <h4>Jenny Pro</h4>
                <span className="jenny-tier-price">+${isAnnual ? '41' : '49'}/mo</span>
              </div>
              <ul>
                <li>✓ Everything in Lite, plus:</li>
                <li>✓ <strong>AI phone answering 24/7</strong></li>
                <li>✓ SMS conversations</li>
                <li>✓ Direct booking into calendar</li>
                <li>✓ Bilingual voice support</li>
                <li>✓ Emergency escalation</li>
              </ul>
              {isAnnual && <p className="jenny-annual-note">Billed $490/year</p>}
              <div className="jenny-tier-check">{selectedAddons.includes('jenny_pro') ? '☑' : '☐'}</div>
            </div>
          </div>

          <div className="jenny-section-label owner-facing">
            <span className="section-label-badge">Owner-Facing</span>
          </div>

          <div className="jenny-tiers single">
            <div
              className={`jenny-tier exec ${selectedAddons.includes('jenny_exec_admin') ? 'selected' : ''}`}
              onClick={() => toggleAddon('jenny_exec_admin')}
            >
              <div className="jenny-tier-header">
                <h4>Jenny Exec Admin</h4>
                <span className="jenny-tier-price">+${isAnnual ? '66' : '79'}/mo</span>
              </div>
              <ul>
                <li>✓ Compliance advisor & alerts</li>
                <li>✓ HR guidance & document help</li>
                <li>✓ Business insights & reports</li>
                <li>✓ California labor law expertise</li>
                <li>✓ For owners only (not shown to workers)</li>
              </ul>
              {isAnnual && <p className="jenny-annual-note">Billed $790/year</p>}
              <div className="jenny-tier-check">{selectedAddons.includes('jenny_exec_admin') ? '☑' : '☐'}</div>
            </div>
          </div>
        </section>

        {/* Other Add-ons */}
        <section className="section">
          <h2>Other Add-Ons</h2>
          <p className="section-desc">Supercharge any plan with these extras.</p>

          <div className="addons-grid">
            {ADDONS.filter(addon => !addon.isJenny).map((addon) => (
              <div
                key={addon.id}
                className={`addon-card ${selectedAddons.includes(addon.id) ? 'selected' : ''} ${addon.highlight ? 'highlight' : ''}`}
                onClick={() => toggleAddon(addon.id)}
              >
                <div className="addon-top">
                  <span className="addon-icon">{addon.icon}</span>
                  <span className="addon-check">
                    {selectedAddons.includes(addon.id) ? '☑' : '☐'}
                  </span>
                </div>
                <h4>{addon.name}</h4>
                <p className="addon-price">+${addon.monthlyPrice}/mo</p>
                <p className="addon-desc">{addon.description}</p>
              </div>
            ))}
          </div>

          {(selectedTier || selectedStandalone) && (
            <div className="extra-workers">
              <h4>Need Extra Workers?</h4>
              <p>Add more team members at $7/user/month</p>
              <div className="workers-control">
                <button onClick={() => setExtraWorkers(Math.max(0, extraWorkers - 1))} disabled={extraWorkers === 0}>−</button>
                <span className="workers-count">{extraWorkers}</span>
                <button onClick={() => setExtraWorkers(extraWorkers + 1)}>+</button>
              </div>
              {extraWorkers > 0 && <p className="workers-cost">+${extraWorkers * 7}/mo</p>}
            </div>
          )}
        </section>

        {/* Onboarding */}
        <section className="section">
          <h2>Optional Onboarding Services</h2>
          <p className="section-desc">Get help setting up. One-time fee.</p>

          <div className="onboarding-grid">
            {ONBOARDING.map((option) => (
              <div
                key={option.id}
                className={`onboarding-card ${selectedOnboarding === option.id ? 'selected' : ''} ${option.recommended ? 'recommended' : ''}`}
                onClick={() => setSelectedOnboarding(selectedOnboarding === option.id ? null : option.id)}
              >
                {option.recommended && <span className="recommended-badge">Recommended</span>}
                <h4>{option.name}</h4>
                <p className="onboarding-price">${option.price} <span>one-time</span></p>
                <p className="onboarding-desc">{option.description}</p>
                <ul className="onboarding-features">
                  {option.features.map((f, i) => (
                    <li key={i}>✓ {f}</li>
                  ))}
                </ul>
                <div className="onboarding-check">
                  {selectedOnboarding === option.id ? '☑' : '☐'}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Summary & CTA */}
        {hasSelection && (
          <section className="summary-section">
            <div className="summary-card">
              <h3>Your Selection</h3>

              <div className="summary-items">
                {selectedTier && (
                  <div className="summary-line main">
                    <span>{TIERS.find(t => t.id === selectedTier)?.name} Plan</span>
                    <span>${isAnnual ? Math.round(TIERS.find(t => t.id === selectedTier)?.annualPrice / 12) : TIERS.find(t => t.id === selectedTier)?.monthlyPrice}/mo</span>
                  </div>
                )}
                {selectedStandalone && (
                  <div className="summary-line main">
                    <span>{STANDALONE.find(s => s.id === selectedStandalone)?.name}</span>
                    <span>${isAnnual ? Math.round(STANDALONE.find(s => s.id === selectedStandalone)?.annualPrice / 12) : STANDALONE.find(s => s.id === selectedStandalone)?.monthlyPrice}/mo</span>
                  </div>
                )}

                {selectedAddons.map((addonId) => {
                  const addon = ADDONS.find(a => a.id === addonId);
                  const isIncludedFree = addonId === 'jenny_lite' && selectedTier;
                  return (
                    <div key={addonId} className="summary-line">
                      <span>{addon?.icon} {addon?.name}</span>
                      <span>{isIncludedFree ? 'Included ✓' : `+$${addon?.monthlyPrice}/mo`}</span>
                    </div>
                  );
                })}

                {extraWorkers > 0 && (
                  <div className="summary-line">
                    <span>👷 {extraWorkers} Extra Workers</span>
                    <span>+${extraWorkers * 7}/mo</span>
                  </div>
                )}
              </div>

              <div className="summary-divider" />

              <div className="summary-total">
                <span>Monthly Total</span>
                <span className="total-amount">${displayPrice}<span>/mo</span></span>
              </div>

              {isAnnual && (
                <p className="annual-total">Billed ${totals.annual}/year</p>
              )}

              {selectedOnboarding && (
                <div className="summary-onboarding">
                  <span>+ {ONBOARDING.find(o => o.id === selectedOnboarding)?.name}</span>
                  <span>${onboardingPrice} one-time</span>
                </div>
              )}

              <button className="cta-btn" onClick={handleCheckout}>
                Start 14-Day Free Trial →
              </button>
              <p className="cta-note">No credit card required</p>
            </div>
          </section>
        )}

        {/* Dispatch Board Callout */}
        <section className="dispatch-callout">
          <div className="dispatch-content">
            <span className="dispatch-icon">🗺️</span>
            <div>
              <h3>Need the Dispatch Board?</h3>
              <p>Real-time crew tracking, drag-and-drop scheduling, and route optimization. Available exclusively in Elite.</p>
            </div>
            <button onClick={() => selectTier('elite')} className="dispatch-btn">
              Get Elite →
            </button>
          </div>
        </section>

        {/* FAQ */}
        <section className="section faq-section">
          <h2>Common Questions</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>Can I switch plans later?</h4>
              <p>Yes! Upgrade or downgrade anytime. Changes apply to your next billing cycle.</p>
            </div>
            <div className="faq-item">
              <h4>What&apos;s included in the trial?</h4>
              <p>Full access to your selected plan for 14 days. No credit card needed to start.</p>
            </div>
            <div className="faq-item">
              <h4>Do I need onboarding?</h4>
              <p>It&apos;s optional but recommended. We&apos;ll set everything up so you can focus on your business.</p>
            </div>
            <div className="faq-item">
              <h4>What if I just need booking OR invoicing?</h4>
              <p>Start with our $15/mo standalone options. Upgrade to a full plan anytime — we&apos;ll credit your payments.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-top">
          <p>© 2026 ToolTime Pro. Built for California contractors.</p>
          <div className="footer-badge">
            <span className="women-owned">★ Women-Owned Business</span>
          </div>
        </div>
        <div className="footer-links">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </footer>

      <style jsx>{`
        .pricing-page {
          --navy: #1a1a2e;
          --navy-light: #2d2d44;
          --gold: #f5a623;
          --gold-light: #ffd380;
          --success: #00c853;
          --gray-100: #f5f5f5;
          --gray-200: #e5e5e5;
          --gray-600: #757575;
          font-family: 'DM Sans', -apple-system, sans-serif;
          background: var(--gray-100);
          min-height: 100vh;
        }
        .nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          background: var(--navy);
        }
        .logo {
          color: white;
          font-size: 1.4rem;
          font-weight: 700;
          text-decoration: none;
        }
        .nav-links {
          display: flex;
          gap: 2rem;
          align-items: center;
        }
        .nav-links a {
          color: rgba(255,255,255,0.8);
          text-decoration: none;
        }
        .nav-links a.active, .nav-links a:hover {
          color: var(--gold);
        }
        .btn-login {
          border: 2px solid var(--gold);
          padding: 0.5rem 1rem;
          border-radius: 6px;
        }
        .hero {
          background: linear-gradient(135deg, var(--navy), var(--navy-light));
          color: white;
          text-align: center;
          padding: 4rem 2rem 3rem;
        }
        .hero h1 {
          font-size: 2.5rem;
          margin: 0 0 0.5rem;
          color: #ffffff;
          font-weight: 800;
        }
        .hero > p {
          color: rgba(255, 255, 255, 0.95);
          margin: 0 0 2rem;
          font-size: 1.1rem;
        }
        .billing-toggle {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(255,255,255,0.1);
          padding: 0.5rem 1.25rem;
          border-radius: 30px;
        }
        .billing-toggle > span {
          opacity: 0.6;
        }
        .billing-toggle > span.active {
          opacity: 1;
          font-weight: 600;
        }
        .toggle {
          width: 50px;
          height: 26px;
          background: rgba(255,255,255,0.2);
          border: none;
          border-radius: 13px;
          position: relative;
          cursor: pointer;
        }
        .toggle.on {
          background: var(--gold);
        }
        .toggle-knob {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s;
        }
        .toggle.on .toggle-knob {
          transform: translateX(24px);
        }
        .save-badge {
          background: var(--success);
          color: white;
          font-size: 0.7rem;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          margin-left: 0.25rem;
        }
        .main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }
        .section {
          margin-bottom: 3rem;
        }
        .section h2 {
          text-align: center;
          color: var(--navy);
          margin: 0 0 0.5rem;
          font-size: 1.75rem;
        }
        .section-desc {
          text-align: center;
          color: var(--gray-600);
          margin: 0 0 1.5rem;
        }
        .tiers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }
        .tier-card {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          border: 3px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        .tier-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .tier-card.selected {
          border-color: var(--gold);
        }
        .tier-card.popular {
          background: linear-gradient(135deg, var(--navy), var(--navy-light));
          color: white;
        }
        .popular-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--gold);
          color: var(--navy);
          padding: 0.25rem 1rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .tier-card h3 {
          margin: 0 0 0.25rem;
          font-size: 1.5rem;
        }
        .tier-desc {
          opacity: 0.8;
          margin: 0 0 1rem;
          font-size: 0.9rem;
        }
        .tier-price {
          display: flex;
          align-items: baseline;
          margin-bottom: 0.25rem;
        }
        .tier-price .currency {
          font-size: 1.5rem;
        }
        .tier-price .amount {
          font-size: 3rem;
          font-weight: 800;
          line-height: 1;
        }
        .tier-price .period {
          opacity: 0.7;
        }
        .annual-note {
          font-size: 0.8rem;
          opacity: 0.7;
          margin: 0 0 1rem;
        }
        .workers-info {
          background: rgba(245,166,35,0.15);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 600;
          margin: 0 0 0.25rem;
          font-size: 0.9rem;
        }
        .workers-extra {
          font-size: 0.75rem;
          opacity: 0.7;
          margin: 0 0 1rem;
        }
        .features {
          list-style: none;
          padding: 0;
          margin: 0 0 1.5rem;
        }
        .features li {
          padding: 0.3rem 0;
          font-size: 0.9rem;
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }
        .features li.highlight {
          font-weight: 700;
          color: var(--gold);
        }
        .features li.not-included {
          opacity: 0.5;
        }
        .check { color: var(--success); }
        .tier-card.popular .check { color: var(--gold-light); }
        .x { color: #ccc; }
        .select-btn {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid var(--navy);
          background: white;
          color: var(--navy);
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tier-card.popular .select-btn {
          border-color: var(--gold);
          color: var(--gold);
          background: transparent;
        }
        .select-btn.selected, .select-btn:hover {
          background: var(--gold);
          border-color: var(--gold);
          color: var(--navy);
        }
        .standalone-section {
          background: white;
          margin: 2rem -1rem;
          padding: 2rem;
          border-radius: 16px;
        }
        .standalone-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          max-width: 500px;
          margin: 0 auto 1rem;
        }
        .standalone-card {
          border: 2px solid var(--gray-200);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        .standalone-card:hover {
          border-color: var(--gold);
        }
        .standalone-card.selected {
          border-color: var(--gold);
          background: rgba(245,166,35,0.05);
        }
        .standalone-icon {
          font-size: 2rem;
          display: block;
          margin-bottom: 0.5rem;
        }
        .standalone-card h4 {
          margin: 0 0 0.25rem;
          color: var(--navy);
        }
        .standalone-price {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--gold);
          margin: 0 0 0.5rem;
        }
        .standalone-desc {
          font-size: 0.85rem;
          color: var(--gray-600);
          margin: 0;
        }
        .standalone-check {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          font-size: 1.25rem;
          color: var(--gold);
        }
        .upgrade-note {
          text-align: center;
          font-size: 0.85rem;
          color: var(--gray-600);
          margin: 0;
        }
        .addons-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        .addon-card {
          background: white;
          border: 2px solid var(--gray-200);
          border-radius: 12px;
          padding: 1.25rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .addon-card:hover {
          border-color: var(--gold);
        }
        .addon-card.selected {
          border-color: var(--gold);
          background: rgba(245,166,35,0.05);
        }
        .addon-card.highlight {
          border-color: var(--gold);
        }
        .addon-top {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        .addon-icon {
          font-size: 1.5rem;
        }
        .addon-check {
          font-size: 1.25rem;
          color: var(--gold);
        }
        .addon-card h4 {
          margin: 0 0 0.25rem;
          color: var(--navy);
          font-size: 1rem;
        }
        .addon-price {
          color: var(--gold);
          font-weight: 700;
          margin: 0 0 0.25rem;
        }
        .addon-desc {
          font-size: 0.8rem;
          color: var(--gray-600);
          margin: 0;
        }
        .extra-workers {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          max-width: 300px;
          margin: 1.5rem auto 0;
        }
        .extra-workers h4 {
          margin: 0 0 0.25rem;
          color: var(--navy);
        }
        .extra-workers > p {
          font-size: 0.85rem;
          color: var(--gray-600);
          margin: 0 0 1rem;
        }
        .workers-control {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
        }
        .workers-control button {
          width: 40px;
          height: 40px;
          border: 2px solid var(--navy);
          background: white;
          border-radius: 50%;
          font-size: 1.25rem;
          cursor: pointer;
        }
        .workers-control button:disabled {
          opacity: 0.3;
        }
        .workers-count {
          font-size: 2rem;
          font-weight: 700;
          color: var(--navy);
          min-width: 50px;
        }
        .workers-cost {
          margin: 0.5rem 0 0;
          color: var(--gold);
          font-weight: 600;
        }
        .onboarding-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
          max-width: 700px;
          margin: 0 auto;
        }
        .onboarding-card {
          background: white;
          border: 2px solid var(--gray-200);
          border-radius: 12px;
          padding: 1.5rem;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
        }
        .onboarding-card:hover {
          border-color: var(--gold);
        }
        .onboarding-card.selected {
          border-color: var(--gold);
          background: rgba(245,166,35,0.05);
        }
        .onboarding-card.recommended {
          border-color: var(--gold);
        }
        .recommended-badge {
          position: absolute;
          top: -10px;
          left: 1rem;
          background: var(--gold);
          color: var(--navy);
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
        }
        .onboarding-card h4 {
          margin: 0 0 0.25rem;
          color: var(--navy);
        }
        .onboarding-price {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--navy);
          margin: 0 0 0.5rem;
        }
        .onboarding-price span {
          font-size: 0.9rem;
          font-weight: 400;
          opacity: 0.7;
        }
        .onboarding-desc {
          font-size: 0.9rem;
          color: var(--gray-600);
          margin: 0 0 0.75rem;
        }
        .onboarding-features {
          list-style: none;
          padding: 0;
          margin: 0;
          font-size: 0.85rem;
        }
        .onboarding-features li {
          padding: 0.2rem 0;
          color: var(--gray-600);
        }
        .onboarding-check {
          position: absolute;
          top: 1rem;
          right: 1rem;
          font-size: 1.25rem;
          color: var(--gold);
        }
        .summary-section {
          position: sticky;
          bottom: 1rem;
          z-index: 50;
        }
        .summary-card {
          background: var(--navy);
          color: white;
          border-radius: 16px;
          padding: 1.5rem;
          max-width: 400px;
          margin: 0 auto;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        .summary-card h3 {
          margin: 0 0 1rem;
          text-align: center;
        }
        .summary-items {
          margin-bottom: 1rem;
        }
        .summary-line {
          display: flex;
          justify-content: space-between;
          padding: 0.4rem 0;
          font-size: 0.9rem;
          opacity: 0.9;
        }
        .summary-line.main {
          font-weight: 600;
          opacity: 1;
        }
        .summary-divider {
          height: 1px;
          background: rgba(255,255,255,0.2);
          margin: 0.5rem 0;
        }
        .summary-total {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        .total-amount {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--gold);
        }
        .total-amount span {
          font-size: 1rem;
          opacity: 0.8;
        }
        .annual-total {
          text-align: right;
          font-size: 0.8rem;
          opacity: 0.7;
          margin: 0.25rem 0 0;
        }
        .summary-onboarding {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          font-size: 0.85rem;
          border-top: 1px solid rgba(255,255,255,0.1);
          margin-top: 0.5rem;
        }
        .cta-btn {
          width: 100%;
          background: var(--gold);
          color: var(--navy);
          border: none;
          padding: 1rem;
          border-radius: 10px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          margin-top: 1rem;
          transition: all 0.2s;
        }
        .cta-btn:hover {
          background: var(--gold-light);
        }
        .cta-note {
          text-align: center;
          font-size: 0.8rem;
          opacity: 0.7;
          margin: 0.5rem 0 0;
        }
        .dispatch-callout {
          background: linear-gradient(135deg, var(--navy), var(--navy-light));
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 3rem;
        }
        .dispatch-content {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          color: white;
          flex-wrap: wrap;
        }
        .dispatch-icon {
          font-size: 3rem;
        }
        .dispatch-content > div {
          flex: 1;
          min-width: 200px;
        }
        .dispatch-content h3 {
          margin: 0 0 0.25rem;
        }
        .dispatch-content p {
          margin: 0;
          opacity: 0.9;
          font-size: 0.95rem;
        }
        .dispatch-btn {
          background: var(--gold);
          color: var(--navy);
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }
        .jenny-section {
          background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%);
          margin: 2rem -1rem;
          padding: 2rem;
          border-radius: 16px;
        }
        .jenny-banner {
          margin-bottom: 1.5rem;
        }
        .jenny-banner-content {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .jenny-avatar {
          font-size: 4rem;
          background: var(--gold);
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .jenny-info {
          flex: 1;
          min-width: 250px;
        }
        .jenny-info h2 {
          color: white;
          margin: 0 0 0.5rem;
          font-size: 1.5rem;
          text-align: left;
        }
        .jenny-info p {
          color: rgba(255,255,255,0.8);
          margin: 0 0 0.75rem;
          font-size: 0.95rem;
        }
        .jenny-compare {
          display: flex;
          gap: 1.5rem;
          align-items: center;
          flex-wrap: wrap;
        }
        .jenny-price {
          color: var(--gold);
          font-size: 1.1rem;
        }
        .jenny-price strong {
          font-size: 1.4rem;
        }
        .jenny-vs {
          color: rgba(255,255,255,0.5);
          font-size: 0.85rem;
          text-decoration: line-through;
        }
        .jenny-learn-more {
          background: transparent;
          border: 2px solid var(--gold);
          color: var(--gold);
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .jenny-learn-more:hover {
          background: var(--gold);
          color: var(--navy);
        }
        .jenny-tiers {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
          max-width: 700px;
          margin: 0 auto;
        }
        .jenny-tier {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          cursor: pointer;
          position: relative;
          border: 3px solid transparent;
          transition: all 0.2s;
        }
        .jenny-tier:hover {
          transform: translateY(-2px);
        }
        .jenny-tier.selected {
          border-color: var(--gold);
        }
        .jenny-tier.recommended {
          border-color: var(--gold);
        }
        .best-value-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--gold);
          color: var(--navy);
          padding: 0.25rem 1rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .jenny-tier-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .jenny-tier-header h4 {
          margin: 0;
          color: var(--navy);
          font-size: 1.25rem;
        }
        .jenny-tier-price {
          color: var(--gold);
          font-weight: 700;
          font-size: 1.25rem;
        }
        .jenny-tier ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .jenny-tier li {
          padding: 0.3rem 0;
          font-size: 0.9rem;
          color: #444;
        }
        .jenny-tier-check {
          position: absolute;
          top: 1rem;
          right: 1rem;
          font-size: 1.5rem;
          color: var(--gold);
        }
        .jenny-section-label {
          text-align: center;
          margin: 2rem 0 1rem;
        }
        .jenny-section-label.owner-facing {
          margin-top: 2.5rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255,255,255,0.2);
        }
        .section-label-badge {
          background: rgba(255,255,255,0.2);
          color: white;
          padding: 0.4rem 1rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .jenny-tiers.single {
          max-width: 400px;
        }
        .jenny-tier.exec {
          background: linear-gradient(135deg, #f8f8ff, #fff);
        }
        .jenny-tier.included {
          border-color: #2ab09e;
          background: linear-gradient(135deg, #f0fdf9, #fff);
        }
        .jenny-included-label {
          position: absolute;
          top: -11px;
          left: 50%;
          transform: translateX(-50%);
          background: #2ab09e;
          color: white;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.2rem 0.75rem;
          border-radius: 12px;
          white-space: nowrap;
        }
        .jenny-annual-note {
          font-size: 0.75rem;
          color: #888;
          margin: 0.5rem 0 0;
        }
        .faq-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }
        .faq-item {
          background: white;
          padding: 1.25rem;
          border-radius: 12px;
        }
        .faq-item h4 {
          margin: 0 0 0.5rem;
          color: var(--navy);
          font-size: 1rem;
        }
        .faq-item p {
          margin: 0;
          font-size: 0.9rem;
          color: var(--gray-600);
        }
        .footer {
          background: var(--navy);
          color: white;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
        .footer-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .footer p {
          margin: 0;
          opacity: 0.8;
        }
        .footer-badge {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .women-owned {
          color: var(--gold);
          font-size: 0.85rem;
          font-weight: 500;
        }
        .footer-links {
          display: flex;
          gap: 2rem;
        }
        .footer-links a {
          color: rgba(255,255,255,0.7);
          text-decoration: none;
        }
        @media (max-width: 768px) {
          .hero h1 { font-size: 1.75rem; }
          .tier-price .amount { font-size: 2.5rem; }
          .dispatch-content { flex-direction: column; text-align: center; }
          .summary-card { border-radius: 16px 16px 0 0; }
        }
      `}</style>
    </div>
  );
}
