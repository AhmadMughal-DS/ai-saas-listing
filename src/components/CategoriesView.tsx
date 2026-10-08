import React from 'react';
import { AITool } from '../types';
import { Sparkles, FileText, Video, Code, Zap, Image, Mic, BarChart3, Bot, ChevronRight, Star, Flame, ShieldCheck, ArrowLeft } from 'lucide-react';

export interface CategoryMetaItem {
  name: string;
  slug: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export const CATEGORY_META: CategoryMetaItem[] = [
  {
    name: 'Coding',
    slug: 'coding',
    icon: Code,
    description: 'AI code completion, full repository refactoring, bug scanning, and test suite generation.',
  },
  {
    name: 'Productivity',
    slug: 'productivity',
    icon: Zap,
    description: 'Meeting notes summarization, automated email triage, calendar scheduling, and workflow AI.',
  },
  {
    name: 'Image AI',
    slug: 'image-ai',
    icon: Image,
    description: 'Neural image upscaling, generative diffusion models, logo synthesis, and texture generation.',
  },
  {
    name: 'Video AI',
    slug: 'video-ai',
    icon: Video,
    description: 'Text-to-video generation, cinematic b-roll synthesis, automated video editing, and avatar creators.',
  },
  {
    name: 'Audio AI',
    slug: 'audio-ai',
    icon: Mic,
    description: 'Voice cloning, AI stems separation, podcast audio cleanup, and multi-lingual voice translation.',
  },
  {
    name: 'Copywriting',
    slug: 'copywriting',
    icon: FileText,
    description: 'AI assistants for ad copy, long-form articles, technical whitepapers, and sales funnels.',
  },
  {
    name: 'Data & Analytics',
    slug: 'data-analytics',
    icon: BarChart3,
    description: 'Natural language SQL queries, predictive regression forecasts, and automated chart builders.',
  },
  {
    name: 'Agents',
    slug: 'agents',
    icon: Bot,
    description: 'Autonomous multi-agent swarms, browser automation bots, and self-improving reasoning loops.',
  },
];

interface CategoriesViewProps {
  tools: AITool[];
  currentCategorySlug?: string | null;
  onSelectCategory: (categorySlug: string) => void;
  onSelectTool: (tool: AITool) => void;
  onBackToAllCategories: () => void;
  onBackToDirectory: () => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  tools,
  currentCategorySlug,
  onSelectCategory,
  onSelectTool,
  onBackToAllCategories,
  onBackToDirectory,
}) => {
  // Normalize currentCategorySlug
  const normalizedSlug = (currentCategorySlug || '').toLowerCase().trim();
  const currentCategory = CATEGORY_META.find(
    (c) => c.slug === normalizedSlug || c.name.toLowerCase() === normalizedSlug
  );

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 1: Specific Category Detail Page (/categories/:category)
  // ──────────────────────────────────────────────────────────────────────────
  if (currentCategory) {
    const Icon = currentCategory.icon;
    const categoryTools = tools.filter(
      (t) =>
        t.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') === currentCategory.slug ||
        t.category.toLowerCase() === currentCategory.name.toLowerCase()
    );

    const relatedCategories = CATEGORY_META.filter((c) => c.slug !== currentCategory.slug);

    return (
      <div className="w-full pt-28 pb-24 px-4 sm:px-8 max-w-[1440px] mx-auto">
        {/* Semantic Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
            <li>
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  onBackToDirectory();
                }}
                className="hover:text-indigo-600 transition-colors"
              >
                Home
              </a>
            </li>
            <li aria-hidden="true" className="text-slate-300">/</li>
            <li>
              <a
                href="/categories"
                onClick={(e) => {
                  e.preventDefault();
                  onBackToAllCategories();
                }}
                className="hover:text-indigo-600 transition-colors"
              >
                Categories
              </a>
            </li>
            <li aria-hidden="true" className="text-slate-300">/</li>
            <li className="text-slate-900 font-semibold" aria-current="page">
              {currentCategory.name}
            </li>
          </ol>
        </nav>

        {/* Back to all categories */}
        <button
          onClick={onBackToAllCategories}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-6 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>All AI Categories</span>
        </button>

        {/* Category Hero */}
        <header className="mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase mb-4 shadow-xs">
            <Icon className="w-4 h-4 text-indigo-600" />
            <span>Curated Taxonomy • {categoryTools.length} Tools</span>
          </div>

          <h1 className="font-heading text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Best {currentCategory.name} Tools in 2026
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-3xl leading-relaxed">
            Discover and compare the top {currentCategory.name.toLowerCase()} AI tools in 2026. Explore {categoryTools.length} curated solutions benchmarked on estimated monthly web traffic, core capabilities, developer pricing plans, and authentic industry reviews on ToolverAI.
          </p>
        </header>

        {/* Section: Category Tools Grid */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-200">
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-slate-900">
              {currentCategory.name} AI Directory ({categoryTools.length} Tools)
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Ranked by traffic & verified reviews
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryTools.map((tool) => (
              <div
                key={tool.id}
                className="bg-white rounded-3xl overflow-hidden card-3d flex flex-col justify-between group shadow-xs transition-all border border-slate-200 hover:border-indigo-200"
              >
                <div>
                  {/* Tool Brand Banner with crawlable anchor */}
                  <a
                    href={`/tool/${tool.slug || tool.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectTool(tool);
                    }}
                    className="relative aspect-[16/9] w-full bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 flex items-center justify-center overflow-hidden group/thumb cursor-pointer border-b border-slate-100 block"
                  >
                    <div className="relative z-10 w-24 h-24 rounded-2xl bg-white p-3 shadow-md ring-1 ring-slate-200/90 flex items-center justify-center group-hover/thumb:scale-110 transition-all duration-300">
                      <img
                        src={tool.logoUrl}
                        alt={`${tool.name} logo`}
                        loading="lazy"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Metric Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap max-w-[75%] pointer-events-none">
                      <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-900/90 text-white backdrop-blur-md flex items-center gap-1 shadow-xs border border-white/10">
                        <Flame className="w-3.5 h-3.5 text-orange-400" />
                        <span>{tool.monthlyVisitsFormatted || '10M+'}</span>
                      </span>

                      {tool.isVerified && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500 text-white flex items-center gap-1 shadow-xs">
                          <ShieldCheck className="w-3.5 h-3.5 text-white" />
                          <span>Verified</span>
                        </span>
                      )}
                    </div>

                    {/* Pricing Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold shadow-xs bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {tool.pricingType}
                      </span>
                    </div>
                  </a>

                  {/* Card Body */}
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <h3 className="font-heading text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          <a
                            href={`/tool/${tool.slug || tool.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              onSelectTool(tool);
                            }}
                          >
                            {tool.name}
                          </a>
                        </h3>
                        <span className="text-xs text-indigo-600 font-semibold block mt-0.5">
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
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-6 pb-6 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <a
                    href={`/tool/${tool.slug || tool.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectTool(tool);
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                  >
                    <span>View Features & Pricing</span>
                    <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section: Related Categories */}
        <section className="pt-8 border-t border-slate-200">
          <h2 className="font-heading text-2xl font-bold text-slate-900 mb-6">
            Explore Related AI Categories
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {relatedCategories.map((rc) => {
              const RelIcon = rc.icon;
              return (
                <a
                  key={rc.slug}
                  href={`/categories/${rc.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectCategory(rc.slug);
                  }}
                  className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 text-center group transition-all shadow-xs hover:shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform">
                    <RelIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    {rc.name}
                  </h3>
                </a>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: Hub Categories Page (/categories)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full pt-32 pb-24 px-4 sm:px-8 max-w-[1440px] mx-auto">
      {/* Semantic Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
          <li>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onBackToDirectory();
              }}
              className="hover:text-indigo-600 transition-colors"
            >
              Home
            </a>
          </li>
          <li aria-hidden="true" className="text-slate-300">/</li>
          <li className="text-slate-900 font-semibold" aria-current="page">
            Categories
          </li>
        </ol>
      </nav>

      {/* Header */}
      <header className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase mb-4 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Curated Ecosystem Taxonomy</span>
        </div>

        <h1 className="font-heading text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight mb-4">
          Browse AI Tools by{' '}
          <span className="text-indigo-600">
            Category
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
          Navigate the complete landscape of verified artificial intelligence models, developer frameworks, and generative AI apps in 2026.
        </p>
      </header>

      {/* Grid of Categories */}
      <section aria-label="AI Tool Categories Grid">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CATEGORY_META.map((cat) => {
            const Icon = cat.icon;
            const count = tools.filter(
              (t) =>
                t.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') === cat.slug ||
                t.category.toLowerCase().includes(cat.name.toLowerCase()) ||
                cat.name.toLowerCase().includes(t.category.toLowerCase())
            ).length;

            return (
              <a
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectCategory(cat.slug);
                }}
                className="bg-white rounded-2xl p-6 flex flex-col justify-between card-3d group cursor-pointer border border-slate-200 hover:border-indigo-200 shadow-xs hover:shadow-sm transition-all block text-left"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-50 border border-indigo-100 text-indigo-600 transition-all group-hover:scale-105">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                      {count} {count === 1 ? 'Tool' : 'Tools'}
                    </span>
                  </div>

                  <h3 className="font-heading text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-2">
                    {cat.name}
                  </h3>

                  <p className="text-xs text-slate-500 leading-relaxed mb-6 font-normal">
                    {cat.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                  <span>Explore {cat.name} Tools</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
};
