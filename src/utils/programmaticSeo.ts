import { AITool } from '../types';

export interface EligibleComparison {
  slug1: string; // Alphabetically first slug
  slug2: string; // Alphabetically second slug
  canonicalSlug: string; // "${slug1}-vs-${slug2}"
  category: string;
  focusArea: string;
}

export interface EligibleAlternative {
  toolSlug: string;
  category: string;
  reason: string;
}

/**
 * Curated list of high-value, high-intent comparisons.
 * Every comparison pair is verified against real MongoDB Atlas production data.
 * Slugs are strictly in alphabetical order: slug1 < slug2.
 */
export const ELIGIBLE_COMPARISONS: EligibleComparison[] = [
  {
    slug1: 'cursor',
    slug2: 'github-copilot',
    canonicalSlug: 'cursor-vs-github-copilot',
    category: 'Coding',
    focusArea: 'AI code completion, multi-file Composer mode, and IDE workflow automation',
  },
  {
    slug1: 'claude',
    slug2: 'deepseek',
    canonicalSlug: 'claude-vs-deepseek',
    category: 'Coding',
    focusArea: 'Hybrid reasoning models, open-weights economics, and coding benchmarks',
  },
  {
    slug1: 'cursor',
    slug2: 'windsurf',
    canonicalSlug: 'cursor-vs-windsurf',
    category: 'Coding',
    focusArea: 'AI-first code editors, monorepo indexing, and developer productivity',
  },
  {
    slug1: 'chatgpt',
    slug2: 'perplexity',
    canonicalSlug: 'chatgpt-vs-perplexity',
    category: 'Productivity',
    focusArea: 'Conversational AI, real-time web search citations, and research workflows',
  },
  {
    slug1: 'chatgpt',
    slug2: 'google-gemini',
    canonicalSlug: 'chatgpt-vs-google-gemini',
    category: 'Productivity',
    focusArea: 'Multimodal foundation models, workspace integrations, and conversational reasoning',
  },
  {
    slug1: 'microsoft-copilot',
    slug2: 'notion-ai',
    canonicalSlug: 'microsoft-copilot-vs-notion-ai',
    category: 'Productivity',
    focusArea: 'Enterprise productivity, document synthesis, and team knowledge management',
  },
  {
    slug1: 'midjourney',
    slug2: 'stable-diffusion-3',
    canonicalSlug: 'midjourney-vs-stable-diffusion-3',
    category: 'Image AI',
    focusArea: 'Generative image quality, open-weights fine-tuning, and photorealism',
  },
  {
    slug1: 'adobe-firefly',
    slug2: 'dalle-3',
    canonicalSlug: 'adobe-firefly-vs-dalle-3',
    category: 'Image AI',
    focusArea: 'Commercially safe generative assets, prompt comprehension, and design workflows',
  },
  {
    slug1: 'elevenlabs',
    slug2: 'suno',
    canonicalSlug: 'elevenlabs-vs-suno',
    category: 'Audio AI',
    focusArea: 'Voice cloning and synthesis vs complete AI music generation and composition',
  },
  {
    slug1: 'runway-gen3',
    slug2: 'sora-openai',
    canonicalSlug: 'runway-gen3-vs-sora-openai',
    category: 'Video AI',
    focusArea: 'Text-to-video generation, cinematic camera control, and physics simulation',
  },
];

/**
 * Curated list of high-value tools eligible for dedicated alternatives landing pages.
 * Each tool has verified alternative options in the same category in the production database.
 */
export const ELIGIBLE_ALTERNATIVES: EligibleAlternative[] = [
  {
    toolSlug: 'chatgpt',
    category: 'Productivity',
    reason: 'Users seeking open-weights models, citations-first search, or lower subscription costs.',
  },
  {
    toolSlug: 'cursor',
    category: 'Coding',
    reason: 'Developers looking for VS Code extensions, native GitHub integration, or free-tier alternatives.',
  },
  {
    toolSlug: 'github-copilot',
    category: 'Coding',
    reason: 'Engineers seeking full-repository autonomous agents, Composer diffs, or open-source solutions.',
  },
  {
    toolSlug: 'claude',
    category: 'Coding',
    reason: 'Teams needing lower API costs, unmetered self-hosting, or alternative multimodal capabilities.',
  },
  {
    toolSlug: 'deepseek',
    category: 'Coding',
    reason: 'Users wanting managed enterprise SLAs, native IDE extensions, or zero-setup cloud interfaces.',
  },
  {
    toolSlug: 'perplexity',
    category: 'Productivity',
    reason: 'Researchers seeking deeper conversational memory, offline generation, or creative copywriting.',
  },
  {
    toolSlug: 'midjourney',
    category: 'Image AI',
    reason: 'Artists wanting free browser GUIs, commercial indemnification, or local self-hosted generation.',
  },
  {
    toolSlug: 'elevenlabs',
    category: 'Audio AI',
    reason: 'Creators looking for full song generation, open-source TTS weights, or budget voice synthesis.',
  },
  {
    toolSlug: 'runway-gen3',
    category: 'Video AI',
    reason: 'Filmmakers seeking free video generation credits, open weights, or alternative camera controls.',
  },
  {
    toolSlug: 'notion-ai',
    category: 'Productivity',
    reason: 'Teams seeking native Google/Microsoft workspace integrations or specialized project trackers.',
  },
];

