import React, { useState } from 'react';
import { BlogPost } from '../types';
import { getPublishedArticles, getArticleBySlug } from '../data/blogData';
import {
  Sparkles,
  Calendar,
  Clock,
  ChevronRight,
  ArrowLeft,
  Share2,
  Check,
  Tag,
  GitCompare,
  ArrowRight,
  ShieldCheck,
  BookOpen
} from 'lucide-react';

interface BlogViewProps {
  articleSlug?: string | null;
  onSelectArticle?: (slug: string) => void;
  onBackToBlog?: () => void;
  onNavigate?: (tab: any) => void;
}

export const BlogView: React.FC<BlogViewProps> = ({
  articleSlug,
  onSelectArticle,
  onBackToBlog,
}) => {
  const [selectedTopic, setSelectedTopic] = useState('All Topics');
  const [copiedLink, setCopiedLink] = useState(false);

  const publishedArticles = getPublishedArticles();
  const currentArticle = articleSlug ? getArticleBySlug(articleSlug) : null;

  const topics = ['All Topics', ...Array.from(new Set(publishedArticles.map((a) => a.topic).filter(Boolean)))];

  const filteredArticles = publishedArticles.filter((post) => {
    if (selectedTopic === 'All Topics') return true;
    return post.topic === selectedTopic;
  });

  const featuredArticle = publishedArticles.find((p) => p.isFeatured) || publishedArticles[0];

  const handleArticleClick = (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    if (onSelectArticle) {
      onSelectArticle(slug);
    } else {
      window.history.pushState({}, '', `/blog/${slug}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onBackToBlog) {
      onBackToBlog();
    } else {
      window.history.pushState({}, '', '/blog');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // ── Standalone Article View ──────────────────────────────────────────
  if (currentArticle) {
    const relatedArticles = (currentArticle.relatedArticleSlugs || [])
      .map((slug) => getArticleBySlug(slug))
      .filter((a): a is BlogPost => Boolean(a));

    return (
      <div className="w-full pt-28 pb-24 px-4 sm:px-8 max-w-[1200px] mx-auto">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center flex-wrap gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <li>
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({}, '', '/');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Home
              </a>
            </li>
            <li aria-hidden="true" className="text-slate-300 dark:text-slate-600">/</li>
            <li>
              <a
                href="/blog"
                onClick={handleBack}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Blog
              </a>
            </li>
            <li aria-hidden="true" className="text-slate-300 dark:text-slate-600">/</li>
            <li aria-current="page" className="text-slate-900 dark:text-white font-bold truncate max-w-[280px] sm:max-w-none">
              {currentArticle.title}
            </li>
          </ol>
        </nav>

        {/* Back Link */}
        <div className="mb-6">
          <a
            href="/blog"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Editorial Guides</span>
          </a>
        </div>

        {/* Article Header */}
        <header className="max-w-4xl mx-auto mb-10 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start flex-wrap gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
            <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold">
              {currentArticle.topic || currentArticle.category}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              {currentArticle.readTime}
            </span>
          </div>

          <h1 className="font-heading text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-6">
            {currentArticle.title}
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
            {currentArticle.excerpt}
          </p>

          {/* Author Byline & Dates */}
          <div className="flex items-center justify-between flex-wrap gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                TA
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <a href="/about" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    {currentArticle.author.name}
                  </a>
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 font-semibold">
                    <ShieldCheck className="w-3 h-3" /> Verified Editorial
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>Published: {currentArticle.publishedDate}</span>
                  {currentArticle.updatedAt && (
                    <>
                      <span>•</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">Updated: {currentArticle.updatedAt}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
              title="Share article link"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-700 dark:text-emerald-300">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Hero Image */}
        <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden mb-12 border border-slate-200 dark:border-slate-800 shadow-sm aspect-[16/9] max-h-[460px] w-full bg-slate-100 dark:bg-slate-800">
          <img
            src={currentArticle.heroImage || currentArticle.coverImage}
            alt={currentArticle.title}
            width={1200}
            height={675}
            className="w-full h-full object-cover"
            loading="eager"
            decoding="async"
            {...({ fetchpriority: 'high' } as any)}
          />
        </div>

        {/* Article Body Content */}
        <article className="max-w-4xl mx-auto prose prose-slate max-w-none text-slate-700 dark:text-slate-300 leading-relaxed text-base">
          {currentArticle.content.split('\n\n').map((block, idx) => {
            const trimmed = block.trim();
            if (trimmed.startsWith('## ')) {
              return (
                <h2 key={idx} className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-10 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                  {trimmed.replace('## ', '')}
                </h2>
              );
            }
            if (trimmed.startsWith('### ')) {
              return (
                <h3 key={idx} className="font-heading text-xl font-bold text-indigo-700 dark:text-indigo-400 mt-6 mb-3">
                  {trimmed.replace('### ', '')}
                </h3>
              );
            }
            if (trimmed.startsWith('---')) {
              return <hr key={idx} className="my-8 border-slate-200 dark:border-slate-800" />;
            }
            if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
              const items = trimmed.split('\n').filter(Boolean);
              return (
                <ul key={idx} className="space-y-2 my-4 list-disc list-inside text-slate-700 dark:text-slate-300">
                  {items.map((it, i) => (
                    <li key={i} dangerouslySetInnerHTML={{ __html: renderInlineLinks(it.replace(/^[-*]\s+/, '')) }} />
                  ))}
                </ul>
              );
            }
            if (trimmed.startsWith('|')) {
              // Markdown table render
              const rows = trimmed.split('\n').filter(Boolean);
              if (rows.length >= 2) {
                const headers = rows[0].split('|').map((c) => c.trim()).filter(Boolean);
                const dataRows = rows.slice(2);
                return (
                  <div key={idx} className="overflow-x-auto my-6 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-xs">
                    <table className="w-full text-xs sm:text-sm text-left border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          {headers.map((h, hi) => (
                            <th key={hi} className="p-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {dataRows.map((r, ri) => {
                          const cells = r.split('|').map((c) => c.trim()).filter(Boolean);
                          return (
                            <tr key={ri} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60">
                              {cells.map((cell, ci) => (
                                <td key={ci} className="p-3 font-medium text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: renderInlineLinks(cell) }} />
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              }
            }
            return (
              <p
                key={idx}
                className="my-4 text-slate-700 dark:text-slate-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderInlineLinks(trimmed) }}
              />
            );
          })}
        </article>

        {/* Contextual Related Research Box */}
        <section className="max-w-4xl mx-auto mt-16 p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <h2 className="font-heading text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Related Directory Research &amp; Comparisons</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category Link */}
            {currentArticle.relatedCategorySlugs?.map((catSlug) => (
              <a
                key={catSlug}
                href={`/categories/${catSlug}`}
                className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-xs transition-all flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <div>
                  <span className="text-[10px] uppercase text-indigo-600 dark:text-indigo-400 font-bold tracking-wider">Browse Category</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">Explore {catSlug.replace(/-/g, ' ').toUpperCase()} AI Tools</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </a>
            ))}

            {/* Comparisons */}
            {currentArticle.relatedComparisonSlugs?.map((compSlug) => (
              <a
                key={compSlug}
                href={`/compare/${compSlug}`}
                className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-xs transition-all flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <div>
                  <span className="text-[10px] uppercase text-indigo-600 dark:text-indigo-400 font-bold tracking-wider">Head-to-Head</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">{compSlug.replace(/-/g, ' ').toUpperCase()}</div>
                </div>
                <GitCompare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </a>
            ))}

            {/* Alternatives */}
            {currentArticle.relatedAlternativeSlugs?.map((altSlug) => (
              <a
                key={altSlug}
                href={`/alternatives/${altSlug}`}
                className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-xs transition-all flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <div>
                  <span className="text-[10px] uppercase text-indigo-600 dark:text-indigo-400 font-bold tracking-wider">Competitor Guide</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">Best {altSlug.toUpperCase()} Alternatives</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </a>
            ))}
          </div>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
              <h3 className="font-heading text-sm font-bold text-slate-900 dark:text-white mb-3">Further Editorial Reading</h3>
              <div className="space-y-2">
                {relatedArticles.map((rel) => (
                  <a
                    key={rel.slug}
                    href={`/blog/${rel.slug}`}
                    onClick={(e) => handleArticleClick(e, rel.slug)}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    <span>{rel.title}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Footer Navigation */}
        <div className="max-w-4xl mx-auto mt-12 text-center">
          <a
            href="/blog"
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Explore All Editorial Guides</span>
          </a>
        </div>
      </div>
    );
  }

  // ── Editorial Blog Hub View ──────────────────────────────────────────
  return (
    <div className="w-full pt-28 pb-24 px-4 sm:px-8 max-w-[1440px] mx-auto">
      {/* Semantic Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center flex-wrap gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <li>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Home
            </a>
          </li>
          <li aria-hidden="true" className="text-slate-300 dark:text-slate-600">/</li>
          <li aria-current="page" className="text-slate-900 dark:text-white font-bold">
            Blog &amp; Editorial Guides
          </li>
        </ol>
      </nav>

      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold uppercase mb-4 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>People-First Decision Guides · 2026 Edition</span>
        </div>

        <h1 className="font-heading text-4xl sm:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
          ToolverAI{' '}
          <span className="text-indigo-600 dark:text-indigo-400">Editorial Guides</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
          In-depth architectural frameworks, tradeoff analyses, and practical buying guides to help you evaluate and deploy generative AI tools.
        </p>
      </div>

      {/* Featured Big Card */}
      {featuredArticle && (
        <a
          href={`/blog/${featuredArticle.slug}`}
          onClick={(e) => handleArticleClick(e, featuredArticle.slug)}
          className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden mb-14 block border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all group"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="relative aspect-[16/10] lg:aspect-auto h-full min-h-[300px] overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img
                src={featuredArticle.heroImage || featuredArticle.coverImage}
                alt={featuredArticle.title}
                width={800}
                height={500}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="eager"
                decoding="async"
              />
              <div className="absolute top-4 left-4">
                <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-xs">
                  FEATURED GUIDE
                </span>
              </div>
            </div>

            <div className="p-8 sm:p-12 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-3">
                  <span className="font-bold">{featuredArticle.topic || featuredArticle.category}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <Clock className="w-3 h-3" /> {featuredArticle.readTime}
                  </span>
                </div>

                <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-4 leading-tight">
                  {featuredArticle.title}
                </h2>

                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed mb-6 font-normal">
                  {featuredArticle.excerpt}
                </p>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                    TA
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {featuredArticle.author.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {featuredArticle.publishedDate}
                    </div>
                  </div>
                </div>

                <span className="px-5 py-2.5 rounded-xl btn-purple text-xs font-semibold flex items-center gap-1.5 shadow-xs">
                  <span>Read Guide</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>
        </a>
      )}

      {/* Topic Filter Pills */}
      <div className="flex items-center justify-center flex-wrap gap-2 mb-12">
        {topics.map((top) => (
          <button
            key={top}
            onClick={() => setSelectedTopic(top)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedTopic === top
                ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {top}
          </button>
        ))}
      </div>

      {/* Article Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredArticles.map((post) => (
          <a
            key={post.id}
            href={`/blog/${post.slug}`}
            onClick={(e) => handleArticleClick(e, post.slug)}
            className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden flex flex-col justify-between group border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all block"
          >
            <div>
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src={post.heroImage || post.coverImage}
                  alt={post.title}
                  width={600}
                  height={375}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/95 dark:bg-slate-900/95 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 shadow-xs">
                    {post.topic || post.category}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{post.publishedDate}</span>
                  <span>•</span>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{post.readTime}</span>
                </div>

                <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-3 line-clamp-2 leading-snug">
                  {post.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed font-normal">
                  {post.excerpt}
                </p>
              </div>
            </div>

            <div className="p-6 pt-0 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-4">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {post.author.name}
              </span>

              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Read Guide <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

/**
 * Basic markdown link helper that converts [text](url) to HTML <a href="url">text</a>
 */
function renderInlineLinks(text: string): string {
  // Convert [label](/url) to <a href="/url" class="...">label</a>
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-1 py-0.5 rounded text-xs font-mono">$1</code>');
}
