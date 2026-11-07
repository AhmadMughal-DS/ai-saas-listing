import type { SeoFaq } from '../data/hubSeoContent';

/**
 * Data-driven FAQ for every /tool/{slug} page. Answers are built ONLY from the tool's own record
 * (tagline, pricing, plans, platforms, deal, same-category tools) so they stay accurate across all
 * ~190 tools without hand-writing each one. Used by the server (visible SSR + FAQPage JSON-LD) and by
 * ToolDetailView (same text, visible to users).
 */

interface FaqTool {
  name: string;
  slug?: string;
  id?: string;
  category?: string;
  tagline?: string;
  description?: string;
  pricingType?: string;
  pricingPlans?: { name?: string; price?: string; billingPeriod?: string }[];
  platforms?: string[];
  hasApi?: boolean;
  isOpenSource?: boolean;
  monthlyVisits?: number;
  monthlyVisitsFormatted?: string;
  keyFeatures?: string[];
  targetAudience?: string[];
  deal?: { discount?: string; description?: string; code?: string } | null;
  /** Editorial list of well-known rivals (names, may not all be in the directory). */
  alternatives?: string[];
}

function firstSentence(text: string, max = 220): string {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const m = clean.match(/^(.+?[.!?])(\s|$)/);
  let s = (m ? m[1] : clean).trim();
  if (s.length > max) s = s.slice(0, max).replace(/\s+\S*$/, '') + '…';
  return /[.!?…]$/.test(s) ? s : s + '.';
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** "a"/"an" by sound for the words we generate (AI, Audio, Agents, ElevenLabs, ...). */
function article(word: string): string {
  return /^(?:[aeiou]|AI\b|API\b|SEO\b|MBA\b|[FHLMNRSX](?:[A-Z0-9]|\b))/i.test(word.trim()) &&
    !/^(?:uni|use|eu|one)/i.test(word.trim())
    ? 'an'
    : 'a';
}

/** "Coding AI tool", "Image AI tool" (not "Image AI AI tool"), "AI agent" for Agents. */
function categoryNoun(category: string): string {
  if (/^agents?$/i.test(category)) return 'AI agent';
  if (/\bAI$/i.test(category)) return `${category} tool`;
  return `${category} AI tool`;
}

function isFreePrice(price: string): boolean {
  return /^\$?\s*0(?:\.0+)?$|^free$/i.test(price.trim());
}

/** "$20" + "/month" | "per month (billed annually)" | "forever" -> "$20/month", "$20/month (billed annually)", "$0". */
function formatPlanPrice(p: { price?: string; billingPeriod?: string }): string {
  const price = String(p.price || '').trim();
  if (!price || isFreePrice(price)) return price;
  const per = String(p.billingPeriod || '')
    .trim()
    .replace(/^per\s+/i, '')
    .replace(/^\/\s*/, '')
    .replace(/\s*\/\s*/g, '/');
  if (!per || /forever|one[- ]?time|lifetime/i.test(per)) return price;
  return `${price}/${per}`;
}

export function buildToolFaqs(tool: FaqTool, allTools: FaqTool[] = []): SeoFaq[] {
  const name = (tool.name || '').trim();
  if (!name) return [];
  const category = tool.category || 'AI';
  const noun = categoryNoun(category);
  const faqs: SeoFaq[] = [];

  // 1. What is it? — definition answer (the snippet answer engines quote most)
  const desc = firstSentence(tool.description || '') || firstSentence(tool.tagline || '');
  const features = (tool.keyFeatures || []).slice(0, 3).map((f) => String(f).trim()).filter(Boolean);
  const intro =
    // Descriptions often already open with the tool name — don't say "X is ... X is ..."
    desc && desc.toLowerCase().startsWith(name.toLowerCase())
      ? `${desc} It is listed in the ${category} category on ToolverAI.`
      : `${name} is ${article(noun)} ${noun}.${desc ? ` ${desc}` : ''}`;
  faqs.push({
    q: `What is ${name}?`,
    a: `${intro}${features.length ? ` Key features: ${features.join('; ')}.` : ''}`.trim(),
  });

  // 2. Is it free? / pricing
  const plans = (tool.pricingPlans || []).filter((p) => p && p.name && p.price);
  const cheapest = plans.find((p) => !isFreePrice(String(p.price)));
  const fromPrice = cheapest ? ` Paid plans start at ${formatPlanPrice(cheapest)} (${cheapest.name}).` : '';
  const pricing = tool.pricingType || 'Freemium';
  let freeAnswer: string;
  switch (pricing) {
    case 'Free':
      freeAnswer = `Yes. ${name} is free to use.`;
      break;
    case 'Open Source':
      freeAnswer = `Yes. ${name} is open source, so you can use and self-host it for free; hosted or managed options may cost extra.`;
      break;
    case 'Freemium':
      freeAnswer = `${name} has a free plan with usage limits, plus paid plans for more usage and features.${fromPrice}`;
      break;
    case 'Free Trial':
      freeAnswer = `${name} offers a free trial, after which a paid plan is required.${fromPrice}`;
      break;
    case 'Enterprise':
      freeAnswer = `${name} is sold on enterprise pricing — contact the vendor for a quote.`;
      break;
    default:
      freeAnswer = `No, ${name} is a paid tool.${fromPrice} Check the official site for any current trial.`;
  }
  faqs.push({ q: `Is ${name} free?`, a: freeAnswer });

  if (plans.length >= 2) {
    faqs.push({
      q: `How much does ${name} cost?`,
      a: `${name} pricing: ${plans
        .slice(0, 4)
        .map((p) => `${p.name} — ${formatPlanPrice(p)}`)
        .join('; ')}. Prices can change, so confirm on the official pricing page.`,
    });
  }

  // 3. Deal
  if (tool.deal?.discount) {
    faqs.push({
      q: `Is there ${article(name)} ${name} discount or promo code?`,
      a: `Yes — ToolverAI currently lists a verified ${name} offer: ${tool.deal.discount}${tool.deal.description ? ` (${tool.deal.description.replace(/\.$/, '')})` : ''}. See all current offers on the AI deals page.`,
    });
  }

  // 4. Platforms / API
  const platforms = (tool.platforms || []).filter(Boolean);
  if (platforms.length) {
    const apiListed = platforms.includes('API');
    faqs.push({
      q: `What platforms does ${name} support?`,
      a: `${name} is available on ${joinList(platforms)}.${tool.hasApi && !apiListed ? ' It also offers an API for developers.' : ''}`,
    });
  }

  // 5. Who is it for?
  const audience = (tool.targetAudience || []).filter(Boolean);
  if (audience.length) {
    faqs.push({
      q: `Who should use ${name}?`,
      a: `${name} is best suited to ${joinList(audience.map((a) => a.toLowerCase()))} looking for ${article(noun)} ${noun}.`,
    });
  }

  // 6. Alternatives — the tool's own editorial list first (well-known rivals), then the most-visited
  //    tools in the same category to fill up to four.
  const selfKey = (tool.slug || tool.id || '').toLowerCase();
  const seen = new Set<string>([name.toLowerCase()]);
  const alts: string[] = [];
  const add = (n?: string) => {
    const clean = String(n || '').trim();
    if (clean && !seen.has(clean.toLowerCase()) && alts.length < 4) {
      seen.add(clean.toLowerCase());
      alts.push(clean);
    }
  };
  (tool.alternatives || []).forEach((n: string) => add(n));
  allTools
    .filter((t) => t && t.name && (t.slug || t.id || '').toLowerCase() !== selfKey && t.category === tool.category)
    .sort((a, b) => (Number(b.monthlyVisits) || 0) - (Number(a.monthlyVisits) || 0))
    .forEach((t) => add(t.name));
  if (alts.length) {
    faqs.push({
      q: `What are the best ${name} alternatives?`,
      a: `Popular ${name} alternatives include ${joinList(alts)}. Compare them side by side on pricing, features and traffic with the ToolverAI AI comparison tool.`,
    });
  }

  return faqs;
}
