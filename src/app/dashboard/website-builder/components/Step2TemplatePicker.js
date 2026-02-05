'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Eye, Check } from 'lucide-react';
import TemplatePreview from './TemplatePreview';

export default function Step2TemplatePicker({ wizardData, setWizardData }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, [wizardData.trade]);

  const fetchTemplates = async () => {
    setLoading(true);
    const tradeFilter = [wizardData.trade, 'general'].filter(Boolean);

    const { data, error } = await supabase
      .from('website_templates')
      .select('*')
      .in('trade_category', tradeFilter)
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Error fetching templates:', error);
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  const handleSelect = (template) => {
    setWizardData((prev) => ({
      ...prev,
      templateId: template.id,
      colors: {
        primary: template.primary_color || '#1a1a2e',
        accent: template.accent_color || '#f5a623',
        background: '#ffffff',
      },
    }));
  };

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-navy-500 mb-2">Choose a template</h2>
        <p className="text-gray-500 mb-8">Pick a starting point — you can customize everything later.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border-2 border-gray-200 overflow-hidden">
              <div className="h-48 bg-gray-200 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-5 w-32 bg-gray-200 animate-pulse rounded" />
                <div className="h-4 w-48 bg-gray-100 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-navy-500 mb-2">Choose a template</h2>
      <p className="text-gray-500 mb-8">Pick a starting point — you can customize everything later.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => {
          const isSelected = wizardData.templateId === template.id;

          return (
            <div
              key={template.id}
              className={`relative rounded-xl border-2 overflow-hidden transition-all duration-200 hover-lift cursor-pointer ${
                isSelected
                  ? 'border-gold-500 shadow-card-hover'
                  : 'border-gray-200 hover:border-gold-300 hover:shadow-card'
              }`}
              onClick={() => handleSelect(template)}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 z-10 w-7 h-7 bg-gold-500 rounded-full flex items-center justify-center shadow-md">
                  <Check size={16} className="text-navy-500" />
                </div>
              )}

              {/* Template preview area */}
              <div
                className="h-48 relative"
                style={{
                  background: `linear-gradient(135deg, ${template.primary_color || '#1a1a2e'} 0%, ${template.secondary_color || '#333357'} 100%)`,
                }}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
                  <p className="font-bold text-lg">{template.name}</p>
                  <p className="text-sm opacity-80 capitalize">{template.style} style</p>
                </div>

                {/* Preview button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewTemplate(template);
                  }}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white/90 text-navy-500 rounded-lg text-xs font-medium hover:bg-white transition-colors"
                >
                  <Eye size={14} />
                  Preview
                </button>
              </div>

              {/* Template info */}
              <div className="p-4 bg-white">
                <h3 className="font-semibold text-navy-500">{template.name}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {template.description || `A ${template.style} template for ${template.trade_category} businesses.`}
                </p>

                {/* Color dots */}
                <div className="flex gap-2 mt-3">
                  <div
                    className="w-5 h-5 rounded-full border border-gray-200"
                    style={{ backgroundColor: template.primary_color }}
                    title="Primary"
                  />
                  <div
                    className="w-5 h-5 rounded-full border border-gray-200"
                    style={{ backgroundColor: template.secondary_color }}
                    title="Secondary"
                  />
                  <div
                    className="w-5 h-5 rounded-full border border-gray-200"
                    style={{ backgroundColor: template.accent_color }}
                    title="Accent"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {templates.length <= 2 && (
        <div className="mt-6 p-4 bg-gold-50 rounded-lg border border-gold-200 text-center">
          <p className="text-sm text-navy-500">
            More templates for your trade are coming soon! Pick one above to get started.
          </p>
        </div>
      )}

      {/* Template Preview Modal */}
      {previewTemplate && (
        <TemplatePreview
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onSelect={() => {
            handleSelect(previewTemplate);
            setPreviewTemplate(null);
          }}
        />
      )}
    </div>
  );
}
