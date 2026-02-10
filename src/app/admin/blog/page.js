'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  FileText,
  Clock,
  CheckCircle,
  Trash2,
  Eye,
  Send,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Wand2,
  Globe,
  ArrowLeft,
} from 'lucide-react';

const PLATFORM_TOPICS = [
  // Attract contractors searching for software
  'Best Software for Managing a Painting Business in 2026',
  'How to Price HVAC Jobs for Maximum Profit',
  'Contractor Invoicing: Stop Losing Money on Late Payments',
  'How to Get More Google Reviews for Your Home Service Business',
  'The Complete Guide to Hiring Your First Employee as a Contractor',
  // SEO comparison content
  'Jobber vs ToolTime Pro: Which Is Better for Small Contractors?',
  'Why Contractors Are Switching from Pen and Paper to Software',
  'How CRM Software Helps Plumbers Win More Jobs',
  // Tips for growth
  '10 Marketing Tips for Landscaping Companies',
  'How to Scale Your Cleaning Business from Solo to 10 Employees',
  'The Real Cost of Not Having a Business Website',
  'How to Handle Difficult Customers as a Contractor',
];

const CATEGORIES = [
  { id: 'tips', label: 'Tips & Tricks' },
  { id: 'guides', label: 'Guides' },
  { id: 'industry-news', label: 'Industry News' },
  { id: 'product-updates', label: 'Product Updates' },
  { id: 'comparison', label: 'Comparisons' },
];

