import express from 'express';
import cors from 'cors';
import { initializeApp, cert } from 'firebase-admin/app';
import adminRoutes from './routes/adminRoutes';
import authRoutes from './routes/authRoutes';
import webhookRoutes from './routes/webhookRoutes';
import notificationRoutes from './routes/notificationRoutes';
import geminiRoutes from './routes/geminiRoutes';
import healthRoutes from './routes/healthRoutes';
import exportRoutes from './routes/exportRoutes';

// Credential helper conforming to credential.cert API
const credential = { cert };

// Initialize Firebase Admin SDK.
// On Cloud Functions, bare initializeApp() uses the function's own service
// identity (works on the Spark plan, no key file needed). The
// FIREBASE_SERVICE_ACCOUNT env var remains as a local-dev / self-host override.
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({
      credential: credential.cert(serviceAccount),
    });
    console.log('[Firebase Admin] Initialized with FIREBASE_SERVICE_ACCOUNT credentials');
  } else {
    initializeApp();
    console.log('[Firebase Admin] Initialized with default credentials / function identity');
  }
} catch (error) {
  console.warn('[Firebase Admin] Warning during initialization:', error);
}

// Express app (no listen here — the Cloud Function wrapper owns the server).
const app = express();

// CORS: restrict to known front-ends when CORS_ORIGINS is set (comma-separated).
// Falls back to open CORS for the PWA's multiple hosting targets.
const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  corsOrigins.length
    ? cors({ origin: corsOrigins, credentials: true })
    : cors()
);
app.use(express.json({ limit: '1mb' })); // bound body size against abuse

// API routes
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/export', exportRoutes);

// Health & readiness (public; see healthRoutes for dependency checks).
app.use('/api/health', healthRoutes);

export default app;
