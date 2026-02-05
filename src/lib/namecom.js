/**
 * TOOLTIME PRO — Name.com API Service Layer
 * Complete integration with Name.com registrar API.
 * Auto-detects environment: test API in development, production in production.
 * Auth: HTTP Basic with username:token base64 encoded.
 */

const isProduction = process.env.NODE_ENV === 'production';

const config = {
  baseUrl: isProduction
    ? 'https://api.name.com/v4'
    : 'https://api.dev.name.com/v4',
  username: isProduction
    ? process.env.NAMECOM_USERNAME
    : process.env.NAMECOM_TEST_USERNAME,
  token: isProduction
    ? process.env.NAMECOM_API_TOKEN
    : process.env.NAMECOM_TEST_TOKEN,
};

function getAuthHeader() {
  const credentials = `${config.username}:${config.token}`;
  const encoded = Buffer.from(credentials).toString('base64');
  return `Basic ${encoded}`;
}

async function namecomRequest(endpoint, options = {}) {
  const url = `${config.baseUrl}${endpoint}`;
  const fetchOptions = {
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.message || `Name.com API error: ${response.status}`);
      error.status = response.status;
      error.details = data;
      throw error;
    }
    return data;
  } catch (error) {
    if (error.status) throw error;
    const networkError = new Error(`Name.com API request failed: ${error.message}`);
    networkError.status = 500;
    networkError.details = { originalError: error.message };
    throw networkError;
  }
}

export async function searchDomains(keyword) {
  if (!keyword || typeof keyword !== 'string') {
    throw new Error('Keyword is required for domain search');
  }
  const cleanKeyword = keyword.toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0, 63);
  try {
    const data = await namecomRequest('/domains:search', {
      method: 'POST',
      body: JSON.stringify({
        keyword: cleanKeyword,
        tldFilter: ['com', 'net', 'org', 'co', 'us', 'biz', 'pro'],
        timeout: 5000,
      }),
    });
    const results = (data.results || []).map((domain) => ({
      domainName: domain.domainName,
      available: domain.purchasable === true,
      premium: domain.premium === true,
      price: domain.purchasePrice ? (domain.purchasePrice / 100).toFixed(2) : null,
      renewalPrice: domain.renewalPrice ? (domain.renewalPrice / 100).toFixed(2) : null,
      sld: domain.sld || cleanKeyword,
      tld: domain.tld || domain.domainName?.split('.').pop(),
    }));
    return { results, totalFound: results.length, availableCount: results.filter((d) => d.available).length };
  } catch (error) {
    console.error('[Name.com] Search error:', error.message);
    throw error;
  }
}

export async function checkDomain(domainName) {
  if (!domainName || typeof domainName !== 'string') {
    throw new Error('Domain name is required');
  }
  const clean = domainName.toLowerCase().trim();
  try {
    const data = await namecomRequest('/domains:checkAvailability', {
      method: 'POST',
      body: JSON.stringify({ domainNames: [clean] }),
    });
    const result = data.results?.[0];
    return {
      domainName: clean,
      available: result?.purchasable === true,
      premium: result?.premium === true,
      price: result?.purchasePrice ? (result.purchasePrice / 100).toFixed(2) : null,
      renewalPrice: result?.renewalPrice ? (result.renewalPrice / 100).toFixed(2) : null,
    };
  } catch (error) {
    console.error('[Name.com] Check domain error:', error.message);
    throw error;
  }
}

export async function registerDomain(domainName, contacts) {
  if (!domainName) throw new Error('Domain name is required');
  if (!contacts) throw new Error('Contact information is required');
  const clean = domainName.toLowerCase().trim();
  const contactInfo = {
    firstName: contacts.firstName || 'ToolTime',
    lastName: contacts.lastName || 'Pro',
    companyName: contacts.companyName || '',
    address1: contacts.address1 || contacts.address || '',
    address2: contacts.address2 || '',
    city: contacts.city || '',
    state: contacts.state || 'CA',
    zip: contacts.zip || '',
    country: contacts.country || 'US',
    phone: contacts.phone || '',
    email: contacts.email || '',
  };
  try {
    const data = await namecomRequest('/domains', {
      method: 'POST',
      body: JSON.stringify({
        domain: { domainName: clean, nameservers: [] },
        contacts: {
          registrant: contactInfo,
          admin: contactInfo,
          tech: contactInfo,
          billing: contactInfo,
        },
        privacyEnabled: true,
        autoRenewEnabled: true,
        years: 1,
      }),
    });
    return {
      success: true,
      domainName: clean,
      domain: data.domain,
      expireDate: data.domain?.expireDate,
      autoRenew: data.domain?.autoRenewEnabled,
      locked: data.domain?.locked,
    };
  } catch (error) {
    console.error('[Name.com] Register domain error:', error.message);
    return { success: false, domainName: clean, error: error.message, details: error.details };
  }
}

