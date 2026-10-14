import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * Server-side audit trail for the Sanatani Bandhan SaaS platform.
 *
 * Every sensitive platform operation (role grants, tenant provisioning, plan
 * changes, user disable/enable, PIN rotation, data export) MUST call
 * auditLog(). Entries are append-only:
 *   firestore.rules → audit_logs: update/delete denied for everyone.
 *
 * Retention: Firestore free tier = 1 GiB. At ~500 bytes/entry, one million
 * entries ≈ 500 MB. The queryAuditLogs() helper pages newest-first; a
 * scheduled purge (manual for now) can trim entries older than 365 days.
 */

export interface AuditEntry {
  /** Machine-readable action, e.g. 'claims.grant', 'tenant.provision'. */
  action: string;
  /** UID of the human/service that performed the action. */
  actorUid: string;
  /** Email of the actor, when known. */
  actorEmail?: string;
  /** Workspace/tenant the action targets, when applicable. */
  workspaceId?: string;
  /** Collection of the target document, e.g. 'users', 'workspaces'. */
  targetType?: string;
  /** Document ID of the target. */
  targetId?: string;
  /** Free-form details (never include secrets/PINs/tokens). */
  details?: Record<string, any>;
  /** Client IP for forensics. */
  ip?: string;
  /** Severity for filtering: 'info' | 'warn' | 'critical'. */
  severity?: 'info' | 'warn' | 'critical';
}

const AUDIT_COLLECTION = 'audit_logs';

/**
 * Write one audit entry. Never throws — audit failure must not break the
 * primary operation, but it IS logged to stderr for alerting.
 */
export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    const db = getFirestore();
    await db.collection(AUDIT_COLLECTION).add({
      ...entry,
      actorUid: entry.actorUid || 'unknown',
      severity: entry.severity || 'info',
      // Server timestamp is authoritative (client clocks can't be trusted).
      createdAt: FieldValue.serverTimestamp(),
      // workspaceId mirror for the rules' docWs() scoping on reads.
      ...(entry.workspaceId ? { workspaceId: entry.workspaceId } : {}),
    });
  } catch (e: any) {
    console.error('[AuditLog] FAILED to write audit entry:', entry.action, e?.message || e);
  }
}

/**
 * Query audit entries newest-first with optional filters. Owner-only callers.
 */
export async function queryAuditLogs(opts: {
  action?: string;
  actorUid?: string;
  workspaceId?: string;
  severity?: string;
  limit?: number;
  startAfterId?: string;
}): Promise<{ entries: any[]; nextCursor: string | null }> {
  const db = getFirestore();
  let q: FirebaseFirestore.Query = db.collection(AUDIT_COLLECTION).orderBy('createdAt', 'desc');

  if (opts.action) q = q.where('action', '==', opts.action);
  if (opts.actorUid) q = q.where('actorUid', '==', opts.actorUid);
  if (opts.workspaceId) q = q.where('workspaceId', '==', opts.workspaceId);
  if (opts.severity) q = q.where('severity', '==', opts.severity);

  const limit = Math.min(Math.max(opts.limit || 50, 1), 200);
  q = q.limit(limit + 1);

  if (opts.startAfterId) {
    const cursor = await db.collection(AUDIT_COLLECTION).doc(opts.startAfterId).get();
    if (cursor.exists) q = q.startAfter(cursor);
  }

  const snap = await q.get();
  const docs = snap.docs.slice(0, limit);
  const entries = docs.map((d) => ({ id: d.id, ...d.data() }));
  const nextCursor = snap.docs.length > limit ? docs[docs.length - 1].id : null;
  return { entries, nextCursor };
}
