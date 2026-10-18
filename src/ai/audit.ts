/**
 * ai/audit.ts — AI action audit logging (Phase 0).
 * ==================================================
 * Every AI-assisted action gets an audit entry. This module REUSES the
 * existing `audit_logs` collection (firestore.rules, "append-only,
 * actor-bound"): the owner clause
 *
 *   allow create: if (isOwner() && request.resource.data.get('actorUid','') == request.auth.uid)
 *
 * permits these writes with NO rules change — every Phase-0 AI feature
 * runs inside the owner-only GodMode console, so the actor IS the owner
 * and actorUid == request.auth.uid by construction. The write shape
 * mirrors `writeAudit` in src/lib/firestoreAdmin.ts (action, actorUid,
 * actorEmail, details, severity, createdAt), with `aiInvolved: true`
 * inside details so the log is filterable for AI involvement.
 *
 * Fail-open: an audit write never throws — audit failure must not break
 * the operator's flow. For a non-owner actor the rules reject the write
 * and the miss is logged to console only (deny-by-default holds).
 */

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

export interface AiAuditEntry {
  /** Actor — in Phase 0 always the owner's UID (GodMode is owner-only). */
  actorUid: string;
  /** What happened, e.g. 'translation_triage_approve'. */
  action: string;
  /** Optional human-readable detail, e.g. the key + score. */
  detail?: string;
  /** Always true for this writer — marks the row as AI-assisted. */
  aiInvolved?: boolean;
}

/**
 * Append an AI audit entry. Resolves 'ok' or 'failed' — never throws.
 */
export async function logAiAction(entry: AiAuditEntry): Promise<'ok' | 'failed'> {
  try {
    const actorUid = (entry.actorUid || '').trim();
    const action = (entry.action || '').trim();
    if (!actorUid || !action) return 'failed';
    await addDoc(collection(db, 'audit_logs'), {
      action,
      actorUid,
      actorEmail: auth.currentUser?.email || null,
      details: {
        ...(entry.detail ? { detail: entry.detail.slice(0, 2000) } : {}),
        aiInvolved: true,
      },
      severity: 'info',
      createdAt: serverTimestamp(),
    });
    return 'ok';
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[ai/audit] audit write failed:', entry.action, e);
    return 'failed';
  }
}
