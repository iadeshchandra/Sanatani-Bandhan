import { Router, Response } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { requireOwner } from '../middleware/ownerAuth';
import { auditLog } from '../lib/audit';
import { strictLimiter } from '../middleware/rateLimit';

const router = Router();

// Scheduled trigger endpoints are owner-only. In production they are invoked
// by Cloud Scheduler with an OIDC token mapped to the owner identity; until
// then they can be triggered manually from the admin console or by the
// client-side scheduler (see functions/SCHEDULED_JOBS.md).

/** Reminder queue collection read by the client to surface notifications. */
const REMINDER_QUEUE = 'reminderQueue';

/**
 * Compute whole years between a date-of-birth and now.
 */
function ageYears(dob: Date, now: Date): number {
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

/** Samskara age milestones (years) that trigger gentle reminders. */
const SAMSKARA_MILESTONES: Array<{ samskara: string; atAge: number; windowDays: number }> = [
  { samskara: 'Annaprashana', atAge: 0, windowDays: 60 },   // ~6 months
  { samskara: 'Chudakarana', atAge: 1, windowDays: 180 },
  { samskara: 'Vidyarambha', atAge: 3, windowDays: 180 },
  { samskara: 'Upanayana', atAge: 8, windowDays: 365 },
  { samskara: 'Vivaha', atAge: 21, windowDays: 730 },
];

/**
 * POST /api/scheduled/samskara-reminders — Owner only
 * Scan family members and enqueue reminders for upcoming samskara age
 * milestones. Idempotent: skips members that already have an unenqueued
 * reminder for the same samskara within the window.
 *
 * Body: { dryRun?: boolean } — when true, returns what WOULD be enqueued
 * without writing.
 */
router.post('/samskara-reminders', requireOwner, strictLimiter.byUser('scheduled'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const dryRun = req.body?.dryRun === true;
    const now = new Date();
    const enqueued: Array<Record<string, any>> = [];
    let scanned = 0;

    // Family members live under users' personal space: scan the
    // `samskaraFamilies` root collection (client writes member docs with
    // dateOfBirth + completedSamskaras).
    const famSnap = await db.collection('samskaraFamilies').limit(2000).get();

    for (const famDoc of famSnap.docs) {
      const membersSnap = await famDoc.ref.collection('members').get();
      for (const mDoc of membersSnap.docs) {
        scanned++;
        const m = mDoc.data();
        const dobRaw = m.dateOfBirth;
        if (!dobRaw) continue;
        const dob = dobRaw.toDate ? dobRaw.toDate() : new Date(dobRaw);
        if (isNaN(dob.getTime())) continue;

        const age = ageYears(dob, now);
        const completed: string[] = Array.isArray(m.completedSamskaras) ? m.completedSamskaras : [];

        for (const ms of SAMSKARA_MILESTONES) {
          if (completed.includes(ms.samskara)) continue;
          // Special-case infant milestones measured in months.
          const ageMonths = (now.getTime() - dob.getTime()) / (30.44 * 24 * 3600 * 1000);
          const inWindow =
            ms.samskara === 'Annaprashana'
              ? ageMonths >= 5 && ageMonths <= 8
              : Math.abs(age - ms.atAge) * 365 <= ms.windowDays && age >= ms.atAge - 1;
          if (!inWindow) continue;

          // Idempotency: one open reminder per member+samskara.
          const dup = await db.collection(REMINDER_QUEUE)
            .where('kind', '==', 'samskara')
            .where('memberId', '==', mDoc.id)
            .where('samskara', '==', ms.samskara)
            .where('status', '==', 'queued')
            .limit(1)
            .get();
          if (!dup.empty) continue;

          const reminder = {
            kind: 'samskara',
            samskara: ms.samskara,
            memberId: mDoc.id,
            memberName: m.name || 'Family member',
            familyId: famDoc.id,
            ownerUid: m.ownerUid || famDoc.data()?.ownerUid || null,
            message: `${m.name || 'Your family member'} approaches the age for ${ms.samskara}. Consider planning the ceremony.`,
            status: 'queued',
            createdAt: FieldValue.serverTimestamp(),
          };
          enqueued.push(reminder);
          if (!dryRun) await db.collection(REMINDER_QUEUE).add(reminder);
        }
      }
    }

    if (!dryRun) {
      await auditLog({
        action: 'scheduled.samskara_reminders',
        actorUid: req.authContext?.uid || 'unknown',
        actorEmail: req.authContext?.email,
        details: { scanned, enqueued: enqueued.length },
      });
    }

    res.json({ ok: true, dryRun, scanned, enqueued: enqueued.length });
  } catch (e: any) {
    console.error('[ScheduledRoutes] samskara-reminders failed:', e?.message || e);
    res.status(500).json({ error: 'Internal Server Error', code: 'SCHEDULED_FAILED' });
  }
});

