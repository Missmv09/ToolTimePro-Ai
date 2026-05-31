// DNS records a customer must add at their registrar (GoDaddy, Namecheap,
// Google Domains, etc.) to point a BYO domain at the ToolTime Pro site
// hosted on Netlify.

export const NETLIFY_LOAD_BALANCER_IP = '75.2.60.5';

export function dnsRecordsFor(domain) {
  const clean = (domain || '')
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  return [
    {
      type: 'A',
      host: '@',
      value: NETLIFY_LOAD_BALANCER_IP,
      ttl: 300,
      purpose: 'Points your root domain to ToolTime Pro',
    },
    {
      type: 'CNAME',
      host: 'www',
      value: clean || 'yourdomain.com',
      ttl: 300,
      purpose: `Points www to your root domain`,
    },
  ];
}

export function normalizeDomain(input) {
  if (!input) return '';
  return input
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
}

const DOMAIN_RE = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export function isValidDomain(input) {
  const clean = normalizeDomain(input);
  if (!clean || clean.length > 253) return false;
  return DOMAIN_RE.test(clean);
}
