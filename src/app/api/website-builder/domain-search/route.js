import { NextResponse } from 'next/server';
import { searchDomains, checkDomain, generateDomainSuggestions } from '@/lib/namecom';

export async function POST(request) {
  try {
    const body = await request.json();
    const { businessName, state } = body;

    if (!businessName || typeof businessName !== 'string') {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 });
    }
    if (businessName.trim().length < 2) {
      return NextResponse.json({ error: 'Business name must be at least 2 characters' }, { status: 400 });
    }
    if (businessName.trim().length > 100) {
      return NextResponse.json({ error: 'Business name must be under 100 characters' }, { status: 400 });
    }

    // Generate smart suggestions
    const suggestedDomains = generateDomainSuggestions(businessName.trim(), state || 'CA');

    // Check availability for suggestions
    const suggestionsResults = await checkBatchAvailability(suggestedDomains);

    // Keyword search for additional options
    const keyword = businessName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 63);
    let keywordResults = [];
    try {
      const searchData = await searchDomains(keyword);
      keywordResults = searchData.results || [];
    } catch (searchError) {
      console.warn('[Domain Search] Keyword search failed:', searchError.message);
    }

    // Merge and sort
    const allResults = mergeAndSort(suggestionsResults, keywordResults);

    return NextResponse.json({
      suggestions: allResults,
      totalFound: allResults.length,
      availableCount: allResults.filter((d) => d.available).length,
      businessName: businessName.trim(),
      state: state || 'CA',
    });
  } catch (error) {
    console.error('[Domain Search API] Error:', error);
    if (error.status === 401) {
      return NextResponse.json({ error: 'Domain service authentication failed.' }, { status: 500 });
    }
    if (error.status === 429) {
      return NextResponse.json({ error: 'Too many searches. Please wait and try again.' }, { status: 429 });
    }
    return NextResponse.json({ error: 'Failed to search domains. Please try again.' }, { status: 500 });
  }
}

async function checkBatchAvailability(domainNames) {
  if (!domainNames || domainNames.length === 0) return [];
  const chunks = [];
  for (let i = 0; i < domainNames.length; i += 20) {
    chunks.push(domainNames.slice(i, i + 20));
  }
  const results = [];
  for (const chunk of chunks) {
    try {
      const promises = chunk.map(async (domain) => {
        try {
          const result = await checkDomain(domain);
          return {
            domainName: result.domainName,
            available: result.available,
            premium: result.premium,
            price: result.price || '12.99',
            renewalPrice: result.renewalPrice || '12.99',
            source: 'suggestion',
          };
        } catch (err) {
          return { domainName: domain, available: false, premium: false, price: null, source: 'suggestion', error: true };
        }
      });
      const chunkResults = await Promise.allSettled(promises);
      for (const result of chunkResults) {
        if (result.status === 'fulfilled' && !result.value.error) {
          results.push(result.value);
        }
      }
    } catch (error) {
      console.warn('[Domain Search] Batch check failed:', error.message);
    }
  }
  return results;
}

function mergeAndSort(suggestions, keywordResults) {
  const seen = new Set();
  const merged = [];
  for (const domain of suggestions) {
    const key = domain.domainName.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push({ ...domain, rank: getRank(domain) });
    }
  }
  for (const domain of keywordResults) {
    const key = domain.domainName.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push({ ...domain, source: 'keyword_search', rank: getRank(domain) + 100 });
    }
  }
  return merged.sort((a, b) => {
    if (a.available && !b.available) return -1;
    if (!a.available && b.available) return 1;
    if (a.rank !== b.rank) return a.rank - b.rank;
    const priceA = parseFloat(a.price) || 999;
    const priceB = parseFloat(b.price) || 999;
    return priceA - priceB;
  });
}

function getRank(domain) {
  let rank = 50;
  const name = domain.domainName?.toLowerCase() || '';
  if (name.endsWith('.com')) rank -= 30;
  else if (name.endsWith('.net')) rank -= 15;
  else if (name.endsWith('.co')) rank -= 10;
  else if (name.endsWith('.us')) rank -= 5;
  else if (name.endsWith('.pro')) rank -= 5;
  const sld = name.split('.')[0] || '';
  if (sld.length <= 10) rank -= 10;
  else if (sld.length <= 15) rank -= 5;
  else if (sld.length > 25) rank += 10;
  if (!sld.includes('-')) rank -= 5;
  if (domain.premium) rank += 20;
  return rank;
}
