/**
 * Standalone esbuild entry for the Phase 4 visual preview.
 * NOT imported by the app shell — dev-only screenshot harness.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { CrisisPhase4Preview } from './CrisisPhase4Preview';

const el = document.getElementById('root');
if (el) {
  createRoot(el).render(
    <React.StrictMode>
      <CrisisPhase4Preview />
    </React.StrictMode>
  );
}
