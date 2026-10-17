/**
 * crisis/historyService.ts — Phase 3 (history & management) data layer.
 * =====================================================================
 * Queries + analytics helpers for PersonalHistory, OrgHistory, FamilySafety.
 *
 * PRIVACY (read this before changing any query):
 * - A user may read ONLY: (a) crisis_events they sent (senderUid == self),
 *   (b) responses they wrote (responses/{uid} == self, hydrated with the
 *   parent event they participated in), (c) org events scoped to their own
 *   workspaceId AND only when the UI gate allows (Trustee / Crisis
 *   Coordinator / SuperAdmin), (d) a family member's sent-SOS history only
 *   when that member's familyLinks doc explicitly consents to the viewer.
 * - These are client-side guards. firestore.rules MUST enforce the same
 *   (see Phase 3 report — `familyLinks` has no rule yet and the `responses`
 *   subcollection inherits the broad parent read).
 *
 * Time values: Phase 1 writes epoch ms; normalize everything through
 * `tsToMs()` before arithmetic so Timestamp reads behave identically.
 */

import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  deleteField,
  arrayUnion,
  arrayRemove,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  type CrisisEvent,
  type CrisisResponse,
  type CrisisSituation,
  type CrisisStatus,
  tsToMs,
} from './crisisCommandTypes';

/* ------------------------------------------------------------------ */
/* Phase-3-owned types (kept here — crisisCommandTypes.ts is Phase 2's) */
/* ------------------------------------------------------------------ */

/** Firestore collection names used by the history layer. */
export const CRISIS_COLLECTIONS = {
  events: 'crisis_events',
  responses: 'responses',
} as const;

/** Org-level history filters (OrgHistory). */
export interface OrgEventFilters {
  situation?: CrisisSituation | 'all';
  status?: CrisisStatus | 'all';
  /** inclusive epoch-ms bounds; either may be null. */
  fromMs?: number | null;
  toMs?: number | null;
  search?: string;
}

/** Output of `responseAnalytics()`. */
export interface ResponseAnalytics {
  /** Mean seconds from SOS trigger to first 'coming' response. */
  avgFirstAckSec: number | null;
  /** Mean seconds from SOS trigger to resolution (resolved events only). */
  avgResolveSec: number | null;
  /** Event counts by situation type. */
  bySituation: Record<CrisisSituation, number>;
  /** Per-day event counts for the last 30 days, oldest → newest. */
  trend: { dayStartMs: number; count: number }[];
  /** Events that contributed to the averages (informational). */
  sampleSizeAck: number;
  sampleSizeResolve: number;
  totalEvents: number;
}

/** Structured payload produced by `exportIncident()` for print/PDF. */
export interface IncidentReport {
  event: CrisisEvent;
  responses: CrisisResponse[];
  firstAckSec: number | null;
  resolveSec: number | null;
  generatedAt: number;
  generatedByUid: string;
  generatedByName: string;
}

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

/** Raw doc → CrisisEvent, filling honest defaults (never invented data). */
function toEvent(id: string, data: DocumentData): CrisisEvent {
  return {
    id,
    senderUid: String(data.senderUid ?? ''),
    senderName: String(data.senderName ?? ''),
    senderPhoto: data.senderPhoto ?? null,
    sanId: data.sanId ?? null,
    bloodGroup: data.bloodGroup ?? null,
    situation: (data.situation ?? 'other') as CrisisSituation,
    details: data.details ?? null,
    voiceNoteUrl: data.voiceNoteUrl ?? null,
    location: {
      lat: data.location?.lat ?? null,
      lng: data.location?.lng ?? null,
      address: data.location?.address ?? null,
      capturedAt: data.location?.capturedAt ?? null,
    },
    medicalShare: {
      allergies: Array.isArray(data.medicalShare?.allergies)
        ? data.medicalShare.allergies.map(String)
        : [],
      conditions: Array.isArray(data.medicalShare?.conditions)
        ? data.medicalShare.conditions.map(String)
        : [],
    },
    status: data.status ?? 'active',
    severity: data.severity ?? 'medium',
    orgId: data.orgId ?? null,
    workspaceId: data.workspaceId ?? null,
    familyNotified: Array.isArray(data.familyNotified)
      ? data.familyNotified.map(String)
      : [],
    createdAt: tsToMs(data.createdAt),
    resolvedAt:
      data.resolvedAt == null ? null : tsToMs(data.resolvedAt),
    outcomeNote: data.outcomeNote ?? null,
    ackCount: Number(data.ackCount ?? 0),
    responderCount: Number(data.responderCount ?? 0),
    acknowledgedBy: data.acknowledgedBy,
    acknowledgedAt:
      data.acknowledgedAt == null ? undefined : tsToMs(data.acknowledgedAt),
  };
}

