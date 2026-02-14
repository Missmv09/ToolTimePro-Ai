'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Sparkles,
  FileText,
  Clock,
  CheckCircle,
  Trash2,
  Eye,
  Copy,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Wand2,
} from 'lucide-react';

// Trade-specific topic suggestions
const TOPIC_SUGGESTIONS = {
  painter: [
    'How Much Does Interior Painting Cost?',
    'How to Choose the Right Paint Colors for Your Home',
    '5 Signs It\'s Time to Repaint Your Exterior',
    'DIY vs Hiring a Professional Painter',
    'How to Prepare Your Home for a Paint Job',
  ],
  landscaper: [
    'Best Low-Maintenance Landscaping Ideas',
    'How to Keep Your Lawn Green All Summer',
    'Top Drought-Resistant Plants for Your Yard',
    'When to Hire a Professional Landscaper',
    'Seasonal Lawn Care Checklist',
  ],
  plumber: [
    'Signs You Need Emergency Plumbing Service',
    'How to Prevent Frozen Pipes This Winter',
    'When to Replace vs Repair Your Water Heater',
    'Common Causes of Low Water Pressure',
    'How to Avoid Costly Plumbing Repairs',
  ],
  electrician: [
    'Signs Your Home Needs an Electrical Panel Upgrade',
    'How Much Does It Cost to Rewire a House?',
    'EV Charger Installation: What Homeowners Need to Know',
    'Electrical Safety Tips Every Homeowner Should Know',
    'Smart Home Wiring: Is It Worth the Investment?',
  ],
  hvac: [
    'How Often Should You Replace Your HVAC Filter?',
    'Signs Your AC Needs Repair or Replacement',
    'How to Lower Your Energy Bills with HVAC Maintenance',
    'Heat Pump vs Furnace: Which Is Right for Your Home?',
    'Indoor Air Quality: Why It Matters and How to Improve It',
  ],
  cleaner: [
    'How Often Should You Deep Clean Your Home?',
    'What to Expect from a Professional Cleaning Service',
    'Move-In/Move-Out Cleaning Checklist',
    'Green Cleaning: Safe Products for Your Family',
    'Post-Construction Cleaning: Why You Need a Pro',
  ],
  roofer: [
    'How to Know When You Need a New Roof',
    'Storm Damage: What to Do After a Hail Storm',
    'Metal Roof vs Shingles: Pros and Cons',
    'How Long Does a Roof Last? A Homeowner\'s Guide',
    'Roof Maintenance Tips to Extend Your Roof\'s Life',
  ],
  general: [
    'How to Plan a Home Renovation on a Budget',
    'Permits: What Home Projects Require Them?',
    'How to Choose the Right Contractor',
    'Top Home Improvements That Add Value',
    'Questions to Ask Before Hiring a Contractor',
  ],
};

// Fallback for trades not listed
const DEFAULT_TOPICS = [
  'Why Hire a Licensed Professional?',
  'How to Get the Best Quote for Your Project',
  'Seasonal Maintenance Tips for Homeowners',
  'Questions to Ask Before Hiring a Pro',
  'How to Prepare Your Home for Service',
];

