#!/usr/bin/env node
/**
 * ToolTime Pro — Wiki Content Generator
 *
 * Auto-generates wiki pages from source code so documentation stays in sync.
 * Run manually or via GitHub Actions on push to main.
 *
 * Generated pages:
 *   - wiki/Pricing-and-Plans.md       (from PRODUCTS array in setup-stripe-products.js)
 *   - wiki/API-Reference.md           (from src/app/api/ directory scan)
 *   - wiki/System-Automation.md       (from netlify.toml cron schedules + functions)
 *   - wiki/Customers-and-Leads.md     (CRM Import section from src/lib/crm-field-mappings.ts)
 *
 * Usage:
 *   node scripts/generate-wiki.js
 *   node scripts/generate-wiki.js --dry-run   (prints to stdout, no file writes)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WIKI_DIR = path.join(ROOT, 'wiki');
const DRY_RUN = process.argv.includes('--dry-run');

// ============================================================
// Helpers
// ============================================================

function writeWikiPage(filename, content) {
  const filePath = path.join(WIKI_DIR, filename);
  if (DRY_RUN) {
    console.log(`\n--- ${filename} ---\n`);
    console.log(content);
    return;
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  Updated: wiki/${filename}`);
}

function formatDollars(cents) {
  return `$${(cents / 100).toFixed(0)}`;
}

// ============================================================
// 1. Pricing & Plans — parsed from setup-stripe-products.js
// ============================================================

function extractProducts() {
  const scriptPath = path.join(ROOT, 'scripts', 'setup-stripe-products.js');
  const src = fs.readFileSync(scriptPath, 'utf8');

  // Extract the PRODUCTS array using a regex that captures the array content
  const match = src.match(/const PRODUCTS\s*=\s*\[([\s\S]*?)\n\];/);
  if (!match) {
    console.error('Could not parse PRODUCTS array from setup-stripe-products.js');
    process.exit(1);
  }

  // Parse individual product objects
  const products = [];
  const objRegex = /\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  let objMatch;
  while ((objMatch = objRegex.exec(match[1])) !== null) {
    const block = objMatch[1];

    const id = (block.match(/id:\s*'([^']+)'/) || [])[1];
    const name = (block.match(/name:\s*'([^']+)'/) || [])[1];
    const desc = (block.match(/description:\s*'([^']+)'/) || [])[1];

    // Extract prices
    const prices = [];
    const priceRegex = /\{\s*key:\s*'(\w+)',\s*amount:\s*(\d+)(?:,\s*interval:\s*'(\w+)')?\s*\}/g;
    let priceMatch;
    while ((priceMatch = priceRegex.exec(block)) !== null) {
      prices.push({
        key: priceMatch[1],
        amount: parseInt(priceMatch[2], 10),
        interval: priceMatch[3] || null,
      });
    }

    if (id && name) {
      products.push({ id, name, description: desc, prices });
    }
  }

  return products;
}

function categorizeProd(id) {
  if (['starter', 'pro', 'elite'].includes(id)) return 'core';
  if (['booking_only', 'invoicing_only'].includes(id)) return 'standalone';
  if (id.startsWith('jenny_')) return 'jenny';
  if (['assisted_onboarding', 'white_glove'].includes(id)) return 'setup';
  return 'addon';
}

function generatePricingPage(products) {
  const core = products.filter((p) => categorizeProd(p.id) === 'core');
  const standalone = products.filter((p) => categorizeProd(p.id) === 'standalone');
  const jenny = products.filter((p) => categorizeProd(p.id) === 'jenny');
  const addons = products.filter((p) => categorizeProd(p.id) === 'addon');
  const setup = products.filter((p) => categorizeProd(p.id) === 'setup');

  let md = `# Pricing & Plans

<!-- AUTO-GENERATED from scripts/setup-stripe-products.js — do not edit manually -->
<!-- To update: change PRODUCTS in setup-stripe-products.js, then run: node scripts/generate-wiki.js -->

ToolTime Pro offers three core plans, standalone options, and powerful add-ons. No surprise per-user fees — competitors charge $20/vehicle or $250+/technician. We don't.

---

## Core Plans

| Feature | Starter — ${formatDollars(core[0]?.prices[0]?.amount)}/mo | Pro — ${formatDollars(core[1]?.prices[0]?.amount)}/mo | Elite — ${formatDollars(core[2]?.prices[0]?.amount)}/mo |
|---------|:-----------------:|:------------:|:----------------:|
| **Annual Price** | ${formatDollars(core[0]?.prices[1]?.amount)}/yr | ${formatDollars(core[1]?.prices[1]?.amount)}/yr | ${formatDollars(core[2]?.prices[1]?.amount)}/yr |
| **Workers** | Owner + 2 | Up to 15 | Unlimited |
| Professional website | 1 page | 3 pages | 5 pages |
| Online booking page | Yes | Yes | Yes |
| Smart quoting + e-signatures | Yes | Yes | Yes |
| Invoicing + card payments | Yes | Yes | Yes |
| GPS clock-in (worker app) | Yes | Yes | Yes |
| ToolTime Shield (compliance) | Yes | Yes | Yes |
| HR document library (10+ templates) | Yes | Yes | Yes |
| Spanish language support | Yes | Yes | Yes |
| Chat & email support | Yes | Yes | Yes |
| Review Machine (auto 5-star requests) | — | Yes | Yes |
| Jenny Lite chatbot (lead capture) | — | Yes | Yes |
| Break tracking + CA compliance | — | Yes | Yes |
| Team scheduling + dispatch | — | Yes | Yes |
| QuickBooks sync | — | Add-on | Included |
| Phone support | — | Yes | Yes |
| Full compliance toolkit | — | Yes | Yes |
| Jenny Pro (phone + SMS) | — | — | Included |
| Dispatch Board + Route Optimization | — | — | Yes |
| Customer Portal Pro | — | — | Included |
| Advanced reporting + analytics | — | — | Yes |
| Photo verification (clock-in selfies) | — | — | Yes |
| Compliance dashboard | — | — | Yes |
| Priority support + account manager | — | — | Yes |
| HR On-Demand access | — | — | Yes |

> **Annual plans save 2 months free.** A Pro plan at ${formatDollars(core[1]?.prices[0]?.amount)}/month is just ${formatDollars(core[1]?.prices[1]?.amount)}/year (vs $${((core[1]?.prices[0]?.amount * 12) / 100).toFixed(0)} monthly).

---

## Standalone Plans

For businesses that only need one feature:

| Plan | Price | What's Included |
|------|-------|-----------------|
`;

  for (const p of standalone) {
    const monthly = p.prices.find((pr) => pr.interval === 'month');
    const annual = p.prices.find((pr) => pr.interval === 'year');
    const label = p.name.replace('ToolTime Pro — ', '');
    md += `| **${label}** | ${formatDollars(monthly?.amount)}/mo (${formatDollars(annual?.amount)}/yr) | ${p.description} |\n`;
  }

  md += `
---

## Jenny AI Tiers

Jenny AI is your AI-powered back-office assistant. Every plan includes access to Jenny:

| Tier | Price | Capabilities |
|------|-------|-------------|
`;

  for (const p of jenny) {
    const monthly = p.prices.find((pr) => pr.interval === 'month');
    const annual = p.prices.find((pr) => pr.interval === 'year');
    const label = p.name.split(' — ')[0];
    const annualStr = annual ? ` (${formatDollars(annual.amount)}/yr)` : '';
    md += `| **${label}** | ${formatDollars(monthly?.amount)}/mo${annualStr} | ${p.description} |\n`;
  }

  md += `
---

## Add-Ons

Extend your plan with powerful add-ons:

| Add-On | Monthly | Annual | Description |
|--------|---------|--------|-------------|
`;

  for (const p of addons) {
    const monthly = p.prices.find((pr) => pr.interval === 'month');
    const annual = p.prices.find((pr) => pr.interval === 'year');
    const label = p.name.replace(' Add-on', '');
    md += `| **${label}** | ${formatDollars(monthly?.amount)} | ${annual ? formatDollars(annual.amount) + '/yr' : '—'} | ${p.description} |\n`;
  }

  md += `
---

## One-Time Setup Services

| Service | Price | What's Included |
|---------|-------|-----------------|
`;

  for (const p of setup) {
    const price = p.prices[0];
    md += `| **${p.name}** | ${formatDollars(price?.amount)} | ${p.description} |\n`;
  }

  md += `
---

## Choosing the Right Plan

- **Solo operators or tiny teams (1-3 people):** Start with **Starter** at ${formatDollars(core[0]?.prices[0]?.amount)}/mo
- **Growing businesses (4-15 workers):** Go with **Pro** at ${formatDollars(core[1]?.prices[0]?.amount)}/mo for scheduling, reviews, and compliance
- **Established operations (15+ workers):** Choose **Elite** at ${formatDollars(core[2]?.prices[0]?.amount)}/mo for dispatch board, route optimization, and unlimited workers
- **Just need booking or invoicing?** Try a **Standalone** plan at ${formatDollars(standalone[0]?.prices[0]?.amount)}/mo

---

## Upgrading or Downgrading

- Go to **Settings** > **Billing** in your dashboard
- Changes take effect at the start of your next billing cycle
- Upgrading mid-cycle is prorated — you only pay the difference
- All your data is preserved when changing plans

---

## Need Help Choosing?

Contact us:
- **Email:** support@tooltimepro.com
- **Phone:** 1-888-980-8665
- **Live Chat:** Available in your dashboard
`;

  return md;
}

// ============================================================
// 2. API Reference — scanned from src/app/api/ directory tree
// ============================================================

function scanApiRoutes(dir, prefix) {
  const routes = [];
  if (!fs.existsSync(dir)) return routes;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      routes.push(...scanApiRoutes(fullPath, `${prefix}/${entry.name}`));
    } else if (/^route\.(ts|js|tsx|jsx)$/.test(entry.name)) {
      // Read the file to detect HTTP methods
      const content = fs.readFileSync(fullPath, 'utf8');
      const methods = [];
      for (const m of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        if (new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b`).test(content)) {
          methods.push(m);
        }
      }
      routes.push({ path: prefix, methods, file: fullPath.replace(ROOT + '/', '') });
    }
  }
  return routes;
}

function generateApiReference() {
  const apiDir = path.join(ROOT, 'src', 'app', 'api');
  const routes = scanApiRoutes(apiDir, '/api');

  // Group by top-level segment
  const groups = {};
  for (const r of routes) {
    const parts = r.path.split('/').filter(Boolean); // ['api', 'auth', 'login']
    const group = parts[1] || 'other';
    if (!groups[group]) groups[group] = [];
    groups[group].push(r);
  }

  let md = `# API Reference

<!-- AUTO-GENERATED from src/app/api/ directory scan — do not edit manually -->
<!-- To update: add/modify API routes, then run: node scripts/generate-wiki.js -->

Complete list of ToolTime Pro API endpoints, auto-generated from source code.

**Base URL:** \`https://app.tooltimepro.com\` (production) or \`http://localhost:3000\` (local dev)

---

`;

  const groupOrder = Object.keys(groups).sort();
  for (const group of groupOrder) {
    const label = group
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    md += `## ${label}\n\n`;
    md += `| Endpoint | Methods | Source |\n`;
    md += `|----------|---------|--------|\n`;

    for (const r of groups[group].sort((a, b) => a.path.localeCompare(b.path))) {
      const methodBadges = r.methods.length ? r.methods.map((m) => `\`${m}\``).join(' ') : '_dynamic_';
      md += `| \`${r.path}\` | ${methodBadges} | \`${r.file}\` |\n`;
    }
    md += '\n';
  }

  md += `---

> **Total endpoints:** ${routes.length} routes across ${groupOrder.length} groups

_Last generated: ${new Date().toISOString().split('T')[0]}_
`;

  return md;
}

// ============================================================
// 3. System Automation — parsed from netlify.toml + functions
// ============================================================

function generateSystemAutomation() {
  const tomlPath = path.join(ROOT, 'netlify.toml');
  const toml = fs.readFileSync(tomlPath, 'utf8');

  // Parse cron schedules from netlify.toml
  // Look for comment blocks immediately above [functions."name"] blocks
  const cronJobs = [];
  const tomlLines = toml.split('\n');

  for (let i = 0; i < tomlLines.length; i++) {
    const funcMatch = tomlLines[i].match(/^\[functions\."([^"]+)"\]/);
    if (!funcMatch) continue;

    // Check next line for schedule
    const schedLine = tomlLines[i + 1] || '';
    const schedMatch = schedLine.match(/^\s*schedule\s*=\s*"([^"]+)"/);
    if (!schedMatch) continue;

    // Collect comment lines directly above (stop at any blank or non-comment line)
    const commentLines = [];
    for (let j = i - 1; j >= 0; j--) {
      const line = tomlLines[j].trim();
      if (line.startsWith('#') && !line.startsWith('# ===')) {
        commentLines.unshift(line.replace(/^#\s*/, ''));
      } else {
        break;
      }
    }

    const title = commentLines[0] || funcMatch[1];
    const description = commentLines.slice(1).join(' ').trim();

    cronJobs.push({
      name: funcMatch[1],
      schedule: schedMatch[1],
      title,
      description,
    });
  }

  // Scan netlify/functions for all serverless functions
  const functionsDir = path.join(ROOT, 'netlify', 'functions');
  const functions = [];
  if (fs.existsSync(functionsDir)) {
    for (const file of fs.readdirSync(functionsDir)) {
      if (!/\.(js|ts)$/.test(file)) continue;
      const name = file.replace(/\.(js|ts)$/, '');
      const isCron = cronJobs.some((c) => c.name === name);
      const content = fs.readFileSync(path.join(functionsDir, file), 'utf8');

      // Try to extract the first JSDoc or comment block
      const docMatch = content.match(/\/\*\*[\s\S]*?\*\//);
      const desc = docMatch
        ? docMatch[0]
            .replace(/\/\*\*|\*\//g, '')
            .replace(/^\s*\*\s?/gm, '')
            .trim()
            .split('\n')[0]
        : '';

      functions.push({ name, file, isCron, description: desc });
    }
  }

  let md = `# System Automation

<!-- AUTO-GENERATED from netlify.toml and netlify/functions/ — do not edit manually -->
<!-- To update: modify cron schedules or functions, then run: node scripts/generate-wiki.js -->

ToolTime Pro runs automated background tasks via Netlify Scheduled Functions and serverless endpoints.

---

## Scheduled Jobs (Cron)

These run automatically on a schedule defined in \`netlify.toml\`:

| Job | Schedule | Description |
|-----|----------|-------------|
`;

  for (const job of cronJobs) {
    md += `| **${job.name}** | \`${job.schedule}\` | ${job.title}${job.description ? '. ' + job.description : ''} |\n`;
  }

  md += `
### Schedule Reference

| Pattern | Meaning |
|---------|---------|
| \`*/15 * * * *\` | Every 15 minutes |
| \`0 7 * * *\` | Daily at 7:00 AM UTC |
| \`0 9 * * *\` | Daily at 9:00 AM UTC |
| \`0 7 * * 1\` | Every Monday at 7:00 AM UTC |
| \`0 8 * * 1\` | Every Monday at 8:00 AM UTC |
| \`0 6 */3 * *\` | Every 3 days at 6:00 AM UTC |

---

## Serverless Functions

All functions live in \`netlify/functions/\` and are deployed automatically:

| Function | Type | Description |
|----------|------|-------------|
`;

  for (const fn of functions.sort((a, b) => a.name.localeCompare(b.name))) {
    const type = fn.isCron ? 'Scheduled' : 'On-demand';
    md += `| **${fn.name}** | ${type} | ${fn.description} |\n`;
  }

  md += `
---

> **Total:** ${cronJobs.length} scheduled jobs, ${functions.filter((f) => !f.isCron).length} on-demand functions

_Last generated: ${new Date().toISOString().split('T')[0]}_
`;

  return md;
}

// ============================================================
// 4. CRM Import — parsed from src/lib/crm-field-mappings.ts
//    Injects the "Importing Customers" section into
//    wiki/Customers-and-Leads.md between marker comments.
// ============================================================

function parseCrmFieldMappings() {
  const filePath = path.join(ROOT, 'src', 'lib', 'crm-field-mappings.ts');
  if (!fs.existsSync(filePath)) return null;

  const src = fs.readFileSync(filePath, 'utf8');

  // Extract CRM template names, IDs, descriptions, and export instructions
  const templates = [];
  const templateRegex = /(\w+):\s*\{[^}]*?id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*description:\s*'([^']+)',[\s\S]*?exportInstructions:\s*\[([\s\S]*?)\]/g;
  let m;
  while ((m = templateRegex.exec(src)) !== null) {
    const instructions = [];
    const instrRegex = /'([^']+)'/g;
    let im;
    while ((im = instrRegex.exec(m[5])) !== null) {
      instructions.push(im[1]);
    }
    // Build a short export path: extract just the key nouns (Customers → Export → CSV)
    const breadcrumbs = [];
    for (const instr of instructions) {
      // Strip leading "In CRM, " prefix
      const clean = instr.replace(/^In [\w\s]+,\s*/i, '').replace(/\.$/, '');
      // Extract the navigation target (bold noun after go to / navigate to / click / select)
      const navMatch = clean.match(/(?:go to|navigate to)\s+(.+?)(?:\s+(?:from|in|and)\s|$)/i);
      const clickMatch = clean.match(/(?:click|select|choose|use)\s+(?:the\s+)?(?:"([^"]+)"|'([^']+)'|(\w[\w\s]*?))(?:\s+(?:button|icon|function|format|and|to|as|above)\b|$)/i);
      const exportMatch = clean.match(/\bexport\b/i);
      const csvMatch = clean.match(/\bCSV\b/i);
      if (navMatch) {
        const crumb = navMatch[1].replace(/\s+from.*/, '').replace(/\s+in.*/, '');
        if (!breadcrumbs.includes(crumb)) breadcrumbs.push(crumb);
      } else if (exportMatch && !breadcrumbs.includes('Export')) {
        breadcrumbs.push('Export');
      }
      if (csvMatch && !breadcrumbs.includes('CSV')) breadcrumbs.push('CSV');
    }
    templates.push({
      id: m[2],
      name: m[3],
      description: m[4],
      exportPath: breadcrumbs.length > 0 ? breadcrumbs.join(' → ') : 'Export as CSV',
    });
  }

  // Extract customer fields
  const fields = [];
  const fieldRegex = /\{\s*target:\s*'([^']+)',\s*label:\s*'([^']+)',\s*required:\s*(true|false)\s*\}/g;
  while ((m = fieldRegex.exec(src)) !== null) {
    fields.push({ target: m[1], label: m[2], required: m[3] === 'true' });
  }

  return { templates, fields };
}