function toResponse(data: DocumentData): CrisisResponse {
  return {
    uid: String(data.uid ?? ''),
    name: String(data.name ?? ''),
    photo: data.photo ?? null,
    status: data.status === 'arrived' ? 'arrived' : 'coming',
    distanceM: data.distanceM == null ? null : Number(data.distanceM),
    createdAt: tsToMs(data.createdAt),
  };
}

function compareDesc(a: CrisisEvent, b: CrisisEvent): number {
  return tsToMs(b.createdAt) - tsToMs(a.createdAt);
}

/* ------------------------------------------------------------------ */
/* Personal history queries (privacy: senderUid == me)                 */
/* ------------------------------------------------------------------ */

/** All SOS I sent, newest first. Client-sorted to avoid a composite index. */
export async function getMySentSOS(uid: string): Promise<CrisisEvent[]> {
  if (!uid) return [];
  const q = query(
    collection(db, CRISIS_COLLECTIONS.events),
    where('senderUid', '==', uid),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toEvent(d.id, d.data())).sort(compareDesc);
}

/** Responses on one event, oldest first (a response timeline). */
export async function getEventResponses(
  eventId: string,
): Promise<CrisisResponse[]> {
  if (!eventId) return [];
  const snap = await getDocs(
    collection(db, CRISIS_COLLECTIONS.events, eventId, CRISIS_COLLECTIONS.responses),
  );
  return snap.docs
    .map((d) => ({ ...toResponse(d.data()), eventId }))
    .sort((a, b) => tsToMs(a.createdAt) - tsToMs(b.createdAt));
}

/** My sent SOS, each hydrated with its responder list (own events only). */
export async function getMySentSOSWithResponses(
  uid: string,
): Promise<{ event: CrisisEvent; responses: CrisisResponse[] }[]> {
  const events = await getMySentSOS(uid);
  const hydrated = await Promise.all(
    events.map(async (event) => ({
      event,
      responses: await getEventResponses(event.id),
    })),
  );
  return hydrated;
}

/**
 * SOS I responded to. Uses collectionGroup('responses') filtered by my uid,
 * then hydrates each parent event — a user only ever sees events they
 * personally participated in.
 */
export async function getMyResponses(
  uid: string,
): Promise<{ event: CrisisEvent; myResponse: CrisisResponse }[]> {
  if (!uid) return [];
  const q = query(
    collectionGroup(db, CRISIS_COLLECTIONS.responses),
    where('uid', '==', uid),
  );
  const snap = await getDocs(q);
  const items = await Promise.all(
    snap.docs.map(async (d) => {
      const parent = d.ref.parent.parent;
      if (!parent) return null;
      const evSnap = await getDoc(parent);
      if (!evSnap.exists()) return null;
      return {
        event: toEvent(evSnap.id, evSnap.data()),
        myResponse: { ...toResponse(d.data()), eventId: parent.id },
      };
    }),
  );
  return items
    .filter(
      (
        i,
      ): i is {
        event: CrisisEvent;
        myResponse: CrisisResponse & { eventId: string };
      } => i !== null,
    )
    .sort((a, b) => tsToMs(b.event.createdAt) - tsToMs(a.event.createdAt));
}

/* ------------------------------------------------------------------ */
/* Org history queries (privacy: workspaceId scope + role gate in UI)   */
/* ------------------------------------------------------------------ */

