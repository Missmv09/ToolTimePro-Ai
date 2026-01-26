'use client';

import { useState } from 'react';
import Link from 'next/link';

// Demo data
const complianceScore = 85;

const demoChecklist = [
  { id: '1', title: 'Worker Classification', description: 'Ensure all workers are properly classified', status: 'complete', priority: 'high' },
  { id: '2', title: 'I-9 Forms on File', description: 'Verify employment eligibility for all workers', status: 'complete', priority: 'high' },
  { id: '3', title: 'Break Policy Posted', description: 'California meal/rest break requirements posted', status: 'complete', priority: 'medium' },
  { id: '4', title: 'Final Pay Procedures', description: 'Process for terminated employee final wages', status: 'pending', priority: 'high' },
  { id: '5', title: 'Wage Theft Prevention', description: 'Written notice to all employees', status: 'pending', priority: 'medium' },
  { id: '6', title: 'Safety Training Records', description: 'Document all safety training completed', status: 'complete', priority: 'low' },
];

const demoDocuments = [
  { id: '1', name: 'Offer Letter Template', type: 'HR', downloads: 145 },
  { id: '2', name: 'Termination Checklist', type: 'HR', downloads: 89 },
  { id: '3', name: 'I-9 Form Instructions', type: 'Compliance', downloads: 234 },
  { id: '4', name: 'CA Meal Break Policy', type: 'Compliance', downloads: 167 },
  { id: '5', name: 'Worker Classification Guide', type: 'Legal', downloads: 312 },
  { id: '6', name: 'Final Pay Calculator', type: 'Tool', downloads: 198 },
];

const quizQuestions = [
  { question: 'Does the worker set their own hours?', yes: 'contractor', no: 'employee' },
  { question: 'Do you provide the tools/equipment?', yes: 'employee', no: 'contractor' },
  { question: 'Is this an ongoing relationship?', yes: 'employee', no: 'contractor' },
];

