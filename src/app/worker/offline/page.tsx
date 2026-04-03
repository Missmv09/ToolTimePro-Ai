'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function OfflinePage() {
  const t = useTranslations('worker.offline');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-10 h-10 text-yellow-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('title')}</h1>
        <p className="text-gray-500 mb-6">
          {t('description')}
        </p>
        <div className="bg-white rounded-xl p-4 mb-6 text-left shadow-sm">
          <h3 className="font-medium text-gray-700 mb-2">{t('whatWorks')}</h3>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              {t('clockInOut')}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              {t('startEndBreaks')}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              {t('viewCachedJobs')}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              {t('takePhotos')}
            </li>
          </ul>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-6 py-3 bg-navy-500 text-white rounded-xl font-medium hover:bg-navy-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {t('tryAgain')}
        </button>
      </div>
    </div>
  );
}
