'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Save, Eye, Palette, Layout, FileText, ImageIcon, Type, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getStockPhotos } from '@/lib/stock-photos';
import { contrastRatio } from '@/lib/color-utils';
import SectionToggle from './SectionToggle';
import PhotoSelector from './PhotoSelector';
import SitePreviewFrame from './SitePreviewFrame';

const colorPresets = [
  { name: 'Classic', primary: '#1a1a2e', secondary: '#16213e', accent: '#f5a623', background: '#ffffff' },
  { name: 'Modern', primary: '#374151', secondary: '#4b5563', accent: '#14b8a6', background: '#ffffff' },
  { name: 'Clean', primary: '#1e40af', secondary: '#1e3a8a', accent: '#3b82f6', background: '#ffffff' },
  { name: 'Bold', primary: '#18181b', secondary: '#27272a', accent: '#ef4444', background: '#ffffff' },
  { name: 'Earth', primary: '#365314', secondary: '#3f6212', accent: '#a16207', background: '#fefce8' },
];

const fontOptions = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
  'Poppins', 'Raleway', 'Oswald', 'Playfair Display', 'Merriweather',
  'Nunito', 'Source Sans Pro', 'Nunito Sans', 'Archivo', 'Quicksand',
];

export default function WebsiteEditor({ site, template = {}, onClose, onSaved }) {
  const content = site.site_content || {};
  const layout = template.layout_config || {};

  // Use the same fallback chain as PublicSiteRenderer so the editor preview
  // matches the live site exactly: site_content -> template -> hardcoded defaults.
  const [form, setForm] = useState({
    businessName: site.business_name || '',
    phone: site.business_phone || '',
    email: site.business_email || '',
    tagline: content.tagline || '',
    serviceArea: content.serviceArea || '',
    services: content.services || [],
    licenseNumber: content.licenseNumber || '',
    yearsInBusiness: content.yearsInBusiness || '',
    colors: {
      primary: content.colors?.primary || template.primary_color || '#1a1a2e',
      secondary: content.colors?.secondary || template.secondary_color || '#16213e',
      accent: content.colors?.accent || template.accent_color || '#f5a623',
      background: content.colors?.background || '#ffffff',
      headingColor: content.colors?.headingColor || '',
      bodyColor: content.colors?.bodyColor || '',
    },
    fontHeading: content.fontHeading || template.font_heading || 'Inter',
    fontBody: content.fontBody || template.font_body || 'Inter',
    // Same fallback chain as PublicSiteRenderer: site_content -> template layout -> default
    enabledSections: content.enabledSections || layout.sections || ['hero', 'services', 'gallery', 'about', 'contact'],
    heroImage: content.heroImage || null,
    galleryImages: content.galleryImages || [],
  });

  const [activeTab, setActiveTab] = useState('info');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedSlug, setSavedSlug] = useState(null);
  const [error, setError] = useState(null);
  const [newService, setNewService] = useState('');
  const [photos, setPhotos] = useState({ hero: [], gallery: [] });
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const tradePhotos = getStockPhotos(content.trade);
    setPhotos(tradePhotos);
  }, [content.trade]);

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }, []);

  const updateColors = useCallback((newColors) => {
    setForm((prev) => ({ ...prev, colors: { ...prev.colors, ...newColors } }));
    setSaved(false);
  }, []);

  const addService = () => {
    const trimmed = newService.trim();
    if (trimmed && !form.services.includes(trimmed)) {
      updateField('services', [...form.services, trimmed]);
      setNewService('');
    }
  };

  const removeService = (service) => {
    updateField('services', form.services.filter((s) => s !== service));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError('Your session has expired. Please log in again.');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/website-builder/update-site/', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          siteId: site.id,
          _authToken: token,
          businessName: form.businessName,
          phone: form.phone,
          email: form.email,
          tagline: form.tagline,
          serviceArea: form.serviceArea,
          services: form.services,
          licenseNumber: form.licenseNumber,
          yearsInBusiness: form.yearsInBusiness,
          colors: form.colors,
          fontHeading: form.fontHeading,
          fontBody: form.fontBody,
          enabledSections: form.enabledSections,
          heroImage: form.heroImage,
          galleryImages: form.galleryImages,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save changes');
      }

      setSaved(true);
      setSavedSlug(data.slug || null);
      if (onSaved) onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'info', label: 'Business Info', icon: FileText },
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'fonts', label: 'Fonts', icon: Type },
    { id: 'sections', label: 'Sections', icon: Layout },
    { id: 'photos', label: 'Photos', icon: ImageIcon },
  ];

  const defaultContent = template.default_content || {};

  // Build a wizardData-shaped object for SitePreviewFrame
  const previewData = {
    businessName: form.businessName,
    tagline: form.tagline,
    phone: form.phone,
    email: form.email,
    services: form.services,
    colors: form.colors,
    fontHeading: form.fontHeading,
    fontBody: form.fontBody,
    enabledSections: form.enabledSections,
    heroImage: form.heroImage,
    galleryImages: form.galleryImages,
    trade: content.trade || '',
    serviceArea: form.serviceArea,
    licenseNumber: form.licenseNumber,
    yearsInBusiness: form.yearsInBusiness,
    ctaText: defaultContent.ctaText || 'Get a Free Estimate',
    emergencyText: defaultContent.emergencyText || '',
    stormText: defaultContent.stormText || '',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex">
      <div className="bg-white w-full max-w-5xl mx-auto my-4 rounded-xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-navy-500">Edit Your Website</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="btn-ghost flex items-center gap-2 text-sm lg:hidden"
            >
              <Eye size={16} />
              {showPreview ? 'Edit' : 'Preview'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              {saving ? <RefreshCw size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Error/success banner */}
        {error && (
          <div className="px-6 py-2 bg-red-50 border-b border-red-200 text-sm text-red-700">{error}</div>
        )}
        {saved && !error && (
          <div className="px-6 py-2 bg-green-50 border-b border-green-200 text-sm text-green-700 flex items-center justify-between">
            <span>Changes saved! Your site is updated live.</span>
            {savedSlug && (
              <a
                href={`/site/${savedSlug}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline hover:text-green-900"
              >
                View Live Site &rarr;
              </a>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor panel */}
          <div className={`flex-1 flex flex-col overflow-hidden ${showPreview ? 'hidden lg:flex' : ''}`}>
            {/* Tab nav */}
            <div className="flex gap-1 mx-6 mt-4 mb-4 bg-gray-100 rounded-lg p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-white text-navy-500 shadow-sm'
                        : 'text-gray-500 hover:text-navy-500'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {/* Business Info tab */}
              {activeTab === 'info' && (
                <div className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-sm font-medium text-navy-500 mb-1">Business Name</label>
                    <input
                      type="text"
                      value={form.businessName}
                      onChange={(e) => updateField('businessName', e.target.value)}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-500 mb-1">Tagline</label>
                    <input
                      type="text"
                      value={form.tagline}
                      onChange={(e) => updateField('tagline', e.target.value)}
                      placeholder="Professional service you can trust"
                      className="input w-full"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-navy-500 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy-500 mb-1">Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        className="input w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-500 mb-1">Service Area</label>
                    <input
                      type="text"
                      value={form.serviceArea}
                      onChange={(e) => updateField('serviceArea', e.target.value)}
                      placeholder="e.g. Greater Houston Area"
                      className="input w-full"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-navy-500 mb-1">License #</label>
                      <input
                        type="text"
                        value={form.licenseNumber}
                        onChange={(e) => updateField('licenseNumber', e.target.value)}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy-500 mb-1">Years in Business</label>
                      <input
                        type="text"
                        value={form.yearsInBusiness}
                        onChange={(e) => updateField('yearsInBusiness', e.target.value)}
                        className="input w-full"
                      />
                    </div>
                  </div>

                  {/* Services */}
                  <div>
                    <label className="block text-sm font-medium text-navy-500 mb-2">Services</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {form.services.map((service) => (
                        <span
                          key={service}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-gold-50 border border-gold-200 rounded-full text-sm text-navy-500"
                        >
                          {service}
                          <button
                            onClick={() => removeService(service)}
                            className="text-gray-400 hover:text-red-500 ml-1"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newService}
                        onChange={(e) => setNewService(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
                        placeholder="Add a service..."
                        className="input flex-1"
                      />
                      <button onClick={addService} className="btn-ghost px-4 text-sm">Add</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Colors tab */}
              {activeTab === 'colors' && (
                <div className="space-y-6 max-w-lg">
                  <div>
                    <p className="text-sm font-medium text-navy-500 mb-3">Quick Presets</p>
                    <div className="grid grid-cols-5 gap-2">
                      {colorPresets.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => { updateColors({ primary: preset.primary, secondary: preset.secondary, accent: preset.accent, background: preset.background, headingColor: '', bodyColor: '' }); }}
                          className="flex flex-col items-center gap-1.5 p-2 rounded-lg border border-gray-200 hover:border-gold-300 transition-colors"
                        >
                          <div className="flex gap-0.5">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.primary }} />
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.accent }} />
                          </div>
                          <span className="text-[10px] text-gray-500">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-navy-500">Site Colors</p>
                    {[
                      { key: 'primary', label: 'Primary Color', desc: 'Nav, headings, footer' },
                      { key: 'secondary', label: 'Secondary Color', desc: 'Hero gradient end' },
                      { key: 'accent', label: 'Accent Color', desc: 'Buttons, links, highlights' },
                      { key: 'background', label: 'Background Color', desc: 'Page background' },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center gap-3">
                        <input
                          type="color"
                          value={form.colors[key] || '#333333'}
                          onChange={(e) => updateColors({ [key]: e.target.value })}
                          className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                        />
                        <div>
                          <p className="text-sm text-navy-500">{label}</p>
                          <p className="text-xs text-gray-400">{desc} &middot; {form.colors[key] || 'default'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-navy-500">Font Colors</p>
                    {(form.colors.headingColor && contrastRatio(form.colors.headingColor, form.colors.background || '#ffffff') < 3) ||
                     (form.colors.bodyColor && contrastRatio(form.colors.bodyColor, form.colors.background || '#ffffff') < 3) ? (
                      <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                        <span>Font color is too close to your background — text may be hard to read. We&apos;ll auto-correct it on your live site, but consider picking a darker color or hitting Reset.</span>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={form.colors.headingColor || form.colors.primary || '#1a1a2e'}
                        onChange={(e) => updateColors({ headingColor: e.target.value })}
                        className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                      />
                      <div>
                        <p className="text-sm text-navy-500">Heading Color</p>
                        <p className="text-xs text-gray-400">Section titles &middot; {form.colors.headingColor || 'uses primary'}</p>
                      </div>
                      {form.colors.headingColor && (
                        <button onClick={() => updateColors({ headingColor: '' })} className="text-xs text-gray-400 hover:text-red-500">Reset</button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={form.colors.bodyColor || '#333333'}
                        onChange={(e) => updateColors({ bodyColor: e.target.value })}
                        className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                      />
                      <div>
                        <p className="text-sm text-navy-500">Body Text Color</p>
                        <p className="text-xs text-gray-400">Paragraphs, cards &middot; {form.colors.bodyColor || '#333333'}</p>
                      </div>
                      {form.colors.bodyColor && (
                        <button onClick={() => updateColors({ bodyColor: '' })} className="text-xs text-gray-400 hover:text-red-500">Reset</button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Fonts tab */}
              {activeTab === 'fonts' && (
                <div className="space-y-6 max-w-lg">
                  {/* Load selected Google Fonts so previews render correctly */}
                  {/* eslint-disable-next-line @next/next/no-page-custom-font */}
                  <link
                    rel="stylesheet"
                    href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(form.fontHeading || 'Inter')}:wght@400;700;800&family=${encodeURIComponent(form.fontBody || 'Inter')}:wght@400;500;600&display=swap`}
                  />
                  <div>
                    <p className="text-sm font-medium text-navy-500 mb-2">Heading Font</p>
                    <select
                      value={form.fontHeading || 'Inter'}
                      onChange={(e) => updateField('fontHeading', e.target.value)}
                      className="input w-full"
                    >
                      {fontOptions.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <p className="mt-2 text-lg font-bold" style={{ fontFamily: `'${form.fontHeading || 'Inter'}', sans-serif`, color: form.colors.headingColor || form.colors.primary || '#1a1a2e' }}>
                      The quick brown fox jumps over the lazy dog
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-navy-500 mb-2">Body Font</p>
                    <select
                      value={form.fontBody || 'Inter'}
                      onChange={(e) => updateField('fontBody', e.target.value)}
                      className="input w-full"
                    >
                      {fontOptions.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <p className="mt-2 text-sm" style={{ fontFamily: `'${form.fontBody || 'Inter'}', sans-serif`, color: form.colors.bodyColor || '#333333' }}>
                      The quick brown fox jumps over the lazy dog. This is how your body text will look on your website.
                    </p>
                  </div>

                  {/* Font colors */}
                  <div className="space-y-3 pt-2 border-t border-gray-200">
                    <p className="text-sm font-medium text-navy-500">Font Colors</p>
                    {(form.colors.headingColor && contrastRatio(form.colors.headingColor, form.colors.background || '#ffffff') < 3) ||
                     (form.colors.bodyColor && contrastRatio(form.colors.bodyColor, form.colors.background || '#ffffff') < 3) ? (
                      <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                        <span>Font color is too close to your background — text may be hard to read. We&apos;ll auto-correct it on your live site, but consider picking a darker color or hitting Reset.</span>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={form.colors.headingColor || form.colors.primary || '#1a1a2e'}
                        onChange={(e) => updateColors({ headingColor: e.target.value })}
                        className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                      />
                      <div>
                        <p className="text-sm text-navy-500">Heading Color</p>
                        <p className="text-xs text-gray-400">Section titles &middot; {form.colors.headingColor || 'uses primary'}</p>
                      </div>
                      {form.colors.headingColor && (
                        <button onClick={() => updateColors({ headingColor: '' })} className="text-xs text-gray-400 hover:text-red-500">Reset</button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={form.colors.bodyColor || '#333333'}
                        onChange={(e) => updateColors({ bodyColor: e.target.value })}
                        className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                      />
                      <div>
                        <p className="text-sm text-navy-500">Body Text Color</p>
                        <p className="text-xs text-gray-400">Paragraphs, cards &middot; {form.colors.bodyColor || '#333333'}</p>
                      </div>
                      {form.colors.bodyColor && (
                        <button onClick={() => updateColors({ bodyColor: '' })} className="text-xs text-gray-400 hover:text-red-500">Reset</button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sections tab */}
              {activeTab === 'sections' && (
                <div className="max-w-lg">
                  <SectionToggle
                    enabledSections={form.enabledSections}
                    onChange={(sections) => updateField('enabledSections', sections)}
                  />
                </div>
              )}

              {/* Photos tab */}
              {activeTab === 'photos' && (
                <div className="space-y-6 max-w-lg">
                  <PhotoSelector
                    label="Hero Image"
                    photos={photos.hero || []}
                    selectedPhoto={form.heroImage}
                    onSelect={(photo) => updateField('heroImage', photo)}
                  />
                  {form.enabledSections.includes('gallery') && (
                    <PhotoSelector
                      label="Gallery Photos (pick 4-8)"
                      photos={photos.gallery || []}
                      multiple
                      selectedPhotos={form.galleryImages}
                      onSelectMultiple={(p) => updateField('galleryImages', p)}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Live preview panel */}
          <div className={`w-[420px] border-l border-gray-200 flex-shrink-0 p-4 overflow-y-auto bg-gray-50 ${showPreview ? '' : 'hidden lg:block'}`}>
            <p className="text-sm font-medium text-navy-500 mb-3">Live Preview</p>
            <SitePreviewFrame wizardData={previewData} />
          </div>
        </div>
      </div>
    </div>
  );
}
