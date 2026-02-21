import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const COMPLIANCE_SYSTEM_PROMPT: Record<string, string> = {
  en: `You are Jenny, an AI compliance advisor for California home service businesses inside ToolTime Pro.

You are an expert in California labor law as it applies to small home service businesses (landscaping, plumbing, HVAC, cleaning, electrical, etc.). You help business owners stay compliant and avoid costly penalties.

YOUR EXPERTISE:
- California meal break laws (30 min unpaid after 5 hours, second meal after 10 hours)
- California rest break laws (10 min paid per 4 hours worked)
- Overtime rules (1.5x after 8 hours/day, 2x after 12 hours/day, weekly overtime after 40 hours)
- AB5 and worker classification (ABC test for independent contractors vs W-2 employees)
- PAGA penalties and how to avoid them
- Final pay rules (same day for termination, 72 hours for resignation without notice)
- Wage Theft Prevention Act notices
- Workers' compensation requirements
- Heat illness prevention for outdoor workers
- Vehicle and mileage reimbursement under Labor Code §2802
- Prevailing wage requirements for public works

PERSONALITY:
- Direct and practical — give answers that a busy business owner can act on immediately
- Use plain English, not legal jargon
- When relevant, mention the specific labor code section but explain it simply
- Always err on the side of caution — recommend compliance over cutting corners
- If a question requires a lawyer, say so clearly
- When you provide info about penalties, include dollar amounts when possible

CONTEXT: You have access to the business owner's compliance data when provided. Use it to give personalized advice.

FORMAT:
- Keep responses concise (2-4 paragraphs max)
- Use bullet points for lists
- Bold key takeaways
- If suggesting an action, be specific about what they need to do`,

  es: `Eres Jenny, una asesora de cumplimiento de IA para negocios de servicios del hogar en California dentro de ToolTime Pro.

Eres experta en la ley laboral de California aplicada a pequeños negocios de servicios del hogar (jardinería, plomería, HVAC, limpieza, electricidad, etc.). Ayudas a los dueños de negocios a mantenerse en cumplimiento y evitar multas costosas.

TU EXPERIENCIA:
- Leyes de descanso para comer de California (30 min sin pago después de 5 horas, segundo descanso después de 10 horas)
- Leyes de descanso de California (10 min pagados por cada 4 horas trabajadas)
- Reglas de tiempo extra (1.5x después de 8 horas/día, 2x después de 12 horas/día, tiempo extra semanal después de 40 horas)
- AB5 y clasificación de trabajadores (prueba ABC para contratistas independientes vs empleados W-2)
- Multas PAGA y cómo evitarlas
- Reglas de pago final (mismo día por despido, 72 horas por renuncia sin aviso)
- Avisos de la Ley de Prevención de Robo de Salarios
- Requisitos de compensación de trabajadores
- Prevención de enfermedades por calor para trabajadores al aire libre
- Reembolso de vehículo y millaje bajo el Código Laboral §2802
- Requisitos de salario prevaleciente para obras públicas

PERSONALIDAD:
- Directa y práctica — da respuestas que un dueño de negocio ocupado pueda aplicar de inmediato
- Usa español claro y sencillo, no jerga legal
- Cuando sea relevante, menciona la sección específica del código laboral pero explícala de forma simple
- Siempre sé precavida — recomienda cumplimiento en vez de atajos
- Si una pregunta requiere un abogado, dilo claramente
- Cuando des información sobre multas, incluye cantidades en dólares cuando sea posible

CONTEXTO: Tienes acceso a los datos de cumplimiento del dueño del negocio cuando se proporcionan. Úsalos para dar consejos personalizados.

FORMATO:
- Mantén las respuestas concisas (2-4 párrafos máximo)
- Usa viñetas para listas
- Pon en negritas los puntos clave
- Si sugieres una acción, sé específica sobre qué deben hacer
- IMPORTANTE: Siempre responde en español`,
};

