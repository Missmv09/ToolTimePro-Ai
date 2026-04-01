// Netlify Function for AI-powered Multi-State Labor Law Compliance Assistant
// Answers questions about employment law and analyzes workplace situations
const { aiComplete } = require('../../src/lib/ai-client');
const { getComplianceKnowledge, getSupportedStates } = require('../../src/lib/compliance-knowledge');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { question, companySize, context: userContext, state: stateCode } = JSON.parse(event.body);

    if (!question || question.trim().length < 5) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Please provide a more detailed question' }),
      };
    }

    // Default to CA for backwards compatibility, but support all states
    const effectiveState = (stateCode || 'CA').toUpperCase();

    // Inject authoritative compliance knowledge for the user's state + federal
    const complianceKnowledge = getComplianceKnowledge(effectiveState);

    const systemPrompt = `You are an expert employment law compliance assistant for small service businesses (landscaping, HVAC, plumbing, etc.).

You have access to AUTHORITATIVE legal reference data below. You MUST use this data — do NOT rely on your own knowledge for specific statutes, penalty amounts, or deadlines. If the answer is not covered in the reference data, say so and recommend consulting an attorney.

${complianceKnowledge}

Company size thresholds (federal):
- 1-14 employees: Basic federal requirements
- 15+ employees: Title VII, ADA apply
- 20+ employees: ADEA applies
- 25+ employees: E-Verify may be required (state-dependent)
- 50+ employees: FMLA/CFRA, ACA employer mandate

Guidelines:
1. Give clear, actionable answers with specific statute citations
2. Mention specific dollar amounts or timeframes from the reference data
3. Flag potential violations with "⚠️ WARNING"
4. If the question involves penalties, cite the exact penalty from the reference data
5. Always recommend consulting an employment attorney for complex situations
6. Keep answers concise but complete (2-3 paragraphs max)
7. Format with bullet points when listing multiple items
8. Always specify which state's law you are referencing

IMPORTANT: You provide general information, not legal advice. Always include a disclaimer.
Supported states: ${getSupportedStates().join(', ')}`;

    const userPrompt = `State: ${effectiveState}
Company Size: ${companySize || 'Unknown'}
${userContext ? `Additional Context: ${userContext}\n` : ''}
Question: ${question}

Provide a helpful, accurate response citing specific statutes and penalty amounts from the reference data.`;

    // Call AI (Claude primary — better for nuanced legal guidance)
    const aiResult = await aiComplete({
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 800,
      temperature: 0.3, // Lower temperature for factual accuracy
      tier: 'high',
    });

    const answer = aiResult.content;

    // Check if the answer contains warnings
    const hasWarning = answer.includes('WARNING') || answer.includes('⚠️') ||
                       answer.toLowerCase().includes('violation') ||
                       answer.toLowerCase().includes('penalty');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        answer: answer,
        hasWarning: hasWarning,
        disclaimer: 'This is general information, not legal advice. Consult an employment attorney for specific situations.'
      }),
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to process your question' }),
    };
  }
};
