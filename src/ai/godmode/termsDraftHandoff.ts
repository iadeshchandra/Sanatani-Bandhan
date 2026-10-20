/**
 * ai/godmode/termsDraftHandoff.ts — Copilot → Plans & Terms handoff.
 * =====================================================================
 * QUEUED #32. The Copilot NEVER writes config. When the owner approves
 * a drafted change, the proposal travels to the #31 Plans & Terms editor
 * through sessionStorage (`copilot_terms_draft`); the editor prefills
 * its form, and the owner's save there — with its diff-confirm and
 * before/after audit — is the ONLY write. This module is the whole
 * mechanism: write, peek, clear, and a window event so an already-open
 * Settings tab can react immediately.
 */

export const TERMS_DRAFT_KEY = 'copilot_terms_draft';
export const TERMS_DRAFT_EVENT = 'copilot-terms-draft';

export interface TermsDraft {
  kind: 'plan' | 'commission';
  /** For kind 'plan': the canonical plan id being edited. */
  planId?: string;
  /** Flat field patch, e.g. { priceMonthlyBDT: 750 } or { freeRate: 14 }. */
  patch: Record<string, number>;
  /** Nested limits patch for plan drafts. */
  limitsPatch?: Record<string, number>;
  /** Human label for the banner, e.g. "Standard · Monthly · BDT". */
  fieldLabel: string;
  oldValue: number;
  newValue: number;
}

function storage(): Storage | null {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  } catch {
    return null;
  }
}

/** Panel side: stash the draft and notify any mounted editor. */
export function writeTermsDraft(draft: TermsDraft): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(TERMS_DRAFT_KEY, JSON.stringify(draft));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TERMS_DRAFT_EVENT));
    }
  } catch {
    /* storage full/blocked — the owner can still edit manually */
  }
}

/** Editor side: look without consuming (the editor clears once applied). */
export function peekTermsDraft(): TermsDraft | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(TERMS_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TermsDraft;
    if (!parsed || (parsed.kind !== 'plan' && parsed.kind !== 'commission')) return null;
    if (!parsed.patch || typeof parsed.patch !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasPendingTermsDraft(): boolean {
  return peekTermsDraft() !== null;
}

export function clearTermsDraft(): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(TERMS_DRAFT_KEY);
  } catch {
    /* nothing to clear */
  }
}
