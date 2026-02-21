import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const COMPLIANCE_SYSTEM_PROMPT = `You are Jenny, an AI compliance advisor for California home service businesses inside ToolTime Pro.

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
- If suggesting an action, be specific about what they need to do`;

const HR_SYSTEM_PROMPT = `You are Jenny, an AI HR advisor for California home service businesses inside ToolTime Pro.

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
- Include relevant form names or document titles when applicable`;

const INSIGHTS_SYSTEM_PROMPT = `You are Jenny, an AI business insights advisor for home service businesses inside ToolTime Pro.

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
- Suggest 1-2 concrete next steps`;

function getSystemPrompt(mode: string): string {
  switch (mode) {
    case 'compliance':
      return COMPLIANCE_SYSTEM_PROMPT;
    case 'hr':
      return HR_SYSTEM_PROMPT;
    case 'insights':
      return INSIGHTS_SYSTEM_PROMPT;
    default:
      return COMPLIANCE_SYSTEM_PROMPT;
  }
}

function getFallbackResponse(mode: string, userMessage: string): string {
  const lowerMsg = userMessage.toLowerCase();

  if (mode === 'compliance') {
    if (lowerMsg.includes('meal') || lowerMsg.includes('break') || lowerMsg.includes('lunch')) {
      return `**California Meal Break Requirements:**

- Employees working **more than 5 hours** must receive a 30-minute unpaid meal break
- Employees working **more than 10 hours** get a second 30-minute meal break (can be waived if shift is under 12 hours)
- The break must be provided **before the end of the 5th hour** of work
- Employees must be **relieved of all duties** during the break

**Penalty for violations:** One additional hour of pay at the employee's regular rate for each workday a meal break is missed.

**Tip:** Set up break reminders in your time tracking to avoid violations. Want to know more about rest breaks or overtime?`;
    }
    if (lowerMsg.includes('overtime') || lowerMsg.includes('ot') || lowerMsg.includes('hours')) {
      return `**California Overtime Rules for Service Businesses:**

- **Daily overtime:** 1.5x pay after 8 hours in a workday
- **Double time:** 2x pay after 12 hours in a workday
- **Weekly overtime:** 1.5x pay after 40 hours in a workweek
- **7th consecutive day:** 1.5x for first 8 hours, 2x after 8 hours

**Important:** California uses DAILY overtime, not just weekly like federal law. Many service business owners get caught on this.

**Tip:** Track daily hours carefully, especially during busy seasons when crews work long days.`;
    }
    return `I'm Jenny, your CA compliance advisor. I can help with meal/rest break rules, overtime calculations, worker classification (AB5), final pay requirements, and more.

**Common questions I can help with:**
- "When do I need to give meal breaks?"
- "How does overtime work in California?"
- "Is my worker a contractor or employee?"
- "What are the penalties for missed breaks?"

To get AI-powered personalized answers, ask your admin to set up the OPENAI_API_KEY in your environment settings.`;
  }

  if (mode === 'hr') {
    if (lowerMsg.includes('hire') || lowerMsg.includes('onboard') || lowerMsg.includes('new employee')) {
      return `**California New Hire Checklist:**

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
    if (lowerMsg.includes('fire') || lowerMsg.includes('terminat') || lowerMsg.includes('let go')) {
      return `**California Termination Checklist:**

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
    return `I'm Jenny, your HR advisor for home service businesses. I can help with hiring, onboarding, managing employees, terminations, and CA employment law.

**Common questions I can help with:**
- "What forms do I need for a new hire?"
- "How do I properly terminate an employee?"
- "Do I need an employee handbook?"
- "What's the difference between W-2 and 1099?"

To get AI-powered personalized answers, ask your admin to set up the OPENAI_API_KEY in your environment settings.`;
  }

  // Insights fallback
  return `I'm Jenny, your business insights advisor. I can help analyze your revenue, crew productivity, job profitability, and more.

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
      context,
    } = body as {
      messages: ChatMessage[];
      mode: 'compliance' | 'hr' | 'insights';
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
    let systemPrompt = getSystemPrompt(mode);

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
        message: getFallbackResponse(mode, lastUserMessage),
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
        message: getFallbackResponse(mode, lastUserMessage),
        fallback: true,
      });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json({
        message: getFallbackResponse(mode, lastUserMessage),
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
