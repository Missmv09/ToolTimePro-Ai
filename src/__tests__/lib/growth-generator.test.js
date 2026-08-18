/**
 * Tests for the growth agent generator.
 *
 * The important property: an asset that saved but is empty or truncated looks
 * like completed work in the approval queue. Anything unusable must fail
 * loudly instead, so the task is marked failed rather than quietly shipping a
 * blank draft.
 */

import {
  buildGenerationPrompt,
  getAssetSpec,
  parseGeneratedAsset,
  slugify,
} from '@/lib/growth-generator';
import { TASK_TYPES } from '@/lib/growth-planner';

describe('getAssetSpec', () => {
  it('covers every task type the planner is allowed to propose', () => {
    // A planner task with no generator behind it is a dead end that only
    // surfaces in production, so the two lists must stay in step.
    for (const taskType of TASK_TYPES) {
      const spec = getAssetSpec(taskType);
      expect(spec).not.toBeNull();
      expect(spec.assetType).toBeTruthy();
      expect(spec.requiredFields.length).toBeGreaterThan(0);
    }
  });

  it('returns null for an unknown type', () => {
    expect(getAssetSpec('write_a_novel')).toBeNull();
  });

  it('tells the model not to invent facts', () => {
    expect(getAssetSpec('write_blog_post').systemPrompt).toContain('Do not invent pricing');
  });

  // Competitor claims are a legal exposure, not a style choice.
  it('constrains competitor claims on comparison pages', () => {
    const prompt = getAssetSpec('write_comparison_page').systemPrompt;
    expect(prompt).toContain('never estimate a competitor');
    expect(prompt).toContain('unverified');
  });

  it('gives ad copy the character limits Google enforces on upload', () => {
    const prompt = getAssetSpec('write_ad_copy').systemPrompt;
    expect(prompt).toContain('30 characters');
    expect(prompt).toContain('90 characters');
  });
});

describe('buildGenerationPrompt', () => {
  it('passes the brief and the reasoning behind it', () => {
    const prompt = buildGenerationPrompt({
      title: 'Workiz alternative page',
      rationale: 'Comparison pages convert best',
      channel: 'comparison_page',
      taskType: 'write_comparison_page',
      expectedImpact: '15 leads/month',
    });
    expect(prompt).toContain('Workiz alternative page');
    expect(prompt).toContain('Comparison pages convert best');
    expect(prompt).toContain('15 leads/month');
  });

  it('omits the impact line when there is none', () => {
    const prompt = buildGenerationPrompt({
      title: 'A task',
      rationale: 'Because',
      channel: 'blog',
      taskType: 'write_blog_post',
      expectedImpact: null,
    });
    expect(prompt).not.toContain('Expected impact');
  });
});

describe('parseGeneratedAsset', () => {
  const spec = getAssetSpec('write_blog_post');

  it('accepts a complete asset', () => {
    const asset = parseGeneratedAsset(
      {
        title: 'How to Price HVAC Jobs',
        slug: 'how-to-price-hvac-jobs',
        metaTitle: 'Pricing HVAC Jobs',
        metaDescription: 'A guide.',
        body: '## Intro\n\nSome content.',
      },
      spec
    );
    expect(asset.title).toBe('How to Price HVAC Jobs');
    expect(asset.body).toContain('## Intro');
  });

  it('derives a slug when the model omits one', () => {
    const asset = parseGeneratedAsset(
      { title: 'How to Price HVAC Jobs in 2026!', body: 'content' },
      spec
    );
    expect(asset.slug).toBe('how-to-price-hvac-jobs-in-2026');
  });

  // Saving these would put an empty draft in the queue looking like real work.
  it.each([
    ['an empty body', { title: 'A title', body: '' }],
    ['a whitespace body', { title: 'A title', body: '   \n  ' }],
    ['no body at all', { title: 'A title' }],
    ['a missing required title', { body: 'content' }],
    ['a non-object response', 'just some prose'],
    ['null', null],
  ])('returns null for %s', (_label, input) => {
    expect(parseGeneratedAsset(input, spec)).toBeNull();
  });

  it('does not require a title where the spec does not', () => {
    const socialSpec = getAssetSpec('write_social_posts');
    const asset = parseGeneratedAsset({ body: 'post one\n---\npost two' }, socialSpec);
    expect(asset).not.toBeNull();
    expect(asset.title).toBeNull();
  });
});

describe('slugify', () => {
  it.each([
    ['How to Price HVAC Jobs', 'how-to-price-hvac-jobs'],
    ['Jobber vs. Task Iguana: Which?', 'jobber-vs-task-iguana-which'],
    ['  Multiple   Spaces  ', 'multiple-spaces'],
    ['Trailing punctuation!!!', 'trailing-punctuation'],
  ])('turns %s into a url-safe slug', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('bounds length and never leaves a trailing dash', () => {
    const slug = slugify('word '.repeat(50));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
  });
});
