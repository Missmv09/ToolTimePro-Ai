#!/usr/bin/env node
/**
 * ToolTime Pro — Crisp Knowledge Base Sync
 *
 * Syncs wiki markdown files to Crisp Helpdesk (Knowledge Base) articles.
 * Each wiki/*.md file becomes a Crisp helpdesk article, organized into categories.
 *
 * Required env vars:
 *   CRISP_API_IDENTIFIER  — Crisp API plugin identifier (from marketplace.crisp.chat)
 *   CRISP_API_KEY         — Crisp API plugin secret key
 *   CRISP_WEBSITE_ID      — Your Crisp website ID
 *
 * Usage:
 *   CRISP_API_IDENTIFIER=xxx CRISP_API_KEY=yyy CRISP_WEBSITE_ID=zzz node scripts/sync-to-crisp.js
 *   node scripts/sync-to-crisp.js --dry-run   (prints what would be synced, no API calls)
 *
 * Crisp Helpdesk API docs: https://docs.crisp.chat/references/rest-api/v1/#list-helpdesk-articles
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const WIKI_DIR = path.resolve(__dirname, '..', 'wiki');
const LOCALE = 'en';

// Map wiki filenames to Crisp helpdesk categories
const CATEGORY_MAP = {
  'Getting Started': [
    'Home.md',
    'Getting-Started.md',
    'Pricing-and-Plans.md',
  ],
  'Core Features': [
    'Jobs-and-Scheduling.md',
    'Online-Booking.md',
    'Customers-and-Leads.md',
    'Quotes-and-Estimates.md',
    'Invoicing-and-Payments.md',
    'Payment-Plans-Guide.md',
    'Time-Tracking.md',
    'Adding-Services.md',
  ],
  'AI & Website': [
    'Jenny-AI.md',
    'Website-and-Blog.md',
    'Customer-Portal.md',
  ],
  'Team & Compliance': [
    'Team-Management.md',
    'Mobile-and-Worker-App.md',
    'ToolTime-Shield.md',
    'Reports-and-Analytics.md',
  ],
  'Settings & Support': [
    'Settings-and-Integrations.md',
    'Troubleshooting.md',
    'FAQ.md',
  ],
  'Developer Reference': [
    'API-Reference.md',
    'System-Automation.md',
  ],
};

// ============================================================
// Crisp API Client
// ============================================================

class CrispClient {
  constructor(identifier, key, websiteId) {
    this.websiteId = websiteId;
    this.baseUrl = `https://api.crisp.chat/v1/website/${websiteId}/helpdesk`;
    this.auth = 'Basic ' + Buffer.from(`${identifier}:${key}`).toString('base64');
  }

  async request(method, endpoint, body) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Authorization': this.auth,
        'Content-Type': 'application/json',
        'X-Crisp-Tier': 'plugin',
      },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Crisp API ${method} ${endpoint}: ${response.status} — ${text}`);
    }
    const json = await response.json();
    return json.data;
  }

  // --- Categories ---

  async listCategories() {
    return this.request('GET', `/locale/${LOCALE}/categories/1`);
  }

  async createCategory(name, order) {
    return this.request('POST', `/locale/${LOCALE}/category`, {
      name,
      order,
    });
  }

  // --- Articles ---

  async listArticles(pageNumber = 1) {
    return this.request('GET', `/locale/${LOCALE}/articles/${pageNumber}`);
  }

  async getAllArticles() {
    const all = [];
    let page = 1;
    while (true) {
      try {
        const articles = await this.listArticles(page);
        if (!articles || articles.length === 0) break;
        all.push(...articles);
        page++;
      } catch {
        break;
      }
    }
    return all;
  }

  async createArticle(title, content, categoryId, order) {
    return this.request('POST', `/locale/${LOCALE}/article`, {
      title,
      content,
      category_id: categoryId,
      order,
      status: 'published',
    });
  }

  async updateArticle(articleId, title, content, categoryId) {
    return this.request('PATCH', `/locale/${LOCALE}/article/${articleId}`, {
      title,
      content,
      category_id: categoryId,
      status: 'published',
    });
  }
}

// ============================================================
// Markdown → HTML (basic conversion for Crisp)
// ============================================================

function markdownToBasicHtml(md) {
  let html = md;

  // Remove the auto-generated comment markers
  html = html.replace(/<!-- .*? -->\n?/g, '');

  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Links — convert GitHub wiki links to relative
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');

  // Blockquotes
  html = html.replace(/^>\s*(.+)$/gm, '<blockquote>$1</blockquote>');

  // Tables — convert to HTML tables
  const lines = html.split('\n');
  const result = [];
  let inTable = false;
  let headerDone = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').filter((c) => c.trim() !== '');

      // Check if next line is separator
      if (!inTable) {
        inTable = true;
        headerDone = false;
        result.push('<table>');
        result.push('<thead><tr>');
        for (const cell of cells) {
          result.push(`<th>${cell.trim()}</th>`);
        }
        result.push('</tr></thead>');
        continue;
      }

      // Skip separator line
      if (cells.every((c) => /^[-:]+$/.test(c.trim()))) {
        headerDone = true;
        result.push('<tbody>');
        continue;
      }

      // Data row
      result.push('<tr>');
      for (const cell of cells) {
        result.push(`<td>${cell.trim()}</td>`);
      }
      result.push('</tr>');
    } else {
      if (inTable) {
        if (headerDone) result.push('</tbody>');
        result.push('</table>');
        inTable = false;
        headerDone = false;
      }

      // Unordered list
      if (/^[-*]\s+/.test(line)) {
        result.push(`<li>${line.replace(/^[-*]\s+/, '')}</li>`);
      } else if (line === '') {
        result.push('<br>');
      } else if (!line.startsWith('<')) {
        result.push(`<p>${line}</p>`);
      } else {
        result.push(line);
      }
    }
  }
  if (inTable) {
    if (headerDone) result.push('</tbody>');
    result.push('</table>');
  }

  return result.join('\n');
}

// ============================================================
// Sync Logic
// ============================================================

function getTitleFromMd(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

async function main() {
  const identifier = process.env.CRISP_API_IDENTIFIER;
  const key = process.env.CRISP_API_KEY;
  const websiteId = process.env.CRISP_WEBSITE_ID;

  if (!DRY_RUN && (!identifier || !key || !websiteId)) {
    console.error('Missing required env vars: CRISP_API_IDENTIFIER, CRISP_API_KEY, CRISP_WEBSITE_ID');
    console.error('Run with --dry-run to test without API access.');
    process.exit(1);
  }

  console.log(`ToolTime Pro — Crisp Knowledge Base Sync${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  const client = DRY_RUN ? null : new CrispClient(identifier, key, websiteId);

  // Build file → category mapping
  const fileToCategory = {};
  for (const [catName, files] of Object.entries(CATEGORY_MAP)) {
    for (const file of files) {
      fileToCategory[file] = catName;
    }
  }

  // Read all wiki files
  const wikiFiles = fs.readdirSync(WIKI_DIR).filter((f) => f.endsWith('.md'));
  console.log(`Found ${wikiFiles.length} wiki files\n`);

  if (DRY_RUN) {
    console.log('Would sync the following articles to Crisp:\n');
    for (const file of wikiFiles) {
      const content = fs.readFileSync(path.join(WIKI_DIR, file), 'utf8');
      const title = getTitleFromMd(content) || file.replace('.md', '').replace(/-/g, ' ');
      const category = fileToCategory[file] || 'Uncategorized';
      console.log(`  [${category}] ${title} (${file})`);
    }
    console.log('\nDry run complete. Set CRISP_API_IDENTIFIER, CRISP_API_KEY, and CRISP_WEBSITE_ID to sync.');
    return;
  }

  // Get or create categories in Crisp
  console.log('Syncing categories...');
  let existingCategories = [];
  try {
    existingCategories = await client.listCategories() || [];
  } catch {
    existingCategories = [];
  }

  const categoryIds = {};
  let order = 0;
  for (const catName of Object.keys(CATEGORY_MAP)) {
    const existing = existingCategories.find((c) => c.name === catName);
    if (existing) {
      categoryIds[catName] = existing.category_id;
      console.log(`  Exists: ${catName}`);
    } else {
      const created = await client.createCategory(catName, order);
      categoryIds[catName] = created.category_id;
      console.log(`  Created: ${catName}`);
    }
    order++;
  }

  // Get existing articles to determine create vs update
  console.log('\nFetching existing articles...');
  const existingArticles = await client.getAllArticles();
  const articlesByTitle = {};
  for (const a of existingArticles) {
    articlesByTitle[a.title] = a;
  }

  // Sync each wiki file
  console.log('\nSyncing articles...');
  let created = 0;
  let updated = 0;
  let articleOrder = 0;

  for (const file of wikiFiles) {
    const mdContent = fs.readFileSync(path.join(WIKI_DIR, file), 'utf8');
    const title = getTitleFromMd(mdContent) || file.replace('.md', '').replace(/-/g, ' ');
    const htmlContent = markdownToBasicHtml(mdContent);
    const category = fileToCategory[file] || 'Uncategorized';
    const categoryId = categoryIds[category];

    if (!categoryId) {
      console.log(`  Skipped: ${title} (no category ID for "${category}")`);
      continue;
    }

    const existing = articlesByTitle[title];
    if (existing) {
      await client.updateArticle(existing.article_id, title, htmlContent, categoryId);
      console.log(`  Updated: ${title}`);
      updated++;
    } else {
      await client.createArticle(title, htmlContent, categoryId, articleOrder);
      console.log(`  Created: ${title}`);
      created++;
    }
    articleOrder++;

    // Rate limiting: Crisp API has limits, small delay between calls
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log(`\nDone! Created: ${created}, Updated: ${updated}, Total: ${created + updated}`);
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
