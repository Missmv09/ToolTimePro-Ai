'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, CheckSquare, Square, CheckCircle, AlertTriangle, Download, Printer } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const checklistCategories = [
  { key: 'category1', items: ['class1', 'class2', 'class3', 'class4'] },
  { key: 'category2', items: ['doc1', 'doc2', 'doc3', 'doc4'] },
  { key: 'category3', items: ['pay1', 'pay2', 'pay3', 'pay4'] },
  { key: 'category4', items: ['ongoing1', 'ongoing2', 'ongoing3', 'ongoing4'] },
];

export default function ChecklistPage() {
  const t = useTranslations('tools.checklist');
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const toggleItem = (item: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(item)) {
      newChecked.delete(item);
    } else {
      newChecked.add(item);
    }
    setCheckedItems(newChecked);
  };

  const totalItems = 16;
  const completedItems = checkedItems.size;
  const progressPercent = Math.round((completedItems / totalItems) * 100);

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 print:hidden">
        <div className="max-w-[900px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/">
                <Image
                  src="/logo-01262026.png"
                  alt="ToolTime Pro"
                  width={140}
                  height={32}
                  className="h-8 w-auto"
                />
              </Link>
              <Link href="/tools" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">{t('backToTools')}</span>
              </Link>
            </div>

            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-6 py-8 space-y-6">
        {/* Title */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-xl">
              <CheckSquare className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
              <p className="text-gray-500">{t('subtitle')}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Printer className="w-4 h-4" />
              {t('print')}
            </button>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">{t('progress')}</h3>
            <span className="text-sm text-gray-500">
              {completedItems}/{totalItems} {t('completed')}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                progressPercent === 100 ? 'bg-green-500' : 'bg-[#f5a623]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-center mt-2 font-bold text-lg">
            {progressPercent}%
          </p>
        </div>

        {/* Warning Card */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-800">{t('warning')}</h4>
              <p className="text-sm text-yellow-700 mt-1">{t('warningText')}</p>
            </div>
          </div>
        </div>

        {/* Checklist Categories */}
        {checklistCategories.map((category, categoryIndex) => (
          <div key={category.key} className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#1a1a2e] text-white rounded-full flex items-center justify-center text-sm">
                {categoryIndex + 1}
              </span>
              {t(category.key)}
            </h3>
            <div className="space-y-3">
              {category.items.map((itemKey) => {
                const isChecked = checkedItems.has(itemKey);
                return (
                  <button
                    key={itemKey}
                    onClick={() => toggleItem(itemKey)}
                    className={`w-full flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                      isChecked
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {isChecked ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={`text-sm ${isChecked ? 'text-green-800' : 'text-gray-700'}`}>
                      {t(`items.${itemKey}`)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Disclaimer */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">{t('disclaimer')}</p>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2d2d44] rounded-xl p-8 text-center text-white print:hidden">
          <h3 className="text-xl font-bold mb-2">{t('getProtection')}</h3>
          <p className="text-gray-300 mb-6">{t('ctaText')}</p>
          <Link
            href="/auth/signup"
            className="inline-block bg-[#f5a623] text-[#1a1a2e] px-8 py-3 rounded-lg font-bold hover:bg-[#e6991a] transition-colors"
          >
            {t('startTrial')}
          </Link>
        </div>
      </div>
    </main>
  );
}
