import React, { useState, useEffect } from 'react';
import { AITool, ActiveTab, ToolReview, UserAccount } from './types';
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
import { AuthModal } from './components/AuthModal';
import { UserAccountModal } from './components/UserAccountModal';
import { SuggestToolModal } from './components/SuggestToolModal';
import { SEOManager } from './components/SEOManager';
import { JoinNewsletter } from './components/JoinNewsletter';
import { Bot, Sparkles } from 'lucide-react';

// Helper to extract tool identifier from path or hash (e.g. /tool/cursor-ai or #tool-cursor)
const getToolIdentifierFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname;
  const match = path.match(/\/tool\/([^/?#]+)/i);
  if (match && match[1]) return decodeURIComponent(match[1]);
  const hash = window.location.hash;
  const hashMatch = hash.match(/#\/?tool[-/]([^/?#]+)/i);
  if (hashMatch && hashMatch[1]) return decodeURIComponent(hashMatch[1]);
  return null;
};

// Helper to parse URL path/hash
const getInitialTabFromUrl = (): ActiveTab => {
  if (typeof window === 'undefined') return 'directory';
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  if (path.includes('/tool/') || hash.includes('tool-') || hash.includes('tool/')) return 'tool-detail';
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
  // Tools state initialized solely from MongoDB Atlas API (No localStorage caching for tools)
  const [tools, setTools] = useState<AITool[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState<boolean>(true);

  // Bookmarked Tool IDs
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('toolverai_bookmarks') || localStorage.getItem('aiflux_bookmarks');
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
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('toolverai_user') || localStorage.getItem('aiflux_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isAccountOpen, setIsAccountOpen] = useState<boolean>(false);
  const [isSuggestOpen, setIsSuggestOpen] = useState<boolean>(false);

  // Clear any residual tools from localStorage to ensure 100% pure MongoDB usage
  useEffect(() => {
    try {
      localStorage.removeItem('toolverai_tools');
      localStorage.removeItem('aiflux_tools');
    } catch {
      // ignore
    }
  }, []);

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

  // Fetch tools directly from MongoDB Atlas backend API
  const fetchApiTools = async () => {
    setIsLoadingTools(true);
    try {
      const res = await fetch('/api/tools');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTools(data);

          // Restore tool detail from URL if direct link visited
          const toolParam = getToolIdentifierFromUrl();
          if (toolParam) {
            const matched = data.find(
              (t: AITool) =>
                t.slug?.toLowerCase() === toolParam.toLowerCase() ||
                t.id.toLowerCase() === toolParam.toLowerCase() ||
                t.name.toLowerCase().replace(/[^a-z0-9]/g, '-') === toolParam.toLowerCase()
            );
            if (matched) {
              setSelectedTool(matched);
              setActiveTab('tool-detail');
            }
          }
        }
      }
    } catch (e) {
      console.error('Error fetching tools from MongoDB Atlas API:', e);
    } finally {
      setIsLoadingTools(false);
    }
  };

  useEffect(() => {
    fetchApiTools();
  }, []);

  // Sync bookmarks to localStorage
  useEffect(() => {
    localStorage.setItem('toolverai_bookmarks', JSON.stringify(bookmarkedIds));
    localStorage.setItem('aiflux_bookmarks', JSON.stringify(bookmarkedIds));
  }, [bookmarkedIds]);

  // Sync user to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('toolverai_user', JSON.stringify(currentUser));
      localStorage.setItem('aiflux_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('toolverai_user');
      localStorage.removeItem('aiflux_user');
    }
  }, [currentUser]);

  const handleToolAdded = async (newTool: AITool) => {
    setTools((prev) => [newTool, ...prev.filter((t) => t.id !== newTool.id)]);
    try {
      await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTool),
      });
    } catch (err) {
      console.error('Failed to store tool in MongoDB:', err);
    }
  };

  const handleToolUpdated = async (updatedTool: AITool) => {
    setTools((prev) => prev.map((t) => (t.id === updatedTool.id ? { ...t, ...updatedTool } : t)));
    if (selectedTool?.id === updatedTool.id) {
      setSelectedTool(updatedTool);
    }
    try {
      await fetch(`/api/tools/${updatedTool.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTool),
      });
    } catch (err) {
      console.error('Failed to update tool in MongoDB:', err);
    }
  };

  const handleToolDeleted = async (toolId: string) => {
    setTools((prev) => prev.filter((t) => t.id !== toolId));
    if (selectedTool?.id === toolId) {
      setSelectedTool(null);
      setActiveTab('directory');
    }
    try {
      await fetch(`/api/tools/${toolId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete tool from MongoDB:', err);
    }
  };

  // Scroll to top on tab change & update URL pathname
  const handleTabChange = (tab: ActiveTab) => {
    if (tab !== 'tool-detail') {
      setSelectedTool(null);
    }
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
    try {
      const toolSlug = tool.slug || tool.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const targetPath = `/tool/${toolSlug}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ tab: 'tool-detail', toolId: tool.id }, '', targetPath);
      }
    } catch (e) {
      try {
        window.location.hash = `#tool-${tool.slug || tool.id}`;
      } catch (err) {
        // ignore
      }
    }
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

  const handleAddReview = async (toolId: string, review: ToolReview) => {
    let updatedTargetTool: AITool | null = null;
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
          updatedTargetTool = updatedTool;
          if (selectedTool?.id === toolId) {
            setSelectedTool(updatedTool);
          }
          return updatedTool;
        }
        return t;
      })
    );

    if (updatedTargetTool) {
      try {
        await fetch(`/api/tools/${toolId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedTargetTool),
        });
      } catch (err) {
        console.error('Failed to persist review to MongoDB:', err);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-base,#F8FAFC)] text-[var(--color-text-main,#0F172A)] dark:bg-[#090D16] dark:text-slate-100 relative overflow-x-hidden selection:bg-indigo-600 selection:text-white font-sans transition-colors duration-200">
      {/* Dynamic SEO Meta Tag Manager */}
      <SEOManager activeTab={activeTab} selectedTool={selectedTool} />

      {/* Dynamic Cyber Background */}
      <CyberBackground />

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
        onOpenSuggestTool={() => setIsSuggestOpen(true)}
        onOpenMatcher={() => setIsMatcherOpen(true)}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
        bookmarkCount={bookmarkedIds.length}
        user={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenUserAccount={() => setIsAccountOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col">
        {activeTab === 'directory' && (
          <DirectoryView
            tools={tools}
            isLoading={isLoadingTools}
            onSelectTool={handleSelectTool}
            onOpenVideoPreview={(tool) => setVideoPreviewTool(tool)}
            onNavigate={handleTabChange}
            onOpenSubmit={() => setIsSuggestOpen(true)}
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
            user={currentUser}
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthOpen(false);
        }}
      />

      {/* User Account Modal */}
      {currentUser && (
        <UserAccountModal
          isOpen={isAccountOpen}
          onClose={() => setIsAccountOpen(false)}
          user={currentUser}
          allTools={tools}
          onLogout={() => {
            setCurrentUser(null);
            setIsAccountOpen(false);
          }}
          onUpgradePlan={() => {
            setIsAccountOpen(false);
            handleTabChange('deals');
          }}
          onCancelSubscription={() => {
            setCurrentUser((prev) =>
              prev ? { ...prev, subscription: undefined } : null
            );
          }}
          onSelectTool={handleSelectTool}
          onOpenSubmitTool={() => {
            setIsAccountOpen(false);
            setIsSuggestOpen(true);
          }}
        />
      )}

      {/* Suggest a Tool Modal */}
      <SuggestToolModal
        isOpen={isSuggestOpen}
        onClose={() => setIsSuggestOpen(false)}
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

      {/* Join Newsletter Lead Capture Component */}
      {activeTab !== 'admin' && (
        <JoinNewsletter source={`page_${activeTab}`} />
      )}

      {/* Global Clean Minimal Footer */}
      <Footer onNavigate={handleTabChange} onOpenSuggestTool={() => setIsSuggestOpen(true)} />
    </div>
  );
};

export default App;
