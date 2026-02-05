'use client';

import { useState, useEffect } from 'react';
import { Palette, Layout, ImageIcon } from 'lucide-react';
import { getStockPhotos } from '@/lib/stock-photos';
import SectionToggle from './SectionToggle';
import PhotoSelector from './PhotoSelector';
import SitePreviewFrame from './SitePreviewFrame';

const colorPresets = [
  { name: 'Classic', primary: '#1a1a2e', accent: '#f5a623', background: '#ffffff' },
  { name: 'Modern', primary: '#374151', accent: '#14b8a6', background: '#ffffff' },
  { name: 'Clean', primary: '#1e40af', accent: '#3b82f6', background: '#ffffff' },
  { name: 'Bold', primary: '#18181b', accent: '#ef4444', background: '#ffffff' },
  { name: 'Earth', primary: '#365314', accent: '#a16207', background: '#fefce8' },
];

export default function Step5Customize({ wizardData, setWizardData }) {
  const [activeTab, setActiveTab] = useState('colors');
  const [photos, setPhotos] = useState({ hero: [], gallery: [] });

  useEffect(() => {
    const tradePhotos = getStockPhotos(wizardData.trade);
    setPhotos(tradePhotos);
  }, [wizardData.trade]);

  const updateColors = (newColors) => {
    setWizardData((prev) => ({
      ...prev,
      colors: { ...prev.colors, ...newColors },
    }));
  };

  const applyPreset = (preset) => {
    updateColors({
      primary: preset.primary,
      accent: preset.accent,
      background: preset.background,
    });
  };

  const tabs = [
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'sections', label: 'Sections', icon: Layout },
    { id: 'photos', label: 'Photos', icon: ImageIcon },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-navy-500 mb-2">Customize your site</h2>
      <p className="text-gray-500 mb-6">Make it yours — all defaults look great, so change only what you want.</p>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Controls panel */}
        <div className="flex-1 min-w-0 lg:max-w-md">
          {/* Tab nav */}
          <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
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
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Colors tab */}
          {activeTab === 'colors' && (
            <div className="space-y-6">
              {/* Presets */}
              <div>
                <p className="text-sm font-medium text-navy-500 mb-3">Quick Presets</p>
                <div className="grid grid-cols-5 gap-2">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
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

              {/* Custom colors */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-navy-500">Custom Colors</p>

                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={wizardData.colors.primary}
                    onChange={(e) => updateColors({ primary: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                  />
                  <div>
                    <p className="text-sm text-navy-500">Primary Color</p>
                    <p className="text-xs text-gray-400">{wizardData.colors.primary}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={wizardData.colors.accent}
                    onChange={(e) => updateColors({ accent: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                  />
                  <div>
                    <p className="text-sm text-navy-500">Accent Color</p>
                    <p className="text-xs text-gray-400">{wizardData.colors.accent}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={wizardData.colors.background}
                    onChange={(e) => updateColors({ background: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                  />
                  <div>
                    <p className="text-sm text-navy-500">Background Color</p>
                    <p className="text-xs text-gray-400">{wizardData.colors.background}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sections tab */}
          {activeTab === 'sections' && (
            <SectionToggle
              enabledSections={wizardData.enabledSections}
              onChange={(sections) => setWizardData((prev) => ({ ...prev, enabledSections: sections }))}
            />
          )}

          {/* Photos tab */}
          {activeTab === 'photos' && (
            <div className="space-y-6">
              {/* Hero image */}
              <PhotoSelector
                label="Hero Image"
                photos={photos.hero || []}
                selectedPhoto={wizardData.heroImage}
                onSelect={(photo) => setWizardData((prev) => ({ ...prev, heroImage: photo }))}
              />

              {/* Gallery images */}
              {wizardData.enabledSections.includes('gallery') && (
                <PhotoSelector
                  label="Gallery Photos (pick 4-8)"
                  photos={photos.gallery || []}
                  multiple
                  selectedPhotos={wizardData.galleryImages}
                  onSelectMultiple={(photos) => setWizardData((prev) => ({ ...prev, galleryImages: photos }))}
                />
              )}
            </div>
          )}
        </div>

        {/* Live preview panel */}
        <div className="flex-1 min-w-0 hidden lg:block sticky top-4">
          <p className="text-sm font-medium text-navy-500 mb-3">Live Preview</p>
          <SitePreviewFrame wizardData={wizardData} />
        </div>
      </div>

      {/* Mobile preview toggle */}
      <div className="lg:hidden mt-6">
        <details className="card">
          <summary className="font-medium text-navy-500 cursor-pointer">Show Preview</summary>
          <div className="mt-4">
            <SitePreviewFrame wizardData={wizardData} />
          </div>
        </details>
      </div>
    </div>
  );
}
