import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import adminRoutes from './routes/adminRoutes';
import authRoutes from './routes/authRoutes';
import webhookRoutes from './routes/webhookRoutes';
import notificationRoutes from './routes/notificationRoutes';

// Credential helper conforming to credential.cert API
const credential = { cert };

// 1. Initialize environment variables
dotenv.config();

// 2. Initialize Firebase Admin SDK
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({
      credential: credential.cert(serviceAccount),
    });
    console.log('[Firebase Admin] Initialized with FIREBASE_SERVICE_ACCOUNT credentials');
  } else {
    initializeApp();
    console.log('[Firebase Admin] Initialized with application default credentials');
  }
} catch (error) {
  console.warn('[Firebase Admin] Warning during initialization:', error);
}

// 3. Initialize Express App
const app = express();

// 4. Middlewares
app.use(cors());
app.use(express.json());

// 5. Admin, Auth, Webhook & Notification Routes
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/notifications', notificationRoutes);

// 5. Health Check Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Sanatani Bandhan API is running',
  });
});

// 6. Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Sanatani Bandhan API] Server listening on port ${PORT}`);
});

export default app;
