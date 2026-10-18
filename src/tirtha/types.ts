/**
 * tirtha/types.ts — Tirtha Diary (Map Phase 2) data model.
 * =====================================================================
 * PRIVACY LAW (absolute, enforced at every layer):
 *  - A visit exists ONLY because the devotee tapped "Record this visit".
 *  - No background location, no geofencing, no auto-check-in — ever.
 *  - Entries are owner-only: Firestore rules bind {uid} to request.auth.uid.
 *  - Nothing is shared, public, or visible to family/orgs. Sharing is
 *    NOT a feature of this phase; there is no share path to leak through.
 *  - "Forget this visit" deletes instantly and completely.
 *
 * STORAGE: Firestore `tirthaVisits/{uid}/visits/{visitId}` and
 * `tirthaYatras/{uid}/yatras/{yatraId}`, mirrored to a device-local
 * cache (`sb_tirtha_{uid}`) so the diary and the AI assistant work
 * fully offline. The local cache is keyed by uid and never mixed.
 */

/** How the darshan happened, as the devotee remembers it. Optional. */
export type DarshanKind =
  | 'morning_aarti'
  | 'evening_aarti'
  | 'festival'
  | 'quiet_darshan'
  | 'special_puja'
  | 'parikrama'
  | 'other';

export interface VisitEntry {
  /** Client-generated id (`v_<timestamp>_<rand>`). */
  id: string;
  /** Owner uid — must equal auth uid; rules enforce. */
  uid: string;
  /** Temple name as the devotee wrote/chose it. */
  templeName: string;
  /** Optional: org/campus id if recorded from a campus map. */
  orgId?: string;
  /** ISO-8601 timestamp of the visit (devotee-chosen, defaults to now). */
  visitedAt: string;
  /** Optional personal reflection. Never shared. */
  note?: string;
  /** Optional darshan flavour. */
  darshanKind?: DarshanKind;
  /** Optional photo via File Vault (`vault://…` URL, private visibility). */
  photoVaultUrl?: string;
  /** Optional yatra this visit belongs to (yatra id). */
  yatraId?: string;
  /** ISO-8601 creation time. */
  createdAt: string;
}

/** A named pilgrimage grouping visits, e.g. "Char Dham 2026". */
export interface Yatra {
  id: string;
  uid: string;
  /** Devotee-given name. */
  name: string;
  /** Optional personal reflection on the whole yatra. */
  reflection?: string;
  /** Optional cover photo (vault:// URL). */
  coverVaultUrl?: string;
  createdAt: string;
}

/** Gentle, private lifetime stats — warm, never gamified. */
export interface TirthaStats {
  visitCount: number;
  yatraCount: number;
  templeCount: number;
  /** ISO date of the most recent visit, if any. */
  latestVisitAt?: string;
}

/** Input for creating a visit — everything except ids/timestamps. */
export interface NewVisitInput {
  templeName: string;
  orgId?: string;
  visitedAt?: string;
  note?: string;
  darshanKind?: DarshanKind;
  photoVaultUrl?: string;
  yatraId?: string;
}

export interface NewYatraInput {
  name: string;
  reflection?: string;
  coverVaultUrl?: string;
}

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function randSuffix(len = 6): string {
  let s = '';
  const bytes = new Uint8Array(len);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
    for (const b of bytes) s += ID_ALPHABET[b % ID_ALPHABET.length];
  } else {
    for (let i = 0; i < len; i++) {
      s += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
    }
  }
  return s;
}

export function newVisitId(): string {
  return `v_${Date.now().toString(36)}_${randSuffix()}`;
}

export function newYatraId(): string {
  return `y_${Date.now().toString(36)}_${randSuffix()}`;
}

/** Privacy invariant: an entry is valid only if it names its owner. */
export function isOwnedBy(entry: { uid: string }, uid: string): boolean {
  return !!uid && entry.uid === uid;
}

/** Strip a visit down to the fields the rules allow. */
export function sanitizeVisit(input: NewVisitInput, uid: string): VisitEntry {
  const now = new Date().toISOString();
  return {
    id: newVisitId(),
    uid,
    templeName: (input.templeName || '').trim().slice(0, 120),
    orgId: input.orgId?.slice(0, 64) || undefined,
    visitedAt: input.visitedAt || now,
    note: input.note?.trim().slice(0, 2000) || undefined,
    darshanKind: input.darshanKind,
    photoVaultUrl: input.photoVaultUrl?.slice(0, 300) || undefined,
    yatraId: input.yatraId?.slice(0, 64) || undefined,
    createdAt: now,
  };
}

export function sanitizeYatra(input: NewYatraInput, uid: string): Yatra {
  return {
    id: newYatraId(),
    uid,
    name: (input.name || '').trim().slice(0, 80),
    reflection: input.reflection?.trim().slice(0, 2000) || undefined,
    coverVaultUrl: input.coverVaultUrl?.slice(0, 300) || undefined,
    createdAt: new Date().toISOString(),
  };
}
