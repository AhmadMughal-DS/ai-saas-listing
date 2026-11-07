/**
 * Finds internal links in editorial blog articles that point at pages which 404:
 *   /tool/{slug}          -> tool not in the live directory
 *   /compare/{a-vs-b}     -> pair not curated, or either tool not live
 *   /alternatives/{slug}  -> not curated, or tool not live
 *   /blog/{slug}          -> article not published
 * Also checks each article's related*Slugs arrays.
 *
 * Usage:
 *   npx tsx scripts/validate-blog-links.ts                    # fetches https://toolverai.com/api/tools
 *   npx tsx scripts/validate-blog-links.ts path/to/tools.json # offline
 * Exits 1 when any dead link is found.
 */
import fs from 'fs';
import { PUBLISHED_ARTICLES } from '../src/data/blogData';
import { getLiveComparisons, getLiveAlternatives } from '../src/utils/programmaticSeo';

async function loadTools(): Promise<any[]> {
  const file = process.argv[2];
  const raw = file
    ? JSON.parse(fs.readFileSync(file, 'utf-8'))
    : await (await fetch('https://toolverai.com/api/tools')).json();
  return Array.isArray(raw) ? raw : raw.tools || raw.data || [];
}

async function main() {
  const tools = await loadTools();
  if (!tools.length) throw new Error('No tools loaded');
  const toolSlugs = new Set(tools.map((t) => String(t.slug || t.id).toLowerCase()));
  const compSlugs = new Set(getLiveComparisons(tools).map((c) => c.canonicalSlug));
  const altSlugs = new Set(getLiveAlternatives(tools).map((a) => a.toolSlug));
  const blogSlugs = new Set(PUBLISHED_ARTICLES.filter((a) => a.status === 'published').map((a) => a.slug));

  const ok = (kind: string, slug: string) =>
    kind === 'tool' ? toolSlugs.has(slug)
      : kind === 'compare' ? compSlugs.has(slug)
      : kind === 'alternatives' ? altSlugs.has(slug)
      : kind === 'blog' ? blogSlugs.has(slug)
      : true;

  let dead = 0;
  for (const a of PUBLISHED_ARTICLES) {
    const problems: string[] = [];
    for (const m of a.content.matchAll(/\]\(\/(tool|compare|alternatives|blog)\/([a-z0-9-]+)\)/g)) {
      if (!ok(m[1], m[2])) problems.push(`body  /${m[1]}/${m[2]}`);
    }
    const rel: [string, string[] | undefined][] = [
      ['tool', a.relatedToolSlugs],
      ['compare', a.relatedComparisonSlugs],
      ['alternatives', a.relatedAlternativeSlugs],
      ['blog', a.relatedArticleSlugs],
    ];
    for (const [kind, list] of rel) for (const s of list || []) if (!ok(kind, s)) problems.push(`related ${kind}: ${s}`);
    if (problems.length) {
      dead += problems.length;
      console.log(`\n${a.slug}`);
      for (const p of [...new Set(problems)]) console.log(`  - ${p}`);
    }
  }
  console.log(dead ? `\n${dead} dead link(s).` : 'All blog links resolve.');
  process.exit(dead ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
