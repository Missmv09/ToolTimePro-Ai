'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, ArrowLeft, Calendar, User } from 'lucide-react';

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await fetch(`/api/platform-blog?slug=${slug}`);
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
        if (line.startsWith('### ')) return `<h3 class="text-xl font-bold text-[#1a1a2e] mt-8 mb-3">${line.slice(4)}</h3>`;
        if (line.startsWith('## ')) return `<h2 class="text-2xl font-bold text-[#1a1a2e] mt-10 mb-4">${line.slice(3)}</h2>`;
        // Bold
        line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // Italic
        line = line.replace(/\*(.+?)\*/g, '<em>$1</em>');
        // Bullet lists
        if (line.startsWith('- ')) return `<li class="ml-6 mb-1 list-disc text-gray-700">${line.slice(2)}</li>`;
        // Numbered lists
        if (/^\d+\.\s/.test(line)) return `<li class="ml-6 mb-1 list-decimal text-gray-700">${line.replace(/^\d+\.\s/, '')}</li>`;
        // Empty lines
        if (line.trim() === '') return '<div class="h-4"></div>';
        // Regular paragraph
        return `<p class="text-gray-700 leading-relaxed mb-4">${line}</p>`;
      })
      .join('\n');
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 bg-white/95 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/">
            <Image
              src="/logo-01262026.png"
              alt="ToolTime Pro"
              width={180}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/jenny" className="text-[#f5a623] font-semibold hover:text-[#e6991a] no-underline">Jenny AI</Link>
            <Link href="/#features" className="text-gray-600 hover:text-gray-900 no-underline">Features</Link>
            <Link href="/pricing" className="text-gray-600 hover:text-gray-900 no-underline">Pricing</Link>
            <Link href="/blog" className="text-[#1a1a2e] font-semibold no-underline">Blog</Link>
            <Link href="/auth/signup" className="bg-[#f97316] text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-[#ea580c] no-underline">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {loading ? (
        <div className="max-w-[800px] mx-auto px-6 py-16">
          <div className="h-8 w-64 bg-gray-200 animate-pulse rounded mb-4" />
          <div className="h-5 w-96 bg-gray-100 animate-pulse rounded mb-8" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-4 bg-gray-100 animate-pulse rounded" style={{ width: `${80 + Math.random() * 20}%` }} />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="max-w-[800px] mx-auto px-6 py-16 text-center">
          <h1 className="text-3xl font-bold text-gray-300 mb-4">Post not found</h1>
          <p className="text-gray-500 mb-8">{error}</p>
          <Link href="/blog" className="text-[#f97316] font-semibold no-underline flex items-center gap-2 justify-center">
            <ArrowLeft size={18} /> Back to Blog
          </Link>
        </div>
      ) : post ? (
        <>
          {/* Post header */}
          <div className="bg-gradient-to-b from-[#1a1a2e] to-[#2d2d4e] text-white py-16">
            <div className="max-w-[800px] mx-auto px-6">
              <Link href="/blog" className="text-white/50 hover:text-white no-underline flex items-center gap-2 mb-6 text-sm">
                <ArrowLeft size={16} /> Back to Blog
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
                  <Clock size={14} /> {post.read_time_minutes} min read
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
              <div className="mt-12 pt-8 border-t border-gray-200">
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* CTA */}
          <div className="bg-gradient-to-r from-[#f97316] to-[#ea580c] py-12">
            <div className="max-w-[800px] mx-auto px-6 text-center">
              <h2 className="text-2xl font-bold text-white mb-3">Ready to grow your business?</h2>
              <p className="text-white/80 mb-6">
                Try ToolTime Pro free for 14 days. No credit card required.
              </p>
              <Link
                href="/auth/signup"
                className="inline-block bg-white text-[#f97316] px-8 py-3 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors no-underline"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
