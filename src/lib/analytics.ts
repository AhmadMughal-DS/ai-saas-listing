/**
 * ToolverAI — GA4 Analytics Module
 * ==================================
 * Single source of truth for all Google Analytics 4 event tracking.
 *
 * Architecture:
 * - GA4 gtag.js is loaded once in index.html via the VITE_GA4_MEASUREMENT_ID env var.
 * - The initial `gtag('config', ...)` call in index.html uses `send_page_view: false`
 *   so we control exactly when page_view fires (avoiding duplicates on SPA navigations).
 * - All components import from this module — no direct `window.gtag` calls anywhere else.
 *
 * Usage:
 *   import { trackPageView, trackEvent, GA4Events } from '@/src/lib/analytics';
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** Mirrors the gtag global so TypeScript is happy without a separate @types package */
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: unknown[];
  }
}

/** GA4 Measurement ID — read once at module load from Vite env */
const MEASUREMENT_ID: string = (import.meta as any).env?.VITE_GA4_MEASUREMENT_ID ?? '';

/** Returns true when GA4 is loaded and a real Measurement ID is configured */
function isGA4Available(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.gtag === 'function' &&
    MEASUREMENT_ID.startsWith('G-')
  );
}

// ── Page View ─────────────────────────────────────────────────────────────────

/**
 * Sends a GA4 page_view for SPA navigation.
 *
 * Replaces the automatic page_view that is suppressed in index.html
 * (`send_page_view: false`). Call this on every client-side route change.
 *
 * @param path   - The new pathname, e.g. "/tool/chatgpt"
 * @param title  - Optional page title; defaults to document.title
 */
export function trackPageView(path: string, title?: string): void {
  if (!isGA4Available()) return;
  try {
    window.gtag!('config', MEASUREMENT_ID, {
      page_path: path,
      page_title: title ?? document.title,
      send_page_view: true,
    });
  } catch {
    // GA4 blocked by browser extension — silent fail
  }
}

// ── Custom Events ─────────────────────────────────────────────────────────────

/**
 * Generic event helper. All specific helpers below use this internally.
 * Components should prefer the specific helpers for type safety.
 */
export function trackEvent(eventName: string, params: Record<string, unknown> = {}): void {
  if (!isGA4Available()) return;
  try {
    window.gtag!('event', eventName, params);
  } catch {
    // silent
  }
}

// ── Typed Event Helpers ───────────────────────────────────────────────────────

/**
 * Fired when a user types in the main search box (debounced at call site —
 * only fire after the user has paused typing).
 */
export function trackSearch(params: {
  search_term: string;
  result_count?: number;
}): void {
  trackEvent('search', {
    search_term: params.search_term,
    result_count: params.result_count ?? undefined,
  });
}

/**
 * Fired when the user navigates to a tool's detail page.
 */
export function trackToolView(params: {
  tool_id: string;
  tool_name: string;
  tool_category: string;
  tool_pricing: string;
  page_path: string;
}): void {
  trackEvent('tool_view', params);
}

/**
 * Fired when the user views a category section or navigates to a category URL.
 */
export function trackCategoryView(params: {
  category_name: string;
  tool_count?: number;
  page_path?: string;
}): void {
  trackEvent('category_view', {
    category_name: params.category_name,
    tool_count: params.tool_count,
    page_path: params.page_path ?? window.location.pathname,
  });
}

/**
 * Fired when the user clicks "Visit Website" or any outbound link from a tool page.
 */
export function trackOutboundToolClick(params: {
  tool_id: string;
  tool_name: string;
  tool_category: string;
  destination_url: string;
  link_label: string;
}): void {
  trackEvent('outbound_tool_click', params);
}

/**
 * Fired when the user clicks "Get Deal" or copies a promo code from the Deals page
 * or a tool's detail page.
 */
export function trackDealClick(params: {
  deal_id: string;
  deal_tool_name: string;
  deal_type: string;
  deal_discount: string;
  action: 'copy_code' | 'claim';
}): void {
  trackEvent('deal_click', params);
}

/**
 * Fired when the AI comparison verdict is generated (user clicked "Generate Verdict").
 */
export function trackComparisonView(params: {
  tool_1_name: string;
  tool_2_name: string;
  tool_3_name?: string;
  tool_count: number;
}): void {
  trackEvent('comparison_view', params);
}

/**
 * Fired when the newsletter subscription API returns success.
 * Only fires on genuine new subscriptions (not update/re-subscribe).
 */
export function trackNewsletterSignup(params: {
  source: string;
  topics?: string[];
  already_subscribed?: boolean;
}): void {
  trackEvent('newsletter_signup', {
    source: params.source,
    topics: params.topics?.join(',') ?? '',
    already_subscribed: params.already_subscribed ?? false,
  });
}

/**
 * Fired when the user successfully submits a tool via the Submit Tool form.
 */
export function trackSubmitTool(params: {
  tool_name: string;
  tool_category: string;
  tool_pricing_type: string;
}): void {
  trackEvent('submit_tool', params);
}
