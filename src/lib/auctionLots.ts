/**
 * auctionLots.ts — AUCTION WAVE A1: "Nilam", the record-first
 * auction & allotment desk.
 * =====================================================================
 * A religious institution rarely SELLS — it allots rights: shop
 * and stall leases, agricultural land leases, festival rights,
 * movables. Outright sale of immovable property is the rare,
 * heavily-guarded exception (TN HR&CE Act s.34: void without
 * sanction; Maharashtra Public Trusts Act s.36: prior Charity
 * Commissioner sanction; the Supreme Court in Chenchu Rami Reddy
 * quashed a private sale — public auction is the rule).
 *
 * A1 builds the defensible RECORD around the hall/public auction
 * most small organisations will still run in person — no live
 * bidding (A2 sealed, A3 open-ascending are later waves):
 *
 *   draft → approved → noticed → open → accepted → settled
 *                     ↘ failed / withdrawn (recorded, never deleted)
 *
 * The two-person law rides the EXISTING maker–checker approvals
 * system (lib/approvals, kind 'auction.lot'): leaving draft and
 * recording the outcome are both filed as sealed payloads and
 * applied by a DIFFERENT checker's decision — what the checker
 * confirms is provably what lands (payloadDigest). In DEMO_
 * workspaces the approvals service refuses by design (its own
 * header: demo keeps the direct flow), so the desk stamps the
 * decision directly with the seal digest recorded on the lot —
 * the stamp says so.
 *
 * PRINCIPLE (the plan's law): the app is the record and the
 * arena — never the permission. Statutory sanction lives
 * outside; the lot REFUSES to move past 'approved' toward a
 * notice without the sanction record where the class demands
 * it (immovable-sale, or a lease over 5 years), in the client
 * guards here AND in firestore.rules. For Bangladesh the legal
 * position on debutter sales is unverified — the desk prints
 * the caution on the lot and never presents an in-app approval
 * as legal permission.
 *
 * MONEY: settlement posts through DataContext.addTreasuryTransaction
 * (the one choke point) from the DESK, and stamps the real tx id
 * on the lot (the E6 linkedTxId discipline — a stamped id blocks
 * re-posting). EMD is refundable custody money: it is RECORDED
 * on each registration (amount, mode, reference, refund stamp),
 * never posted as income.
 *
 * REGISTRATIONS ride the lot doc as one bounded array (cap 100,
 * pinned in rules). A hall allotment's register is small; one
 * doc keeps the record atomic with the lot it belongs to — no
 * subcollection, no second rules surface. The cap is the doc-
 * size guard: 100 registrations × a small record stays far
 * under Firestore's 1 MiB doc limit.
 *
 * A2 (sealed-then-open) adds the one exception to the no-
 * subcollection posture, for a reason A1's array cannot serve:
 * a sealed bid must be unreadable by EVERYONE — the committee
 * included — until the window closes, and an array on the lot
 * doc is readable by anyone who can read the lot. Bids therefore
 * live as one doc per bidder under the lot (lib/auctionBids),
 * their doc id the bidder's uid, guarded by rules that let only
 * the bidder touch them before the lot's stored close clock.
 * The lot itself gains only the launch facts: its mode (frozen),
 * the sealed-bidder register (the uids of registrations whose
 * EMD is in — grow-only in rules), and the opening stamp.
 *
 * The pure half (transitions, gates, clocks, aggregates, the
 * approval snapshots, the public result card inputs) carries no
 * Firestore and is unit-tested; the Firestore half is thin
 * writes shaped by the pure half.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  payloadDigest,
  type ApprovalRequestDoc,
} from './approvals';
import { approvalService } from '../context/data/approvalsStore';
import type { ApprovalActor } from './approvals';

/* ------------------------------------------------------------------ */
/* The lot record (auction_lots)                                       */
/* ------------------------------------------------------------------ */

export type LotClass = 'rights-lease' | 'movables' | 'immovable-sale';

export type LotStatus =
  | 'draft'
  | 'approved'
  | 'noticed'
  | 'open'
  | 'accepted'
  | 'settled'
  | 'failed'
  | 'withdrawn';

export interface LotSource {
  kind: 'asset' | 'property' | 'standalone';
  /** AssetRecord.id or BhoomiProperty.id, when kind is not standalone. */
  refId?: string;
  /** The register label at drafting (the record's own words). */
  label: string;
}

