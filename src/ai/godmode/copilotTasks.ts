/**
 * ai/godmode/copilotTasks.ts — GodMode Copilot task executors.
 * =====================================================================
 * Five executors, one per copilot intent. All are:
 *  · RBAC-gated: role !== 'owner' → denial params (the `ask()` gate in
 *    assistant.ts also blocks via canOffer, this is belt-and-braces).
 *  · Fail-open: any Firestore failure → 'unavailable' variant with an
 *    honest message, never a crash, never invented numbers.
 *  · Read-only: zero writes. The copilot advises; the human decides.
 *
 * Reads go through the owner's own authenticated SDK — Firestore rules
 * remain the hard boundary (copilot reads only what the owner can read).
 */

import { suggestionsFor } from '../templates';
import type { TaskCtx, TaskOutcome } from '../types';
import {
  canUseCopilot,
  copilotDenied,
  formatBriefing,
  formatStats,
  formatAnomalySummary,
  detectAnomalies,
  recommendModeration,
  buildAnnouncementDraft,
  type BriefingCounts,
  type AnomalyInput,
  type PlatformStats,
  type FlaggedItemInput,
} from './copilot';

/* ------------------------------------------------------------------ */
/* Firestore helpers — dynamic imports keep this module Jest-safe      */
/* ------------------------------------------------------------------ */

async function getDb() {
  const { db } = await import('../../firebase');
  return db;
}

