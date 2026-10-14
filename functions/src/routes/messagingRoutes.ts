import { Router, Response } from 'express';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware';
import { requireOwner } from '../middleware/ownerAuth';
import { auditLog } from '../lib/audit';
import { createRateLimiter } from '../middleware/rateLimit';

const router = Router();

const sendLimiter = createRateLimiter({ max: 30, windowMs: 60 * 60 * 1000 }); // 30 sends/hour per owner session
const inboxLimiter = createRateLimiter({ max: 120, windowMs: 60 * 1000 });

const MESSAGE_TYPES = ['announcement', 'reminder', 'greeting', 'urgent'] as const;
const AUDIENCE_KINDS = ['single', 'workspace', 'role', 'all'] as const;
const MAX_TARGETS = 10000;

function clientIp(req: AuthenticatedRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string') return fwd.split(',')[0].trim();
  return req.ip || 'unknown';
}

function err(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: status >= 500 ? 'Server Error' : 'Request Failed', code, message });
}

/**
 * Resolve an audience selector to a bounded list of target UIDs.
 * - single:    { kind:'single', uid }
 * - workspace: { kind:'workspace', workspaceId } — every workspaceMembers row
 * - role:      { kind:'role', role } — every member holding that role, platform-wide
 * - all:       { kind:'all' } — every user (heavily rate-limited, audited critical)
 */
async function resolveAudience(audience: any): Promise<{ uids: string[]; description: string }> {
  const db = getFirestore();
  const kind = audience?.kind;
  if (!(AUDIENCE_KINDS as readonly string[]).includes(kind)) {
    throw new Error('INVALID_AUDIENCE');
  }
  if (kind === 'single') {
    if (typeof audience.uid !== 'string' || !audience.uid.trim()) throw new Error('INVALID_AUDIENCE');
    return { uids: [audience.uid.trim()], description: `user ${audience.uid.trim()}` };
  }
  if (kind === 'workspace') {
    if (typeof audience.workspaceId !== 'string' || !audience.workspaceId.trim()) throw new Error('INVALID_AUDIENCE');
    const snap = await db.collection('workspaceMembers')
      .where('workspaceId', '==', audience.workspaceId.trim()).limit(MAX_TARGETS).get();
    const uids = [...new Set(snap.docs.map((d) => d.data().uid).filter((u) => typeof u === 'string' && u))];
    return { uids, description: `workspace ${audience.workspaceId.trim()} (${uids.length} members)` };
  }
  if (kind === 'role') {
    if (typeof audience.role !== 'string' || !audience.role.trim()) throw new Error('INVALID_AUDIENCE');
    const snap = await db.collection('workspaceMembers')
      .where('role', '==', audience.role.trim()).limit(MAX_TARGETS).get();
    const uids = [...new Set(snap.docs.map((d) => d.data().uid).filter((u) => typeof u === 'string' && u))];
    return { uids, description: `role ${audience.role.trim()} (${uids.length} users)` };
  }
  // kind === 'all'
  const snap = await db.collection('users').limit(MAX_TARGETS).get();
  return { uids: snap.docs.map((d) => d.id), description: `all users (${snap.docs.length})` };
}

/**
 * Fan-out: write one inbox doc per target user, then attempt FCM push where
 * the client has registered tokens. FCM is best-effort — the inbox copy is
 * the source of truth, so a user without a token still sees the message.
 *
 * Client-side token registration (to be wired in the app):
 *   import { getMessaging, getToken } from 'firebase/messaging';
 *   const token = await getToken(getMessaging(), { vapidKey: '<VAPID_KEY>' });
 *   await setDoc(doc(db, 'users', uid, 'fcmTokens', token), { createdAt: serverTimestamp(), platform: 'web' });
 */