/** Org events, workspace-scoped. Client-side filter/sort, no composite index. */
export async function getOrgEvents(
  workspaceId: string,
  filters: OrgEventFilters = {},
): Promise<{ event: CrisisEvent; responses: CrisisResponse[] }[]> {
  if (!workspaceId) return [];
  const snap = await getDocs(
    query(
      collection(db, CRISIS_COLLECTIONS.events),
      where('workspaceId', '==', workspaceId),
    ),
  );
  let events = snap.docs.map((d) => toEvent(d.id, d.data()));

  const { situation, status, fromMs, toMs, search } = filters;
  if (situation && situation !== 'all')
    events = events.filter((e) => e.situation === situation);
  if (status && status !== 'all') events = events.filter((e) => e.status === status);
  if (fromMs != null) events = events.filter((e) => tsToMs(e.createdAt) >= fromMs);
  if (toMs != null) events = events.filter((e) => tsToMs(e.createdAt) <= toMs);
  if (search && search.trim()) {
    const needle = search.trim().toLowerCase();
    events = events.filter(
      (e) =>
        e.senderName.toLowerCase().includes(needle) ||
        (e.sanId ?? '').toLowerCase().includes(needle) ||
        (e.details ?? '').toLowerCase().includes(needle),
    );
  }
  events.sort(compareDesc);

  // Hydrate responses only for analytics (first-ack). Bounded: table shows
  // the counters; per-event responses load on demand in the UI.
  const hydrated = await Promise.all(
    events.map(async (event) => ({
      event,
      responses: await getEventResponses(event.id),
    })),
  );
  return hydrated;
}

/* ------------------------------------------------------------------ */
/* Timing + analytics                                                  */
/* ------------------------------------------------------------------ */

/** Seconds from SOS trigger to the first 'coming' response. Null when none. */
export function firstAckSec(
  event: CrisisEvent,
  responses: CrisisResponse[],
): number | null {
  const start = tsToMs(event.createdAt);
  if (!start) return null;
  const candidates: number[] = [];
  if (event.acknowledgedAt) candidates.push(tsToMs(event.acknowledgedAt));
  for (const r of responses) {
    const t = tsToMs(r.createdAt);
    if (t > 0) candidates.push(t);
  }
  if (candidates.length === 0) return null;
  const first = Math.min(...candidates);
  return first >= start ? Math.round((first - start) / 1000) : null;
}

/** Seconds from SOS trigger to resolution. Null unless resolved. */
export function resolveSec(event: CrisisEvent): number | null {
  const start = tsToMs(event.createdAt);
  const end = event.resolvedAt == null ? 0 : tsToMs(event.resolvedAt);
  if (!start || !end || end < start) return null;
  return Math.round((end - start) / 1000);
}

const SITUATIONS: CrisisSituation[] = [
  'medical',
  'fire',
  'robbery',
  'crowd',
  'disaster',
  'other',
];

/**
 * Org response analytics from hydrated events.
 * Every average reports its sample size so "0 events" never masquerades
 * as a fast response.
 */
export function responseAnalytics(
  items: { event: CrisisEvent; responses: CrisisResponse[] }[],
): ResponseAnalytics {
  const bySituation = Object.fromEntries(
    SITUATIONS.map((s) => [s, 0]),
  ) as Record<CrisisSituation, number>;

  const ackSamples: number[] = [];
  const resolveSamples: number[] = [];

  for (const { event, responses } of items) {
    const s = SITUATIONS.includes(event.situation as CrisisSituation)
      ? (event.situation as CrisisSituation)
      : 'other';
    bySituation[s] += 1;
    const ack = firstAckSec(event, responses);
    if (ack != null) ackSamples.push(ack);
    const res = resolveSec(event);
    if (res != null) resolveSamples.push(res);
  }

  const mean = (xs: number[]): number | null =>
    xs.length === 0 ? null : Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);

  // Last-30-days per-day trend, oldest → newest.
  const DAY = 86400000;
  const now = Date.now();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const trend = Array.from({ length: 30 }, (_, i) => {
    const dayStartMs = todayStart.getTime() - (29 - i) * DAY;
    return { dayStartMs, count: 0 };
  });
  for (const { event } of items) {
    const t = tsToMs(event.createdAt);
    if (!t) continue;
    const idx = Math.floor((t - todayStart.getTime()) / DAY) + 29;
    if (idx >= 0 && idx < 30) trend[idx].count += 1;
  }

  return {
    avgFirstAckSec: mean(ackSamples),
    avgResolveSec: mean(resolveSamples),
    bySituation,
    trend,
    sampleSizeAck: ackSamples.length,
    sampleSizeResolve: resolveSamples.length,
    totalEvents: items.length,
  };
}