async function countDocs(
  collectionName: string,
  whereClauses: Array<{ field: string; op: string; value: unknown }> = [],
  limitN = 500
): Promise<number | null> {
  try {
    const { collection, getDocs, limit, query, where } = await import('firebase/firestore');
    const db = await getDb();
    const constraints: unknown[] = whereClauses.map((c) =>
      where(c.field, c.op as never, c.value)
    );
    constraints.push(limit(limitN));
    const snap = await getDocs(query(collection(db, collectionName), ...(constraints as never[])));
    return snap.size;
  } catch {
    return null;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/* ------------------------------------------------------------------ */
/* admin_briefing                                                       */
/* ------------------------------------------------------------------ */

export async function adminBriefingTask(ctx: TaskCtx): Promise<TaskOutcome> {
  const lang = ctx.lang || 'en';
  if (!canUseCopilot(ctx.role)) {
    return {
      params: { text: copilotDenied(lang) },
      variant: 'denied',
      suggestions: suggestionsFor('greeting', lang),
    };
  }
  // Pending provider verifications: professionals awaiting review.
  const [verifications, flagged, disputes] = await Promise.all([
    countDocs('sevaProfessionals', [{ field: 'verificationStatus', op: '==', value: 'pending' }]),
    countDocs('sangamPosts', [{ field: 'status', op: '==', value: 'flagged' }]),
    countDocs('disputes', [{ field: 'status', op: '==', value: 'open' }]),
  ]);
  const dataAvailable = verifications !== null && flagged !== null && disputes !== null;
  const counts: BriefingCounts = {
    pendingVerifications: verifications ?? 0,
    flaggedPosts: flagged ?? 0,
    openDisputes: disputes ?? 0,
    dataAvailable,
  };
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const b = formatBriefing(counts, dayName, lang);
  return {
    params: { headline: b.headline, lines: b.lines.join('\n'), text: `${b.headline}\n\n${b.lines.join('\n')}` },
    variant: b.calm ? 'calm' : 'busy',
    suggestions: suggestionsFor('admin_briefing', lang),
  };
}

/* ------------------------------------------------------------------ */
/* admin_stats                                                          */
/* ------------------------------------------------------------------ */

export async function adminStatsTask(ctx: TaskCtx): Promise<TaskOutcome> {
  const lang = ctx.lang || 'en';
  if (!canUseCopilot(ctx.role)) {
    return {
      params: { text: copilotDenied(lang) },
      variant: 'denied',
      suggestions: suggestionsFor('greeting', lang),
    };
  }
  const weekAgo = new Date(Date.now() - 7 * DAY_MS);
  const [bookings, signups, temples] = await Promise.all([
    countDocs('marketplaceOrders', [{ field: 'createdAt', op: '>=', value: weekAgo }]),
    countDocs('users', [{ field: 'createdAt', op: '>=', value: weekAgo }]),
    countDocs('campusMaps', [], 1000),
  ]);
  // Active users: approximate from recent activity — honest about limits.
  const activeUsers = await countDocs('users', [
    { field: 'lastActiveAt', op: '>=', value: weekAgo },
  ]);
  const dataAvailable = bookings !== null && signups !== null && temples !== null;
  const stats: PlatformStats = {
    bookingsWeek: bookings ?? 0,
    activeUsersWeek: activeUsers ?? 0,
    newSignupsWeek: signups ?? 0,
    templesMapped: temples ?? 0,
    dataAvailable,
  };
  return {
    params: { text: formatStats(stats, lang) },
    variant: 'default',
    suggestions: suggestionsFor('admin_stats', lang),
  };
}

/* ------------------------------------------------------------------ */
/* admin_moderation_help                                                */
/* ------------------------------------------------------------------ */

interface FlaggedDoc {
  id: string;
  kind?: string;
  text?: string;
  caption?: string;
  title?: string;
  authorName?: string;
  reportCount?: number;
  reportReasons?: string[];
}

async function fetchFlaggedPosts(limitN = 10): Promise<FlaggedDoc[] | null> {
  try {
    const { collection, getDocs, limit, query, where } = await import('firebase/firestore');
    const db = await getDb();
    const snap = await getDocs(
      query(collection(db, 'sangamPosts'), where('status', '==', 'flagged'), limit(limitN))
    );
    const out: FlaggedDoc[] = [];
    snap.forEach((d) => {
      const m = d.data() as Record<string, unknown>;
      out.push({
        id: d.id,
        kind: typeof m['kind'] === 'string' ? (m['kind'] as string) : 'post',
        text: typeof m['text'] === 'string' ? (m['text'] as string) : undefined,
        caption: typeof m['caption'] === 'string' ? (m['caption'] as string) : undefined,
        title: typeof m['title'] === 'string' ? (m['title'] as string) : undefined,
        authorName: typeof m['authorName'] === 'string' ? (m['authorName'] as string) : 'Unknown',
        reportCount: typeof m['reportCount'] === 'number' ? (m['reportCount'] as number) : 0,
        reportReasons: Array.isArray(m['reportReasons']) ? (m['reportReasons'] as string[]) : [],
      });
    });
    return out;
  } catch {
    return null;
  }
}

export async function adminModerationHelpTask(ctx: TaskCtx): Promise<TaskOutcome> {
  const lang = ctx.lang || 'en';
  if (!canUseCopilot(ctx.role)) {
    return {
      params: { text: copilotDenied(lang) },
      variant: 'denied',
      suggestions: suggestionsFor('greeting', lang),
    };
  }
  const flagged = await fetchFlaggedPosts();
  if (flagged === null) {
    return {
      params: {
        text:
          lang === 'hi'
            ? '🛡️ फ्लैग पोस्ट पढ़े नहीं जा सके — कनेक्शन जाँचकर पुनः पूछें।'
            : lang === 'bn'
              ? '🛡️ ফ্ল্যাগ পোস্ট পড়া যায়নি — সংযোগ পরীক্ষা করে আবার জিজ্ঞেস করুন।'
              : '🛡️ I couldn’t read the flagged posts — please check your connection and ask again.',
      },
      variant: 'unavailable',
      suggestions: suggestionsFor('admin_moderation_help', lang),
    };
  }
  if (flagged.length === 0) {
    return {
      params: {
        text:
          lang === 'hi'
            ? '🛡️ समीक्षा हेतु कोई फ्लैग पोस्ट नहीं — कतार साफ है। 🌼'
            : lang === 'bn'
              ? '🛡️ পর্যালোচনার জন্য কোনো ফ্ল্যাগ পোস্ট নেই — সারি পরিষ্কার। 🌼'
              : '🛡️ No flagged posts awaiting review — the queue is clear. 🌼',
      },
      variant: 'clear',
      suggestions: suggestionsFor('admin_moderation_help', lang),
    };
  }
  const items = flagged.map((f) => {
    const input: FlaggedItemInput = {
      id: f.id,
      kind: f.kind || 'post',
      preview: (f.text || f.caption || f.title || '').slice(0, 140),
      reportCount: f.reportCount ?? 0,
      reportReasons: f.reportReasons ?? [],
      authorName: f.authorName || 'Unknown',
    };
    return { doc: f, advice: recommendModeration(input) };
  });
  return {
    params: {
      headline:
        lang === 'hi'
          ? `🛡️ ${flagged.length} फ्लैग पोस्ट — मेरी सिफ़ारिशें:`
          : lang === 'bn'
            ? `🛡️ ${flagged.length}টি ফ্ল্যাগ পোস্ট — আমার সুপারিশ:`
            : `🛡️ ${flagged.length} flagged post${flagged.length > 1 ? 's' : ''} — my recommendations:`,
      items: items.map((i) => ({
        id: i.doc.id,
        preview: (i.doc.text || i.doc.caption || i.doc.title || '').slice(0, 140),
        authorName: i.doc.authorName,
        reportCount: i.doc.reportCount,
        reasons: i.doc.reportReasons,
        recommendation: i.advice.recommendation,
        reasoning: i.advice.reasoning,
        actionLabel: i.advice.actionLabel,
      })),
    },
    variant: 'queue',
    suggestions: suggestionsFor('admin_moderation_help', lang),
  };
}

/* ------------------------------------------------------------------ */
/* admin_anomaly                                                        */
/* ------------------------------------------------------------------ */

async function countSince(collectionName: string, field: string, since: Date): Promise<number | null> {
  return countDocs(collectionName, [{ field, op: '>=', value: since }]);
}

export async function adminAnomalyTask(ctx: TaskCtx): Promise<TaskOutcome> {
  const lang = ctx.lang || 'en';
  if (!canUseCopilot(ctx.role)) {
    return {
      params: { text: copilotDenied(lang) },
      variant: 'denied',
      suggestions: suggestionsFor('greeting', lang),
    };
  }
  const now = Date.now();
  const dayAgo = new Date(now - DAY_MS);
  const weekAgo = new Date(now - 7 * DAY_MS);
  const twoWeeksAgo = new Date(now - 14 * DAY_MS);
  const [
    reports24h, reports7d, reports14d,
    signups24h, signups7d, signups14d,
    canc7d, canc14d,
  ] = await Promise.all([
    countSince('sangamPosts', 'reportedAt', dayAgo).catch(() => null),
    countSince('sangamPosts', 'reportedAt', weekAgo).catch(() => null),
    countSince('sangamPosts', 'reportedAt', twoWeeksAgo).catch(() => null),
    countSince('users', 'createdAt', dayAgo).catch(() => null),
    countSince('users', 'createdAt', weekAgo).catch(() => null),
    countSince('users', 'createdAt', twoWeeksAgo).catch(() => null),
    countDocs('marketplaceOrders', [
      { field: 'status', op: '==', value: 'cancelled' },
      { field: 'createdAt', op: '>=', value: weekAgo },
    ]).catch(() => null),
    countDocs('marketplaceOrders', [
      { field: 'status', op: '==', value: 'cancelled' },
      { field: 'createdAt', op: '>=', value: twoWeeksAgo },
    ]).catch(() => null),
  ]);
  const all = [reports24h, reports7d, reports14d, signups24h, signups7d, signups14d, canc7d, canc14d];
  if (all.some((v) => v === null)) {
    return {
      params: {
        text:
          lang === 'hi'
            ? '🔍 असामान्यता जाँच हेतु डेटा उपलब्ध नहीं — कनेक्शन जाँचकर पुनः पूछें।'
            : lang === 'bn'
              ? '🔍 অস্বাভাবিকতা পরীক্ষার জন্য ডেটা পাওয়া যাচ্ছে না — সংযোগ পরীক্ষা করে আবার জিজ্ঞেস করুন।'
              : '🔍 I couldn’t gather enough data for an anomaly check — please check your connection and ask again.',
      },
      variant: 'unavailable',
      suggestions: suggestionsFor('admin_anomaly', lang),
    };
  }
  const avg = (a: number, b: number) => (a - b) / 7; // daily avg over trailing 7d window
  const input: AnomalyInput = {
    reportsLast24h: reports24h ?? 0,
    reportsAvg7d: Math.max(0, avg(reports7d ?? 0, reports14d ?? 0)),
    signupsLast24h: signups24h ?? 0,
    signupsAvg7d: Math.max(0, avg(signups7d ?? 0, signups14d ?? 0)),
    cancellationsLast7d: canc7d ?? 0,
    cancellationsAvg7d: Math.max(0, (canc14d ?? 0) - (canc7d ?? 0)),
    dataAvailable: true,
  };
  const findings = detectAnomalies(input);
  return {
    params: { text: formatAnomalySummary(findings, lang) },
    variant: findings.length ? 'findings' : 'calm',
    suggestions: suggestionsFor('admin_anomaly', lang),
  };
}

/* ------------------------------------------------------------------ */
/* admin_draft                                                          */
/* ------------------------------------------------------------------ */

export function adminDraftTask(ctx: TaskCtx): TaskOutcome {
  const lang = ctx.lang || 'en';
  if (!canUseCopilot(ctx.role)) {
    return {
      params: { text: copilotDenied(lang) },
      variant: 'denied',
      suggestions: suggestionsFor('greeting', lang),
    };
  }
  // Topic: everything after the trigger phrase, or the whole input when
  // the router matched loosely. Strip the trigger words for cleanliness.
  const raw = (ctx.input || '').trim();
  const topic = raw
    .replace(/^(please\s+)?(write|draft)(\s+an?)?\s+(announcement|message)\s+(about\s+)?/i, '')
    .replace(/^(घोषणा|संदेश)\s+(लिखो?|लिखिए)\s+/i, '')
    .replace(/^(ঘোষণা|বার্তা)\s+(লিখুন|লেখো)\s+/i, '')
    .trim();
  const draft = buildAnnouncementDraft(topic, lang);
  return {
    params: {
      text: draft,
      topic: topic || undefined,
      note:
        lang === 'hi'
          ? '✏️ यह केवल एक मसौदा है — संपादित करें, फिर स्वयं भेजें। मैं कभी स्वतः प्रकाशित नहीं करता।'
          : lang === 'bn'
            ? '✏️ এটি শুধু একটি খসড়া — সম্পাদনা করুন, তারপর নিজে পাঠান। আমি কখনো স্বয়ংক্রিয়ভাবে প্রকাশ করি না।'
            : '✏️ This is only a draft — edit it, then send it yourself. I never publish on my own.',
    },
    variant: 'draft',
    suggestions: suggestionsFor('admin_draft', lang),
  };
}

/* ------------------------------------------------------------------ */
/* Copilot audit marker — the human's tap, not the AI's action          */
/* ------------------------------------------------------------------ */

/**
 * Log a copilot-assisted admin action to audit_logs. Called by the UI
 * AFTER the human taps — the copilot itself never calls this.
 */
export async function logCopilotAction(
  uid: string,
  action: string,
  targetId: string,
  detail: string
): Promise<void> {
  try {
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    const db = await getDb();
    await addDoc(collection(db, 'audit_logs'), {
      actorUid: uid,
      action,
      targetId,
      detail,
      via: 'copilot',
      createdAt: serverTimestamp(),
    });
  } catch {
    // Audit failure must never block the admin's action.
  }
}
