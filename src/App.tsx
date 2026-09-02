import React, { useState, useEffect } from 'react';
import { AITool, ActiveTab, ToolReview } from './types';
import { INITIAL_TOOLS } from './data/initialData';
import { CyberBackground } from './components/CyberBackground';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { DirectoryView } from './components/DirectoryView';
import { ToolDetailView } from './components/ToolDetailView';
import { RankingsView } from './components/RankingsView';
import { CompareView } from './components/CompareView';
import { DealsView } from './components/DealsView';
import { PromptsView } from './components/PromptsView';
import { CategoriesView } from './components/CategoriesView';
import { BlogView } from './components/BlogView';
import { AdminView } from './components/AdminView';
import { VideoPreviewModal } from './components/VideoPreviewModal';
import { AIMatcherModal } from './components/AIMatcherModal';
import { BookmarksDrawer } from './components/BookmarksDrawer';
import { Bot, Sparkles } from 'lucide-react';

// Helper to parse URL path/hash
const getInitialTabFromUrl = (): ActiveTab => {
  if (typeof window === 'undefined') return 'directory';
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  if (path.includes('admin') || hash.includes('admin')) return 'admin';
  if (path.includes('rankings') || hash.includes('rankings')) return 'rankings';
  if (path.includes('compare') || hash.includes('compare')) return 'compare';
  if (path.includes('deals') || hash.includes('deals')) return 'deals';
  if (path.includes('prompts') || hash.includes('prompts')) return 'prompts';
  if (path.includes('categories') || hash.includes('categories')) return 'categories';
  if (path.includes('news') || path.includes('blog') || hash.includes('news') || hash.includes('blog')) return 'blog';
  return 'directory';
};