export default function ShieldDemoPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'checklist' | 'documents' | 'calculator' | 'quiz'>('overview');
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [calcHours, setCalcHours] = useState('40');
  const [calcRate, setCalcRate] = useState('25');
  const [calcPTO, setCalcPTO] = useState('16');

  const handleQuizAnswer = (answer: string) => {
    const newAnswers = [...quizAnswers, answer];
    setQuizAnswers(newAnswers);
    if (quizStep < quizQuestions.length - 1) {
      setQuizStep(quizStep + 1);
    }
  };

  const resetQuiz = () => {
    setQuizStep(0);
    setQuizAnswers([]);
  };

  const calculateFinalPay = () => {
    const hours = parseFloat(calcHours) || 0;
    const rate = parseFloat(calcRate) || 0;
    const pto = parseFloat(calcPTO) || 0;
    const wages = hours * rate;
    const ptoValue = pto * rate;
    return { wages, ptoValue, total: wages + ptoValue };
  };

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Demo Banner */}
      <div className="bg-[#1a1a2e] text-white py-3 px-4 text-center">
        <p className="text-sm">
          <span className="bg-[#f5a623] text-[#1a1a2e] px-2 py-0.5 rounded font-bold mr-2">DEMO</span>
          Preview of ToolTime Shield — CA Compliance & HR Tools.{' '}
          <Link href="/auth/signup" className="text-[#f5a623] underline">
            Sign up
          </Link>{' '}
          to protect your business.
        </p>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2d2d4a] text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Link href="/" className="text-white/70 hover:text-white text-sm mb-4 inline-block">
            ← Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">🛡️</span>
            <h1 className="text-3xl font-bold">ToolTime Shield Demo</h1>
          </div>
          <p className="text-white/80">California compliance tools, worker classification, and HR document library</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex overflow-x-auto gap-1 py-2">
            {[
              { key: 'overview', label: 'Overview', icon: '📊' },
              { key: 'checklist', label: 'Compliance Checklist', icon: '✅' },
              { key: 'quiz', label: 'Worker Classification', icon: '👷' },
              { key: 'calculator', label: 'Final Pay Calculator', icon: '🧮' },
              { key: 'documents', label: 'HR Documents', icon: '📄' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'bg-[#fef3d6] text-[#1a1a2e]'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Compliance Score */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-4">Compliance Score</h2>
              <div className="flex items-center gap-8">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="12"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke={complianceScore >= 80 ? '#22c55e' : complianceScore >= 60 ? '#f5a623' : '#ef4444'}
                      strokeWidth="12"
                      strokeDasharray={`${(complianceScore / 100) * 440} 440`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-bold text-[#1a1a2e]">{complianceScore}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-green-600 mb-2">Good Standing</div>
                  <p className="text-gray-600 mb-4">
                    You&apos;re doing well! Complete the remaining items to reach 100% compliance.
                  </p>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      <span>4 Complete</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                      <span>2 Pending</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setActiveTab('quiz')}
                  className="w-full p-4 text-left bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👷</span>
                    <div>
                      <div className="font-semibold text-[#1a1a2e]">Worker Quiz</div>
                      <div className="text-sm text-gray-500">Employee or Contractor?</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('calculator')}
                  className="w-full p-4 text-left bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🧮</span>
                    <div>
                      <div className="font-semibold text-[#1a1a2e]">Final Pay Calculator</div>
                      <div className="text-sm text-gray-500">CA termination rules</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('documents')}
                  className="w-full p-4 text-left bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📄</span>
                    <div>
                      <div className="font-semibold text-[#1a1a2e]">HR Documents</div>
                      <div className="text-sm text-gray-500">Templates & forms</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Checklist Items */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-bold text-[#1a1a2e]">Compliance Checklist</h2>
                <button
                  onClick={() => setActiveTab('checklist')}
                  className="text-sm text-blue-600 font-medium"
                >
                  View All →
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {demoChecklist.slice(0, 4).map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        item.status === 'complete' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                      }`}>
                        {item.status === 'complete' ? '✓' : '!'}
                      </div>
                      <div>
                        <div className="font-medium text-[#1a1a2e]">{item.title}</div>
                        <div className="text-sm text-gray-500">{item.description}</div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      item.priority === 'high' ? 'bg-red-100 text-red-700' :
                      item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {item.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Checklist Tab */}
        {activeTab === 'checklist' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-bold text-[#1a1a2e]">CA Compliance Checklist</h2>
              <p className="text-sm text-gray-500">Track your compliance with California employment laws</p>
            </div>
            <div className="divide-y divide-gray-100">
              {demoChecklist.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <button className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 ${
                      item.status === 'complete'
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 text-gray-400 hover:border-green-500'
                    }`}>
                      ✓
                    </button>
                    <div>
                      <div className="font-medium text-[#1a1a2e]">{item.title}</div>
                      <div className="text-sm text-gray-500">{item.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      item.priority === 'high' ? 'bg-red-100 text-red-700' :
                      item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {item.priority}
                    </span>
                    <button className="text-blue-600 text-sm font-medium">Learn More</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Worker Classification Quiz */}
        {activeTab === 'quiz' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-[#1a1a2e] mb-2 text-center">Worker Classification Quiz</h2>
              <p className="text-gray-600 text-center mb-8">
                Answer these questions to help determine if your worker should be classified as an employee or independent contractor.
              </p>

              {quizAnswers.length < quizQuestions.length ? (
                <div>
                  <div className="mb-4 text-sm text-gray-500 text-center">
                    Question {quizStep + 1} of {quizQuestions.length}
                  </div>
                  <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <p className="text-xl font-medium text-[#1a1a2e] text-center">
                      {quizQuestions[quizStep].question}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleQuizAnswer('yes')}
                      className="py-4 bg-green-100 text-green-700 rounded-xl font-bold hover:bg-green-200 transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => handleQuizAnswer('no')}
                      className="py-4 bg-red-100 text-red-700 rounded-xl font-bold hover:bg-red-200 transition-colors"
                    >
                      No
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-20 h-20 bg-[#fef3d6] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">⚠️</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">Review Recommended</h3>
                  <p className="text-gray-600 mb-6">
                    Based on your answers, this worker may need to be classified as an <strong>Employee</strong>.
                    We recommend consulting with an employment attorney to confirm.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                    <p className="text-sm text-yellow-800">
                      <strong>CA Law Note:</strong> California uses the ABC test which presumes workers are employees unless the hiring entity can prove all three conditions of the test.
                    </p>
                  </div>
                  <button
                    onClick={resetQuiz}
                    className="px-6 py-3 bg-[#1a1a2e] text-white rounded-xl font-semibold hover:bg-[#2d2d4a]"
                  >
                    Take Quiz Again
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Final Pay Calculator */}
        {activeTab === 'calculator' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-[#1a1a2e] mb-2 text-center">Final Pay Calculator</h2>
              <p className="text-gray-600 text-center mb-8">
                Calculate final wages owed to terminated employees under California law.
              </p>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hours Worked (unpaid)
                  </label>
                  <input
                    type="number"
                    value={calcHours}
                    onChange={(e) => setCalcHours(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hourly Rate ($)
                  </label>
                  <input
                    type="number"
                    value={calcRate}
                    onChange={(e) => setCalcRate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unused PTO Hours
                  </label>
                  <input
                    type="number"
                    value={calcPTO}
                    onChange={(e) => setCalcPTO(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623] outline-none"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-bold text-[#1a1a2e] mb-4">Final Pay Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unpaid Wages</span>
                    <span className="font-semibold">${calculateFinalPay().wages.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unused PTO Payout</span>
                    <span className="font-semibold">${calculateFinalPay().ptoValue.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex justify-between">
                    <span className="font-bold text-[#1a1a2e]">Total Due</span>
                    <span className="font-bold text-2xl text-green-600">${calculateFinalPay().total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800">
                  <strong>CA Law:</strong> If an employee is fired, final pay (including unused PTO) must be provided <strong>immediately</strong>.
                  Waiting time penalties of up to 30 days&apos; wages may apply for late payment.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-bold text-[#1a1a2e]">HR Document Library</h2>
              <p className="text-sm text-gray-500">California-compliant templates and forms</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {demoDocuments.map((doc) => (
                <div key={doc.id} className="border border-gray-200 rounded-xl p-4 hover:border-[#f5a623] hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl">
                      📄
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#1a1a2e] mb-1">{doc.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="bg-gray-100 px-2 py-0.5 rounded">{doc.type}</span>
                        <span>•</span>
                        <span>{doc.downloads} downloads</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-8 bg-gradient-to-r from-[#1a1a2e] to-[#2d2d4a] rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Protect Your Business</h2>
          <p className="text-white/80 mb-6 max-w-2xl mx-auto">
            ToolTime Shield helps you stay compliant with California employment law, avoid costly lawsuits,
            and manage HR tasks with ease. Included in all ToolTime Pro plans.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-[#f5a623] text-[#1a1a2e] rounded-xl font-bold hover:bg-[#e6991a] transition-colors no-underline"
            >
              Start Free Trial
            </Link>
            <Link
              href="/demo/dashboard"
              className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10 transition-colors no-underline"
            >
              See Full Dashboard →
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-[#5c5c70]">
            Powered by{' '}
            <Link href="/" className="text-[#f5a623] font-medium no-underline hover:underline">
              ToolTime Pro
            </Link>
          </p>
        </div>
      </footer>
    </main>
  );
}
