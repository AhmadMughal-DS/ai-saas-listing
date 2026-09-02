import React, { useState } from 'react';
import { INITIAL_BLOG_POSTS } from '../data/initialData';
import { BlogPost } from '../types';
import { Sparkles, Calendar, Clock, X, Share2, ChevronRight } from 'lucide-react';

const BLOG_CATEGORIES = [
  'All Articles',
  'AI News',
  'Guides & Tutorials',
  'Product Updates',
  'Founder Interviews',
];

export const BlogView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('All Articles');
  const [activeArticle, setActiveArticle] = useState<BlogPost | null>(null);

  const featuredPost = INITIAL_BLOG_POSTS.find((p) => p.isFeatured) || INITIAL_BLOG_POSTS[0];

  const filteredPosts = INITIAL_BLOG_POSTS.filter((post) => {
    if (selectedCategory === 'All Articles') return true;
    return post.category === selectedCategory;
  });

  return (
    <div className="w-full pt-32 pb-24 px-4 sm:px-8 max-w-[1440px] mx-auto">
      {/* Blog Hero */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase mb-4 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Research & Engineering Chronicles</span>
        </div>

        <h1 className="font-heading text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight mb-4">
          The AI Flux{' '}
          <span className="text-indigo-600">
            Blog
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-500 font-normal leading-relaxed">
          Insights, architectural benchmarks, and deep dives into the rapidly expanding artificial intelligence ecosystem.
        </p>
      </div>

      {/* Featured Big Card */}
      {featuredPost && (
        <div
          onClick={() => setActiveArticle(featuredPost)}
          className="bg-white rounded-3xl overflow-hidden mb-16 cursor-pointer card-3d border border-slate-200 shadow-sm hover:border-indigo-200 group"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="relative aspect-[16/10] lg:aspect-auto h-full min-h-[300px] overflow-hidden">
              <img
                src={featuredPost.coverImage}
                alt={featuredPost.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute top-4 left-4">
                <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-sm">
                  FEATURED RESEARCH
                </span>
              </div>
            </div>

            <div className="p-8 sm:p-12 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 text-xs text-indigo-600 font-semibold mb-3">
                  <span>{featuredPost.category}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {featuredPost.readTime}
                  </span>
                </div>

                <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors mb-4 leading-tight">
                  {featuredPost.title}
                </h2>

                <p className="text-sm sm:text-base text-slate-500 line-clamp-3 leading-relaxed mb-6 font-normal">
                  {featuredPost.excerpt}
                </p>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <img
                    src={featuredPost.author.avatar}
                    alt={featuredPost.author.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {featuredPost.author.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {featuredPost.publishedDate}
                    </div>
                  </div>
                </div>

                <button className="px-5 py-2.5 rounded-xl btn-purple text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer">
                  <span>Read Article</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Pills Filter */}
      <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-2.5 mb-12">
        {BLOG_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white shadow-xs font-semibold'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Article Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPosts.map((post) => (
          <article
            key={post.id}
            onClick={() => setActiveArticle(post)}
            className="bg-white rounded-2xl overflow-hidden card-3d flex flex-col justify-between group cursor-pointer border border-slate-200 shadow-xs hover:border-indigo-200"
          >
            <div>
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-md text-indigo-700 border border-indigo-100 shadow-xs">
                    {post.category}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{post.publishedDate}</span>
                  <span>•</span>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{post.readTime}</span>
                </div>

                <h3 className="font-heading text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-3 line-clamp-2 leading-snug">
                  {post.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-500 line-clamp-3 leading-relaxed font-normal">
                  {post.excerpt}
                </p>
              </div>
            </div>

            <div className="p-6 pt-0 flex items-center justify-between border-t border-slate-100 mt-4">
              <div className="flex items-center gap-2.5">
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="w-7 h-7 rounded-full object-cover border border-slate-200"
                />
                <span className="text-xs font-medium text-slate-700">
                  {post.author.name}
                </span>
              </div>

              <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Read <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </article>
        ))}
      </div>

      {/* Article Reader Modal */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveArticle(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2 text-xs text-indigo-600 font-semibold uppercase tracking-wider mb-3">
                <span>{activeArticle.category}</span>
                <span>•</span>
                <span>{activeArticle.readTime}</span>
              </div>

              <h1 className="font-heading text-3xl sm:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
                {activeArticle.title}
              </h1>

              <div className="flex items-center justify-between pb-6 border-b border-slate-200 mb-8">
                <div className="flex items-center gap-3">
                  <img
                    src={activeArticle.author.avatar}
                    alt={activeArticle.author.name}
                    className="w-12 h-12 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      {activeArticle.author.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {activeArticle.author.role} • {activeArticle.publishedDate}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => alert('Article link copied to clipboard!')}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
                  title="Share Article"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden mb-8 border border-slate-200">
                <img
                  src={activeArticle.coverImage}
                  alt={activeArticle.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Rich Content */}
              <div className="prose max-w-none text-slate-600 leading-relaxed space-y-6 text-sm sm:text-base font-normal">
                {activeArticle.content.split('\n\n').map((paragraph, index) => {
                  if (paragraph.startsWith('## ')) {
                    return (
                      <h2
                        key={index}
                        className="font-heading text-2xl font-bold text-slate-900 pt-4 pb-2 border-b border-slate-200"
                      >
                        {paragraph.replace('## ', '')}
                      </h2>
                    );
                  }
                  if (paragraph.startsWith('### ')) {
                    return (
                      <h3
                        key={index}
                        className="font-heading text-xl font-bold text-slate-900 pt-2 text-indigo-600"
                      >
                        {paragraph.replace('### ', '')}
                      </h3>
                    );
                  }
                  return <p key={index}>{paragraph}</p>;
                })}
              </div>

              {/* Modal Footer */}
              <div className="mt-12 pt-8 border-t border-slate-200 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Published by AIFlux Research & Editorial Team
                </div>
                <button
                  onClick={() => setActiveArticle(null)}
                  className="px-6 py-2.5 rounded-xl btn-cyan text-xs font-semibold cursor-pointer shadow-xs"
                >
                  Close Article
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
