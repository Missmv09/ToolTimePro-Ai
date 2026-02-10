'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, ArrowRight, Tag } from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Posts' },
  { id: 'tips', label: 'Tips & Tricks' },
  { id: 'guides', label: 'Guides' },
  { id: 'industry-news', label: 'Industry News' },
  { id: 'product-updates', label: 'Product Updates' },
];

export default function BlogListingPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    async function fetchPosts() {
      setLoading(true);
      try {
        const params = category !== 'all' ? `?category=${category}` : '';
        const res = await fetch(`/api/platform-blog${params}`);
        const data = await res.json();
        setPosts(data.posts || []);
      } catch {
        setPosts([]);
      }
      setLoading(false);
    }
    fetchPosts();
  }, [category]);

  const featuredPost = posts.find((p) => p.featured);
  const regularPosts = posts.filter((p) => !p.featured || posts.length <= 1);

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

      {/* Hero */}
      <div className="bg-gradient-to-b from-[#1a1a2e] to-[#2d2d4e] text-white py-16">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">ToolTime Pro Blog</h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Tips, guides, and insights to help you grow your home service business.
          </p>
        </div>
      </div>

      {/* Category filter */}
      <div className="max-w-[1200px] mx-auto px-6 py-6">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                category === cat.id
                  ? 'bg-[#1a1a2e] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1200px] mx-auto px-6 pb-20">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="h-48 bg-gray-200 animate-pulse" />
                <div className="p-6 space-y-3">
                  <div className="h-4 w-20 bg-gray-200 animate-pulse rounded" />
                  <div className="h-6 w-full bg-gray-200 animate-pulse rounded" />
                  <div className="h-4 w-3/4 bg-gray-100 animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl font-bold text-gray-300 mb-2">Coming soon</p>
            <p className="text-gray-500">We&apos;re working on great content for you. Check back soon!</p>
          </div>
        ) : (
          <>
            {/* Featured post */}
            {featuredPost && posts.length > 1 && (
              <Link href={`/blog/${featuredPost.slug}`} className="block mb-12 no-underline group">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-64 lg:h-auto bg-gradient-to-br from-[#1a1a2e] to-[#f97316] flex items-center justify-center">
                    <span className="text-6xl">📝</span>
                  </div>
                  <div className="p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-3 py-1 bg-[#f97316]/10 text-[#f97316] rounded-full text-xs font-semibold uppercase">
                        Featured
                      </span>
                      <span className="text-sm text-gray-400 flex items-center gap-1">
                        <Clock size={14} /> {featuredPost.read_time_minutes} min read
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-[#1a1a2e] mb-3 group-hover:text-[#f97316] transition-colors">
                      {featuredPost.title}
                    </h2>
                    <p className="text-gray-600 mb-4 line-clamp-3">{featuredPost.excerpt}</p>
                    <span className="text-[#f97316] font-semibold flex items-center gap-1">
                      Read more <ArrowRight size={16} />
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* Post grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {regularPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all no-underline"
                >
                  <div className="h-48 bg-gradient-to-br from-[#1a1a2e] to-[#333357] flex items-center justify-center">
                    <span className="text-4xl opacity-50">
                      {post.category === 'tips' ? '💡' : post.category === 'guides' ? '📖' : post.category === 'product-updates' ? '🚀' : '📰'}
                    </span>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      {post.category && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium capitalize">
                          {post.category.replace('-', ' ')}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={12} /> {post.read_time_minutes} min
                      </span>
                    </div>
                    <h3 className="font-bold text-[#1a1a2e] text-lg mb-2 group-hover:text-[#f97316] transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-3 mb-4">{post.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </span>
                      <span className="text-[#f97316] text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                        Read <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* CTA */}
      <div className="bg-[#1a1a2e] py-16">
        <div className="max-w-[800px] mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to grow your business?</h2>
          <p className="text-white/60 mb-8">
            Join thousands of contractors using ToolTime Pro to manage jobs, send invoices, and win more customers.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block bg-[#f97316] text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-[#ea580c] transition-colors no-underline"
          >
            Start Your Free 14-Day Trial
          </Link>
        </div>
      </div>
    </div>
  );
}