export interface ValuationBasis {
  kind: 'independent-valuer' | 'committee-estimate';
  valuerName?: string;
  /** ISO date (yyyy-mm-dd) the valuation was made. */
  valuedOn?: string;
  /** The valued figure, in the workspace's currency units. */
  figure: number;
}

export interface SanctionRecord {
  authority: string;
  reference: string;
  /** ISO date (yyyy-mm-dd) of the sanction order. */
  date: string;
}

/** One lifecycle stamp: when a status was entered, and by whom. */
export interface LotStamp {
  at: number;
  by: string;
  byName?: string;
  /** The approval request that carried the step, when sealed. */
  ref?: string;
}

export interface LotNotice {
  /** Epoch ms the notice was published (the 'noticed' stamp). */
  publishedAt: number;
  /** Epoch ms of the auction itself. */
  auctionAt: number;
  auctionPlace: string;
  /** Inspection window, ISO dates. */
  inspectionFrom?: string;
  inspectionTo?: string;
  /** Epoch ms — objections may arrive until this moment. */
  objectionDeadline: number;
  /** The earnest-money deposit a bidder must lodge, per registration. */
  emdAmount: number;
}

export interface NoticeAffixture {
  place: 'temple-board' | 'panchayat-board' | 'municipal-board' | 'newspaper' | 'other';
  placeNote?: string;
  /** ISO date the notice was affixed/published there. */
  date: string;
  photoRef?: string;
}

export interface LotObjection {
  id: string;
  objectorName: string;
  contact?: string;
  text: string;
  /** ISO date received. */
  receivedOn: string;
  response?: string;
  respondedOn?: string;
  respondedBy?: string;
}

export interface LotRegistration {
  id: string;
  name: string;
  phone: string;
  idReference: string;
  /** A2: the bidder's app account uid, when they will bid from
   *  the app on a sealed lot. The desk copies it from the
   *  bidder's own profile at registration; its presence is what
   *  puts the uid on the lot's sealed-bidder register. */
  bidderUid?: string;
  /** Related to a trustee/staff member — declared, never hidden. */
  relatedParty: boolean;
  relationNote?: string;
  emdAmount: number;
  emdMode: 'cash' | 'dd' | 'transfer';
  emdReference?: string;
  /** Epoch ms the EMD was received at the desk. */
  receivedAt: number;
  /** Epoch ms the EMD was refunded (losers; winner if not adjusted). */
  refundedAt?: number;
  /** A defaulter/barred note recorded against this bidder. */
  barredNote?: string;
}

export interface LotOutcome {
  winnerRegistrationId: string;
  winnerName: string;
  winningAmount: number;
  /** ISO date the auction was held. */
  auctionDate: string;
  conductorName: string;
  attendanceCount?: number;
  /** May the winner's name appear on the public result card?
   *  Set deliberately at acceptance (see auctionResultCard). */
  publishWinnerName: boolean;
}

export interface LotSettlement {
  depositTxId?: string;
  depositAmount?: number;
  balanceTxId?: string;
  balanceAmount?: number;
}

/** How a lot takes its bids — chosen at creation, frozen after
 *  (the rules pin it like lotClass):
 *  - 'hall'   — the A1 record: the auction happens in the hall,
 *               this desk remembers it. No electronic bids exist.
 *  - 'sealed' — A2: registered bidders submit one sealed bid
 *               each in the app (lib/auctionBids); the committee
 *               opens them together after the close clock. */
export type LotMode = 'hall' | 'sealed';

export interface AuctionLot {
  id: string;
  workspaceId: string;
  source: LotSource;
  lotClass: LotClass;
  /** A2 launch fact; absent on A1 lots, which read as 'hall'. */
  lotMode?: LotMode;
  /** A2: the sealed-bidder register — uids of registrations
   *  whose bidder will bid from the app. Grow-only in rules;
   *  derived from the registrations by the desk (never typed
   *  separately), so the two can never disagree. */
  bidderUids?: string[];
  /** A2: the opening stamp — when the committee opened the
   *  sealed bids, and who. Bookkeeping on the lot (the audit
   *  chain carries the tamper-evident event); sealing itself
   *  is enforced by the bid read rules' close clock, never by
   *  this stamp. */
  bidsOpenedAt?: number;
  bidsOpenedBy?: string;
  bidsOpenedByName?: string;
  title: string;
  description: string;
  /** Photo/document references (existing upload posture — refs only). */
  mediaRefs: string[];
  reservePrice: number;
  valuationBasis?: ValuationBasis;
  sanction?: SanctionRecord;
  /** For rights-lease lots: the lease term in years, when known. */
  leaseTermYears?: number;
  status: LotStatus;
  history: Partial<Record<LotStatus, LotStamp>> & { draft: LotStamp };
  notice?: LotNotice;
  affixtures: NoticeAffixture[];
  objections: LotObjection[];
  registrations: LotRegistration[];
  outcome?: LotOutcome;
  settlement?: LotSettlement;
  /** The recorded reason a lot failed or was withdrawn. */
  failReason?: string;
  createdAt: number;
  updatedAt: number;
}

