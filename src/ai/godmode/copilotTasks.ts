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
import type { FigureClaim, TaskCtx, TaskOutcome } from '../types';
import {
  collectionSource,
  historySource,
  numericTokensOf,
  termsSources,
} from './accuracy';
import { checkAgainstBrief } from './ownerBrief';
import {
  buildProposal,
  composeAdviceWithClaims,
  formatSimulation,
  formatTermsHistory,
  formatTermsSummary,
  historyFigureClaims,
  simulateTermsChange,
  simulationFigureClaims,
  termsFigureClaims,
  type TermsHistoryEntryLike,
} from './termsTools';
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
  whereClauses: Array<{ field: string; op: string; value: unknown }> = []
): Promise<number | null> {
  try {
    // QUEUED #36 — exact server counts. The old getDocs+limit read
    // silently CAPPED at 500/1000: past the cap the Copilot would have
    // stated a wrong (too small) figure with full confidence.
    // getCountFromServer returns the true count; failure → null →
    // the executors abstain instead of inventing.
    const { collection, getCountFromServer, query, where } = await import('firebase/firestore');
    const db = await getDb();
    const constraints: unknown[] = whereClauses.map((c) =>
      where(c.field, c.op as never, c.value)
    );
    const snap = await getCountFromServer(
      query(collection(db, collectionName), ...(constraints as never[]))
    );
    return snap.data().count;
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
  const now = Date.now();
  return {
    params: { headline: b.headline, lines: b.lines.join('\n'), text: `${b.headline}\n\n${b.lines.join('\n')}` },
    variant: b.calm ? 'calm' : 'busy',
    suggestions: suggestionsFor('admin_briefing', lang),
    // QUEUED #36 — provenance + cited figures (only when data was read;
    // the unavailable variant cites nothing and claims nothing).
    sources: [
      collectionSource('sevaProfessionals', now),
      collectionSource('sangamPosts', now),
      collectionSource('disputes', now),
    ],
    claims: counts.dataAvailable
      ? [
          { id: 'briefing.pendingVerifications', label: 'Verifications waiting', value: counts.pendingVerifications, rendered: `${counts.pendingVerifications}` },
          { id: 'briefing.flaggedPosts', label: 'Flagged posts to review', value: counts.flaggedPosts, rendered: `${counts.flaggedPosts}` },
          { id: 'briefing.openDisputes', label: 'Open disputes', value: counts.openDisputes, rendered: `${counts.openDisputes}` },
        ]
      : [],
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
    countDocs('campusMaps', []),
  ]);
  // Active users: approximate from recent activity — honest about limits.
  const activeUsers = await countDocs('users', [
    { field: 'lastActiveAt', op: '>=', value: weekAgo },
  ]);
  // QUEUED #36 — activeUsers is part of availability now: previously a
  // failed active-users read printed "0 active seekers" as fact.
  const dataAvailable =
    bookings !== null && signups !== null && temples !== null && activeUsers !== null;
  const stats: PlatformStats = {
    bookingsWeek: bookings ?? 0,
    activeUsersWeek: activeUsers ?? 0,
    newSignupsWeek: signups ?? 0,
    templesMapped: temples ?? 0,
    dataAvailable,
  };
  const now = Date.now();
  return {
    params: { text: formatStats(stats, lang) },
    variant: 'default',
    suggestions: suggestionsFor('admin_stats', lang),
    sources: [
      collectionSource('marketplaceOrders', now),
      collectionSource('users', now),
      collectionSource('campusMaps', now),
    ],
    claims: dataAvailable
      ? [
          { id: 'stats.bookingsWeek', label: 'Bookings this week', value: stats.bookingsWeek, rendered: `${stats.bookingsWeek}` },
          { id: 'stats.activeUsersWeek', label: 'Active seekers this week', value: stats.activeUsersWeek, rendered: `${stats.activeUsersWeek}` },
          { id: 'stats.newSignupsWeek', label: 'New signups this week', value: stats.newSignupsWeek, rendered: `${stats.newSignupsWeek}` },
          { id: 'stats.templesMapped', label: 'Temples mapped', value: stats.templesMapped, rendered: `${stats.templesMapped}` },
        ]
      : [],
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
    // QUEUED #36 — the template rebuilds this answer from items, so the
    // pipeline verifier re-checks the counts against the rebuilt text.
    sources: [collectionSource('sangamPosts', Date.now())],
    claims: [
      { id: 'moderation.flaggedCount', label: 'Flagged posts', value: flagged.length, rendered: `${flagged.length}` },
      ...items.map((i) => ({
        id: `moderation.${i.doc.id}.reportCount`,
        label: `Reports on a flagged post`,
        value: i.doc.reportCount ?? 0,
        rendered: `${i.doc.reportCount ?? 0}`,
      })),
    ],
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
  // QUEUED #36 — the trailing daily average is the PRIOR week's daily
  // rate: (count14d − count7d) / 7. The old formula computed
  // (count7d − count14d) / 7, which is never positive (the 14d window
  // contains the 7d one) and clamped to 0 — so any busy day rendered
  // as "Infinity× the 7-day average", a wrong figure stated confidently.
  const priorWeekDailyAvg = (last7: number, last14: number) =>
    Math.max(0, (last14 - last7) / 7);
  const input: AnomalyInput = {
    reportsLast24h: reports24h ?? 0,
    reportsAvg7d: priorWeekDailyAvg(reports7d ?? 0, reports14d ?? 0),
    signupsLast24h: signups24h ?? 0,
    signupsAvg7d: priorWeekDailyAvg(signups7d ?? 0, signups14d ?? 0),
    cancellationsLast7d: canc7d ?? 0,
    cancellationsAvg7d: Math.max(0, (canc14d ?? 0) - (canc7d ?? 0)),
    dataAvailable: true,
  };
  const findings = detectAnomalies(input);
  const text = formatAnomalySummary(findings, lang);
  // Claims: the raw counts/averages the findings cite. Candidates are
  // kept only when the summary actually cites them (a calm summary
  // cites nothing), so the pipeline check pins exactly what was said.
  const candidates: FigureClaim[] = [
    { id: 'anomaly.reportsLast24h', label: 'Reports in the last 24h', value: input.reportsLast24h, rendered: `${input.reportsLast24h}` },
    { id: 'anomaly.reportsAvg7d', label: 'Reports per day (prior-week average)', value: Math.round(input.reportsAvg7d), rendered: `${Math.round(input.reportsAvg7d)}` },
    { id: 'anomaly.signupsLast24h', label: 'Signups in the last 24h', value: input.signupsLast24h, rendered: `${input.signupsLast24h}` },
    { id: 'anomaly.signupsAvg7d', label: 'Signups per day (prior-week average)', value: Math.round(input.signupsAvg7d), rendered: `${Math.round(input.signupsAvg7d)}` },
    { id: 'anomaly.cancellationsLast7d', label: 'Provider cancellations in 7 days', value: input.cancellationsLast7d, rendered: `${input.cancellationsLast7d}` },
  ];
  return {
    params: { text },
    variant: findings.length ? 'findings' : 'calm',
    suggestions: suggestionsFor('admin_anomaly', lang),
    sources: [
      collectionSource('sangamPosts', now),
      collectionSource('users', now),
      collectionSource('marketplaceOrders', now),
    ],
    claims: candidates.filter((cl) => text.includes(cl.rendered)),
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
/* QUEUED #32 — terms, history, simulation, drafting, counsel          */
/* Every executor re-checks canUseCopilot FIRST (defence in depth —    */
/* the router and canOffer already gate, this is the last wall). The   */
/* Copilot NEVER writes config: draft_change only shapes a proposal;   */
/* the save happens in the Plans & Terms editor, under the owner's     */
/* hand, with its diff-confirm and audit trail.                        */
/* ------------------------------------------------------------------ */

function deniedOutcome(ctx: TaskCtx): TaskOutcome {
  return {
    params: { text: copilotDenied(ctx.lang) },
    variant: 'denied',
    suggestions: suggestionsFor('greeting', ctx.lang),
  };
}

function unavailableText(intent: 'terms' | 'history' | 'advise', lang: TaskCtx['lang']): string {
  if (lang === 'hi') {
    return '🪔 मैं अभी यह रिकॉर्ड नहीं पढ़ सका — मैं अनुमान से आँकड़े नहीं बनाऊँगा। कृपया फिर प्रयास करें।';
  }
  if (lang === 'bn') {
    return '🪔 আমি এখনই রেকর্ডটি পড়তে পারিনি — অনুমানে সংখ্যা বানাব না। আবার চেষ্টা করুন।';
  }
  const what =
    intent === 'terms' ? 'the live terms' : intent === 'history' ? 'the change history' : 'the full picture';
  return `🪔 I couldn't read ${what} just now, and I won't invent figures. Please try again in a moment.`;
}

async function loadTerms() {
  const m = await import('../../lib/termsConfig');
  return m.getTerms();
}

async function loadTermsHistory(limitN = 50): Promise<TermsHistoryEntryLike[] | null> {
  try {
    const mod = await import('../../lib/firestoreAdmin');
    const res = await mod.firestoreAdmin.termsHistory(limitN);
    if (!res || !res.ok) return null;
    const data = res.data as { entries?: TermsHistoryEntryLike[] } | undefined;
    return Array.isArray(data?.entries) ? data.entries : null;
  } catch {
    return null;
  }
}

/** admin_terms — "What are our terms?" Read-only, from the live config. */
export async function adminTermsTask(ctx: TaskCtx): Promise<TaskOutcome> {
  if (!canUseCopilot(ctx.role)) return deniedOutcome(ctx);
  try {
    const terms = await loadTerms();
    let text = formatTermsSummary(terms, ctx.lang);
    const drift = checkAgainstBrief(terms).filter((w) => w.kind === 'drift');
    if (drift.length > 0) {
      text +=
        '\n⚠ Drift from your law baseline:\n' +
        drift.map((w) => `· ${w.message}`).join('\n') +
        '\nLive config always wins — the baseline is your own 2026-10-14 law, there to be questioned, not obeyed blindly.';
    }
    return {
      params: { text },
      variant: terms.loadedAt ? 'default' : 'defaults',
      suggestions: suggestionsFor('admin_terms', ctx.lang),
      sources: termsSources(terms, Date.now()),
      claims: termsFigureClaims(terms),
    };
  } catch {
    return {
      params: { text: unavailableText('terms', ctx.lang) },
      variant: 'unavailable',
      suggestions: suggestionsFor('admin_terms', ctx.lang),
    };
  }
}

/** admin_history — "What changed and when?" from #31's audit entries. */
export async function adminHistoryTask(ctx: TaskCtx): Promise<TaskOutcome> {
  if (!canUseCopilot(ctx.role)) return deniedOutcome(ctx);
  const entries = await loadTermsHistory(50);
  if (!entries) {
    return {
      params: { text: unavailableText('history', ctx.lang) },
      variant: 'unavailable',
      suggestions: suggestionsFor('admin_history', ctx.lang),
    };
  }
  return {
    params: { text: formatTermsHistory(entries, ctx.lang) },
    suggestions: suggestionsFor('admin_history', ctx.lang),
    sources: [historySource(Date.now())],
    claims: historyFigureClaims(entries),
  };
}

/** admin_simulate — pure impact maths. Nothing is written, ever. */
export async function adminSimulateTask(ctx: TaskCtx): Promise<TaskOutcome> {
  if (!canUseCopilot(ctx.role)) return deniedOutcome(ctx);
  // QUEUED #36 — a failed terms load abstains; it never escapes as an
  // unhandled rejection (getTerms fail-opens, but its chunk import can fail).
  let terms;
  try {
    terms = await loadTerms();
  } catch {
    return {
      params: { text: unavailableText('terms', ctx.lang) },
      variant: 'unavailable',
      suggestions: suggestionsFor('admin_simulate', ctx.lang),
    };
  }
  const verdict = buildProposal(ctx.input, terms);
  if (!verdict) {
    const clarify =
      ctx.lang === 'hi'
        ? '🧮 मैं परिदृश्य चला सकता हूँ — बस योजना या दर और नया मूल्य बता दें। उदाहरण: "क्या हो यदि स्टैंडर्ड BDT मासिक ७५० हो जाए?" या "क्या हो यदि रेल-२ १०% हो जाए?"'
        : ctx.lang === 'bn'
          ? '🧮 আমি দৃশ্যকল্প চালাতে পারি — শুধু পরিকল্পনা বা হার আর নতুন মান বলুন। যেমন: "স্ট্যান্ডার্ড BDT মাসিক ৭৫০ হলে কী হবে?" বা "রেল-২ ১০% হলে?"'
          : '🧮 I can run the scenario — just name the plan or rate and the new value. For example: "What if Standard BDT monthly becomes 750?" or "What if Rail-2 goes to 10%?" Nothing is changed by asking.';
    return {
      params: { text: clarify },
      variant: 'clarify',
      suggestions: suggestionsFor('admin_simulate', ctx.lang),
    };
  }
  const sim = simulateTermsChange(terms, verdict.proposal);
  let text = formatSimulation(sim, ctx.lang);
  if (verdict.warnings.length > 0) {
    text += '\n⚠ The editor would flag:\n' + verdict.warnings.map((w) => `· ${w}`).join('\n');
  }
  if (verdict.errors.length > 0) {
    text +=
      '\n⛔ As drafted, this change could NOT be saved:\n' + verdict.errors.map((e) => `· ${e}`).join('\n');
  }
  if (sim.discrepancy) {
    // QUEUED #36 — fail-honest: the formatted text already shows neither
    // figure; the disagreeing values are logged as dev metadata only.
    // eslint-disable-next-line no-console
    console.warn('[copilot] dual-computation discrepancy — figures withheld', sim.discrepancy);
    return {
      params: { text, discrepancy: sim.discrepancy },
      variant: 'discrepancy',
      suggestions: suggestionsFor('admin_simulate', ctx.lang),
      sources: termsSources(terms, Date.now()),
      claims: [],
    };
  }
  return {
    params: { text },
    suggestions: suggestionsFor('admin_simulate', ctx.lang),
    sources: termsSources(terms, Date.now()),
    claims: simulationFigureClaims(terms, sim),
    // Strict: every number in this answer must trace to a claim or to a
    // declared extra (law constants + figures inside warning/error copy,
    // which are quoted from the validators, not computed by the Copilot).
    strictNumbers: true,
    extraNumbers: [
      2,
      10,
      ...numericTokensOf(
        ...verdict.warnings,
        ...verdict.errors,
        ...sim.warnings.map((w) => w.message)
      ),
    ],
  };
}

/** admin_draft_change — shape a proposal card. NEVER writes config. */
export async function adminDraftChangeTask(ctx: TaskCtx): Promise<TaskOutcome> {
  if (!canUseCopilot(ctx.role)) return deniedOutcome(ctx);
  // QUEUED #36 — same abstention guard as simulate.
  let terms;
  try {
    terms = await loadTerms();
  } catch {
    return {
      params: { text: unavailableText('terms', ctx.lang) },
      variant: 'unavailable',
      suggestions: suggestionsFor('admin_draft_change', ctx.lang),
    };
  }
  const verdict = buildProposal(ctx.input, terms);
  if (!verdict) {
    const clarify =
      ctx.lang === 'hi'
        ? '📝 मैं मसौदा बना सकता हूँ — योजना या दर और नया मूल्य स्पष्ट बता दें। उदाहरण: "स्टैंडर्ड BDT मासिक ७५० करें" या "रेल-१ को ७% करें"।'
        : ctx.lang === 'bn'
          ? '📝 আমি খসড়া তৈরি করতে পারি — পরিকল্পনা বা হার আর নতুন মান স্পষ্ট করে বলুন। যেমন: "স্ট্যান্ডার্ড BDT মাসিক ৭৫০ করো" বা "রেল-১ ৭% করো"।'
          : '📝 I can draft it — name the plan or rate and the new value plainly. For example: "Change Standard BDT monthly to 750" or "Set Rail-1 to 7%". I will not guess at your prices.';
    return {
      params: { text: clarify },
      variant: 'clarify',
      suggestions: suggestionsFor('admin_draft_change', ctx.lang),
    };
  }
  const { proposal, errors, warnings } = verdict;
  if (errors.length > 0) {
    return {
      params: {
        text:
          `⛔ I won't draft this — it fails your own validation:\n` +
          errors.map((e) => `· ${e}`).join('\n') +
          '\nAdjust the value and ask again; nothing was prepared.',
      },
      variant: 'invalid',
      suggestions: suggestionsFor('admin_draft_change', ctx.lang),
    };
  }
  const text =
    `📝 Draft ready — ${proposal.fieldLabel}: ${proposal.oldValue} → ${proposal.newValue}.\n` +
    (warnings.length > 0 ? `⚠ The editor will flag:\n${warnings.map((w) => `· ${w}`).join('\n')}\n` : '') +
    'Nothing is saved. Review it in Plans & Terms — the diff, the warnings and the final tap are all yours.';
  return {
    params: {
      text,
      proposal: proposal as unknown as Record<string, unknown>,
    },
    variant: 'proposal',
    suggestions: suggestionsFor('admin_draft_change', ctx.lang),
    sources: termsSources(terms, Date.now()),
    claims: [
      { id: 'draft.oldValue', label: `${proposal.fieldLabel} · current`, value: proposal.oldValue, rendered: `${proposal.oldValue}` },
      { id: 'draft.newValue', label: `${proposal.fieldLabel} · proposed`, value: proposal.newValue, rendered: `${proposal.newValue}` },
    ],
  };
}

/** admin_advise — strategic counsel from the brief + live numbers. */
export async function adminAdviseTask(ctx: TaskCtx): Promise<TaskOutcome> {
  if (!canUseCopilot(ctx.role)) return deniedOutcome(ctx);
  try {
    const terms = await loadTerms();
    const recent = await loadTermsHistory(30);
    // QUEUED #36 — a failed history read passes null (abstain on
    // momentum), never 0 (which counsel would phrase as fact).
    const { text, claims } = composeAdviceWithClaims(
      ctx.input,
      terms,
      { recentChangeCount: recent ? recent.length : null },
      ctx.lang
    );
    return {
      params: { text },
      suggestions: suggestionsFor('admin_advise', ctx.lang),
      sources: termsSources(terms, Date.now()),
      claims,
    };
  } catch {
    return {
      params: { text: unavailableText('advise', ctx.lang) },
      variant: 'unavailable',
      suggestions: suggestionsFor('admin_advise', ctx.lang),
    };
  }
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
