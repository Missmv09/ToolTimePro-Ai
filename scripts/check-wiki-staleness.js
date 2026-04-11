#!/usr/bin/env node
/**
 * ToolTime Pro — Wiki Staleness Checker
 *
 * Compares changed files in a PR against a source→wiki mapping.
 * Outputs a list of wiki pages that may need manual updates.
 *
 * Usage:
 *   node scripts/check-wiki-staleness.js <file1> <file2> ...
 *   echo "src/app/dashboard/jobs/page.tsx" | node scripts/check-wiki-staleness.js --stdin
 *
 * Exit codes:
 *   0 — no wiki pages flagged
 *   1 — one or more wiki pages may be stale
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// Source path → wiki page mapping
//
// Keys are path prefixes (matched with startsWith).
// Values are wiki page filenames.
// Order matters — first match wins, so put specific paths first.
// ============================================================

const SOURCE_TO_WIKI = [
  // Auto-generated pages (skip — these update themselves)
  // { prefix: 'scripts/setup-stripe-products.js', wiki: null },
  // { prefix: 'src/app/api/',                     wiki: null },
  // { prefix: 'netlify/',                          wiki: null },
  // { prefix: 'src/lib/crm-field-mappings.ts',     wiki: null },

  // Dashboard features → wiki pages
  { prefix: 'src/app/dashboard/jobs/',             wiki: 'Jobs-and-Scheduling.md' },
  { prefix: 'src/app/dashboard/schedule/',         wiki: 'Jobs-and-Scheduling.md' },
  { prefix: 'src/app/dashboard/dispatch/',         wiki: 'Jobs-and-Scheduling.md' },
  { prefix: 'src/app/dashboard/route-optimizer/',  wiki: 'Jobs-and-Scheduling.md' },
  { prefix: 'src/app/dashboard/recurring-jobs/',   wiki: 'Jobs-and-Scheduling.md' },
  { prefix: 'src/app/dashboard/booking/',          wiki: 'Online-Booking.md' },
  { prefix: 'src/app/dashboard/customers/',        wiki: 'Customers-and-Leads.md' },
  { prefix: 'src/app/dashboard/leads/',            wiki: 'Customers-and-Leads.md' },
  { prefix: 'src/app/dashboard/clients/',          wiki: 'Customers-and-Leads.md' },
  { prefix: 'src/app/dashboard/quotes/',           wiki: 'Quotes-and-Estimates.md' },
  { prefix: 'src/app/dashboard/smart-quote/',      wiki: 'Quotes-and-Estimates.md' },
  { prefix: 'src/app/dashboard/estimator/',        wiki: 'Quotes-and-Estimates.md' },
  { prefix: 'src/app/dashboard/invoices/',         wiki: 'Invoicing-and-Payments.md' },
  { prefix: 'src/app/dashboard/payment-plans/',    wiki: 'Payment-Plans-Guide.md' },
  { prefix: 'src/app/dashboard/time-logs/',        wiki: 'Time-Tracking.md' },
  { prefix: 'src/app/dashboard/services/',         wiki: 'Adding-Services.md' },
  { prefix: 'src/app/dashboard/team/',             wiki: 'Team-Management.md' },
  { prefix: 'src/app/dashboard/workforce/',        wiki: 'Team-Management.md' },
  { prefix: 'src/app/dashboard/reports/',          wiki: 'Reports-and-Analytics.md' },
  { prefix: 'src/app/dashboard/reviews/',          wiki: 'Reports-and-Analytics.md' },
  { prefix: 'src/app/dashboard/settings/',         wiki: 'Settings-and-Integrations.md' },
  { prefix: 'src/app/dashboard/webhooks/',         wiki: 'Settings-and-Integrations.md' },
  { prefix: 'src/app/dashboard/website-builder/',  wiki: 'Website-and-Blog.md' },
  { prefix: 'src/app/dashboard/blog/',             wiki: 'Website-and-Blog.md' },
  { prefix: 'src/app/dashboard/compliance/',       wiki: 'ToolTime-Shield.md' },
  { prefix: 'src/app/dashboard/shield/',           wiki: 'ToolTime-Shield.md' },
  { prefix: 'src/app/dashboard/hr-toolkit/',       wiki: 'ToolTime-Shield.md' },
  { prefix: 'src/app/dashboard/jenny-lite/',       wiki: 'Jenny-AI.md' },
  { prefix: 'src/app/dashboard/jenny-pro/',        wiki: 'Jenny-AI.md' },
  { prefix: 'src/app/dashboard/jenny-exec/',       wiki: 'Jenny-AI.md' },
  { prefix: 'src/app/dashboard/jenny-actions/',    wiki: 'Jenny-AI.md' },
  { prefix: 'src/app/dashboard/onboarding-status/', wiki: 'Getting-Started.md' },

  // Non-dashboard app pages
  { prefix: 'src/app/worker/',                     wiki: 'Mobile-and-Worker-App.md' },
  { prefix: 'src/app/portal/',                     wiki: 'Customer-Portal.md' },
  { prefix: 'src/app/jenny/',                      wiki: 'Jenny-AI.md' },
  { prefix: 'src/app/blog/',                       wiki: 'Website-and-Blog.md' },
  { prefix: 'src/app/booking/',                    wiki: 'Online-Booking.md' },

  // Components
  { prefix: 'src/components/jenny/',               wiki: 'Jenny-AI.md' },
  { prefix: 'src/components/worker/',              wiki: 'Mobile-and-Worker-App.md' },

  // API routes (only manually-maintained ones — auto-generated API Reference handles the list)
  { prefix: 'src/app/api/jenny-',                  wiki: 'Jenny-AI.md' },
  { prefix: 'src/app/api/portal/',                 wiki: 'Customer-Portal.md' },
  { prefix: 'src/app/api/website-builder/',        wiki: 'Website-and-Blog.md' },
  { prefix: 'src/app/api/blog/',                   wiki: 'Website-and-Blog.md' },
  { prefix: 'src/app/api/booking/',                wiki: 'Online-Booking.md' },
  { prefix: 'src/app/api/payment-plans/',          wiki: 'Payment-Plans-Guide.md' },

  // Contexts
  { prefix: 'src/contexts/WorkerAuthContext',      wiki: 'Mobile-and-Worker-App.md' },

  // Static marketing site
  { prefix: 'tooltimepro/',                        wiki: 'Home.md' },

  // Pricing page (manual parts — features, demo cards, etc.)
  { prefix: 'src/app/pricing/',                    wiki: 'Pricing-and-Plans.md' },
  { prefix: 'src/app/page.tsx',                    wiki: 'Home.md' },
];

// Pages that are auto-generated and don't need manual attention
const AUTO_GENERATED = new Set([
  'Pricing-and-Plans.md',   // from generate-wiki.js
  'API-Reference.md',       // from generate-wiki.js
  'System-Automation.md',   // from generate-wiki.js
  // CRM Import section in Customers-and-Leads.md is auto-generated,
  // but the rest of that page is manual, so we still flag it.
]);

// ============================================================
// Main
// ============================================================

function getChangedFiles() {
  const args = process.argv.slice(2);

  if (args.includes('--stdin')) {
    const input = fs.readFileSync('/dev/stdin', 'utf8');
    return input.split('\n').map(f => f.trim()).filter(Boolean);
  }

  return args.filter(a => !a.startsWith('--'));
}

function checkStaleness(changedFiles) {
  const flagged = new Map(); // wiki filename → Set of source files that triggered it

  for (const file of changedFiles) {
    for (const rule of SOURCE_TO_WIKI) {
      if (file.startsWith(rule.prefix)) {
        if (!flagged.has(rule.wiki)) {
          flagged.set(rule.wiki, new Set());
        }
        flagged.get(rule.wiki).add(file);
        break; // first match wins
      }
    }
  }

  // Remove auto-generated pages (they update themselves)
  for (const autoPage of AUTO_GENERATED) {
    flagged.delete(autoPage);
  }

  // Remove wiki files that were already modified in this PR
  const changedWiki = changedFiles.filter(f => f.startsWith('wiki/'));
  for (const wikiFile of changedWiki) {
    const basename = path.basename(wikiFile);
    flagged.delete(basename);
  }

  return flagged;
}

function formatOutput(flagged) {
  if (flagged.size === 0) return null;

  let output = '## Wiki Staleness Check\n\n';
  output += 'The following wiki pages may need updating based on the source files changed in this PR:\n\n';

  for (const [wiki, sources] of [...flagged.entries()].sort()) {
    const wikiName = wiki.replace('.md', '').replace(/-/g, ' ');
    output += `### [${wikiName}](https://github.com/Missmv09/ToolTimePro-Ai/wiki/${wiki.replace('.md', '')})\n`;
    output += `Triggered by:\n`;
    for (const src of [...sources].sort()) {
      output += `- \`${src}\`\n`;
    }
    output += '\n';
  }

  output += '> **Note:** Auto-generated pages (Pricing & Plans, API Reference, System Automation, CRM Import section) are excluded — they update themselves via `generate-wiki.js`.\n';
  output += '> If you already updated the wiki page in this PR, it won\'t appear here.\n';

  return output;
}

// Run
const files = getChangedFiles();
if (files.length === 0) {
  console.error('Usage: node scripts/check-wiki-staleness.js <file1> <file2> ...');
  console.error('       git diff --name-only main | node scripts/check-wiki-staleness.js --stdin');
  process.exit(0);
}

const flagged = checkStaleness(files);
const output = formatOutput(flagged);

if (output) {
  console.log(output);
  process.exit(1);
} else {
  console.log('No wiki pages need updating for this PR.');
  process.exit(0);
}
