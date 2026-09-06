import React, { useState, useMemo } from 'react';
import { AITool, ActiveTab } from '../types';
import { Hero3DModel } from './Hero3DModel';
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
  LockOpen
} from 'lucide-react';

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
];

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  tools,
  onSelectTool,
  onOpenVideoPreview,
  onNavigate,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [featureFilter, setFeatureFilter] = useState<'all' | 'traffic' | 'growth' | 'deals' | 'api' | 'opensource'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'traffic' | 'rating' | 'newest'>('popular');
  const [visibleCount, setVisibleCount] = useState(9);

  const featuredPartners = useMemo(() => {
    return tools.filter((t) => t.isFeatured).slice(0, 3);
  }, [tools]);

  const filteredTools = useMemo(() => {
    let list = tools.filter((t) => {
      const matchesCategory =
        selectedCategory === 'All' || 
        t.category.toLowerCase().includes(selectedCategory.toLowerCase()) || 
        selectedCategory.toLowerCase().includes(t.category.toLowerCase());
      
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.keyFeatures?.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesFeature = true;
      if (featureFilter === 'deals') matchesFeature = Boolean(t.deal);
      if (featureFilter === 'api') matchesFeature = Boolean(t.hasApi);
      if (featureFilter === 'opensource') matchesFeature = Boolean(t.isOpenSource);
      if (featureFilter === 'traffic') matchesFeature = (t.monthlyVisits || 0) >= 10000000;
      if (featureFilter === 'growth') matchesFeature = (t.trafficGrowth || 0) >= 30;

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
  }, [tools, selectedCategory, searchQuery, featureFilter, sortBy]);

  return (
    <div className="w-full pb-24">
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-4 sm:px-8 max-w-[1440px] mx-auto text-center flex flex-col items-center">
        {/* Main Headline with 3D Model in the Background */}
        <div className="relative w-full flex flex-col items-center justify-center mb-8 py-4 sm:py-6">
          {/* 3D WebGL Mesh Backdrop directly centered behind headline */}
          <Hero3DModel />

          <div className="relative z-10 flex flex-col items-center max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold tracking-wide uppercase mb-6 shadow-xs backdrop-blur-xs">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span>Tracking 5,000+ AI Tools & 4B+ Monthly Visits</span>
            </div>

            <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6 drop-shadow-xs">
              The World’s Leading{' '}
              <span className="text-indigo-600">
                AI Directory & Rankings
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl font-normal leading-relaxed">
              Search, benchmark, and compare monthly traffic, exclusive discount promo codes, and production prompts for frontier AI tools.
            </p>
          </div>
        </div>

        {/* Global Live Search Bar */}
        <div className="w-full max-w-2xl relative mb-6 group">
          <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
            <Search className="w-5 h-5 text-slate-400 ml-5 shrink-0 group-focus-within:text-indigo-600 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, capability, model (e.g. Cursor, ChatGPT, Midjourney, Perplexity)..."
              className="w-full bg-transparent px-4 py-4 text-slate-900 text-base focus:outline-none placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mr-3 text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-md bg-slate-100 cursor-pointer"
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
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Tools
          </button>
          <button
            onClick={() => setFeatureFilter('traffic')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              featureFilter === 'traffic'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
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
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Fastest Growing</span>
          </button>
          <button
            onClick={() => setFeatureFilter('deals')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              featureFilter === 'deals'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exclusive Deals</span>
          </button>
          <button
            onClick={() => setFeatureFilter('api')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              featureFilter === 'api'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
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
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
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
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Featured Partners Section (VIP Golden Trio) */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 mb-16">
        <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Featured Top AI Partners
            </h2>
          </div>
          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full hidden sm:inline flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Verified Market Leaders
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredPartners.map((partner) => (
            <div
              key={partner.id}
              onClick={() => onSelectTool(partner)}
              className="bg-white border border-slate-200 rounded-3xl p-6 relative group cursor-pointer card-3d overflow-hidden shadow-xs hover:border-indigo-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center">
                    <img
                      src={partner.logoUrl}
                      alt={partner.name}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-heading text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {partner.name}
                      </h3>
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="text-xs font-semibold text-indigo-600">
                      {partner.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{partner.rating.toFixed(1)}</span>
                </div>
              </div>

              <p className="text-sm text-slate-500 line-clamp-2 mb-4 font-normal leading-relaxed">
                {partner.tagline}
              </p>

              {/* Traffic & Deal Snapshot */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 mb-4">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-xs font-extrabold text-slate-900">
                    {partner.monthlyVisitsFormatted || '25M+'}
                  </span>
                  <span className="text-[10px] text-slate-400">visits/mo</span>
                </div>
                {partner.deal && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    {partner.deal.discount}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {partner.pricingType}
                </span>
                <button className="text-xs font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform flex items-center gap-1 cursor-pointer">
                  <span>Explore Intelligence</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Directory Listings Section */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Curated AI Database
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              ({filteredTools.length} tools indexed)
            </span>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 shadow-xs">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-900 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="popular">Most Popular</option>
                <option value="traffic">Monthly Traffic Volume</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Recently Added</option>
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
                className="bg-white border border-slate-200 rounded-3xl overflow-hidden animate-pulse shadow-xs"
              >
                <div className="aspect-[16/9] w-full bg-slate-100" />
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-100 rounded-md w-3/4" />
                      <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="h-3 bg-slate-100 rounded w-full" />
                    <div className="h-3 bg-slate-100 rounded w-4/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredTools.length === 0 ? (
          <div className="py-16 text-center bg-white border border-slate-200 rounded-3xl p-8 max-w-xl mx-auto shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No AI tools found</h3>
            <p className="text-sm text-slate-500 mb-6">
              No tools match your current search and filter criteria.
            </p>
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
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.slice(0, visibleCount).map((tool) => (
            <div
              key={tool.id}
              className="bg-white border border-slate-200 rounded-3xl overflow-hidden card-3d flex flex-col justify-between group shadow-xs hover:border-indigo-200"
            >
              <div>
                {/* Video / Thumbnail Banner */}
                <div className="relative aspect-[16/9] w-full bg-slate-100 overflow-hidden group/thumb cursor-pointer">
                  <img
                    src={tool.thumbnailVideoUrl || tool.logoUrl}
                    alt={tool.name}
                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-500"
                    onClick={() => {
                      if (tool.thumbnailVideoUrl) {
                        onOpenVideoPreview(tool);
                      } else {
                        onSelectTool(tool);
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-60" />

                  {/* Play Video Trigger Overlay */}
                  {tool.thumbnailVideoUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenVideoPreview(tool);
                      }}
                      className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 text-xs font-semibold text-white group-hover/thumb:bg-slate-900 transition-all cursor-pointer shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
                      <span>{tool.videoDuration || 'Watch Demo'}</span>
                    </button>
                  )}

                  {/* Traffic Metric Badge on top left */}
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-900/90 text-white backdrop-blur-md flex items-center gap-1 shadow-xs border border-white/10">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      <span>{tool.monthlyVisitsFormatted || '10M+'}</span>
                    </span>
                  </div>

                  {/* Pricing Badge on top right */}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold shadow-xs ${
                        tool.pricingType === 'Free'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : tool.pricingType === 'Freemium'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-slate-900 text-white'
                      }`}
                    >
                      {tool.pricingType}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3
                        onClick={() => onSelectTool(tool)}
                        className="font-heading text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer"
                      >
                        {tool.name}
                      </h3>
                      <span className="text-xs text-indigo-600 font-semibold">
                        {tool.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{tool.rating.toFixed(1)}</span>
                      <span className="text-slate-400 font-normal text-[10px]">
                        ({tool.reviewCount})
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 line-clamp-2 mt-2 leading-relaxed font-normal">
                    {tool.tagline}
                  </p>

                  {/* Promo Deal Callout if available */}
                  {tool.deal && (
                    <div className="mt-3 p-2 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-800 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-emerald-600" /> {tool.deal.discount}
                      </span>
                      <span className="font-mono text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-900">
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
                          className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-medium"
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
                <button
                  onClick={() => onSelectTool(tool)}
                  className="flex-1 py-2.5 px-4 rounded-xl btn-purple text-xs font-semibold text-center cursor-pointer shadow-xs"
                >
                  View Full Specs
                </button>
                <button
                  onClick={() => onNavigate('compare')}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 transition-all cursor-pointer"
                  title="Compare with Rivals"
                >
                  <GitCompare className="w-4 h-4" />
                </button>
                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer"
                  title="Visit Website"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
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
    </div>
  );
};
