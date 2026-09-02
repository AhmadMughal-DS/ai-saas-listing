import React, { useState, useMemo } from 'react';
import { AITool, ActiveTab } from '../types';
import { 
  GitCompare, 
  Check, 
  X, 
  ExternalLink, 
  Star, 
  TrendingUp, 
  Sparkles, 
  ArrowRight, 
  Plus, 
  RotateCcw,
  Zap,
  Globe,
  Tag,
  ShieldCheck,
  Trophy,
  Bot
} from 'lucide-react';

interface CompareViewProps {
  tools: AITool[];
  onSelectTool: (tool: AITool) => void;
  onNavigate: (tab: ActiveTab) => void;
}

const PRESET_COMPARISONS = [
  { name: 'Cursor AI vs CodeBrain', tool1: 'tool-cursor', tool2: 'tool-codebrain' },
  { name: 'Midjourney v6 vs Lumina AI', tool1: 'tool-midjourney', tool2: 'tool-lumina-ai' },
  { name: 'Perplexity AI vs ChatGPT 4o', tool1: 'tool-perplexity', tool2: 'tool-chatgpt' },
  { name: 'ElevenLabs vs SonicSculpt', tool1: 'tool-elevenlabs', tool2: 'tool-sonicsculpt' },
];

interface VerdictData {
  verdictTitle: string;
  summary: string;
  recommendation: string;
  keyFactors: {
    factor: string;
    winner: string;
    reason: string;
  }[];
}

