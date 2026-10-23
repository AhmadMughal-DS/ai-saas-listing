/** Strip trailing punctuation so a fragment can be joined into a sentence without "..". */
export function stripTrailingPunctuation(text: string): string {
  return (text || '').trim().replace(/[\s.!?…]+$/, '');
}

/**
 * Clamp a meta description to `max` characters at a word boundary, ending with an ellipsis
 * when cut, so search snippets never end mid-word (e.g. "...and to.").
 */
export function clampMetaDescription(text: string, max = 160): string {
  const clean = (text || '').replace(/\s+/g, ' ').replace(/\.{2,}/g, '.').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s,;:.\-–—]+$/, '')}…`;
}
