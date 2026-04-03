'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, GitBranch, CheckCircle, XCircle, AlertTriangle, RotateCcw, ArrowRight } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';

type Answer = 'yes' | 'no' | null;

export default function ClassificationPage() {
  const t = useTranslations('tools.classification');
  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([null, null, null]);

  const questions = [
    { condition: t('conditionA'), question: t('conditionAQuestion'), help: t('conditionAHelp') },
    { condition: t('conditionB'), question: t('conditionBQuestion'), help: t('conditionBHelp') },
    { condition: t('conditionC'), question: t('conditionCQuestion'), help: t('conditionCHelp') },
  ];

  const handleAnswer = (answer: Answer) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answer;
    setAnswers(newAnswers);

    if (currentQuestion < 2) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const isComplete = answers.every((a) => a !== null);
  const isContractor = answers.every((a) => a === 'yes');

  const resetTest = () => {
    setStarted(false);
    setCurrentQuestion(0);
    setAnswers([null, null, null]);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
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
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-xl">
            <GitBranch className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-500">{t('subtitle')}</p>
          </div>
        </div>

        {!started ? (
          /* Intro Screen */
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="max-w-2xl mx-auto text-center">
              <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <GitBranch className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('abcTestTitle')}</h2>
              <p className="text-gray-600 mb-8">{t('abcTestDesc')}</p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 text-left">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">{t('disclaimer')}</p>
                </div>
              </div>

              <button
                onClick={() => setStarted(true)}
                className="inline-flex items-center gap-2 bg-[#f5a623] text-[#1a1a2e] px-8 py-4 rounded-xl font-bold hover:bg-[#e6991a] transition-colors"
              >
                {t('startTest')}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : isComplete ? (
          /* Results Screen */
          <div className="space-y-6">
            {/* Result Card */}
            <div className={`rounded-xl border-2 p-8 ${isContractor ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
              <div className="text-center mb-6">
                {isContractor ? (
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                ) : (
                  <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                )}
                <h2 className={`text-2xl font-bold ${isContractor ? 'text-green-800' : 'text-red-800'}`}>
                  {isContractor ? t('resultContractor') : t('resultEmployee')}
                </h2>
              </div>

              <div className="space-y-4">
                <p className={`font-medium ${isContractor ? 'text-green-700' : 'text-red-700'}`}>
                  {isContractor ? t('contractorNote') : t('employeeWarning')}
                </p>
                <ul className="space-y-2">
                  {isContractor ? (
                    <>
                      <li className="flex items-center gap-2 text-green-700">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                        {t('contractorWarning1')}
                      </li>
                      <li className="flex items-center gap-2 text-green-700">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                        {t('contractorWarning2')}
                      </li>
                      <li className="flex items-center gap-2 text-green-700">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                        {t('contractorWarning3')}
                      </li>
                      <li className="flex items-center gap-2 text-green-700">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                        {t('contractorWarning4')}
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-center gap-2 text-red-700">
                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                        {t('employeePenalty1')}
                      </li>
                      <li className="flex items-center gap-2 text-red-700">
                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                        {t('employeePenalty2')}
                      </li>
                      <li className="flex items-center gap-2 text-red-700">
                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                        {t('employeePenalty3')}
                      </li>
                      <li className="flex items-center gap-2 text-red-700">
                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                        {t('employeePenalty4')}
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            {/* Your Answers */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Your Answers</h3>
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{q.condition}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      answers[i] === 'yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {answers[i] === 'yes' ? t('yes') : t('no')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={resetTest}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mx-auto"
            >
              <RotateCcw className="w-4 h-4" />
              {t('startOver')}
            </button>
          </div>
        ) : (
          /* Question Screen */
          <div className="space-y-6">
            {/* Progress */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">
                  {t('questionOf')} {currentQuestion + 1} {t('of')} 3
                </span>
                <span className="text-sm text-gray-500">{t('progress')}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#f5a623] transition-all duration-300"
                  style={{ width: `${((currentQuestion + 1) / 3) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <div className="text-center max-w-xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                  {questions[currentQuestion].condition}
                </div>

                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {questions[currentQuestion].question}
                </h2>

                <p className="text-gray-500 text-sm mb-8">
                  {questions[currentQuestion].help}
                </p>

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => handleAnswer('yes')}
                    className="flex-1 max-w-[150px] bg-green-500 text-white py-4 rounded-xl font-bold hover:bg-green-600 transition-colors"
                  >
                    {t('yes')}
                  </button>
                  <button
                    onClick={() => handleAnswer('no')}
                    className="flex-1 max-w-[150px] bg-red-500 text-white py-4 rounded-xl font-bold hover:bg-red-600 transition-colors"
                  >
                    {t('no')}
                  </button>
                </div>
              </div>
            </div>

            {/* Previous Answers */}
            {currentQuestion > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="space-y-2">
                  {questions.slice(0, currentQuestion).map((q, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{q.condition}</span>
                      <span className={`font-medium ${answers[i] === 'yes' ? 'text-green-600' : 'text-red-600'}`}>
                        {answers[i] === 'yes' ? t('yes') : t('no')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={resetTest}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mx-auto text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              {t('startOver')}
            </button>
          </div>
        )}

        {/* CTA */}
        <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2d2d44] rounded-xl p-8 text-center text-white">
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
