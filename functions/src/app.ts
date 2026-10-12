import express from 'express';
import cors from 'cors';
import { initializeApp, cert } from 'firebase-admin/app';
import adminRoutes from './routes/adminRoutes';
import authRoutes from './routes/authRoutes';
import webhookRoutes from './routes/webhookRoutes';
import notificationRoutes from './routes/notificationRoutes';
import geminiRoutes from './routes/geminiRoutes';

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

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/gemini', geminiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Sanatani Bandhan API is running',
  });
});

export default app;