/* ------------------------------------------------------------------ */
/* Export: structured incident data + print-friendly rendering         */
/* ------------------------------------------------------------------ */

export function exportIncident(
  event: CrisisEvent,
  responses: CrisisResponse[],
  generatedBy: { uid: string; name: string },
): IncidentReport {
  return {
    event,
    responses: [...responses].sort(
      (a, b) => tsToMs(a.createdAt) - tsToMs(b.createdAt),
    ),
    firstAckSec: firstAckSec(event, responses),
    resolveSec: resolveSec(event),
    generatedAt: Date.now(),
    generatedByUid: generatedBy.uid,
    generatedByName: generatedBy.name,
  };
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtDur(sec: number | null): string {
  if (sec == null) return '—';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ${sec % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function fmtDate(ms: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Opens a print-friendly incident summary in a new window and calls
 * window.print(). Dignified, monochrome, letterhead-free — a record,
 * not a certificate.
 */
export function printIncidentReport(
  report: IncidentReport,
  strings: {
    title: string;
    generatedBy: string;
    on: string;
    situation: string;
    status: string;
    triggeredAt: string;
    resolvedAt: string;
    location: string;
    details: string;
    outcome: string;
    responders: string;
    name: string;
    role: string;
    respondedAt: string;
    firstAck: string;
    resolutionTime: string;
    notRecorded: string;
    coming: string;
    arrived: string;
    footer: string;
  },
): void {
  const { event, responses } = report;
  const rows = responses
    .map(
      (r) => `<tr>
        <td>${esc(r.name)}</td>
        <td>${r.status === 'arrived' ? esc(strings.arrived) : esc(strings.coming)}</td>
        <td>${esc(fmtDate(tsToMs(r.createdAt)))}</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esc(strings.title)} — ${esc(event.id)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #1c1917; margin: 40px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .meta { color: #57534e; font-size: 13px; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: 160px 1fr; row-gap: 8px; margin-bottom: 24px; }
  .label { font-weight: bold; color: #44403c; font-size: 13px; }
  .value { font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #d6d3d1; padding: 8px 10px; font-size: 13px; text-align: left; }
  th { background: #f5f5f4; }
  .footer { margin-top: 32px; font-size: 12px; color: #78716c; border-top: 1px solid #e7e5e4; padding-top: 12px; }
  @media print { body { margin: 0; } }
</style></head><body>
  <h1>${esc(strings.title)}</h1>
  <div class="meta">${esc(strings.generatedBy)}: ${esc(report.generatedByName)} · ${esc(strings.on)} ${esc(fmtDate(report.generatedAt))}</div>
  <div class="grid">
    <div class="label">${esc(strings.situation)}</div><div class="value">${esc(event.situation)}</div>
    <div class="label">${esc(strings.status)}</div><div class="value">${esc(event.status)}</div>
    <div class="label">${esc(strings.triggeredAt)}</div><div class="value">${esc(fmtDate(tsToMs(event.createdAt)))}</div>
    <div class="label">${esc(strings.resolvedAt)}</div><div class="value">${event.resolvedAt ? esc(fmtDate(tsToMs(event.resolvedAt))) : esc(strings.notRecorded)}</div>
    <div class="label">${esc(strings.firstAck)}</div><div class="value">${esc(fmtDur(report.firstAckSec))}</div>
    <div class="label">${esc(strings.resolutionTime)}</div><div class="value">${esc(fmtDur(report.resolveSec))}</div>
    <div class="label">${esc(strings.location)}</div><div class="value">${esc(event.location?.address ?? '—')}</div>
    <div class="label">${esc(strings.details)}</div><div class="value">${esc(event.details ?? '—')}</div>
    <div class="label">${esc(strings.outcome)}</div><div class="value">${esc(event.outcomeNote ?? '—')}</div>
  </div>
  <h2 style="font-size:16px">${esc(strings.responders)} (${responses.length})</h2>
  <table><thead><tr><th>${esc(strings.name)}</th><th>${esc(strings.role)}</th><th>${esc(strings.respondedAt)}</th></tr></thead>
  <tbody>${rows || `<tr><td colspan="3">${esc(strings.notRecorded)}</td></tr>`}</tbody></table>
  <div class="footer">${esc(strings.footer)}</div>
</body></html>`;

  const w = window.open('', '_blank', 'noopener,width=800,height=900');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  // Give the document a beat to render before the print dialog.
  setTimeout(() => {
    w.print();
  }, 350);
}

/* ------------------------------------------------------------------ */
/* Family safety circle (familyLinks)                                   */
/* ------------------------------------------------------------------ */

export interface FamilyLinkRecord {
  linkedUids: string[];
  consents: Record<string, { granted: boolean; grantedAt?: number }>;
  incomingInvites: Record<
    string,
    {
      fromUid: string;
      fromName: string;
      fromPhoto?: string | null;
      fromSanId?: string | null;
      status: 'pending' | 'accepted' | 'declined';
      createdAt: number;
    }
  >;
  outgoingInvites: Record<
    string,
    {
      fromUid: string;
      fromName: string;
      fromPhoto?: string | null;
      fromSanId?: string | null;
      status: 'pending' | 'accepted' | 'declined';
      createdAt: number;
    }
  >;
}

const EMPTY_LINKS: FamilyLinkRecord = {
  linkedUids: [],
  consents: {},
  incomingInvites: {},
  outgoingInvites: {},
};

function toFamilyLinks(data: DocumentData | undefined): FamilyLinkRecord {
  if (!data) return { ...EMPTY_LINKS };
  return {
    linkedUids: Array.isArray(data.linkedUids)
      ? data.linkedUids.map(String)
      : [],
    consents:
      data.consents && typeof data.consents === 'object'
        ? data.consents
        : {},
    incomingInvites:
      data.incomingInvites && typeof data.incomingInvites === 'object'
        ? data.incomingInvites
        : {},
    outgoingInvites:
      data.outgoingInvites && typeof data.outgoingInvites === 'object'
        ? data.outgoingInvites
        : {},
  };
}

export async function getFamilyLinks(uid: string): Promise<FamilyLinkRecord> {
  if (!uid) return { ...EMPTY_LINKS };
  const snap = await getDoc(doc(db, 'familyLinks', uid));
  return toFamilyLinks(snap.exists() ? snap.data() : undefined);
}

export interface LinkedProfile {
  uid: string;
  sanId: string | null;
  displayName: string;
}

/** Find a Sanatani by their SAN-XXXXXX id or registered phone. */
export async function lookupProfileBySanIdOrPhone(
  input: string,
): Promise<LinkedProfile | null> {
  const needle = input.trim().toUpperCase();
  if (!needle) return null;
  const col = collection(db, 'sanataniProfiles');
  // Try Sanatani ID first, then phone.
  const attempts = [
    query(col, where('id', '==', needle)),
    query(col, where('id', '==', input.trim())),
    query(col, where('phone', '==', input.trim())),
  ];
  for (const q of attempts) {
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      const data = d.data();
      return {
        uid: d.id,
        sanId: (data.id as string) ?? null,
        displayName: String(data.displayName ?? 'Sanatani'),
      };
    }
  }
  return null;
}

/**
 * Send a family-circle invite. Writes a pending invite onto the TARGET's
 * doc — nothing is visible to the inviter until the target grants consent.
 * (Requires firestore.rules to permit this write; see Phase 3 report.)
 */
export async function sendFamilyInvite(
  inviter: { uid: string; name: string; photo?: string | null; sanId?: string | null },
  targetUid: string,
): Promise<void> {
  if (!inviter.uid || !targetUid || inviter.uid === targetUid) return;
  const now = Date.now();
  const invite = {
    fromUid: inviter.uid,
    fromName: inviter.name,
    fromPhoto: inviter.photo ?? null,
    fromSanId: inviter.sanId ?? null,
    status: 'pending' as const,
    createdAt: now,
  };
  await setDoc(
    doc(db, 'familyLinks', targetUid),
    { incomingInvites: { [inviter.uid]: invite } },
    { merge: true },
  );
  await setDoc(
    doc(db, 'familyLinks', inviter.uid),
    { outgoingInvites: { [targetUid]: { ...invite, fromUid: targetUid } } },
    { merge: true },
  );
}

/**
 * Accept an invite — mutual consent is recorded on BOTH docs. Accepting IS
 * the consent grant; either side can revoke later.
 */
export async function acceptFamilyInvite(
  myUid: string,
  fromUid: string,
): Promise<void> {
  if (!myUid || !fromUid) return;
  const now = Date.now();
  const mine = doc(db, 'familyLinks', myUid);
  const theirs = doc(db, 'familyLinks', fromUid);
  await setDoc(
    mine,
    {
      linkedUids: arrayUnion(fromUid),
      consents: { [fromUid]: { granted: true, grantedAt: now } },
      incomingInvites: { [fromUid]: deleteField() },
    },
    { merge: true },
  );
  await setDoc(
    theirs,
    {
      linkedUids: arrayUnion(myUid),
      consents: { [myUid]: { granted: true, grantedAt: now } },
      outgoingInvites: { [myUid]: deleteField() },
    },
    { merge: true },
  );
}

/** Decline — invites vanish from both sides, no link, no consent. */
export async function declineFamilyInvite(
  myUid: string,
  fromUid: string,
): Promise<void> {
  if (!myUid || !fromUid) return;
  await updateDoc(doc(db, 'familyLinks', myUid), {
    [`incomingInvites.${fromUid}`]: deleteField(),
  }).catch(() => undefined);
  await updateDoc(doc(db, 'familyLinks', fromUid), {
    [`outgoingInvites.${myUid}`]: deleteField(),
  }).catch(() => undefined);
}

/** Revoke a link — removes the link and consent on BOTH docs. */
export async function revokeFamilyLink(
  myUid: string,
  otherUid: string,
): Promise<void> {
  if (!myUid || !otherUid) return;
  const mine = doc(db, 'familyLinks', myUid);
  const theirs = doc(db, 'familyLinks', otherUid);
  await setDoc(
    mine,
    {
      linkedUids: arrayRemove(otherUid),
      consents: { [otherUid]: deleteField() },
    },
    { merge: true },
  ).catch(() => undefined);
  await setDoc(
    theirs,
    {
      linkedUids: arrayRemove(myUid),
      consents: { [myUid]: deleteField() },
    },
    { merge: true },
  ).catch(() => undefined);
}

/**
 * A linked member's SOS history, visible to `viewerUid` ONLY when the
 * member's own familyLinks doc records consent for that viewer.
 * No consent = empty list, never an error leak.
 */
export async function getConsentedMemberEvents(
  viewerUid: string,
  memberUid: string,
): Promise<{ event: CrisisEvent; responses: CrisisResponse[] }[]> {
  if (!viewerUid || !memberUid || viewerUid === memberUid) return [];
  const links = await getFamilyLinks(memberUid);
  const consent = links.consents[viewerUid];
  if (!consent?.granted || !links.linkedUids.includes(viewerUid)) return [];
  const events = await getMySentSOS(memberUid);
  return Promise.all(
    events.map(async (event) => ({
      event,
      responses: await getEventResponses(event.id),
    })),
  );
}
