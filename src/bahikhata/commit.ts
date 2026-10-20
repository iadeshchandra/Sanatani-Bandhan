/* ------------------------------------------------------------------ */
/* Bahi-Khata Seva — commit: the ONLY writer. Runs when an approver    */
/* presses "Approve & Commit", i.e. under the approver's own          */
/* authenticated session and role — Firestore rules stay the           */
/* enforcement (devotee writes: R_STAFF; treasury writes: R_FINANCE).  */
/*                                                                     */
/* Honesty rules baked in:                                             */
/*  - Member records are created with pinRevoked: true and NO pin /    */
/*    pinHash — a paper name is not an identity verification, so an    */
/*    imported member gets a live credential only when they claim      */
/*    the record in person.                                            */
/*  - Donation lines carry the PAPER receipt number in referenceNo     */
/*    when the register has one; is80GEligible is always false, so     */
/*    the engine never mints a fresh 80G number for paper history.     */
/*  - The opening-balance line exists only when the approver ticked    */
/*    "verified against the paper book".                               */
/* ------------------------------------------------------------------ */

import type { DevoteeMember, SevaTier, TreasuryTransaction } from '../types';
import type { Nandi } from '../goshala/types';
import type { BatchCommitSummary, ImportBatch, ImportRow } from './types';
import { phoneKey, isUsablePhoneKey } from './normalize';

export type AddDevoteeFn = (
  d: Omit<DevoteeMember, 'id' | 'qrCodeRef' | 'joinedDate'>
) => string | boolean;
export type AddTreasuryFn = (
  tx: Omit<TreasuryTransaction, 'id' | 'auditVerified' | 'createdAt' | 'updatedAt'> &
    Partial<Pick<TreasuryTransaction, 'workspaceId'>>
) => boolean;

export interface CommitDeps {
  workspaceId: string;
  existingDevotees: DevoteeMember[];
  addDevotee: AddDevoteeFn;
  updateDevotee: (id: string, updates: Partial<DevoteeMember>) => void;
  addTreasuryTransaction: AddTreasuryFn;
  /** Herd writes are device-local (goshalaStore). Absent when the
   *  review is opened outside the Goshala desk — herd batches then
   *  report a clear error instead of writing nowhere. */
  addNandi?: (n: Nandi) => void;
  now?: Date;
}

const HANDLED_BY_REGISTER = 'Bahi-Khata (paper register)';
const HANDLED_BY_OPENING = 'Bahi-Khata Seva';

/* --------------------------- pure builders -------------------------- */

export function buildMemberRecord(
  row: ImportRow,
  workspaceId: string,
  nowMs: number
): Omit<DevoteeMember, 'id' | 'qrCodeRef' | 'joinedDate'> {
  const m = row.mapped;
  const tier = (['Ratna', 'Vishesh', 'Karmi', 'Sadharan'].includes(m.sevaTier)
    ? m.sevaTier
    : 'Sadharan') as SevaTier;
  return {
    workspaceId,
    createdAt: nowMs,
    updatedAt: nowMs,
    fullName: String(m.fullName || '').trim(),
    spiritualName: m.spiritualName ? String(m.spiritualName) : undefined,
    phone: m.phone ? String(m.phone) : undefined,
    email: m.email ? String(m.email) : undefined,
    // NO live PIN from a paper name alone (research risk #7): the
    // record is created credential-revoked; the claim flow issues a
    // PIN in person later.
    pinRevoked: true,
    role: 'DEVOTEE',
    sevaIndex: 300,
    sevaTier: tier,
    gotra: String(m.gotra || 'Kashyapa'),
    address: String(m.address || ''),
    activeStatus: 'Active',
    totalDonated: typeof m.totalDonated === 'number' ? m.totalDonated : 0,
    volunteerHours: 0,
  };
}

export function buildNandiRecord(row: ImportRow, idSuffix: number, todayISO: string): Nandi {
  const m = row.mapped;
  const notes: string[] = [];
  if (m.notes) notes.push(String(m.notes));
  notes.push('Opening record — from paper register (Bahi-Khata Seva)');
  if (m.ageUnknown) {
    notes.push(
      m.arrivalYear
        ? `Age unknown — paper gives arrival year ${m.arrivalYear} only`
        : 'Age unknown — not stated on paper'
    );
  }
  if (m.tagAutoAssigned) notes.push(`Tag ${m.tagId} auto-assigned at digitization — please paint/attach`);
  return {
    id: `bk_nandi_${idSuffix}`,
    name: String(m.name || '').trim(),
    tagId: String(m.tagId || ''),
    breed: String(m.breed || 'Desi'),
    sex: (['cow', 'bull', 'vatsa'].includes(m.sex) ? m.sex : 'cow') as Nandi['sex'],
    // ageYears 0 + the note above carries the "age unknown" flag into
    // the record (Nandi has no nullable age) — an estimate is never
    // dressed up as a fact.
    ageYears: typeof m.ageYears === 'number' ? m.ageYears : 0,
    source: (['rescued', 'donated', 'born', 'purchased'].includes(m.source)
      ? m.source
      : 'donated') as Nandi['source'],
    status: (m.status || 'dry') as Nandi['status'],
    notes: notes.join(' · '),
    addedDate: m.arrivalYear ? `${m.arrivalYear}-01-01` : todayISO,
  };
}

/** The one honest line about the past. Null unless the approver
 *  verified it against the paper book. */
