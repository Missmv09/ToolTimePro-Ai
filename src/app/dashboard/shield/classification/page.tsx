'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, RotateCcw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

type Result = 'employee' | 'contractor' | null;

interface Question {
  id: string;
  text: string;
  subtext: string;
  yesLeadsTo: string | Result;
  noLeadsTo: string | Result;
}

const questions: Record<string, Question> = {
  start: {
    id: 'start',
    text: 'Do you control HOW the work is done?',
    subtext: 'Do you provide training, set specific methods/procedures, require approval of work methods, or supervise how tasks are performed?',
    yesLeadsTo: 'employee',
    noLeadsTo: 'q2',
  },
  q2: {
    id: 'q2',
    text: 'Do you control WHEN the work is done?',
    subtext: 'Do you set the worker\'s schedule, require specific hours, or dictate when work must be performed?',
    yesLeadsTo: 'employee',
    noLeadsTo: 'q3',
  },
  q3: {
    id: 'q3',
    text: 'Do you control WHERE the work is done?',
    subtext: 'Do you require work to be done at specific locations you designate, or does the worker choose their own work locations?',
    yesLeadsTo: 'employee',
    noLeadsTo: 'q4',
  },
  q4: {
    id: 'q4',
    text: 'Is the work part of your regular business offering?',
    subtext: 'For example: A landscaping company using landscapers = YES. A landscaping company using an accountant = NO.',
    yesLeadsTo: 'employee',
    noLeadsTo: 'q5',
  },
  q5: {
    id: 'q5',
    text: 'Does the worker have their own established business?',
    subtext: 'Do they have their own LLC/business entity, business license, website, business cards, and work for other clients?',
    yesLeadsTo: 'q6',
    noLeadsTo: 'employee',
  },
  q6: {
    id: 'q6',
    text: 'Does the worker provide their own tools and equipment?',
    subtext: 'Do they use their own vehicles, tools, supplies, and equipment - not provided by you?',
    yesLeadsTo: 'q7',
    noLeadsTo: 'employee',
  },
  q7: {
    id: 'q7',
    text: 'Does the worker have their own liability insurance?',
    subtext: 'Do they carry their own business insurance and workers comp (if applicable)?',
    yesLeadsTo: 'contractor',
    noLeadsTo: 'employee',
  },
};