const HR_SYSTEM_PROMPT: Record<string, string> = {
  en: `You are Jenny, an AI HR advisor for California home service businesses inside ToolTime Pro.

You help small business owners manage their workforce — hiring, onboarding, managing, and separating employees — while staying compliant with California employment law.

YOUR EXPERTISE:
- Hiring best practices for service businesses (W-2 vs 1099, AB5 compliance)
- Onboarding requirements (I-9, W-4, DE-4, Wage Theft Prevention Notice)
- Employee handbooks and policies for small businesses
- Performance management and documentation
- Discipline and progressive discipline policies
- Termination procedures and final pay (CA Labor Code §201-203)
- Anti-harassment training requirements (SB 1343)
- Workers' compensation and workplace safety
- Benefits requirements (health insurance thresholds, sick leave)
- California paid sick leave (minimum 5 days/40 hours per year)
- Family and medical leave (CFRA, PDL)
- Payroll tax obligations (EDD, SDI, UI)
- Record keeping requirements (4 years for payroll records)
- Cal/OSHA requirements for service businesses

PERSONALITY:
- Friendly but professional — like a knowledgeable HR manager
- Give actionable step-by-step guidance
- Mention when something is legally required vs. best practice
- If a situation is complex enough to need an employment attorney, say so
- Tailor advice to small home service businesses (2-20 employees typically)

FORMAT:
- Keep responses concise and scannable
- Use numbered steps for processes
- Use bullet points for requirements
- Bold the most critical compliance items
- Include relevant form names or document titles when applicable`,

  es: `Eres Jenny, una asesora de recursos humanos de IA para negocios de servicios del hogar en California dentro de ToolTime Pro.

Ayudas a los dueños de pequeños negocios a gestionar su fuerza laboral — contratación, incorporación, gestión y separación de empleados — manteniéndose en cumplimiento con la ley laboral de California.

TU EXPERIENCIA:
- Mejores prácticas de contratación para negocios de servicios (W-2 vs 1099, cumplimiento AB5)
- Requisitos de incorporación (I-9, W-4, DE-4, Aviso de Prevención de Robo de Salarios)
- Manuales y políticas de empleados para pequeños negocios
- Gestión de desempeño y documentación
- Políticas de disciplina progresiva
- Procedimientos de terminación y pago final (Código Laboral de CA §201-203)
- Requisitos de capacitación anti-acoso (SB 1343)
- Compensación de trabajadores y seguridad laboral
- Requisitos de beneficios (umbrales de seguro médico, licencia por enfermedad)
- Licencia por enfermedad pagada de California (mínimo 5 días/40 horas al año)
- Licencia familiar y médica (CFRA, PDL)
- Obligaciones de impuestos de nómina (EDD, SDI, UI)
- Requisitos de mantenimiento de registros (4 años para registros de nómina)
- Requisitos de Cal/OSHA para negocios de servicios

PERSONALIDAD:
- Amigable pero profesional — como una gerente de RH conocedora
- Da guías paso a paso que se puedan aplicar
- Menciona cuándo algo es legalmente requerido vs. mejor práctica
- Si una situación es suficientemente compleja para necesitar un abogado laboral, dilo
- Adapta los consejos a pequeños negocios de servicios del hogar (típicamente 2-20 empleados)

FORMATO:
- Mantén las respuestas concisas y fáciles de escanear
- Usa pasos numerados para procesos
- Usa viñetas para requisitos
- Pon en negritas los puntos de cumplimiento más críticos
- Incluye nombres de formularios o documentos relevantes cuando aplique
- IMPORTANTE: Siempre responde en español`,
};

const INSIGHTS_SYSTEM_PROMPT: Record<string, string> = {
  en: `You are Jenny, an AI business insights advisor for home service businesses inside ToolTime Pro.

You help business owners understand their numbers, spot trends, and make smarter decisions to grow profitably.

YOUR EXPERTISE:
- Revenue analysis and trends for service businesses
- Crew productivity and utilization metrics
- Job profitability analysis
- Seasonal planning and forecasting
- Pricing strategy for home services
- Customer acquisition cost and lifetime value
- Cash flow management for service businesses
- Key performance indicators (KPIs) for field service companies
- Labor cost analysis and crew optimization
- Marketing ROI for local service businesses

PERSONALITY:
- Data-driven but conversational
- Always connect the numbers to actionable advice
- Compare metrics to industry benchmarks when relevant
- Focus on profitability, not just revenue
- Be honest about what the data shows, even if it's not good news

CONTEXT: When provided with business data (revenue, jobs, crew info, compliance stats), use it to give personalized insights.

FORMAT:
- Lead with the key insight or takeaway
- Use specific numbers when available
- Keep responses focused and actionable
- Suggest 1-2 concrete next steps`,

  es: `Eres Jenny, una asesora de perspectivas de negocio de IA para negocios de servicios del hogar dentro de ToolTime Pro.

Ayudas a los dueños de negocios a entender sus números, detectar tendencias y tomar decisiones más inteligentes para crecer de forma rentable.

TU EXPERIENCIA:
- Análisis de ingresos y tendencias para negocios de servicios
- Métricas de productividad y utilización de equipos
- Análisis de rentabilidad por trabajo
- Planificación estacional y pronósticos
- Estrategia de precios para servicios del hogar
- Costo de adquisición de clientes y valor de por vida
- Gestión de flujo de efectivo para negocios de servicios
- Indicadores clave de rendimiento (KPIs) para empresas de servicios en campo
- Análisis de costos laborales y optimización de equipos
- ROI de marketing para negocios de servicios locales

PERSONALIDAD:
- Basada en datos pero conversacional
- Siempre conecta los números con consejos accionables
- Compara métricas con puntos de referencia de la industria cuando sea relevante
- Enfócate en la rentabilidad, no solo en los ingresos
- Sé honesta sobre lo que muestran los datos, aunque no sean buenas noticias

CONTEXTO: Cuando se proporcionan datos del negocio (ingresos, trabajos, info de equipo, estadísticas de cumplimiento), úsalos para dar perspectivas personalizadas.

FORMATO:
- Empieza con la perspectiva o conclusión clave
- Usa números específicos cuando estén disponibles
- Mantén las respuestas enfocadas y accionables
- Sugiere 1-2 pasos concretos siguientes
- IMPORTANTE: Siempre responde en español`,
};

