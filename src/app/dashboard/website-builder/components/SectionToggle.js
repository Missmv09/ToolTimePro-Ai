'use client';

const sectionInfo = {
  hero: { label: 'Hero Banner', description: 'Large banner at the top with your business name and call-to-action' },
  services: { label: 'Services', description: 'List of services you offer' },
  gallery: { label: 'Photo Gallery', description: 'Showcase your best work with photos' },
  reviews: { label: 'Customer Reviews', description: 'Build trust with customer testimonials' },
  about: { label: 'About Us', description: 'Tell customers about your experience and values' },
  contact: { label: 'Contact Form', description: 'Let customers reach out — leads go straight to your CRM' },
};

export default function SectionToggle({ enabledSections, onChange, pageLimit }) {
  const allSections = ['hero', 'services', 'gallery', 'reviews', 'about', 'contact'];
  const atLimit = pageLimit && enabledSections.length >= pageLimit;

  const toggleSection = (sectionId) => {
    if (enabledSections.includes(sectionId)) {
      onChange(enabledSections.filter((s) => s !== sectionId));
    } else {
      // Enforce page/section limit
      if (atLimit) return;
      onChange([...enabledSections, sectionId]);
    }
  };

  return (
    <div className="space-y-2">
      {pageLimit && (
        <p className="text-xs text-gray-500 mb-1">
          {enabledSections.length} / {pageLimit} sections used
          {atLimit && (
            <span className="text-amber-600 ml-1">
              — Upgrade your plan or add Extra Pages for more
            </span>
          )}
        </p>
      )}
      {allSections.map((sectionId) => {
        const info = sectionInfo[sectionId];
        const isEnabled = enabledSections.includes(sectionId);
        const isLocked = !isEnabled && atLimit;

        return (
          <div
            key={sectionId}
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
              isEnabled ? 'border-gold-200 bg-gold-50/50' : isLocked ? 'border-gray-100 bg-gray-100 opacity-60' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium ${isEnabled ? 'text-navy-500' : 'text-gray-400'}`}>
                  {info.label}
                </p>
                {isLocked && (
                  <span className="text-xs text-amber-600 font-medium">Upgrade</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{info.description}</p>
            </div>

            <button
              onClick={() => toggleSection(sectionId)}
              disabled={isLocked}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                isEnabled
                  ? 'bg-gold-500 cursor-pointer'
                  : isLocked
                  ? 'bg-gray-200 cursor-not-allowed'
                  : 'bg-gray-300 cursor-pointer'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  isEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
