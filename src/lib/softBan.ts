/**
 * softBan.ts — Spark-native user suspension (Step 8).
 * =====================================================
 * No backend needed. Suspension is a `users/{uid}` field set; the boot check
 * in AuthWorkspaceContext signs suspended users out and shows a dignified
 * notice with the reason and a path to appeal.
 *
 * Pure logic only — no Firebase imports, fully unit-testable.
 */

/** Suspension fields stored on `users/{uid}`. */
export interface SuspensionInfo {
  suspended: boolean;
  reason?: string;
  suspendedAt?: number;
  suspendedBy?: string;
}

/** Firestore rules shape: these fields are owner-write-only. */
export const SUSPENSION_FIELDS = ['suspended', 'suspendReason', 'suspendedAt', 'suspendedBy'] as const;

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 500;

/**
 * Validates a suspension reason. Returns an error message, or null when valid.
 * A reason is REQUIRED — no silent bans.
 */
export function validateSuspendReason(reason: string): string | null {
  const trimmed = (reason || '').trim();
  if (!trimmed) return 'A reason is required — suspensions are never silent.';
  if (trimmed.length < MIN_REASON_LENGTH)
    return `Please give a clear reason (at least ${MIN_REASON_LENGTH} characters).`;
  if (trimmed.length > MAX_REASON_LENGTH)
    return `Reason is too long (max ${MAX_REASON_LENGTH} characters).`;
  return null;
}

/** Builds the field update that suspends a user. */
export function buildSuspendUpdate(reason: string, byUid: string): Record<string, unknown> {
  return {
    suspended: true,
    suspendReason: reason.trim(),
    suspendedAt: Date.now(),
    suspendedBy: byUid,
  };
}

/** Builds the field update that lifts a suspension. */
export function buildUnsuspendUpdate(): Record<string, unknown> {
  return {
    suspended: false,
    suspendReason: null,
    suspendedAt: null,
    suspendedBy: null,
  };
}

/** True when a user doc carries an active suspension. */
export function isSuspended(userDoc: Record<string, unknown> | null | undefined): boolean {
  return !!userDoc && userDoc.suspended === true;
}

/** Extracts the suspension info from a user doc (for the paused screen). */
export function readSuspension(userDoc: Record<string, unknown> | null | undefined): SuspensionInfo | null {
  if (!isSuspended(userDoc)) return null;
  const d = userDoc as Record<string, unknown>;
  return {
    suspended: true,
    reason: typeof d.suspendReason === 'string' ? d.suspendReason : undefined,
    suspendedAt: typeof d.suspendedAt === 'number' ? d.suspendedAt : undefined,
    suspendedBy: typeof d.suspendedBy === 'string' ? d.suspendedBy : undefined,
  };
}

/** localStorage key so the paused notice survives the sign-out cycle. */
export const SUSPENDED_STORAGE_KEY = 'sb_account_suspended';

export function saveSuspensionNotice(info: SuspensionInfo): void {
  try {
    localStorage.setItem(SUSPENDED_STORAGE_KEY, JSON.stringify(info));
  } catch { /* storage unavailable — context state still works */ }
}

export function loadSuspensionNotice(): SuspensionInfo | null {
  try {
    const raw = localStorage.getItem(SUSPENDED_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SuspensionInfo;
    return parsed && parsed.suspended === true ? parsed : null;
  } catch {
    return null;
  }
}

export function clearSuspensionNotice(): void {
  try {
    localStorage.removeItem(SUSPENDED_STORAGE_KEY);
  } catch { /* ignore */ }
}
