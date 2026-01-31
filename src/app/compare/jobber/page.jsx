'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const translations = {
  en: {
    promoBanner: 'Limited Time: Get 2 months free on annual plans.',
    startTrial: 'Start Free Trial',
    features: 'Features',
    industries: 'Industries',
    pricing: 'Pricing',
    resources: 'Resources',
    freeTools: 'Free Tools',
    demos: 'Demos',
    viewAllIndustries: 'View All Industries →',
    comparisonGuide: 'Comparison Guide',
    heroTitle: 'ToolTime Pro vs Jobber',
    heroSubtitle: 'See why contractors are switching to ToolTime Pro — the same powerful features at a fraction of the price.',
    seeFullComparison: 'See Full Comparison',
    averageSavings: 'Average Savings',
    perExtraUser: 'Per Extra User (vs $29)',
    moreUsersPerPlan: 'More Users Per Plan',
    freeTrial: 'Free Trial',
    pricingComparison: 'Pricing Comparison',
    pricingComparisonSubtitle: 'Get more features, more users, and better value with ToolTime Pro.',
    planTier: 'Plan Tier',
    soloStarter: 'Solo / Starter',
    smallTeam: 'Small Team',
    growingTeam: 'Growing Team',
    extraUsers: 'Extra Users',
    enterprise: 'Enterprise',
    customPricing: 'Custom pricing',
    upToUsers: 'Up to',
    users: 'users',
    userOnly: 'user only',
    perUserPerMo: '/user/mo',
    perMo: '/mo',
    savingsCallout: 'A 10-person team saves over $3,000/year',
    savingsCalloutSuffix: 'switching from Jobber to ToolTime Pro',
    featureComparison: 'Feature Comparison',
    featureComparisonSubtitle: "Both platforms offer core field service features. Here's where they differ.",
    feature: 'Feature',
    allPlans: 'All plans',
    schedulingCalendar: 'Scheduling & Calendar',
    invoicingPayments: 'Invoicing & Payments',
    clientManagement: 'Client Management (CRM)',
    onlineBooking: 'Online Booking Page',
    smsNotifications: 'SMS Quote & Invoice Notifications',
    teamScheduling: 'Team Scheduling & Dispatch',
    complianceTools: 'Compliance Tools (ToolTime Shield)',
    included: 'Included',
    notAvailable: 'Not available',
    toolTimeAssistant: 'ToolTime Assistant (24/7 AI Lead Capture)',
    addOn: 'add-on',
    aiPhoneReceptionist: 'AI Phone Receptionist',
    comingSoon: 'Coming soon',
    workerMobileApp: 'Worker Mobile App (GPS Clock-in)',
    extraCost: 'Extra cost',
    websiteBuilder: 'Website Builder',
    planOnly: 'plan only',
    routeOptimization: 'Route Optimization',
    quickbooksSync: 'QuickBooks Sync',
    whyContractorsSwitch: 'Why Contractors Switch to ToolTime Pro',
    save50_77: 'Save 50-77% on Software',
    save50_77Desc: 'Get the same core features at a fraction of the price. No hidden fees, no surprise charges.',
    smsBuiltIn: 'SMS Built Into Every Plan',
    smsBuiltInDesc: 'Send quotes and invoices via text message — included in all plans, not locked behind $199+ tiers.',
    affordableTeamGrowth: 'Affordable Team Growth',
    affordableTeamGrowthDesc: "Add team members for just $7/user vs Jobber's $29/user. Scale without breaking the bank.",
    complianceIncluded: 'Compliance Tools Included',
    complianceIncludedDesc: "ToolTime Shield keeps you audit-ready with safety checklists and compliance docs — Jobber doesn't offer this.",
    toolTimeAssistantTitle: 'ToolTime Assistant',
    toolTimeAssistantDesc: '24/7 AI-powered lead capture for just $19/mo. Jobber charges $349+/mo for similar functionality.',
    builtForGrowingTeams: 'Built for Growing Teams',
    builtForGrowingTeamsDesc: "Our $79 plan includes 30 users. Jobber's $349 plan only includes 15. Do the math.",
    realWorldCost: 'Real-World Cost Comparison',
    realWorldCostSubtitle: 'See how much you could save based on your team size.',
    soloContractor: 'Solo Contractor',
    fivePersonTeam: '5-Person Team + Add-ons',
    fifteenPersonTeam: '15-Person Team + All Features',
    savePerYear: 'Save',
    perYear: '/year',
    faq: 'Frequently Asked Questions',
    faqMigrate: 'Can I migrate my data from Jobber to ToolTime Pro?',
    faqMigrateAnswer: 'Yes! Our team can help you migrate your customer data, job history, and settings. With our White Glove Setup ($349), we handle the entire migration for you.',
    faqMobileApp: 'Does ToolTime Pro have a mobile app?',
    faqMobileAppAnswer: 'Yes, our Worker App is available on iOS and Android. It includes GPS clock-in/out, job details, customer info, and the ability to collect payments on-site.',
    faqAssistant: 'What is ToolTime Assistant?',
    faqAssistantAnswer: "ToolTime Assistant is our AI-powered chatbot that captures leads 24/7, answers customer questions, and can book appointments — even when you're asleep or on a job. It's available as a $19/mo add-on on any plan.",
    faqFreeTrial: 'Is there a free trial?',
    faqFreeTrialAnswer: 'Yes! All plans include a 14-day free trial with no credit card required. Try everything before you commit.',
    faqHelp: 'What if I need help getting started?',
    faqHelpAnswer: 'We offer Assisted Onboarding ($149) where we help you set up your account, or White Glove Setup ($349) where we do everything for you including data migration and team training.',
    faqQuickbooks: 'Does ToolTime Pro integrate with QuickBooks?',
    faqQuickbooksAnswer: 'Yes! Our QuickBooks Sync add-on ($12/mo) automatically syncs your invoices, payments, and expenses with QuickBooks Online.',
    readyToSave: 'Ready to Save $1,000+ Per Year?',
    readyToSaveSubtitle: 'Join hundreds of contractors who switched from Jobber to ToolTime Pro.',
    startYourFreeTrial: 'Start Your Free Trial →',
    scheduleDemo: 'Schedule a Demo',
    noCreditCard: '14-day free trial • No credit card required • Cancel anytime',
    footerDesc: 'The all-in-one platform for service businesses. Website, scheduling, worker app, HR & compliance — we set it up, you run your business.',
    product: 'Product',
    company: 'Company',
    login: 'Login',
    signUp: 'Sign Up',
    contact: 'Contact',
    allRightsReserved: '© 2026 ToolTime Pro. All rights reserved.',
  },
  es: {
    promoBanner: 'Tiempo Limitado: Obtén 2 meses gratis en planes anuales.',
    startTrial: 'Prueba Gratis',
    features: 'Funciones',
    industries: 'Industrias',
    pricing: 'Precios',
    resources: 'Recursos',
    freeTools: 'Herramientas Gratis',
    demos: 'Demos',
    viewAllIndustries: 'Ver Todas las Industrias →',
    comparisonGuide: 'Guía de Comparación',
    heroTitle: 'ToolTime Pro vs Jobber',
    heroSubtitle: 'Descubra por qué los contratistas están cambiando a ToolTime Pro — las mismas funciones potentes a una fracción del precio.',
    seeFullComparison: 'Ver Comparación Completa',
    averageSavings: 'Ahorro Promedio',
    perExtraUser: 'Por Usuario Extra (vs $29)',
    moreUsersPerPlan: 'Más Usuarios Por Plan',
    freeTrial: 'Prueba Gratis',
    pricingComparison: 'Comparación de Precios',
    pricingComparisonSubtitle: 'Obtenga más funciones, más usuarios y mejor valor con ToolTime Pro.',
    planTier: 'Nivel de Plan',
    soloStarter: 'Solo / Inicial',
    smallTeam: 'Equipo Pequeño',
    growingTeam: 'Equipo en Crecimiento',
    extraUsers: 'Usuarios Extra',
    enterprise: 'Empresarial',
    customPricing: 'Precio personalizado',
    upToUsers: 'Hasta',
    users: 'usuarios',
    userOnly: 'solo 1 usuario',
    perUserPerMo: '/usuario/mes',
    perMo: '/mes',
    savingsCallout: 'Un equipo de 10 personas ahorra más de $3,000/año',
    savingsCalloutSuffix: 'al cambiar de Jobber a ToolTime Pro',
    featureComparison: 'Comparación de Funciones',
    featureComparisonSubtitle: 'Ambas plataformas ofrecen funciones básicas. Aquí es donde difieren.',
    feature: 'Función',
    allPlans: 'Todos los planes',
    schedulingCalendar: 'Agenda y Calendario',
    invoicingPayments: 'Facturación y Pagos',
    clientManagement: 'Gestión de Clientes (CRM)',
    onlineBooking: 'Página de Reservas en Línea',
    smsNotifications: 'Notificaciones SMS de Cotizaciones y Facturas',
    teamScheduling: 'Programación y Despacho de Equipo',
    complianceTools: 'Herramientas de Cumplimiento (ToolTime Shield)',
    included: 'Incluido',
    notAvailable: 'No disponible',
    toolTimeAssistant: 'Asistente ToolTime (Captura de Clientes 24/7)',
    addOn: 'complemento',
    aiPhoneReceptionist: 'Recepcionista Telefónico IA',
    comingSoon: 'Próximamente',
    workerMobileApp: 'App Móvil para Trabajadores (GPS)',
    extraCost: 'Costo extra',
    websiteBuilder: 'Constructor de Sitio Web',
    planOnly: 'solo plan',
    routeOptimization: 'Optimización de Rutas',
    quickbooksSync: 'Sincronización con QuickBooks',
    whyContractorsSwitch: 'Por Qué los Contratistas Eligen ToolTime Pro',
    save50_77: 'Ahorre 50-77% en Software',
    save50_77Desc: 'Obtenga las mismas funciones a una fracción del precio. Sin cargos ocultos, sin sorpresas.',
    smsBuiltIn: 'SMS Incluido en Todos los Planes',
    smsBuiltInDesc: 'Envíe cotizaciones y facturas por mensaje de texto — incluido en todos los planes, no bloqueado detrás de planes de $199+.',
    affordableTeamGrowth: 'Crecimiento de Equipo Accesible',
    affordableTeamGrowthDesc: 'Agregue miembros al equipo por solo $7/usuario vs $29/usuario de Jobber. Escale sin quebrar el banco.',
    complianceIncluded: 'Herramientas de Cumplimiento Incluidas',
    complianceIncludedDesc: 'ToolTime Shield lo mantiene listo para auditorías con listas de seguridad y documentos de cumplimiento — Jobber no ofrece esto.',
    toolTimeAssistantTitle: 'Asistente ToolTime',
    toolTimeAssistantDesc: 'Captura de clientes con IA 24/7 por solo $19/mes. Jobber cobra $349+/mes por funcionalidad similar.',
    builtForGrowingTeams: 'Diseñado para Equipos en Crecimiento',
    builtForGrowingTeamsDesc: 'Nuestro plan de $79 incluye 30 usuarios. El plan de $349 de Jobber solo incluye 15. Haga los cálculos.',
    realWorldCost: 'Comparación de Costos Reales',
    realWorldCostSubtitle: 'Vea cuánto podría ahorrar según el tamaño de su equipo.',
    soloContractor: 'Contratista Independiente',
    fivePersonTeam: 'Equipo de 5 + Complementos',
    fifteenPersonTeam: 'Equipo de 15 + Todas las Funciones',
    savePerYear: 'Ahorre',
    perYear: '/año',
    faq: 'Preguntas Frecuentes',
    faqMigrate: '¿Puedo migrar mis datos de Jobber a ToolTime Pro?',
    faqMigrateAnswer: '¡Sí! Nuestro equipo puede ayudarle a migrar sus datos de clientes, historial de trabajos y configuraciones. Con nuestra Configuración Premium ($349), manejamos toda la migración por usted.',
    faqMobileApp: '¿ToolTime Pro tiene una aplicación móvil?',
    faqMobileAppAnswer: 'Sí, nuestra App para Trabajadores está disponible en iOS y Android. Incluye registro GPS de entrada/salida, detalles del trabajo, información del cliente y la capacidad de cobrar pagos en el sitio.',
    faqAssistant: '¿Qué es el Asistente ToolTime?',
    faqAssistantAnswer: 'El Asistente ToolTime es nuestro chatbot con IA que captura clientes 24/7, responde preguntas y puede agendar citas — incluso cuando usted está dormido o en un trabajo. Está disponible como complemento de $19/mes en cualquier plan.',
    faqFreeTrial: '¿Hay una prueba gratis?',
    faqFreeTrialAnswer: '¡Sí! Todos los planes incluyen una prueba gratis de 14 días sin tarjeta de crédito requerida. Pruebe todo antes de comprometerse.',
    faqHelp: '¿Qué pasa si necesito ayuda para comenzar?',
    faqHelpAnswer: 'Ofrecemos Incorporación Asistida ($149) donde le ayudamos a configurar su cuenta, o Configuración Premium ($349) donde hacemos todo por usted, incluyendo migración de datos y capacitación del equipo.',
    faqQuickbooks: '¿ToolTime Pro se integra con QuickBooks?',
    faqQuickbooksAnswer: '¡Sí! Nuestro complemento de Sincronización con QuickBooks ($12/mes) sincroniza automáticamente sus facturas, pagos y gastos con QuickBooks Online.',
    readyToSave: '¿Listo para Ahorrar $1,000+ Por Año?',
    readyToSaveSubtitle: 'Únase a cientos de contratistas que cambiaron de Jobber a ToolTime Pro.',
    startYourFreeTrial: 'Comience Su Prueba Gratis →',
    scheduleDemo: 'Agendar una Demo',
    noCreditCard: 'Prueba gratis de 14 días • Sin tarjeta de crédito • Cancele cuando quiera',
    footerDesc: 'La plataforma todo-en-uno para negocios de servicios. Sitio web, agenda, app para trabajadores, RH y cumplimiento — nosotros lo configuramos, usted maneja su negocio.',
    product: 'Producto',
    company: 'Empresa',
    login: 'Iniciar Sesión',
    signUp: 'Registrarse',
    contact: 'Contacto',
    allRightsReserved: '© 2026 ToolTime Pro. Todos los derechos reservados.',
  },
};

