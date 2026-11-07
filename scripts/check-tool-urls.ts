/**
 * Audits every tool's outbound `url` in MongoDB (crawl reports flag 404s and redirect chains).
 *
 *   npx tsx scripts/check-tool-urls.ts            # report only
 *   npx tsx scripts/check-tool-urls.ts --write    # apply the safe fixes below (backs up first)
 *
 * Safe fixes (only these are written):
 *   - permanent redirect (301/308) that lands on the SAME site and returns 200 -> store the final URL
 *   - 404/410 on a page or subdomain while the site's homepage returns 200 -> store the homepage
 * Never changed: 403/429/5xx (usually bot protection), whole-site failures (reported for a human).
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();
const WRITE = process.argv.includes('--write');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

type Hop = { url: string; status: number };
async function trace(url: string, maxHops = 6): Promise<{ hops: Hop[]; error?: string }> {
  const hops: Hop[] = [];
  let current = url;
  for (let i = 0; i < maxHops; i++) {
    try {
      const res = await fetch(current, { redirect: 'manual', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
      hops.push({ url: current, status: res.status });
      const loc = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && loc) {
        current = new URL(loc, current).toString();
        continue;
      }
      return { hops };
    } catch (e: any) {
      return { hops, error: e?.cause?.code || e?.message || 'fetch failed' };
    }
  }
  return { hops, error: 'too many redirects' };
}

/** "www.apps.example.co.uk" -> "example.co.uk" (good enough for same-site checks). */
function baseDomain(u: string): string {
  const host = new URL(u).hostname.replace(/^www\./, '');
  const parts = host.split('.');
  const twoLevelTld = /^(co|com|org|net|ac|gov)\.[a-z]{2}$/.test(parts.slice(-2).join('.'));
  return parts.slice(twoLevelTld ? -3 : -2).join('.');
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || 'toolver_db');
  const tools = await db.collection('tools').find({}, { projection: { id: 1, slug: 1, name: 1, url: 1 } }).toArray();

  const fixes: { id: string; slug: string; from: string; to: string; why: string }[] = [];
  const dead: string[] = [];
  const blocked: string[] = [];
  let ok = 0;

  const queue = [...tools];
  const worker = async () => {
    for (let t = queue.shift(); t; t = queue.shift()) {
      const url = String(t.url || '').trim();
      if (!/^https?:\/\//i.test(url)) continue;
      const { hops, error } = await trace(url);
      const last = hops[hops.length - 1];
      const first = hops[0];
      const label = `${t.slug} (${url})`;
      // A bare store homepage is a data error (the app's own listing URL was lost) — never "fix" it.
      const u = new URL(url);
      if (/^(apps\.apple\.com|play\.google\.com|chromewebstore\.google\.com)$/i.test(u.hostname) && u.pathname.replace(/\/+$/, '') === '') {
        dead.push(`${label}: generic store homepage, not the app's listing`);
        continue;
      }
      if (!last || error) {
        dead.push(`${label}: ${error || 'no response'}`);
        continue;
      }
      if (last.status === 200) {
        const permanent = hops.slice(0, -1).every((h) => h.status === 301 || h.status === 308);
        if (hops.length > 1 && permanent && baseDomain(last.url) === baseDomain(url)) {
          fixes.push({ id: t.id, slug: t.slug, from: url, to: last.url, why: `redirect ${first.status}` });
        } else ok++;
        continue;
      }
      if (last.status === 404 || last.status === 410) {
        const root = `https://${new URL(url).hostname.split('.').length > 2 && !new URL(url).hostname.startsWith('www.') ? 'www.' + baseDomain(url) : new URL(url).hostname}/`;
        const rootTrace = await trace(root);
        const rootLast = rootTrace.hops[rootTrace.hops.length - 1];
        if (rootLast?.status === 200 && baseDomain(rootLast.url) === baseDomain(url) && rootLast.url !== url) {
          fixes.push({ id: t.id, slug: t.slug, from: url, to: rootLast.url, why: `${last.status} -> site homepage` });
        } else {
          dead.push(`${label}: ${last.status}, homepage ${rootLast?.status ?? rootTrace.error}`);
        }
        continue;
      }
      blocked.push(`${label}: ${last.status}`);
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));

  console.log(`\nChecked ${tools.length} tools: ${ok} OK, ${fixes.length} fixable, ${dead.length} dead, ${blocked.length} blocked/other`);
  console.log('\nFixable:');
  fixes.forEach((f) => console.log(`  ${f.slug}: ${f.from} -> ${f.to} (${f.why})`));
  console.log('\nDead (needs a human decision):');
  dead.forEach((d) => console.log(`  ${d}`));
  console.log('\nBlocked / other (left alone, usually bot protection):');
  blocked.forEach((b) => console.log(`  ${b}`));

  if (WRITE && fixes.length) {
    const dir = path.join('D:/company page/ai-saas-listing-env/db-backups', new Date().toISOString().slice(0, 10));
    fs.mkdirSync(dir, { recursive: true });
    const backup = path.join(dir, `tool-urls-before-fix-${Date.now()}.json`);
    fs.writeFileSync(backup, JSON.stringify(fixes, null, 2));
    for (const f of fixes) {
      await db.collection('tools').updateOne({ id: f.id, url: f.from }, { $set: { url: f.to, updatedAt: new Date().toISOString() } });
    }
    console.log(`\nUpdated ${fixes.length} tool URLs. Backup of old values: ${backup}`);
  } else if (fixes.length) {
    console.log('\nRun with --write to apply the fixable changes.');
  }
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