export default function ClassificationPage() {
  const [currentQuestion, setCurrentQuestion] = useState<string>('start');
  const [result, setResult] = useState<Result>(null);
  const [history, setHistory] = useState<string[]>([]);

  const handleAnswer = (answer: 'yes' | 'no') => {
    const question = questions[currentQuestion];
    const nextStep = answer === 'yes' ? question.yesLeadsTo : question.noLeadsTo;

    setHistory([...history, currentQuestion]);

    if (nextStep === 'employee' || nextStep === 'contractor') {
      setResult(nextStep);
    } else {
      setCurrentQuestion(nextStep);
    }
  };

  const handleBack = () => {
    if (result) {
      setResult(null);
      return;
    }
    if (history.length > 0) {
      const newHistory = [...history];
      const lastQuestion = newHistory.pop()!;
      setHistory(newHistory);
      setCurrentQuestion(lastQuestion);
    }
  };

  const handleReset = () => {
    setCurrentQuestion('start');
    setResult(null);
    setHistory([]);
  };

  const question = questions[currentQuestion];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/shield" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-navy-500">Worker Classification Flowchart</h1>
          <p className="text-gray-500">California ABC Test for AB5 Compliance</p>
        </div>
      </div>

      {/* Progress */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-500">
            Question {history.length + 1} of 7
          </span>
          <button onClick={handleReset} className="btn-ghost text-sm">
            <RotateCcw size={16} className="mr-1" />
            Start Over
          </button>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold-500 transition-all duration-300"
            style={{ width: `${((history.length + 1) / 7) * 100}%` }}
          />
        </div>
      </div>

      {/* Result */}
      {result && (
        <div
          className={`card ${
            result === 'employee'
              ? 'bg-red-50 border-2 border-red-200'
              : 'bg-green-50 border-2 border-green-200'
          }`}
        >
          <div className="flex items-start gap-4">
            {result === 'employee' ? (
              <XCircle className="w-12 h-12 text-red-500 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-12 h-12 text-green-500 flex-shrink-0" />
            )}
            <div>
              <h2
                className={`text-2xl font-bold ${
                  result === 'employee' ? 'text-red-700' : 'text-green-700'
                }`}
              >
                {result === 'employee' ? 'Likely an EMPLOYEE' : 'May Qualify as CONTRACTOR'}
              </h2>
              {result === 'employee' ? (
                <div className="mt-4 space-y-3">
                  <p className="text-red-700">
                    Based on your answers, this worker should likely be classified as a W-2 employee
                    under California&apos;s AB5 law.
                  </p>
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-2">Required for Employees:</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li>- W-2 tax reporting</li>
                      <li>- Payroll taxes (employer share of FICA, FUTA, CA payroll taxes)</li>
                      <li>- Workers compensation insurance</li>
                      <li>- Overtime pay (1.5x after 8 hrs/day, 2x after 12 hrs/day)</li>
                      <li>- Meal & rest breaks</li>
                      <li>- Paid sick leave</li>
                      <li>- Final pay upon termination</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <p className="text-green-700">
                    Based on your answers, this worker may qualify as an independent contractor.
                    However, classification is complex and you should document your analysis.
                  </p>
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">For Contractors:</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>- 1099-NEC tax reporting (if paid $600+ in year)</li>
                      <li>- Collect W-9 before first payment</li>
                      <li>- No payroll taxes withheld</li>
                      <li>- Written contract recommended</li>
                      <li>- Verify they have own insurance</li>
                    </ul>
                  </div>
                  <div className="flex items-start gap-2 mt-4 p-3 bg-yellow-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-700">
                      Even with these answers, some industries have specific exemptions or rules.
                      Consider consulting an employment attorney for confirmation.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={handleBack} className="btn-outline">
              <ArrowLeft size={16} className="mr-1" />
              Go Back
            </button>
            <button onClick={handleReset} className="btn-primary">
              <RotateCcw size={16} className="mr-1" />
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* Question */}
      {!result && question && (
        <div className="card">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-navy-500 mb-2">{question.text}</h2>
            <p className="text-gray-600">{question.subtext}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleAnswer('yes')}
              className="p-6 bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 hover:border-gold-500 rounded-xl transition-all text-left group"
            >
              <span className="text-2xl font-bold text-navy-500 group-hover:text-gold-600">Yes</span>
              <p className="text-sm text-gray-500 mt-1">This applies to my situation</p>
            </button>
            <button
              onClick={() => handleAnswer('no')}
              className="p-6 bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 hover:border-gold-500 rounded-xl transition-all text-left group"
            >
              <span className="text-2xl font-bold text-navy-500 group-hover:text-gold-600">No</span>
              <p className="text-sm text-gray-500 mt-1">This does not apply</p>
            </button>
          </div>

          {history.length > 0 && (
            <button onClick={handleBack} className="btn-ghost mt-4">
              <ArrowLeft size={16} className="mr-1" />
              Previous Question
            </button>
          )}
        </div>
      )}

      {/* ABC Test Reference */}
      <div className="card bg-navy-50">
        <h3 className="font-semibold text-navy-500 mb-4">The ABC Test (California AB5)</h3>
        <p className="text-sm text-gray-600 mb-4">
          Under California law, a worker is presumed to be an employee unless the hiring entity proves
          ALL THREE of the following:
        </p>
        <div className="space-y-3">
          <div className="flex gap-3">
            <span className="w-8 h-8 bg-navy-500 text-gold-500 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
              A
            </span>
            <div>
              <p className="font-medium text-navy-500">Free from control and direction</p>
              <p className="text-sm text-gray-600">
                The worker is free from control and direction in performing the work.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="w-8 h-8 bg-navy-500 text-gold-500 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
              B
            </span>
            <div>
              <p className="font-medium text-navy-500">Outside usual course of business</p>
              <p className="text-sm text-gray-600">
                The work is outside the usual course of the hiring entity&apos;s business.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="w-8 h-8 bg-navy-500 text-gold-500 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
              C
            </span>
            <div>
              <p className="font-medium text-navy-500">Independent trade or business</p>
              <p className="text-sm text-gray-600">
                The worker is customarily engaged in an independently established trade or business.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
