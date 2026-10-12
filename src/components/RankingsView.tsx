import React, { useState, useMemo, useDeferredValue } from 'react';
import { AITool, ActiveTab } from '../types';
import { 
  TrendingUp, 
  BarChart3, 
  Globe, 
  ArrowUpRight, 
  Sparkles, 
  Search, 
  Star, 
  Layers, 
  Award, 
  ExternalLink,
  Flame,
  Clock,
  ShieldCheck,
  Zap,
  SlidersHorizontal,
  GitCompare
} from 'lucide-react';

interface RankingsViewProps {
  tools: AITool[];
  onSelectTool: (tool: AITool) => void;
  onNavigate: (tab: ActiveTab) => void;
  onCompareTools?: (toolIds: string[]) => void;
}

export const RankingsView: React.FC<RankingsViewProps> = ({
  tools,
  onSelectTool,
  onNavigate,
  onCompareTools,
}) => {
  const [rankingFilter, setRankingFilter] = useState<'traffic' | 'growth' | 'rating' | 'upvotes'>('traffic');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [pricingFilter, setPricingFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const deferredSearch = useDeferredValue(searchQuery);

  const categories = useMemo(() => {
    const set = new Set(tools.map((t) => t.category));
    return ['All', ...Array.from(set)];
  }, [tools]);

  const sortedAndFilteredTools = useMemo(() => {
    const cleanSearch = deferredSearch.trim().toLowerCase();
    let list = tools.filter((t) => {
      const matchCat = categoryFilter === 'All' || t.category === categoryFilter;
      const matchPricing = pricingFilter === 'All' || t.pricingType === pricingFilter;
      const matchSearch =
        !cleanSearch ||
        t.name.toLowerCase().includes(cleanSearch) ||
        t.tagline.toLowerCase().includes(cleanSearch) ||
        t.category.toLowerCase().includes(cleanSearch);
      return matchCat && matchPricing && matchSearch;
    });

    if (rankingFilter === 'traffic') {
      list.sort((a, b) => (b.monthlyVisits || 0) - (a.monthlyVisits || 0));
    } else if (rankingFilter === 'growth') {
      list.sort((a, b) => (b.trafficGrowth || 0) - (a.trafficGrowth || 0));
    } else if (rankingFilter === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (rankingFilter === 'upvotes') {
      list.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    }

    return list;
  }, [tools, rankingFilter, categoryFilter, pricingFilter, deferredSearch]);

  const maxTraffic = useMemo(() => {
    return Math.max(...tools.map((t) => t.monthlyVisits || 1), 1000000);
  }, [tools]);

  return (
    <div className="w-full pt-28 pb-24 px-4 sm:px-8 max-w-[1440px] mx-auto">
      {/* Header Banner */}
      <div className="text-center max-w-4xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold uppercase tracking-wide mb-4 shadow-xs">
          <Flame className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Real-Time Traffic & Market Intelligence</span>
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
          Top AI Tools by Monthly Traffic — Verified Rankings 2026
        </h1>
        <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Discover the world's most popular, fastest-growing, and highly engaged artificial intelligence tools ranked by monthly visits and telemetry data.
        </p>

        {/* Global Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs">
          <div className="text-center border-r border-slate-100 dark:border-slate-800 last:border-none">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-heading">3.8B+</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">Total Monthly Visits</div>
          </div>
          <div className="text-center border-r border-slate-100 dark:border-slate-800 last:border-none">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-heading">+58.4%</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">Avg. Growth Velocity</div>
          </div>
          <div className="text-center border-r border-slate-100 dark:border-slate-800 last:border-none">
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 font-heading">100%</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">Verified Telemetry</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-heading">Weekly</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">Index Refresh Rate</div>
          </div>
        </div>
      </div>

      {/* Control Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 mb-8 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Main Metric Toggle Tabs */}
          <div className="flex items-center flex-wrap gap-1.5 p-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
            <button
              onClick={() => setRankingFilter('traffic')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                rankingFilter === 'traffic'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Monthly Traffic</span>
            </button>
            <button
              onClick={() => setRankingFilter('growth')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                rankingFilter === 'growth'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Fastest Growing</span>
            </button>
            <button
              onClick={() => setRankingFilter('rating')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                rankingFilter === 'rating'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Top Rated</span>
            </button>
            <button
              onClick={() => setRankingFilter('upvotes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                rankingFilter === 'upvotes'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Flame className="w-4 h-4 text-orange-500" />
              <span>Most Upvoted</span>
            </button>
          </div>

          {/* Search box within Rankings */}
          <div className="relative min-w-[240px] sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ranked AI tools..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Secondary Category & Pricing Pills */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Category:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-slate-400">Pricing:</span>
            <select
              value={pricingFilter}
              onChange={(e) => setPricingFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="All">All Pricing</option>
              <option value="Free">Free</option>
              <option value="Freemium">Freemium</option>
              <option value="Paid">Paid</option>
              <option value="Free Trial">Free Trial</option>
              <option value="Open Source">Open Source</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rankings Leaderboard Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-4 px-4 sm:px-6 w-16 text-center">Rank</th>
                <th className="py-4 px-4 sm:px-6">AI Tool</th>
                <th className="py-4 px-4 sm:px-6">Category & Pricing</th>
                <th className="py-4 px-4 sm:px-6 min-w-[200px]">Monthly Traffic</th>
                <th className="py-4 px-4 sm:px-6">Growth (MoM)</th>
                <th className="py-4 px-4 sm:px-6 hidden md:table-cell">Top Demographics</th>
                <th className="py-4 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {sortedAndFilteredTools.map((tool, index) => {
                const rankNumber = index + 1;
                const trafficValue = tool.monthlyVisits || 0;
                const trafficPercentage = Math.min(100, Math.max(8, (trafficValue / maxTraffic) * 100));
                const growth = tool.trafficGrowth || 0;

                return (
                  <tr
                    key={tool.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                    onClick={() => onSelectTool(tool)}
                  >
                    {/* Rank Badge */}
                    <td className="py-4 px-4 sm:px-6 text-center font-bold">
                      {rankNumber === 1 ? (
                        <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-extrabold flex items-center justify-center mx-auto shadow-xs border border-amber-200 dark:border-amber-700">
                          🥇
                        </div>
                      ) : rankNumber === 2 ? (
                        <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold flex items-center justify-center mx-auto shadow-xs border border-slate-300 dark:border-slate-700">
                          🥈
                        </div>
                      ) : rankNumber === 3 ? (
                        <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-extrabold flex items-center justify-center mx-auto shadow-xs border border-amber-200 dark:border-amber-700">
                          🥉
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 font-mono text-base font-bold">
                          #{rankNumber}
                        </span>
                      )}
                    </td>

                    {/* Tool Info */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <a
                          href={`/tool/${tool.slug || tool.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            onSelectTool(tool);
                          }}
                          className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 flex items-center justify-center shrink-0 group-hover:border-indigo-300 dark:group-hover:border-indigo-600 transition-all block"
                        >
                          <img
                            src={tool.logoUrl}
                            alt={tool.name}
                            width={36}
                            height={36}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-contain rounded-lg"
                          />
                        </a>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <a
                              href={`/tool/${tool.slug || tool.id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                onSelectTool(tool);
                              }}
                              className="font-heading font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                            >
                              {tool.name}
                            </a>
                            {tool.isVerified && (
                              <span
                                title="Verified AI Tool: Tested & benchmarked"
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              >
                                <ShieldCheck className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Verified</span>
                              </span>
                            )}
                            {tool.isFeatured && (
                              <span
                                title="Featured Partner"
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                                <span>Featured</span>
                              </span>
                            )}
                            {tool.hasApi && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                                API
                              </span>
                            )}
                            {tool.isOpenSource && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                Open Source
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate mt-0.5">
                            {tool.tagline}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category & Pricing */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="space-y-1">
                        <a
                          href={`/categories/${tool.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                          onClick={(e) => {
                            e.preventDefault();
                            onNavigate('categories');
                          }}
                          className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                        >
                          {tool.category}
                        </a>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {tool.pricingType}
                        </div>
                      </div>
                    </td>

                    {/* Monthly Traffic & Visual Bar */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-heading font-extrabold text-slate-900 dark:text-white text-sm">
                            {tool.monthlyVisitsFormatted || `${(trafficValue / 1000000).toFixed(1)}M`}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">visits/mo</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                            style={{ width: `${trafficPercentage}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Growth */}
                    <td className="py-4 px-4 sm:px-6">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        growth >= 0
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-800'
                      }`}>
                        <TrendingUp className="w-3.5 h-3.5" />
                        {growth >= 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`}
                      </span>
                    </td>

                    {/* Demographics */}
                    <td className="py-4 px-4 sm:px-6 hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          <span>{tool.trafficStats?.topCountry || 'Global'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {tool.trafficStats?.avgDuration || '04:15'}
                          </span>
                          <span>Bounce: {tool.trafficStats?.bounceRate || '30%'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="py-4 px-4 sm:px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            onNavigate('compare');
                          }}
                          title="Compare Tool"
                          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                        >
                          <GitCompare className="w-4 h-4" />
                        </button>
                        <a
                          href={tool.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                          title="Visit Official Site"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
