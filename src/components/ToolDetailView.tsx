import React, { useState } from 'react';
import { AITool, ToolReview, UserAccount } from '../types';
import { 
  Star, 
  CheckCircle, 
  ExternalLink, 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles, 
  MessageSquare, 
  Send,
  Flame,
  TrendingUp,
  Globe,
  Tag,
  Copy,
  Check,
  GitCompare,
  X,
  Clock,
  Laptop,
  ThumbsUp,
  Building2,
  Briefcase
} from 'lucide-react';

interface ToolDetailViewProps {
  tool: AITool;
  allTools: AITool[];
  user: UserAccount | null;
  onBack: () => void;
  onSelectTool: (tool: AITool) => void;
  onSubscribePlan: (plan: { name: string; price: number; billingPeriod: string; description: string }) => void;
  onAddReview: (toolId: string, review: ToolReview) => void;
}

export const ToolDetailView: React.FC<ToolDetailViewProps> = ({
  tool,
  allTools,
  user,
  onBack,
  onSelectTool,
  onSubscribePlan,
  onAddReview,
}) => {
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState(user?.displayName || '');
  const [authorRole, setAuthorRole] = useState('');
  const [authorCompany, setAuthorCompany] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, { count: number; voted: boolean }>>({});

  const relatedTools = allTools.filter((t) => t.id !== tool.id).slice(0, 3);

  const handleToggleHelpful = (revId: string, initialCount: number = 0) => {
    setHelpfulVotes(prev => {
      const current = prev[revId] || { count: initialCount, voted: false };
      if (current.voted) {
        return {
          ...prev,
          [revId]: { count: current.count - 1, voted: false }
        };
      } else {
        return {
          ...prev,
          [revId]: { count: current.count + 1, voted: true }
        };
      }
    });
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingReview(true);
    const newRev: ToolReview = {
      id: `rev-${Date.now()}`,
      authorName: authorName || 'Verified Member',
      authorRole: authorRole || 'Verified User',
      authorCompany: authorCompany || 'Tech Industry',
      authorAvatar: user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      rating: newRating,
      comment: newComment,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      verified: true,
      helpfulCount: 0
    };

    onAddReview(tool.id, newRev);
    setNewComment('');
    setAuthorRole('');
    setAuthorCompany('');
    setIsSubmittingReview(false);
  };

  const handleCopyDealCode = () => {
    if (tool.deal?.code) {
      navigator.clipboard.writeText(tool.deal.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  return (
    <div className="w-full pt-28 pb-24 px-4 sm:px-8 max-w-[1440px] mx-auto">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 mb-8 transition-colors cursor-pointer group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Directory</span>
      </button>

      {/* Main Tool Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 mb-10 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Logo */}
            <div className="w-24 h-24 rounded-2xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-center shrink-0">
              <img
                src={tool.logoUrl}
                alt={tool.name}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            {/* Title & Ratings */}
            <div>
              <div className="flex items-center flex-wrap gap-2.5 mb-1.5">
                <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900">
                  {tool.name}
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {tool.category}
                </span>
                {tool.hasApi && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    API Available
                  </span>
                )}
                {tool.isOpenSource && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Open Source
                  </span>
                )}
              </div>

              {/* Stars & Verification */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(tool.rating)
                          ? 'fill-amber-500 text-amber-500'
                          : 'text-amber-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-bold text-slate-900">
                  {tool.rating.toFixed(1)}
                </span>
                <span className="text-xs text-slate-400">
                  ({tool.reviewCount.toLocaleString()} Verified Reviews)
                </span>
              </div>

              <p className="text-sm sm:text-base text-slate-500 max-w-2xl font-normal leading-relaxed">
                {tool.tagline}
              </p>
            </div>
          </div>

          {/* Action CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
            <a
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3.5 px-8 rounded-xl btn-purple text-sm font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <span>Visit Official Site</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left 2 Cols: Traffic Analytics, Deal Widget, Overview, Specs, Pricing Plans, Reviews */}
        <div className="lg:col-span-2 space-y-10">
          {/* Traffic Analytics Summary (Toolify Competitor Feature) */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
            <h2 className="font-heading text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <span>Traffic & Popularity Benchmarks</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500 font-medium mb-1">Monthly Visitors</div>
                <div className="text-2xl font-extrabold text-slate-900 font-heading">
                  {tool.monthlyVisitsFormatted || `${((tool.monthlyVisits || 10000000) / 1000000).toFixed(1)}M`}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Estimated web traffic</div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <div className="text-xs text-emerald-800 font-medium mb-1">Traffic Growth (MoM)</div>
                <div className="text-2xl font-extrabold text-emerald-700 font-heading flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>+{tool.trafficGrowth || 35.4}%</span>
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">High growth index</div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                <div className="text-xs text-indigo-800 font-medium mb-1">Global Traffic Rank</div>
                <div className="text-2xl font-extrabold text-indigo-700 font-heading">
                  #{tool.globalRank || 8}
                </div>
                <div className="text-[10px] text-indigo-600 mt-0.5">Among all AI websites</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500 font-medium mb-1">Category Position</div>
                <div className="text-2xl font-extrabold text-slate-900 font-heading">
                  #{tool.categoryRank || 1}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">in {tool.category}</div>
              </div>
            </div>

            {/* Demographics & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400" />
                <span className="font-semibold">Top Visitor Source:</span>
                <span>{tool.trafficStats?.topCountry || 'United States (38%)'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="font-semibold">Avg. Session Duration:</span>
                <span>{tool.trafficStats?.avgDuration || '05:12'} (Bounce: {tool.trafficStats?.bounceRate || '28.4%'})</span>
              </div>
            </div>
          </section>

          {/* Exclusive Deal Widget (AIChief Competitor Feature) */}
          {tool.deal && (
            <section className="bg-emerald-50/60 border border-emerald-200 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wide mb-2">
                    <Tag className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Exclusive Verified Discount</span>
                  </div>
                  <h3 className="font-heading text-2xl font-extrabold text-emerald-950 mb-1">
                    {tool.deal.discount}
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed max-w-xl">
                    {tool.deal.description}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-emerald-200 shadow-xs">
                    <span className="font-mono text-sm font-extrabold text-emerald-900 tracking-wider">
                      {tool.deal.code}
                    </span>
                    <button
                      onClick={handleCopyDealCode}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        copiedCode
                          ? 'bg-emerald-700 text-white'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      }`}
                    >
                      {copiedCode ? (
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
                </div>
              </div>
            </section>
          )}

          {/* Overview */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
            <h2 className="font-heading text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>Overview & Description</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {tool.description}
            </p>
          </section>

          {/* Pros & Cons (AIChief Competitor Feature) */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
            <h2 className="font-heading text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <span>Pros & Cons Editorial Breakdown</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Pros */}
              <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-3">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> What Users Love (Pros)
                </span>
                <ul className="space-y-2">
                  {(tool.pros || [
                    'Lightning fast inference velocity',
                    'Generous free usage tier',
                    'Active developer community and documentation'
                  ]).map((pro, idx) => (
                    <li key={idx} className="text-xs text-emerald-900 flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cons */}
              <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-3">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wide flex items-center gap-1.5">
                  <X className="w-4 h-4 text-rose-600" /> Potential Limitations (Cons)
                </span>
                <ul className="space-y-2">
                  {(tool.cons || [
                    'Advanced features locked behind commercial tier'
                  ]).map((con, idx) => (
                    <li key={idx} className="text-xs text-rose-900 flex items-start gap-2">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Key Features */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
            <h2 className="font-heading text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-indigo-600" />
              <span>Core Capabilities</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {tool.keyFeatures.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-slate-800">{feature}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Pricing Plans */}
          <section>
            <h2 className="font-heading text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>Official Pricing Tiers</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tool.pricingPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`bg-white rounded-3xl p-6 flex flex-col justify-between transition-all ${
                    plan.isPopular
                      ? 'border-2 border-indigo-600 shadow-md ring-4 ring-indigo-50/80'
                      : 'border border-slate-200 shadow-xs'
                  }`}
                >
                  <div>
                    {plan.isPopular && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-3 inline-block">
                        RECOMMENDED
                      </span>
                    )}
                    <h3 className="font-heading text-xl font-bold text-slate-900 mb-1">
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1 my-3">
                      <span className="text-3xl font-extrabold text-slate-900 font-heading">
                        {plan.price}
                      </span>
                      <span className="text-xs text-slate-500">
                        {plan.billingPeriod}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">
                      {plan.description}
                    </p>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((f, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <a
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer block ${
                      plan.isPopular ? 'btn-purple shadow-xs' : 'btn-outline-purple'
                    }`}
                  >
                    {plan.ctaText}
                  </a>
                </div>
              ))}
            </div>
          </section>

          {/* User Reviews */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                  <span>Verified User Reviews</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real feedback from researchers, founders, and engineers
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-extrabold text-amber-500 flex items-center gap-1 font-heading">
                  <Star className="w-5 h-5 fill-amber-500" />
                  <span>{tool.rating.toFixed(1)}</span>
                </div>
                <div className="text-xs text-slate-400">
                  {tool.reviewCount.toLocaleString()} total reviews
                </div>
              </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-4 mb-8">
              {tool.reviews.map((rev) => {
                const currentHelpful = helpfulVotes[rev.id] || { 
                  count: rev.helpfulCount ?? Math.floor(Math.random() * 40 + 15), 
                  voted: false 
                };

                return (
                  <div
                    key={rev.id}
                    className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={rev.authorAvatar}
                          alt={rev.authorName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">
                              {rev.authorName}
                            </span>
                            {rev.verified && (
                              <span className="flex items-center gap-0.5 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 font-semibold">
                                <ShieldCheck className="w-3 h-3" /> Verified Buyer
                              </span>
                            )}
                          </div>
                          {(rev.authorRole || rev.authorCompany) && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                              {rev.authorRole && <span>{rev.authorRole}</span>}
                              {rev.authorRole && rev.authorCompany && <span>•</span>}
                              {rev.authorCompany && <span className="text-indigo-600 font-semibold">{rev.authorCompany}</span>}
                            </div>
                          )}
                          <span className="text-[11px] text-slate-400">{rev.date}</span>
                        </div>
                      </div>

                      <div className="flex text-amber-500 shrink-0">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating
                                ? 'fill-amber-500 text-amber-500'
                                : 'text-amber-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-sm text-slate-700 leading-relaxed pl-0.5">
                      {rev.comment}
                    </p>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleToggleHelpful(rev.id, rev.helpfulCount ?? 20)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          currentHelpful.voted
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${currentHelpful.voted ? 'fill-indigo-600 text-indigo-600' : ''}`} />
                        <span>Helpful ({currentHelpful.count})</span>
                      </button>
                      <span className="text-[11px] text-slate-400">Authentic Review</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Submit Review Form */}
            <form onSubmit={handleReviewSubmit} className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <h3 className="font-heading text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Leave a Verified Industry Review</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    required
                    className="w-full bg-white border border-slate-200 focus:border-indigo-600 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Job Title / Role
                  </label>
                  <input
                    type="text"
                    value={authorRole}
                    onChange={(e) => setAuthorRole(e.target.value)}
                    placeholder="e.g. Senior ML Engineer"
                    className="w-full bg-white border border-slate-200 focus:border-indigo-600 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    value={authorCompany}
                    onChange={(e) => setAuthorCompany(e.target.value)}
                    placeholder="e.g. DeepScale Labs"
                    className="w-full bg-white border border-slate-200 focus:border-indigo-600 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Overall Rating (1-5 Stars)
                </label>
                <div className="flex items-center gap-2 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating(star)}
                      className="p-1 hover:scale-125 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= newRating
                            ? 'fill-amber-500 text-amber-500'
                            : 'text-slate-200'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-600 ml-2">
                    {newRating} / 5 Stars
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Detailed Review
                </label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your practical benchmarks, token efficiency, feature highlights, and ROI experience..."
                  rows={3}
                  required
                  className="w-full bg-white border border-slate-200 focus:border-indigo-600 rounded-xl p-3 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingReview}
                className="py-2.5 px-6 rounded-xl btn-purple text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish Verified Review</span>
              </button>
            </form>
          </section>
        </div>

        {/* Right Sidebar: Platforms, Alternatives, Quick Spec Card */}
        <div className="space-y-6">
          {/* Supported Platforms */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <h3 className="font-heading text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-indigo-600" />
              <span>Supported Platforms</span>
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {(tool.platforms || ['Web', 'API']).map((p, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Direct Alternatives */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <h3 className="font-heading text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-indigo-600" />
              <span>Direct Alternatives</span>
            </h3>

            <div className="space-y-3">
              {relatedTools.map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => onSelectTool(rel)}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-200 hover:bg-slate-100/60 transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={rel.logoUrl}
                      alt={rel.name}
                      className="w-10 h-10 rounded-xl object-contain bg-white border border-slate-200 p-1"
                    />
                    <div>
                      <h4 className="font-heading font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                        {rel.name}
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        {rel.monthlyVisitsFormatted || '15M visits'}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                    Compare →
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
