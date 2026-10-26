import React, { useState, useMemo } from 'react';
import { AIDeal, AITool, ActiveTab } from '../types';
import { INITIAL_DEALS } from '../data/initialData';
import { trackDealClick } from '../lib/analytics';
import { 
  Tag, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Flame, 
  Clock, 
  ShieldCheck, 
  Percent, 
  Gift, 
  Search,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

interface DealsViewProps {
  tools: AITool[];
  onSelectTool: (tool: AITool) => void;
  onNavigate: (tab: ActiveTab) => void;
}

export const DealsView: React.FC<DealsViewProps> = ({
  tools,
  onSelectTool,
  onNavigate,
}) => {
  const [claimOverlay, setClaimOverlay] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const dealTypes = ['All', 'Discount', 'Lifetime', 'Free Trial', 'Free Credits'];

  // Every tool appears in Deals: curated INITIAL_DEALS first, then one offer per tool.
  const allDeals = useMemo<AIDeal[]>(() => {
    const toDeal = (tool: AITool): AIDeal => {
      const d: any = (tool as any).deal;
      const pricing = tool.pricingType || 'Freemium';
      let dealType: AIDeal['dealType'] = 'Discount';
      let discount = 'Best Price';
      let dealPrice = 'See site';
      if (/free|open source/i.test(pricing)) { dealType = 'Free Credits'; discount = 'FREE ACCESS'; dealPrice = 'Free'; }
      else if (/freemium|trial/i.test(pricing)) { dealType = 'Free Trial'; discount = 'FREE PLAN'; dealPrice = 'Free tier'; }
      return {
        id: `tool-deal-${tool.slug || tool.id}`,
        toolId: tool.id,
        toolName: tool.name,
        toolLogo: tool.logoUrl || '',
        discount: d?.discount || discount,
        code: d?.code || '',
        description: d?.description || tool.tagline || (tool.description ? tool.description.slice(0, 120) : `Explore ${tool.name} on ToolverAI.`),
        dealPrice: d?.dealPrice || dealPrice,
        expiresIn: d?.expiresIn || 'Ongoing',
        dealType: (d?.dealType as AIDeal['dealType']) || dealType,
        verified: Boolean(tool.isVerified),
        claimedCount: (tool.upvotes as number) || 0,
        url: tool.url || '',
      };
    };
    const seen = new Set(INITIAL_DEALS.map((d) => d.toolName.toLowerCase()));
    const toolDeals = (tools || [])
      .filter((t) => t && t.name && !seen.has(t.name.toLowerCase()))
      .map(toDeal);
    return [...INITIAL_DEALS, ...toolDeals];
  }, [tools]);

  const filteredDeals = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return allDeals
      .map((deal) => ({ ...deal, claimedCount: deal.claimedCount + (claimOverlay[deal.id] || 0) }))
      .filter((deal) => {
        const matchType = selectedType === 'All' || deal.dealType === selectedType;
        const matchSearch =
          deal.toolName.toLowerCase().includes(q) ||
          deal.description.toLowerCase().includes(q) ||
          deal.discount.toLowerCase().includes(q) ||
          deal.code.toLowerCase().includes(q);
        return matchType && matchSearch;
      });
  }, [allDeals, selectedType, searchQuery, claimOverlay]);

  const handleCopyCode = (deal: AIDeal) => {
    if (deal.code) {
      navigator.clipboard.writeText(deal.code);
      setCopiedCodeId(deal.id);
      setTimeout(() => {
        setCopiedCodeId(null);
      }, 2500);
      // Track deal_click with action: copy_code
      trackDealClick({
        deal_id: deal.id,
        deal_tool_name: deal.toolName,
        deal_type: deal.dealType,
        deal_discount: deal.discount,
        action: 'copy_code',
      });
    }
  };

  const handleClaim = (deal: AIDeal) => {
    // Increment claimed count (overlay on the derived list)
    setClaimOverlay((prev) => ({ ...prev, [deal.id]: (prev[deal.id] || 0) + 1 }));
    // Track deal_click with action: claim (opening the deal URL)
    trackDealClick({
      deal_id: deal.id,
      deal_tool_name: deal.toolName,
      deal_type: deal.dealType,
      deal_discount: deal.discount,
      action: 'claim',
    });
    window.open(deal.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full pt-28 pb-24 px-4 sm:px-8 max-w-[1440px] mx-auto">
      {/* Hero Header */}
      <div className="text-center max-w-4xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wide mb-4 shadow-xs">
          <Gift className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Exclusive Community Savings</span>
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
          Verified AI Deals & Promo Codes
        </h1>
        <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Save hundreds on your AI tech stack. Verified coupons, lifetime subscriptions, and founder discount codes updated daily.
        </p>

        {/* Highlight Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs">
          <div className="text-center border-r border-slate-100 dark:border-slate-800 last:border-none">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-heading">Up to 80%</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">Max Verified Discount</div>
          </div>
          <div className="text-center border-r border-slate-100 dark:border-slate-800 last:border-none">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-heading">100%</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">Tested Promo Codes</div>
          </div>
          <div className="text-center border-r border-slate-100 dark:border-slate-800 last:border-none">
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 font-heading">8,400+</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">Deals Claimed by Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-heading">Daily</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">Verification Cycle</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 mb-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Deal Type Filter Tabs */}
          <div className="flex items-center flex-wrap gap-1.5 p-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl w-full sm:w-auto">
            {dealTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  selectedType === type
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs border border-slate-200 dark:border-slate-700 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {type === 'All' ? 'All Deals' : type}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search coupons & deals..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Deals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {filteredDeals.map((deal) => {
          const isCopied = copiedCodeId === deal.id;
          return (
            <div
              key={deal.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-xs hover:border-emerald-200 dark:hover:border-emerald-700 hover:shadow-md transition-all duration-200 relative group"
            >
              <div>
                {/* Header: Logo, Verified Badge, Expiry */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <a
                      href={`/tool/${deal.toolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}
                      onClick={(e) => {
                        const slug = deal.toolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                        const matched = tools.find((t) => t.name.toLowerCase() === deal.toolName.toLowerCase() || t.slug === slug);
                        if (matched) {
                          e.preventDefault();
                          onSelectTool(matched);
                        }
                      }}
                      className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 flex items-center justify-center shrink-0 block"
                    >
                      <img
                        src={deal.toolLogo}
                        alt={deal.toolName}
                        className="w-full h-full object-contain rounded-xl"
                      />
                    </a>
                    <div>
                      <h3 className="font-heading font-extrabold text-slate-900 dark:text-white text-lg group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        <a
                          href={`/tool/${deal.toolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}
                          onClick={(e) => {
                            const slug = deal.toolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                            const matched = tools.find((t) => t.name.toLowerCase() === deal.toolName.toLowerCase() || t.slug === slug);
                            if (matched) {
                              e.preventDefault();
                              onSelectTool(matched);
                            }
                          }}
                        >
                          {deal.toolName}
                        </a>
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-800">
                          <ShieldCheck className="w-3 h-3" /> Verified
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> {deal.expiresIn}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Big Discount Banner */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/60 mb-4">
                  <div className="text-emerald-900 dark:text-white font-heading font-extrabold text-lg">
                    {deal.discount}
                  </div>
                  <p className="text-xs text-emerald-700/90 dark:text-emerald-300 mt-1 leading-relaxed">
                    {deal.description}
                  </p>
                </div>

                {/* Price Display */}
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-heading">
                    {deal.dealPrice}
                  </span>
                  {deal.originalPrice && (
                    <span className="text-sm text-slate-400 dark:text-slate-500 line-through font-medium">
                      {deal.originalPrice}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
                    {deal.claimedCount.toLocaleString()} claimed
                  </span>
                </div>
              </div>

              {/* Action Buttons: Copy Code + Claim Deal */}
              <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                {/* 1-Click Copy Code Box */}
                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-slate-400" />
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-white tracking-wider">
                      {deal.code}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyCode(deal)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Claim Deal CTA */}
                <button
                  onClick={() => handleClaim(deal)}
                  className="w-full py-3 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white hover:bg-slate-800 dark:hover:bg-emerald-500 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <span>Claim Exclusive Deal</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Partner with us / Submit a deal banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-8 sm:p-12 shadow-sm text-center max-w-4xl mx-auto relative overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center mx-auto text-indigo-400">
            <Percent className="w-6 h-6" />
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">
            Are you an AI Founder or Marketing Lead?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Partner with ToolverAI (toolverai.com) to distribute verified discounts, lifetime coupons, and trial credits to over 350,000+ monthly AI researchers and developers.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onNavigate('directory')}
              className="px-6 py-3 rounded-xl bg-white text-slate-950 font-bold text-sm hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
            >
              List an Exclusive Deal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