const industriesList = [
  { href: '/industries/landscaping', icon: '🌳', name: 'Landscaping', nameEs: 'Paisajismo' },
  { href: '/industries/lawn-care', icon: '🌱', name: 'Lawn Care', nameEs: 'Cuidado de Césped' },
  { href: '/industries/pool-service', icon: '🏊', name: 'Pool Service', nameEs: 'Servicio de Piscinas' },
  { href: '/industries/plumbing', icon: '🔧', name: 'Plumbing', nameEs: 'Plomería' },
  { href: '/industries/electrical', icon: '⚡', name: 'Electrical', nameEs: 'Electricidad' },
  { href: '/industries/hvac', icon: '❄️', name: 'HVAC', nameEs: 'HVAC' },
  { href: '/industries/painting', icon: '🎨', name: 'Painting', nameEs: 'Pintura' },
  { href: '/industries/cleaning', icon: '🧹', name: 'Cleaning', nameEs: 'Limpieza' },
  { href: '/industries/roofing', icon: '🏠', name: 'Roofing', nameEs: 'Techos' },
  { href: '/industries/pest-control', icon: '🐜', name: 'Pest Control', nameEs: 'Control de Plagas' },
  { href: '/industries/auto-detailing', icon: '🚗', name: 'Auto Detailing', nameEs: 'Detallado de Autos' },
  { href: '/industries/pressure-washing', icon: '💦', name: 'Pressure Washing', nameEs: 'Lavado a Presión' },
  { href: '/industries/flooring', icon: '🪵', name: 'Flooring', nameEs: 'Pisos' },
  { href: '/industries/handyman', icon: '🛠️', name: 'Handyman', nameEs: 'Mantenimiento' },
  { href: '/industries/tree-service', icon: '🌲', name: 'Tree Service', nameEs: 'Servicio de Árboles' },
  { href: '/industries/moving', icon: '📦', name: 'Moving', nameEs: 'Mudanzas' },
  { href: '/industries/junk-removal', icon: '🗑️', name: 'Junk Removal', nameEs: 'Retiro de Basura' },
  { href: '/industries/appliance-repair', icon: '🔌', name: 'Appliance Repair', nameEs: 'Reparación de Electrodomésticos' },
  { href: '/industries/garage-door', icon: '🚪', name: 'Garage Door', nameEs: 'Puertas de Garaje' },
  { href: '/industries/window-cleaning', icon: '🪟', name: 'Window Cleaning', nameEs: 'Limpieza de Ventanas' },
];

