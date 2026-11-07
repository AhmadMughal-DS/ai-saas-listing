import React from 'react';
import { HelpCircle } from 'lucide-react';
import { HubSeoContent, SeoFaq } from '../data/hubSeoContent';

/** Renders the tiny inline-markdown subset (**bold**, [text](/path)) as React nodes — no innerHTML. */
function renderInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\((\/[^)\s]*)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      out.push(<strong key={i++} className="text-slate-900 dark:text-white">{m[1]}</strong>);
    } else {
      const href = m[3];
      out.push(
        <a
          key={i++}
          href={href}
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState({}, '', href);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
        >
          {m[2]}
        </a>
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export const FaqList: React.FC<{ faqs: SeoFaq[]; heading?: string; className?: string }> = ({
  faqs,
  heading = 'Frequently Asked Questions',
  className = 'max-w-4xl mx-auto mt-12',
}) => {
  if (!faqs.length) return null;
  return (
    <section className={className}>
      <h2 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-5 flex items-center gap-2">
        <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        {heading}
      </h2>
      <div className="space-y-3">
        {faqs.map((f) => (
          <details
            key={f.q}
            open
            className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
          >
            <summary className="cursor-pointer list-none">
              <h3 className="inline text-sm sm:text-base font-bold text-slate-900 dark:text-white">{renderInline(f.q)}</h3>
            </summary>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{renderInline(f.a)}</p>
          </details>
        ))}
      </div>
    </section>
  );
};

/** Sections + FAQ for a hub page. Mirrors hubContentToHtml() on the server. */
export const SeoContentBlock: React.FC<{ content: HubSeoContent }> = ({ content }) => (
  <div className="mt-16">
    <div className="max-w-4xl mx-auto grid gap-6">
      {content.sections.map((s) => (
        <section
          key={s.heading}
          className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8"
        >
          <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
            {renderInline(s.heading)}
          </h2>
          {(s.paragraphs || []).map((p, idx) => (
            <p key={idx} className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-3 last:mb-0">
              {renderInline(p)}
            </p>
          ))}
          {s.bullets?.length ? (
            <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {s.bullets.map((b, idx) => (
                <li key={idx}>{renderInline(b)}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
    <FaqList faqs={content.faqs} />
  </div>
);
