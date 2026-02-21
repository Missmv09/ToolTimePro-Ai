'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type Language = 'en' | 'es';

interface Translations {
  [key: string]: {
    en: string;
    es: string;
  };
}

// Translation dictionary
const translations: Translations = {
  // Navigation
  'nav.features': { en: 'Features', es: 'Funciones' },
  'nav.demos': { en: 'Demos', es: 'Demos' },
  'nav.hrCompliance': { en: 'HR & Compliance', es: 'RH y Cumplimiento' },
  'nav.pricing': { en: 'Pricing', es: 'Precios' },
  'nav.freeTools': { en: 'Free Tools', es: 'Herramientas Gratis' },
  'nav.resources': { en: 'Resources', es: 'Recursos' },
  'nav.getStarted': { en: 'Get Started', es: 'Comenzar' },
  'nav.startFreeTrial': { en: 'Start Free Trial', es: 'Prueba Gratis' },
  'nav.viewPricing': { en: 'View Pricing', es: 'Ver Precios' },

  // Hero Section
  'hero.badge': { en: 'Built for Service Pros', es: 'Hecho para Profesionales' },
  'hero.title1': { en: 'Your Business', es: 'Tu Negocio' },
  'hero.title2': { en: 'On Autopilot', es: 'En Piloto Automático' },
  'hero.subtitle': { en: "We set it up. You run your business. It's that simple.", es: 'Nosotros lo configuramos. Tú manejas tu negocio. Así de simple.' },
  'hero.cta1': { en: 'Get Started Free', es: 'Empieza Gratis' },
  'hero.cta2': { en: 'See How It Works', es: 'Ver Cómo Funciona' },

  // Stats
  'stats.startingAt': { en: 'Starting at /month', es: 'Desde /mes' },
  'stats.cheaperThan': { en: 'Cheaper than competitors', es: 'Más barato que la competencia' },
  'stats.techSkills': { en: 'Tech skills required', es: 'Habilidades técnicas requeridas' },

  // Free Tools Page
  'tools.title': { en: 'Free Business Tools', es: 'Herramientas de Negocio Gratis' },
  'tools.subtitle': { en: 'Powerful calculators and guides to help you run your business - no signup required', es: 'Calculadoras y guías potentes para ayudarte a manejar tu negocio - sin registrarte' },
  'tools.calculator.title': { en: 'Waiting Time Penalty Calculator', es: 'Calculadora de Penalidad por Tiempo de Espera' },
  'tools.calculator.desc': { en: 'Calculate potential California Labor Code 203 penalties for late final wage payments', es: 'Calcula las penalidades potenciales del Código Laboral de California 203 por pagos tardíos' },
  'tools.classification.title': { en: 'Worker Classification Flowchart', es: 'Diagrama de Clasificación de Trabajadores' },
  'tools.classification.desc': { en: 'Determine if your workers are employees or independent contractors under California AB5', es: 'Determina si tus trabajadores son empleados o contratistas independientes bajo California AB5' },
  'tools.checklist.title': { en: 'AB5 Compliance Checklist', es: 'Lista de Verificación de Cumplimiento AB5' },
  'tools.checklist.desc': { en: 'Comprehensive checklist to ensure your business complies with California AB5 requirements', es: 'Lista completa para asegurar que tu negocio cumple con los requisitos de California AB5' },
  'tools.finalWage.title': { en: 'Final Wage Rules Guide', es: 'Guía de Reglas de Salario Final' },
  'tools.finalWage.desc': { en: 'Know exactly when final pay is due based on termination type in California', es: 'Conoce exactamente cuándo se debe el pago final según el tipo de terminación en California' },
  'tools.tryTool': { en: 'Try This Tool', es: 'Probar Herramienta' },
  'tools.free': { en: 'FREE', es: 'GRATIS' },
  'tools.noSignup': { en: 'No signup required', es: 'Sin registro' },

  // Calculator Page
  'calc.title': { en: 'Waiting Time Penalty Calculator', es: 'Calculadora de Penalidad por Tiempo de Espera' },
  'calc.subtitle': { en: 'Calculate potential penalties for late final wage payments', es: 'Calcula penalidades potenciales por pagos tardíos de salario final' },
  'calc.laborCode': { en: 'California Labor Code Section 203', es: 'Código Laboral de California Sección 203' },
  'calc.laborCodeDesc': { en: "If an employer willfully fails to pay wages due at termination, the employee's wages continue as a penalty from the due date at the same rate until paid or for 30 days, whichever is less.", es: 'Si un empleador deliberadamente no paga los salarios debidos al terminar, los salarios del empleado continúan como penalidad desde la fecha de vencimiento a la misma tasa hasta que se pague o por 30 días, lo que sea menor.' },
  'calc.paymentType': { en: 'Payment Type', es: 'Tipo de Pago' },
  'calc.hourlyWorker': { en: 'Hourly Worker', es: 'Trabajador por Hora' },
  'calc.salariedWorker': { en: 'Salaried Worker', es: 'Trabajador Asalariado' },
  'calc.hourlyRate': { en: 'Hourly Rate ($)', es: 'Tarifa por Hora ($)' },
  'calc.annualSalary': { en: 'Annual Salary ($)', es: 'Salario Anual ($)' },
  'calc.daysLate': { en: 'Days Late', es: 'Días de Retraso' },
  'calc.calculate': { en: 'Calculate Penalty', es: 'Calcular Penalidad' },
  'calc.reset': { en: 'Reset', es: 'Reiniciar' },
  'calc.result': { en: 'Penalty Estimate', es: 'Estimación de Penalidad' },
  'calc.dailyWage': { en: 'Daily Wage Rate', es: 'Tarifa Diaria' },
  'calc.daysEntered': { en: 'Days Late (entered)', es: 'Días de Retraso (ingresados)' },
  'calc.daysApplied': { en: 'Days Applied (max 30)', es: 'Días Aplicados (máx 30)' },
  'calc.estimatedPenalty': { en: 'Estimated Waiting Time Penalty', es: 'Penalidad Estimada por Tiempo de Espera' },
  'calc.disclaimer': { en: 'Disclaimer', es: 'Aviso Legal' },
  'calc.disclaimerText': { en: 'This calculator provides estimates for informational purposes only. Actual penalties may vary based on specific circumstances, good faith disputes, and other factors. Always consult with an employment attorney for specific situations.', es: 'Esta calculadora proporciona estimaciones solo con fines informativos. Las penalidades reales pueden variar según circunstancias específicas, disputas de buena fe y otros factores. Siempre consulta con un abogado laboral para situaciones específicas.' },

  // Classification Page
  'class.title': { en: 'Worker Classification Flowchart', es: 'Diagrama de Clasificación de Trabajadores' },
  'class.subtitle': { en: 'Determine if your worker is an employee or independent contractor under California AB5', es: 'Determina si tu trabajador es empleado o contratista independiente bajo California AB5' },
  'class.abcTest': { en: 'ABC Test (California AB5)', es: 'Prueba ABC (California AB5)' },
  'class.abcDesc': { en: 'A worker is presumed to be an employee unless ALL THREE conditions are met', es: 'Un trabajador se presume empleado a menos que se cumplan LAS TRES condiciones' },
  'class.conditionA': { en: 'Condition A - Free from Control', es: 'Condición A - Libre de Control' },
  'class.conditionADesc': { en: 'Is the worker free from control and direction in performing the work, both under contract and in fact?', es: '¿Está el trabajador libre de control y dirección al realizar el trabajo, tanto por contrato como en la práctica?' },
  'class.conditionB': { en: 'Condition B - Outside Usual Course', es: 'Condición B - Fuera del Curso Usual' },
  'class.conditionBDesc': { en: "Does the worker perform work outside the usual course of the hiring entity's business?", es: '¿Realiza el trabajador trabajo fuera del curso usual del negocio de la entidad contratante?' },
  'class.conditionC': { en: 'Condition C - Independent Business', es: 'Condición C - Negocio Independiente' },
  'class.conditionCDesc': { en: 'Is the worker customarily engaged in an independently established trade, occupation, or business of the same nature?', es: '¿Está el trabajador habitualmente involucrado en un oficio, ocupación o negocio independiente de la misma naturaleza?' },
  'class.yes': { en: 'Yes', es: 'Sí' },
  'class.no': { en: 'No', es: 'No' },
  'class.resultEmployee': { en: 'EMPLOYEE', es: 'EMPLEADO' },
  'class.resultContractor': { en: 'INDEPENDENT CONTRACTOR', es: 'CONTRATISTA INDEPENDIENTE' },
  'class.employeeWarning': { en: 'This worker should likely be classified as an employee. Misclassification can result in significant penalties.', es: 'Este trabajador probablemente debe ser clasificado como empleado. La clasificación errónea puede resultar en penalidades significativas.' },
  'class.contractorNote': { en: 'Based on your answers, this worker may qualify as an independent contractor. However, always consult with an attorney to confirm.', es: 'Basado en tus respuestas, este trabajador puede calificar como contratista independiente. Sin embargo, siempre consulta con un abogado para confirmar.' },

  // Common
  'common.backToTools': { en: 'Back to Free Tools', es: 'Volver a Herramientas Gratis' },
  'common.learnMore': { en: 'Learn More', es: 'Más Información' },
  'common.getStarted': { en: 'Get Started', es: 'Comenzar' },
  'common.close': { en: 'Close', es: 'Cerrar' },

  // Promo Banner
  'promo.text': { en: 'Limited Time: Get 2 months free on annual plans.', es: 'Tiempo Limitado: Obtén 2 meses gratis en planes anuales.' },
  'promo.cta': { en: 'Start Free Trial', es: 'Prueba Gratis' },

  // Footer
  'footer.tagline': { en: 'Your business, on autopilot.', es: 'Tu negocio, en piloto automático.' },

  // Jenny Exec Chat — UI
  'jenny.askJenny': { en: 'Ask Jenny', es: 'Pregúntale a Jenny' },
  'jenny.clearChat': { en: 'Clear chat', es: 'Borrar chat' },
  'jenny.scrollLatest': { en: 'Scroll to latest', es: 'Ir al más reciente' },
  'jenny.errorConnect': { en: 'Sorry, I had trouble connecting. Please try again in a moment.', es: 'Lo siento, tuve problemas al conectar. Por favor intenta de nuevo en un momento.' },

  // Jenny — Compliance mode
  'jenny.compliance.title': { en: 'Jenny Compliance Advisor', es: 'Jenny Asesora de Cumplimiento' },
  'jenny.compliance.subtitle': { en: 'CA labor law expertise', es: 'Experta en leyes laborales de CA' },
  'jenny.compliance.greeting': { en: "Hi! I'm Jenny, your CA compliance advisor. Ask me anything or pick a question below.", es: '¡Hola! Soy Jenny, tu asesora de cumplimiento de CA. Pregúntame lo que quieras o elige una pregunta abajo.' },
  'jenny.compliance.placeholder': { en: 'Ask Jenny about compliance...', es: 'Pregúntale a Jenny sobre cumplimiento...' },
  'jenny.compliance.prompt': { en: 'CA labor law compliance', es: 'cumplimiento de leyes laborales de CA' },
  'jenny.compliance.q1': { en: 'When do I need to give meal breaks?', es: '¿Cuándo debo dar descansos para comer?' },
  'jenny.compliance.q2': { en: 'How does overtime work in California?', es: '¿Cómo funciona el tiempo extra en California?' },
  'jenny.compliance.q3': { en: 'Is my worker a contractor or employee?', es: '¿Mi trabajador es contratista o empleado?' },
  'jenny.compliance.q4': { en: 'What are the penalties for missed breaks?', es: '¿Cuáles son las multas por descansos perdidos?' },

  // Jenny — HR mode
  'jenny.hr.title': { en: 'Jenny HR Advisor', es: 'Jenny Asesora de RH' },
  'jenny.hr.subtitle': { en: 'Workforce management guidance', es: 'Guía para gestión de personal' },
  'jenny.hr.greeting': { en: "Hi! I'm Jenny, your HR advisor. Ask me anything or pick a question below.", es: '¡Hola! Soy Jenny, tu asesora de recursos humanos. Pregúntame lo que quieras o elige una pregunta abajo.' },
  'jenny.hr.placeholder': { en: 'Ask Jenny about HR...', es: 'Pregúntale a Jenny sobre RH...' },
  'jenny.hr.prompt': { en: 'HR and workforce management', es: 'RH y gestión de personal' },
  'jenny.hr.q1': { en: 'What forms do I need for a new hire?', es: '¿Qué formularios necesito para una nueva contratación?' },
  'jenny.hr.q2': { en: 'How do I properly terminate an employee?', es: '¿Cómo despido correctamente a un empleado?' },
  'jenny.hr.q3': { en: 'Do I need an employee handbook?', es: '¿Necesito un manual del empleado?' },
  'jenny.hr.q4': { en: 'W-2 vs 1099 — how do I classify workers?', es: 'W-2 vs 1099 — ¿cómo clasifico a los trabajadores?' },

  // Jenny — Insights mode
  'jenny.insights.title': { en: 'Jenny Business Insights', es: 'Jenny Perspectivas de Negocio' },
  'jenny.insights.subtitle': { en: 'Data-driven business advice', es: 'Consejos de negocio basados en datos' },
  'jenny.insights.greeting': { en: "Hi! I'm Jenny, your business insights advisor. Ask me anything or pick a question below.", es: '¡Hola! Soy Jenny, tu asesora de perspectivas de negocio. Pregúntame lo que quieras o elige una pregunta abajo.' },
  'jenny.insights.placeholder': { en: 'Ask Jenny about your business...', es: 'Pregúntale a Jenny sobre tu negocio...' },
  'jenny.insights.prompt': { en: 'your business metrics', es: 'las métricas de tu negocio' },
  'jenny.insights.q1': { en: 'What KPIs should I track?', es: '¿Qué KPIs debo seguir?' },
  'jenny.insights.q2': { en: 'How can I improve profitability?', es: '¿Cómo puedo mejorar la rentabilidad?' },
  'jenny.insights.q3': { en: 'What should I charge for my services?', es: '¿Cuánto debo cobrar por mis servicios?' },
  'jenny.insights.q4': { en: 'How do I reduce crew turnover?', es: '¿Cómo reduzco la rotación de personal?' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = useCallback((key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Missing translation for key: ${key}`);
      return key;
    }
    return translation[language];
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export { translations };
export type { Language };