export default function CompareJobber() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [industriesOpen, setIndustriesOpen] = useState(false);
  const [language, setLanguage] = useState('en');

  const t = translations[language];

  return (
    <div className="min-h-screen bg-white">
      {/* Promo Banner */}
      <div className="bg-[#1a1a2e] text-white text-center py-2.5 px-4 text-sm">
        <span className="mr-2">🚀</span>
        {t.promoBanner}
        <Link href="/auth/signup" className="text-[#f5a623] font-semibold ml-2 hover:underline">
          {t.startTrial}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 left-0 right-0 bg-white/95 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/">
            <Image
              src="/logo-01262026.png"
              alt="ToolTime Pro"
              width={180}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>

          <div className={`hidden md:flex items-center gap-6 ${mobileMenuOpen ? 'flex' : ''}`}>
            <Link href="/#features" className="text-[#5c5c70] font-medium text-[0.9375rem] hover:text-[#1a1a2e] transition-colors no-underline">{t.features}</Link>
            <div className="relative">
              <button
                onClick={() => setIndustriesOpen(!industriesOpen)}
                className="text-[#5c5c70] font-medium text-[0.9375rem] hover:text-[#1a1a2e] transition-colors flex items-center gap-1"
              >
                {t.industries} <span className="text-xs">▼</span>
              </button>
              {industriesOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50 max-h-[70vh] overflow-y-auto">
                  {industriesList.map((industry) => (
                    <Link key={industry.href} href={industry.href} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                      {industry.icon} {language === 'es' ? industry.nameEs : industry.name}
                    </Link>
                  ))}
                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <Link href="/industries" className="block px-4 py-2 text-sm text-[#f5a623] font-semibold hover:bg-gray-50 no-underline">
                      {t.viewAllIndustries}
                    </Link>
                  </div>
                </div>
              )}
            </div>
            <Link href="/pricing" className="text-[#5c5c70] font-medium text-[0.9375rem] hover:text-[#1a1a2e] transition-colors no-underline">{t.pricing}</Link>
            <div className="relative">
              <button
                onClick={() => setResourcesOpen(!resourcesOpen)}
                className="text-[#5c5c70] font-medium text-[0.9375rem] hover:text-[#1a1a2e] transition-colors flex items-center gap-1"
              >
                {t.resources} <span className="text-xs">▼</span>
              </button>
              {resourcesOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50">
                  <Link href="/tools" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🧰 {t.freeTools}
                  </Link>
                  <Link href="/#demos" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🎮 {t.demos}
                  </Link>
                </div>
              )}
            </div>

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

            <span className="text-[#5c5c70] text-sm flex items-center gap-1">
              📞 1-888-555-0123
            </span>
            <Link
              href="/auth/signup"
              className="bg-[#f5a623] text-[#1a1a2e] px-5 py-2.5 rounded-lg font-semibold text-sm shadow-[0_4px_12px_rgba(245,166,35,0.3)] hover:bg-[#e6991a] hover:-translate-y-0.5 transition-all no-underline"
            >
              {t.startTrial}
            </Link>
          </div>

          <button
            className="md:hidden text-[#1a1a2e] text-2xl bg-transparent border-none cursor-pointer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg p-6 flex flex-col gap-4">
            <Link href="/#features" className="text-[#5c5c70] font-medium hover:text-[#1a1a2e] no-underline">{t.features}</Link>
            <Link href="/tools" className="text-[#5c5c70] font-medium hover:text-[#1a1a2e] no-underline">🧰 {t.freeTools}</Link>
            <Link href="/#demos" className="text-[#5c5c70] font-medium hover:text-[#1a1a2e] no-underline">{t.demos}</Link>
            <Link href="/pricing" className="text-[#5c5c70] font-medium hover:text-[#1a1a2e] no-underline">{t.pricing}</Link>
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setLanguage('en')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${language === 'en' ? 'bg-[#1a1a2e] text-white' : 'bg-gray-100'}`}
              >
                🇺🇸 English
              </button>
              <button
                onClick={() => setLanguage('es')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${language === 'es' ? 'bg-[#1a1a2e] text-white' : 'bg-gray-100'}`}
              >
                🇪🇸 Español
              </button>
            </div>
            <Link href="/auth/signup" className="bg-[#f5a623] text-[#1a1a2e] px-6 py-3 rounded-xl font-medium text-center no-underline">{t.startTrial}</Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="bg-[#1a2e44] text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-amber-400 font-medium mb-4 tracking-wide uppercase text-sm">
            {t.comparisonGuide}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {t.heroTitle}
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            {t.heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/pricing"
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              {t.startTrial}
            </Link>
            <a
              href="#comparison"
              className="border border-white/30 hover:bg-white/10 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              {t.seeFullComparison}
            </a>
          </div>
        </div>
      </section>

      {/* Quick Stats Bar */}
      <section className="bg-[#f8f9fa] border-b py-8 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold text-[#1a2e44]">77%</p>
            <p className="text-gray-600 text-sm">{t.averageSavings}</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#1a2e44]">$7</p>
            <p className="text-gray-600 text-sm">{t.perExtraUser}</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#1a2e44]">2x</p>
            <p className="text-gray-600 text-sm">{t.moreUsersPerPlan}</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#1a2e44]">14 {language === 'es' ? 'Días' : 'Days'}</p>
            <p className="text-gray-600 text-sm">{t.freeTrial}</p>
          </div>
        </div>
      </section>

      {/* Main Comparison Section */}
      <section id="comparison" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-[#1a2e44] mb-4">
            {t.pricingComparison}
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            {t.pricingComparisonSubtitle}
          </p>

          {/* Pricing Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-4 bg-gray-50 font-semibold text-[#1a2e44] rounded-tl-lg">{t.planTier}</th>
                  <th className="p-4 bg-[#1a2e44] text-white font-semibold">
                    <div className="flex items-center justify-center gap-2">
                      <span>🛠️</span>
                      <span>ToolTime Pro</span>
                    </div>
                  </th>
                  <th className="p-4 bg-gray-200 font-semibold text-gray-700 rounded-tr-lg">Jobber</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="p-4 font-medium text-gray-800">{t.soloStarter}</td>
                  <td className="p-4 text-center bg-green-50">
                    <span className="text-2xl font-bold text-green-600">$30</span>
                    <span className="text-gray-500">{t.perMo}</span>
                    <p className="text-sm text-gray-600 mt-1">{t.upToUsers} 2 {t.users}</p>
                  </td>
                  <td className="p-4 text-center bg-gray-50">
                    <span className="text-2xl font-bold text-gray-700">$39-69</span>
                    <span className="text-gray-500">{t.perMo}</span>
                    <p className="text-sm text-gray-600 mt-1">1 {t.userOnly}</p>
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-4 font-medium text-gray-800">{t.smallTeam}</td>
                  <td className="p-4 text-center bg-green-50">
                    <span className="text-2xl font-bold text-green-600">$49</span>
                    <span className="text-gray-500">{t.perMo}</span>
                    <p className="text-sm text-gray-600 mt-1">{t.upToUsers} 15 {t.users}</p>
                  </td>
                  <td className="p-4 text-center bg-gray-50">
                    <span className="text-2xl font-bold text-gray-700">$169</span>
                    <span className="text-gray-500">{t.perMo}</span>
                    <p className="text-sm text-gray-600 mt-1">{t.upToUsers} 5 {t.users}</p>
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-4 font-medium text-gray-800">{t.growingTeam}</td>
                  <td className="p-4 text-center bg-green-50">
                    <span className="text-2xl font-bold text-green-600">$79</span>
                    <span className="text-gray-500">{t.perMo}</span>
                    <p className="text-sm text-gray-600 mt-1">{t.upToUsers} 30 {t.users}</p>
                  </td>
                  <td className="p-4 text-center bg-gray-50">
                    <span className="text-2xl font-bold text-gray-700">$349</span>
                    <span className="text-gray-500">{t.perMo}</span>
                    <p className="text-sm text-gray-600 mt-1">{t.upToUsers} 15 {t.users}</p>
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-4 font-medium text-gray-800">{t.extraUsers}</td>
                  <td className="p-4 text-center bg-green-50">
                    <span className="text-2xl font-bold text-green-600">$7</span>
                    <span className="text-gray-500">{t.perUserPerMo}</span>
                  </td>
                  <td className="p-4 text-center bg-gray-50">
                    <span className="text-2xl font-bold text-gray-700">$29</span>
                    <span className="text-gray-500">{t.perUserPerMo}</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-gray-800">{t.enterprise}</td>
                  <td className="p-4 text-center bg-green-50">
                    <span className="text-lg font-semibold text-green-600">{t.customPricing}</span>
                  </td>
                  <td className="p-4 text-center bg-gray-50">
                    <span className="text-2xl font-bold text-gray-700">$599</span>
                    <span className="text-gray-500">{t.perMo}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Savings Callout */}
          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <p className="text-lg">
              <span className="font-bold text-[#1a2e44]">{t.savingsCallout}</span>
              <span className="text-gray-600"> {t.savingsCalloutSuffix}</span>
            </p>
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-16 px-4 bg-[#f8f9fa]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-[#1a2e44] mb-4">
            {t.featureComparison}
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            {t.featureComparisonSubtitle}
          </p>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-4 font-semibold text-[#1a2e44]">{t.feature}</th>
                  <th className="p-4 font-semibold text-[#1a2e44] text-center w-48">ToolTime Pro</th>
                  <th className="p-4 font-semibold text-gray-500 text-center w-48">Jobber</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <td className="p-4 font-medium text-gray-800">{t.schedulingCalendar}</td>
                  <td className="p-4 text-center text-gray-700">✅ {t.allPlans}</td>
                  <td className="p-4 text-center text-gray-500">✅ {t.allPlans}</td>
                </tr>
                <tr className="border-b border-gray-100 bg-white">
                  <td className="p-4 font-medium text-gray-800">{t.invoicingPayments}</td>
                  <td className="p-4 text-center text-gray-700">✅ {t.allPlans}</td>
                  <td className="p-4 text-center text-gray-500">✅ {t.allPlans}</td>
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <td className="p-4 font-medium text-gray-800">{t.clientManagement}</td>
                  <td className="p-4 text-center text-gray-700">✅ {t.allPlans}</td>
                  <td className="p-4 text-center text-gray-500">✅ {t.allPlans}</td>
                </tr>
                <tr className="border-b border-gray-100 bg-white">
                  <td className="p-4 font-medium text-gray-800">{t.onlineBooking}</td>
                  <td className="p-4 text-center text-gray-700">✅ {t.allPlans}</td>
                  <td className="p-4 text-center text-gray-500">✅ {t.allPlans}</td>
                </tr>
                <tr className="border-b border-gray-100 bg-green-50">
                  <td className="p-4 font-medium text-gray-800">{t.smsNotifications}</td>
                  <td className="p-4 text-center text-green-600 font-medium">✅ {t.allPlans}</td>
                  <td className="p-4 text-center text-gray-500">⚠️ $199+{t.perMo} {language === 'es' ? 'planes' : 'plans'}</td>
                </tr>
                <tr className="border-b border-gray-100 bg-green-50">
                  <td className="p-4 font-medium text-gray-800">{t.teamScheduling}</td>
                  <td className="p-4 text-center text-green-600 font-medium">✅ Pro ($49)</td>
                  <td className="p-4 text-center text-gray-500">⚠️ $169+{t.perMo} {language === 'es' ? 'planes' : 'plans'}</td>
                </tr>
                <tr className="border-b border-gray-100 bg-green-50">
                  <td className="p-4 font-medium text-gray-800">{t.complianceTools}</td>
                  <td className="p-4 text-center text-green-600 font-medium">✅ {t.included}</td>
                  <td className="p-4 text-center text-gray-500">❌ {t.notAvailable}</td>
                </tr>
                <tr className="border-b border-gray-100 bg-green-50">
                  <td className="p-4 font-medium text-gray-800">{t.toolTimeAssistant}</td>
                  <td className="p-4 text-center text-green-600 font-medium">✅ $19{t.perMo} {t.addOn}</td>
                  <td className="p-4 text-center text-gray-500">⚠️ $349+{t.perMo} {language === 'es' ? 'planes' : 'plans'}</td>
                </tr>
                <tr className="border-b border-gray-100 bg-white">
                  <td className="p-4 font-medium text-gray-800">{t.aiPhoneReceptionist}</td>
                  <td className="p-4 text-center text-gray-700">🔜 {t.comingSoon}</td>
                  <td className="p-4 text-center text-gray-500">✅ $349+{t.perMo} {language === 'es' ? 'planes' : 'plans'}</td>
                </tr>
                <tr className="border-b border-gray-100 bg-green-50">
                  <td className="p-4 font-medium text-gray-800">{t.workerMobileApp}</td>
                  <td className="p-4 text-center text-green-600 font-medium">✅ Pro ($49)</td>
                  <td className="p-4 text-center text-gray-500">⚠️ {t.extraCost}</td>
                </tr>
                <tr className="border-b border-gray-100 bg-green-50">
                  <td className="p-4 font-medium text-gray-800">{t.websiteBuilder}</td>
                  <td className="p-4 text-center text-green-600 font-medium">✅ $15{t.perMo} {t.addOn}</td>
                  <td className="p-4 text-center text-gray-500">⚠️ $599{t.perMo} {t.planOnly}</td>
                </tr>
                <tr className="border-b border-gray-100 bg-white">
                  <td className="p-4 font-medium text-gray-800">{t.routeOptimization}</td>
                  <td className="p-4 text-center text-gray-700">🔜 {t.comingSoon}</td>
                  <td className="p-4 text-center text-gray-500">✅ $199+{t.perMo} {language === 'es' ? 'planes' : 'plans'}</td>
                </tr>
                <tr className="bg-green-50">
                  <td className="p-4 font-medium text-gray-800">{t.quickbooksSync}</td>
                  <td className="p-4 text-center text-green-600 font-medium">✅ $12{t.perMo} {t.addOn}</td>
                  <td className="p-4 text-center text-gray-500">⚠️ $169+{t.perMo} {language === 'es' ? 'planes' : 'plans'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Why Switch Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-[#1a2e44] mb-12">
            {t.whyContractorsSwitch}
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-bold text-[#1a2e44] mb-2">{t.save50_77}</h3>
              <p className="text-gray-600">{t.save50_77Desc}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-bold text-[#1a2e44] mb-2">{t.smsBuiltIn}</h3>
              <p className="text-gray-600">{t.smsBuiltInDesc}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-bold text-[#1a2e44] mb-2">{t.affordableTeamGrowth}</h3>
              <p className="text-gray-600">{t.affordableTeamGrowthDesc}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🛡️</div>
              <h3 className="text-xl font-bold text-[#1a2e44] mb-2">{t.complianceIncluded}</h3>
              <p className="text-gray-600">{t.complianceIncludedDesc}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-bold text-[#1a2e44] mb-2">{t.toolTimeAssistantTitle}</h3>
              <p className="text-gray-600">{t.toolTimeAssistantDesc}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-bold text-[#1a2e44] mb-2">{t.builtForGrowingTeams}</h3>
              <p className="text-gray-600">{t.builtForGrowingTeamsDesc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Real Cost Scenarios */}
      <section className="py-16 px-4 bg-[#1a2e44] text-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            {t.realWorldCost}
          </h2>
          <p className="text-gray-300 text-center mb-12 max-w-2xl mx-auto">
            {t.realWorldCostSubtitle}
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
              <h3 className="font-semibold text-lg mb-4">{t.soloContractor}</h3>
              <div className="space-y-2 mb-4">
                <p>
                  <span className="text-gray-400">ToolTime Pro:</span>{' '}
                  <span className="text-green-400 font-bold">$30{t.perMo}</span>
                </p>
                <p>
                  <span className="text-gray-400">Jobber:</span>{' '}
                  <span className="text-gray-300">$69{t.perMo}</span>
                </p>
              </div>
              <div className="bg-amber-500 text-white font-bold py-2 px-4 rounded-lg">
                {t.savePerYear} $468{t.perYear}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
              <h3 className="font-semibold text-lg mb-4">{t.fivePersonTeam}</h3>
              <div className="space-y-2 mb-4">
                <p>
                  <span className="text-gray-400">ToolTime Pro:</span>{' '}
                  <span className="text-green-400 font-bold">$83{t.perMo}</span>
                </p>
                <p>
                  <span className="text-gray-400">Jobber:</span>{' '}
                  <span className="text-gray-300">$169{t.perMo}</span>
                </p>
              </div>
              <div className="bg-amber-500 text-white font-bold py-2 px-4 rounded-lg">
                {t.savePerYear} $1,032{t.perYear}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
              <h3 className="font-semibold text-lg mb-4">{t.fifteenPersonTeam}</h3>
              <div className="space-y-2 mb-4">
                <p>
                  <span className="text-gray-400">ToolTime Pro:</span>{' '}
                  <span className="text-green-400 font-bold">$152{t.perMo}</span>
                </p>
                <p>
                  <span className="text-gray-400">Jobber:</span>{' '}
                  <span className="text-gray-300">$349+{t.perMo}</span>
                </p>
              </div>
              <div className="bg-amber-500 text-white font-bold py-2 px-4 rounded-lg">
                {t.savePerYear} $2,364+{t.perYear}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-[#1a2e44] mb-12">
            {t.faq}
          </h2>

          <div className="space-y-6">
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-[#1a2e44] mb-2">{t.faqMigrate}</h3>
              <p className="text-gray-600">{t.faqMigrateAnswer}</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-[#1a2e44] mb-2">{t.faqMobileApp}</h3>
              <p className="text-gray-600">{t.faqMobileAppAnswer}</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-[#1a2e44] mb-2">{t.faqAssistant}</h3>
              <p className="text-gray-600">{t.faqAssistantAnswer}</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-[#1a2e44] mb-2">{t.faqFreeTrial}</h3>
              <p className="text-gray-600">{t.faqFreeTrialAnswer}</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-[#1a2e44] mb-2">{t.faqHelp}</h3>
              <p className="text-gray-600">{t.faqHelpAnswer}</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-[#1a2e44] mb-2">{t.faqQuickbooks}</h3>
              <p className="text-gray-600">{t.faqQuickbooksAnswer}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-amber-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t.readyToSave}
          </h2>
          <p className="text-white/90 text-lg mb-8">
            {t.readyToSaveSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/pricing"
              className="bg-[#1a2e44] hover:bg-[#0f1d2d] text-white font-semibold py-4 px-8 rounded-lg transition-colors text-lg"
            >
              {t.startYourFreeTrial}
            </Link>
            <Link
              href="/contact"
              className="bg-white hover:bg-gray-100 text-[#1a2e44] font-semibold py-4 px-8 rounded-lg transition-colors text-lg"
            >
              {t.scheduleDemo}
            </Link>
          </div>
          <p className="text-white/70 text-sm mt-6">
            {t.noCreditCard}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#12121f] text-white py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <Link href="/" className="inline-block mb-4">
                <Image
                  src="/logo-horizontal-white-01262026.png"
                  alt="ToolTime Pro"
                  width={180}
                  height={40}
                  className="h-10 w-auto"
                />
              </Link>
              <p className="text-white/50 text-[0.9375rem] leading-relaxed max-w-[300px]">
                {t.footerDesc}
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-5">{t.product}</h4>
              <div className="flex flex-col gap-3">
                <Link href="/#features" className="text-white/50 text-[0.9375rem] hover:text-[#f5a623] transition-colors no-underline">{t.features}</Link>
                <Link href="/#pricing" className="text-white/50 text-[0.9375rem] hover:text-[#f5a623] transition-colors no-underline">{t.pricing}</Link>
                <Link href="/#demos" className="text-white/50 text-[0.9375rem] hover:text-[#f5a623] transition-colors no-underline">{t.demos}</Link>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-white mb-5">{t.company}</h4>
              <div className="flex flex-col gap-3">
                <Link href="/auth/login" className="text-white/50 text-[0.9375rem] hover:text-[#f5a623] transition-colors no-underline">{t.login}</Link>
                <Link href="/auth/signup" className="text-white/50 text-[0.9375rem] hover:text-[#f5a623] transition-colors no-underline">{t.signUp}</Link>
                <a href="mailto:support@tooltimepro.com" className="text-white/50 text-[0.9375rem] hover:text-[#f5a623] transition-colors no-underline">{t.contact}</a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-white/40 text-[0.875rem]">
            {t.allRightsReserved}
          </div>
        </div>
      </footer>

      {/* Schema Markup for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "ToolTime Pro vs Jobber: Complete Comparison Guide",
            "description": "Compare ToolTime Pro and Jobber pricing, features, and value. See why contractors save 50-77% by switching to ToolTime Pro.",
            "author": {
              "@type": "Organization",
              "name": "ToolTime Pro"
            }
          })
        }}
      />
    </div>
  );
}
