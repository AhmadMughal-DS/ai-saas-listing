import { getPublishedArticles } from '../data/blogData';
import { ELIGIBLE_COMPARISONS, ELIGIBLE_ALTERNATIVES } from '../utils/programmaticSeo';

export interface SitemapUrlEntry {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: string;
  image?: {
    loc: string;
    title: string;
    caption?: string;
  };
}

/**
 * Escapes characters for XML compliance
 */
export function escapeXml(unsafe?: string | null): string {
  if (!unsafe) return '';
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

/**
 * Formats a date value into W3C / ISO 8601 YYYY-MM-DD
 */
export function formatLastMod(dateInput?: string | number | Date | null): string {
  if (!dateInput) {
    return new Date().toISOString().split('T')[0];
  }
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return d.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Generates an array of all sitemap URL entries
 */
export function generateSitemapEntries(baseUrl: string, tools: any[] = []): SitemapUrlEntry[] {
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const today = new Date().toISOString().split('T')[0];
  const entries: SitemapUrlEntry[] = [];

  // 1. Core Primary Hub Pages
  entries.push(
    {
      loc: `${cleanBaseUrl}/`,
      lastmod: today,
      changefreq: 'daily',
      priority: '1.0',
    },
    {
      loc: `${cleanBaseUrl}/rankings`,
      lastmod: today,
      changefreq: 'daily',
      priority: '0.9',
    },
    {
      loc: `${cleanBaseUrl}/deals`,
      lastmod: today,
      changefreq: 'daily',
      priority: '0.9',
    },
    {
      loc: `${cleanBaseUrl}/compare`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.8',
    },
    {
      loc: `${cleanBaseUrl}/prompts`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.8',
    },
    {
      loc: `${cleanBaseUrl}/categories`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.8',
    },
    {
      loc: `${cleanBaseUrl}/blog`,
      lastmod: today,
      changefreq: 'daily',
      priority: '0.8',
    },
    {
      loc: `${cleanBaseUrl}/submit-tool`,
      lastmod: today,
      changefreq: 'monthly',
      priority: '0.6',
    },
    {
      loc: `${cleanBaseUrl}/about`,
      lastmod: today,
      changefreq: 'monthly',
      priority: '0.5',
    },
    {
      loc: `${cleanBaseUrl}/editorial-policy`,
      lastmod: today,
      changefreq: 'monthly',
      priority: '0.5',
    },
    {
      loc: `${cleanBaseUrl}/how-we-rank-tools`,
      lastmod: today,
      changefreq: 'monthly',
      priority: '0.5',
    },
    {
      loc: `${cleanBaseUrl}/privacy-policy`,
      lastmod: today,
      changefreq: 'yearly',
      priority: '0.3',
    },
    {
      loc: `${cleanBaseUrl}/terms`,
      lastmod: today,
      changefreq: 'yearly',
      priority: '0.3',
    },
    {
      loc: `${cleanBaseUrl}/affiliate-disclosure`,
      lastmod: today,
      changefreq: 'yearly',
      priority: '0.3',
    }
  );

  // 2. Dynamic Category Pages — SEO-friendly /categories/{slug} URLs
  const categorySet = new Set<string>();
  tools.forEach((t) => {
    if (t.category && typeof t.category === 'string') {
      categorySet.add(t.category.trim());
    }
  });

  categorySet.forEach((category) => {
    // Convert to SEO-friendly slug: "Coding" => "coding", "AI Writing" => "ai-writing"
    const categorySlug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    entries.push({
      loc: `${cleanBaseUrl}/categories/${encodeURIComponent(categorySlug)}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.75',
    });
  });


  // 3. Blog Articles & Technical Guides (/blog/:slug)
  try {
    const publishedArticles = getPublishedArticles();
    if (Array.isArray(publishedArticles)) {
      publishedArticles.forEach((post) => {
        if (post && post.slug) {
          const articleUrl = `${cleanBaseUrl}/blog/${encodeURIComponent(post.slug)}`;
          const lastMod = formatLastMod(post.updatedAt || post.publishedAt);
          entries.push({
            loc: articleUrl,
            lastmod: lastMod,
            changefreq: 'monthly',
            priority: '0.75',
            image: post.heroImage || post.coverImage ? {
              loc: post.heroImage || post.coverImage || `${cleanBaseUrl}/og-banner.png`,
              title: post.title,
            } : undefined,
          });
        }
      });
    }
  } catch (err) {
    console.error('Error generating blog sitemap entries:', err);
  }

  // 4. Dynamic AI Tools from Database
  tools.forEach((tool) => {
    if (!tool || (!tool.slug && !tool.id)) return;

    const identifier = tool.slug || tool.id;
    const toolUrl = `${cleanBaseUrl}/tool/${encodeURIComponent(identifier)}`;
    const lastModified = formatLastMod(tool.updatedAt || tool.createdAt || tool.launchedDate);

    // Calculate priority based on traffic and featured status
    let priority = '0.7';
    if (tool.isFeatured) {
      priority = '0.9';
    } else if (tool.monthlyVisits && Number(tool.monthlyVisits) >= 5000000) {
      priority = '0.85';
    } else if (tool.monthlyVisits && Number(tool.monthlyVisits) >= 500000) {
      priority = '0.8';
    }

    const entry: SitemapUrlEntry = {
      loc: toolUrl,
      lastmod: lastModified,
      changefreq: 'weekly',
      priority,
    };

    if (tool.logoUrl) {
      entry.image = {
        loc: tool.logoUrl,
        title: `${tool.name || 'AI'} - AI Software Directory`,
        caption: tool.tagline || (tool.description ? tool.description.slice(0, 120) : undefined),
      };
    }

    entries.push(entry);
  });

  // 5. Eligible Curated Side-by-Side Comparison Pages (/compare/{tool-a}-vs-{tool-b})
  // Strictly includes only canonical alphabetical pairs (never reversed duplicates)
  ELIGIBLE_COMPARISONS.forEach((comp) => {
    entries.push({
      loc: `${cleanBaseUrl}/compare/${encodeURIComponent(comp.canonicalSlug)}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.8',
    });
  });

  // 6. Eligible Curated Tool Alternatives Pages (/alternatives/{slug})
  ELIGIBLE_ALTERNATIVES.forEach((alt) => {
    entries.push({
      loc: `${cleanBaseUrl}/alternatives/${encodeURIComponent(alt.toolSlug)}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.8',
    });
  });

  return entries;
}

/**
 * Builds standard XML sitemap compliant with sitemaps.org and Google Image extensions
 */
export function buildSitemapXml(baseUrl: string, tools: any[] = []): string {
  const entries = generateSitemapEntries(baseUrl, tools);

  const xmlUrls = entries
    .map((entry) => {
      let imageXml = '';
      if (entry.image?.loc) {
        imageXml = `
    <image:image>
      <image:loc>${escapeXml(entry.image.loc)}</image:loc>
      <image:title>${escapeXml(entry.image.title)}</image:title>${
          entry.image.caption ? `\n      <image:caption>${escapeXml(entry.image.caption)}</image:caption>` : ''
        }
    </image:image>`;
      }

      return `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${escapeXml(entry.lastmod)}</lastmod>
    <changefreq>${escapeXml(entry.changefreq)}</changefreq>
    <priority>${escapeXml(entry.priority)}</priority>${imageXml}
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
<!-- Generated dynamically by ToolverAI SEO Engine (${entries.length} indexed URLs) -->
${xmlUrls}
</urlset>`;
}
