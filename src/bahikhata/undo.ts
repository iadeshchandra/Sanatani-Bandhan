/* ------------------------------------------------------------------ */
/* Bahi-Khata Seva Phase 2 — batch undo.                               */
/*                                                                     */
/* A mistaken approval must be correctable without corrupting the      */
/* books. Per target (verified against the code in research §7.4):     */
/*  - herd rows: removed by id from the device-local goshalaStore.     */
/*  - created people: deleted (Trustee-class delete, the same class    */
/*    that approved the batch).                                        */
/*  - raised lifetime totals on pre-existing people: restored to the   */
/*    manifest's before-value — ONLY when nothing has drifted since.   */
/*  - treasury lines: the ledger is append-only and delete is          */
/*    forbidden by rules, so money is reversed by a compensating       */
/*    Expense entry that names the batch and the original line — the   */
/*    ledger keeps telling the truth, visibly.                         */
/*                                                                     */
/* The guard runs first and speaks plainly: anything that has gained   */
/* a life of its own since import (new gifts attached, totals moved)   */
/* BLOCKS its own reversal and is listed — never quietly corrupted.    */
/* ------------------------------------------------------------------ */

import type { DevoteeMember, TreasuryTransaction } from '../types';
import type { CommitManifest, ImportBatch, ManifestDonationLine } from './types';
import type { AddTreasuryFn } from './commit';

export const REVERSAL_CATEGORY = 'Reversal — Bahi-Khata';
const HANDLED_BY_UNDO = 'Bahi-Khata Seva';

/* --------------------------- reversal builders ---------------------- */

type TxDraft = Omit<TreasuryTransaction, 'id' | 'auditVerified' | 'createdAt' | 'updatedAt'> &
  Partial<Pick<TreasuryTransaction, 'workspaceId'>>;

export function buildReversalTx(
  line: ManifestDonationLine,
  batch: ImportBatch,
  workspaceId: string,
  opts: { todayISO: string; originalTxId?: string }
): TxDraft {
  return {
    workspaceId,
    date: opts.todayISO,
    type: 'Expense',
    category: REVERSAL_CATEGORY,
    amount: line.amount,
    handledBy: HANDLED_BY_UNDO,
    devoteeId: line.devoteeId,
    devoteeName: line.devoteeName,
    paymentMode: 'Reversal',
    referenceNo: line.referenceNo,
    purpose:
      `Reversal of paper-register import — batch "${batch.label}" (${batch.id})` +
      ` · original line: ${line.date}${line.referenceNo ? ` · paper receipt ${line.referenceNo}` : ''}` +
      (opts.originalTxId ? ` · ledger id ${opts.originalTxId}` : ''),
    is80GEligible: false,
  };
}

export function buildOpeningReversalTx(
  batch: ImportBatch,
  workspaceId: string,
  todayISO: string
): TxDraft | null {
  const ob = batch.manifest?.openingBalance;
  if (!ob) return null;
  return {
    workspaceId,
    date: todayISO,
    type: 'Expense',
    category: REVERSAL_CATEGORY,
    amount: ob.amount,
    handledBy: HANDLED_BY_UNDO,
    paymentMode: 'Reversal',
    purpose:
      `Reversal of Bahi-Khata opening balance — batch "${batch.label}" (${batch.id})` +
      ` · opening line dated ${ob.date}${ob.fundLabel ? ` · fund ${ob.fundLabel}` : ''}`,
    is80GEligible: false,
  };
}

/** Best-effort identification of the original ledger row a manifest
 *  line wrote, so the reversal can name it. Matches the commit's own
 *  fingerprints (category + register handledBy + amount + date). */
export function findOriginalTxId(
  treasury: { id: string; category?: string; handledBy?: string; amount?: number; date?: string; devoteeName?: string; referenceNo?: string }[],
  line: ManifestDonationLine
): string | undefined {
  const hit = treasury.find(
    (t) =>
      t.category === 'Donation' &&
      String(t.handledBy || '').startsWith('Bahi-Khata') &&
      t.amount === line.amount &&
      t.date === line.date &&
      (t.devoteeName || '') === line.devoteeName &&
      (line.referenceNo ? t.referenceNo === line.referenceNo : true)
  );
  return hit?.id;
}

/* -------------------------------- guard ----------------------------- */

export interface UndoGuardInput {
  manifest: CommitManifest;
  /** Live devotee records (id + current lifetime total). */
  devotees: { id: string; totalDonated?: number }[];
  /** Live herd ids. */
  herdIds: string[];
  /** Live donation records that reference a person (post-import life). */
  donationRefs: { devoteeId?: string; donorId?: string }[];
  /** Ids the caller resolved for manifest.createdUnresolved entries. */
  resolvedUnresolvedIds?: string[];
}

export interface UndoGuard {
  blockers: string[];
  warnings: string[];
  /** Created-person ids safe to delete (manifest + resolved). */
  deletableDevoteeIds: string[];
  /** Total-restores safe to apply. */
  restorableChanges: CommitManifest['devoteeChanges'];
}

