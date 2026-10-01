/**
 * ToolverAI — Server-Side IndexNow Integration
 * ==============================================
 * Production-ready utility for instant search engine indexing via IndexNow protocol.
 * Supported by Microsoft Bing, Yandex, Seznam, and Naver.
 *
 * Documentation: https://www.indexnow.org/documentation
 */

import { URL } from 'url';

export const INDEXNOW_DEFAULT_KEY = '918469d3edf54adf9868b52b9959d0de';
export const CANONICAL_SITE_URL = 'https://toolverai.com';
export const CANONICAL_HOST = 'toolverai.com';
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

export interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

export interface IndexNowResult {
  success: boolean;
  status: number;
  message: string;
  urlsSubmitted: string[];
  error?: string;
}

/**
 * Validates and sanitizes a single URL for IndexNow submission.
 * Enforces strict production rules:
 * - Only HTTPS
 * - Only canonical host (toolverai.com)
 * - Never admin URLs
 * - Never API URLs
 * - Never query parameters (strips search & hash to ensure canonical indexing)
 * - Never internal assets or source maps
 */
export function sanitizeAndValidateUrl(input: string, allowedHost = CANONICAL_HOST): string | null {
  if (!input || typeof input !== 'string') return null;

  try {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Convert relative path to full URL
    const fullUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${allowedHost}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;

    const parsed = new URL(fullUrl);

    // 1. Force HTTPS
    parsed.protocol = 'https:';

    // 2. Host matching (allow toolverai.com and www.toolverai.com, normalize to canonical)
    const hostname = parsed.hostname.toLowerCase();
    const targetHost = allowedHost.toLowerCase();
    if (hostname !== targetHost && hostname !== `www.${targetHost}`) {
      return null;
    }
    parsed.hostname = targetHost;

    // 3. Remove query parameters and hash fragments (prevents duplicate parameter indexing)
    parsed.search = '';
    parsed.hash = '';

    const pathname = parsed.pathname.toLowerCase();

    // 4. Reject admin routes
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      return null;
    }

    // 5. Reject API routes
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return null;
    }

    // 6. Reject private or asset files
    if (
      pathname.startsWith('/assets/') ||
      pathname.endsWith('.map') ||
      pathname.endsWith('.cjs') ||
      pathname.endsWith('.ts') ||
      pathname.endsWith('.json')
    ) {
      return null;
    }

    // Clean normalized URL without trailing slash (except root '/')
    const cleanPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
    return `${parsed.origin}${cleanPath}`;
  } catch {
    return null;
  }
}

/**
 * Filters a list of URLs, deduplicating and keeping only valid, canonical public pages.
 */
export function filterValidIndexNowUrls(urls: string[], allowedHost = CANONICAL_HOST): string[] {
  if (!Array.isArray(urls)) return [];
  const cleanSet = new Set<string>();

  for (const raw of urls) {
    const validated = sanitizeAndValidateUrl(raw, allowedHost);
    if (validated) {
      cleanSet.add(validated);
    }
  }

  // IndexNow protocol allows up to 10,000 URLs per batch
  return Array.from(cleanSet).slice(0, 10000);
}

/**
 * Returns the primary core public pages for on-demand or post-deployment submission.
 */
export function getCorePublicUrls(baseUrl = CANONICAL_SITE_URL): string[] {
  const base = baseUrl.replace(/\/+$/, '');
  return [
    `${base}/`,
    `${base}/rankings`,
    `${base}/deals`,
    `${base}/compare`,
    `${base}/categories`,
    `${base}/prompts`,
    `${base}/blog`,
    `${base}/about`,
  ];
}

/**
 * Submits a list of URLs to the IndexNow protocol.
 * Safe and resilient:
 * - Sanitizes all URLs against strict canonical rules
 * - Handles all HTTP response codes (200, 202, 400, 403, 422, 429)
 * - Never throws an uncaught error or crashes the caller
 * - Timeouts safely after 10s
 */
export async function submitToIndexNow(
  rawUrls: string[],
  options?: {
    baseUrl?: string;
    key?: string;
  }
): Promise<IndexNowResult> {
  const baseUrl = (options?.baseUrl || process.env.SITE_URL || CANONICAL_SITE_URL).replace(/\/+$/, '');
  const host = new URL(baseUrl).hostname;
  const key = (options?.key || process.env.INDEXNOW_KEY || INDEXNOW_DEFAULT_KEY).trim();

  // Validate and sanitize URLs
  const cleanUrls = filterValidIndexNowUrls(rawUrls, host);

  if (cleanUrls.length === 0) {
    return {
      success: true,
      status: 200,
      message: 'No valid canonical URLs needed submission (all URLs filtered or empty).',
      urlsSubmitted: [],
    };
  }

  const payload: IndexNowPayload = {
    host,
    key,
    keyLocation: `${baseUrl}/${key}.txt`,
    urlList: cleanUrls,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'ToolverAI-IndexNow/1.0 (+https://toolverai.com)',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const status = res.status;
    let message = '';
    let success = false;

    switch (status) {
      case 200:
        success = true;
        message = `OK (200): Successfully submitted ${cleanUrls.length} URLs to IndexNow.`;
        break;
      case 202:
        success = true;
        message = `Accepted (202): URLs received by IndexNow. Key validation may still be in progress.`;
        break;
      case 400:
        message = `Bad Request (400): Invalid request format or parameters.`;
        break;
      case 403:
        message = `Forbidden (403): Key not valid or key file could not be verified at ${payload.keyLocation}.`;
        break;
      case 422:
        message = `Unprocessable Entity (422): URLs do not belong to host ${host} or schema mismatch.`;
        break;
      case 429:
        message = `Too Many Requests (429): Rate limit exceeded. Too many requests sent.`;
        break;
      default:
        message = `IndexNow responded with unexpected HTTP status ${status}.`;
        break;
    }

    console.log(`[IndexNow] ${message}`);

    return {
      success,
      status,
      message,
      urlsSubmitted: cleanUrls,
      error: success ? undefined : message,
    };
  } catch (err: any) {
    const errorMsg = err.name === 'AbortError'
      ? 'IndexNow submission timed out after 10 seconds.'
      : (err?.message || 'Network error communicating with IndexNow.');

    console.warn(`[IndexNow Warning] ${errorMsg}`);

    return {
      success: false,
      status: 0,
      message: errorMsg,
      urlsSubmitted: cleanUrls,
      error: errorMsg,
    };
  }
}

/**
 * Helper to automatically trigger IndexNow when public tool content is created, updated, or deleted.
 * Submits the affected tool URL, its category landing page, and the primary directory hubs.
 */
export async function triggerToolContentChange(
  tool: { slug?: string; id?: string; category?: string; name?: string },
  action: 'create' | 'update' | 'delete',
  baseUrl = CANONICAL_SITE_URL
): Promise<IndexNowResult> {
  const toolSlug = (tool.slug || tool.name || tool.id || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const categorySlug = (tool.category || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const urls: string[] = [
    `${baseUrl}/`,
    `${baseUrl}/rankings`,
  ];

  if (toolSlug) {
    urls.push(`${baseUrl}/tool/${toolSlug}`);
  }

  if (categorySlug) {
    urls.push(`${baseUrl}/categories/${categorySlug}`);
  }

  console.log(`[IndexNow] Content ${action}: "${tool.name || toolSlug}" → Queuing ${urls.length} URLs`);
  return submitToIndexNow(urls, { baseUrl });
}
