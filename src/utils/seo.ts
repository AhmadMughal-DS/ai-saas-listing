import { ActiveTab, AITool } from '../types';

export interface SEOData {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: 'website' | 'article' | 'product';
  ogImage: string;
  keywords: string[];
  author?: string;
  jsonLd: Record<string, any>;
  robots?: string;
}

const BASE_URL = 'https://toolverai.com';
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80';

export function generateSEOData(activeTab: ActiveTab, tool: AITool | null): SEOData {
  // Case 1: Active Tool Detail View
  if (activeTab === 'tool-detail' && tool) {
    const cleanName = tool.name.trim();
    const ratingStr = tool.rating ? `${tool.rating}★` : 'Verified';
    const visitsStr = tool.monthlyVisitsFormatted ? `${tool.monthlyVisitsFormatted} visits` : '';
    const subtitle = visitsStr ? `(${visitsStr})` : `(${ratingStr})`;
    const title = `${cleanName} AI - Reviews, Pricing, Traffic ${subtitle} & Alternatives | ToolverAI`;

    const description = `${cleanName} (${tool.pricingType}): ${
      tool.tagline || tool.description.slice(0, 130)
    }. Explore real monthly visitors (${tool.monthlyVisitsFormatted || 'N/A'}), verified user reviews (${tool.reviewCount || 0}), pricing tiers, pros & cons, and top alternatives on ToolverAI.`.slice(0, 160);

    const canonicalUrl = `${BASE_URL}/tool/${tool.slug || tool.id}`;
    const ogImage = tool.logoUrl || DEFAULT_IMAGE;

    const keywords = [
      cleanName,
      `${cleanName} AI`,
      `${cleanName} pricing`,
      `${cleanName} reviews`,
      `${cleanName} alternatives`,
      tool.category,
      `${tool.category} AI tools`,
      tool.pricingType,
      'AI software benchmark',
      'monthly web traffic stats',
    ];

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: cleanName,
      headline: tool.tagline || cleanName,
      description: tool.description,
      applicationCategory: tool.category,
      operatingSystem: tool.platforms?.join(', ') || 'Web, macOS, Windows, Linux',
      url: tool.url,
      image: tool.logoUrl,
      offers: {
        '@type': 'Offer',
        price: tool.pricingPlans?.[0]?.price?.replace('$', '') || '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: tool.rating || 4.5,
        reviewCount: Math.max(tool.reviewCount || 1, 1),
        bestRating: '5',
        worstRating: '1',
      },
      publisher: {
        '@type': 'Organization',
        name: 'ToolverAI',
        url: BASE_URL,
      },
    };

    return {
      title,
      description,
      canonicalUrl,
      ogType: 'product',
      ogImage,
      keywords,
      jsonLd,
    };
  }

  // Case 2: Specific Tabs
  switch (activeTab) {
    case 'rankings':
      return {
        title: 'Top AI Tools Traffic Rankings & Monthly Leaderboard | ToolverAI',
        description: 'Explore verified monthly traffic statistics, growth velocity, and user volume leaderboards across Coding, LLMs, Image, and Audio AI platforms.',
        canonicalUrl: `${BASE_URL}/rankings`,
        ogType: 'website',
        ogImage: DEFAULT_IMAGE,
        keywords: [
          'AI traffic rankings',
          'most popular AI tools',
          'fastest growing AI software',
          'ChatGPT vs Claude traffic',
          'AI directory leaderboard',
        ],
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'AI Tools Traffic Rankings & Growth Leaderboard',
          description: 'Verified monthly web traffic rankings and engagement stats for top generative AI software.',
          url: `${BASE_URL}/rankings`,
        },
      };

    case 'compare':
      return {
        title: 'Side-by-Side AI Tools Comparison Matrix & Benchmarks | ToolverAI',
        description: 'Compare top AI models and software head-to-head on pricing plans, monthly traffic visits, API availability, supported platforms, and user ratings.',
        canonicalUrl: `${BASE_URL}/compare`,
        ogType: 'website',
        ogImage: DEFAULT_IMAGE,
        keywords: [
          'compare AI tools',
          'AI comparison matrix',
          'ChatGPT vs Claude 3.7',
          'Cursor AI vs GitHub Copilot',
          'AI feature comparison',
        ],
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Side-by-Side AI Tools Comparison Engine',
          description: 'Compare AI software head-to-head on pricing, traffic, features, and user reviews.',
          url: `${BASE_URL}/compare`,
        },
      };

    case 'deals':
      return {
        title: 'Verified AI Deals, Promo Codes & Lifetime Software Discounts | ToolverAI',
        description: 'Save on leading artificial intelligence software with exclusive verified coupon codes, lifetime deals, and extended free trials updated daily.',
        canonicalUrl: `${BASE_URL}/deals`,
        ogType: 'website',
        ogImage: DEFAULT_IMAGE,
        keywords: [
          'AI deals',
          'AI promo codes',
          'AI discounts',
          'lifetime AI deals',
          'free AI credits',
          'AI coupon codes',
        ],
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Verified AI Software Deals and Coupons',
          description: 'Curated exclusive discounts and verified promo codes for top AI apps.',
          url: `${BASE_URL}/deals`,
        },
      };

    case 'prompts':
      return {
        title: 'Curated AI Prompt Engineering Library & Templates | ToolverAI',
        description: 'Master ChatGPT GPT-4o, Claude 3.7, Midjourney v6, and Cursor AI with battle-tested production prompts for coding, SEO marketing, and workflow automation.',
        canonicalUrl: `${BASE_URL}/prompts`,
        ogType: 'website',
        ogImage: DEFAULT_IMAGE,
        keywords: [
          'AI prompt library',
          'prompt engineering templates',
          'ChatGPT prompts',
          'Claude prompts',
          'Midjourney prompt guides',
          'Cursor AI system prompts',
        ],
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Curated AI Prompt Engineering Library',
          description: 'Production-ready prompt engineering templates for major foundation models.',
          url: `${BASE_URL}/prompts`,
        },
      };

    case 'categories':
      return {
        title: 'Browse AI Tools by Category & Industry Solutions | ToolverAI',
        description: 'Discover the best AI applications organized across Coding, Image Generation, Video Production, Audio Synthesis, Productivity, and Enterprise AI.',
        canonicalUrl: `${BASE_URL}/categories`,
        ogType: 'website',
        ogImage: DEFAULT_IMAGE,
        keywords: [
          'AI tool categories',
          'coding AI',
          'generative image AI',
          'video generation tools',
          'audio AI synthesis',
          'productivity AI assistants',
        ],
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Browse AI Tools by Category',
          description: 'Comprehensive directory of AI tools structured by domain, use-case, and platform.',
          url: `${BASE_URL}/categories`,
        },
      };

    case 'blog':
      return {
        title: 'ToolverAI Blog - AI News, Benchmarks & Practical Tutorials',
        description: 'Read deep dives into LLM performance benchmarks, generative AI engineering tutorials, SaaS comparisons, and the latest artificial intelligence industry news.',
        canonicalUrl: `${BASE_URL}/blog`,
        ogType: 'article',
        ogImage: DEFAULT_IMAGE,
        keywords: [
          'AI blog',
          'generative AI news',
          'LLM benchmarks',
          'AI tutorials',
          'machine learning guides',
        ],
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: 'ToolverAI Intelligence Blog',
          description: 'In-depth analysis, benchmark reports, and practical guides on generative AI.',
          url: `${BASE_URL}/blog`,
        },
      };

    case 'admin':
      return {
        title: 'Admin Management Console | ToolverAI',
        description: 'Administrative control panel for managing MongoDB Atlas collections, tool listings, user reviews, and SEO configuration.',
        canonicalUrl: `${BASE_URL}/admin`,
        ogType: 'website',
        ogImage: DEFAULT_IMAGE,
        keywords: ['ToolverAI admin', 'database management', 'console'],
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
        title: 'ToolverAI - The Leading AI Directory, Traffic Rankings & Verified Deals',
        description: 'The leading AI directory, monthly traffic rankings, side-by-side comparison engine, verified deals & promo codes, and curated prompt engineering library at toolverai.com.',
        canonicalUrl: `${BASE_URL}/`,
        ogType: 'website',
        ogImage: DEFAULT_IMAGE,
        keywords: [
          'AI directory',
          'AI tools',
          'best AI apps 2026',
          'AI monthly traffic',
          'compare AI tools',
          'AI discounts',
          'prompt templates',
        ],
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'ToolverAI',
          url: BASE_URL,
          description: 'The leading AI directory, traffic rankings & verified deals.',
          potentialAction: {
            '@type': 'SearchAction',
            target: `${BASE_URL}/?search={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
      };
  }
}

/**
 * Updates DOM <head> tags dynamically and efficiently
 */
export function applySEOMetaTags(data: SEOData) {
  if (typeof document === 'undefined') return;

  // 1. Update <title>
  document.title = data.title;

  // Helper to set or create meta tag
  const setMeta = (attributeName: 'name' | 'property', key: string, content: string) => {
    let el = document.querySelector(`meta[${attributeName}="${key}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attributeName, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // 2. Standard Meta Tags
  setMeta('name', 'description', data.description);
  if (data.keywords && data.keywords.length > 0) {
    setMeta('name', 'keywords', data.keywords.join(', '));
  }
  setMeta('name', 'robots', data.robots || 'index, follow, max-image-preview:large');

  // 3. OpenGraph Tags
  setMeta('property', 'og:title', data.title);
  setMeta('property', 'og:description', data.description);
  setMeta('property', 'og:type', data.ogType);
  setMeta('property', 'og:url', data.canonicalUrl);
  setMeta('property', 'og:image', data.ogImage);
  setMeta('property', 'og:site_name', 'ToolverAI');

  // 4. Twitter Card Tags
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', data.title);
  setMeta('name', 'twitter:description', data.description);
  setMeta('name', 'twitter:image', data.ogImage);

  // 5. Canonical Link
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', data.canonicalUrl);

  // 6. JSON-LD Structured Data
  let jsonLdScript = document.getElementById('seo-dynamic-jsonld');
  if (!jsonLdScript) {
    jsonLdScript = document.createElement('script');
    jsonLdScript.id = 'seo-dynamic-jsonld';
    jsonLdScript.setAttribute('type', 'application/ld+json');
    document.head.appendChild(jsonLdScript);
  }
  jsonLdScript.textContent = JSON.stringify(data.jsonLd, null, 2);
}
