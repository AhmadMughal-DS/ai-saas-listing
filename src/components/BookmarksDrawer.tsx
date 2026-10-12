import React from 'react';
import { AITool, ActiveTab } from '../types';
import { Bookmark, X, Trash2, ExternalLink, ArrowRight, Sparkles, Share2 } from 'lucide-react';

interface BookmarksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarkedIds: string[];
  tools: AITool[];
  onSelectTool: (tool: AITool) => void;
  onRemoveBookmark: (toolId: string) => void;
  onClearAll: () => void;
  onNavigate: (tab: ActiveTab) => void;
}

export const BookmarksDrawer: React.FC<BookmarksDrawerProps> = ({
  isOpen,
  onClose,
  bookmarkedIds,
  tools,
  onSelectTool,
  onRemoveBookmark,
  onClearAll,
  onNavigate,
}) => {
  if (!isOpen) return null;

  const bookmarkedTools = tools.filter((t) => bookmarkedIds.includes(t.id));

  const handleExportStack = () => {
    const jsonStr = JSON.stringify(
      bookmarkedTools.map((t) => ({
        name: t.name,
        category: t.category,
        url: t.url,
        pricing: t.pricingType,
        monthlyVisits: t.monthlyVisitsFormatted,
      })),
      null,
      2
    );
    navigator.clipboard.writeText(jsonStr);
    alert('AI Stack copied to clipboard as JSON!');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 animate-slide-left">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Bookmark className="w-4 h-4 fill-indigo-600 dark:fill-indigo-400" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-slate-900 dark:text-white text-lg">
                My Saved AI Stack
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {bookmarkedTools.length} tools bookmarked
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {bookmarkedTools.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Bookmark className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-slate-800 dark:text-slate-200 text-base">
                Your AI Stack is empty
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                Click the bookmark icon on any AI tool in the directory to save it here for quick access and stack export.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onNavigate('directory');
                }}
                className="mt-2 px-4 py-2 rounded-xl btn-purple text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Browse Directory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            bookmarkedTools.map((tool) => (
              <div
                key={tool.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all flex items-center justify-between gap-3 group"
              >
                <div
                  className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  onClick={() => {
                    onSelectTool(tool);
                    onClose();
                  }}
                >
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
                    <img
                      src={tool.logoUrl}
                      alt={tool.name}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-heading font-bold text-slate-900 dark:text-white text-sm truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {tool.name}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.2 rounded border border-indigo-200/60 dark:border-indigo-800/60">
                        {tool.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                      {tool.monthlyVisitsFormatted} visits • {tool.pricingType}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => onRemoveBookmark(tool.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title="Remove from stack"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        {bookmarkedTools.length > 0 && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-2">
            <button
              onClick={handleExportStack}
              className="w-full py-2.5 rounded-xl btn-purple text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Export AI Stack JSON</span>
            </button>
            <button
              onClick={onClearAll}
              className="w-full py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
            >
              Clear Stack
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
