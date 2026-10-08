import React from 'react';
import { AITool } from '../types';
import { getToolAlternatives, getRelatedComparisonsForTool, normalizeComparisonSlugs, ELIGIBLE_ALTERNATIVES } from '../utils/programmaticSeo';
import { slugifyCategory } from '../utils/seo';
import { 
  Star, 
  TrendingUp, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Tag, 
  ExternalLink, 
  Check, 
  GitCompare, 
  ChevronRight,
  Flame,
  ArrowLeft
} from 'lucide-react';

interface AlternativesViewProps {
  tool: AITool | null;
  allTools: AITool[];
  onSelectTool: (tool: AITool) => void;
  onNavigateComparison?: (slug1: string, slug2: string) => void;
  onNavigate?: (tab: any) => void;
}

export const AlternativesView: React.FC<AlternativesViewProps> = ({
  tool,
  allTools,
  onSelectTool,
  onNavigateComparison,
}) => {
  if (!tool) {
    return (
      <div className="w-full pt-28 pb-24 px-4 sm:px-8 max-w-[1440px] mx-auto">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center flex-wrap gap-2 text-xs font-semibold text-slate-500">
            <li>
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({}, '', '/');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="hover:text-indigo-600 transition-colors"
              >
                Home
              </a>
            </li>
            <li aria-hidden="true" className="text-slate-300">/</li>
            <li aria-current="page" className="text-slate-900 font-bold">
              AI Tool Alternatives
            </li>
          </ol>
        </nav>
        <div className="text-center max-w-4xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wide mb-4 shadow-xs">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Curated Competitor Guides · 2026 Edition</span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Best AI Tool Alternatives
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Find the top alternatives to leading AI software. Compare pricing, features, monthly traffic, and verified ratings.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ELIGIBLE_ALTERNATIVES.map((alt) => {
            const matchedTool = allTools.find((t) => (t.slug || t.id) === alt.toolSlug);
            const name = matchedTool?.name || alt.toolSlug;
            return (
              <a
                key={alt.toolSlug}
                href={`/alternatives/${alt.toolSlug}`}
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({}, '', `/alternatives/${alt.toolSlug}`);
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between block group"
              >
                <div>
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {alt.category}
                  </span>
                  <h2 className="font-heading font-bold text-lg text-slate-900 mt-3 mb-2 group-hover:text-indigo-600 transition-colors">
                    Best {name} Alternatives
                  </h2>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    {alt.reason}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-indigo-600 pt-4 border-t border-slate-100">
                  <span>Explore Alternatives</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  const alternatives = getToolAlternatives(tool, allTools, 6);
  const relatedComparisons = getRelatedComparisonsForTool(tool.slug || tool.id);
  const categorySlug = slugifyCategory(tool.category || 'tools');

  return (
    <div className="w-full pt-28 pb-24 px-4 sm:px-8 max-w-[1440px] mx-auto">
      {/* Semantic Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center flex-wrap gap-2 text-xs font-semibold text-slate-500">
          <li>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="hover:text-indigo-600 transition-colors"
            >
              Home
            </a>
          </li>
          <li aria-hidden="true" className="text-slate-300">/</li>
          <li>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="hover:text-indigo-600 transition-colors"
            >
              AI Tools
            </a>
          </li>
          <li aria-hidden="true" className="text-slate-300">/</li>
          <li>
            <a
              href={`/categories/${categorySlug}`}
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', `/categories/${categorySlug}`);
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="hover:text-indigo-600 transition-colors"
            >
              {tool.category}
            </a>
          </li>
          <li aria-hidden="true" className="text-slate-300">/</li>
          <li aria-current="page" className="text-slate-900 font-bold truncate max-w-[200px] sm:max-w-none">
            Best {tool.name} Alternatives
          </li>
        </ol>
      </nav>

      {/* Hero Header — Single H1 */}
      <div className="text-center max-w-4xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wide mb-4 shadow-xs">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Curated Competitor Guide · 2026 Edition</span>
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          Best {tool.name} Alternatives in 2026
        </h1>
        <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
          Explore the top verified alternatives to {tool.name} in {tool.category}. Compare pricing plans, monthly traffic analytics, key capabilities, and user pros/cons to choose the optimal tool for your workflow.
        </p>
      </div>

      {/* Source Tool Snapshot */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 mb-12 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 p-2.5 backdrop-blur-xs flex items-center justify-center border border-white/10 shrink-0">
              <img
                src={tool.logoUrl}
                alt={`${tool.name} logo`}
                width={48}
                height={48}
                decoding="async"
                className="w-full h-full object-contain rounded-xl"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Benchmark Tool</span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-semibold">{tool.category}</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-[11px] font-semibold">{tool.pricingType}</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white mb-1">{tool.name}</h2>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">{tool.tagline || tool.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto">
            <a
              href={`/tool/${tool.slug || tool.id}`}
              onClick={(e) => {
                e.preventDefault();
                onSelectTool(tool);
              }}
              className="px-5 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 w-full sm:w-auto"
            >
              <span>View Full Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
            <a
              href={tool.url}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/10 flex items-center justify-center gap-1.5 w-full sm:w-auto"
            >
              <span>Official Site</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Why Consider Alternatives */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 mb-12 shadow-xs">
        <h2 className="font-heading text-xl sm:text-2xl font-bold text-slate-900 mb-3">
          Why Consider an Alternative to {tool.name}?
        </h2>
        <p className="text-sm sm:text-base text-slate-600 mb-6 leading-relaxed">
          While {tool.name} is a leading solution in {tool.category} with {tool.monthlyVisitsFormatted || 'high'} monthly visits, users frequently evaluate alternative AI tools for specific needs:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Pricing & Budget</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Seeking more generous free tiers, open-source weights, or pay-as-you-go pricing without monthly commitments.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Specialized Features</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Requiring niche integrations, local offline execution, or custom model fine-tuning not available in {tool.name}.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Ecosystem & Platforms</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Exploring alternatives that offer deeper native support for specific operating systems, IDEs, or enterprise stacks.
            </p>
          </div>
        </div>
      </div>

      {/* Top Alternatives Grid */}
      <div className="mb-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Top Ranked {tool.name} Alternatives
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Ranked by verified web traffic, user sentiment, and feature parity.
            </p>
          </div>
          <a
            href={`/categories/${categorySlug}`}
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', `/categories/${categorySlug}`);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            <span>All {tool.category} Tools ({allTools.filter(t => t.category === tool.category).length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {alternatives.map((alt, idx) => {
            const { canonicalSlug } = normalizeComparisonSlugs(tool.slug || tool.id, alt.slug || alt.id);
            return (
              <div
                key={alt.id}
                className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold">
                      #{idx + 1} Alternative
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                      {alt.pricingType}
                    </span>
                  </div>

                  {/* Header & Logo */}
                  <div className="flex items-start gap-3.5 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 p-2 flex items-center justify-center shrink-0">
                      <img
                        src={alt.logoUrl}
                        alt={`${alt.name} logo`}
                        width={36}
                        height={36}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-contain rounded-lg"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        <a
                          href={`/tool/${alt.slug || alt.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            onSelectTool(alt);
                          }}
                          className="hover:text-indigo-600 transition-colors"
                        >
                          {alt.name}
                        </a>
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1 font-semibold text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          {alt.rating}
                        </span>
                        <span>•</span>
                        <span>{alt.monthlyVisitsFormatted || 'N/A'} visits/mo</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
                    {alt.tagline || alt.description}
                  </p>

                  {/* Key Features */}
                  {alt.keyFeatures && alt.keyFeatures.length > 0 && (
                    <div className="space-y-1.5 mb-5 pt-3 border-t border-slate-100">
                      {alt.keyFeatures.slice(0, 2).map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2 text-xs text-slate-700">
                          <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span className="line-clamp-1">{feat}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
                  <a
                    href={`/tool/${alt.slug || alt.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectTool(alt);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold text-center border border-slate-200 transition-colors"
                  >
                    View Specs
                  </a>
                  <a
                    href={`/compare/${canonicalSlug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (onNavigateComparison) {
                        onNavigateComparison(tool.slug || tool.id, alt.slug || alt.id);
                      } else {
                        window.history.pushState({}, '', `/compare/${canonicalSlug}`);
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold text-center border border-indigo-200 transition-colors flex items-center justify-center gap-1"
                  >
                    <GitCompare className="w-3 h-3" />
                    <span>Compare</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Relevant Comparisons Section */}
      {relatedComparisons.length > 0 && (
        <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200 mb-12">
          <h2 className="font-heading text-xl font-bold text-slate-900 mb-2">
            Popular Head-to-Head Comparisons Involving {tool.name}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mb-6">
            Explore comprehensive analytical comparisons between {tool.name} and top rivals:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {relatedComparisons.map((c) => {
              const rivalSlug = c.slug1 === (tool.slug || tool.id) ? c.slug2 : c.slug1;
              const rivalTool = allTools.find((t) => (t.slug || t.id) === rivalSlug);
              const rivalName = rivalTool ? rivalTool.name : rivalSlug;
              return (
                <a
                  key={c.canonicalSlug}
                  href={`/compare/${c.canonicalSlug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    if (onNavigateComparison) {
                      onNavigateComparison(c.slug1, c.slug2);
                    } else {
                      window.history.pushState({}, '', `/compare/${c.canonicalSlug}`);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }
                  }}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all flex items-center justify-between text-xs font-semibold text-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <GitCompare className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>{tool.name} vs {rivalName}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Back to Category Footer CTA */}
      <div className="text-center pt-6 border-t border-slate-200">
        <p className="text-xs text-slate-500 mb-3">Looking for more AI solutions in this field?</p>
        <a
          href={`/categories/${categorySlug}`}
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState({}, '', `/categories/${categorySlug}`);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Browse All {tool.category} AI Tools</span>
        </a>
      </div>
    </div>
  );
};
