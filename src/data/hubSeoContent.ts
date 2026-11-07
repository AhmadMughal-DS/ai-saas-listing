/**
 * Shared, crawlable copy for the hub pages that Search Console shows earning impressions
 * (/compare -> "ai comparison tool", "compare ai tools"; /deals -> "ai deals", "ai tools deals").
 *
 * The SAME text is rendered twice: by the server (SSR body + FAQPage JSON-LD, so Googlebot and
 * AI crawlers see it without JS) and by the React views (so the hydrated page matches the SSR
 * HTML — never show crawlers content users can't see).
 */

export interface SeoFaq {
  q: string;
  a: string;
}

export interface SeoSection {
  heading: string;
  /** Plain paragraphs. May contain inline links written as [text](/path). */
  paragraphs?: string[];
  /** Optional bullet list. Same inline-link syntax. */
  bullets?: string[];
}

export interface HubSeoContent {
  /** One- or two-sentence direct answer shown right under the H1 (answer-engine friendly). */
  answer: string;
  sections: SeoSection[];
  faqs: SeoFaq[];
}

export const COMPARE_HUB_CONTENT: HubSeoContent = {
  answer:
    'ToolverAI is a free AI comparison tool: pick any two or three AI tools and see their pricing model, estimated monthly traffic, key features, supported platforms, ratings and pros/cons side by side — no sign-up needed.',
  sections: [
    {
      heading: 'What is an AI comparison tool?',
      paragraphs: [
        'An AI comparison tool puts the facts you need to choose between AI products on one screen instead of ten browser tabs. Rather than reading each vendor’s marketing page, you compare the same fields for every tool: how it is priced, how many people use it, what it actually does, which platforms it runs on and where it falls short.',
        'ToolverAI covers 180+ AI tools across coding, writing, image, video, audio, data and agent categories, and every tool in the directory can be compared with any other.',
      ],
    },
    {
      heading: 'How to compare AI tools in 5 steps',
      bullets: [
        '**Define the job first.** "Write code in my IDE" and "generate marketing images" need different tools — start from the task, not the brand.',
        '**Check the pricing model.** Free, freemium, paid or usage-based. Usage-based APIs get expensive at volume; flat subscriptions are predictable.',
        '**Look at adoption.** Estimated monthly traffic shows which tools have momentum, a community and long-term support.',
        '**Compare the features you will actually use.** Ignore long feature lists — check the 3–4 capabilities your workflow depends on.',
        '**Test the free tier or trial.** Shortlist two tools here, then run your own real task through both before paying.',
      ],
    },
    {
      heading: 'What we compare for every AI tool',
      bullets: [
        'Pricing model and starting price',
        'Estimated monthly web visits (adoption and momentum)',
        'Key features and core use case',
        'Supported platforms (web, desktop, mobile, API, browser extension)',
        'Community rating and review count',
        'Pros, cons and best-fit user',
        'Current verified deals or discounts, when available',
      ],
    },
  ],
  faqs: [
    {
      q: 'What is the best free AI comparison tool?',
      a: 'ToolverAI’s Compare page is free and needs no account. You can compare up to three AI tools side by side on pricing, traffic, features, platforms and ratings, and read curated head-to-head pages such as Cursor vs GitHub Copilot or ChatGPT vs Perplexity.',
    },
    {
      q: 'How do I compare AI tools?',
      a: 'Start from the task you need done, shortlist two or three tools in that category, then compare pricing model, real-world adoption, the specific features you depend on and supported platforms. Finish by testing each tool’s free tier on your own work before you pay.',
    },
    {
      q: 'Which AI tools can I compare on ToolverAI?',
      a: 'Any tool in the directory — more than 180 AI tools across Coding, Productivity, Copywriting, Image AI, Video AI, Audio AI, Data & Analytics and AI Agents, including ChatGPT, Claude, Perplexity, Cursor, DeepSeek, Midjourney, ElevenLabs and Suno.',
    },
    {
      q: 'How is monthly traffic estimated?',
      a: 'Traffic figures are third-party web-visit estimates refreshed regularly. They are best used to compare relative popularity between tools, not as exact user counts. See our ranking methodology for details.',
    },
    {
      q: 'Is ToolverAI paid by the tools it compares?',
      a: 'Some listings include affiliate links or sponsored placements, which are always disclosed. Sponsorship never changes a tool’s data, rating or position in a comparison. Read our affiliate disclosure and editorial policy for details.',
    },
  ],
};

