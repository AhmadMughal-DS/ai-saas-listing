import React from 'react';
import { ActiveTab } from '../types';
import { 
  Sparkles, 
  Search, 
  Flame, 
  GitCompare, 
  Tag, 
  Terminal, 
  Grid, 
  BookOpen, 
  Layers,
  Bookmark,
  Bot
} from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenSearch: () => void;
  onOpenMatcher: () => void;
  onOpenBookmarks: () => void;
  bookmarkCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSearch,
  onOpenMatcher,
  onOpenBookmarks,
  bookmarkCount,
}) => {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-xs">
      <div className="max-w-[1440px] mx-auto h-20 px-4 sm:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => setActiveTab('directory')}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
        >
          <div className="relative flex items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-xs group-hover:border-indigo-300 transition-all">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 leading-none">
              AIFlux
            </span>
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-0.5 hidden sm:inline">
              Intelligence Directory & Metrics
            </span>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {/* Directory */}
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'directory'
                ? 'text-indigo-600 font-bold bg-indigo-50/80 border border-indigo-100/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>AI Tools</span>
          </button>

          {/* Rankings (Toolify Competitor) */}
          <button
            onClick={() => setActiveTab('rankings')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'rankings'
                ? 'text-indigo-600 font-bold bg-indigo-50/80 border border-indigo-100/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Flame className="w-4 h-4 text-orange-500" />
            <span>Rankings</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-orange-100 text-orange-700">
              HOT
            </span>
          </button>

          {/* Compare Matrix */}
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'compare'
                ? 'text-indigo-600 font-bold bg-indigo-50/80 border border-indigo-100/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            <span>Compare</span>
          </button>

          {/* Deals & Coupons (AIChief Competitor) */}
          <button
            onClick={() => setActiveTab('deals')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'deals'
                ? 'text-indigo-600 font-bold bg-indigo-50/80 border border-indigo-100/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Tag className="w-4 h-4 text-emerald-600" />
            <span>Deals</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-700">
              SAVE
            </span>
          </button>

          {/* Prompts Library (AIChief Competitor) */}
          <button
            onClick={() => setActiveTab('prompts')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'prompts'
                ? 'text-indigo-600 font-bold bg-indigo-50/80 border border-indigo-100/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Terminal className="w-4 h-4 text-indigo-600" />
            <span>Prompts</span>
          </button>

          {/* Categories */}
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'categories'
                ? 'text-indigo-600 font-bold bg-indigo-50/80 border border-indigo-100/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Categories</span>
          </button>

          {/* Blog */}
          <button
            onClick={() => setActiveTab('blog')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'blog'
                ? 'text-indigo-600 font-bold bg-indigo-50/80 border border-indigo-100/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>News & Guides</span>
          </button>

          {/* Admin Database Control */}
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'admin'
                ? 'text-indigo-600 font-bold bg-indigo-50/80 border border-indigo-100/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>Admin</span>
          </button>
        </nav>

        {/* Right Side Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search Button */}
          <button
            onClick={onOpenSearch}
            aria-label="Search"
            className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer shadow-xs"
            title="Search AI Tools, Rankings & Deals"
          >
            <Search className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold hidden md:inline">Search</span>
            <kbd className="hidden xl:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-400">
              ⌘K
            </kbd>
          </button>

          {/* Bookmarks / Saved Stack Button */}
          <button
            onClick={onOpenBookmarks}
            className="relative p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-xs"
            title="Saved AI Stack"
          >
            <Bookmark className={`w-4 h-4 ${bookmarkCount > 0 ? 'fill-indigo-600 text-indigo-600' : ''}`} />
            {bookmarkCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                {bookmarkCount}
              </span>
            )}
          </button>

          {/* AI Matcher Copilot Button */}
          <button
            onClick={onOpenMatcher}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold btn-purple shadow-xs cursor-pointer"
          >
            <Bot className="w-4 h-4 text-indigo-200" />
            <span>Ask AI Matcher</span>
          </button>
        </div>
      </div>

      {/* Mobile Secondary Scrollable Nav Bar */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto px-4 py-2.5 bg-slate-50/90 border-t border-slate-200 scrollbar-none">
        <button
          onClick={() => setActiveTab('directory')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
            activeTab === 'directory' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 bg-white border border-slate-200'
          }`}
        >
          Tools
        </button>
        <button
          onClick={() => setActiveTab('rankings')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1 ${
            activeTab === 'rankings' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 bg-white border border-slate-200'
          }`}
        >
          <Flame className="w-3 h-3 text-orange-500" />
          <span>Rankings</span>
        </button>
        <button
          onClick={() => setActiveTab('compare')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
            activeTab === 'compare' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 bg-white border border-slate-200'
          }`}
        >
          Compare
        </button>
        <button
          onClick={() => setActiveTab('deals')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1 ${
            activeTab === 'deals' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 bg-white border border-slate-200'
          }`}
        >
          <Tag className="w-3 h-3 text-emerald-600" />
          <span>Deals</span>
        </button>
        <button
          onClick={() => setActiveTab('prompts')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
            activeTab === 'prompts' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 bg-white border border-slate-200'
          }`}
        >
          Prompts
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
            activeTab === 'categories' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 bg-white border border-slate-200'
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveTab('blog')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
            activeTab === 'blog' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 bg-white border border-slate-200'
          }`}
        >
          News
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
            activeTab === 'admin' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 bg-white border border-slate-200'
          }`}
        >
          Admin
        </button>
      </div>
    </header>
  );
};
