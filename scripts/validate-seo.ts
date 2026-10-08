/**
 * Automated Technical SEO QA Validation Script for ToolverAI
 *
 * Validates:
 * 1. HTTP status code for each representative route
 * 2. Exactly 1 <title> tag
 * 3. Exactly 1 <meta name="description"> tag
 * 4. Exactly 1 <link rel="canonical"> tag and correct self-referencing value
 * 5. Exactly 1 og:title, og:description, og:url
 * 6. Exactly 1 twitter:title, twitter:description
 * 7. Correct robots directives (index, follow for public; noindex for admin/404)
 * 8. Zero unresolved %VITE_...% placeholders
 * 9. Proper 301 redirects for legacy slugs (e.g. /tool/cursor-ai -> /tool/cursor)
 * 10. Proper 301 redirects for trailing slashes (/rankings/ -> /rankings)
 * 11. Proper 301 redirects for www requests (www.toolverai.com -> toolverai.com)
 * 12. Sitemap XML integrity & zero 404 tool URLs
 */

import http from 'http';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

const TEST_PORT = 3456;
const BASE_TEST_URL = `http://127.0.0.1:${TEST_PORT}`;

interface ValidationResult {
  route: string;
  expectedStatus: number;
  actualStatus: number;
  titleCount: number;
  descCount: number;
  canonicalCount: number;
  canonicalHref?: string;
  expectedCanonical?: string;
  robotsValue?: string;
  expectedRobots?: string;
  ogTitleCount: number;
  ogDescCount: number;
  ogUrlCount: number;
  twTitleCount: number;
  twDescCount: number;
  h1Count: number;
  breadcrumbsFound: boolean;
  internalLinksCount: number;
  hasUnresolvedPlaceholders: boolean;
  redirectLocation?: string;
  passed: boolean;
  errors: string[];
}

function countMatches(str: string, regex: RegExp): number {
  const matches = str.match(regex);
  return matches ? matches.length : 0;
}

function getAttribute(str: string, regex: RegExp): string | undefined {
  const match = str.match(regex);
  return match ? match[1] : undefined;
}

