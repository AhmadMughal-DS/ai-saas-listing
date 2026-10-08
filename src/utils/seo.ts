import { ActiveTab, AITool, BlogPost } from '../types';

export interface SEOData {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: 'website' | 'article' | 'product';
  ogImage: string;
  keywords: string[];
  author?: string;
  jsonLd: Record<string, any> | Record<string, any>[];
  robots?: string;
}

const BASE_URL = 'https://toolverai.com';

import { normalizeComparisonSlugs } from './programmaticSeo';

// Use env var if available (set in Vite build), else fallback to Unsplash
const DEFAULT_IMAGE =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_OG_DEFAULT_IMAGE) ||
  'https://toolverai.com/og-banner.png';

/** Helper: slugify a category name to URL-safe path */
export function slugifyCategory(cat: string): string {
  return cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function generateSEOData(
  activeTab: ActiveTab,
  tool: AITool | null,
  categorySlugParam?: string | null,
  comparisonTools?: [AITool, AITool] | null,
  selectedArticle?: BlogPost | null
): SEOData {
  // ── Standalone Blog Article ──────────────────────────────────────────
  if (activeTab === 'blog' && selectedArticle) {
    const article = selectedArticle;
    const articleUrl = `${BASE_URL}/blog/${article.slug}`;
    const articleTitle = `${article.seoTitle || article.title} | ToolverAI`;
    const articleDesc = article.metaDescription || article.excerpt;
    const articleImage = article.heroImage || article.coverImage || DEFAULT_IMAGE;

    return {
      title: articleTitle,
      description: articleDesc,
      canonicalUrl: articleUrl,
      ogType: 'article',
      ogImage: articleImage,
      keywords: [
        article.topic || 'AI Guides',
        'AI tools evaluation',
        article.title,
        'ToolverAI editorial',
      ],
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          '@id': `${articleUrl}#article`,
          headline: article.title,
          description: articleDesc,
          image: articleImage,
          datePublished: article.publishedAt || article.publishedDate,
          dateModified: article.updatedAt || article.publishedAt || article.publishedDate,
          author: {
            '@type': 'Organization',
            name: article.author.name || 'ToolverAI Editorial Team',
            url: `${BASE_URL}/about`,
          },
          publisher: {
            '@type': 'Organization',
            name: 'ToolverAI',
            url: BASE_URL,
            logo: { '@type': 'ImageObject', url: `${BASE_URL}/og-banner.png` },
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': articleUrl,
          },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE_URL}/blog` },
            { '@type': 'ListItem', position: 3, name: article.title, item: articleUrl },
          ],
        },
      ],
    };
  }
  // ── Tool Detail Page ──────────────────────────────────────────────────
  if (activeTab === 'tool-detail' && tool) {
    const cleanName = tool.name.trim();
    const visitsStr = tool.monthlyVisitsFormatted ? `${tool.monthlyVisitsFormatted} visits/mo` : '';
    const pricingStr = tool.pricingType || 'Freemium';
    const title = `${cleanName} Review 2026: Features, Pricing & Alternatives | ToolverAI`;
    const baseDesc = tool.tagline || tool.description.slice(0, 120);
    const description = `${cleanName} (${pricingStr}): ${baseDesc}. ${visitsStr ? `Traffic: ${visitsStr}.` : ''} Compare pricing, features, and top alternatives on ToolverAI.`.slice(0, 160);

    const canonicalUrl = `${BASE_URL}/tool/${tool.slug || tool.id}`;
    const ogImage = tool.logoUrl && !tool.logoUrl.includes('unsplash') ? tool.logoUrl : DEFAULT_IMAGE;

    const keywords = [
      cleanName,
      `${cleanName} review`,
      `${cleanName} pricing`,
      `${cleanName} alternatives`,
      `${cleanName} features`,
      tool.category,
      `best ${tool.category} AI tools`,
      `${tool.pricingType} AI tools`,
      'AI tools directory 2026',
    ].filter(Boolean) as string[];

    // Safe aggregateRating: only emit if there are real reviews
    const hasRealReviews = (tool.reviewCount || 0) >= 1;

    const softwareSchema: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      '@id': `${canonicalUrl}#software`,
      name: cleanName,
      description: tool.description || tool.tagline || '',
      applicationCategory: tool.category || 'Utilities',
      operatingSystem: (tool.platforms || ['Web']).join(', '),
      url: tool.url || canonicalUrl,
      image: ogImage,
      publisher: {
        '@type': 'Organization',
        name: 'ToolverAI',
        url: BASE_URL,
      },
    };

    if (tool.pricingPlans?.[0]?.price) {
      const rawPrice = tool.pricingPlans[0].price.replace(/[^0-9.]/g, '');
      softwareSchema.offers = {
        '@type': 'Offer',
        price: rawPrice || '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      };
    }

    if (hasRealReviews) {
      softwareSchema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: String(tool.rating || 4.5),
        reviewCount: String(tool.reviewCount),
        bestRating: '5',
        worstRating: '1',
      };
    }

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'AI Tools', item: `${BASE_URL}/` },
        {
          '@type': 'ListItem',
          position: 3,
          name: tool.category || 'Tools',
          item: `${BASE_URL}/categories/${slugifyCategory(tool.category || 'tools')}`,
        },
        { '@type': 'ListItem', position: 4, name: cleanName, item: canonicalUrl },
      ],
    };

    return {
      title,
      description,
      canonicalUrl,
      ogType: 'product',
      ogImage,
      keywords,
      jsonLd: [softwareSchema, breadcrumbSchema],
    };
  }

  // ── Route-specific Pages ──────────────────────────────────────────────
  switch (activeTab) {
    case 'rankings':
      return {
        title: 'Top AI Tools by Monthly Traffic — Estimated Traffic Rankings 2026 | ToolverAI',
        description: 'Explore estimated monthly traffic statistics, growth velocity, and user volume leaderboards across Coding, LLMs, Image, and Audio AI platforms. Updated weekly.',
        canonicalUrl: `${BASE_URL}/rankings`,
        ogType: 'website',
        ogImage: DEFAULT_IMAGE,
        keywords: [
          'AI traffic rankings 2026',
          'most popular AI tools',
          'fastest growing AI software',
          'ChatGPT vs Claude traffic',
          'AI directory leaderboard',
          'AI monthly users statistics',
        ],
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            '@id': `${BASE_URL}/rankings#page`,
            name: 'AI Tools Traffic Rankings & Growth Leaderboard',
            description: 'Estimated monthly web traffic rankings and engagement stats for top generative AI software.',
            url: `${BASE_URL}/rankings`,
            publisher: { '@type': 'Organization', name: 'ToolverAI', url: BASE_URL },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
              { '@type': 'ListItem', position: 2, name: 'AI Tools Rankings', item: `${BASE_URL}/rankings` },
            ],
          },
        ],
      };

    case 'compare': {
      if (comparisonTools && comparisonTools.length === 2) {
        const [raw1, raw2] = comparisonTools;
        const { slug1, canonicalSlug } = normalizeComparisonSlugs(raw1.slug || raw1.id, raw2.slug || raw2.id);
        const t1 = (raw1.slug || raw1.id) === slug1 ? raw1 : raw2;
        const t2 = (raw1.slug || raw1.id) === slug1 ? raw2 : raw1;
        const title = `${t1.name} vs ${t2.name} (2026): Features, Pricing & Comparison | ToolverAI`;
        const description = `Compare ${t1.name} vs ${t2.name} in 2026. Side-by-side analysis of pricing (${t1.pricingType} vs ${t2.pricingType}), monthly traffic (${t1.monthlyVisitsFormatted || 'N/A'} vs ${t2.monthlyVisitsFormatted || 'N/A'}), features, pros/cons, and top alternatives on ToolverAI.`;
        const canonicalUrl = `${BASE_URL}/compare/${canonicalSlug}`;

        return {
          title,
          description,
          canonicalUrl,
          ogType: 'website',
          ogImage: DEFAULT_IMAGE,
          keywords: [
            `${t1.name} vs ${t2.name}`,
            `${t1.name} comparison`,
            `${t2.name} comparison`,
            `${t1.name} alternatives`,
            `${t2.name} alternatives`,
            'AI tools comparison 2026',
          ],
          jsonLd: [
            {
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              '@id': `${canonicalUrl}#page`,
              name: `${t1.name} vs ${t2.name} Comparison`,
              description,
              url: canonicalUrl,
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
                { '@type': 'ListItem', position: 2, name: 'Compare AI Tools', item: `${BASE_URL}/compare` },
                { '@type': 'ListItem', position: 3, name: `${t1.name} vs ${t2.name}`, item: canonicalUrl },
              ],
            },
          ],
        };
      }

      return {
        title: 'Compare AI Tools Side-by-Side — Features, Pricing & Traffic | ToolverAI',
        description: 'Compare top AI models and software head-to-head on pricing plans, monthly traffic, API availability, supported platforms, and user ratings. Free comparison tool.',
        canonicalUrl: `${BASE_URL}/compare`,
        ogType: 'website',
        ogImage: DEFAULT_IMAGE,
        keywords: [
          'compare AI tools',
          'AI tool comparison 2026',
          'ChatGPT vs Claude',
          'Cursor AI vs GitHub Copilot',
          'AI software comparison matrix',
          'best AI tool for developers',
        ],
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            '@id': `${BASE_URL}/compare#page`,
            name: 'Side-by-Side AI Tools Comparison Engine',
            description: 'Compare AI software head-to-head on pricing, traffic, features, and user reviews.',
            url: `${BASE_URL}/compare`,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
              { '@type': 'ListItem', position: 2, name: 'Compare AI Tools', item: `${BASE_URL}/compare` },
            ],
          },
        ],
      };
    }

    case 'alternatives': {
      if (tool) {
        const cleanName = tool.name.trim();
        const title = `Best ${cleanName} Alternatives in 2026 | ToolverAI`;
        const description = `Looking for the best ${cleanName} alternatives in 2026? Compare top ${tool.category} AI tools by pricing, estimated monthly traffic, features, and authentic user reviews on ToolverAI.`;
        const canonicalUrl = `${BASE_URL}/alternatives/${tool.slug || tool.id}`;

        return {
          title,
          description,
          canonicalUrl,
          ogType: 'website',
          ogImage: tool.logoUrl && !tool.logoUrl.includes('unsplash') ? tool.logoUrl : DEFAULT_IMAGE,
          keywords: [
            `best ${cleanName} alternatives`,
            `${cleanName} competitors`,
            `tools like ${cleanName}`,
            `best ${tool.category} AI tools`,
            'AI software alternatives 2026',
          ],
          jsonLd: [
            {
              '@context': 'https://schema.org',
              '@type': 'CollectionPage',
              '@id': `${canonicalUrl}#page`,
              name: title,
              description,
              url: canonicalUrl,
              publisher: { '@type': 'Organization', name: 'ToolverAI', url: BASE_URL },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
                { '@type': 'ListItem', position: 2, name: 'AI Tools', item: `${BASE_URL}/` },
                { '@type': 'ListItem', position: 3, name: tool.category || 'Tools', item: `${BASE_URL}/categories/${slugifyCategory(tool.category || 'tools')}` },
                { '@type': 'ListItem', position: 4, name: `Best ${cleanName} Alternatives`, item: canonicalUrl },
              ],
            },
          ],
        };
      }

      return {
        title: 'Best AI Tool Alternatives & Competitor Directory | ToolverAI',
        description: 'Discover top alternative AI software for ChatGPT, Cursor, Midjourney, and leading AI models. Detailed feature matrices and pricing breakdowns on ToolverAI.',
        canonicalUrl: `${BASE_URL}/compare`,
        ogType: 'website',
        ogImage: DEFAULT_IMAGE,
        keywords: ['AI tool alternatives', 'ChatGPT alternatives', 'Cursor alternatives', 'Midjourney alternatives'],
        jsonLd: [],
      };
    }

    case 'deals':
      return {
        title: 'Best AI Tool Deals & Promo Codes — Verified Discounts 2026 | ToolverAI',
        description: 'Save on leading AI software with exclusive verified coupon codes, lifetime deals, and extended free trials. All deals manually verified and updated daily.',
        canonicalUrl: `${BASE_URL}/deals`,
        ogType: 'website',
        ogImage: DEFAULT_IMAGE,
        keywords: [
          'AI tool deals 2026',
          'AI promo codes',
          'AI software discounts',
          'lifetime AI deals',
          'free AI credits',
          'AI coupon codes verified',
        ],
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            '@id': `${BASE_URL}/deals#page`,
            name: 'Verified AI Software Deals and Discount Codes',
            description: 'Curated exclusive discounts and verified promo codes for top AI apps.',
            url: `${BASE_URL}/deals`,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
              { '@type': 'ListItem', position: 2, name: 'AI Deals', item: `${BASE_URL}/deals` },
            ],
          },
        ],
      };

    case 'prompts':
      return {
        title: 'AI Prompt Engineering Library — Templates for ChatGPT, Claude & More | ToolverAI',
        description: 'Master ChatGPT GPT-4o, Claude, Midjourney, and Cursor AI with battle-tested prompts for coding, SEO, marketing, and workflow automation. Free prompt library.',
        canonicalUrl: `${BASE_URL}/prompts`,
        ogType: 'website',
        ogImage: DEFAULT_IMAGE,
        keywords: [
          'AI prompt library',
          'prompt engineering templates 2026',
          'ChatGPT prompts',
          'Claude 3.7 prompts',
          'Midjourney prompt guide',
          'Cursor AI system prompts',
          'free prompt templates',
        ],
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            '@id': `${BASE_URL}/prompts#page`,
            name: 'AI Prompt Engineering Library & Templates',
            description: 'Production-ready prompt engineering templates for major foundation models.',
            url: `${BASE_URL}/prompts`,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
              { '@type': 'ListItem', position: 2, name: 'Prompt Library', item: `${BASE_URL}/prompts` },
            ],
          },
        ],
      };

    case 'categories': {
      // Determine if viewing a specific category (e.g. /categories/coding)
      let catSlug = categorySlugParam;
      if (!catSlug && typeof window !== 'undefined') {
        const match = window.location.pathname.match(/\/categories\/([^/?#]+)/i);
        if (match && match[1]) catSlug = decodeURIComponent(match[1]).toLowerCase();
      }

      if (catSlug && catSlug !== 'all') {
        const catName = catSlug
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        const catCanonical = `${BASE_URL}/categories/${catSlug}`;
        const catTitle = `Best ${catName} Tools in 2026 | ToolverAI`;
        const catDesc = `Discover the best ${catName} tools in 2026. Compare top ${catName} AI tools ranked by estimated monthly traffic, pricing, and authentic user reviews on ToolverAI.`;

        return {
          title: catTitle,
          description: catDesc,
          canonicalUrl: catCanonical,
          ogType: 'website',
          ogImage: DEFAULT_IMAGE,
          keywords: [
            `best ${catName} AI tools 2026`,
            `${catName} AI software`,
            `top ${catName} tools`,
            'AI tools directory',
          ],
          jsonLd: [
            {
              '@context': 'https://schema.org',
              '@type': 'CollectionPage',
              '@id': `${catCanonical}#page`,
              name: catTitle,
              description: catDesc,
              url: catCanonical,
              publisher: { '@type': 'Organization', name: 'ToolverAI', url: BASE_URL },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
                { '@type': 'ListItem', position: 2, name: 'Categories', item: `${BASE_URL}/categories` },
                { '@type': 'ListItem', position: 3, name: catName, item: catCanonical },
              ],
            },
          ],
        };
      }

      return {
        title: 'AI Tools by Category — Coding, Writing, Image, Video & More | ToolverAI',
        description: 'Browse 120+ AI tools organized across 8 core categories. Find the best Coding AI, Writing AI, Image Generation, Video AI, Marketing AI, and more on ToolverAI.',
        canonicalUrl: `${BASE_URL}/categories`,
        ogType: 'website',
        ogImage: DEFAULT_IMAGE,
        keywords: [
          'AI tools by category',
          'best coding AI tools',
          'AI writing tools',
          'AI image generation tools',
          'AI video tools',
          'AI marketing tools 2026',
          'AI tool categories',
        ],
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            '@id': `${BASE_URL}/categories#page`,
            name: 'Browse AI Tools by Category',
            description: 'Comprehensive directory of AI tools structured by domain, use-case, and platform.',
            url: `${BASE_URL}/categories`,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
              { '@type': 'ListItem', position: 2, name: 'AI Tool Categories', item: `${BASE_URL}/categories` },
            ],
          },
        ],
      };
    }

    case 'blog':
      return {
        title: 'AI Tools Blog — News, Reviews & Tutorials | ToolverAI',
        description: 'Read expert analysis, AI tool reviews, LLM benchmark comparisons, step-by-step tutorials, and the latest news from the AI software industry at ToolverAI.',
        canonicalUrl: `${BASE_URL}/blog`,
        ogType: 'article',
        ogImage: DEFAULT_IMAGE,
        keywords: [
          'AI tools blog',
          'AI news 2026',
          'LLM benchmark comparisons',
          'AI tool reviews',
          'machine learning tutorials',
          'generative AI guides',
        ],
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'Blog',
            '@id': `${BASE_URL}/blog#blog`,
            name: 'ToolverAI Intelligence Blog',
            description: 'In-depth analysis, benchmark reports, and practical guides on generative AI.',
            url: `${BASE_URL}/blog`,
            publisher: {
              '@type': 'Organization',
              name: 'ToolverAI',
              url: BASE_URL,
              logo: { '@type': 'ImageObject', url: `${BASE_URL}/og-banner.png` },
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
              { '@type': 'ListItem', position: 2, name: 'AI Blog', item: `${BASE_URL}/blog` },
            ],
          },
        ],
      };

    case 'admin':
      return {
        title: 'Admin Console | ToolverAI',
        description: 'Administrative control panel for ToolverAI.',
        canonicalUrl: `${BASE_URL}/admin`,
        ogType: 'website',
        ogImage: DEFAULT_IMAGE,
        keywords: [],
        robots: 'noindex, nofollow',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Admin Console',
          url: `${BASE_URL}/admin`,
        },
      };

    case 'directory':
    default:
      return {
        title: 'Best AI Tools & AI Tools Directory | ToolverAI',
        description: 'Explore the best AI tools in 2026. Discover, compare, and track top AI tools across coding, productivity, image, and video generation in our curated AI tools directory.',
        canonicalUrl: `${BASE_URL}/`,
        ogType: 'website',
        ogImage: DEFAULT_IMAGE,
        keywords: [
          'AI tools',
          'AI tools directory',
          'best AI tools',
          'discover AI tools',
          'compare AI tools',
          'AI tool rankings',
          'AI tools directory 2026',
        ],
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            '@id': `${BASE_URL}/#organization`,
            name: 'ToolverAI',
            url: BASE_URL,
            logo: {
              '@type': 'ImageObject',
              url: `${BASE_URL}/og-banner.png`,
              width: 1200,
              height: 630,
            },
            description: 'ToolverAI is the leading AI tools discovery platform with rankings, comparisons, curated deals, and reviews.',
            sameAs: ['https://x.com/toolverai'],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            '@id': `${BASE_URL}/#website`,
            url: BASE_URL,
            name: 'ToolverAI',
            description: 'Discover, compare and track the best AI tools. Estimated traffic data, curated deals, and software reviews.',
            publisher: { '@id': `${BASE_URL}/#organization` },
            potentialAction: {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: `${BASE_URL}/?search={search_term_string}`,
              },
              'query-input': 'required name=search_term_string',
            },
          },
        ],
      };
  }
}