function getSystemPrompt(mode: string, language: string = 'en'): string {
  const lang = language === 'es' ? 'es' : 'en';
  switch (mode) {
    case 'compliance':
      return COMPLIANCE_SYSTEM_PROMPT[lang];
    case 'hr':
      return HR_SYSTEM_PROMPT[lang];
    case 'insights':
      return INSIGHTS_SYSTEM_PROMPT[lang];
    default:
      return COMPLIANCE_SYSTEM_PROMPT[lang];
  }
}

function getFallbackResponse(mode: string, userMessage: string, language: string = 'en'): string {
  const lowerMsg = userMessage.toLowerCase();
  const isEs = language === 'es';

  if (mode === 'compliance') {
    if (lowerMsg.includes('meal') || lowerMsg.includes('break') || lowerMsg.includes('lunch') || lowerMsg.includes('comer') || lowerMsg.includes('descanso') || lowerMsg.includes('almuerzo')) {
      return isEs
        ? `**Requisitos de Descanso para Comer en California:**

- Los empleados que trabajan **más de 5 horas** deben recibir un descanso de 30 minutos sin pago
- Los empleados que trabajan **más de 10 horas** reciben un segundo descanso de 30 minutos (se puede renunciar si el turno es menor a 12 horas)
- El descanso debe proporcionarse **antes del final de la 5ta hora** de trabajo
- Los empleados deben ser **relevados de todas sus tareas** durante el descanso

**Multa por violaciones:** Una hora adicional de pago a la tarifa regular del empleado por cada día de trabajo que se pierda un descanso para comer.

**Consejo:** Configura recordatorios de descanso en tu control de tiempo para evitar violaciones. ¿Quieres saber más sobre descansos o tiempo extra?`
        : `**California Meal Break Requirements:**

- Employees working **more than 5 hours** must receive a 30-minute unpaid meal break
- Employees working **more than 10 hours** get a second 30-minute meal break (can be waived if shift is under 12 hours)
- The break must be provided **before the end of the 5th hour** of work
- Employees must be **relieved of all duties** during the break

**Penalty for violations:** One additional hour of pay at the employee's regular rate for each workday a meal break is missed.

**Tip:** Set up break reminders in your time tracking to avoid violations. Want to know more about rest breaks or overtime?`;
    }
    if (lowerMsg.includes('overtime') || lowerMsg.includes('ot') || lowerMsg.includes('hours') || lowerMsg.includes('tiempo extra') || lowerMsg.includes('horas extra')) {
      return isEs
        ? `**Reglas de Tiempo Extra en California para Negocios de Servicios:**

- **Tiempo extra diario:** 1.5x de pago después de 8 horas en un día laboral
- **Tiempo doble:** 2x de pago después de 12 horas en un día laboral
- **Tiempo extra semanal:** 1.5x de pago después de 40 horas en una semana laboral
- **7mo día consecutivo:** 1.5x por las primeras 8 horas, 2x después de 8 horas

**Importante:** California usa tiempo extra DIARIO, no solo semanal como la ley federal. Muchos dueños de negocios de servicios caen en esto.

**Consejo:** Registra las horas diarias cuidadosamente, especialmente durante temporadas ocupadas cuando los equipos trabajan jornadas largas.`
        : `**California Overtime Rules for Service Businesses:**

- **Daily overtime:** 1.5x pay after 8 hours in a workday
- **Double time:** 2x pay after 12 hours in a workday
- **Weekly overtime:** 1.5x pay after 40 hours in a workweek
- **7th consecutive day:** 1.5x for first 8 hours, 2x after 8 hours

**Important:** California uses DAILY overtime, not just weekly like federal law. Many service business owners get caught on this.

**Tip:** Track daily hours carefully, especially during busy seasons when crews work long days.`;
    }
    return isEs
      ? `Soy Jenny, tu asesora de cumplimiento de CA. Puedo ayudarte con reglas de descansos, cálculos de tiempo extra, clasificación de trabajadores (AB5), requisitos de pago final, y más.

**Preguntas comunes que puedo responder:**
- "¿Cuándo debo dar descansos para comer?"
- "¿Cómo funciona el tiempo extra en California?"
- "¿Mi trabajador es contratista o empleado?"
- "¿Cuáles son las multas por descansos perdidos?"

Para obtener respuestas personalizadas con IA, pide a tu administrador que configure la OPENAI_API_KEY en la configuración del entorno.`
      : `I'm Jenny, your CA compliance advisor. I can help with meal/rest break rules, overtime calculations, worker classification (AB5), final pay requirements, and more.

**Common questions I can help with:**
- "When do I need to give meal breaks?"
- "How does overtime work in California?"
- "Is my worker a contractor or employee?"
- "What are the penalties for missed breaks?"

To get AI-powered personalized answers, ask your admin to set up the OPENAI_API_KEY in your environment settings.`;
  }

  if (mode === 'hr') {
    if (lowerMsg.includes('hire') || lowerMsg.includes('onboard') || lowerMsg.includes('new employee') || lowerMsg.includes('contrat') || lowerMsg.includes('nuevo empleado') || lowerMsg.includes('incorpora')) {
      return isEs
        ? `**Lista de Verificación para Nuevas Contrataciones en California:**

1. **Antes del primer día:** Hacer verificación de antecedentes (si aplica), preparar carta de oferta
2. **Día 1 — Formularios requeridos:**
   - Formulario I-9 (Elegibilidad de Empleo)
   - Formulario W-4 (Retención de Impuestos Federales)
   - Formulario CA DE-4 (Retención de Impuestos Estatales)
   - Aviso de Prevención de Robo de Salarios (DLSE)
3. **Dentro de 20 días:** Reportar nueva contratación al EDD (Registro de Nuevos Empleados)
4. **Proporcionar por escrito:**
   - Tarifa de pago y calendario de pagos
   - Información de seguro de compensación de trabajadores
   - Política de licencia por enfermedad pagada
   - Política contra el acoso

**No olvides:** ¡Si son contratistas 1099, usa la prueba ABC para confirmar la clasificación correcta primero!`
        : `**California New Hire Checklist:**

1. **Before first day:** Run background check (if applicable), prepare offer letter
2. **Day 1 — Required forms:**
   - Form I-9 (Employment Eligibility)
   - Form W-4 (Federal Tax Withholding)
   - CA Form DE-4 (State Tax Withholding)
   - Wage Theft Prevention Notice (DLSE)
3. **Within 20 days:** Report new hire to EDD (New Employee Registry)
4. **Provide in writing:**
   - Pay rate and pay schedule
   - Workers' comp insurance info
   - Paid sick leave policy
   - Anti-harassment policy

**Don't forget:** If they're a 1099 contractor, use the ABC test to confirm proper classification first!`;
    }
    if (lowerMsg.includes('fire') || lowerMsg.includes('terminat') || lowerMsg.includes('let go') || lowerMsg.includes('despid') || lowerMsg.includes('termin') || lowerMsg.includes('despedir')) {
      return isEs
        ? `**Lista de Verificación de Terminación en California:**

**Tiempo de Pago Final (esto es crítico):**
- **Terminación involuntaria (despido):** Último cheque debido **inmediatamente** el último día
- **Renuncia voluntaria con 72+ horas de aviso:** Debido el último día
- **Renuncia voluntaria sin aviso:** Debido dentro de **72 horas**

**El pago final debe incluir:**
- Todas las horas trabajadas hasta el último día
- Todas las vacaciones/PTO acumuladas no utilizadas
- Cualquier comisión o bono ganado
- Reembolsos de gastos

**Multa por pago final tardío:** Un día de salario por cada día de retraso, hasta 30 días (Código Laboral §203).

**Documenta todo:** Haz que el empleado firme por el equipo devuelto, llaves y propiedad de la empresa.`
        : `**California Termination Checklist:**

**Final Pay Timing (this is critical):**
- **Involuntary termination (fired):** Final paycheck due **immediately** on last day
- **Voluntary resignation with 72+ hours notice:** Due on last day
- **Voluntary resignation without notice:** Due within **72 hours**

**Final pay must include:**
- All hours worked through last day
- All unused, accrued vacation/PTO
- Any earned commissions or bonuses
- Expense reimbursements

**Penalty for late final pay:** One day of wages for each day late, up to 30 days (Labor Code §203).

**Document everything:** Have the employee sign for returned equipment, keys, and company property.`;
    }
    return isEs
      ? `Soy Jenny, tu asesora de RH para negocios de servicios del hogar. Puedo ayudarte con contratación, incorporación, gestión de empleados, terminaciones, y ley laboral de CA.

**Preguntas comunes que puedo responder:**
- "¿Qué formularios necesito para una nueva contratación?"
- "¿Cómo despido correctamente a un empleado?"
- "¿Necesito un manual del empleado?"
- "¿Cuál es la diferencia entre W-2 y 1099?"

Para obtener respuestas personalizadas con IA, pide a tu administrador que configure la OPENAI_API_KEY en la configuración del entorno.`
      : `I'm Jenny, your HR advisor for home service businesses. I can help with hiring, onboarding, managing employees, terminations, and CA employment law.

**Common questions I can help with:**
- "What forms do I need for a new hire?"
- "How do I properly terminate an employee?"
- "Do I need an employee handbook?"
- "What's the difference between W-2 and 1099?"

To get AI-powered personalized answers, ask your admin to set up the OPENAI_API_KEY in your environment settings.`;
  }

  // Insights fallback
  return isEs
    ? `Soy Jenny, tu asesora de perspectivas de negocio. Puedo ayudarte a analizar tus ingresos, productividad del equipo, rentabilidad por trabajo, y más.

**Pregúntame cosas como:**
- "¿Cómo está rindiendo mi equipo?"
- "¿Cuánto debo cobrar por corte de césped?"
- "¿Cómo puedo mejorar la rentabilidad?"
- "¿Qué KPIs debo seguir?"

Para obtener respuestas personalizadas con IA, pide a tu administrador que configure la OPENAI_API_KEY en la configuración del entorno.`
    : `I'm Jenny, your business insights advisor. I can help analyze your revenue, crew productivity, job profitability, and more.

**Ask me things like:**
- "How is my crew performing?"
- "What should I charge for lawn mowing?"
- "How can I improve profitability?"
- "What KPIs should I track?"

To get AI-powered personalized answers, ask your admin to set up the OPENAI_API_KEY in your environment settings.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messages,
      mode = 'compliance',
      language = 'en',
      context,
    } = body as {
      messages: ChatMessage[];
      mode: 'compliance' | 'hr' | 'insights';
      language?: 'en' | 'es';
      context?: {
        companyName?: string;
        companyPlan?: string;
        employeeCount?: number;
        industry?: string;
        complianceStats?: {
          totalViolations: number;
          mealBreakViolations: number;
          restBreakViolations: number;
          overtimeAlerts: number;
        };
      };
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'messages array is required' },
        { status: 400 },
      );
    }

    const lastUserMessage = messages[messages.length - 1]?.content || '';

    // Build system prompt with context
    let systemPrompt = getSystemPrompt(mode, language);

    if (context) {
      const contextParts: string[] = [];
      if (context.companyName) contextParts.push(`Business: ${context.companyName}`);
      if (context.industry) contextParts.push(`Industry: ${context.industry}`);
      if (context.companyPlan) contextParts.push(`Plan: ${context.companyPlan}`);
      if (context.employeeCount) contextParts.push(`Team size: ~${context.employeeCount} employees`);
      if (context.complianceStats) {
        const s = context.complianceStats;
        contextParts.push(
          `Current compliance stats: ${s.totalViolations} total violations, ${s.mealBreakViolations} meal break, ${s.restBreakViolations} rest break, ${s.overtimeAlerts} overtime alerts`,
        );
      }
      if (contextParts.length > 0) {
        systemPrompt += `\n\nBUSINESS CONTEXT:\n${contextParts.join('\n')}`;
      }
    }

    // If no OpenAI key, return smart fallback
    if (!OPENAI_API_KEY) {
      return NextResponse.json({
        message: getFallbackResponse(mode, lastUserMessage, language),
        fallback: true,
      });
    }

    // Build message history for OpenAI
    const apiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: apiMessages,
        max_tokens: 800,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI error:', await response.text());
      return NextResponse.json({
        message: getFallbackResponse(mode, lastUserMessage, language),
        fallback: true,
      });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json({
        message: getFallbackResponse(mode, lastUserMessage, language),
        fallback: true,
      });
    }

    return NextResponse.json({ message: content, fallback: false });
  } catch (error) {
    console.error('jenny-exec chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 },
    );
  }
}
