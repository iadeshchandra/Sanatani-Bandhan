import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { OfflineSyncManager } from './services/OfflineSyncManager';

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

// Startup Health Check Log
console.log('App Startup Health Check:', {
  env: import.meta.env.MODE,
  baseUrl: import.meta.env.BASE_URL,
  dev: import.meta.env.DEV,
  prod: import.meta.env.PROD,
  timestamp: new Date().toISOString(),
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Gracefully remove splash screen after React has mounted
window.addEventListener('load', () => {
  const splashScreen = document.getElementById('sb-splash-screen');
  if (splashScreen) {
    // Extended minimum delay to ensure the premium splash screen is visible
    setTimeout(() => {
      splashScreen.classList.add('fade-out');
      setTimeout(() => {
        splashScreen.remove();
      }, 800); // Wait for CSS transition to finish before DOM removal
    }, 4000); // 4 seconds minimum visibility
  }
});
