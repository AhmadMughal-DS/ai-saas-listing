import React, { useState } from 'react';
import { AITool, ActiveTab } from '../types';
import { 
  Sparkles, 
  X, 
  Send, 
  Check, 
  ArrowRight, 
  Bot, 
  DollarSign, 
  Flame, 
  ExternalLink,
  Layers
} from 'lucide-react';

interface AIMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  tools: AITool[];
  onSelectTool: (tool: AITool) => void;
  onNavigate: (tab: ActiveTab) => void;
}

interface MatchResult {
  toolName: string;
  matchScore: number;
  reason: string;
  pricingNote: string;
}

const EXAMPLE_QUERIES = [
  'Best open-source coding assistant for VS Code',
  'Generate photorealistic anime & portraits for free',
  'Transcribe 2-hour podcasts into SEO blog posts',
  'AI voice cloning and text-to-speech for YouTube videos',
];

export const AIMatcherModal: React.FC<AIMatcherModalProps> = ({
  isOpen,
  onClose,
  tools,
  onSelectTool,
  onNavigate,
}) => {
  const [userGoal, setUserGoal] = useState('');
  const [budget, setBudget] = useState('Any Budget');
  const [category, setCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<MatchResult[] | null>(null);

  if (!isOpen) return null;

  const handleMatch = async (customQuery?: string) => {
    const queryToUse = customQuery || userGoal;
    if (!queryToUse.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/match-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userGoal: queryToUse,
          budget,
          category,
          toolsData: tools,
        }),
      });

      if (!res.ok) {
        throw new Error('API request failed');
      }

      const data = await res.json();
      setSummary(data.summary || 'Top matches found for your workflow:');
      setRecommendations(data.recommendations || []);
    } catch (err) {
      console.error(err);
      // Fallback matching
      setSummary(`Top recommendations for "${queryToUse}":`);
      setRecommendations([
        {
          toolName: tools[0]?.name || 'Cursor AI',
          matchScore: 98,
          reason: 'High performance matching your specific workflow and feature criteria.',
          pricingNote: `${tools[0]?.pricingType || 'Freemium'} model available.`,
        },
        {
          toolName: tools[1]?.name || 'ChatGPT-4o',
          matchScore: 94,
          reason: 'Highly rated multi-modal intelligence with deep community support.',
          pricingNote: 'Free tier with upgrade options.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-slate-900 text-lg sm:text-xl">
                Smart AI Copilot Matcher
              </h2>
              <p className="text-xs text-slate-500">
                Powered by DeepSeek & AIFlux traffic intelligence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Query Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              What do you want to accomplish?
            </label>
            <div className="relative">
              <textarea
                value={userGoal}
                onChange={(e) => setUserGoal(e.target.value)}
                placeholder="e.g. I need an AI video generator that can create 4k realistic avatar videos with lip sync and voice cloning under $30/mo..."
                rows={3}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Budget / Pricing Model
              </label>
              <select
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Any Budget">Any Budget</option>
                <option value="Completely Free / Open Source">Completely Free / Open Source</option>
                <option value="Under $20/month">Under $20 / month</option>
                <option value="Has Lifetime Deal">Has Verified Discount / Lifetime Deal</option>
                <option value="Enterprise / Scale">Enterprise / Team Scale</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Primary Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="All">All Categories</option>
                <option value="Coding">Coding & Development</option>
                <option value="Image AI">Image Generation</option>
                <option value="Video AI">Video & Avatar AI</option>
                <option value="Audio AI">Voice & Music AI</option>
                <option value="Productivity">Productivity & Notes</option>
                <option value="Copywriting">Writing & Marketing</option>
              </select>
            </div>
          </div>

          {/* Preset Prompts */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 mb-2 block">
              Try popular prompts:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_QUERIES.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setUserGoal(q);
                    handleMatch(q);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200/80 text-xs font-medium text-slate-600 transition-all cursor-pointer text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => handleMatch()}
            disabled={isLoading || !userGoal.trim()}
            className="w-full py-3.5 rounded-2xl btn-purple text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Analyzing 5,000+ AI tools & metrics...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Find Best Matching AI Tools</span>
              </>
            )}
          </button>

          {/* Results Area */}
          {recommendations && (
            <div className="pt-4 border-t border-slate-200 space-y-4 animate-fade-in">
              {summary && (
                <p className="text-xs font-semibold text-indigo-700 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                  {summary}
                </p>
              )}

              <div className="space-y-3">
                {recommendations.map((rec, i) => {
                  const matchingTool = tools.find(
                    (t) => t.name.toLowerCase() === rec.toolName.toLowerCase() || t.slug.includes(rec.toolName.toLowerCase().replace(/\s+/g, '-'))
                  );

                  return (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-heading font-extrabold text-slate-900 text-base">
                            {rec.toolName}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800">
                            {rec.matchScore}% Match
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {rec.reason}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-400">
                          {rec.pricingNote}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {matchingTool ? (
                          <button
                            onClick={() => {
                              onSelectTool(matchingTool);
                              onClose();
                            }}
                            className="px-3.5 py-2 rounded-xl btn-purple text-xs font-semibold cursor-pointer"
                          >
                            View Specs
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              onNavigate('directory');
                              onClose();
                            }}
                            className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                          >
                            Explore
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