/* ------------------------------------------------------------------ */
/* Pure law: transitions, gates, clocks                                */
/* ------------------------------------------------------------------ */

/** The lifecycle machine — the same table firestore.rules pins. */
export const LOT_TRANSITIONS: Record<LotStatus, readonly LotStatus[]> = {
  draft: ['approved', 'withdrawn'],
  approved: ['noticed', 'withdrawn'],
  noticed: ['open', 'withdrawn'],
  open: ['accepted', 'failed', 'withdrawn'],
  accepted: ['settled', 'failed'],
  settled: [],
  failed: [],
  withdrawn: [],
};

export function canTransitionLot(from: LotStatus, to: LotStatus): boolean {
  if (from === to) return false;
  return (LOT_TRANSITIONS[from] ?? []).includes(to);
}

export const TERMINAL_STATUSES: readonly LotStatus[] = ['settled', 'failed', 'withdrawn'];

/** Minimum public-notice days before the auction, by class —
 *  the TN Lease Rules / Alienation Rules clocks from the plan. */
export const NOTICE_MIN_DAYS: Record<LotClass, number> = {
  'rights-lease': 15,
  movables: 15,
  'immovable-sale': 30,
};

const DAY_MS = 86_400_000;

/** The notice clock: the auction may not fall inside the minimum
 *  notice period measured from publication. */
export function noticeClockOk(lotClass: LotClass, publishedAtMs: number, auctionAtMs: number): boolean {
  if (!Number.isFinite(publishedAtMs) || !Number.isFinite(auctionAtMs)) return false;
  return auctionAtMs - publishedAtMs >= NOTICE_MIN_DAYS[lotClass] * DAY_MS;
}

/** The earliest lawful auction moment for a notice published at `fromMs`. */
export function earliestAuctionAt(lotClass: LotClass, fromMs: number): number {
  return fromMs + NOTICE_MIN_DAYS[lotClass] * DAY_MS;
}

/**
 * The sanction gate: an immovable sale ALWAYS needs the sanction
 * record; a rights-lease needs it when the term runs beyond five
 * years (the s.34 line). Movables and short leases do not.
 */
export function sanctionRequiredFor(lot: Pick<AuctionLot, 'lotClass' | 'leaseTermYears'>): boolean {
  if (lot.lotClass === 'immovable-sale') return true;
  if (lot.lotClass === 'rights-lease' && typeof lot.leaseTermYears === 'number' && lot.leaseTermYears > 5) {
    return true;
  }
  return false;
}

export function sanctionPresent(lot: Pick<AuctionLot, 'sanction'>): boolean {
  const s = lot.sanction;
  return !!s && s.authority.trim().length > 0 && s.reference.trim().length > 0;
}

export function valuationPresent(lot: Pick<AuctionLot, 'valuationBasis'>): boolean {
  const v = lot.valuationBasis;
  return !!v && Number.isFinite(v.figure) && v.figure >= 0;
}

export function openObjectionsOf(lot: Pick<AuctionLot, 'objections'>): LotObjection[] {
  return (lot.objections ?? []).filter((o) => !o.response || o.response.trim().length === 0);
}

export type LotGateIssue =
  | 'status'
  | 'valuation'
  | 'sanction'
  | 'notice-clock'
  | 'objections-open'
  | 'registrations-cap'
  | 'winner'
  | 'settlement-incomplete';

/**
 * Every gate a step must pass, as issue codes the desk renders.
 * `step` is the status the lot wants to enter. Pure — the desk,
 * the applier and the tests all read the same law.
 */
