'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Clock, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

type Language = 'en' | 'es';

const translations = {
  en: {
    backToTools: 'Back to Free Tools',
    title: 'Final Wage Rules Guide',
    subtitle: 'Know exactly when final pay is due based on termination type in California',
    overview: 'California Final Pay Overview',
    overviewText: 'California has strict deadlines for paying final wages. The timing depends on whether the employee quit or was terminated, and whether notice was given.',
    terminationTypes: 'Termination Types',
    involuntary: {
      title: 'Involuntary Termination (Fired/Laid Off)',
      deadline: 'Same Day',
      description: 'Final wages must be paid immediately at the time of termination.',
      details: 'This includes all earned wages, accrued vacation/PTO, and any other compensation owed.',
    },
    voluntaryNoNotice: {
      title: 'Voluntary Quit (No Notice)',
      deadline: '72 Hours',
      description: 'Final wages must be paid within 72 hours of the employee\'s last day.',
      details: 'The 72 hours is calendar hours, not business hours. If an employee quits on Friday, payment is due by Monday.',
    },
    voluntaryWithNotice: {
      title: 'Voluntary Quit (72+ Hours Notice)',
      deadline: 'Last Day',
      description: 'If employee gives at least 72 hours notice, final wages are due on their last day.',
      details: 'The notice must be at least 72 hours in advance. If they give less notice, the 72-hour rule applies.',
    },
    seasonal: {
      title: 'Seasonal Workers (Film/Agriculture)',
      deadline: '24-72 Hours',
      description: 'Special rules may apply for seasonal workers in certain industries.',
      details: 'Film industry: 24 hours. Agriculture: varies. Check specific industry requirements.',
    },
    whatToInclude: 'What Must Be Included',
    includeItems: [
      'All hours worked through the final day',
      'Accrued but unused vacation/PTO',
      'Any earned bonuses or commissions',
      'Reimbursement for business expenses',
      'Final paycheck in the employee\'s usual form',
    ],
    penaltiesTitle: 'Penalties for Late Payment',
    penaltiesText: 'Under Labor Code 203, if final wages are willfully withheld, the employer owes waiting time penalties:',
    penaltyCalc: 'Daily wage rate × days late (up to 30 days maximum)',
    penaltyExample: 'Example: A worker earning $25/hour ($200/day) who is paid 15 days late could receive $3,000 in penalties.',
    useCalculator: 'Use Penalty Calculator',
    tips: 'Best Practices',
    tipItems: [
      'Have a final paycheck ready BEFORE a planned termination',
      'Keep a petty cash fund or checkbook for immediate payments',
      'Document the time and method of final wage payment',
      'Get a signed receipt when delivering the final check',
      'Include a detailed pay stub with the final payment',
    ],
    disclaimer: 'This guide provides general information about California law and does not constitute legal advice. Consult with an employment attorney for specific situations.',
    getProtection: 'Automate Final Pay Compliance',
    ctaText: 'ToolTime Pro automatically calculates final pay amounts and reminds you of deadlines based on termination type.',
    startTrial: 'Start Free Trial',
  },
  es: {
    backToTools: 'Volver a Herramientas Gratis',
    title: 'Guía de Reglas de Salario Final',
    subtitle: 'Conoce exactamente cuándo se debe el pago final según el tipo de terminación en California',
    overview: 'Resumen de Pago Final en California',
    overviewText: 'California tiene plazos estrictos para pagar salarios finales. El tiempo depende de si el empleado renunció o fue despedido, y si se dio aviso previo.',
    terminationTypes: 'Tipos de Terminación',
    involuntary: {
      title: 'Terminación Involuntaria (Despido)',
      deadline: 'Mismo Día',
      description: 'Los salarios finales deben pagarse inmediatamente al momento de la terminación.',
      details: 'Esto incluye todos los salarios ganados, vacaciones/PTO acumulados y cualquier otra compensación adeudada.',
    },
    voluntaryNoNotice: {
      title: 'Renuncia Voluntaria (Sin Aviso)',
      deadline: '72 Horas',
      description: 'Los salarios finales deben pagarse dentro de 72 horas del último día del empleado.',
      details: 'Las 72 horas son horas calendario, no horas laborales. Si un empleado renuncia el viernes, el pago vence el lunes.',
    },
    voluntaryWithNotice: {
      title: 'Renuncia Voluntaria (Aviso de 72+ Horas)',
      deadline: 'Último Día',
      description: 'Si el empleado da al menos 72 horas de aviso, los salarios finales vencen en su último día.',
      details: 'El aviso debe ser de al menos 72 horas de anticipación. Si dan menos aviso, aplica la regla de 72 horas.',
    },
    seasonal: {
      title: 'Trabajadores de Temporada (Cine/Agricultura)',
      deadline: '24-72 Horas',
      description: 'Reglas especiales pueden aplicar para trabajadores de temporada en ciertas industrias.',
      details: 'Industria del cine: 24 horas. Agricultura: varía. Consulta los requisitos específicos de la industria.',
    },
    whatToInclude: 'Qué Debe Incluirse',
    includeItems: [
      'Todas las horas trabajadas hasta el día final',
      'Vacaciones/PTO acumulados pero no usados',
      'Cualquier bono o comisión ganada',
      'Reembolso de gastos de negocio',
      'Cheque final en la forma usual del empleado',
    ],
    penaltiesTitle: 'Penalidades por Pago Tardío',
    penaltiesText: 'Bajo el Código Laboral 203, si los salarios finales se retienen deliberadamente, el empleador debe penalidades por tiempo de espera:',
    penaltyCalc: 'Tarifa diaria × días de retraso (hasta 30 días máximo)',
    penaltyExample: 'Ejemplo: Un trabajador que gana $25/hora ($200/día) que recibe pago 15 días tarde podría recibir $3,000 en penalidades.',
    useCalculator: 'Usar Calculadora de Penalidades',
    tips: 'Mejores Prácticas',
    tipItems: [
      'Tener el cheque final listo ANTES de una terminación planeada',
      'Mantener un fondo de caja chica o chequera para pagos inmediatos',
      'Documentar la hora y método del pago de salario final',
      'Obtener un recibo firmado al entregar el cheque final',
      'Incluir un talón de pago detallado con el pago final',
    ],
    disclaimer: 'Esta guía proporciona información general sobre la ley de California y no constituye asesoría legal. Consulta con un abogado laboral para situaciones específicas.',
    getProtection: 'Automatiza el Cumplimiento de Pago Final',
    ctaText: 'ToolTime Pro calcula automáticamente los montos de pago final y te recuerda las fechas límite según el tipo de terminación.',
    startTrial: 'Prueba Gratis',
  },
};

