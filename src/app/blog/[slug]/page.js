'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, ArrowLeft, Calendar, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function BlogPostPage() {
  const t = useTranslations('blog.post');
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await fetch(`/api/platform-blog/?slug=${slug}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Post not found');
        setPost(data.post);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    }
    if (slug) fetchPost();
  }, [slug]);

  // Simple markdown to HTML (handles ##, ###, **, *, -, numbered lists)
  function renderMarkdown(md) {
    if (!md) return '';
    return md
      .split('\n')
      .map((line, i) => {
        // Headings
        if (line.startsWith('### ')) return `<h3 class="text-xl font-bold text-white mt-8 mb-3">${line.slice(4)}</h3>`;
        if (line.startsWith('## ')) return `<h2 class="text-2xl font-bold text-white mt-10 mb-4">${line.slice(3)}</h2>`;
        // Bold
        line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // Italic
        line = line.replace(/\*(.+?)\*/g, '<em>$1</em>');
        // Bullet lists
        if (line.startsWith('- ')) return `<li class="ml-6 mb-1 list-disc text-white/80">${line.slice(2)}</li>`;
        // Numbered lists
        if (/^\d+\.\s/.test(line)) return `<li class="ml-6 mb-1 list-decimal text-white/80">${line.replace(/^\d+\.\s/, '')}</li>`;
        // Empty lines
        if (line.trim() === '') return '<div class="h-4"></div>';
        // Regular paragraph
        return `<p class="text-white/80 leading-relaxed mb-4">${line}</p>`;
      })
      .join('\n');
  }

  return (
    <div className="min-h-screen bg-[#12151C]">
      {/* Nav */}
      <nav className="sticky top-0 bg-[#0A0C11]/90 backdrop-blur-md z-50 border-b border-white/10">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/">
            <Image
              src="/logo-horizontal-white-01262026.png"
              alt="Task Iguana"
              width={180}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/jenny" className="text-[#1FE3C4] font-semibold hover:text-[#1E7FE0] no-underline">{t('navJennyAi')}</Link>
            <Link href="/#features" className="text-white/60 hover:text-white no-underline">{t('navFeatures')}</Link>
            <Link href="/pricing" className="text-white/60 hover:text-white no-underline">{t('navPricing')}</Link>
            <Link href="/blog" className="text-white font-semibold no-underline">{t('navBlog')}</Link>
            <LanguageSwitcher />
            <Link href="/auth/signup" className="bg-[#2E9BFF] text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-[#1E7FE0] no-underline">
              {t('navStartTrial')}
            </Link>
          </div>
        </div>
      </nav>

      {loading ? (
        <div className="max-w-[800px] mx-auto px-6 py-16">
          <div className="h-8 w-64 bg-gray-200 animate-pulse rounded mb-4" />
          <div className="h-5 w-96 bg-white/10 animate-pulse rounded mb-8" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-4 bg-white/10 animate-pulse rounded" style={{ width: `${80 + Math.random() * 20}%` }} />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="max-w-[800px] mx-auto px-6 py-16 text-center">
          <h1 className="text-3xl font-bold text-gray-300 mb-4">{t('postNotFound')}</h1>
          <p className="text-white/50 mb-8">{error}</p>
          <Link href="/blog" className="text-[#2E9BFF] font-semibold no-underline flex items-center gap-2 justify-center">
            <ArrowLeft size={18} /> {t('backToBlog')}
          </Link>
        </div>
      ) : post ? (
        <>
          {/* Post header */}
          <div className="bg-gradient-to-b from-[#0A0C11] to-[#2d2d4e] text-white py-16">
            <div className="max-w-[800px] mx-auto px-6">
              <Link href="/blog" className="text-white/50 hover:text-white no-underline flex items-center gap-2 mb-6 text-sm">
                <ArrowLeft size={16} /> {t('backToBlog')}
              </Link>
              {post.category && (
                <span className="inline-block px-3 py-1 bg-white/10 text-white/80 rounded-full text-xs font-semibold uppercase mb-4">
                  {post.category.replace('-', ' ')}
                </span>
              )}
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{post.title}</h1>
              {post.excerpt && (
                <p className="text-xl text-white/70 mb-6">{post.excerpt}</p>
              )}
              <div className="flex items-center gap-6 text-sm text-white/50">
                <span className="flex items-center gap-1.5">
                  <User size={14} /> {post.author_name}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  {post.published_at
                    ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                    : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} /> {post.read_time_minutes} {t('minRead')}
                </span>
              </div>
            </div>
          </div>

          {/* Post content */}
          <article className="max-w-[800px] mx-auto px-6 py-12">
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
            />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-12 pt-8 border-t border-white/10">
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-white/10 text-white/60 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* CTA */}
          <div className="bg-gradient-to-r from-[#2E9BFF] to-[#1E7FE0] py-12">
            <div className="max-w-[800px] mx-auto px-6 text-center">
              <h2 className="text-2xl font-bold text-white mb-3">{t('ctaTitle')}</h2>
              <p className="text-white/80 mb-6">
                {t('ctaSubtitle')}
              </p>
              <Link
                href="/auth/signup"
                className="inline-block bg-[#12151C] text-[#2E9BFF] px-8 py-3 rounded-lg font-bold text-lg hover:bg-white/10 transition-colors no-underline"
              >
                {t('ctaButton')}
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
