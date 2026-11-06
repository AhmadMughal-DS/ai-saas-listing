import { BlogPost } from '../types';

// Tool reviews for "News & Guides", built server-side from each tool's stored
// blog. Requests are memoised so the hub, the article view and the SEO manager
// share one network call each.

let listPromise: Promise<BlogPost[]> | null = null;
const guidePromises = new Map<string, Promise<BlogPost | null>>();

export function fetchToolGuides(): Promise<BlogPost[]> {
  if (!listPromise) {
    listPromise = fetch('/api/guides')
      .then((r) => (r.ok ? r.json() : { guides: [] }))
      .then((d) => (Array.isArray(d.guides) ? (d.guides as BlogPost[]) : []))
      .catch(() => {
        listPromise = null; // allow a retry on the next visit
        return [];
      });
  }
  return listPromise;
}

export function isToolGuideSlug(slug: string | null | undefined): boolean {
  return Boolean(slug && /-review$/.test(slug));
}

export function fetchToolGuide(slug: string): Promise<BlogPost | null> {
  const key = slug.toLowerCase();
  let p = guidePromises.get(key);
  if (!p) {
    p = fetch(`/api/guides/${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? r.json() : { guide: null }))
      .then((d) => (d.guide as BlogPost) || null)
      .catch(() => {
        guidePromises.delete(key);
        return null;
      });
    guidePromises.set(key, p);
  }
  return p;
}