export const CompareView: React.FC<CompareViewProps> = ({
  tools,
  onSelectTool,
  onNavigate,
}) => {
  // Find initial tool IDs from tools list
  const defaultTool1 = tools.find((t) => t.slug === 'cursor-ai' || t.id.includes('cursor')) || tools[0];
  const defaultTool2 = tools.find((t) => t.slug === 'codebrain' || t.id.includes('code')) || tools[1] || tools[0];
  const defaultTool3 = tools.find((t) => t.slug === 'chatgpt' || t.slug === 'lumina-ai') || tools[2] || null;

  const [tool1Id, setTool1Id] = useState<string>(defaultTool1?.id || '');
  const [tool2Id, setTool2Id] = useState<string>(defaultTool2?.id || '');
  const [tool3Id, setTool3Id] = useState<string>(defaultTool3 ? defaultTool3.id : '');
  const [showThirdTool, setShowThirdTool] = useState<boolean>(false);

  const [isGeneratingVerdict, setIsGeneratingVerdict] = useState(false);
  const [verdict, setVerdict] = useState<VerdictData | null>(null);

  const tool1 = useMemo(() => tools.find((t) => t.id === tool1Id) || tools[0], [tools, tool1Id]);
  const tool2 = useMemo(() => tools.find((t) => t.id === tool2Id) || tools[1], [tools, tool2Id]);
  const tool3 = useMemo(() => (showThirdTool && tool3Id ? tools.find((t) => t.id === tool3Id) : null), [tools, tool3Id, showThirdTool]);

  const activeCompareTools = useMemo(() => {
    return [tool1, tool2, tool3].filter((t): t is AITool => Boolean(t));
  }, [tool1, tool2, tool3]);

  const handleApplyPreset = (id1: string, id2: string) => {
    const found1 = tools.find((t) => t.id === id1 || t.slug.includes(id1.replace('tool-', '')));
    const found2 = tools.find((t) => t.id === id2 || t.slug.includes(id2.replace('tool-', '')));
    if (found1) setTool1Id(found1.id);
    if (found2) setTool2Id(found2.id);
    setShowThirdTool(false);
    setVerdict(null);
  };

  const handleGenerateVerdict = async () => {
    setIsGeneratingVerdict(true);
    try {
      const res = await fetch('/api/ai/compare-verdict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool1Name: tool1.name,
          tool2Name: tool2.name,
          tool3Name: tool3?.name,
          toolData: {
            tool1: { name: tool1.name, visits: tool1.monthlyVisitsFormatted, pricing: tool1.pricingType, rating: tool1.rating, pros: tool1.pros },
            tool2: { name: tool2.name, visits: tool2.monthlyVisitsFormatted, pricing: tool2.pricingType, rating: tool2.rating, pros: tool2.pros },
            tool3: tool3 ? { name: tool3.name, visits: tool3.monthlyVisitsFormatted, pricing: tool3.pricingType, rating: tool3.rating, pros: tool3.pros } : null,
          }
        }),
      });

      const data = await res.json();
      setVerdict(data);
    } catch (err) {
      console.error(err);
      setVerdict({
        verdictTitle: `${tool1.name} vs ${tool2.name}: Analytical Breakdown`,
        summary: `${tool1.name} offers established market presence with ${tool1.monthlyVisitsFormatted || 'high'} monthly visits, whereas ${tool2.name} focuses on niche specialized features and agility.`,
        recommendation: `Opt for ${tool1.name} if you require robust documentation and high community adoption. Choose ${tool2.name} for competitive pricing and agile updates.`,
        keyFactors: [
          { factor: 'Traffic & Scale', winner: tool1.name, reason: `${tool1.monthlyVisitsFormatted || 'Higher volume'} monthly audience.` },
          { factor: 'Value & Flexibility', winner: tool2.name, reason: `Flexible ${tool2.pricingType} pricing model.` },
        ]
      });
    } finally {
      setIsGeneratingVerdict(false);
    }
  };

  return (
    <div className="w-full pt-28 pb-24 px-4 sm:px-8 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="text-center max-w-4xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wide mb-4 shadow-xs">
          <GitCompare className="w-4 h-4 text-indigo-600" />
          <span>Side-by-Side Comparison & AI Verdict Engine</span>
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          Compare AI Tools Side-by-Side
        </h1>
        <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Evaluate monthly web traffic, pricing models, key features, platform availability, and verified pros/cons to choose the ultimate AI solution.
        </p>

        {/* Popular Presets */}
        <div className="flex items-center justify-center flex-wrap gap-2 mt-6">
          <span className="text-xs font-semibold text-slate-400 mr-1">Popular Comparisons:</span>
          {PRESET_COMPARISONS.map((preset, i) => (
            <button
              key={i}
              onClick={() => handleApplyPreset(preset.tool1, preset.tool2)}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 shadow-xs transition-all cursor-pointer"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 mb-8 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Tool 1 Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Primary Tool (A)
            </label>
            <select
              value={tool1Id}
              onChange={(e) => {
                setTool1Id(e.target.value);
                setVerdict(null);
              }}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {tools.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
          </div>

          {/* Tool 2 Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Comparison Rival (B)
            </label>
            <select
              value={tool2Id}
              onChange={(e) => {
                setTool2Id(e.target.value);
                setVerdict(null);
              }}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {tools.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
          </div>

          {/* Tool 3 Selector / Add Slot */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Third Tool (Optional)
              </label>
              {showThirdTool ? (
                <button
                  onClick={() => {
                    setShowThirdTool(false);
                    setVerdict(null);
                  }}
                  className="text-[11px] text-rose-600 font-semibold hover:underline cursor-pointer"
                >
                  Remove Slot
                </button>
              ) : null}
            </div>

            {showThirdTool ? (
              <select
                value={tool3Id}
                onChange={(e) => {
                  setTool3Id(e.target.value);
                  setVerdict(null);
                }}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">-- Select 3rd Tool --</option>
                {tools.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.category})
                  </option>
                ))}
              </select>
            ) : (
              <button
                onClick={() => {
                  setShowThirdTool(true);
                  if (!tool3Id && tools[2]) setTool3Id(tools[2].id);
                  setVerdict(null);
                }}
                className="w-full p-3 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:text-indigo-600 hover:border-indigo-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add 3rd Tool for Tri-Comparison</span>
              </button>
            )}
          </div>
        </div>

        {/* AI Verdict Generator Button */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Bot className="w-4 h-4 text-indigo-600" />
            <span>Need an impartial technical breakdown of which one fits your use-case?</span>
          </div>

          <button
            onClick={handleGenerateVerdict}
            disabled={isGeneratingVerdict}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl btn-purple text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isGeneratingVerdict ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Analyzing specs with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Generate AI Comparison Verdict</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI Verdict Box */}
      {verdict && (
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 mb-8 shadow-lg border border-indigo-500/30 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300">
                AIFlux AI Executive Verdict
              </span>
              <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-white">
                {verdict.verdictTitle}
              </h2>
            </div>
          </div>

          <p className="text-slate-200 text-sm leading-relaxed mb-6">
            {verdict.summary}
          </p>

          {/* Key Factors Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {verdict.keyFactors.map((item, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {item.factor}
                </div>
                <div className="text-sm font-extrabold text-indigo-300">
                  Winner: {item.winner}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {item.reason}
                </p>
              </div>
            ))}
          </div>

          {/* Final Recommendation */}
          <div className="p-4 rounded-2xl bg-indigo-950/80 border border-indigo-400/30 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-indigo-200 uppercase tracking-wide block mb-0.5">
                Target User Recommendation:
              </span>
              <p className="text-xs text-slate-200 leading-relaxed">
                {verdict.recommendation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Grid & Matrix */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        {/* Header Profiles Row */}
        <div className={`grid grid-cols-1 ${activeCompareTools.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} divide-y lg:divide-y-0 lg:divide-x divide-slate-200 border-b border-slate-200`}>
          {activeCompareTools.map((tool) => (
            <div key={tool.id} className="p-6 sm:p-8 flex flex-col justify-between bg-slate-50/50">
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 p-2.5 flex items-center justify-center shadow-xs">
                    <img
                      src={tool.logoUrl}
                      alt={tool.name}
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {tool.category}
                  </span>
                </div>

                <h2 className="font-heading text-2xl font-extrabold text-slate-900 mb-1">
                  {tool.name}
                </h2>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                  {tool.tagline}
                </p>

                {/* Rating & Reviews */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < Math.floor(tool.rating)
                            ? 'fill-amber-500 text-amber-500'
                            : 'text-amber-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-800">{tool.rating.toFixed(1)}</span>
                  <span className="text-[11px] text-slate-400">({tool.reviewCount} reviews)</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-200/60">
                <button
                  onClick={() => onSelectTool(tool)}
                  className="flex-1 py-2.5 rounded-xl btn-purple text-xs font-semibold cursor-pointer shadow-xs"
                >
                  View Full Specs
                </button>
                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
                  title="Visit Website"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Section: Traffic & Market Dominance */}
        <div className="p-6 sm:p-8 border-b border-slate-200">
          <h3 className="font-heading text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <span>Traffic & Market Intelligence (Toolify Indexed)</span>
          </h3>

          <div className={`grid grid-cols-1 ${activeCompareTools.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
            {activeCompareTools.map((tool) => (
              <div key={tool.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Monthly Visitors:</span>
                  <span className="font-heading font-extrabold text-slate-900 text-base">
                    {tool.monthlyVisitsFormatted || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">MoM Growth Rate:</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    +{tool.trafficGrowth || 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Global Ranking:</span>
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    #{tool.globalRank || 'Top 50'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Primary Audience:</span>
                  <span className="text-xs font-semibold text-slate-800">
                    {tool.trafficStats?.topCountry || 'Global'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Pricing & Commercial */}
        <div className="p-6 sm:p-8 border-b border-slate-200">
          <h3 className="font-heading text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-600" />
            <span>Pricing & Developer Access</span>
          </h3>

          <div className={`grid grid-cols-1 ${activeCompareTools.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
            {activeCompareTools.map((tool) => (
              <div key={tool.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Pricing Model:</span>
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-white border border-slate-200 text-slate-800">
                    {tool.pricingType}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Developer API Access:</span>
                  <span className="flex items-center gap-1 text-xs font-semibold">
                    {tool.hasApi ? (
                      <span className="text-emerald-700 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Full API Available</span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1"><X className="w-3.5 h-3.5" /> No Public API</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Open Source Codebase:</span>
                  <span className="flex items-center gap-1 text-xs font-semibold">
                    {tool.isOpenSource ? (
                      <span className="text-emerald-700 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Open Source (GitHub)</span>
                    ) : (
                      <span className="text-slate-500">Proprietary</span>
                    )}
                  </span>
                </div>

                {tool.deal && (
                  <div className="mt-2 p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-700">{tool.deal.discount}</span>
                    <span className="font-mono text-[11px] font-extrabold bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-800">
                      {tool.deal.code}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section: Platforms & Support */}
        <div className="p-6 sm:p-8 border-b border-slate-200">
          <h3 className="font-heading text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            <span>Supported Platforms</span>
          </h3>

          <div className={`grid grid-cols-1 ${activeCompareTools.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
            {activeCompareTools.map((tool) => (
              <div key={tool.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex flex-wrap gap-1.5">
                  {(tool.platforms || ['Web']).map((platform, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700"
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Pros & Cons */}
        <div className="p-6 sm:p-8">
          <h3 className="font-heading text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span>Editorial Pros & Cons Breakdown</span>
          </h3>

          <div className={`grid grid-cols-1 ${activeCompareTools.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
            {activeCompareTools.map((tool) => (
              <div key={tool.id} className="space-y-4">
                {/* Pros */}
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-2">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> What Users Love (Pros)
                  </span>
                  <ul className="space-y-1.5">
                    {(tool.pros || ['Intuitive user interface', 'Fast generation times']).map((pro, idx) => (
                      <li key={idx} className="text-xs text-emerald-900 flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Cons */}
                <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-2">
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wide flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5 text-rose-600" /> Potential Limitations (Cons)
                  </span>
                  <ul className="space-y-1.5">
                    {(tool.cons || ['Requires paid plan for advanced features']).map((con, idx) => (
                      <li key={idx} className="text-xs text-rose-900 flex items-start gap-1.5">
                        <span className="text-rose-500 font-bold">•</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