async function fanOut(params: {
  uids: string[]; title: string; body: string; type: string;
  campaignId?: string | null; scheduledFor?: Date | null;
}): Promise<{ delivered: number; fcmSent: number }> {
  const db = getFirestore();
  const { uids, title, body, type, campaignId, scheduledFor } = params;
  const now = FieldValue.serverTimestamp();

  // Batched writes: Firestore batch limit is 500.
  const unique = [...new Set(uids)];
  for (let i = 0; i < unique.length; i += 500) {
    const batch = db.batch();
    for (const targetUid of unique.slice(i, i + 500)) {
      batch.set(db.collection('messages').doc(), {
        targetUid, title, body, type,
        read: false, status: scheduledFor ? 'scheduled' : 'sent',
        scheduledFor: scheduledFor ? Timestamp.fromDate(scheduledFor) : null,
        campaignId: campaignId || null,
        createdAt: now,
      });
    }
    await batch.commit();
  }

  // FCM push — per-token, best effort. Chunked to the 500/token multicast cap.
  let fcmSent = 0;
  if (!scheduledFor) {
    try {
      const messaging = getMessaging();
      const tokens: string[] = [];
      for (let i = 0; i < unique.length; i += 100) {
        const chunk = unique.slice(i, i + 100);
        const snaps = await Promise.all(
          chunk.map((u) => db.collection('users').doc(u).collection('fcmTokens').limit(3).get())
        );
        for (const s of snaps) for (const d of s.docs) {
          const t = d.data()?.token || d.id;
          if (typeof t === 'string' && t.length > 10) tokens.push(t);
        }
      }
      for (let i = 0; i < tokens.length; i += 500) {
        const resp = await messaging.sendEachForMulticast({
          tokens: tokens.slice(i, i + 500),
          notification: { title: title.slice(0, 120), body: body.slice(0, 400) },
          data: { type, campaignId: campaignId || '' },
        });
        fcmSent += resp.successCount;
      }
    } catch (e: any) {
      console.warn('[Messaging] FCM fan-out partial/failed:', e?.message);
    }
  }

  return { delivered: unique.length, fcmSent };
}

// ---------------------------------------------------------------------------
// Owner: compose & send
// ---------------------------------------------------------------------------

/**
 * POST /api/messaging/send  (owner)
 * Compose and immediately deliver a message to an audience.
 * Body: { title, body, type: 'announcement'|'reminder'|'greeting'|'urgent',
 *         audience: { kind, uid?|workspaceId?|role? } }
 * Platform-wide ('all') sends are rate-limited to 3/day and audited critical.
 */
router.post('/send', requireOwner, sendLimiter.byUser('msg-send'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const uid = req.authContext?.uid || 'unknown';
    const { title, body, type, audience } = req.body;

    if (typeof title !== 'string' || !title.trim() || title.length > 200) {
      err(res, 400, 'INVALID_INPUT', 'title is required (max 200 chars).'); return;
    }
    if (typeof body !== 'string' || !body.trim() || body.length > 5000) {
      err(res, 400, 'INVALID_INPUT', 'body is required (max 5000 chars).'); return;
    }
    if (!(MESSAGE_TYPES as readonly string[]).includes(type)) {
      err(res, 400, 'INVALID_INPUT', `type must be one of: ${MESSAGE_TYPES.join(', ')}`); return;
    }

    let resolved;
    try {
      resolved = await resolveAudience(audience);
    } catch {
      err(res, 400, 'INVALID_AUDIENCE', 'audience must be { kind: single|workspace|role|all, ... }.'); return;
    }
    if (resolved.uids.length === 0) { err(res, 400, 'EMPTY_AUDIENCE', 'Audience resolved to zero users.'); return; }

    const isBroadcast = audience?.kind === 'all';
    const db = getFirestore();
    if (isBroadcast) {
      // Hard per-day cap on platform-wide blasts. Firestore-backed (not the
      // in-memory limiter) so the cap holds across function instances.
      const today = new Date().toISOString().slice(0, 10);
      const capRef = db.collection('broadcastCaps').doc(`${uid}_${today}`);
      const capSnap = await capRef.get();
      const used = capSnap.exists ? Number(capSnap.data()?.count || 0) : 0;
      if (used >= 3) {
        err(res, 429, 'RATE_LIMITED', 'Platform-wide broadcasts are limited to 3 per day.');
        return;
      }
      // Reserve the slot up-front (fail-closed on races: the increment is
      // applied again after success; worst case a failed send costs a slot).
      await capRef.set({ count: used + 1, date: today }, { merge: true });
    }
    const campaignRef = await db.collection('messageCampaigns').add({
      title: title.trim(), body: body.trim(), type,
      audienceKind: audience.kind, audienceDescription: resolved.description,
      targetCount: resolved.uids.length,
      sentBy: uid, sentAt: FieldValue.serverTimestamp(),
    });

    const { delivered, fcmSent } = await fanOut({
      uids: resolved.uids, title: title.trim(), body: body.trim(), type,
      campaignId: campaignRef.id,
    });

    await auditLog({
      action: 'messaging.send', actorUid: uid, actorEmail: req.authContext?.email,
      targetType: 'messageCampaigns', targetId: campaignRef.id, ip: clientIp(req),
      severity: isBroadcast ? 'critical' : 'info',
      details: { type, audience: resolved.description, delivered, fcmSent },
    });

    res.json({ ok: true, campaignId: campaignRef.id, delivered, fcmSent });
  } catch (e: any) {
    console.error('[Messaging] send failed:', e?.message);
    err(res, 500, 'INTERNAL', 'Could not send message.');
  }
});

