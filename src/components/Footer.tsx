import React from 'react';
import { Sparkles, Flame, Tag, Terminal, GitCompare } from 'lucide-react';
import { ActiveTab } from '../types';

interface FooterProps {
  onNavigate: (tab: ActiveTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-white border-t border-slate-200 w-full py-16 px-4 sm:px-8 mt-auto relative z-10">
      <div className="max-w-[1440px] mx-auto flex flex-col items-center gap-8">
        {/* Brand */}
        <div
          onClick={() => onNavigate('directory')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center group-hover:border-indigo-300 transition-colors">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
          <span className="font-heading text-2xl font-extrabold text-slate-900 tracking-tight">
            AIFlux
          </span>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-sm text-slate-600 font-semibold">
          <button
            onClick={() => onNavigate('directory')}
            className="hover:text-indigo-600 transition-colors cursor-pointer"
          >
            AI Tools Directory
          </button>
          <button
            onClick={() => onNavigate('rankings')}
            className="hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span>Traffic Rankings</span>
          </button>
          <button
            onClick={() => onNavigate('compare')}
            className="hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Compare Matrix</span>
          </button>
          <button
            onClick={() => onNavigate('deals')}
            className="hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Tag className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exclusive Deals</span>
          </button>
          <button
            onClick={() => onNavigate('prompts')}
            className="hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Prompt Library</span>
          </button>
          <button
            onClick={() => onNavigate('categories')}
            className="hover:text-indigo-600 transition-colors cursor-pointer"
          >
            Categories
          </button>
          <button
            onClick={() => onNavigate('blog')}
            className="hover:text-indigo-600 transition-colors cursor-pointer"
          >
            AI News & Guides
          </button>
          <button
            onClick={() => onNavigate('admin')}
            className="hover:text-indigo-600 transition-colors cursor-pointer text-indigo-600 font-bold"
          >
            MongoDB Admin Portal
          </button>
        </div>

        {/* Secondary Info & Copyright */}
        <div className="text-xs text-slate-400 text-center space-y-1">
          <p>© {new Date().getFullYear()} AIFlux Intelligence Directory. Real-time web traffic, model comparisons, and verified coupons.</p>
          <p className="text-[11px] text-slate-400">Benchmarked against global search velocity & developer usage statistics.</p>
        </div>
      </div>
    </footer>
  );
};
