import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';
import { initWebVitals } from './lib/vitals';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);

// Remove the pre-hydration boot splash once the styled app has painted.
// Two rAFs ensure React has committed and the browser has painted a frame first.
function hideBootSplash() {
  const splash = document.getElementById('app-splash');
  if (!splash) return;
  splash.classList.add('tv-hide');
  window.setTimeout(() => splash.remove(), 400);
}
requestAnimationFrame(() => requestAnimationFrame(hideBootSplash));

// Initialize non-blocking Core Web Vitals real-user monitoring
initWebVitals();

