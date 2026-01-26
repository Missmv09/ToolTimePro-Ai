'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, GitBranch, CheckCircle, XCircle, AlertTriangle, RotateCcw, ArrowRight } from 'lucide-react';

type Language = 'en' | 'es';
type Answer = 'yes' | 'no' | null;

const translations = {
  en: {
    backToTools: 'Back to Free Tools',
    title: 'Worker Classification Flowchart',
    subtitle: 'Determine if your worker is an employee or independent contractor under California AB5',
    abcTestTitle: 'The ABC Test (California AB5)',
    abcTestDesc: 'Under AB5, a worker is presumed to be an employee unless the hiring entity can prove ALL THREE conditions of the ABC test are met.',
    startTest: 'Start the Test',
    conditionA: 'Condition A - Free from Control',
    conditionAQuestion: 'Is the worker free from the control and direction of the hiring entity in performing the work, both under the contract and in fact?',
    conditionAHelp: 'Consider: Do you set their schedule? Provide tools/equipment? Supervise their work methods? Tell them how to do the job?',
    conditionB: 'Condition B - Outside Usual Course',
    conditionBQuestion: 'Does the worker perform work that is outside the usual course of the hiring entity\'s business?',
    conditionBHelp: 'Consider: Is this work part of your main business service? Would customers see this as part of what your company does?',
    conditionC: 'Condition C - Independent Business',
    conditionCQuestion: 'Is the worker customarily engaged in an independently established trade, occupation, or business of the same nature as the work performed?',
    conditionCHelp: 'Consider: Do they have their own business? Other clients? Business cards? LLC or contractor license?',
    yes: 'Yes',
    no: 'No',
    resultEmployee: 'LIKELY AN EMPLOYEE',
    resultContractor: 'MAY BE AN INDEPENDENT CONTRACTOR',
    employeeWarning: 'Based on your answers, this worker should likely be classified as an EMPLOYEE. Misclassification can result in:',
    employeePenalty1: 'Back taxes, interest, and penalties',
    employeePenalty2: 'Unpaid overtime and missed meal/rest breaks',
    employeePenalty3: 'Workers\' compensation claims',
    employeePenalty4: 'Private lawsuits and class actions',
    contractorNote: 'Based on your answers, this worker MAY qualify as an independent contractor. However:',
    contractorWarning1: 'This is not legal advice - consult an attorney',
    contractorWarning2: 'Document your reasoning thoroughly',
    contractorWarning3: 'Review this classification periodically',
    contractorWarning4: 'Consider using a written contract',
    startOver: 'Start Over',
    questionOf: 'Question',
    of: 'of',
    progress: 'Progress',
    disclaimer: 'This tool provides general information only and does not constitute legal advice. Worker classification is complex and fact-specific. Always consult with an employment attorney for your specific situation.',
    getProtection: 'Get Full Compliance Protection',
    ctaText: 'ToolTime Pro includes worker classification tracking, AB5 compliance alerts, and the full ToolTime Shield suite.',
    startTrial: 'Start Free Trial',
  },
  es: {
    backToTools: 'Volver a Herramientas Gratis',
    title: 'Diagrama de Clasificación de Trabajadores',
    subtitle: 'Determina si tu trabajador es empleado o contratista independiente bajo California AB5',
    abcTestTitle: 'La Prueba ABC (California AB5)',
    abcTestDesc: 'Bajo AB5, un trabajador se presume empleado a menos que la entidad contratante pueda probar que se cumplen LAS TRES condiciones de la prueba ABC.',
    startTest: 'Iniciar la Prueba',
    conditionA: 'Condición A - Libre de Control',
    conditionAQuestion: '¿Está el trabajador libre del control y dirección de la entidad contratante al realizar el trabajo, tanto por contrato como en la práctica?',
    conditionAHelp: 'Considera: ¿Estableces su horario? ¿Proporcionas herramientas/equipo? ¿Supervisas sus métodos de trabajo? ¿Le dices cómo hacer el trabajo?',
    conditionB: 'Condición B - Fuera del Curso Usual',
    conditionBQuestion: '¿Realiza el trabajador trabajo que está fuera del curso usual del negocio de la entidad contratante?',
    conditionBHelp: 'Considera: ¿Es este trabajo parte de tu servicio principal? ¿Los clientes verían esto como parte de lo que hace tu empresa?',
    conditionC: 'Condición C - Negocio Independiente',
    conditionCQuestion: '¿Está el trabajador habitualmente involucrado en un oficio, ocupación o negocio independiente establecido de la misma naturaleza que el trabajo realizado?',
    conditionCHelp: 'Considera: ¿Tienen su propio negocio? ¿Otros clientes? ¿Tarjetas de presentación? ¿LLC o licencia de contratista?',
    yes: 'Sí',
    no: 'No',
    resultEmployee: 'PROBABLEMENTE UN EMPLEADO',
    resultContractor: 'PUEDE SER CONTRATISTA INDEPENDIENTE',
    employeeWarning: 'Basado en tus respuestas, este trabajador probablemente debe ser clasificado como EMPLEADO. La clasificación errónea puede resultar en:',
    employeePenalty1: 'Impuestos atrasados, intereses y penalidades',
    employeePenalty2: 'Horas extras no pagadas y descansos perdidos',
    employeePenalty3: 'Reclamos de compensación laboral',
    employeePenalty4: 'Demandas privadas y acciones colectivas',
    contractorNote: 'Basado en tus respuestas, este trabajador PUEDE calificar como contratista independiente. Sin embargo:',
    contractorWarning1: 'Esto no es asesoría legal - consulta un abogado',
    contractorWarning2: 'Documenta tu razonamiento exhaustivamente',
    contractorWarning3: 'Revisa esta clasificación periódicamente',
    contractorWarning4: 'Considera usar un contrato escrito',
    startOver: 'Empezar de Nuevo',
    questionOf: 'Pregunta',
    of: 'de',
    progress: 'Progreso',
    disclaimer: 'Esta herramienta proporciona información general solamente y no constituye asesoría legal. La clasificación de trabajadores es compleja y específica a cada caso. Siempre consulta con un abogado laboral para tu situación específica.',
    getProtection: 'Obtén Protección de Cumplimiento Completa',
    ctaText: 'ToolTime Pro incluye seguimiento de clasificación de trabajadores, alertas de cumplimiento AB5 y la suite completa de ToolTime Shield.',
    startTrial: 'Prueba Gratis',
  },
};