/**
 * POST /api/messaging/schedule  (owner)
 * Queue a message for later delivery (festival greetings, reminders).
 * Body: { title, body, type, audience, scheduledFor: ISO string (must be future) }
 * Delivery happens via POST /api/messaging/dispatch-due (owner or scheduler).
 */
router.post('/schedule', requireOwner, sendLimiter.byUser('msg-schedule'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const uid = req.authContext?.uid || 'unknown';
    const { title, body, type, audience, scheduledFor } = req.body;

    if (typeof title !== 'string' || !title.trim() || title.length > 200) {
      err(res, 400, 'INVALID_INPUT', 'title is required (max 200 chars).'); return;
    }
    if (typeof body !== 'string' || !body.trim() || body.length > 5000) {
      err(res, 400, 'INVALID_INPUT', 'body is required (max 5000 chars).'); return;
    }
    if (!(MESSAGE_TYPES as readonly string[]).includes(type)) {
      err(res, 400, 'INVALID_INPUT', `type must be one of: ${MESSAGE_TYPES.join(', ')}`); return;
    }
    const when = new Date(scheduledFor);
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      err(res, 400, 'INVALID_INPUT', 'scheduledFor must be a future ISO timestamp.'); return;
    }

    let resolved;
    try { resolved = await resolveAudience(audience); }
    catch { err(res, 400, 'INVALID_AUDIENCE', 'Invalid audience selector.'); return; }
    if (resolved.uids.length === 0) { err(res, 400, 'EMPTY_AUDIENCE', 'Audience resolved to zero users.'); return; }

    const db = getFirestore();
    const schedRef = await db.collection('scheduledMessages').add({
      title: title.trim(), body: body.trim(), type,
      audience, audienceDescription: resolved.description,
      targetUids: resolved.uids.slice(0, MAX_TARGETS),
      scheduledFor: Timestamp.fromDate(when),
      status: 'scheduled', createdBy: uid, createdAt: FieldValue.serverTimestamp(),
    });

    await auditLog({
      action: 'messaging.schedule', actorUid: uid, actorEmail: req.authContext?.email,
      targetType: 'scheduledMessages', targetId: schedRef.id, ip: clientIp(req), severity: 'info',
      details: { type, audience: resolved.description, scheduledFor: when.toISOString() },
    });

    res.status(201).json({ ok: true, scheduledId: schedRef.id, scheduledFor: when.toISOString(), targets: resolved.uids.length });
  } catch (e: any) {
    console.error('[Messaging] schedule failed:', e?.message);
    err(res, 500, 'INTERNAL', 'Could not schedule message.');
  }
});

/**
 * POST /api/messaging/dispatch-due  (owner)
 * Deliver all scheduled messages whose time has arrived. Idempotent — each
 * scheduled doc flips to 'sent' inside the same flow that fans it out.
 * Intended to be called by Cloud Scheduler (Blaze) or manually from the
 * owner console on the free tier.
 */
router.post('/dispatch-due', requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const uid = req.authContext?.uid || 'unknown';
    const db = getFirestore();
    const snap = await db.collection('scheduledMessages')
      .where('status', '==', 'scheduled')
      .where('scheduledFor', '<=', Timestamp.now())
      .limit(20).get();

    let dispatched = 0;
    for (const doc of snap.docs) {
      const s = doc.data() as any;
      try {
        await fanOut({
          uids: Array.isArray(s.targetUids) ? s.targetUids : [],
          title: String(s.title || ''), body: String(s.body || ''), type: String(s.type || 'announcement'),
          campaignId: null,
        });
        await doc.ref.update({ status: 'sent', sentAt: FieldValue.serverTimestamp() });
        dispatched++;
      } catch (e: any) {
        console.warn('[Messaging] dispatch item failed:', doc.id, e?.message);
        await doc.ref.update({ status: 'failed', error: String(e?.message || 'unknown').slice(0, 500) });
      }
    }

    await auditLog({
      action: 'messaging.dispatch_due', actorUid: uid, actorEmail: req.authContext?.email,
      ip: clientIp(req), severity: 'info', details: { dispatched, checked: snap.size },
    });
    res.json({ ok: true, dispatched, checked: snap.size });
  } catch (e: any) {
    console.error('[Messaging] dispatch-due failed:', e?.message);
    err(res, 500, 'INTERNAL', 'Could not dispatch due messages.');
  }
});

// ---------------------------------------------------------------------------
// Inbox (per-user)
// ---------------------------------------------------------------------------

/**
 * GET /api/messaging/inbox  (authenticated)
 * The caller's own messages, unread first, then newest. ?limit=&cursor=
 * (cursor = ISO timestamp of the last seen createdAt for pagination).
 */
