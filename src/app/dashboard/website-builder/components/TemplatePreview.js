'use client';

import { X } from 'lucide-react';

export default function TemplatePreview({ template, onClose, onSelect }) {
  if (!template) return null;

  const content = template.default_content || {};
  const layout = template.layout_config || {};
  const sections = layout.sections || ['hero', 'services', 'contact'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="font-bold text-navy-500 text-lg">{template.name}</h3>
            <p className="text-sm text-gray-500">{template.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-navy-500 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Hero Section */}
          <div
            className="relative px-8 py-16 text-white text-center"
            style={{
              background: `linear-gradient(135deg, ${template.primary_color} 0%, ${template.secondary_color} 100%)`,
            }}
          >
            <h1 className="text-3xl font-bold mb-3">{content.heroTitle || 'Your Business Name'}</h1>
            <p className="text-lg opacity-90 mb-6">{content.heroSubtitle || 'Your tagline goes here'}</p>
            <button
              className="px-6 py-3 rounded-lg font-semibold text-sm"
              style={{ backgroundColor: template.accent_color, color: template.primary_color }}
            >
              {content.ctaText || 'Get a Free Estimate'}
            </button>
          </div>

          {/* Services Section */}
          {sections.includes('services') && content.services && (
            <div className="px-8 py-12 bg-white">
              <h2 className="text-2xl font-bold text-center mb-8" style={{ color: template.primary_color }}>
                Our Services
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {content.services.map((service, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg border border-gray-200 text-center text-sm font-medium text-gray-700"
                  >
                    {service}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Section */}
          <div className="px-8 py-12 bg-gray-50">
            <h2 className="text-2xl font-bold text-center mb-6" style={{ color: template.primary_color }}>
              Contact Us
            </h2>
            <div className="max-w-md mx-auto space-y-4">
              <div className="h-10 bg-white rounded-lg border border-gray-300" />
              <div className="h-10 bg-white rounded-lg border border-gray-300" />
              <div className="h-24 bg-white rounded-lg border border-gray-300" />
              <div
                className="h-10 rounded-lg"
                style={{ backgroundColor: template.accent_color }}
              />
            </div>
          </div>

          {/* Template info */}
          <div className="px-8 py-6 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: template.primary_color }} />
                <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: template.secondary_color }} />
                <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: template.accent_color }} />
              </div>
              <span className="text-sm text-gray-500">
                Fonts: {template.font_heading} / {template.font_body}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-white">
          <button
            onClick={onClose}
            className="btn-ghost px-4 py-2"
          >
            Back
          </button>
          <button
            onClick={onSelect}
            className="btn-secondary px-6 py-2"
          >
            Use This Template
          </button>
        </div>
      </div>
    </div>
  );
}
