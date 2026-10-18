/**
 * lib/vda.ts — the speakable devotee ID alias (VDA-style).
 * =========================================================
 * A VDA alias looks like `aarav@kashi`: lowercase, UPI-familiar, QR-friendly,
 * and — unlike SAN-XXXXXX — sayable aloud at a temple counter.
 *
 * SAN-XXXXXX stays the canonical key everywhere. The alias is a friendly
 * layer on top: `vdaAliases/{alias}` is a global claim registry (doc id IS
 * the normalized alias), and the claim is mirrored onto the profile as
 * `vdaAlias` for fast display. Releasing an alias deletes the registry doc,
 * freeing it for anyone else to claim.
 *
 * Firestore rules (firestore.rules):
 *   - read: any signed-in user (needed for availability checks)
 *   - create: any signed-in user, first-write-wins, uid must match
 *   - update: never
 *   - delete: the owning uid only
 */
import {
  deleteDoc,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

/** One side of the alias: lowercase letters, digits, dots, underscores; 3–30 chars. */
const SIDE_RE = /^[a-z0-9._]{3,30}$/;

/** Normalize user input to the canonical alias form. */
export function normalizeVdaAlias(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '.');
}

/** Validate a normalized alias; returns the failure reason or null when valid. */
export function validateVdaAlias(alias: string): string | null {
  if (!alias.includes('@')) return 'missing-at';
  const parts = alias.split('@');
  if (parts.length !== 2) return 'too-many-at';
  const [name, scope] = parts;
  if (!SIDE_RE.test(name)) return 'bad-name';
  if (!SIDE_RE.test(scope)) return 'bad-scope';
  return null;
}

/** Suggest a starting alias from a display name, e.g. "Aarav Sharma" → "aarav@bandhan". */
export function suggestVdaAlias(displayName: string, scope = 'bandhan'): string {
  const name = displayName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 30);
  return `${name || 'bhakt'}@${scope}`;
}

export interface VdaClaim {
  alias: string;
  uid: string;
  sanId: string;
  createdAt: unknown;
}

/** True when the alias is unclaimed. */
export async function isVdaAliasAvailable(alias: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'vdaAliases', alias));
  return !snap.exists();
}

/** Look up who owns an alias (for QR scans at the counter). */
export async function lookupVdaAlias(alias: string): Promise<VdaClaim | null> {
  const snap = await getDoc(doc(db, 'vdaAliases', alias));
  return snap.exists() ? (snap.data() as VdaClaim) : null;
}

/**
 * Claim an alias transactionally — first-write-wins. Throws Error('taken')
 * if someone else claimed it first, Error('invalid') if it fails validation.
 */
export async function claimVdaAlias(
  alias: string,
  uid: string,
  sanId: string,
): Promise<void> {
  const normalized = normalizeVdaAlias(alias);
  if (validateVdaAlias(normalized)) throw new Error('invalid');
  await runTransaction(db, async (tx) => {
    const ref = doc(db, 'vdaAliases', normalized);
    const snap = await tx.get(ref);
    if (snap.exists()) throw new Error('taken');
    tx.set(ref, {
      alias: normalized,
      uid,
      sanId,
      createdAt: serverTimestamp(),
    } satisfies VdaClaim);
  });
}

/** Release an alias — the registry doc is deleted and the name is free for others. */
export async function releaseVdaAlias(alias: string): Promise<void> {
  await deleteDoc(doc(db, 'vdaAliases', alias));
}