/**
 * POST /api/scheduled/shraddha-reminders — Owner only
 * Enqueue annual shraddha reminders for recorded ancestors. The client
 * stores `shraddhaMonth` (1-12, lunar month index) and `shraddhaPaksha`
 * ('krishna' | 'shukla') + `shraddhaTithi` (1-15) on pitra records; this job
 * enqueues a reminder when the current fortnight matches, so families are
 * nudged during Pitru Paksha and on the ancestor's tithi.
 *
 * Body: { dryRun?: boolean, month?: number, paksha?: string, tithi?: number }
 * — overrides let the owner test without waiting for the calendar.
 */
router.post('/shraddha-reminders', requireOwner, strictLimiter.byUser('scheduled'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const dryRun = req.body?.dryRun === true;
    const now = new Date();

    // Lunar-date overrides for testing; production passes the current
    // tithi computed by the panchang service.
    const month = typeof req.body?.month === 'number' ? req.body.month : now.getMonth() + 1;
    const paksha = typeof req.body?.paksha === 'string' ? req.body.paksha : null;
    const tithi = typeof req.body?.tithi === 'number' ? req.body.tithi : null;

    const enqueued: Array<Record<string, any>> = [];
    let scanned = 0;

    const pitraSnap = await db.collection('pitraRecords').limit(2000).get();
    for (const doc of pitraSnap.docs) {
      scanned++;
      const p = doc.data();
      const matchesMonth = p.shraddhaMonth == null || p.shraddhaMonth === month;
      const matchesPaksha = !paksha || p.shraddhaPaksha == null || p.shraddhaPaksha === paksha;
      const matchesTithi = tithi == null || p.shraddhaTithi == null || p.shraddhaTithi === tithi;
      if (!(matchesMonth && matchesPaksha && matchesTithi)) continue;

      const year = now.getFullYear();
      const dup = await db.collection(REMINDER_QUEUE)
        .where('kind', '==', 'shraddha')
        .where('pitraId', '==', doc.id)
        .where('year', '==', year)
        .limit(1)
        .get();
      if (!dup.empty) continue;

      const reminder = {
        kind: 'shraddha',
        pitraId: doc.id,
        ancestorName: p.name || 'Ancestor',
        familyId: p.familyId || null,
        ownerUid: p.ownerUid || null,
        year,
        message: `Shraddha for ${p.name || 'your ancestor'} approaches. May their memory be honored.`,
        status: 'queued',
        createdAt: FieldValue.serverTimestamp(),
      };
      enqueued.push(reminder);
      if (!dryRun) await db.collection(REMINDER_QUEUE).add(reminder);
    }

    if (!dryRun) {
      await auditLog({
        action: 'scheduled.shraddha_reminders',
        actorUid: req.authContext?.uid || 'unknown',
        actorEmail: req.authContext?.email,
        details: { scanned, enqueued: enqueued.length, month, paksha, tithi },
      });
    }

    res.json({ ok: true, dryRun, scanned, enqueued: enqueued.length });
  } catch (e: any) {
    console.error('[ScheduledRoutes] shraddha-reminders failed:', e?.message || e);
    res.status(500).json({ error: 'Internal Server Error', code: 'SCHEDULED_FAILED' });
  }
});

/**
 * GET /api/scheduled/queue — Owner only
 * Inspect the reminder queue. ?status=queued|sent|dismissed (default queued),
 * ?limit= (max 100).
 */
router.get('/queue', requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const status = typeof req.query.status === 'string' ? req.query.status : 'queued';
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10) || 50, 1), 100);

    const snap = await db.collection(REMINDER_QUEUE)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    res.json({ ok: true, reminders: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (e: any) {
    console.error('[ScheduledRoutes] queue list failed:', e?.message || e);
    res.status(500).json({ error: 'Internal Server Error', code: 'LIST_FAILED' });
  }
});

export default router;