export function lotGateIssues(
  lot: AuctionLot,
  step: LotStatus,
  now: number
): LotGateIssue[] {
  const issues: LotGateIssue[] = [];
  if (!canTransitionLot(lot.status, step)) issues.push('status');
  if (step !== 'draft' && step !== 'withdrawn' && lot.status === 'draft' && !valuationPresent(lot)) {
    issues.push('valuation');
  }
  const pastApproved: LotStatus[] = ['noticed', 'open', 'accepted', 'settled'];
  if (pastApproved.includes(step) && sanctionRequiredFor(lot) && !sanctionPresent(lot)) {
    issues.push('sanction');
  }
  if (step === 'noticed') {
    const auctionAt = lot.notice?.auctionAt ?? 0;
    if (!noticeClockOk(lot.lotClass, now, auctionAt)) issues.push('notice-clock');
  }
  if (step === 'accepted' && openObjectionsOf(lot).length > 0) {
    issues.push('objections-open');
  }
  if (step === 'accepted') {
    const w = lot.outcome?.winnerRegistrationId;
    if (!w || !(lot.registrations ?? []).some((r) => r.id === w)) issues.push('winner');
  }
  if (step === 'settled') {
    const s = lot.settlement ?? {};
    if (!s.balanceTxId) issues.push('settlement-incomplete');
  }
  return issues;
}

/* ------------------------------------------------------------------ */
/* Pure aggregates                                                     */
/* ------------------------------------------------------------------ */

/** The registrations cap — pinned identically in firestore.rules. */
export const REGISTRATIONS_CAP = 100;

export interface RegistrationTotals {
  count: number;
  emdHeld: number;
  emdRefunded: number;
  refundedCount: number;
  relatedCount: number;
  barredCount: number;
}

export function registrationTotals(lot: Pick<AuctionLot, 'registrations'>): RegistrationTotals {
  const regs = lot.registrations ?? [];
  let emdHeld = 0;
  let emdRefunded = 0;
  let refundedCount = 0;
  let relatedCount = 0;
  let barredCount = 0;
  for (const r of regs) {
    if (r.refundedAt) {
      emdRefunded += r.emdAmount || 0;
      refundedCount += 1;
    } else {
      emdHeld += r.emdAmount || 0;
    }
    if (r.relatedParty) relatedCount += 1;
    if (r.barredNote) barredCount += 1;
  }
  return { count: regs.length, emdHeld, emdRefunded, refundedCount, relatedCount, barredCount };
}

/* ------------------------------------------------------------------ */
/* A2 — the sealed mode's pure law                                     */
/* ------------------------------------------------------------------ */

export function isSealedLot(lot: Pick<AuctionLot, 'lotMode'>): boolean {
  return lot.lotMode === 'sealed';
}

/** The close clock of a sealed lot: the notice's auction moment.
 *  It is frozen with the notice (the rules freeze the notice at
 *  publication), so the deadline cannot be quietly moved. 0 when
 *  the lot carries no notice yet. */
export function sealedCloseMs(lot: Pick<AuctionLot, 'notice'>): number {
  return lot.notice?.auctionAt ?? 0;
}

export type SealedWindowState = 'not-open' | 'open' | 'closed';

/**
 * Where a sealed lot's bidding window stands, judged from the
 * record itself (the same facts the rules judge):
 *  - 'open'   — the lot is 'open', sealed, and the close clock
 *               has not passed: bids may be placed/replaced/
 *               withdrawn by their own bidders, and read by NO
 *               one else;
 *  - 'closed' — the close clock has passed: bids are frozen and
 *               the committee may read them (the opening);
 *  - 'not-open' — anything else (no notice, not yet open, or a
 *               hall lot): no bid may move.
 */
export function sealedWindowState(
  lot: Pick<AuctionLot, 'lotMode' | 'status' | 'notice'>,
  now: number
): SealedWindowState {
  if (!isSealedLot(lot)) return 'not-open';
  const close = sealedCloseMs(lot);
  if (close > 0 && now >= close) return 'closed';
  if (lot.status === 'open' && close > 0 && now < close) return 'open';
  return 'not-open';
}

/** The sealed-bidder register, derived from the registrations:
 *  the uids of registered bidders who will bid from the app,
 *  deduped, in registration order. The desk stamps exactly this
 *  on the lot whenever the register changes, so the rules-side
 *  list can never disagree with the register it mirrors. */
export function bidderUidsFromRegistrations(
  registrations: readonly LotRegistration[]
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of registrations ?? []) {
    const uid = (r.bidderUid ?? '').trim();
    if (uid && !seen.has(uid)) {
      seen.add(uid);
      out.push(uid);
    }
  }
  return out;
}