function generateCrmImportSection(data) {
  if (!data) return null;

  const { templates, fields } = data;
  const specific = templates.filter(t => t.id !== 'generic_csv');
  const generic = templates.find(t => t.id === 'generic_csv');

  let md = `## Importing Customers (CRM Migration)

<!-- AUTO-INJECTED by generate-wiki.js from src/lib/crm-field-mappings.ts — do not edit this section manually -->

Already have customers in another system? ToolTime Pro includes a self-service import wizard that migrates your customer data in minutes — no White-Glove setup required.

### How to Import

1. Go to **Customers** in the sidebar
2. Click **Import Customers** (or navigate to **Dashboard → Import Customers**)
3. **Select your source CRM** — choose from the supported platforms below, or pick "Generic CSV" for any spreadsheet
4. **Export your data** — follow the on-screen instructions to export a CSV from your old system
5. **Upload your CSV** — drag and drop or click to upload (max 10 MB)
6. **Map fields** — ToolTime Pro auto-detects column mappings; adjust any that need correction
7. **Preview** — review the first 10 rows, see valid vs. error counts
8. **Import** — click "Import" to bring in all valid rows

### Supported CRM Platforms

| Platform | Auto-Detected? | Export Path |
|----------|:--------------:|-------------|
`;

  for (const t of specific) {
    md += `| **${t.name}** | Yes | ${t.exportPath} |\n`;
  }
  if (generic) {
    md += `| **${generic.name}** | Manual mapping | Any CSV with a header row |\n`;
  }

  md += `
### Imported Fields

| ToolTime Pro Field | Required? | Notes |
|--------------------|:---------:|-------|
`;

  const fieldNotes = {
    name: 'Or separate First + Last Name columns (auto-combined)',
    email: 'Used for quotes, invoices, and communication',
    phone: 'Normalized to (XXX) XXX-XXXX format',
    address: 'Job site / mailing address',
    city: '',
    state: '2-letter abbreviation (e.g. CA, TX)',
    zip: '',
    notes: 'Multiple note-like columns are merged',
    source: 'Where the customer originally came from',
  };

  for (const f of fields) {
    const note = fieldNotes[f.target] || '';
    md += `| **${f.label}** | ${f.required ? 'Yes' : 'No'} | ${note} |\n`;
  }

  md += `
### Duplicate Handling

- By default, **Skip Duplicates** is enabled — customers that already exist (matched by email or phone) are skipped
- You can uncheck this option during the preview step if you want to allow duplicates
- The import summary shows exactly how many rows were imported, skipped, or failed

### Tips for a Smooth Import

1. **Clean your CSV first** — remove test rows, blank rows, or internal notes
2. **Use the preview step** — check the first 10 rows before committing
3. **State abbreviations** — use 2-letter codes (CA, not California) to avoid validation errors
4. **Phone numbers** — any format works (the importer normalizes them automatically)
5. **Large lists** — the importer handles files up to 10 MB, which covers thousands of customers`;

  return md;
}

