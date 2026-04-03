'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  function switchLocale(newLocale: string) {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    router.refresh();
  }

  return (
    <div className="flex items-center border border-gray-200 rounded-lg">
      <button
        onClick={() => switchLocale('en')}
        className={`min-w-[40px] px-3 py-2 text-sm font-medium transition-colors rounded-l-lg ${
          locale === 'en' ? 'bg-[#1a1a2e] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
      >
        US
      </button>
      <button
        onClick={() => switchLocale('es')}
        className={`min-w-[40px] px-3 py-2 text-sm font-medium transition-colors rounded-r-lg border-l border-gray-200 ${
          locale === 'es' ? 'bg-[#1a1a2e] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
      >
        ES
      </button>
    </div>
  );
}
