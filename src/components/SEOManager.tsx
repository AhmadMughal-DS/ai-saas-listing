import React, { useEffect, useState } from 'react';
import { ActiveTab, AITool } from '../types';
import { generateSEOData, applySEOMetaTags, SEOData } from '../utils/seo';
import { Globe, Copy, Check, Eye, X, Code, Share2, Sparkles, Search, CheckCircle2 } from 'lucide-react';

interface SEOManagerProps {
  activeTab: ActiveTab;
  selectedTool: AITool | null;
  showFloatingInspectorButton?: boolean;
}

export const SEOManager: React.FC<SEOManagerProps> = ({
  activeTab,
  selectedTool,
  showFloatingInspectorButton = true,
}) => {
  const [currentSEO, setCurrentSEO] = useState<SEOData>(() => generateSEOData(activeTab, selectedTool));
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTabPreview, setActiveTabPreview] = useState<'google' | 'social' | 'schema'>('google');

  // Reactively apply SEO updates to <head> whenever activeTab or selectedTool changes
  useEffect(() => {
    const seo = generateSEOData(activeTab, selectedTool);
    setCurrentSEO(seo);
    applySEOMetaTags(seo);
  }, [activeTab, selectedTool]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const cleanDomain = 'toolverai.com';
  const urlPath = currentSEO.canonicalUrl.replace('https://toolverai.com', '') || '/';

  return (
    <>
      {/* Floating SEO Inspector Toggle Button */}
      {showFloatingInspectorButton && (
        <div className="fixed bottom-5 left-5 z-40">
          <button
            onClick={() => setIsInspectorOpen(true)}
            className="group flex items-center gap-2 px-3 py-2 bg-white/95 hover:bg-white text-slate-700 hover:text-indigo-600 rounded-full shadow-lg border border-slate-200/90 text-xs font-semibold backdrop-blur-md transition-all duration-200 hover:scale-105 cursor-pointer"
            title="Inspect dynamic SEO <title> and <meta description> tags"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">SEO Meta</span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-mono px-1.5 py-0.5 rounded border border-indigo-100">
              {activeTab === 'tool-detail' && selectedTool ? selectedTool.name : activeTab}
            </span>
          </button>
        </div>
      )}

      {/* SEO Inspector Modal */}
      {isInspectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">Dynamic SEO Meta Tag Manager</h3>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Live in &lt;head&gt;
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Real-time metadata updated for: <span className="font-semibold text-slate-800">{activeTab === 'tool-detail' && selectedTool ? `${selectedTool.name} (Tool Detail)` : `${activeTab.toUpperCase()} View`}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsInspectorOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* View Mode Tabs */}
            <div className="flex border-b border-slate-100 px-5 pt-3 bg-white gap-2 text-xs font-semibold">
              <button
                onClick={() => setActiveTabPreview('google')}
                className={`pb-3 px-3 flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
                  activeTabPreview === 'google'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                Google SERP Snippet
              </button>
              <button
                onClick={() => setActiveTabPreview('social')}
                className={`pb-3 px-3 flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
                  activeTabPreview === 'social'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                Social Card (OG/Twitter)
              </button>
              <button
                onClick={() => setActiveTabPreview('schema')}
                className={`pb-3 px-3 flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
                  activeTabPreview === 'schema'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                JSON-LD Schema
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/40">
              {activeTabPreview === 'google' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Google Search Result Simulation
                    </h4>
                    {/* Google SERP Card Preview */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-[9px] font-bold">
                          T
                        </div>
                        <span className="text-slate-800 font-medium">{cleanDomain}</span>
                        <span className="text-slate-400">›</span>
                        <span className="text-slate-500 font-mono text-[11px] truncate">{urlPath}</span>
                      </div>
                      <h5 className="text-lg font-medium text-[#1a0dab] hover:underline cursor-pointer leading-snug">
                        {currentSEO.title}
                      </h5>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {currentSEO.description}
                      </p>
                    </div>
                  </div>

                  {/* Raw Meta Tags Injected */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Active Head Tags Injected
                      </h4>
                      <button
                        onClick={() =>
                          handleCopy(
                            `<title>${currentSEO.title}</title>\n<meta name="description" content="${currentSEO.description}" />\n<link rel="canonical" href="${currentSEO.canonicalUrl}" />`,
                            'all'
                          )
                        }
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedKey === 'all' ? 'Copied All' : 'Copy HTML'}
                      </button>
                    </div>

                    {/* Title */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                        <span>&lt;title&gt; ({currentSEO.title.length} chars)</span>
                        <button
                          onClick={() => handleCopy(currentSEO.title, 'title')}
                          className="hover:text-slate-700 cursor-pointer"
                        >
                          {copiedKey === 'title' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="font-semibold text-slate-900 font-mono select-all">
                        {currentSEO.title}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                        <span>&lt;meta name="description"&gt; ({currentSEO.description.length} chars)</span>
                        <button
                          onClick={() => handleCopy(currentSEO.description, 'desc')}
                          className="hover:text-slate-700 cursor-pointer"
                        >
                          {copiedKey === 'desc' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="text-slate-700 font-mono leading-relaxed select-all">
                        {currentSEO.description}
                      </div>
                    </div>

                    {/* Canonical URL */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                        <span>&lt;link rel="canonical"&gt;</span>
                        <button
                          onClick={() => handleCopy(currentSEO.canonicalUrl, 'canonical')}
                          className="hover:text-slate-700 cursor-pointer"
                        >
                          {copiedKey === 'canonical' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="text-indigo-600 font-mono truncate select-all">
                        {currentSEO.canonicalUrl}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTabPreview === 'social' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    OpenGraph & Twitter Card Preview
                  </h4>
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs max-w-md mx-auto">
                    <div className="aspect-[1.91/1] w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
                      <img
                        src={currentSEO.ogImage}
                        alt="Social preview banner"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                        toolverai.com
                      </div>
                    </div>
                    <div className="p-4 space-y-1.5">
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                        {cleanDomain}
                      </span>
                      <h5 className="text-sm font-bold text-slate-900 line-clamp-1">
                        {currentSEO.title}
                      </h5>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {currentSEO.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTabPreview === 'schema' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Injected Schema.org JSON-LD
                    </h4>
                    <button
                      onClick={() => handleCopy(JSON.stringify(currentSEO.jsonLd, null, 2), 'schema')}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'schema' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'schema' ? 'Copied' : 'Copy JSON'}
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-[300px] border border-slate-800 leading-relaxed select-all">
                    {JSON.stringify(currentSEO.jsonLd, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Automatically synced whenever you navigate or select a tool.</span>
              </div>
              <button
                onClick={() => setIsInspectorOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