export function buildOpeningBalanceTx(
  batch: ImportBatch,
  workspaceId: string
): Omit<TreasuryTransaction, 'id' | 'auditVerified' | 'createdAt' | 'updatedAt'> | null {
  const ob = batch.openingBalance;
  if (!ob || !ob.verified || !(ob.amount > 0)) return null;
  return {
    workspaceId,
    date: ob.asOfDate || new Date().toISOString().slice(0, 10),
    type: 'Income',
    category: 'Opening Balance',
    amount: ob.amount,
    handledBy: HANDLED_BY_OPENING,
    paymentMode: 'Opening Balance',
    purpose:
      `Bahi-khata opening balance as of ${ob.asOfDate} — carried from paper register` +
      (ob.fundLabel ? ` (${ob.fundLabel})` : '') +
      ` · batch: ${batch.label}`,
    is80GEligible: false,
  };
}

/** One current-register gift line. The paper's own receipt number rides
 *  in referenceNo; no fresh receipt number is ever minted. */
export function buildDonationLineTx(
  row: ImportRow,
  devoteeId: string | undefined,
  workspaceId: string
): Omit<TreasuryTransaction, 'id' | 'auditVerified' | 'createdAt' | 'updatedAt'> {
  const m = row.mapped;
  return {
    workspaceId,
    date: m.donationDate || new Date().toISOString().slice(0, 10),
    type: 'Income',
    category: 'Donation',
    amount: typeof m.donationAmount === 'number' ? m.donationAmount : 0,
    handledBy: HANDLED_BY_REGISTER,
    devoteeId,
    devoteeName: String(m.fullName || ''),
    paymentMode: m.paymentMode || 'Cash',
    referenceNo: m.receiptNo ? String(m.receiptNo) : undefined,
    purpose: String(m.purpose || 'Dan — from paper register'),
    is80GEligible: false,
  };
}

/* ----------------------------- executor ----------------------------- */

const committable = (r: ImportRow) =>
  r.approved && r.state === 'ok';

export function executeCommit(batch: ImportBatch, deps: CommitDeps): BatchCommitSummary {
  const now = deps.now || new Date();
  const nowMs = now.getTime();
  const todayISO = now.toISOString().slice(0, 10);
  const summary: BatchCommitSummary = {
    added: 0,
    skippedDuplicates: batch.rows.filter((r) => r.state === 'duplicate').length,
    treasuryLines: 0,
    openingBalanceWritten: false,
    at: nowMs,
  };

  const rows = batch.rows.filter(committable);

  if (batch.target === 'herd') {
    if (!deps.addNandi) {
      throw new Error('herd-commit-unavailable');
    }
    rows.forEach((row, i) => {
      deps.addNandi!(buildNandiRecord(row, nowMs + i, todayISO));
      summary.added++;
    });
    return summary;
  }

  if (batch.target === 'members') {
    for (const row of rows) {
      const res = deps.addDevotee(buildMemberRecord(row, deps.workspaceId, nowMs));
      // Count ACTUAL successes only (addDevotee returns false when a
      // demo quota blocks the create — the BulkImportDesk honesty rule).
      if (res !== false) summary.added++;
    }
    return summary;
  }

  // donors: resolve-or-create the person, land lifetime giving on
  // them, write this year's register lines to treasury.
  const byPhone = new Map<string, DevoteeMember>();
  const byId = new Map<string, DevoteeMember>();
  for (const d of deps.existingDevotees) {
    byId.set(d.id, d);
    if (d.phone) {
      const k = phoneKey(d.phone);
      if (isUsablePhoneKey(k)) byPhone.set(k, d);
    }
  }
  const donatedSoFar = new Map<string, number>();

  const resolvePerson = (row: ImportRow): { id?: string; created: boolean } => {
    const m = row.mapped;
    if (m.attachToId && byId.has(m.attachToId)) return { id: m.attachToId, created: false };
    if (m.phone) {
      const k = phoneKey(m.phone);
      const hit = isUsablePhoneKey(k) ? byPhone.get(k) : undefined;
      if (hit) return { id: hit.id, created: false };
    }
    const res = deps.addDevotee(buildMemberRecord(row, deps.workspaceId, nowMs));
    if (res === false || typeof res !== 'string') return { created: false };
    const fresh: DevoteeMember = {
      ...(buildMemberRecord(row, deps.workspaceId, nowMs) as DevoteeMember),
      id: res,
      qrCodeRef: '',
      joinedDate: todayISO,
    };
    byId.set(res, fresh);
    if (fresh.phone) {
      const k = phoneKey(fresh.phone);
      if (isUsablePhoneKey(k)) byPhone.set(k, fresh);
    }
    return { id: res, created: true };
  };

  for (const row of rows) {
    const m = row.mapped;
    const lifetime = typeof m.lifetimeDonated === 'number' ? m.lifetimeDonated : 0;
    const lineAmount = typeof m.donationAmount === 'number' ? m.donationAmount : 0;
    const { id, created } = resolvePerson(row);
    if (created) summary.added++;
    else if (id) summary.added++; // attached to an existing person — still a landed record

    if (id) {
      const addToTotal = lifetime + lineAmount;
      if (addToTotal > 0) {
        const base =
          donatedSoFar.get(id) ??
          (byId.get(id)?.totalDonated || 0);
        const next = base + addToTotal;
        donatedSoFar.set(id, next);
        deps.updateDevotee(id, { totalDonated: next });
      }
    }

    if (lineAmount > 0) {
      const ok = deps.addTreasuryTransaction(buildDonationLineTx(row, id, deps.workspaceId));
      if (ok) summary.treasuryLines++;
    }
  }

  const opening = buildOpeningBalanceTx(batch, deps.workspaceId);
  if (opening) {
    const ok = deps.addTreasuryTransaction(opening);
    if (ok) {
      summary.openingBalanceWritten = true;
      summary.treasuryLines++;
    }
  }

  return summary;
}