export const App: React.FC = () => {
  // Tools state initialized from localStorage or initial dataset
  const [tools, setTools] = useState<AITool[]>(() => {
    const saved = localStorage.getItem('aiflux_tools');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_TOOLS;
      }
    }
    return INITIAL_TOOLS;
  });

  // Bookmarked Tool IDs
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('aiflux_bookmarks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>(getInitialTabFromUrl);
  const [selectedTool, setSelectedTool] = useState<AITool | null>(null);
  const [videoPreviewTool, setVideoPreviewTool] = useState<AITool | null>(null);
  const [isMatcherOpen, setIsMatcherOpen] = useState<boolean>(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);

  // Sync URL changes and popstate (browser back/forward & direct links)
  useEffect(() => {
    const handleLocationChange = () => {
      const tab = getInitialTabFromUrl();
      setActiveTab(tab);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Fetch latest tools from MongoDB API on load
  const fetchApiTools = async () => {
    try {
      const res = await fetch('/api/tools');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setTools(data);
        }
      }
    } catch (e) {
      console.warn('Using local tools dataset:', e);
    }
  };

  useEffect(() => {
    fetchApiTools();
  }, []);

  // Sync tools to localStorage
  useEffect(() => {
    localStorage.setItem('aiflux_tools', JSON.stringify(tools));
  }, [tools]);

  // Sync bookmarks to localStorage
  useEffect(() => {
    localStorage.setItem('aiflux_bookmarks', JSON.stringify(bookmarkedIds));
  }, [bookmarkedIds]);

  const handleToolAdded = (newTool: AITool) => {
    setTools((prev) => [newTool, ...prev.filter((t) => t.id !== newTool.id)]);
  };

  const handleToolUpdated = (updatedTool: AITool) => {
    setTools((prev) => prev.map((t) => (t.id === updatedTool.id ? { ...t, ...updatedTool } : t)));
    if (selectedTool?.id === updatedTool.id) {
      setSelectedTool(updatedTool);
    }
  };

  const handleToolDeleted = (toolId: string) => {
    setTools((prev) => prev.filter((t) => t.id !== toolId));
    if (selectedTool?.id === toolId) {
      setSelectedTool(null);
      setActiveTab('directory');
    }
  };

  // Scroll to top on tab change & update URL pathname
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    try {
      const targetPath = tab === 'directory' ? '/' : `/${tab}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ tab }, '', targetPath);
      }
    } catch (e) {
      // Fallback for sandboxed iframes
      try {
        window.location.hash = `#${tab}`;
      } catch (err) {
        // ignore
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectTool = (tool: AITool) => {
    setSelectedTool(tool);
    setActiveTab('tool-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleBookmark = (toolId: string) => {
    setBookmarkedIds((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
    );
  };

  const handleClearBookmarks = () => {
    setBookmarkedIds([]);
  };

  const handleAddReview = (toolId: string, review: ToolReview) => {
    setTools((prev) =>
      prev.map((t) => {
        if (t.id === toolId) {
          const updatedReviews = [review, ...t.reviews];
          const avgRating =
            updatedReviews.reduce((sum, r) => sum + r.rating, 0) /
            updatedReviews.length;
          const updatedTool = {
            ...t,
            reviews: updatedReviews,
            reviewCount: updatedReviews.length,
            rating: parseFloat(avgRating.toFixed(1)),
          };
          if (selectedTool?.id === toolId) {
            setSelectedTool(updatedTool);
          }
          return updatedTool;
        }
        return t;
      })
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 relative overflow-x-hidden selection:bg-indigo-600 selection:text-white font-sans">
      {/* Dynamic Cyber Background & WebGL Torus Sculpture on Directory */}
      <CyberBackground showHeroSculpture={activeTab === 'directory'} />

      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenSearch={() => {
          handleTabChange('directory');
          setTimeout(() => {
            const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
            searchInput?.focus();
          }, 50);
        }}
        onOpenMatcher={() => setIsMatcherOpen(true)}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
        bookmarkCount={bookmarkedIds.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col">
        {activeTab === 'directory' && (
          <DirectoryView
            tools={tools}
            onSelectTool={handleSelectTool}
            onOpenVideoPreview={(tool) => setVideoPreviewTool(tool)}
            onNavigate={handleTabChange}
            onOpenSubmit={() => setIsMatcherOpen(true)}
          />
        )}

        {activeTab === 'rankings' && (
          <RankingsView
            tools={tools}
            onSelectTool={handleSelectTool}
            onNavigate={handleTabChange}
          />
        )}

        {activeTab === 'compare' && (
          <CompareView
            tools={tools}
            onSelectTool={handleSelectTool}
            onNavigate={handleTabChange}
          />
        )}

        {activeTab === 'deals' && (
          <DealsView
            tools={tools}
            onSelectTool={handleSelectTool}
            onNavigate={handleTabChange}
          />
        )}

        {activeTab === 'prompts' && (
          <PromptsView onNavigate={handleTabChange} />
        )}

        {activeTab === 'categories' && (
          <CategoriesView
            tools={tools}
            onSelectCategory={() => {
              handleTabChange('directory');
            }}
          />
        )}

        {activeTab === 'blog' && <BlogView />}

        {activeTab === 'admin' && (
          <AdminView
            tools={tools}
            onToolAdded={handleToolAdded}
            onToolUpdated={handleToolUpdated}
            onToolDeleted={handleToolDeleted}
            onSelectTool={handleSelectTool}
            onNavigate={handleTabChange}
            onRefreshTools={fetchApiTools}
          />
        )}

        {activeTab === 'tool-detail' && selectedTool && (
          <ToolDetailView
            tool={selectedTool}
            allTools={tools}
            user={null}
            onBack={() => handleTabChange('directory')}
            onSelectTool={handleSelectTool}
            onSubscribePlan={() => {
              window.open(selectedTool.url, '_blank', 'noopener,noreferrer');
            }}
            onAddReview={handleAddReview}
          />
        )}
      </main>

      {/* AI Matcher Modal */}
      <AIMatcherModal
        isOpen={isMatcherOpen}
        onClose={() => setIsMatcherOpen(false)}
        tools={tools}
        onSelectTool={handleSelectTool}
        onNavigate={handleTabChange}
      />

      {/* Bookmarks / Saved Stack Drawer */}
      <BookmarksDrawer
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        bookmarkedIds={bookmarkedIds}
        tools={tools}
        onSelectTool={handleSelectTool}
        onRemoveBookmark={handleToggleBookmark}
        onClearAll={handleClearBookmarks}
        onNavigate={handleTabChange}
      />

      {/* Video Demo Modal */}
      <VideoPreviewModal
        tool={videoPreviewTool}
        isOpen={!!videoPreviewTool}
        onClose={() => setVideoPreviewTool(null)}
        onSelectTool={handleSelectTool}
      />

      {/* Floating Ask AI Matcher Copilot Widget (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsMatcherOpen(true)}
          className="group relative flex items-center gap-3 px-4 sm:px-5 py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-indigo-500/30 border border-white/20 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
          title="Ask AI Matcher - Find the perfect AI tool for your exact stack"
        >
          {/* Animated Glow / Ping Indicator */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
          </span>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-extrabold tracking-tight">
                  Ask AI Matcher
                </span>
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              </div>
              <span className="text-[10px] text-indigo-100 font-medium hidden sm:inline leading-none">
                AI Tool Recommendation Engine
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* Global Clean Minimal Footer */}
      <Footer onNavigate={handleTabChange} />
    </div>
  );
};

export default App;
