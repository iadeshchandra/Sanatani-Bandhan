/**
 * server.ts — Standalone Express server entry point for non-Firebase hosts
 * (Render.com, Railway, Fly.io, etc.)
 *
 * The same Express `app` used by Cloud Functions, run directly.
 * Set PORT env var (Render provides this automatically).
 * All other env vars are the same as functions deployment.
 */
import app from './app';

const PORT = parseInt(process.env.PORT || '5000', 10);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sanatani Bandhan API listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