/**
 * Applies SEO data to <head> DOM tags dynamically.
 * For CSR/SPA pages where SSR is not available.
 */
export function applySEOMetaTags(data: SEOData) {
  if (typeof document === 'undefined') return;

  // 1. Title
  document.title = data.title;

  // Helper to set or update meta tags, eliminating any duplicates
  const setMeta = (attrName: 'name' | 'property', key: string, content: string) => {
    const elements = document.querySelectorAll<HTMLMetaElement>(`meta[${attrName}="${key}"]`);
    if (elements.length > 0) {
      elements[0].setAttribute('content', content);
      // Prune any duplicate meta tags
      for (let i = 1; i < elements.length; i++) {
        elements[i].remove();
      }
    } else {
      const el = document.createElement('meta');
      el.setAttribute(attrName, key);
      el.setAttribute('content', content);
      document.head.appendChild(el);
    }
  };

  // 2. Standard SEO
  setMeta('name', 'description', data.description);
  if (data.keywords.length > 0) {
    setMeta('name', 'keywords', data.keywords.join(', '));
  }
  setMeta('name', 'robots', data.robots || 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');

  // 3. Open Graph
  setMeta('property', 'og:title', data.title);
  setMeta('property', 'og:description', data.description);
  setMeta('property', 'og:type', data.ogType);
  setMeta('property', 'og:url', data.canonicalUrl);
  setMeta('property', 'og:image', data.ogImage);
  setMeta('property', 'og:image:width', '1200');
  setMeta('property', 'og:image:height', '630');
  setMeta('property', 'og:site_name', 'ToolverAI');
  setMeta('property', 'og:locale', 'en_US');

  // 4. Twitter / X Card
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:site', '@toolverai');
  setMeta('name', 'twitter:title', data.title);
  setMeta('name', 'twitter:description', data.description);
  setMeta('name', 'twitter:image', data.ogImage);

  // 5. Canonical URL — strictly exactly 1 self-referencing canonical tag
  const canonicalLinks = document.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]');
  if (canonicalLinks.length > 0) {
    canonicalLinks[0].setAttribute('href', data.canonicalUrl);
    // Remove any accidental duplicate canonical tags
    for (let i = 1; i < canonicalLinks.length; i++) {
      canonicalLinks[i].remove();
    }
  } else {
    const canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', data.canonicalUrl);
    document.head.appendChild(canonical);
  }

  // 6. JSON-LD Structured Data
  // Remove existing dynamic JSON-LD scripts
  document.querySelectorAll('script[data-seo-dynamic]').forEach((s) => s.remove());

  const schemas = Array.isArray(data.jsonLd) ? data.jsonLd : [data.jsonLd];
  schemas.forEach((schema, i) => {
    const jsonLdScript = document.createElement('script');
    jsonLdScript.type = 'application/ld+json';
    jsonLdScript.setAttribute('data-seo-dynamic', String(i));
    jsonLdScript.textContent = JSON.stringify(schema, null, 2);
    document.head.appendChild(jsonLdScript);
  });
}