export default function FinalWagePage() {
  const [language, setLanguage] = useState<Language>('en');
  const t = translations[language];

  const terminationTypes = [
    { key: 'involuntary', icon: XCircle, color: 'red' },
    { key: 'voluntaryNoNotice', icon: Clock, color: 'yellow' },
    { key: 'voluntaryWithNotice', icon: CheckCircle, color: 'green' },
    { key: 'seasonal', icon: Info, color: 'blue' },
  ];

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
          <div className="bg-purple-100 p-3 rounded-xl">
            <FileText className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
            <p className="text-gray-500">{t.subtitle}</p>
          </div>
        </div>

        {/* Overview */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{t.overview}</h2>
          <p className="text-gray-600">{t.overviewText}</p>
        </div>

        {/* Termination Types */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{t.terminationTypes}</h2>

          {terminationTypes.map(({ key, icon: Icon, color }) => {
            const data = t[key as keyof typeof t] as { title: string; deadline: string; description: string; details: string };
            const colorClasses = {
              red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', badge: 'bg-red-100 text-red-700' },
              yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' },
              green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', badge: 'bg-green-100 text-green-700' },
              blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
            };
            const colors = colorClasses[color as keyof typeof colorClasses];

            return (
              <div key={key} className={`${colors.bg} rounded-xl border ${colors.border} p-6`}>
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${colors.bg}`}>
                    <Icon className={`w-6 h-6 ${colors.icon}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{data.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${colors.badge}`}>
                        {data.deadline}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{data.description}</p>
                    <p className="text-sm text-gray-500">{data.details}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* What to Include */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.whatToInclude}</h2>
          <ul className="space-y-3">
            {t.includeItems.map((item, i) => (
              <li key={i} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Penalties */}
        <div className="bg-red-50 rounded-xl border border-red-200 p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-red-800 mb-2">{t.penaltiesTitle}</h2>
              <p className="text-red-700 mb-4">{t.penaltiesText}</p>
              <div className="bg-white rounded-lg p-4 mb-4">
                <p className="font-mono text-lg text-center text-red-800">{t.penaltyCalc}</p>
              </div>
              <p className="text-sm text-red-600 mb-4">{t.penaltyExample}</p>
              <Link
                href="/tools/calculator"
                className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                {t.useCalculator}
              </Link>
            </div>
          </div>
        </div>

        {/* Best Practices */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.tips}</h2>
          <ul className="space-y-3">
            {t.tipItems.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 bg-[#f5a623] text-[#1a1a2e] rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Disclaimer */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">{t.disclaimer}</p>
        </div>

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
