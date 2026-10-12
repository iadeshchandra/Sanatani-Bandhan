import * as functions from 'firebase-functions/v1';
import app from './app';

// asia-south1 (Mumbai) — lowest latency for Indian temples.
// 1st-gen onRequest: runs on the Spark free plan (no credit card).
export const api = functions.region('asia-south1').https.onRequest(app);
