'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const chatMessagesEn = [
  { sender: 'customer', text: 'Hi, do you do pool cleaning?' },
  { sender: 'bot', text: 'Yes! We offer weekly pool maintenance starting at $120/month. Would you like a free quote?' },
  { sender: 'customer', text: 'Sure, that sounds good' },
  { sender: 'bot', text: "Great! What's your name and the best number to reach you?" },
  { sender: 'customer', text: 'Mike, 555-123-4567' },
  { sender: 'bot', text: 'Thanks Mike! One of our pool specialists will call you within 2 hours to schedule your free estimate. Anything else I can help with?' },
];

const chatMessagesEs = [
  { sender: 'customer', text: 'Hola, hacen limpieza de piscinas?' },
  { sender: 'bot', text: 'Si! Ofrecemos mantenimiento semanal de piscinas desde $120/mes. Le gustaria una cotizacion gratis?' },
  { sender: 'customer', text: 'Claro, me parece bien' },
  { sender: 'bot', text: 'Excelente! Cual es su nombre y el mejor numero para contactarlo?' },
  { sender: 'customer', text: 'Miguel, 555-123-4567' },
  { sender: 'bot', text: 'Gracias Miguel! Uno de nuestros especialistas en piscinas le llamara en las proximas 2 horas para agendar su estimado gratis. Hay algo mas en que pueda ayudarle?' },
];

export default function ChatbotDemoPage() {
  const t = useTranslations('demo.chatbot');
  const locale = useLocale();
  const chatMessages = locale === 'es' ? chatMessagesEs : chatMessagesEn;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2d2d4a] text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="text-white/70 hover:text-white text-sm">
              ← {t('backToHome')}
            </Link>
            <LanguageSwitcher />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">🤖</span>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
          </div>
          <p className="text-white/80">{t('subtitle')}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Main Content - Split Layout */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* LEFT SIDE - Feature List */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-[#1a1a2e] mb-2">{t('neverMiss')}</h2>
              <p className="text-gray-600">{t('neverMissDesc')}</p>
            </div>

            <div className="space-y-4">
              {[t('feature1'), t('feature2'), t('feature3'), t('feature4'), t('feature5'), t('feature6'), t('feature7')].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-lg">{feature}</span>
                </div>
              ))}
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
              <div className="text-center">
                <div className="text-3xl font-bold text-[#f5a623]">24/7</div>
                <div className="text-sm text-gray-500">{t('alwaysOnline')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#f5a623]">3sec</div>
                <div className="text-sm text-gray-500">{t('responseTime')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#f5a623]">40%</div>
                <div className="text-sm text-gray-500">{t('moreLeads')}</div>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-4">
              <Link
                href="/pricing"
                className="inline-block px-8 py-4 bg-[#f5a623] hover:bg-[#e09000] text-[#1a1a2e] font-bold rounded-lg transition-colors text-lg"
              >
                {t('getCTA')} →
              </Link>
              <p className="text-sm text-gray-500 mt-3">{t('includedFree')}</p>
            </div>
          </div>

          {/* RIGHT SIDE - Phone Mockup */}
          <div className="flex flex-col items-center">
            {/* Phone Frame */}
            <div className="relative w-[320px] bg-[#1a1a2e] rounded-[3rem] p-3 shadow-2xl">
              {/* Phone Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-[#1a1a2e] rounded-b-2xl z-10"></div>

              {/* Phone Screen */}
              <div className="bg-gray-100 rounded-[2.25rem] overflow-hidden">
                {/* Chat Header */}
                <div className="bg-[#1a1a2e] text-white px-4 py-4 pt-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#f5a623] flex items-center justify-center">
                      <span className="text-lg">🤖</span>
                    </div>
                    <div>
                      <div className="font-semibold">Pool Pro AI</div>
                      <div className="text-xs text-green-400 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        {t('onlineNow')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="h-[400px] overflow-y-auto p-4 space-y-3 bg-white">
                  {chatMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                          message.sender === 'customer'
                            ? 'bg-[#1a1a2e] text-white rounded-br-md'
                            : 'bg-gray-200 text-gray-800 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat Input */}
                <div className="bg-white border-t border-gray-200 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={t('typeMessage')}
                      className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none"
                      disabled
                    />
                    <button className="w-10 h-10 bg-[#f5a623] rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#1a1a2e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* New Lead Alert - Below Phone */}
            <div className="mt-8 w-full max-w-[380px]">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Alert Header */}
                <div className="bg-gradient-to-r from-[#f5a623] to-[#ffc107] px-4 py-2 flex items-center gap-2">
                  <span className="text-xl">🔔</span>
                  <span className="font-bold text-[#1a1a2e]">{t('newLeadCaptured')}</span>
                </div>

                {/* Alert Content */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#1a1a2e] flex items-center justify-center">
                        <span className="text-white font-bold text-lg">M</span>
                      </div>
                      <div>
                        <div className="font-semibold text-[#1a1a2e]">{locale === 'es' ? 'Miguel' : 'Mike'}</div>
                        <div className="text-sm text-gray-500">555-123-4567</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-[#1a1a2e]">{t('poolCleaning')}</div>
                      <div className="text-xs text-gray-400">{t('minAgo')}</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {t('callNow')}
                    </button>
                    <button className="flex-1 py-2 bg-[#1a1a2e] hover:bg-[#2d2d4a] text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {t('sendQuote')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA Section */}
        <div className="mt-16 bg-gradient-to-r from-[#1a1a2e] to-[#2d2d4a] rounded-2xl p-8 md:p-12 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">{t('readyCapture')}</h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">{t('readyCaptureDesc')}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-[#f5a623] hover:bg-[#e09000] text-[#1a1a2e] font-bold rounded-lg transition-colors"
            >
              {t('startFreeTrial')}
            </Link>
            <Link
              href="/#get-started"
              className="px-8 py-4 border-2 border-white text-white hover:bg-white/10 font-semibold rounded-lg transition-colors"
            >
              {t('scheduleDemoCall')}
            </Link>
          </div>
          <p className="text-white/60 text-sm mt-6">{t('noCreditCard')}</p>
        </div>
      </div>
    </div>
  );
}
