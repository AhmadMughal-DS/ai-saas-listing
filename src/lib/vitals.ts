/**
 * Lightweight (<1KB) Performance Telemetry for GA4
 * Uses standard W3C PerformanceObserver API — zero external dependencies.
 *
 * ACCURACY DISCLOSURE:
 * - LCP: Spec-equivalent (largest-contentful-paint PerformanceObserver)
 * - CLS: Spec-equivalent (layout-shift PerformanceObserver, excluding recent-input shifts)
 * - INP Approximation: This is NOT the official INP (Interaction to Next Paint) metric.
 *   Official INP = 98th percentile of all interaction durations in the session.
 *   This implementation tracks the single worst event duration (max), which will
 *   overestimate INP on pages with one slow outlier and many fast interactions.
 *   For production-grade INP, use the official web-vitals.js library (~2.5KB gzip).
 *   The GA4 event is named "performance_telemetry" to avoid implying equivalence.
 *
 * Duplicate-report prevention:
 *   `reported` flag is set true on first send. Both visibilitychange and pagehide
 *   handlers guard through the same flag, so only one report is ever sent per session.
 */

interface PerfTelemetryState {
  lcp: number;
  cls: number;
  /** Worst single event duration observed. NOT the official 98th-percentile INP. */
  worstEventDuration: number;
  reported: boolean;
}

const state: PerfTelemetryState = {
  lcp: 0,
  cls: 0,
  worstEventDuration: 0,
  reported: false,
};

function sendTelemetryToGA4() {
  if (state.reported) return;
  state.reported = true;

  // Only report if at least one metric was recorded
  if (state.lcp === 0 && state.cls === 0 && state.worstEventDuration === 0) return;

  const roundedLcp = Math.round(state.lcp);
  const formattedCls = Number(state.cls.toFixed(3));
  const roundedWorstEvent = Math.round(state.worstEventDuration);

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'performance_telemetry', {
      event_category: 'Perf Telemetry',
      // LCP and CLS are spec-equivalent measurements
      lcp_ms: roundedLcp,
      cls_score: formattedCls,
      // Worst event duration — an approximation of responsiveness, NOT official INP
      worst_event_duration_ms: roundedWorstEvent,
      lcp_good: roundedLcp <= 2500,
      cls_good: formattedCls <= 0.1,
      // Threshold matches INP "good" cutoff for comparison purposes only
      worst_event_good: roundedWorstEvent <= 200,
      non_interaction: true,
    });
  }
}

export function initWebVitals() {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;

  try {
    // 1. Largest Contentful Paint (LCP) — spec-equivalent
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        state.lcp = lastEntry.startTime;
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // 2. Cumulative Layout Shift (CLS) — spec-equivalent
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          state.cls += (entry as any).value || 0;
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    // 3. Worst event duration approximation (NOT official INP)
    //    Official INP requires the 98th-percentile across all interaction types.
    //    This captures the single worst duration — useful for identifying regressions
    //    but will differ from Chrome UX Report INP values.
    if (PerformanceObserver.supportedEntryTypes?.includes('event')) {
      const eventObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const duration = (entry as any).duration || 0;
          if (duration > state.worstEventDuration) {
            state.worstEventDuration = duration;
          }
        }
      });
      eventObserver.observe({ type: 'event', durationThreshold: 16, buffered: true } as any);
    } else if (PerformanceObserver.supportedEntryTypes?.includes('first-input')) {
      // Fallback: First Input Delay on browsers without event observer
      const fidObserver = new PerformanceObserver((entryList) => {
        const firstInput = entryList.getEntries()[0];
        if (firstInput) {
          const delay = (firstInput as any).processingStart - firstInput.startTime;
          if (delay > state.worstEventDuration) {
            state.worstEventDuration = delay;
          }
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    }

    // Flush once on page hide/background — both events guarded by `state.reported`
    // to prevent duplicate sends (only the first event that fires will report)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        sendTelemetryToGA4();
      }
    });
    window.addEventListener('pagehide', sendTelemetryToGA4, { once: true });
  } catch {
    // Graceful degradation on unsupported browsers
  }
}
