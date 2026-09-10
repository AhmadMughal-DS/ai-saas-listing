import React from 'react';
import { Flame, Tag, Terminal, GitCompare, Lock } from 'lucide-react';
import { ActiveTab } from '../types';
import { Logo } from './Logo';

interface FooterProps {
  onNavigate: (tab: ActiveTab) => void;
  onOpenSuggestTool?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenSuggestTool }) => {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 w-full py-16 px-4 sm:px-8 mt-auto relative z-10 transition-colors duration-200">
      <div className="max-w-[1440px] mx-auto flex flex-col items-center gap-8">
        {/* Brand */}
        <Logo
          size="md"
          showText={true}
          onClick={() => onNavigate('directory')}
        />

        {/* Navigation Links */}
        <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-sm text-slate-600 dark:text-slate-300 font-semibold">
          <button
            onClick={() => onNavigate('directory')}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
          >
            AI Tools Directory
          </button>
          {onOpenSuggestTool && (
            <button
              onClick={onOpenSuggestTool}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer font-bold"
            >
              + Suggest a Tool
            </button>
          )}
          <button
            onClick={() => onNavigate('rankings')}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span>Traffic Rankings</span>
          </button>
          <button
            onClick={() => onNavigate('compare')}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Compare Matrix</span>
          </button>
          <button
            onClick={() => onNavigate('deals')}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Tag className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exclusive Deals</span>
          </button>
          <button
            onClick={() => onNavigate('prompts')}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Prompt Library</span>
          </button>
          <button
            onClick={() => onNavigate('categories')}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
          >
            Categories
          </button>
          <button
            onClick={() => onNavigate('blog')}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
          >
            AI News & Guides
          </button>
        </div>

        {/* Secondary Info & Copyright */}
        <div className="text-xs text-slate-400 dark:text-slate-500 text-center space-y-2">
          <p>© {new Date().getFullYear()} ToolverAI Intelligence Directory (toolverai.com). Real-time web traffic, model comparisons, and verified coupons.</p>
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 dark:text-slate-500">
            <span>Benchmarked against global search velocity & developer usage statistics.</span>
            <span>•</span>
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-slate-400 dark:text-slate-500"
              title="Search Engine Dynamic XML Sitemap"
            >
              XML Sitemap
            </a>
            <span>•</span>
            <button
              onClick={() => onNavigate('admin')}
              className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer flex items-center gap-1 text-slate-400 dark:text-slate-500"
              title="Restricted Administrator Area"
            >
              <Lock className="w-3 h-3" />
              <span>Admin Login</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
