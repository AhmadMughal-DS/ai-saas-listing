import React, { useState, useMemo } from 'react';
import { AIPrompt, ActiveTab } from '../types';
import { INITIAL_PROMPTS } from '../data/initialData';
import { 
  Sparkles, 
  Terminal, 
  Copy, 
  Check, 
  Search, 
  ThumbsUp, 
  Bot, 
  Code, 
  Palette, 
  Briefcase, 
  SlidersHorizontal,
  ArrowRight,
  Flame,
  Layers,
  Wand2,
  Cpu
} from 'lucide-react';

interface PromptsViewProps {
  onNavigate: (tab: ActiveTab) => void;
}

export const PromptsView: React.FC<PromptsViewProps> = ({ onNavigate }) => {
  const [prompts, setPrompts] = useState<AIPrompt[]>(INITIAL_PROMPTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedModel, setSelectedModel] = useState<string>('All');
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());

  // Interactive AI Optimizer State
  const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [targetEngine, setTargetEngine] = useState('Claude 3.7 / 3.5');
  const [taskCategory, setTaskCategory] = useState('Coding & Architecture');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedResult, setOptimizedResult] = useState<{
    prompt: string;
    tips: string[];
  } | null>(null);
  const [copiedOptimized, setCopiedOptimized] = useState(false);

  const categories = [
    'All',
    'Coding & Architecture',
    'Marketing & SEO',
    'Midjourney & Image',
    'Productivity & Work',
    'Business & Growth',
  ];

  const models = [
    'All',
    'ChatGPT / GPT-4o',
    'Claude 3.7 / 3.5',
    'Midjourney v6',
    'Cursor AI',
    'Universal AI',
  ];

  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchModel = selectedModel === 'All' || p.targetModel === selectedModel;
      const matchSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.promptText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchModel && matchSearch;
    });
  }, [prompts, selectedCategory, selectedModel, searchQuery]);

  const handleCopyPrompt = (prompt: AIPrompt) => {
    navigator.clipboard.writeText(prompt.promptText);
    setCopiedPromptId(prompt.id);
    setTimeout(() => {
      setCopiedPromptId(null);
    }, 2500);
  };

  const handleCopyCustomPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOptimized(true);
    setTimeout(() => {
      setCopiedOptimized(false);
    }, 2500);
  };

  const handleToggleUpvote = (promptId: string) => {
    const isUpvoted = upvotedIds.has(promptId);
    setUpvotedIds((prev) => {
      const next = new Set(prev);
      if (isUpvoted) {
        next.delete(promptId);
      } else {
        next.add(promptId);
      }
      return next;
    });

    setPrompts((prev) =>
      prev.map((p) => {
        if (p.id === promptId) {
          return {
            ...p,
            upvotes: isUpvoted ? p.upvotes - 1 : p.upvotes + 1,
          };
        }
        return p;
      })
    );
  };

  const handleOptimizePrompt = async () => {
    if (!rawInput.trim()) return;
    setIsOptimizing(true);
    try {
      const res = await fetch('/api/ai/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawPrompt: rawInput,
          targetModel: targetEngine,
          taskType: taskCategory,
        }),
      });

      const data = await res.json();
      setOptimizedResult({
        prompt: data.optimizedPrompt || rawInput,
        tips: data.tips || ['Structured for maximum context clarity and zero hallucinations.'],
      });
    } catch (err) {
      console.error(err);
      setOptimizedResult({
        prompt: `### SYSTEM CONTEXT & OBJECTIVE\nYou are a seasoned expert in ${taskCategory}.\n\n### INSTRUCTIONS\n${rawInput}\n\n### CONSTRAINTS\n- Provide direct, production-grade output.\n- Structure response with clear headings.\n- Omit conversational filler.`,
        tips: ['Role-priming applied to calibrate tone and depth.', 'Constraints injected to prevent superficial generic answers.'],
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const getModelBadgeClass = (model: string) => {
    if (model.includes('Claude')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    if (model.includes('ChatGPT') || model.includes('GPT')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (model.includes('Midjourney')) {
      return 'bg-purple-50 text-purple-800 border-purple-200';
    }
    if (model.includes('Cursor')) {
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    }
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <div className="w-full pt-28 pb-24 px-4 sm:px-8 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="text-center max-w-4xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wide mb-4 shadow-xs">
          <Terminal className="w-4 h-4 text-indigo-600" />
          <span>Curated AI Prompt Engineering Index & Generator</span>
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
          Master Prompt Engineering Library
        </h1>
        <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Production-tested, high-performance prompts engineered for Claude 3.7 Sonnet, ChatGPT-4o, Cursor AI, and Midjourney v6.
        </p>

        {/* Global Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs">
          <div className="text-center border-r border-slate-100 dark:border-slate-800 last:border-none">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-heading">500+</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">Curated Prompts</div>
          </div>
          <div className="text-center border-r border-slate-100 dark:border-slate-800 last:border-none">
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 font-heading">1-Click</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">Instant Copy & Run</div>
          </div>
          <div className="text-center border-r border-slate-100 dark:border-slate-800 last:border-none">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-heading">100%</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">Zero Hallucination Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-heading">DeepSeek</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">Prompt Optimizer</div>
          </div>
        </div>
      </div>

      {/* AI Prompt Generator Workshop Accordion */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 mb-10 shadow-lg border border-indigo-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-xl sm:text-2xl tracking-tight text-white">
                AI Prompt Optimizer & Generator
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Transform any raw thought or vague instruction into an elite, structured master prompt.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsOptimizerOpen(!isOptimizerOpen)}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer border border-white/20 shrink-0"
          >
            {isOptimizerOpen ? 'Hide Optimizer' : 'Open Prompt Studio'}
          </button>
        </div>

        {isOptimizerOpen && (
          <div className="space-y-4 pt-4 border-t border-indigo-800/40 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Target AI Model
                </label>
                <select
                  value={targetEngine}
                  onChange={(e) => setTargetEngine(e.target.value)}
                  className="w-full p-3 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-indigo-400 cursor-pointer"
                >
                  <option value="Claude 3.7 / 3.5">Claude 3.7 Sonnet / Opus</option>
                  <option value="ChatGPT / GPT-4o">OpenAI ChatGPT-4o / o3-mini</option>
                  <option value="Cursor AI">Cursor AI / GitHub Copilot</option>
                  <option value="Midjourney v6">Midjourney v6 & Flux.1</option>
                  <option value="DeepSeek-R1">DeepSeek-R1 Reasoning</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Task Category
                </label>
                <select
                  value={taskCategory}
                  onChange={(e) => setTaskCategory(e.target.value)}
                  className="w-full p-3 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-indigo-400 cursor-pointer"
                >
                  <option value="Coding & Architecture">Coding, Refactoring & DevOps</option>
                  <option value="Marketing & SEO">Marketing, Copywriting & Viral Hooks</option>
                  <option value="Midjourney & Image">Photorealistic Visual Prompts & Lighting</option>
                  <option value="Productivity & Work">Summaries, Workflow Automation & Data</option>
                  <option value="Business & Growth">Financial Models & Strategy</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Your Raw Concept / Instruction
              </label>
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="e.g. Write me a script in Python that monitors a folder and auto-organizes downloads by file type with desktop notifications..."
                rows={3}
                className="w-full p-4 bg-slate-800/90 border border-slate-700 rounded-2xl text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 transition-all resize-none"
              />
            </div>

            <button
              onClick={handleOptimizePrompt}
              disabled={isOptimizing || !rawInput.trim()}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {isOptimizing ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Engineering Production Prompt...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Engineer Master Prompt with DeepSeek</span>
                </>
              )}
            </button>

            {/* Optimized Result Display */}
            {optimizedResult && (
              <div className="mt-6 p-6 rounded-2xl bg-slate-950 border border-indigo-500/40 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Engineered Master Prompt
                  </span>
                  <button
                    onClick={() => handleCopyCustomPrompt(optimizedResult.prompt)}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedOptimized ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Output</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre-wrap border border-slate-800 leading-relaxed max-h-60">
                  {optimizedResult.prompt}
                </div>

                <div className="space-y-1 pt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                    Why this outperforms standard prompts:
                  </span>
                  <ul className="text-xs text-slate-300 space-y-1">
                    {optimizedResult.tips.map((t, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 mb-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Target Model Selector */}
          <div className="flex items-center flex-wrap gap-1.5 p-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl w-full sm:w-auto">
            {models.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedModel(m)}
                className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  selectedModel === m
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {m}
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
              placeholder="Search prompts & tasks..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Categories row */}
        <div className="flex items-center flex-wrap gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Topic:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Prompts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPrompts.map((prompt) => {
          const isCopied = copiedPromptId === prompt.id;
          const isUpvoted = upvotedIds.has(prompt.id);

          return (
            <div
              key={prompt.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-xs hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:shadow-md transition-all duration-200"
            >
              <div>
                {/* Header: Model Badge + Difficulty */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold border flex items-center gap-1.5 ${getModelBadgeClass(prompt.targetModel)}`}>
                    <Bot className="w-3.5 h-3.5" />
                    {prompt.targetModel}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {prompt.difficulty}
                  </span>
                </div>

                <h3 className="font-heading font-extrabold text-slate-900 dark:text-white text-lg mb-2 leading-snug">
                  {prompt.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed line-clamp-2">
                  {prompt.description}
                </p>

                {/* Prompt Code Block with Quick Copy Header */}
                <div className="relative rounded-2xl bg-slate-900 text-slate-200 font-mono text-xs mb-4 border border-slate-800 leading-relaxed overflow-hidden group">
                  <div className="flex items-center justify-between px-3.5 py-2 bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5 font-sans font-medium text-slate-400">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      <span>System Prompt</span>
                    </div>
                    <button
                      onClick={() => handleCopyPrompt(prompt)}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md font-sans text-xs font-semibold transition-all cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                      }`}
                      title="Copy to clipboard"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-4 max-h-48 overflow-y-auto">
                    <pre className="whitespace-pre-wrap select-all font-mono">
                      {prompt.promptText}
                    </pre>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {prompt.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Controls Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                {/* Upvote Button */}
                <button
                  onClick={() => handleToggleUpvote(prompt.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isUpvoted
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${isUpvoted ? 'fill-indigo-600 text-indigo-600 dark:fill-indigo-400 dark:text-indigo-400' : ''}`} />
                  <span>{prompt.upvotes.toLocaleString()}</span>
                </button>

                {/* 1-Click Copy to Clipboard Button */}
                <button
                  onClick={() => handleCopyPrompt(prompt)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    isCopied
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'btn-purple'
                  }`}
                  title="Copy prompt text to clipboard"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy to Clipboard</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
