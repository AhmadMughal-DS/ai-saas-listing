/**
 * Outbound links to a tool's own website — the one place that decides where a
 * "Visit site" click goes. Used by the React views and by the server-rendered HTML.
 *
 *  - If the tool has an `affiliateUrl` (set in the admin panel once the vendor's
 *    affiliate/partner program has approved us), the click goes there unchanged and
 *    the link is marked rel="sponsored", as search engines and affiliate programs require.
 *  - Otherwise the click goes to the official URL with utm_source=toolverai.com, so the
 *    vendor's own analytics shows the visitors we sent. That number is what makes an
 *    affiliate application or a paid placement credible.
 *
 * `noreferrer` is deliberately not used: it would hide ToolverAI as the referrer.
 */
export interface OutboundTool {
  url?: string;
  affiliateUrl?: string;
}

const UTM_SOURCE = 'toolverai.com';

function isHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

export function hasAffiliateLink(tool: OutboundTool | null | undefined): boolean {
  return isHttpUrl(tool?.affiliateUrl);
}

export function outboundUrl(tool: OutboundTool | null | undefined): string {
  if (!tool) return '#';
  if (isHttpUrl(tool.affiliateUrl)) return tool.affiliateUrl.trim();
  if (!isHttpUrl(tool.url)) return tool.url || '#';
  try {
    const u = new URL(tool.url.trim());
    if (!u.searchParams.has('utm_source')) {
      u.searchParams.set('utm_source', UTM_SOURCE);
      u.searchParams.set('utm_medium', 'referral');
    }
    return u.toString();
  } catch {
    return tool.url;
  }
}

export function outboundRel(tool: OutboundTool | null | undefined): string {
  return hasAffiliateLink(tool) ? 'sponsored nofollow noopener' : 'nofollow noopener';
}