export default function AdminBlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [expandedPost, setExpandedPost] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Generator form
  const [topic, setTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [category, setCategory] = useState('tips');

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform-blog?admin=true');
      const data = await res.json();
      setPosts(data.posts || []);
    } catch {
      setPosts([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleGenerate = async () => {
    const selectedTopic = customTopic.trim() || topic;
    if (!selectedTopic) {
      setError('Please select or enter a topic.');
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      // Generate with AI
      const aiRes = await fetch('/api/platform-blog/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: selectedTopic, category }),
      });

      const aiData = await aiRes.json();
      if (!aiRes.ok) throw new Error(aiData.error || 'AI generation failed');

      // Save to database
      const saveRes = await fetch('/api/platform-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: aiData.title,
          content: aiData.content,
          excerpt: aiData.excerpt,
          category,
          tags: aiData.suggestedTags || [],
          metaTitle: aiData.metaTitle,
          metaDescription: aiData.metaDescription,
          metaKeywords: aiData.metaKeywords,
          status: 'draft',
        }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || 'Failed to save');

      setSuccess(`"${aiData.title}" generated! (${aiData.wordCount} words)`);
      setCustomTopic('');
      setTopic('');
      setShowGenerator(false);
      fetchPosts();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async (post) => {
    try {
      const res = await fetch('/api/platform-blog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, status: 'published', published_at: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error('Failed to publish');
      setSuccess(`"${post.title}" published!`);
      fetchPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUnpublish = async (post) => {
    try {
      const res = await fetch('/api/platform-blog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, status: 'draft' }),
      });
      if (!res.ok) throw new Error('Failed to unpublish');
      setSuccess(`"${post.title}" moved to drafts.`);
      fetchPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFeature = async (post) => {
    try {
      const res = await fetch('/api/platform-blog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, featured: !post.featured }),
      });
      if (!res.ok) throw new Error('Failed to update');
      fetchPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (post) => {
    if (!confirm(`Delete "${post.title}"?`)) return;
    try {
      const res = await fetch(`/api/platform-blog?id=${post.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      fetchPosts();
      if (expandedPost === post.id) setExpandedPost(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 no-underline flex items-center gap-1 mb-2">
              <ArrowLeft size={14} /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-[#1a1a2e]">Platform Blog Admin</h1>
            <p className="text-gray-500 mt-1">Manage blog posts on tooltimepro.com/blog</p>
          </div>
          <div className="flex gap-3">
            <Link href="/blog" target="_blank" className="btn-ghost flex items-center gap-2 px-4 py-2 border rounded-lg text-sm no-underline text-gray-600 hover:bg-gray-100">
              <Globe size={16} /> View Blog
            </Link>
            <button
              onClick={() => setShowGenerator(!showGenerator)}
              className="flex items-center gap-2 px-4 py-2 bg-[#f97316] text-white rounded-lg font-semibold hover:bg-[#ea580c] transition-colors"
            >
              <Wand2 size={18} /> Generate Post
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex justify-between">
            {error}
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">&times;</button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex justify-between">
            {success}
            <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600">&times;</button>
          </div>
        )}

        {/* Generator */}
        {showGenerator && (
          <div className="bg-white rounded-xl border-2 border-[#f97316]/30 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={20} className="text-[#f97316]" />
              <h2 className="text-lg font-semibold text-[#1a1a2e]">AI Blog Generator</h2>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Pick a topic or write your own</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {PLATFORM_TOPICS.map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTopic(t); setCustomTopic(''); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      topic === t
                        ? 'bg-[#f97316] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f97316]/50 focus:border-[#f97316] outline-none"
                placeholder="Or type a custom topic..."
                value={customTopic}
                onChange={(e) => { setCustomTopic(e.target.value); setTopic(''); }}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Category</label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f97316]/50 focus:border-[#f97316] outline-none"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || (!topic && !customTopic.trim())}
              className="w-full px-4 py-3 bg-[#f97316] text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-[#ea580c] disabled:opacity-50 transition-colors"
            >
              {generating ? (
                <><RefreshCw size={18} className="animate-spin" /> Generating...</>
              ) : (
                <><Sparkles size={18} /> Generate Blog Post</>
              )}
            </button>
            {generating && <p className="text-xs text-gray-500 text-center mt-2">Takes 15-30 seconds...</p>}
          </div>
        )}

        {/* Posts */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="h-5 w-64 bg-gray-200 animate-pulse rounded mb-2" />
                <div className="h-4 w-96 bg-gray-100 animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-[#1a1a2e] mb-2">No platform blog posts yet</h3>
            <p className="text-gray-500 mb-6">Generate your first post to start attracting contractors to ToolTime Pro.</p>
            <button
              onClick={() => setShowGenerator(true)}
              className="inline-flex items-center gap-2 px-6 py-2 bg-[#f97316] text-white rounded-lg font-semibold hover:bg-[#ea580c]"
            >
              <Wand2 size={18} /> Generate First Post
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {post.status === 'published' ? <CheckCircle size={10} /> : <Clock size={10} />}
                        {post.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                      {post.featured && (
                        <span className="px-2 py-0.5 bg-[#f97316]/10 text-[#f97316] rounded-full text-xs font-medium">Featured</span>
                      )}
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs capitalize">{post.category?.replace('-', ' ')}</span>
                      <span className="text-xs text-gray-400">{post.word_count} words · {post.read_time_minutes} min</span>
                    </div>
                    <h3 className="font-semibold text-[#1a1a2e] text-lg">{post.title}</h3>
                    {post.excerpt && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{post.excerpt}</p>}
                    <p className="text-xs text-gray-400 mt-2">
                      {post.published_at ? `Published ${new Date(post.published_at).toLocaleDateString()}` : `Created ${new Date(post.created_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                    className="text-gray-400 hover:text-gray-600 p-1 ml-3"
                  >
                    {expandedPost === post.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>

                {expandedPost === post.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {post.meta_title && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs font-semibold text-blue-700 mb-1">SEO Preview</p>
                        <p className="text-sm font-medium text-blue-900">{post.meta_title}</p>
                        <p className="text-xs text-blue-700 mt-0.5">{post.meta_description}</p>
                      </div>
                    )}
                    <div className="prose prose-sm max-w-none text-gray-600 mb-4 max-h-96 overflow-y-auto whitespace-pre-wrap">
                      {post.content}
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      {post.status === 'draft' ? (
                        <button onClick={() => handlePublish(post)} className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1.5">
                          <Send size={14} /> Publish
                        </button>
                      ) : (
                        <button onClick={() => handleUnpublish(post)} className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 flex items-center gap-1.5">
                          <Clock size={14} /> Unpublish
                        </button>
                      )}
                      {post.status === 'published' && (
                        <Link href={`/blog/${post.slug}`} target="_blank" className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1.5 no-underline">
                          <Eye size={14} /> View
                        </Link>
                      )}
                      <button onClick={() => handleFeature(post)} className={`px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${post.featured ? 'bg-[#f97316]/10 text-[#f97316]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {post.featured ? 'Unfeature' : 'Feature'}
                      </button>
                      <button onClick={() => handleDelete(post)} className="px-4 py-1.5 bg-gray-100 text-red-500 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center gap-1.5">
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
