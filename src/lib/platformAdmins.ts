/**
 * platformAdmins.ts — delegation registry service (QUEUED #21).
 * ============================================================================
 * Firestore access for the `platformAdmins/{uid}` collection plus the
 * role-resolution used by the GodMode console unlock flow. The pure role
 * matrix lives in platformAdminRoles.ts (unit-tested); this file is the
 * thin I/O layer over it.
 *
 * COLLECTION CONTRACT (one doc per delegated admin, doc id = their uid):
 *   { uid, email, displayName, role: 'admin'|'moderator', active: true,
 *     grantedBy, grantedAt, updatedAt }
 * `active: false` = revoked-but-remembered; the doc can also be deleted
 * outright (revoke below deletes — the audit log keeps the history).
 *
 * WHO MAY DO WHAT (enforced by firestore.rules — see the flagged block in
 * ARCHITECTURE.md "QUEUED #21"): only the owner writes. A signed-in user
 * may read ONLY their own doc (that's how the console resolves a delegated
 * role at unlock). Until that rules block is deployed, reads fail with
 * permission-denied and resolveRoleForUser fails safe to null — the owner
 * is never affected because owner resolution never touches this collection.
 *
 * AUDIT: grants and revokes append to audit_logs via the same doc shape
 * firestoreAdmin.writeAudit uses. The create rule for top-level audit logs
 * requires isOwner() + actorUid == auth.uid — grants/revokes are performed
 * BY the owner, so they pass; a delegated admin could not forge one.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { isOwnerEmail } from '../config/ownerAllowlist';
import { OWNER_UID, OWNER_EMAIL, isOwnerUid } from './firestoreAdmin';
import {
  resolveRoleWithReason,
  sanitizeDelegatedRole,
  type DelegatedAdminRole,
  type PlatformAdminGrant,
  type PlatformRole,
  type RoleResolution,
} from './platformAdminRoles';

export const PLATFORM_ADMINS_COLLECTION = 'platformAdmins';

export interface PlatformAdminRecord {
  uid: string;
  email: string;
  displayName: string;
  role: DelegatedAdminRole;
  active: boolean;
  grantedBy: string;
  grantedAt?: string;
  updatedAt?: string;
}

export interface AdminOpResult<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

const tsToIso = (v: any): string | undefined => {
  try {
    if (!v) return undefined;
    if (typeof v === 'string') return v;
    if (v.toDate) return v.toDate().toISOString();
    return undefined;
  } catch {
    return undefined;
  }
};

function requireOwnerUid(): string {
  const uid = auth.currentUser?.uid;
  if (!isOwnerUid(uid)) {
    throw new Error('OWNER_ONLY: admin management is restricted to the platform owner.');
  }
  return uid as string;
}

/** Append an audit entry (same shape as firestoreAdmin's). Never throws. */
async function writeAdminAudit(
  action: string,
  details: Record<string, any>,
  severity: 'info' | 'warn' | 'critical',
): Promise<void> {
  try {
    const uid = requireOwnerUid();
    await addDoc(collection(db, 'audit_logs'), {
      action,
      actorUid: uid,
      actorEmail: auth.currentUser?.email || OWNER_EMAIL,
      details,
      severity,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[platformAdmins] audit write failed:', action, e);
  }
}

/**
 * Resolve the effective GodMode role for a signed-in user, WITH the
 * reason (QUEUED #42). NEVER throws and NEVER locks the owner out:
 *   - owner (hardcoded UID or allowlisted email) → 'owner' / 'owner',
 *     resolved before any Firestore read — the registry is not consulted,
 *     so an empty/unreadable/deleted registry cannot lock the owner out;
 *   - anyone else → their platformAdmins doc decides; the reason says
 *     which refusal it was ('no-grant' | 'revoked' | 'malformed' |
 *     'lookup-failed'), so the gate can explain itself instead of failing
 *     silently behind one generic "not authorized" line.
 */
export async function resolveRoleForUserDetailed(
  uid: string | null | undefined,
  email: string | null | undefined,
): Promise<RoleResolution> {
  const isOwner = isOwnerUid(uid) || isOwnerEmail(email);
  if (isOwner) return { role: 'owner', reason: 'owner' };
  if (!uid) return { role: null, reason: 'signed-out' };
  try {
    const snap = await getDoc(doc(db, PLATFORM_ADMINS_COLLECTION, uid));
    if (!snap.exists()) return resolveRoleWithReason({ isOwner: false, grant: null, hasUid: true });
    const data = snap.data() as PlatformAdminGrant;
    return resolveRoleWithReason({ isOwner: false, grant: data, hasUid: true });
  } catch {
    return resolveRoleWithReason({ isOwner: false, lookupFailed: true, hasUid: true });
  }
}

/**
 * Resolve the effective GodMode role for a signed-in user.
 * NEVER throws and NEVER locks the owner out:
 *   - owner (hardcoded UID or allowlisted email) → 'owner', resolved
 *     before any Firestore read;
 *   - anyone else → their platformAdmins doc decides; missing doc,
 *     revoked doc, malformed doc, offline, or permission error → null.
 */
export async function resolveRoleForUser(
  uid: string | null | undefined,
  email: string | null | undefined,
): Promise<PlatformRole | null> {
  return (await resolveRoleForUserDetailed(uid, email)).role;
}

/** Owner-only: list every delegation record. */
export async function listPlatformAdmins(): Promise<AdminOpResult<PlatformAdminRecord[]>> {
  try {
    requireOwnerUid();
    const snap = await getDocs(collection(db, PLATFORM_ADMINS_COLLECTION));
    const rows: PlatformAdminRecord[] = [];
    snap.forEach((d) => {
      const data = d.data() as Record<string, any>;
      const role = sanitizeDelegatedRole(data.role);
      if (!role) return; // skip malformed docs rather than rendering a phantom admin
      rows.push({
        uid: d.id,
        email: typeof data.email === 'string' ? data.email : '',
        displayName: typeof data.displayName === 'string' ? data.displayName : '',
        role,
        active: data.active !== false,
        grantedBy: typeof data.grantedBy === 'string' ? data.grantedBy : '',
        grantedAt: tsToIso(data.grantedAt),
        updatedAt: tsToIso(data.updatedAt),
      });
    });
    rows.sort((a, b) => (a.email || a.uid).localeCompare(b.email || b.uid));
    return { ok: true, data: rows };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Failed to load admins.' };
  }
}

/** Owner-only: grant (or re-role / reactivate) a delegated admin. */
export async function grantPlatformAdmin(input: {
  uid: string;
  email?: string;
  displayName?: string;
  role: DelegatedAdminRole;
}): Promise<AdminOpResult<PlatformAdminRecord>> {
  try {
    const actor = requireOwnerUid();
    const uid = (input.uid || '').trim();
    if (!uid) return { ok: false, error: 'A Firebase UID is required.' };
    if (uid === OWNER_UID) {
      return { ok: false, error: 'That UID is the platform owner — owner access is implicit and never granted.' };
    }
    if (!sanitizeDelegatedRole(input.role)) return { ok: false, error: 'Unknown role.' };
    const ref = doc(db, PLATFORM_ADMINS_COLLECTION, uid);
    const existing = await getDoc(ref);
    const payload: Record<string, any> = {
      uid,
      email: (input.email || '').trim(),
      displayName: (input.displayName || '').trim(),
      role: input.role,
      active: true,
      grantedBy: actor,
      updatedAt: serverTimestamp(),
    };
    if (!existing.exists()) payload.grantedAt = serverTimestamp();
    await setDoc(ref, payload, { merge: true });
    await writeAdminAudit(
      'platform.admin.grant',
      { targetUid: uid, email: payload.email, role: input.role, regrant: existing.exists() },
      'critical',
    );
    return { ok: true, data: { ...payload, grantedAt: undefined, updatedAt: undefined } as PlatformAdminRecord };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Grant failed.' };
  }
}

/** Owner-only: revoke a delegated admin (doc deleted; audit keeps history). */
export async function revokePlatformAdmin(uid: string): Promise<AdminOpResult> {
  try {
    requireOwnerUid();
    const target = (uid || '').trim();
    if (!target) return { ok: false, error: 'A Firebase UID is required.' };
    if (target === OWNER_UID) {
      return { ok: false, error: 'The owner cannot be revoked — owner access is not stored in this registry.' };
    }
    await deleteDoc(doc(db, PLATFORM_ADMINS_COLLECTION, target));
    await writeAdminAudit('platform.admin.revoke', { targetUid: target }, 'warn');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Revoke failed.' };
  }
}
