import React from 'react';
import { ActiveTab, UserAccount } from '../types';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
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
  PlusCircle
} from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenSearch: () => void;
  onOpenSuggestTool?: () => void;
  onOpenMatcher?: () => void;
  onOpenBookmarks?: () => void;
  bookmarkCount?: number;
  user?: UserAccount | null;
  onOpenAuth?: () => void;
  onOpenUserAccount?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSearch,
  onOpenSuggestTool,
}) => {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="max-w-[1440px] mx-auto h-20 px-4 sm:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <Logo
          size="md"
          showText={true}
          onClick={() => setActiveTab('directory')}
        />

        {/* Primary Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {/* Directory */}
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'directory'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-100/80 dark:border-indigo-900/60'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
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
                ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-100/80 dark:border-indigo-900/60'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
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
                ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-100/80 dark:border-indigo-900/60'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
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
                ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-100/80 dark:border-indigo-900/60'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
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
                ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-100/80 dark:border-indigo-900/60'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
            }`}
          >
            <Terminal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Prompts</span>
          </button>

          {/* Categories */}
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'categories'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-100/80 dark:border-indigo-900/60'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
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
                ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-100/80 dark:border-indigo-900/60'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>News & Guides</span>
          </button>
        </nav>

        {/* Right Side Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Suggest a Tool Button */}
          {onOpenSuggestTool && (
            <button
              onClick={onOpenSuggestTool}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer shadow-xs"
              title="Suggest a new AI Tool to be added to the directory"
            >
              <PlusCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Suggest Tool</span>
            </button>
          )}

          {/* Global Theme Toggle Button */}
          <ThemeToggle />

          {/* Quick Search Button */}
          <button
            onClick={onOpenSearch}
            aria-label="Search"
            className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700/90 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs"
            title="Search AI Tools, Rankings & Deals"
          >
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-400" />
            <span className="text-xs font-semibold hidden sm:inline">Search</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-400 dark:text-slate-400">
              ⌘K
            </kbd>
          </button>
        </div>
      </div>

      {/* Mobile Secondary Scrollable Nav Bar */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto px-4 py-2.5 bg-slate-50/90 dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800 scrollbar-none transition-colors duration-200">
        {onOpenSuggestTool && (
          <button
            onClick={onOpenSuggestTool}
            className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0"
          >
            <PlusCircle className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span>Suggest</span>
          </button>
        )}
        <button
          onClick={() => setActiveTab('directory')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
            activeTab === 'directory' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Tools
        </button>
        <button
          onClick={() => setActiveTab('rankings')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1 ${
            activeTab === 'rankings' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Flame className="w-3 h-3 text-orange-500" />
          <span>Rankings</span>
        </button>
        <button
          onClick={() => setActiveTab('compare')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
            activeTab === 'compare' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Compare
        </button>
        <button
          onClick={() => setActiveTab('deals')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1 ${
            activeTab === 'deals' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Tag className="w-3 h-3 text-emerald-600" />
          <span>Deals</span>
        </button>
        <button
          onClick={() => setActiveTab('prompts')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
            activeTab === 'prompts' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Prompts
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
            activeTab === 'categories' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveTab('blog')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
            activeTab === 'blog' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
          }`}
        >
          News
        </button>
      </div>
    </header>
  );
};