export function checkUndoGuards(input: UndoGuardInput): UndoGuard {
  const { manifest } = input;
  const blockers: string[] = [];
  const warnings: string[] = [];
  const liveById = new Map(input.devotees.map((d) => [d.id, d]));
  const referenced = new Set<string>();
  for (const r of input.donationRefs) {
    if (r.devoteeId) referenced.add(r.devoteeId);
    if (r.donorId) referenced.add(r.donorId);
  }

  const deletable: string[] = [];
  const createdIds = [...manifest.createdDevoteeIds, ...(input.resolvedUnresolvedIds || [])];
  for (const id of createdIds) {
    if (!liveById.has(id)) {
      warnings.push(`A person this batch created (id ${id}) is no longer in the directory — nothing to remove for them.`);
      continue;
    }
    if (referenced.has(id)) {
      blockers.push(`A person this batch created (id ${id}) has received donations since the import — deleting them would orphan those records. Undo is blocked for them.`);
      continue;
    }
    deletable.push(id);
  }
  for (const u of manifest.createdUnresolved || []) {
    if (!(input.resolvedUnresolvedIds || []).length) {
      warnings.push(`One created person ("${u.fullName}") could not be matched to a live record — check the directory manually after undo.`);
    }
  }

  const restorable: CommitManifest['devoteeChanges'] = [];
  for (const ch of manifest.devoteeChanges) {
    const live = liveById.get(ch.devoteeId);
    if (!live) {
      warnings.push(`A person whose lifetime giving this batch raised (id ${ch.devoteeId}) is no longer in the directory — nothing to restore.`);
      continue;
    }
    const current = live.totalDonated || 0;
    if (current !== ch.afterTotalDonated) {
      blockers.push(
        `Lifetime giving for one person (id ${ch.devoteeId}) has changed since the import (was ${ch.afterTotalDonated}, now ${current}) — restoring the old figure would erase real gifts. Undo is blocked for them.`
      );
      continue;
    }
    restorable.push(ch);
  }

  for (const id of manifest.createdNandiIds) {
    if (!input.herdIds.includes(id)) {
      warnings.push(`One gai this batch added (id ${id}) is no longer in the herd list — nothing to remove for her.`);
    }
  }

  return { blockers, warnings, deletableDevoteeIds: deletable, restorableChanges: restorable };
}

/* ------------------------------ executor ---------------------------- */

export interface UndoDeps {
  workspaceId: string;
  removeNandi?: (id: string) => void;
  deleteDevotee: (id: string) => void;
  updateDevotee: (id: string, updates: Partial<DevoteeMember>) => void;
  addTreasuryTransaction: AddTreasuryFn;
  /** Live treasury, for naming original lines in reversals. */
  treasury?: { id: string; category?: string; handledBy?: string; amount?: number; date?: string; devoteeName?: string; referenceNo?: string }[];
  todayISO?: string;
}

export interface UndoResult {
  nandisRemoved: number;
  devoteesDeleted: number;
  totalsRestored: number;
  reversalsWritten: number;
  blocked: string[];
  warnings: string[];
}

/** Reverse everything the guard allows. The caller transitions the
 *  batch to 'undone' ONLY when `blocked` is empty. */
export function executeUndo(batch: ImportBatch, guard: UndoGuard, deps: UndoDeps): UndoResult {
  const manifest = batch.manifest;
  const result: UndoResult = {
    nandisRemoved: 0, devoteesDeleted: 0, totalsRestored: 0,
    reversalsWritten: 0, blocked: [...guard.blockers], warnings: [...guard.warnings],
  };
  if (!manifest) {
    result.blocked.push('This batch has no commit manifest — it was committed before the trust system existed, so there is no precise record to reverse.');
    return result;
  }
  const todayISO = deps.todayISO || new Date().toISOString().slice(0, 10);

  if (deps.removeNandi) {
    for (const id of manifest.createdNandiIds) {
      deps.removeNandi(id);
      result.nandisRemoved++;
    }
  } else if (manifest.createdNandiIds.length) {
    result.blocked.push('Herd rows can only be removed from the Goshala desk — open this batch there to undo them.');
  }

  for (const id of guard.deletableDevoteeIds) {
    deps.deleteDevotee(id);
    result.devoteesDeleted++;
  }
  for (const ch of guard.restorableChanges) {
    deps.updateDevotee(ch.devoteeId, { totalDonated: ch.beforeTotalDonated });
    result.totalsRestored++;
  }

  // Money reversals happen only when the person-side reversals they
  // belong to were not blocked — a half-reversed batch must never
  // leave the ledger claiming gifts the directory no longer shows…
  // except the opening balance, which is the org's own line.
  const personSideBlocked = guard.blockers.length > 0;
  if (!personSideBlocked) {
    for (const line of manifest.donationLines) {
      const txId = deps.treasury ? findOriginalTxId(deps.treasury, line) : undefined;
      const ok = deps.addTreasuryTransaction(
        buildReversalTx(line, batch, deps.workspaceId, { todayISO, originalTxId: txId })
      );
      if (ok) result.reversalsWritten++;
    }
  }
  const openingRev = buildOpeningReversalTx(batch, deps.workspaceId, todayISO);
  if (openingRev) {
    const ok = deps.addTreasuryTransaction(openingRev);
    if (ok) result.reversalsWritten++;
  }

  return result;
}