export async function setDNSRecords(domainName) {
  if (!domainName) throw new Error('Domain name is required');
  const clean = domainName.toLowerCase().trim();
  const records = [];
  const errors = [];
  try {
    const aRecord = await namecomRequest(`/domains/${clean}/records`, {
      method: 'POST',
      body: JSON.stringify({ host: '', type: 'A', answer: '75.2.60.5', ttl: 300 }),
    });
    records.push({ type: 'A', host: '@', answer: '75.2.60.5', id: aRecord.id });
  } catch (error) {
    errors.push({ type: 'A', error: error.message });
  }
  try {
    const cnameRecord = await namecomRequest(`/domains/${clean}/records`, {
      method: 'POST',
      body: JSON.stringify({ host: 'www', type: 'CNAME', answer: `${clean}.`, ttl: 300 }),
    });
    records.push({ type: 'CNAME', host: 'www', answer: clean, id: cnameRecord.id });
  } catch (error) {
    errors.push({ type: 'CNAME', error: error.message });
  }
  return { success: errors.length === 0, domainName: clean, records, errors: errors.length > 0 ? errors : undefined };
}

export async function getDomainInfo(domainName) {
  if (!domainName) throw new Error('Domain name is required');
  const clean = domainName.toLowerCase().trim();
  try {
    const data = await namecomRequest(`/domains/${clean}`);
    return {
      domainName: clean,
      expireDate: data.expireDate,
      autoRenew: data.autoRenewEnabled,
      locked: data.locked,
      nameservers: data.nameservers || [],
      privacyEnabled: data.privacyEnabled,
      createDate: data.createDate,
    };
  } catch (error) {
    console.error('[Name.com] Get domain info error:', error.message);
    throw error;
  }
}

export async function setAutoRenew(domainName, enabled = true) {
  if (!domainName) throw new Error('Domain name is required');
  const clean = domainName.toLowerCase().trim();
  try {
    if (enabled) {
      await namecomRequest(`/domains/${clean}:enableAutoRenew`, { method: 'POST' });
    } else {
      await namecomRequest(`/domains/${clean}:disableAutoRenew`, { method: 'POST' });
    }
    return { success: true, domainName: clean, autoRenew: enabled };
  } catch (error) {
    console.error('[Name.com] Set auto-renew error:', error.message);
    throw error;
  }
}

export async function getAuthCode(domainName) {
  if (!domainName) throw new Error('Domain name is required');
  const clean = domainName.toLowerCase().trim();
  try {
    const data = await namecomRequest(`/domains/${clean}:getAuthCode`, { method: 'POST' });
    return { domainName: clean, authCode: data.authCode };
  } catch (error) {
    console.error('[Name.com] Get auth code error:', error.message);
    throw error;
  }
}

export async function unlockDomain(domainName) {
  if (!domainName) throw new Error('Domain name is required');
  const clean = domainName.toLowerCase().trim();
  try {
    await namecomRequest(`/domains/${clean}:unlock`, { method: 'POST' });
    return { success: true, domainName: clean, locked: false };
  } catch (error) {
    console.error('[Name.com] Unlock domain error:', error.message);
    throw error;
  }
}

export async function listAllDomains(page = 1, perPage = 100) {
  try {
    const data = await namecomRequest(`/domains?page=${page}&perPage=${perPage}`);
    return {
      domains: (data.domains || []).map((d) => ({
        domainName: d.domainName,
        expireDate: d.expireDate,
        autoRenew: d.autoRenewEnabled,
        locked: d.locked,
        createDate: d.createDate,
      })),
      totalCount: data.totalCount || 0,
      page,
      perPage,
    };
  } catch (error) {
    console.error('[Name.com] List domains error:', error.message);
    throw error;
  }
}

export function generateDomainSuggestions(businessName, state = 'CA') {
  if (!businessName) return [];
  const clean = businessName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const slug = clean.replace(/\s+/g, '');
  const dashed = clean.replace(/\s+/g, '-');
  const stateLC = (state || 'CA').toLowerCase();
  const withoutLLC = clean.replace(/\b(llc|inc|co|corp|company|services|service)\b/gi, '').trim().replace(/\s+/g, '');
  const suggestions = [
    `${slug}.com`, `${dashed}.com`,
    `${slug}${stateLC}.com`, `${dashed}-${stateLC}.com`,
    `${slug}pro.com`, `${slug}hq.com`, `get${slug}.com`, `${slug}now.com`,
    `${slug}.net`, `${slug}.co`, `${slug}.us`, `${slug}.pro`,
    ...(withoutLLC !== slug ? [`${withoutLLC}.com`, `${withoutLLC}${stateLC}.com`] : []),
    `${dashed}.net`, `${dashed}.co`,
  ];
  return [...new Set(suggestions)].filter(Boolean);
}

const namecom = {
  searchDomains, checkDomain, registerDomain, setDNSRecords, getDomainInfo,
  setAutoRenew, getAuthCode, unlockDomain, listAllDomains, generateDomainSuggestions,
  getConfig: () => ({
    baseUrl: config.baseUrl,
    username: config.username ? `${config.username.substring(0, 3)}***` : 'NOT SET',
    hasToken: !!config.token,
    isProduction,
  }),
};

export default namecom;