/**
 * Deterministic canonical ordering for comparison pairs.
 * Given any two slugs (regardless of input order), returns the canonical alphabetical slug
 * and whether the input was already canonical.
 */
export function normalizeComparisonSlugs(rawSlugA: string, rawSlugB: string): {
  slug1: string;
  slug2: string;
  canonicalSlug: string;
  isCanonicalOrder: boolean;
} {
  const cleanA = rawSlugA.trim().toLowerCase();
  const cleanB = rawSlugB.trim().toLowerCase();

  if (cleanA <= cleanB) {
    return {
      slug1: cleanA,
      slug2: cleanB,
      canonicalSlug: `${cleanA}-vs-${cleanB}`,
      isCanonicalOrder: true,
    };
  } else {
    return {
      slug1: cleanB,
      slug2: cleanA,
      canonicalSlug: `${cleanB}-vs-${cleanA}`,
      isCanonicalOrder: false,
    };
  }
}

/**
 * Parses a combined comparison path parameter like "cursor-vs-github-copilot"
 * into separate slugs and checks canonical ordering.
 */
export function parseComparisonPath(pathParam: string): {
  rawSlugA: string;
  rawSlugB: string;
  slug1: string;
  slug2: string;
  canonicalSlug: string;
  isCanonicalOrder: boolean;
} | null {
  const parts = pathParam.toLowerCase().split('-vs-');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  const rawSlugA = parts[0];
  const rawSlugB = parts[1];
  const normalized = normalizeComparisonSlugs(rawSlugA, rawSlugB);
  return {
    rawSlugA,
    rawSlugB,
    ...normalized,
  };
}

/**
 * Checks whether a comparison pair is eligible for indexing and sitemap inclusion.
 * Safeguard against thin programmatic SEO: requires pair to be in ELIGIBLE_COMPARISONS
 * or meet strict structured data criteria.
 */
export function isEligibleComparison(slugA: string, slugB: string): boolean {
  const { canonicalSlug } = normalizeComparisonSlugs(slugA, slugB);
  return ELIGIBLE_COMPARISONS.some((c) => c.canonicalSlug === canonicalSlug);
}

/**
 * Checks whether a tool is eligible for an /alternatives/{slug} page.
 */
export function isEligibleAlternative(toolSlug: string): boolean {
  const clean = toolSlug.trim().toLowerCase();
  return ELIGIBLE_ALTERNATIVES.some((a) => a.toolSlug === clean);
}

/**
 * Finds top alternatives for a tool from the full dataset.
 * Excludes the tool itself, filters by same category, and ranks by monthly visits.
 */
export function getToolAlternatives(tool: AITool, allTools: AITool[], limit = 5): AITool[] {
  return allTools
    .filter((t) => (t.slug !== tool.slug && t.id !== tool.id) && t.category?.toLowerCase() === tool.category?.toLowerCase())
    .sort((a, b) => (b.monthlyVisits || 0) - (a.monthlyVisits || 0))
    .slice(0, limit);
}

/**
 * Returns any eligible comparisons that involve the given tool slug.
 */
export function getRelatedComparisonsForTool(toolSlug: string): EligibleComparison[] {
  const clean = toolSlug.trim().toLowerCase();
  return ELIGIBLE_COMPARISONS.filter((c) => c.slug1 === clean || c.slug2 === clean);
}

/**
 * Returns related comparisons for a comparison page (excluding the current pair).
 */
export function getRelatedComparisonsForPair(slug1: string, slug2: string, limit = 4): EligibleComparison[] {
  const currentCanonical = normalizeComparisonSlugs(slug1, slug2).canonicalSlug;
  // Prioritize comparisons sharing one of the tools or same category
  const matches = ELIGIBLE_COMPARISONS.filter((c) => c.canonicalSlug !== currentCanonical);
  const shared = matches.filter((c) => c.slug1 === slug1 || c.slug2 === slug1 || c.slug1 === slug2 || c.slug2 === slug2);
  const others = matches.filter((c) => !shared.includes(c));
  return [...shared, ...others].slice(0, limit);
}