/** What remains for the winner to pay after the recorded deposit. */
export function balanceDue(lot: Pick<AuctionLot, 'outcome' | 'settlement'>): number {
  const total = lot.outcome?.winningAmount ?? 0;
  const deposit = lot.settlement?.depositAmount ?? 0;
  return Math.max(0, total - deposit);
}

/* ------------------------------------------------------------------ */
/* Maker–checker snapshots (the sealed payloads)                       */
/* ------------------------------------------------------------------ */

export type LotApprovalStep = 'approve' | 'accept';

/**
 * The sealed snapshot a checker confirms. For 'approve': the lot
 * as drafted (title, class, reserve, valuation figure, sanction
 * reference) — if the draft drifts after filing, the applier
 * refuses. For 'accept': the recorded outcome itself — winner,
 * amount, conductor — exactly what lands on the lot.
 */
export interface LotApprovalPayload {
  lotId: string;
  step: LotApprovalStep;
  title: string;
  lotClass: LotClass;
  reservePrice: number;
  valuationFigure: number | null;
  sanctionReference: string | null;
  outcome?: LotOutcome;
}

export function buildLotApprovalPayload(lot: AuctionLot, step: LotApprovalStep): LotApprovalPayload {
  const base: LotApprovalPayload = {
    lotId: lot.id,
    step,
    title: lot.title,
    lotClass: lot.lotClass,
    reservePrice: lot.reservePrice,
    valuationFigure: lot.valuationBasis?.figure ?? null,
    sanctionReference: lot.sanction?.reference ?? null,
  };
  if (step === 'accept' && lot.outcome) base.outcome = lot.outcome;
  return base;
}

/** Does the live lot still match the sealed 'approve' snapshot? */
export function approveSnapshotMatches(lot: AuctionLot, p: LotApprovalPayload): boolean {
  return (
    lot.title === p.title &&
    lot.lotClass === p.lotClass &&
    lot.reservePrice === p.reservePrice &&
    (lot.valuationBasis?.figure ?? null) === p.valuationFigure &&
    (lot.sanction?.reference ?? null) === p.sanctionReference
  );
}

/* ------------------------------------------------------------------ */
/* Firestore half — thin writes shaped by the pure half                */
/* ------------------------------------------------------------------ */

const LOTS = 'auction_lots';

const newLotId = () =>
  `lot_${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`;

const clean = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export async function createLot(
  input: Omit<AuctionLot, 'id' | 'status' | 'history' | 'affixtures' | 'objections' | 'registrations' | 'createdAt' | 'updatedAt' | 'lotMode' | 'bidderUids'>
    & { lotMode?: LotMode; bidderUids?: string[] },
  actor: { uid: string; name?: string },
  now: number
): Promise<AuctionLot> {
  const lot: AuctionLot = {
    ...input,
    // A2 launch facts are always written explicitly (the rules
    // pin the birth shape): hall mode and an empty bidder
    // register unless the desk chose the sealed mode.
    lotMode: input.lotMode ?? 'hall',
    bidderUids: input.bidderUids ?? [],
    // Settlement is a full (empty) map from birth, never null, so the
    // rules can read its tx ids with .get() defaults safely.
    settlement: input.settlement ?? { depositAmount: 0, depositTxId: '', balanceTxId: '' },
    id: newLotId(),
    status: 'draft',
    history: { draft: { at: now, by: actor.uid, ...(actor.name ? { byName: actor.name } : {}) } },
    affixtures: [],
    objections: [],
    registrations: [],
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(db, LOTS, lot.id), clean(lot));
  return lot;
}

