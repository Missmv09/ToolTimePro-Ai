/**
 * Growth agent generator — prompts for turning an approved task into an asset.
 *
 * Split from the planner because the two jobs want different things: the
 * planner reasons over data and needs the strongest model, while generation is
 * writing to a brief and runs on the cheaper tier. Keeping the prompts here
 * (pure, no I/O) means the brief each asset type gets is testable.
 */

import type { TaskType } from './growth-planner';

export interface GenerationTask {
  title: string;
  rationale: string;
  channel: string;
  taskType: TaskType;
  expectedImpact: string | null;
}

export interface AssetSpec {
  /** Stored on growth_assets.asset_type. */
  assetType: string;
  systemPrompt: string;
  maxTokens: number;
  /** JSON keys the model must return. Used to validate what comes back. */
  requiredFields: string[];
}

const BRAND_CONTEXT = `Task Iguana is field service management software for independent contractors — landscapers, plumbers, HVAC and electrical shops, typically 1 to 15 trucks.

Voice: plain, direct, and concrete. These are people who work with their hands and have no patience for marketing language. Short sentences. Specific numbers over adjectives. Never call them "professionals" or "service pros" — they are contractors, plumbers, landscapers.

Never claim a feature that isn't described in the brief. Do not invent pricing, statistics, customer counts, or testimonials — a made-up number in published marketing is worse than a vague sentence.`;

const SEO_OUTPUT = `Return ONLY a JSON object, no markdown fences:
{
  "title": "the headline",
  "slug": "url-safe-slug",
  "metaTitle": "under 60 characters",
  "metaDescription": "under 160 characters",
  "body": "full content in Markdown, using ## and ### headings"
}`;

const SPECS: Record<TaskType, AssetSpec> = {
  write_blog_post: {
    assetType: 'blog_post',
    maxTokens: 4000,
    requiredFields: ['title', 'body'],
    systemPrompt: `${BRAND_CONTEXT}

Write a blog post of 800-1200 words that answers a real question a contractor would search for. Lead with the answer rather than building up to it — someone searching this has a problem right now.

Mention Task Iguana at most twice, and only where it genuinely solves what the post describes. A post that helps someone who never buys is still worth publishing; a post that reads like an ad is not.

${SEO_OUTPUT}`,
  },

  write_landing_page: {
    assetType: 'landing_page',
    maxTokens: 4000,
    requiredFields: ['title', 'body'],
    systemPrompt: `${BRAND_CONTEXT}

Write a landing page targeting one specific search intent. Structure: headline, one-paragraph statement of the problem in the contractor's own words, the three or four things the product does about it, a short FAQ answering real objections (price, migration, contract length), and a closing call to action.

Be concrete about what the product does. Vague benefit language converts nobody and cannot be fact-checked.

${SEO_OUTPUT}`,
  },

  write_comparison_page: {
    assetType: 'comparison_page',
    maxTokens: 4000,
    requiredFields: ['title', 'body'],
    systemPrompt: `${BRAND_CONTEXT}

Write a comparison page against the named competitor for someone actively searching for an alternative.

Accuracy is a legal matter here, not a stylistic one. State only what the brief tells you about the competitor. Where the brief is silent, say the comparison is unverified or leave the point out — never estimate a competitor's pricing or feature set. Acknowledge at least one thing the competitor genuinely does well; a page that claims total superiority reads as untrustworthy and converts worse.

${SEO_OUTPUT}`,
  },

  write_email: {
    assetType: 'email',
    maxTokens: 2000,
    requiredFields: ['title', 'body'],
    systemPrompt: `${BRAND_CONTEXT}

Write a single email of at most 200 words. One idea, one call to action. Subject line under 50 characters, written as something a person would send — not a campaign.

Return ONLY a JSON object, no markdown fences:
{ "title": "the subject line", "body": "the email body as plain text with paragraph breaks" }`,
  },

  write_social_posts: {
    assetType: 'social_posts',
    maxTokens: 2000,
    requiredFields: ['body'],
    systemPrompt: `${BRAND_CONTEXT}

Write 5 short social posts on the brief's topic, each standing alone. Contractors are on Facebook groups and YouTube — write the way someone talks in a trade group, not the way a brand posts. No hashtag spam, no "Are you tired of...". A useful specific tip beats a promotional line every time.

Return ONLY a JSON object, no markdown fences:
{ "body": "the 5 posts, separated by a line containing only ---" }`,
  },

  write_ad_copy: {
    assetType: 'ad_copy',
    maxTokens: 2000,
    requiredFields: ['body'],
    systemPrompt: `${BRAND_CONTEXT}

Write Google Ads responsive search ad copy: 8 headlines of at most 30 characters and 4 descriptions of at most 90 characters. Respect those limits exactly — anything longer is rejected on upload.

Target the brief's search intent. Do not use superlatives you cannot substantiate ("best", "#1").

Return ONLY a JSON object, no markdown fences:
{ "body": "HEADLINES:\\n1. ...\\n\\nDESCRIPTIONS:\\n1. ..." }`,
  },

  propose_experiment: {
    assetType: 'experiment_brief',
    maxTokens: 1500,
    requiredFields: ['title', 'body'],
    systemPrompt: `${BRAND_CONTEXT}

Write a one-page experiment brief: the hypothesis in a single sentence, the metric that would confirm or refute it, what to build, and the smallest version that would still produce a usable answer.

State what result would make you abandon the idea. An experiment that cannot fail is not an experiment.

Return ONLY a JSON object, no markdown fences:
{ "title": "the hypothesis", "body": "the brief in Markdown" }`,
  },

  fix_funnel_leak: {
    assetType: 'funnel_brief',
    maxTokens: 1500,
    requiredFields: ['title', 'body'],
    systemPrompt: `${BRAND_CONTEXT}

Write a short brief on the funnel problem in the task: where visitors are dropping, the most likely causes ranked by how cheap they are to test, and the specific change to make first.

Recommend one change, not a list. A founder with no marketing team will do the first thing or nothing.

Return ONLY a JSON object, no markdown fences:
{ "title": "the problem in one line", "body": "the brief in Markdown" }`,
  },
};

export function getAssetSpec(taskType: TaskType): AssetSpec | null {
  return SPECS[taskType] ?? null;
}

export function buildGenerationPrompt(task: GenerationTask): string {
  return [
    `Task: ${task.title}`,
    `Why this was chosen: ${task.rationale}`,
    task.expectedImpact ? `Expected impact: ${task.expectedImpact}` : null,
    `Channel: ${task.channel}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export interface GeneratedAsset {
  title: string | null;
  slug: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  body: string;
}

/** Slugify a title for asset types that need a URL. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/^-|-$/g, '');
}

/**
 * Validate generated content.
 *
 * Returns null when the model produced nothing usable, so the caller marks the
 * task failed rather than saving an empty asset that looks like work.
 */
export function parseGeneratedAsset(parsed: unknown, spec: AssetSpec): GeneratedAsset | null {
  const root = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;

  const text = (value: unknown, max: number): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, max) : null;
  };

  const body = text(root.body, 60000);
  if (!body) return null;

  for (const field of spec.requiredFields) {
    if (!text(root[field], 60000)) return null;
  }

  const title = text(root.title, 300);

  return {
    title,
    slug: text(root.slug, 80) || (title ? slugify(title) : null),
    metaTitle: text(root.metaTitle, 200),
    metaDescription: text(root.metaDescription, 500),
    body,
  };
}