export const DEALS_HUB_CONTENT: HubSeoContent = {
  answer:
    'The best AI deals right now are verified discounts, promo codes and extended free trials on AI tools such as ChatGPT, Claude, Cursor, Perplexity, ElevenLabs, Suno and Jasper. Every deal on this page is checked by the ToolverAI team and links to the official tool.',
  sections: [
    {
      heading: 'How to get AI tools cheaper',
      bullets: [
        '**Use the free tier first.** Most AI tools are freemium — the free plan is often enough to decide if a paid plan is worth it.',
        '**Pay annually.** Annual billing typically saves 15–20% compared with paying month to month.',
        '**Look for student, startup and non-profit pricing.** Many AI vendors offer education or startup programs on request.',
        '**Stack a verified promo code.** Apply a code from this page at checkout on the official site.',
        '**Watch launch and seasonal sales.** Black Friday, Cyber Monday and product launches are when the deepest AI discounts appear.',
        '**Compare before you commit.** Use the [AI comparison tool](/compare) to check a cheaper alternative does the job first.',
      ],
    },
    {
      heading: 'How we verify AI deals',
      paragraphs: [
        'Each deal is checked against the tool’s official pricing page before it is listed, and expired offers are removed. We only link to official vendor sites — never to resellers or key marketplaces. Some deal links are affiliate links; this never changes which deals we list or how they are ranked.',
      ],
    },
  ],
  faqs: [
    {
      q: 'Where can I find the best AI tool deals?',
      a: 'ToolverAI’s Deals page lists verified AI software discounts, promo codes and extended trials in one place, each checked against the vendor’s official pricing and updated regularly.',
    },
    {
      q: 'Are these AI promo codes free to use?',
      a: 'Yes. Copy the code, open the official tool from the deal card and apply the code at checkout. There is no cost to use a code on ToolverAI.',
    },
    {
      q: 'Do AI tools have lifetime deals?',
      a: 'Some smaller AI tools offer one-time-payment lifetime deals, usually at launch. Large platforms such as ChatGPT or Claude rarely do — for those, annual billing and free tiers are the most reliable way to save.',
    },
    {
      q: 'Can I get AI tools for free?',
      a: 'Most popular AI tools, including ChatGPT, Claude, Perplexity and many image and audio generators, have a free plan with usage limits. Browse tools by category on ToolverAI and filter for free or freemium pricing.',
    },
    {
      q: 'How often are AI deals updated?',
      a: 'Deals are reviewed regularly and expired offers are removed. If a code stops working, the official site’s current pricing still applies — let us know and we will re-check it.',
    },
  ],
};

/** Inline-markdown -> HTML for the tiny subset used above (**bold** and [text](/path)). Escapes first. */
export function seoInlineToHtml(text: string): string {
  const esc = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return esc
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, '<a href="$2">$1</a>');
}

/** Server-side HTML for a hub content block (sections + FAQ). */
export function hubContentToHtml(content: HubSeoContent): string {
  const sections = content.sections
    .map((s) => {
      const paras = (s.paragraphs || []).map((p) => `<p>${seoInlineToHtml(p)}</p>`).join('\n');
      const list = s.bullets?.length
        ? `<ul>\n${s.bullets.map((b) => `<li>${seoInlineToHtml(b)}</li>`).join('\n')}\n</ul>`
        : '';
      return `<section>\n<h2>${seoInlineToHtml(s.heading)}</h2>\n${paras}\n${list}\n</section>`;
    })
    .join('\n');
  return `${sections}\n${faqsToHtml(content.faqs)}`;
}

export function faqsToHtml(faqs: SeoFaq[], heading = 'Frequently Asked Questions'): string {
  if (!faqs.length) return '';
  return `<section>\n<h2>${seoInlineToHtml(heading)}</h2>\n${faqs
    .map((f) => `<h3>${seoInlineToHtml(f.q)}</h3>\n<p>${seoInlineToHtml(f.a)}</p>`)
    .join('\n')}\n</section>`;
}

/** schema.org FAQPage JSON-LD (plain text answers). */
export function faqPageJsonLd(faqs: SeoFaq[], pageUrl: string): Record<string, any> {
  const strip = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${pageUrl}#faq`,
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: strip(f.q),
      acceptedAnswer: { '@type': 'Answer', text: strip(f.a) },
    })),
  };
}