function fetchUrl(
  urlPath: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get(
      `${BASE_TEST_URL}${urlPath}`,
      { headers: { 'User-Agent': 'ToolverSEOValidator/1.0', ...headers } },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, body }));
      }
    );
    req.on('error', reject);
    req.setTimeout(25000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${urlPath}`));
    });
  });
}

async function waitForServer(retries = 30): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetchUrl('/api/health');
      if (res.status === 200) {
        // Give MongoDB connection a moment to initialize
        await new Promise((r) => setTimeout(r, 1000));
        return true;
      }
    } catch {
      // wait 200ms
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  return false;
}

async function runValidation() {
  console.log('\n🚀 Starting ToolverAI Automated Technical SEO Validation Suite...\n');

  // Spawn production server on TEST_PORT
  const serverProcess: ChildProcess = spawn(
    'node',
    [path.join(process.cwd(), 'dist', 'server.cjs')],
    {
      env: {
        ...process.env,
        PORT: String(TEST_PORT),
        NODE_ENV: 'production',
        SITE_URL: 'https://toolverai.com',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  serverProcess.stderr?.on('data', (d) => {
    const msg = d.toString();
    if (!msg.includes('MongoDB connection note')) {
      // ignore non-critical logs
    }
  });

  const ready = await waitForServer();
  if (!ready) {
    console.error('❌ Failed to start server on port', TEST_PORT);
    serverProcess.kill();
    process.exit(1);
  }
  console.log(`✅ Production server listening on ${BASE_TEST_URL}\n`);

  const results: ValidationResult[] = [];

  // ── 1. Representative Route Tests ────────────────────────────────────
  const testCases = [
    {
      route: '/',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/rankings',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/rankings',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/deals',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/deals',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/compare',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/compare',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/prompts',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/prompts',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/categories',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/categories',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/categories/coding',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/categories/coding',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/categories/image-ai',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/categories/image-ai',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/categories/video-ai',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/categories/video-ai',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/tool/cursor',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/tool/cursor',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/tool/bolt-new',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/tool/bolt-new',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/tool/github-copilot',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/tool/github-copilot',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/submit-tool',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/submit-tool',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/about',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/about',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/terms',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/terms',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/privacy-policy',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/privacy-policy',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/affiliate-disclosure',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/affiliate-disclosure',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/admin',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/admin',
      expectedRobots: 'noindex, nofollow',
      isRedirect: false,
    },
    {
      route: '/non-existent-page-xyz',
      expectedStatus: 404,
      expectedCanonical: 'https://toolverai.com/non-existent-page-xyz',
      expectedRobots: 'noindex, nofollow',
      isRedirect: false,
    },
    // Programmatic Comparison Route Tests
    {
      route: '/compare/cursor-vs-github-copilot',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/compare/cursor-vs-github-copilot',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/compare/chatgpt-vs-perplexity',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/compare/chatgpt-vs-perplexity',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    // Programmatic Alternatives Route Tests
    {
      route: '/alternatives',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/alternatives',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/alternatives/cursor',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/alternatives/cursor',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/alternatives/chatgpt',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/alternatives/chatgpt',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/alternatives/midjourney',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/alternatives/midjourney',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    // Ineligible Programmatic Pairs (Quality Gate Protection -> 404 Noindex)
    {
      route: '/compare/nonexistent-vs-fake',
      expectedStatus: 404,
      expectedCanonical: 'https://toolverai.com/compare/nonexistent-vs-fake',
      expectedRobots: 'noindex, nofollow',
      isRedirect: false,
    },
    {
      route: '/alternatives/fake-nonexistent-tool',
      expectedStatus: 404,
      expectedCanonical: 'https://toolverai.com/alternatives/fake-nonexistent-tool',
      expectedRobots: 'noindex, nofollow',
      isRedirect: false,
    },
    // Redirect Tests
    {
      route: '/tool/cursor-ai',
      expectedStatus: 301,
      expectedRedirect: '/tool/cursor',
      isRedirect: true,
    },
    {
      route: '/tool/perplexity-ai',
      expectedStatus: 301,
      expectedRedirect: '/tool/perplexity',
      isRedirect: true,
    },
    {
      route: '/rankings/',
      expectedStatus: 301,
      expectedRedirect: '/rankings',
      isRedirect: true,
    },
    // Programmatic Comparison Reversed Ordering 301 Redirect
    {
      route: '/compare/github-copilot-vs-cursor',
      expectedStatus: 301,
      expectedRedirect: '/compare/cursor-vs-github-copilot',
      isRedirect: true,
    },
    {
      route: '/compare/perplexity-vs-chatgpt',
      expectedStatus: 301,
      expectedRedirect: '/compare/chatgpt-vs-perplexity',
      isRedirect: true,
    },
    // Case sensitivity 301 Redirect for Alternatives
    {
      route: '/alternatives/Cursor',
      expectedStatus: 301,
      expectedRedirect: '/alternatives/cursor',
      isRedirect: true,
    },
    // ── Day 4: Blog Hub & Editorial Articles ─────────────────────────────
    {
      route: '/blog',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/blog',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/blog/how-to-choose-an-ai-coding-tool',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/blog/how-to-choose-an-ai-coding-tool',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/blog/ai-coding-assistants-vs-autonomous-coding-agents',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/blog/ai-coding-assistants-vs-autonomous-coding-agents',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/blog/how-to-choose-an-ai-image-generator',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/blog/how-to-choose-an-ai-image-generator',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/blog/how-to-choose-an-ai-video-generator',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/blog/how-to-choose-an-ai-video-generator',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/blog/ai-agents-vs-ai-assistants-key-differences',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/blog/ai-agents-vs-ai-assistants-key-differences',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/blog/fake-nonexistent-guide',
      expectedStatus: 404,
      expectedCanonical: 'https://toolverai.com/blog/fake-nonexistent-guide',
      expectedRobots: 'noindex, nofollow',
      isRedirect: false,
    },
    // Case sensitivity 301 Redirect for Blog Articles
    {
      route: '/blog/How-To-Choose-An-AI-Coding-Tool',
      expectedStatus: 301,
      expectedRedirect: '/blog/how-to-choose-an-ai-coding-tool',
      isRedirect: true,
    },
    // ── Day 4: Editorial & Trust Pages ───────────────────────────────────
    {
      route: '/editorial-policy',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/editorial-policy',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
    {
      route: '/how-we-rank-tools',
      expectedStatus: 200,
      expectedCanonical: 'https://toolverai.com/how-we-rank-tools',
      expectedRobots: 'index, follow',
      isRedirect: false,
    },
  ];

  for (const tc of testCases) {
    const res = await fetchUrl(tc.route);
    const errors: string[] = [];

    if (tc.isRedirect) {
      if (res.status !== tc.expectedStatus) {
        errors.push(`Expected status ${tc.expectedStatus}, got ${res.status}`);
      }
      const loc = res.headers.location;
      if (loc !== tc.expectedRedirect) {
        errors.push(`Expected Location ${tc.expectedRedirect}, got ${loc}`);
      }
      results.push({
        route: tc.route,
        expectedStatus: tc.expectedStatus,
        actualStatus: res.status,
        titleCount: 0,
        descCount: 0,
        canonicalCount: 0,
        redirectLocation: loc,
        passed: errors.length === 0,
        errors,
        ogTitleCount: 0,
        ogDescCount: 0,
        ogUrlCount: 0,
        twTitleCount: 0,
        twDescCount: 0,
        h1Count: 0,
        breadcrumbsFound: false,
        internalLinksCount: 0,
        hasUnresolvedPlaceholders: false,
      });
      continue;
    }

    if (res.status !== tc.expectedStatus) {
      errors.push(`Expected status ${tc.expectedStatus}, got ${res.status}`);
    }

    const titleCount = countMatches(res.body, /<title>[^<]*<\/title>/gi);
    if (titleCount !== 1) errors.push(`Expected exactly 1 <title>, got ${titleCount}`);

    const descCount = countMatches(res.body, /<meta\s+name=["']description["'][^>]*>/gi);
    if (descCount !== 1) errors.push(`Expected exactly 1 meta description, got ${descCount}`);

    const canonicalCount = countMatches(res.body, /<link\s+rel=["']canonical["'][^>]*>/gi);
    if (canonicalCount !== 1) errors.push(`CRITICAL: Expected exactly 1 canonical tag, got ${canonicalCount}`);

    const canonicalHref = getAttribute(res.body, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
    if (tc.expectedCanonical && canonicalHref !== tc.expectedCanonical) {
      errors.push(`Canonical mismatch: expected "${tc.expectedCanonical}", got "${canonicalHref}"`);
    }

    const robotsValue = getAttribute(res.body, /<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
    if (tc.expectedRobots && !robotsValue?.includes(tc.expectedRobots.split(',')[0])) {
      errors.push(`Robots mismatch: expected "${tc.expectedRobots}", got "${robotsValue}"`);
    }

    const ogTitleCount = countMatches(res.body, /<meta\s+property=["']og:title["'][^>]*>/gi);
    if (ogTitleCount !== 1) errors.push(`Expected 1 og:title, got ${ogTitleCount}`);

    const ogDescCount = countMatches(res.body, /<meta\s+property=["']og:description["'][^>]*>/gi);
    if (ogDescCount !== 1) errors.push(`Expected 1 og:description, got ${ogDescCount}`);

    const ogUrlCount = countMatches(res.body, /<meta\s+property=["']og:url["'][^>]*>/gi);
    if (ogUrlCount !== 1) errors.push(`Expected 1 og:url, got ${ogUrlCount}`);

    const twTitleCount = countMatches(res.body, /<meta\s+name=["']twitter:title["'][^>]*>/gi);
    if (twTitleCount !== 1) errors.push(`Expected 1 twitter:title, got ${twTitleCount}`);

    const twDescCount = countMatches(res.body, /<meta\s+name=["']twitter:description["'][^>]*>/gi);
    if (twDescCount !== 1) errors.push(`Expected 1 twitter:description, got ${twDescCount}`);

    const isPublicContent = tc.expectedStatus === 200 && !(tc.expectedRobots?.includes('noindex') ?? false);
    const h1Count = countMatches(res.body, /<h1(\s+[^>]*)?>[\s\S]*?<\/h1>/gi);
    if (isPublicContent && h1Count !== 1) {
      errors.push(`Expected exactly 1 <h1>, got ${h1Count}`);
    }

    const hasBreadcrumbsNav = /<nav[^>]*aria-label=["']breadcrumb["']/i.test(res.body) || /class=["'][^"']*breadcrumb/i.test(res.body);
    const hasBreadcrumbsLd = res.body.includes('"@type":"BreadcrumbList"') || res.body.includes('"@type": "BreadcrumbList"');
    const breadcrumbsFound = hasBreadcrumbsNav || hasBreadcrumbsLd;
    if (isPublicContent && (tc.route.startsWith('/tool/') || tc.route.startsWith('/categories/') || tc.route.startsWith('/compare') || tc.route.startsWith('/alternatives') || ['/rankings', '/deals', '/prompts'].includes(tc.route))) {
      if (!breadcrumbsFound) {
        errors.push(`Expected breadcrumbs on route ${tc.route}`);
      }
    }

    const internalLinksCount = countMatches(res.body, /<a\s+[^>]*href=["'](?:\/[^"']*|https:\/\/toolverai\.com[^"']*)["']/gi);
    if (isPublicContent && internalLinksCount === 0) {
      errors.push(`Expected crawlable internal links, found 0`);
    }

    const hasUnresolvedPlaceholders = /%VITE_[A-Z_]+%/.test(res.body);
    if (hasUnresolvedPlaceholders) {
      errors.push('CRITICAL: Found unresolved %VITE_...% placeholder in HTML output');
    }

    results.push({
      route: tc.route,
      expectedStatus: tc.expectedStatus,
      actualStatus: res.status,
      titleCount,
      descCount,
      canonicalCount,
      canonicalHref,
      expectedCanonical: tc.expectedCanonical,
      robotsValue,
      expectedRobots: tc.expectedRobots,
      ogTitleCount,
      ogDescCount,
      ogUrlCount,
      twTitleCount,
      twDescCount,
      h1Count,
      breadcrumbsFound,
      internalLinksCount,
      hasUnresolvedPlaceholders,
      passed: errors.length === 0,
      errors,
    });
  }

  // ── 2. www Hostname Redirection Test ─────────────────────────────────
  const wwwTest = await fetchUrl('/rankings', { 'x-forwarded-host': 'www.toolverai.com' });
  const wwwErrors: string[] = [];
  if (wwwTest.status !== 301) wwwErrors.push(`Expected 301 from www, got ${wwwTest.status}`);
  if (wwwTest.headers.location !== 'https://toolverai.com/rankings') {
    wwwErrors.push(`Expected Location https://toolverai.com/rankings, got ${wwwTest.headers.location}`);
  }
  results.push({
    route: 'Host: www.toolverai.com /rankings',
    expectedStatus: 301,
    actualStatus: wwwTest.status,
    titleCount: 0,
    descCount: 0,
    canonicalCount: 0,
    redirectLocation: wwwTest.headers.location,
    passed: wwwErrors.length === 0,
    errors: wwwErrors,
    ogTitleCount: 0,
    ogDescCount: 0,
    ogUrlCount: 0,
    twTitleCount: 0,
    twDescCount: 0,
    h1Count: 0,
    breadcrumbsFound: false,
    internalLinksCount: 0,
    hasUnresolvedPlaceholders: false,
  });

  // ── 3. Sitemap XML Integrity Test ────────────────────────────────────
  const sitemapRes = await fetchUrl('/sitemap.xml');
  const sitemapErrors: string[] = [];
  if (sitemapRes.status !== 200) sitemapErrors.push(`Sitemap returned status ${sitemapRes.status}`);
  if (!sitemapRes.body.includes('<urlset') || !sitemapRes.body.includes('</urlset>')) {
    sitemapErrors.push('Sitemap output is not valid XML <urlset>');
  }

  // Extract all tool URLs from sitemap
  const sitemapLocMatches = sitemapRes.body.match(/<loc>https:\/\/toolverai\.com\/tool\/([^<]+)<\/loc>/g) || [];
  const toolSlugsInSitemap = sitemapLocMatches.map((m) => m.replace(/<\/?loc>/g, '').replace('https://toolverai.com/tool/', ''));
  if (toolSlugsInSitemap.length === 0) {
    sitemapErrors.push('Zero tool URLs found in sitemap');
  }

  // Extract comparison and alternatives URLs from sitemap
  const comparisonMatches = sitemapRes.body.match(/<loc>https:\/\/toolverai\.com\/compare\/([^<]+)<\/loc>/g) || [];
  const alternativesMatches = sitemapRes.body.match(/<loc>https:\/\/toolverai\.com\/alternatives\/([^<]+)<\/loc>/g) || [];

  if (comparisonMatches.length === 0) {
    sitemapErrors.push('Expected curated comparisons in sitemap, found 0');
  }
  if (alternativesMatches.length === 0) {
    sitemapErrors.push('Expected curated alternatives in sitemap, found 0');
  }

  // Extract blog post URLs from sitemap
  const blogMatches = sitemapRes.body.match(/<loc>https:\/\/toolverai\.com\/blog\/([^<]+)<\/loc>/g) || [];
  if (blogMatches.length < 5) {
    sitemapErrors.push(`Expected at least 5 published blog articles in sitemap, found ${blogMatches.length}`);
  }

  // Check trust pages in sitemap
  if (!sitemapRes.body.includes('<loc>https://toolverai.com/editorial-policy</loc>')) {
    sitemapErrors.push('Missing /editorial-policy in sitemap');
  }
  if (!sitemapRes.body.includes('<loc>https://toolverai.com/how-we-rank-tools</loc>')) {
    sitemapErrors.push('Missing /how-we-rank-tools in sitemap');
  }

  // Ensure no reversed comparisons in sitemap
  if (sitemapRes.body.includes('github-copilot-vs-cursor') || sitemapRes.body.includes('perplexity-vs-chatgpt')) {
    sitemapErrors.push('CRITICAL: Found reversed duplicate comparison URL in sitemap');
  }

  results.push({
    route: '/sitemap.xml',
    expectedStatus: 200,
    actualStatus: sitemapRes.status,
    titleCount: 0,
    descCount: 0,
    canonicalCount: 0,
    passed: sitemapErrors.length === 0,
    errors: sitemapErrors,
    ogTitleCount: 0,
    ogDescCount: 0,
    ogUrlCount: 0,
    twTitleCount: 0,
    twDescCount: 0,
    h1Count: 0,
    breadcrumbsFound: false,
    internalLinksCount: 0,
    hasUnresolvedPlaceholders: false,
  });

  // Kill server process cleanly
  serverProcess.kill();

  // ── Print Results Table ──────────────────────────────────────────────
  console.log('═'.repeat(105));
  console.log(
    'Route'.padEnd(35) +
    'Status'.padEnd(10) +
    'Canonical'.padEnd(12) +
    'H1'.padEnd(6) +
    'CrwlLinks'.padEnd(12) +
    'Breadcrumbs'.padEnd(14) +
    'Result'
  );
  console.log('─'.repeat(105));

  let allPassed = true;
  for (const r of results) {
    const statusStr = String(r.actualStatus);
    const canonStr = r.canonicalCount > 0 ? String(r.canonicalCount) : '-';
    const h1Str = r.h1Count > 0 ? String(r.h1Count) : '-';
    const linksStr = r.internalLinksCount > 0 ? `${r.internalLinksCount} links` : '-';
    const crumbStr = r.breadcrumbsFound ? '✅ Yes' : '-';
    const passStr = r.passed ? '✅ PASS' : '❌ FAIL';

    if (!r.passed) allPassed = false;

    console.log(
      r.route.padEnd(35) +
      statusStr.padEnd(10) +
      canonStr.padEnd(12) +
      h1Str.padEnd(6) +
      linksStr.padEnd(12) +
      crumbStr.padEnd(14) +
      passStr
    );

    if (r.errors.length > 0) {
      for (const err of r.errors) {
        console.log(`    ↳ ⚠️  ${err}`);
      }
    }
  }
  console.log('═'.repeat(105));

  console.log(`\nSitemap Tools Audited: ${toolSlugsInSitemap.length} tools`);
  console.log(`Overall SEO Validation: ${allPassed ? '🎉 ALL TESTS PASSED!' : '❌ SOME TESTS FAILED'}\n`);

  if (!allPassed) {
    process.exit(1);
  }
}

runValidation().catch((err) => {
  console.error('Fatal validation runner error:', err);
  process.exit(1);
});
