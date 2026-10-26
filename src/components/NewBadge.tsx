import { Sparkles } from 'lucide-react';

/**
 * Shown in place of a star rating for freshly added tools that have no
 * community reviews yet (reviewCount === 0). Keeps the directory honest —
 * no fabricated "0.0" or placeholder ratings — while looking intentional.
 */
export function NewBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wide ${className}`}
      title="Recently added — no reviews yet"
    >
      <Sparkles className="w-3 h-3" />
      New
    </span>
  );
}
