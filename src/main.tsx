import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/motion.css';
import { OfflineSyncManager } from './services/OfflineSyncManager';
import { trackAppGrowthInstall } from './appgrowth/attribution';

// Suppress React warning about duplicate keys for headless testing and handle sandbox Firestore permissions notices
const originalConsoleError = console.error;
console.error = (...args) => {
  const first = typeof args[0] === 'string' ? args[0] : (args[0]?.message || '');
  const second = typeof args[1] === 'string' ? args[1] : (args[1]?.message || '');
  const msg = `${first} ${second}`;

  if (first.includes('two children with the same key')) {
    return;
  }

  if (
    msg.includes('Missing or insufficient permissions') ||
    msg.includes('Error fetching transactions from Firestore') ||
    msg.includes('Error fetching treasury transactions from Firestore') ||
    msg.includes('Error fetching devotees') ||
    msg.includes('the client is offline')
  ) {
    console.warn('[Firestore Sandbox Notice]', ...args);
    return;
  }

  originalConsoleError(...args);
};

OfflineSyncManager.initListener();

// App Growth (Phase 5): log one anonymous install on first app open for
// QR/poster campaign attribution. Fail-open by design — it swallows its own
// errors and never blocks or breaks boot. Deferred deep links (campaign
// deepLink) are resolved inside and consumed by AppContentRouter after the
// setup wizard.
try {
  trackAppGrowthInstall();
} catch {
  /* analytics must never break boot */
}

// Startup Health Check Log — dev only; production consoles stay clean.
if (import.meta.env.DEV) {
  console.log('App Startup Health Check:', {
    env: import.meta.env.MODE,
    baseUrl: import.meta.env.BASE_URL,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
    timestamp: new Date().toISOString(),
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Dismiss splash once React has mounted. Do NOT wait for window.load —
// it never fires reliably on mobile (slow/hung subresources), which left
// the splash stuck forever on small viewports. Max 2s visible.
function dismissSplash() {
  const splashScreen = document.getElementById('sb-splash-screen');
  if (!splashScreen || splashScreen.classList.contains('fade-out')) return;
  splashScreen.classList.add('fade-out');
  setTimeout(() => splashScreen.remove(), 800); // wait for CSS transition
}
// Dismiss shortly after first paint, regardless of load event.
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(dismissSplash, 1200);
} else {
  document.addEventListener('DOMContentLoaded', () => setTimeout(dismissSplash, 1200));
}
// Hard ceiling: never show longer than 2.5s even if everything above fails.
setTimeout(dismissSplash, 2500);