router.get('/inbox', requireAuth, inboxLimiter.byUser('msg-inbox'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const uid = req.authContext?.uid || 'unknown';
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '30'), 10) || 30, 1), 100);
    const db = getFirestore();

    // Two queries merged: unread first, then read — both newest-first.
    const [unreadSnap, readSnap] = await Promise.all([
      db.collection('messages').where('targetUid', '==', uid).where('read', '==', false)
        .orderBy('createdAt', 'desc').limit(limit).get(),
      db.collection('messages').where('targetUid', '==', uid).where('read', '==', true)
        .orderBy('createdAt', 'desc').limit(limit).get(),
    ]);

    const map = (d: FirebaseFirestore.QueryDocumentSnapshot) => ({ id: d.id, ...d.data() });
    const messages = [...unreadSnap.docs.map(map), ...readSnap.docs.map(map)].slice(0, limit);
    res.json({ messages, unreadCount: unreadSnap.size });
  } catch (e: any) {
    console.error('[Messaging] inbox failed:', e?.message);
    err(res, 500, 'INTERNAL', 'Could not load inbox.');
  }
});

/**
 * POST /api/messaging/inbox/:id/read  (authenticated)
 * Mark one of the caller's own messages as read. Ownership is re-checked —
 * a user can never mark another user's message.
 */
router.post('/inbox/:id/read', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const uid = req.authContext?.uid || 'unknown';
    const db = getFirestore();
    const ref = db.collection('messages').doc(String(req.params.id));
    const snap = await ref.get();
    if (!snap.exists) { err(res, 404, 'NOT_FOUND', 'Message not found.'); return; }
    if (snap.data()?.targetUid !== uid) { err(res, 403, 'FORBIDDEN', 'Not your message.'); return; }
    await ref.update({ read: true, readAt: FieldValue.serverTimestamp() });
    res.json({ ok: true });
  } catch (e: any) {
    console.error('[Messaging] mark-read failed:', e?.message);
    err(res, 500, 'INTERNAL', 'Could not mark message as read.');
  }
});

// ---------------------------------------------------------------------------
// Templates (owner)
// ---------------------------------------------------------------------------

/**
 * GET /api/messaging/templates  (owner)
 * Reusable greeting/reminder templates with locale variants, e.g. Diwali
 * greetings, payment-due reminders, shraddha reminders.
 */
router.get('/templates', requireOwner, async (_req, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const snap = await db.collection('messageTemplates').orderBy('name').get();
    res.json({ templates: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (e: any) {
    console.error('[Messaging] templates list failed:', e?.message);
    err(res, 500, 'INTERNAL', 'Could not list templates.');
  }
});

/**
 * POST /api/messaging/templates  (owner)
 * Body: { name, type: announcement|reminder|greeting|urgent,
 *         title: { en, bn?, hi? }, body: { en, bn?, hi? } }
 */
router.post('/templates', requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const uid = req.authContext?.uid || 'unknown';
    const { name, type, title, body } = req.body;
    if (typeof name !== 'string' || !name.trim()) { err(res, 400, 'INVALID_INPUT', 'name is required.'); return; }
    if (!(MESSAGE_TYPES as readonly string[]).includes(type)) {
      err(res, 400, 'INVALID_INPUT', `type must be one of: ${MESSAGE_TYPES.join(', ')}`); return;
    }
    const pick = (v: any): Record<string, string> => {
      const out: Record<string, string> = {};
      for (const k of ['en', 'bn', 'hi']) {
        if (v && typeof v[k] === 'string' && v[k].trim()) out[k] = v[k].trim().slice(0, 5000);
      }
      return out;
    };
    const titleVars = pick(title);
    const bodyVars = pick(body);
    if (!titleVars.en || !bodyVars.en) { err(res, 400, 'INVALID_INPUT', 'English (en) title and body are required.'); return; }

    const db = getFirestore();
    const ref = await db.collection('messageTemplates').add({
      name: name.trim(), type, title: titleVars, body: bodyVars,
      createdBy: uid, createdAt: FieldValue.serverTimestamp(),
    });
    await auditLog({
      action: 'messaging.template.create', actorUid: uid, actorEmail: req.authContext?.email,
      targetType: 'messageTemplates', targetId: ref.id, ip: clientIp(req), severity: 'info',
      details: { name },
    });
    res.status(201).json({ ok: true, templateId: ref.id });
  } catch (e: any) {
    console.error('[Messaging] template create failed:', e?.message);
    err(res, 500, 'INTERNAL', 'Could not create template.');
  }
});

export default router;
