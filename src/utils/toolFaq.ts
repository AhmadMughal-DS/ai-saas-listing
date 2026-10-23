import { stripTrailingPunctuation } from './metaText';

export interface ToolFaq {
  question: string;
  answer: string;
}

interface FaqTool {
  name: string;
  tagline?: string;
  description?: string;
  category?: string;
  pricingType?: string;
  pricingPlans?: { name: string; price: string; billingPeriod?: string }[];
  platforms?: string[];
  hasApi?: boolean;
}

const FREE_TIERS = ['Free', 'Freemium', 'Open Source', 'Free Trial'];

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Builds the tool page FAQ from listing data only, so the server-rendered HTML,
 * the FAQPage schema and the React view always show the same questions and answers.
 */
export function buildToolFaqs(tool: FaqTool, alternatives: { name: string }[] = []): ToolFaq[] {
  const name = (tool.name || '').trim();
  const faqs: ToolFaq[] = [];

  const about = stripTrailingPunctuation(tool.description || tool.tagline || '');
  if (about) {
    faqs.push({ question: `What is ${name}?`, answer: `${about}.` });
  }

  if (tool.pricingType) {
    const plans = (tool.pricingPlans || [])
      .filter((p) => p?.name && p?.price)
      .map((p) => `${p.name} (${p.price}${p.billingPeriod ? ` ${p.billingPeriod}` : ''})`);
    const isFree = FREE_TIERS.includes(tool.pricingType);
    const lead = isFree
      ? `${name} is listed as ${tool.pricingType}, so you can start without paying.`
      : `${name} is listed as ${tool.pricingType}, with no free plan.`;
    faqs.push({
      question: `Is ${name} free?`,
      answer: plans.length ? `${lead} Plans: ${listNames(plans)}.` : lead,
    });
  }

  const platforms = [...(tool.platforms || [])];
  if (tool.hasApi && !platforms.includes('API')) platforms.push('API');
  if (platforms.length) {
    faqs.push({
      question: `Which platforms does ${name} support?`,
      answer: `${name} is available on ${listNames(platforms)}.`,
    });
  }

  const altNames = alternatives.map((a) => a.name).filter(Boolean).slice(0, 5);
  if (altNames.length) {
    faqs.push({
      question: `What are the best alternatives to ${name}?`,
      answer: `Popular ${tool.category ? `${tool.category} ` : ''}alternatives to ${name} include ${listNames(altNames)}.`,
    });
  }

  return faqs;
}

/** Same-category tools in listing order, matching the server-rendered alternatives list. */
export function getFaqAlternatives<T extends { id?: string; slug?: string; category?: string }>(tool: T, allTools: T[]): T[] {
  const category = tool.category?.toLowerCase();
  return allTools
    .filter((t) => t.slug !== tool.slug && t.id !== tool.id && t.category?.toLowerCase() === category)
    .slice(0, 6);
}

export function buildFaqPageJsonLd(faqs: ToolFaq[], pageUrl: string): Record<string, any> | null {
  if (!faqs.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${pageUrl}#faq`,
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}
