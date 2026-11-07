/**
 * Single source of truth for <title> tags, used by BOTH the server SSR (server.ts) and the client
 * SEOManager (utils/seo.ts) so the crawled title and the hydrated title never disagree.
 *
 * Google shows ~60 characters (≈600px). fitTitle() picks the first candidate that fits with the
 * " | ToolverAI" suffix, then without it, so long tool names lose the brand before the keywords.
 * ASCII separators only (":" and "|"): em dashes were showing up garbled ("�") in crawl reports.
 */

export const BRAND = 'ToolverAI';
export const MAX_TITLE_LENGTH = 60;
const SUFFIX = ` | ${BRAND}`;

export function fitTitle(...candidates: string[]): string {
  const list = candidates.map((c) => String(c || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  // Candidates are ordered most-descriptive first: keep keywords, drop the brand suffix before them.
  for (const c of list) {
    if ((c + SUFFIX).length <= MAX_TITLE_LENGTH) return c + SUFFIX;
    if (c.length <= MAX_TITLE_LENGTH) return c;
  }
  return list[list.length - 1] || BRAND;
}

/** Removes a trailing "| ToolverAI" / "- ToolverAI" a stored title may already carry. */
export function stripBrand(title: string): string {
  return String(title || '').replace(/\s*[|\-–—]\s*ToolverAI\s*$/i, '').trim();
}

export const HUB_TITLES = {
  home: fitTitle('Best AI Tools Directory 2026'),
  rankings: fitTitle('Top AI Tools by Monthly Traffic (2026)'),
  compare: fitTitle('AI Comparison Tool: Compare AI Tools Side by Side'),
  deals: fitTitle('AI Deals 2026: AI Tool Discounts & Promo Codes'),
  prompts: fitTitle('AI Prompt Library: ChatGPT, Claude & More'),
  categories: fitTitle('AI Tools by Category (2026)'),
  blog: fitTitle('AI Tools Blog: Guides, Reviews & Comparisons'),
  alternatives: fitTitle('Best AI Tool Alternatives & Competitors 2026'),
  submit: fitTitle('Submit an AI Tool to the Directory'),
};

export function toolTitle(name: string): string {
  const n = String(name || '').trim();
  return fitTitle(
    `${n} Review 2026: Pricing, Features & Alternatives`,
    `${n} Review: Pricing, Features & Alternatives`,
    `${n} Review 2026: Pricing & Alternatives`,
    `${n} Review & Pricing (2026)`,
    `${n} Review`,
    n
  );
}

export function compareTitle(nameA: string, nameB: string): string {
  const a = String(nameA || '').trim();
  const b = String(nameB || '').trim();
  return fitTitle(
    `${a} vs ${b}: Features & Pricing Compared (2026)`,
    `${a} vs ${b}: Which Is Better in 2026?`,
    `${a} vs ${b} (2026)`,
    `${a} vs ${b}`
  );
}

export function alternativesTitle(name: string): string {
  const n = String(name || '').trim();
  return fitTitle(`Best ${n} Alternatives in 2026 (Free & Paid)`, `Best ${n} Alternatives (2026)`, `${n} Alternatives`);
}

export function categoryTitle(categoryName: string): string {
  const c = String(categoryName || '').trim();
  return fitTitle(`Best ${c} Tools in 2026`, `${c} Tools`);
}

export function articleTitle(title: string): string {
  return fitTitle(stripBrand(title));
}