function injectCrmImportSection(sectionMd) {
  const wikiFile = path.join(WIKI_DIR, 'Customers-and-Leads.md');
  if (!fs.existsSync(wikiFile)) {
    console.log('  Skipped: wiki/Customers-and-Leads.md does not exist');
    return;
  }

  const content = fs.readFileSync(wikiFile, 'utf8');

  const startMarker = '## Importing Customers (CRM Migration)';
  const endMarker = '## How Customers & Leads Connect to Other Features';

  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);

  let updated;
  if (startIdx !== -1 && endIdx !== -1) {
    // Replace existing section
    updated = content.slice(0, startIdx) + sectionMd + '\n\n---\n\n' + content.slice(endIdx);
  } else if (endIdx !== -1) {
    // Insert before the "How Customers & Leads Connect" section
    updated = content.slice(0, endIdx) + sectionMd + '\n\n---\n\n' + content.slice(endIdx);
  } else {
    // Append before the last ---
    const lastDivider = content.lastIndexOf('\n---\n');
    if (lastDivider !== -1) {
      updated = content.slice(0, lastDivider) + '\n---\n\n' + sectionMd + content.slice(lastDivider);
    } else {
      updated = content + '\n\n---\n\n' + sectionMd;
    }
  }

  if (DRY_RUN) {
    console.log(`\n--- Customers-and-Leads.md (CRM Import section) ---\n`);
    console.log(sectionMd);
    return;
  }

  fs.writeFileSync(wikiFile, updated, 'utf8');
  console.log('  Injected CRM Import section into: wiki/Customers-and-Leads.md');
}