export async function loadWorkspaceLots(workspaceId: string): Promise<AuctionLot[]> {
  const snap = await getDocs(query(collection(db, LOTS), where('workspaceId', '==', workspaceId)));
  const rows = snap.docs.map((d) => d.data() as AuctionLot);
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getLot(lotId: string): Promise<AuctionLot | null> {
  const snap = await getDoc(doc(db, LOTS, lotId));
  return snap.exists() ? (snap.data() as AuctionLot) : null;
}

/** A field patch on the lot (the desk's edit path) — updatedAt always moves. */
export async function patchLot(lotId: string, patch: Partial<AuctionLot>, now: number): Promise<void> {
  await updateDoc(doc(db, LOTS, lotId), clean({ ...patch, updatedAt: now }));
}

/**
 * A lifecycle transition, guarded by the pure law before the
 * write. Stamps history for the new status. Throws an Error whose
 * message is the first gate issue code.
 */
export async function transitionLot(
  lot: AuctionLot,
  to: LotStatus,
  actor: { uid: string; name?: string },
  now: number,
  extra?: Partial<AuctionLot>
): Promise<void> {
  const issues = lotGateIssues({ ...lot, ...(extra ?? {}) }, to, now);
  if (issues.length > 0) throw new Error(issues[0]);
  const history = {
    ...lot.history,
    [to]: { at: now, by: actor.uid, ...(actor.name ? { byName: actor.name } : {}) },
  };
  await updateDoc(doc(db, LOTS, lot.id), clean({ ...extra, status: to, history, updatedAt: now }));
}

/* ------------------------------------------------------------------ */
/* Maker–checker: file + apply (kind 'auction.lot')                    */
/* ------------------------------------------------------------------ */

/**
 * File the sealed request for a step. DEMO_ workspaces are
 * refused by ApprovalService.request by design — the desk
 * catches that code and takes the documented direct-stamp path.
 */
export async function fileLotApproval(
  lot: AuctionLot,
  step: LotApprovalStep,
  actor: ApprovalActor,
  workspaceName: string
): Promise<ApprovalRequestDoc> {
  const payload = buildLotApprovalPayload(lot, step) as unknown as Record<string, unknown>;
  const summary =
    step === 'approve'
      ? `Nilam lot approval — ${lot.title}`
      : `Nilam outcome — ${lot.title} (${lot.outcome?.winnerName ?? ''})`;
  return approvalService.request(
    {
      workspaceId: lot.workspaceId,
      workspaceName,
      kind: 'auction.lot',
      payload,
      summary,
      ...(step === 'accept' && lot.outcome ? { amount: lot.outcome.winningAmount } : {}),
    },
    actor
  );
}

/**
 * The applier ApprovalsPanel (and the desk) runs on a checker's
 * approval. Exactly-once by precondition: the lot must still
 * stand at the step's from-status; an 'approve' payload must
 * still match the live draft; an 'accept' payload carries the
 * outcome that lands verbatim.
 */
export async function applyAuctionLotApproval(req: ApprovalRequestDoc): Promise<void> {
  const p = req.payload as unknown as LotApprovalPayload;
  const lot = await getLot(p.lotId);
  if (!lot) throw new Error('The lot no longer exists.');
  if (lot.workspaceId !== req.workspaceId) throw new Error('Workspace mismatch.');
  const now = Date.now();
  const stamp: LotStamp = {
    at: now,
    by: req.decidedBy ?? '',
    ...(req.decidedByName ? { byName: req.decidedByName } : {}),
    ref: req.id,
  };
  if (p.step === 'approve') {
    if (lot.status !== 'draft') throw new Error('The lot is no longer a draft.');
    if (!approveSnapshotMatches(lot, p)) {
      throw new Error('The draft changed after filing — file a fresh request.');
    }
    const issues = lotGateIssues(lot, 'approved', now).filter((i) => i !== 'status');
    if (issues.length > 0) throw new Error(issues[0]);
    await updateDoc(doc(db, LOTS, lot.id), clean({
      status: 'approved',
      history: { ...lot.history, approved: stamp },
      updatedAt: now,
    }));
    return;
  }
  // step === 'accept'
  if (lot.status !== 'open') throw new Error('The lot is not open for an outcome.');
  if (!p.outcome) throw new Error('The sealed request carries no outcome.');
  const withOutcome: AuctionLot = { ...lot, outcome: p.outcome };
  const issues = lotGateIssues(withOutcome, 'accepted', now).filter((i) => i !== 'status');
  if (issues.length > 0) throw new Error(issues[0]);
  await updateDoc(doc(db, LOTS, lot.id), clean({
    status: 'accepted',
    outcome: p.outcome,
    history: { ...lot.history, accepted: stamp },
    updatedAt: now,
  }));
}

/** The seal digest of a step's snapshot — recorded on the lot's
 *  stamp by the DEMO_ direct path, so the seal discipline holds
 *  even where the approvals service does not run. */
export function lotStepDigest(lot: AuctionLot, step: LotApprovalStep): string {
  return payloadDigest(buildLotApprovalPayload(lot, step) as unknown as Record<string, unknown>);
}