export default function BlogPage() {
  const { company, user, dbUser } = useAuth();
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
  const [location, setLocation] = useState('');
  const [tone, setTone] = useState('professional and helpful');

  const trade = company?.industry
    ? company.industry.split(',')[0].trim()
    : 'general';

  // Map industry to trade for topic suggestions
  const tradeTopics = TOPIC_SUGGESTIONS[trade] || DEFAULT_TOPICS;

  // Pre-fill location from company (include surrounding areas for service businesses)
  useEffect(() => {
    if (company) {
      const parts = [company.city, company.state].filter(Boolean);
      if (parts.length > 0) {
        setLocation(parts.join(', ') + ' & surrounding areas');
      }
    }
  }, [company]);

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    if (!dbUser?.company_id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('company_id', dbUser.company_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
    } else {
      setPosts(data || []);
    }
    setLoading(false);
  }, [dbUser?.company_id]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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
      // Step 1: Generate content with AI
      const aiRes = await fetch('/api/blog/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trade,
          location,
          topic: selectedTopic,
          businessName: company?.name || '',
          tone,
        }),
      });

      const aiData = await aiRes.json();
      if (!aiRes.ok) {
        throw new Error(aiData.error || 'AI generation failed');
      }

      // Step 2: Save to database
      const saveRes = await fetch('/api/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: dbUser.company_id,
          userId: user.id,
          title: aiData.title,
          content: aiData.content,
          excerpt: aiData.excerpt,
          metaTitle: aiData.metaTitle,
          metaDescription: aiData.metaDescription,
          metaKeywords: aiData.metaKeywords,
          trade,
          location,
          topic: selectedTopic,
          wordCount: aiData.wordCount,
          status: 'draft',
        }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        throw new Error(saveData.error || 'Failed to save post');
      }

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
    const { error } = await supabase
      .from('blog_posts')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', post.id);

    if (error) {
      setError('Failed to publish post');
    } else {
      setSuccess(`"${post.title}" published!`);
      fetchPosts();
    }
  };

  const handleDelete = async (post) => {
    if (!confirm(`Delete "${post.title}"?`)) return;

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', post.id);

    if (error) {
      setError('Failed to delete post');
    } else {
      fetchPosts();
      if (expandedPost === post.id) setExpandedPost(null);
    }
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    setSuccess('Content copied to clipboard!');
    setTimeout(() => setSuccess(null), 2000);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-500">Blog</h1>
          <p className="text-gray-500 mt-1">AI-generated SEO blog posts for your website.</p>
        </div>
        <button
          onClick={() => setShowGenerator(!showGenerator)}
          className="btn-secondary flex items-center gap-2"
        >
          <Wand2 size={18} />
          Generate Post
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex justify-between items-center">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">&times;</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex justify-between items-center">
          {success}
          <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600">&times;</button>
        </div>
      )}

      {/* AI Generator Panel */}
      {showGenerator && (
        <div className="card mb-6 border-2 border-gold-200 bg-gold-50/30">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={20} className="text-gold-500" />
            <h2 className="text-lg font-semibold text-navy-500">AI Blog Generator</h2>
          </div>

          {/* Topic suggestions */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-navy-500 mb-2">
              Pick a topic or write your own
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {tradeTopics.map((t) => (
                <button
                  key={t}
                  onClick={() => { setTopic(t); setCustomTopic(''); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    topic === t
                      ? 'bg-gold-500 text-navy-500'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-gold-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="input"
              placeholder="Or type a custom topic..."
              value={customTopic}
              onChange={(e) => { setCustomTopic(e.target.value); setTopic(''); }}
            />
          </div>

          {/* Location */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-navy-500 mb-1">Location (for local SEO)</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Phoenix, AZ"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Tone */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-navy-500 mb-1">Tone</label>
            <select
              className="input"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            >
              <option value="professional and helpful">Professional & Helpful</option>
              <option value="friendly and conversational">Friendly & Conversational</option>
              <option value="authoritative and expert">Authoritative & Expert</option>
              <option value="casual and approachable">Casual & Approachable</option>
            </select>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating || (!topic && !customTopic.trim())}
            className="btn-secondary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {generating ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Generating blog post...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generate Blog Post
              </>
            )}
          </button>

          {generating && (
            <p className="text-xs text-gray-500 text-center mt-2">
              This usually takes 10-20 seconds...
            </p>
          )}
        </div>
      )}

      {/* Posts list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="h-5 w-64 bg-gray-200 animate-pulse rounded mb-2" />
              <div className="h-4 w-96 bg-gray-100 animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="card text-center py-16">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-navy-500 mb-2">No blog posts yet</h3>
          <p className="text-gray-500 mb-6">
            Generate your first AI-powered blog post to boost your website&apos;s SEO.
          </p>
          <button
            onClick={() => setShowGenerator(true)}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <Wand2 size={18} />
            Generate Your First Post
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="card">
              {/* Post header */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      post.status === 'published'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {post.status === 'published' ? <CheckCircle size={10} /> : <Clock size={10} />}
                      {post.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                    {post.ai_generated && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        <Sparkles size={10} />
                        AI
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {post.word_count} words
                    </span>
                  </div>
                  <h3 className="font-semibold text-navy-500 text-lg">{post.title}</h3>
                  {post.excerpt && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{post.excerpt}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {post.location && <span>{post.location}</span>}
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                  className="text-gray-400 hover:text-navy-500 p-1"
                >
                  {expandedPost === post.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>

              {/* Expanded content */}
              {expandedPost === post.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {/* SEO info */}
                  {(post.meta_title || post.meta_description) && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs font-semibold text-blue-700 mb-1">SEO Preview</p>
                      <p className="text-sm font-medium text-blue-900">{post.meta_title}</p>
                      <p className="text-xs text-blue-700 mt-0.5">{post.meta_description}</p>
                      {post.meta_keywords && (
                        <p className="text-xs text-blue-500 mt-1">Keywords: {post.meta_keywords}</p>
                      )}
                    </div>
                  )}

                  {/* Content preview */}
                  <div className="prose prose-sm max-w-none text-gray-600 mb-4 max-h-96 overflow-y-auto whitespace-pre-wrap">
                    {post.content}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    {post.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(post)}
                        className="btn-secondary text-sm px-4 py-1.5 flex items-center gap-1.5"
                      >
                        <CheckCircle size={14} />
                        Publish
                      </button>
                    )}
                    <button
                      onClick={() => handleCopy(post.content)}
                      className="btn-ghost text-sm px-4 py-1.5 flex items-center gap-1.5"
                    >
                      <Copy size={14} />
                      Copy Content
                    </button>
                    <button
                      onClick={() => handleDelete(post)}
                      className="btn-ghost text-sm px-4 py-1.5 flex items-center gap-1.5 text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
