import React, { useState, useMemo, useEffect, useDeferredValue, Suspense } from 'react';
import { AITool, ActiveTab } from '../types';
import { trackSearch, trackCategoryView } from '../lib/analytics';
import { 
  Search, 
  Star, 
  ExternalLink, 
  Play, 
  Sparkles, 
  Filter, 
  ArrowRight, 
  CheckCircle, 
  ShieldCheck, 
  ChevronRight,
  Flame,
  TrendingUp,
  GitCompare,
  Tag,
  Code2,
  LockOpen,
  Plus
} from 'lucide-react';

// Lazy-load Three.js 3D backdrop to isolate ~635KB dependency from initial critical JS payload
const Hero3DModel = React.lazy(() =>
  import('./Hero3DModel').then((m) => ({ default: m.Hero3DModel }))
);

interface DirectoryViewProps {
  tools: AITool[];
  onSelectTool: (tool: AITool) => void;
  onOpenVideoPreview: (tool: AITool) => void;
  onNavigate: (tab: ActiveTab) => void;
  onOpenSubmit?: () => void;
  isLoading?: boolean;
}

const CATEGORIES = [
  'All',
  'Coding',
  'Productivity',
  'Image AI',
  'Video AI',
  'Audio AI',
  'Copywriting',
  'Data & Analytics',
  'Agents',
];

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  tools,
  onSelectTool,
  onOpenVideoPreview,
  onNavigate,
  onOpenSubmit,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [featureFilter, setFeatureFilter] = useState<'all' | 'traffic' | 'growth' | 'deals' | 'api' | 'opensource' | 'featured' | 'verified'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'traffic' | 'rating' | 'newest'>('popular');
  const [visibleCount, setVisibleCount] = useState(9);
  const [shouldLoad3D, setShouldLoad3D] = useState(false);

  // Defer downloading the ~510KB Three.js chunk until after critical content is painted & interactive
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('requestIdleCallback' in window) {
      const handle = (window as any).requestIdleCallback(() => {
        setShouldLoad3D(true);
      }, { timeout: 2500 });
      return () => (window as any).cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(() => {
        setShouldLoad3D(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const featuredPartners = useMemo(() => {
    return tools.filter((t) => t.isFeatured).slice(0, 3);
  }, [tools]);

  const filteredTools = useMemo(() => {
    const cleanSearch = deferredSearchQuery.trim().toLowerCase();
    let list = tools.filter((t) => {
      const matchesCategory =
        selectedCategory === 'All' || 
        t.category.toLowerCase().includes(selectedCategory.toLowerCase()) || 
        selectedCategory.toLowerCase().includes(t.category.toLowerCase());
      
      const matchesSearch =
        !cleanSearch ||
        t.name.toLowerCase().includes(cleanSearch) ||
        t.tagline.toLowerCase().includes(cleanSearch) ||
        t.category.toLowerCase().includes(cleanSearch) ||
        t.keyFeatures?.some((f) => f.toLowerCase().includes(cleanSearch));

      let matchesFeature = true;
      if (featureFilter === 'deals') matchesFeature = Boolean(t.deal);
      if (featureFilter === 'api') matchesFeature = Boolean(t.hasApi);
      if (featureFilter === 'opensource') matchesFeature = Boolean(t.isOpenSource);
      if (featureFilter === 'traffic') matchesFeature = (t.monthlyVisits || 0) >= 10000000;
      if (featureFilter === 'growth') matchesFeature = (t.trafficGrowth || 0) >= 30;
      if (featureFilter === 'featured') matchesFeature = Boolean(t.isFeatured);
      if (featureFilter === 'verified') matchesFeature = Boolean(t.isVerified);

      return matchesCategory && matchesSearch && matchesFeature;
    });

    if (sortBy === 'traffic') {
      list.sort((a, b) => (b.monthlyVisits || 0) - (a.monthlyVisits || 0));
    } else if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      list.sort((a, b) => b.reviewCount - a.reviewCount);
    }

    return list;
  }, [tools, selectedCategory, deferredSearchQuery, featureFilter, sortBy]);

  // Debounced search tracking for GA4 — fires only when user pauses typing (700ms)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) return;
    const timer = setTimeout(() => {
      trackSearch({
        search_term: trimmed,
        result_count: filteredTools.length,
      });
    }, 700);
    return () => clearTimeout(timer);
  }, [searchQuery, filteredTools.length]);

  return (
    <div className="w-full pb-24">
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-4 sm:px-8 max-w-[1440px] mx-auto text-center flex flex-col items-center">
        {/* Main Headline with 3D Model in the Background */}
        <div className="relative w-full flex flex-col items-center justify-center mb-8 py-4 sm:py-6">
          {/* 3D WebGL Mesh Backdrop directly centered behind headline - Defer load to idle time with fixed zero-CLS placeholder */}
          <div className="absolute top-[58%] sm:top-[62%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] sm:w-[580px] md:w-[720px] lg:w-[860px] h-[400px] sm:h-[490px] md:h-[540px] pointer-events-none select-none -z-0">
            {shouldLoad3D ? (
              <Suspense fallback={null}>
                <Hero3DModel />
              </Suspense>
            ) : null}
          </div>

          <div className="relative z-10 flex flex-col items-center max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold tracking-wide uppercase mb-6 shadow-xs backdrop-blur-xs">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span>Tracking 5,000+ AI Tools & 4B+ Monthly Visits</span>
            </div>

            <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-6 drop-shadow-xs">
              Discover, Compare & Find the{' '}
              <span className="text-indigo-600 dark:text-indigo-400">
                Best AI Tools
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl font-normal leading-relaxed">
              ToolverAI is the leading AI tools directory. Search, discover, compare, and track monthly traffic rankings, exclusive discount promo codes, and verified workflows for top AI tools in 2026.
            </p>

            {/* Quick Section Hub Links */}
            <div className="flex items-center justify-center flex-wrap gap-2.5 mt-6 text-xs font-semibold">
              <a
                href="/rankings"
                onClick={(e) => { e.preventDefault(); onNavigate('rankings'); }}
                className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/90 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>AI Traffic Rankings</span>
              </a>
              <a
                href="/deals"
                onClick={(e) => { e.preventDefault(); onNavigate('deals'); }}
                className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/90 hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Verified AI Deals</span>
              </a>
              <a
                href="/compare"
                onClick={(e) => { e.preventDefault(); onNavigate('compare'); }}
                className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/90 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <GitCompare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Compare AI Tools</span>
              </a>
              <a
                href="/prompts"
                onClick={(e) => { e.preventDefault(); onNavigate('prompts'); }}
                className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/90 hover:bg-purple-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-purple-700 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Code2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Prompt Library</span>
              </a>
              <a
                href="/categories"
                onClick={(e) => { e.preventDefault(); onNavigate('categories'); }}
                className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/90 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Browse Categories</span>
              </a>
            </div>
          </div>
        </div>

        {/* Global Live Search Bar */}
        <div className="w-full max-w-2xl relative mb-6 group">
          <div className="relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm focus-within:border-indigo-600 dark:focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-950/50 transition-all">
            <Search className="w-5 h-5 text-slate-400 ml-5 shrink-0 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, capability, model (e.g. Cursor, ChatGPT, Midjourney, Perplexity)..."
              className="w-full bg-transparent px-4 py-4 text-slate-900 dark:text-white text-base focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mr-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => {}}
              className="mr-3 px-6 py-2.5 rounded-xl btn-purple text-sm font-semibold shrink-0 hidden sm:block cursor-pointer shadow-xs"
            >
              Search
            </button>
          </div>
        </div>

        {/* Quick Attribute Filter Badges */}
        <div className="flex items-center justify-center flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFeatureFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              featureFilter === 'all'
                ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            All Tools
          </button>
          <button
            onClick={() => setFeatureFilter('traffic')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              featureFilter === 'traffic'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span>High Traffic (10M+)</span>
          </button>
          <button
            onClick={() => setFeatureFilter('growth')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              featureFilter === 'growth'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Fastest Growing</span>
          </button>
          <button
            onClick={() => setFeatureFilter('featured')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              featureFilter === 'featured'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>Featured</span>
          </button>
          <button
            onClick={() => setFeatureFilter('verified')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              featureFilter === 'verified'
                ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Verified</span>
          </button>
          <button
            onClick={() => setFeatureFilter('deals')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              featureFilter === 'deals'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-emerald-500" />
            <span>Exclusive Deals</span>
          </button>
          <button
            onClick={() => setFeatureFilter('api')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              featureFilter === 'api'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Has API</span>
          </button>
          <button
            onClick={() => setFeatureFilter('opensource')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              featureFilter === 'opensource'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <LockOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span>Open Source</span>
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-2.5 max-w-4xl">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                if (cat !== 'All') {
                  trackCategoryView({ category_name: cat });
                }
              }}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Featured Partners Section (VIP Golden Trio) */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 mb-16">
        <div className="flex items-center justify-between mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Featured Top AI Partners
            </h2>
          </div>
          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 px-3 py-1 rounded-full hidden sm:inline flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Verified Market Leaders
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredPartners.map((partner) => {
            const partnerSlug = partner.slug || partner.id;
            return (
              <div
                key={partner.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 relative group card-3d overflow-hidden shadow-xs hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3.5">
                      <a
                        href={`/tool/${partnerSlug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          onSelectTool(partner);
                        }}
                        className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 flex items-center justify-center block shrink-0"
                      >
                        <img
                          src={partner.logoUrl}
                          alt={partner.name}
                          width={48}
                          height={48}
                          decoding="async"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </a>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            <a
                              href={`/tool/${partnerSlug}`}
                              onClick={(e) => {
                                e.preventDefault();
                                onSelectTool(partner);
                              }}
                            >
                              {partner.name}
                            </a>
                          </h3>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800">
                            <Sparkles className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400 fill-indigo-400/30" />
                            <span>Featured</span>
                          </span>
                          {partner.isVerified && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              <ShieldCheck className="w-3 h-3 text-emerald-500" />
                              <span>Verified</span>
                            </span>
                          )}
                        </div>
                        <a
                          href={`/categories/${partner.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                          onClick={(e) => {
                            e.preventDefault();
                            onNavigate('categories');
                          }}
                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 block mt-0.5"
                        >
                          {partner.category}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{partner.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-4 font-normal leading-relaxed">
                    {partner.tagline}
                  </p>

                  {/* Traffic & Deal Snapshot */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {partner.monthlyVisitsFormatted || '25M+'}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">visits/mo</span>
                    </div>
                    {partner.deal && (
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        {partner.deal.discount}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {partner.pricingType}
                  </span>
                  <a
                    href={`/tool/${partnerSlug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectTool(partner);
                    }}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                  >
                    <span>Explore Intelligence</span>
                    <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Main Directory Listings Section */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              AI Tools Directory & Rankings
            </h2>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
            {onOpenSubmit && (
              <button
                onClick={onOpenSubmit}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Suggest a new AI Tool to be added to the directory"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Suggest a Tool</span>
              </button>
            )}

            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-300 shadow-xs">
              <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-900 dark:text-white font-semibold focus:outline-none cursor-pointer"
              >
                <option value="popular" className="dark:bg-slate-900">Most Popular</option>
                <option value="traffic" className="dark:bg-slate-900">Monthly Traffic Volume</option>
                <option value="rating" className="dark:bg-slate-900">Highest Rated</option>
                <option value="newest" className="dark:bg-slate-900">Recently Added</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tools Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden animate-pulse shadow-xs"
              >
                <div className="aspect-[16/9] w-full bg-slate-100 dark:bg-slate-800" />
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-md w-3/4" />
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-md w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-4/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredTools.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-xl mx-auto shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No AI tools found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              No tools match your current search and filter criteria.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setFeatureFilter('all');
                }}
                className="px-5 py-2.5 rounded-xl btn-purple text-xs font-semibold cursor-pointer shadow-xs"
              >
                Reset All Filters
              </button>
              {onOpenSubmit && (
                <button
                  onClick={onOpenSubmit}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Suggest a Tool
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.slice(0, visibleCount).map((tool) => {
            const toolSlug = tool.slug || tool.id;
            const categorySlug = tool.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            return (
            <div
              key={tool.id}
              className={`bg-white dark:bg-slate-900 rounded-3xl overflow-hidden card-3d flex flex-col justify-between group shadow-xs transition-all ${
                tool.isFeatured
                  ? 'border-2 border-indigo-400/80 dark:border-indigo-500/80 hover:border-indigo-500 shadow-indigo-500/5'
                  : 'border border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/40'
              }`}
            >
              <div>
                {/* Tool Brand Banner (Logo Display) */}
                <a 
                  href={`/tool/${toolSlug}`}
                  className="relative aspect-[16/9] w-full bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 dark:from-slate-800/80 dark:via-slate-800/50 dark:to-slate-900 flex items-center justify-center overflow-hidden group/thumb cursor-pointer border-b border-slate-100 dark:border-slate-800 block"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool(tool);
                  }}
                >
                  {/* Subtle pattern background */}
                  <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08] bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:14px_14px] pointer-events-none" />

                  {/* High-res S3 Brand Logo */}
                  <div className="relative z-10 w-24 h-24 rounded-2xl bg-white dark:bg-slate-800 p-3 shadow-md ring-1 ring-slate-200/90 dark:ring-slate-700 flex items-center justify-center group-hover/thumb:scale-110 transition-all duration-300">
                    <img
                      src={tool.logoUrl}
                      alt={`${tool.name} logo`}
                      width={72}
                      height={72}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Metric & Status Badges on top left */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap max-w-[75%] pointer-events-none">
                    <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-900/90 dark:bg-slate-950/90 text-white backdrop-blur-md flex items-center gap-1 shadow-xs border border-white/10">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      <span>{tool.monthlyVisitsFormatted || '10M+'}</span>
                    </span>

                    {tool.isFeatured && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-indigo-600 text-white flex items-center gap-1 shadow-xs backdrop-blur-md border border-indigo-400">
                        <Sparkles className="w-3 h-3 text-white fill-white/30" />
                        <span>Featured</span>
                      </span>
                    )}

                    {tool.isVerified && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-slate-900/90 dark:bg-slate-950/90 text-white flex items-center gap-1 shadow-xs backdrop-blur-md border border-white/10">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Verified</span>
                      </span>
                    )}
                  </div>

                  {/* Pricing Badge on top right */}
                  <div className="absolute top-3 right-3">
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-semibold shadow-xs bg-slate-900/80 dark:bg-slate-950/80 text-white border border-white/10 backdrop-blur-md"
                    >
                      {tool.pricingType}
                    </span>
                  </div>
                </a>

                {/* Card Body */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          <a
                            href={`/tool/${toolSlug}`}
                            onClick={(e) => {
                              e.preventDefault();
                              onSelectTool(tool);
                            }}
                          >
                            {tool.name}
                          </a>
                        </h3>

                        {tool.isVerified && (
                          <span
                            title="Verified AI Tool: Evaluated, benchmarked & tested by ToolverAI analysts"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0 cursor-help"
                          >
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            <span>Verified</span>
                          </span>
                        )}

                        {tool.isFeatured && (
                          <span
                            title="Featured AI Tool: Verified ecosystem partner"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 shrink-0 cursor-help"
                          >
                            <Sparkles className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400 fill-indigo-400/30" />
                            <span>Featured</span>
                          </span>
                        )}
                      </div>
                      <a
                        href={`/categories/${categorySlug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigate('categories');
                        }}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold block mt-0.5"
                      >
                        {tool.category}
                      </a>
                    </div>

                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{tool.rating.toFixed(1)}</span>
                      <span className="text-slate-400 dark:text-slate-500 font-normal text-[10px]">
                        ({tool.reviewCount})
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mt-2 leading-relaxed font-normal">
                    {tool.tagline}
                  </p>

                  {/* Promo Deal Callout if available */}
                  {tool.deal && (
                    <div className="mt-3 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> {tool.deal.discount}
                      </span>
                      <span className="font-mono text-[10px] font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                        {tool.deal.code}
                      </span>
                    </div>
                  )}

                  {/* Key Feature tags */}
                  {tool.keyFeatures && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {tool.keyFeatures.slice(0, 2).map((feat, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-6 pt-0 flex items-center justify-between gap-3">
                <a
                  href={`/tool/${toolSlug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool(tool);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl btn-purple text-xs font-semibold text-center cursor-pointer shadow-xs block"
                >
                  View Full Specs
                </a>
                <button
                  onClick={() => onNavigate('compare')}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                  title="Compare with Rivals"
                >
                  <GitCompare className="w-4 h-4" />
                </button>
                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                  title="Visit Website"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          );
        })}
        </div>
        )}

        {/* Load More Button */}
        {visibleCount < filteredTools.length && (
          <div className="flex justify-center mt-12">
            <button
              onClick={() => setVisibleCount((prev) => prev + 6)}
              className="px-8 py-3.5 rounded-xl btn-purple text-sm font-semibold shadow-xs cursor-pointer"
            >
              Load More AI Tools ({filteredTools.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </section>

      {/* Browse AI Tools by Category Section */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 mt-20 pt-16 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block mr-2" />
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight inline">
              Browse AI Tools by Category
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Explore 120+ tools across 8 curated categories with estimated traffic and comparison data.
            </p>
          </div>
          <a
            href="/categories"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('categories');
            }}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hidden sm:inline flex items-center gap-1"
          >
            <span>All Categories</span>
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { name: 'Coding', slug: 'coding', count: 15 },
            { name: 'Productivity', slug: 'productivity', count: 15 },
            { name: 'Image AI', slug: 'image-ai', count: 15 },
            { name: 'Video AI', slug: 'video-ai', count: 15 },
            { name: 'Audio AI', slug: 'audio-ai', count: 15 },
            { name: 'Copywriting', slug: 'copywriting', count: 15 },
            { name: 'Data & Analytics', slug: 'data-analytics', count: 15 },
            { name: 'Agents', slug: 'agents', count: 15 },
          ].map((cat) => (
            <a
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate('categories');
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 rounded-2xl p-4 transition-all shadow-xs hover:shadow-sm block group"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {cat.name}
                </h3>
                <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                  {cat.count} tools
                </span>
              </div>
              <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                <span>Explore tools</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
};
