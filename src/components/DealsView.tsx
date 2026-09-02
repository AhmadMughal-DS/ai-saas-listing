import React, { useState, useMemo } from 'react';
import { AIDeal, AITool, ActiveTab } from '../types';
import { INITIAL_DEALS } from '../data/initialData';
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
  const [deals, setDeals] = useState<AIDeal[]>(INITIAL_DEALS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const dealTypes = ['All', 'Discount', 'Lifetime', 'Free Trial', 'Free Credits'];

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const matchType = selectedType === 'All' || deal.dealType === selectedType;
      const matchSearch =
        deal.toolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.discount.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchSearch;
    });
  }, [deals, selectedType, searchQuery]);

  const handleCopyCode = (deal: AIDeal) => {
    if (deal.code) {
      navigator.clipboard.writeText(deal.code);
      setCopiedCodeId(deal.id);
      setTimeout(() => {
        setCopiedCodeId(null);
      }, 2500);
    }
  };

  const handleClaim = (deal: AIDeal) => {
    // Increment claimed count
    setDeals((prev) =>
      prev.map((d) => (d.id === deal.id ? { ...d, claimedCount: d.claimedCount + 1 } : d))
    );
    window.open(deal.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full pt-28 pb-24 px-4 sm:px-8 max-w-[1440px] mx-auto">
      {/* Hero Header */}
      <div className="text-center max-w-4xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold uppercase tracking-wide mb-4 shadow-xs">
          <Gift className="w-4 h-4 text-emerald-600" />
          <span>Exclusive Community Savings</span>
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-4">
          Verified AI Deals & Promo Codes
        </h1>
        <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Save hundreds on your AI tech stack. Verified coupons, lifetime subscriptions, and founder discount codes updated daily.
        </p>

        {/* Highlight Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
          <div className="text-center border-r border-slate-100 last:border-none">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">Up to 80%</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Max Verified Discount</div>
          </div>
          <div className="text-center border-r border-slate-100 last:border-none">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-heading">100%</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Tested Promo Codes</div>
          </div>
          <div className="text-center border-r border-slate-100 last:border-none">
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 font-heading">8,400+</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Deals Claimed by Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">Daily</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Verification Cycle</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 mb-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Deal Type Filter Tabs */}
          <div className="flex items-center flex-wrap gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-xl w-full sm:w-auto">
            {dealTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  selectedType === type
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
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
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
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
              className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between shadow-xs hover:border-emerald-200 hover:shadow-md transition-all duration-200 relative group"
            >
              <div>
                {/* Header: Logo, Verified Badge, Expiry */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center shrink-0">
                      <img
                        src={deal.toolLogo}
                        alt={deal.toolName}
                        className="w-full h-full object-contain rounded-xl"
                      />
                    </div>
                    <div>
                      <h3 className="font-heading font-extrabold text-slate-900 text-lg group-hover:text-emerald-700 transition-colors">
                        {deal.toolName}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          <ShieldCheck className="w-3 h-3" /> Verified
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> {deal.expiresIn}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Big Discount Banner */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 mb-4">
                  <div className="text-emerald-900 font-heading font-extrabold text-lg">
                    {deal.discount}
                  </div>
                  <p className="text-xs text-emerald-700/90 mt-1 leading-relaxed">
                    {deal.description}
                  </p>
                </div>

                {/* Price Display */}
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-2xl font-extrabold text-slate-900 font-heading">
                    {deal.dealPrice}
                  </span>
                  {deal.originalPrice && (
                    <span className="text-sm text-slate-400 line-through font-medium">
                      {deal.originalPrice}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 ml-auto">
                    {deal.claimedCount.toLocaleString()} claimed
                  </span>
                </div>
              </div>

              {/* Action Buttons: Copy Code + Claim Deal */}
              <div className="space-y-2.5 pt-4 border-t border-slate-100">
                {/* 1-Click Copy Code Box */}
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-slate-400" />
                    <span className="font-mono text-xs font-bold text-slate-800 tracking-wider">
                      {deal.code}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyCode(deal)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
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
                  className="w-full py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
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
            Partner with AIFlux to distribute verified discounts, lifetime coupons, and trial credits to over 350,000+ monthly AI researchers and developers.
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