export default function ClassificationPage() {
  const [language, setLanguage] = useState<Language>('en');
  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([null, null, null]);

  const t = translations[language];

  const questions = [
    { condition: t.conditionA, question: t.conditionAQuestion, help: t.conditionAHelp },
    { condition: t.conditionB, question: t.conditionBQuestion, help: t.conditionBHelp },
    { condition: t.conditionC, question: t.conditionCQuestion, help: t.conditionCHelp },
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
            <Link href="/tools" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">{t.backToTools}</span>
            </Link>

            {/* Language Switcher */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  language === 'en' ? 'bg-[#1a1a2e] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                🇺🇸 EN
              </button>
              <button
                onClick={() => setLanguage('es')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  language === 'es' ? 'bg-[#1a1a2e] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                🇪🇸 ES
              </button>
            </div>
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
            <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
            <p className="text-gray-500">{t.subtitle}</p>
          </div>
        </div>

        {!started ? (
          /* Intro Screen */
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="max-w-2xl mx-auto text-center">
              <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <GitBranch className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t.abcTestTitle}</h2>
              <p className="text-gray-600 mb-8">{t.abcTestDesc}</p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 text-left">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">{t.disclaimer}</p>
                </div>
              </div>

              <button
                onClick={() => setStarted(true)}
                className="inline-flex items-center gap-2 bg-[#f5a623] text-[#1a1a2e] px-8 py-4 rounded-xl font-bold hover:bg-[#e6991a] transition-colors"
              >
                {t.startTest}
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
                  {isContractor ? t.resultContractor : t.resultEmployee}
                </h2>
              </div>

              <div className="space-y-4">
                <p className={`font-medium ${isContractor ? 'text-green-700' : 'text-red-700'}`}>
                  {isContractor ? t.contractorNote : t.employeeWarning}
                </p>
                <ul className="space-y-2">
                  {isContractor ? (
                    <>
                      <li className="flex items-center gap-2 text-green-700">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                        {t.contractorWarning1}
                      </li>
                      <li className="flex items-center gap-2 text-green-700">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                        {t.contractorWarning2}
                      </li>
                      <li className="flex items-center gap-2 text-green-700">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                        {t.contractorWarning3}
                      </li>
                      <li className="flex items-center gap-2 text-green-700">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                        {t.contractorWarning4}
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-center gap-2 text-red-700">
                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                        {t.employeePenalty1}
                      </li>
                      <li className="flex items-center gap-2 text-red-700">
                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                        {t.employeePenalty2}
                      </li>
                      <li className="flex items-center gap-2 text-red-700">
                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                        {t.employeePenalty3}
                      </li>
                      <li className="flex items-center gap-2 text-red-700">
                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                        {t.employeePenalty4}
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
                      {answers[i] === 'yes' ? t.yes : t.no}
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
              {t.startOver}
            </button>
          </div>
        ) : (
          /* Question Screen */
          <div className="space-y-6">
            {/* Progress */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">
                  {t.questionOf} {currentQuestion + 1} {t.of} 3
                </span>
                <span className="text-sm text-gray-500">{t.progress}</span>
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
                    {t.yes}
                  </button>
                  <button
                    onClick={() => handleAnswer('no')}
                    className="flex-1 max-w-[150px] bg-red-500 text-white py-4 rounded-xl font-bold hover:bg-red-600 transition-colors"
                  >
                    {t.no}
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
                        {answers[i] === 'yes' ? t.yes : t.no}
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
              {t.startOver}
            </button>
          </div>
        )}

        {/* CTA */}
        <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2d2d44] rounded-xl p-8 text-center text-white">
          <h3 className="text-xl font-bold mb-2">{t.getProtection}</h3>
          <p className="text-gray-300 mb-6">{t.ctaText}</p>
          <Link
            href="/auth/signup"
            className="inline-block bg-[#f5a623] text-[#1a1a2e] px-8 py-3 rounded-lg font-bold hover:bg-[#e6991a] transition-colors"
          >
            {t.startTrial}
          </Link>
        </div>
      </div>
    </main>
  );
}
