// Netlify Function for AI-powered California Labor Law Compliance Assistant
// Answers questions about employment law and analyzes workplace situations

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
    const { question, companySize, context: userContext } = JSON.parse(event.body);

    if (!question || question.trim().length < 5) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Please provide a more detailed question' }),
      };
    }

    // Build the system prompt with California labor law knowledge
    const systemPrompt = `You are an expert California employment law compliance assistant for small service businesses (landscaping, HVAC, plumbing, etc.).

Your knowledge includes:
- California minimum wage: $16.50/hour statewide (2025), higher in many cities
- Overtime: 1.5x after 8 hours/day or 40 hours/week, 2x after 12 hours/day
- Meal breaks: 30 min unpaid after 5 hours, second after 10 hours
- Rest breaks: 10 min paid per 4 hours worked
- Final pay: Immediate if fired, within 72 hours if quit (or immediate with 72hr notice)
- Sick leave: Minimum 5 days/40 hours per year (2024 law)
- Heat illness prevention: Required for outdoor workers
- Workers' comp: Required for all employers with employees

Company size thresholds:
- 1-4 employees: Basic requirements
- 5+ employees: Sexual harassment training required
- 15+ employees: FEHA discrimination laws apply
- 25+ employees: Must provide sick leave for family care
- 50+ employees: FMLA/CFRA leave requirements

Local minimum wages (2025) - many cities have higher rates:
- Los Angeles: $17.28
- San Francisco: $18.67
- San Jose: $17.55
- Oakland: $16.50
- Berkeley: $18.67

Guidelines:
1. Give clear, actionable answers
2. Mention specific dollar amounts or timeframes when relevant
3. Flag potential violations with "⚠️ WARNING"
4. If the question involves penalties, estimate potential costs
5. Always recommend consulting an employment attorney for complex situations
6. Keep answers concise but complete (2-3 paragraphs max)
7. Format with bullet points when listing multiple items

IMPORTANT: You provide general information, not legal advice. Always include a disclaimer for complex situations.`;

    const userPrompt = `Company Size: ${companySize || 'Unknown'}
${userContext ? `Additional Context: ${userContext}\n` : ''}
Question: ${question}

Provide a helpful, accurate response about California labor law compliance.`;

    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'AI service error' }),
      };
    }

    const data = await response.json();
    const answer = data.choices[0].message.content.trim();

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
      body: JSON.stringify({ error: 'Failed to process your question' }),
    };
  }
};
