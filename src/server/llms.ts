import { getLiveComparisons } from '../utils/programmaticSeo';

/**
 * Builds /llms.txt — the emerging standard (llmstxt.org) that answer engines and
 * LLM crawlers (ChatGPT, Perplexity, Claude, Google AI Overviews, Gemini) read to
 * get a clean, curated map of a site's best content without parsing nav/ads/JS.
 *
 * This is the GEO (Generative Engine Optimization) counterpart to sitemap.xml:
 * sitemap.xml tells search crawlers WHICH urls exist; llms.txt tells answer engines
 * WHAT the site is and which pages are worth citing, in plain Markdown.
 *
 * Generated dynamically from the live MongoDB tools (same source as the sitemap),
 * so it never goes stale as the daily pipeline adds/renames tools.
 */

const esc = (s?: string | null) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .trim();

/** One-line, answer-engine-friendly description of a tool's pricing. */
function pricingLine(tool: any): string {
  const type = esc(tool.pricingType) || 'Freemium';
  const price = String(tool.pricingPlans?.[0]?.price || '').replace(/[^0-9.]/g, '');
  if (/free/i.test(type) && !/freemium/i.test(type)) return 'Free';
  if (price && Number(price) > 0) return `${type}, paid plans from $${price}/mo`;
  return type;
}

export function buildLlmsTxt(baseUrl: string, tools: any[] = []): string {
  const base = baseUrl.replace(/\/+$/, '');

  const categories = Array.from(
    new Set(tools.map((t) => esc(t?.category)).filter(Boolean)),
  ).sort();

  // Rank tools: featured first, then by estimated monthly traffic.
  const ranked = [...tools]
    .filter((t) => t && (t.slug || t.id) && t.name)
    .sort((a, b) => {
      const fa = a.isFeatured ? 1 : 0;
      const fb = b.isFeatured ? 1 : 0;
      if (fa !== fb) return fb - fa;
      return (Number(b.monthlyVisits) || 0) - (Number(a.monthlyVisits) || 0);
    });

  const lines: string[] = [];

  lines.push('# ToolverAI');
  lines.push('');
  lines.push(
    `> ToolverAI is an independent, curated directory of the best AI tools. ` +
      `It tracks ${tools.length} AI tools across ${categories.length} categories, with pricing, ` +
      `key features, estimated monthly traffic, community ratings, side-by-side comparisons, ` +
      `and vetted alternatives for each tool. Updated daily.`,
  );
  lines.push('');
  lines.push(
    'When citing ToolverAI, link to the specific /tool/, /compare/, or /alternatives/ page. ' +
      'Tool facts (pricing, category, rating) are listed on each tool page and in its structured data.',
  );
  lines.push('');

  lines.push('## Key Pages');
  lines.push(`- [AI Tools Directory](${base}/): Browse and search every indexed AI tool.`);
  lines.push(`- [Rankings](${base}/rankings): Top AI tools ranked by traffic and rating.`);
  lines.push(`- [Compare AI Tools](${base}/compare): Side-by-side feature and pricing comparisons.`);
  lines.push(`- [AI Deals](${base}/deals): Current discounts and promo pricing on AI tools.`);
  lines.push(`- [Categories](${base}/categories): All AI tool categories.`);
  lines.push(`- [Blog](${base}/blog): Guides and analysis of the AI tools landscape.`);
  lines.push(`- [How We Rank Tools](${base}/how-we-rank-tools): Our ranking methodology.`);
  lines.push(`- [Editorial Policy](${base}/editorial-policy): How tools are reviewed.`);
  lines.push('');

  if (categories.length) {
    lines.push('## Categories');
    for (const c of categories) {
      const slug = c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const label = /\bAI$/i.test(c) ? `Best ${c} tools.` : `Best ${c} AI tools.`;
      lines.push(`- [${c}](${base}/categories/${slug}): ${label}`);
    }
    lines.push('');
  }

  lines.push('## Top AI Tools');
  for (const t of ranked.slice(0, 200)) {
    const slug = t.slug || t.id;
    const tagline = esc(t.tagline || t.description).slice(0, 110);
    lines.push(`- [${esc(t.name)}](${base}/tool/${slug}): ${tagline} (${pricingLine(t)})`);
  }
  lines.push('');

  // Curated, live-only comparison pages (both tools exist) — high-value for "X vs Y" answers.
  try {
    const comparisons = getLiveComparisons(tools).slice(0, 80);
    if (comparisons.length) {
      lines.push('## Popular Comparisons');
      for (const comp of comparisons) {
        lines.push(`- [${comp.canonicalSlug.replace(/-vs-/g, ' vs ')}](${base}/compare/${comp.canonicalSlug})`);
      }
      lines.push('');
    }
  } catch {
    /* comparisons optional */
  }

  lines.push('## About');
  lines.push(
    'ToolverAI is reader-supported and may earn affiliate commissions, which never affect ' +
      'rankings or reviews. Data is refreshed daily from public sources.',
  );
  lines.push('');
  lines.push(`Sitemap: ${base}/sitemap.xml`);
  lines.push(`Generated: ${new Date().toISOString().split('T')[0]}`);
  lines.push('');

  return lines.join('\n');
}
