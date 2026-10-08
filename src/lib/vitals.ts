/**
 * Lightweight (<1KB) Core Web Vitals Field Measurement for GA4
 * Uses standard W3C PerformanceObserver API — zero external dependencies.
 * Measures LCP (Largest Contentful Paint), CLS (Cumulative Layout Shift), and INP (Interaction to Next Paint).
 * Dispatches a single consolidated GA4 event upon page hide/backgrounding to avoid analytics noise.
 */

interface WebVitalsState {
  lcp: number;
  cls: number;
  inp: number;
  reported: boolean;
}

const vitals: WebVitalsState = {
  lcp: 0,
  cls: 0,
  inp: 0,
  reported: false,
};

function sendVitalsToGA4() {
  if (vitals.reported) return;
  vitals.reported = true;

  // Only report if at least one metric was recorded
  if (vitals.lcp === 0 && vitals.cls === 0 && vitals.inp === 0) return;

  const roundedLcp = Math.round(vitals.lcp);
  const formattedCls = Number(vitals.cls.toFixed(3));
  const roundedInp = Math.round(vitals.inp);

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'core_web_vitals', {
      event_category: 'Web Vitals',
      lcp_ms: roundedLcp,
      cls_score: formattedCls,
      inp_ms: roundedInp,
      lcp_good: roundedLcp <= 2500,
      cls_good: formattedCls <= 0.1,
      inp_good: roundedInp <= 200,
      non_interaction: true,
    });
  }
}

export function initWebVitals() {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;

  try {
    // 1. Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        vitals.lcp = lastEntry.startTime;
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // 2. Cumulative Layout Shift (CLS)
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          vitals.cls += (entry as any).value || 0;
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    // 3. Interaction to Next Paint (INP) / First Input Delay
    if (PerformanceObserver.supportedEntryTypes?.includes('event')) {
      const inpObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const duration = (entry as any).duration || 0;
          if (duration > vitals.inp) {
            vitals.inp = duration;
          }
        }
      });
      inpObserver.observe({ type: 'event', durationThreshold: 16, buffered: true } as any);
    } else if (PerformanceObserver.supportedEntryTypes?.includes('first-input')) {
      const fidObserver = new PerformanceObserver((entryList) => {
        const firstInput = entryList.getEntries()[0];
        if (firstInput) {
          vitals.inp = (firstInput as any).processingStart - firstInput.startTime;
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    }

    // Flush metrics when page changes visibility or unloads
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        sendVitalsToGA4();
      }
    });
    window.addEventListener('pagehide', sendVitalsToGA4);
  } catch {
    // Graceful degradation on unsupported browsers
  }
}
