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

  const [activeTab, setActiveTab] = useState<ActiveTab>('directory');
  const [selectedTool, setSelectedTool] = useState<AITool | null>(null);
  const [videoPreviewTool, setVideoPreviewTool] = useState<AITool | null>(null);
  const [isMatcherOpen, setIsMatcherOpen] = useState<boolean>(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);

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

  // Scroll to top on tab change
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
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

      {/* Global Clean Minimal Footer */}
      <Footer onNavigate={handleTabChange} />
    </div>
  );
};

export default App;