// ============================================================
// Main
// ============================================================

function main() {
  console.log('ToolTime Pro — Wiki Content Generator\n');

  // Ensure wiki directory exists
  if (!fs.existsSync(WIKI_DIR)) {
    fs.mkdirSync(WIKI_DIR, { recursive: true });
  }

  // 1. Pricing
  console.log('Generating Pricing & Plans...');
  const products = extractProducts();
  console.log(`  Found ${products.length} products`);
  const pricingMd = generatePricingPage(products);
  writeWikiPage('Pricing-and-Plans.md', pricingMd);

  // 2. API Reference
  console.log('Generating API Reference...');
  const apiMd = generateApiReference();
  writeWikiPage('API-Reference.md', apiMd);

  // 3. System Automation
  console.log('Generating System Automation...');
  const automationMd = generateSystemAutomation();
  writeWikiPage('System-Automation.md', automationMd);

  // 4. CRM Import → inject into Customers-and-Leads.md
  console.log('Generating CRM Import section...');
  const crmData = parseCrmFieldMappings();
  if (crmData && crmData.templates.length > 0) {
    console.log(`  Found ${crmData.templates.length} CRM templates, ${crmData.fields.length} fields`);
    const crmSection = generateCrmImportSection(crmData);
    if (crmSection) {
      injectCrmImportSection(crmSection);
    }
  } else {
    console.log('  Skipped: no CRM field mappings found');
  }

  console.log('\nDone!');
  if (DRY_RUN) {
    console.log('(Dry run — no files were written)');
  }
}

main();
