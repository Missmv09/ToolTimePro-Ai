'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckSquare, Square, CheckCircle, AlertTriangle, Download, Printer } from 'lucide-react';

type Language = 'en' | 'es';

const translations = {
  en: {
    backToTools: 'Back to Free Tools',
    title: 'AB5 Compliance Checklist',
    subtitle: 'Comprehensive checklist to ensure your business complies with California AB5 requirements',
    progress: 'Compliance Progress',
    completed: 'completed',
    print: 'Print',
    download: 'Download PDF',
    category1: 'Worker Classification',
    category2: 'Documentation',
    category3: 'Payment Practices',
    category4: 'Ongoing Compliance',
    items: {
      class1: 'Conducted ABC Test analysis for all workers',
      class2: 'Documented reasoning for each classification decision',
      class3: 'Reviewed any industry-specific exemptions that may apply',
      class4: 'Consulted with employment attorney on borderline cases',
      doc1: 'Written independent contractor agreements in place',
      doc2: 'Contractor invoices maintained and organized',
      doc3: 'Proof of contractor\'s independent business (license, insurance, other clients)',
      doc4: 'Clear scope of work documented for each project',
      pay1: 'Contractors paid by project/invoice, not hourly',
      pay2: 'No reimbursement for tools, equipment, or expenses',
      pay3: 'No benefits provided (health, PTO, retirement)',
      pay4: 'Separate payment system from employees',
      ongoing1: 'Annual review of all contractor relationships',
      ongoing2: 'Training for managers on classification rules',
      ongoing3: 'Process to evaluate new hires for proper classification',
      ongoing4: 'Monitoring for changes in working relationship',
    },
    warning: 'Important Reminder',
    warningText: 'If you answer "No" to any ABC Test condition for a worker, that worker should likely be classified as an employee, not an independent contractor.',
    disclaimer: 'This checklist is for informational purposes only and does not constitute legal advice. Consult with an employment attorney for specific guidance.',
    getProtection: 'Get Full Compliance Protection',
    ctaText: 'ToolTime Pro includes automated compliance tracking, deadline reminders, and the full ToolTime Shield suite.',
    startTrial: 'Start Free Trial',
  },
  es: {
    backToTools: 'Volver a Herramientas Gratis',
    title: 'Lista de Verificación AB5',
    subtitle: 'Lista completa para asegurar que tu negocio cumple con los requisitos de California AB5',
    progress: 'Progreso de Cumplimiento',
    completed: 'completado',
    print: 'Imprimir',
    download: 'Descargar PDF',
    category1: 'Clasificación de Trabajadores',
    category2: 'Documentación',
    category3: 'Prácticas de Pago',
    category4: 'Cumplimiento Continuo',
    items: {
      class1: 'Análisis de Prueba ABC realizado para todos los trabajadores',
      class2: 'Razonamiento documentado para cada decisión de clasificación',
      class3: 'Revisadas las exenciones específicas de la industria que puedan aplicar',
      class4: 'Consultado con abogado laboral en casos dudosos',
      doc1: 'Contratos escritos de contratista independiente establecidos',
      doc2: 'Facturas de contratistas mantenidas y organizadas',
      doc3: 'Prueba del negocio independiente del contratista (licencia, seguro, otros clientes)',
      doc4: 'Alcance claro del trabajo documentado para cada proyecto',
      pay1: 'Contratistas pagados por proyecto/factura, no por hora',
      pay2: 'Sin reembolso por herramientas, equipo o gastos',
      pay3: 'Sin beneficios proporcionados (salud, PTO, retiro)',
      pay4: 'Sistema de pago separado de empleados',
      ongoing1: 'Revisión anual de todas las relaciones con contratistas',
      ongoing2: 'Capacitación para gerentes sobre reglas de clasificación',
      ongoing3: 'Proceso para evaluar nuevas contrataciones para clasificación adecuada',
      ongoing4: 'Monitoreo de cambios en la relación laboral',
    },
    warning: 'Recordatorio Importante',
    warningText: 'Si respondes "No" a cualquier condición de la Prueba ABC para un trabajador, ese trabajador probablemente debe ser clasificado como empleado, no como contratista independiente.',
    disclaimer: 'Esta lista es solo para fines informativos y no constituye asesoría legal. Consulta con un abogado laboral para orientación específica.',
    getProtection: 'Obtén Protección de Cumplimiento Completa',
    ctaText: 'ToolTime Pro incluye seguimiento automatizado de cumplimiento, recordatorios de fechas límite y la suite completa de ToolTime Shield.',
    startTrial: 'Prueba Gratis',
  },
};

const checklistCategories = [
  { key: 'category1', items: ['class1', 'class2', 'class3', 'class4'] },
  { key: 'category2', items: ['doc1', 'doc2', 'doc3', 'doc4'] },
  { key: 'category3', items: ['pay1', 'pay2', 'pay3', 'pay4'] },
  { key: 'category4', items: ['ongoing1', 'ongoing2', 'ongoing3', 'ongoing4'] },
];

export default function ChecklistPage() {
  const [language, setLanguage] = useState<Language>('en');
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const t = translations[language];

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
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-xl">
              <CheckSquare className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
              <p className="text-gray-500">{t.subtitle}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Printer className="w-4 h-4" />
              {t.print}
            </button>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">{t.progress}</h3>
            <span className="text-sm text-gray-500">
              {completedItems}/{totalItems} {t.completed}
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
              <h4 className="font-semibold text-yellow-800">{t.warning}</h4>
              <p className="text-sm text-yellow-700 mt-1">{t.warningText}</p>
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
              {t[category.key as keyof typeof t] as string}
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
                      {t.items[itemKey as keyof typeof t.items]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Disclaimer */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">{t.disclaimer}</p>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2d2d44] rounded-xl p-8 text-center text-white print:hidden">
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
