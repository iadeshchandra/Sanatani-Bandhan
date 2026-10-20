/* ------------------------------------------------------------------ */
/* Bahi-Khata Seva Phase 2 — the commit manifest recorder.             */
/*                                                                     */
/* executeCommit fires a ManifestEvent at every successful write;      */
/* this recorder folds the events into the batch's CommitManifest —    */
/* the precise record undo.ts later reverses. First-before /           */
/* last-after merging keeps a person touched by three rows at one      */
/* honest before→after pair. Persons the batch CREATED are dropped     */
/* from the changes list: undo deletes their whole record, so a        */
/* total-restore entry for them would be a second, wrong reversal.     */
/* ------------------------------------------------------------------ */

import type {
  BatchActor, CommitManifest, ManifestDonationLine,
} from './types';

export type ManifestEvent =
  | { kind: 'nandi-created'; id: string }
  | { kind: 'devotee-created'; id: string }
  | { kind: 'devotee-created-unresolved'; fullName: string; phone?: string }
  | { kind: 'devotee-total'; devoteeId: string; before: number; after: number }
  | { kind: 'donation-line'; line: ManifestDonationLine }
  | { kind: 'opening-balance'; amount: number; date: string; fundLabel: string };

export interface ManifestRecorder {
  record: (e: ManifestEvent) => void;
  build: () => CommitManifest;
}

export function createManifestRecorder(
  batchId: string,
  committedBy: BatchActor,
  committedAt: number = Date.now()
): ManifestRecorder {
  const createdNandiIds: string[] = [];
  const createdDevoteeIds: string[] = [];
  const createdUnresolved: { fullName: string; phone?: string }[] = [];
  const totals = new Map<string, { before: number; after: number }>();
  const donationLines: ManifestDonationLine[] = [];
  let openingBalance: CommitManifest['openingBalance'];

  const record = (e: ManifestEvent): void => {
    switch (e.kind) {
      case 'nandi-created':
        if (!createdNandiIds.includes(e.id)) createdNandiIds.push(e.id);
        break;
      case 'devotee-created':
        if (!createdDevoteeIds.includes(e.id)) createdDevoteeIds.push(e.id);
        break;
      case 'devotee-created-unresolved':
        createdUnresolved.push({ fullName: e.fullName, phone: e.phone });
        break;
      case 'devotee-total': {
        const cur = totals.get(e.devoteeId);
        if (cur) cur.after = e.after; // first before stands, last after wins
        else totals.set(e.devoteeId, { before: e.before, after: e.after });
        break;
      }
      case 'donation-line':
        donationLines.push(e.line);
        break;
      case 'opening-balance':
        openingBalance = { amount: e.amount, date: e.date, fundLabel: e.fundLabel };
        break;
    }
  };

  const build = (): CommitManifest => ({
    batchId,
    committedAt,
    committedBy,
    createdNandiIds: [...createdNandiIds],
    createdDevoteeIds: [...createdDevoteeIds],
    ...(createdUnresolved.length ? { createdUnresolved } : {}),
    devoteeChanges: [...totals.entries()]
      .filter(([id]) => !createdDevoteeIds.includes(id))
      .map(([devoteeId, v]) => ({
        devoteeId,
        beforeTotalDonated: v.before,
        afterTotalDonated: v.after,
      })),
    donationLines: [...donationLines],
    ...(openingBalance ? { openingBalance } : {}),
  });

  return { record, build };
}

/** True when the manifest recorded at least one write (an empty
 *  manifest means undo has nothing to reverse). */
export function manifestHasWrites(m: CommitManifest | undefined): boolean {
  if (!m) return false;
  return (
    m.createdNandiIds.length > 0 ||
    m.createdDevoteeIds.length > 0 ||
    (m.createdUnresolved?.length ?? 0) > 0 ||
    m.devoteeChanges.length > 0 ||
    m.donationLines.length > 0 ||
    !!m.openingBalance
  );
}
