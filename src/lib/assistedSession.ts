/**
 * assistedSession.ts — Blueprint D, deliverable 4: assisted mode.
 * ============================================================================
 * A signed-in user sometimes needs a second pair of hands ON THEIR OWN
 * account: a son helping his elderly mother, a sevadar helping a
 * devotee at the desk. Without a declared session, that help is
 * invisible — the audit stream would credit every action to the
 * account owner alone, which is neither fair nor true.
 *
 * An assisted session is a DECLARATION, held on the owner's own
 * device/session:
 *   - started explicitly (helper's name, and their member identity
 *     when they are a member of this workspace);
 *   - while active, EVERY commit the session makes is stamped
 *     `assistedBy` in the Blueprint A audit event for that action —
 *     stamped at the recorder seam (auditWriter), so no commit point
 *     can forget it and none can fake it;
 *   - the actor on every event stays the ACCOUNT OWNER. Nothing is
 *     shared, merged, transferred or delegated between accounts —
 *     the helper gains no access of their own, ever. This store is
 *     the whole feature's state: ending the session (owner, anytime,
 *     one tap) ends the stamping immediately.
 *
 * Storage: localStorage, keyed by the owner's uid (a session belongs
 * to the signed-in account on this device). Survives reloads so a
 * long desk session is not silently unstamped by a refresh; the
 * persistent banner (components/org/AssistedBanner) always shows
 * while one is live, and the owner can end it from there.
 */

export interface AssistedSession {
  /** The account owner's uid — the session (and the audit actor). */
  ownerUid: string;
  /** The helper's uid when they are a known member; '' when the
   *  helper is identified by name alone (e.g. a family member who
   *  is not a member of this workspace). */
  helperUid: string;
  /** The helper's name, as declared at start. Never invented. */
  helperName: string;
  /** Epoch ms the session was declared. */
  startedAt: number;
}

const keyFor = (ownerUid: string) => `sb_assisted_${ownerUid}`;

let current: AssistedSession | null = null;
const listeners = new Set<(s: AssistedSession | null) => void>();

function emit(): void {
  for (const fn of listeners) {
    try {
      fn(current);
    } catch {
      /* a broken listener must not break the session store */
    }
  }
}

function readStored(ownerUid: string): AssistedSession | null {
  try {
    const raw = localStorage.getItem(keyFor(ownerUid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AssistedSession;
    if (
      !parsed ||
      parsed.ownerUid !== ownerUid ||
      typeof parsed.helperName !== 'string' ||
      !parsed.helperName.trim()
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Load (once) the stored session for this owner into memory. */
export function loadAssistedSession(ownerUid: string): AssistedSession | null {
  if (!ownerUid) return null;
  if (current && current.ownerUid !== ownerUid) current = null;
  if (!current) current = readStored(ownerUid);
  return current;
}

export function getAssistedSession(): AssistedSession | null {
  return current;
}

export function startAssistedSession(args: {
  ownerUid: string;
  helperUid?: string;
  helperName: string;
  now?: number;
}): AssistedSession | null {
  const helperName = (args.helperName || '').trim();
  if (!args.ownerUid || !helperName) return null;
  // A person cannot "assist themselves" — that is just normal use,
  // and stamping it would falsify the record.
  if (args.helperUid && args.helperUid === args.ownerUid) return null;
  const session: AssistedSession = {
    ownerUid: args.ownerUid,
    helperUid: args.helperUid || '',
    helperName,
    startedAt: args.now ?? Date.now(),
  };
  current = session;
  try {
    localStorage.setItem(keyFor(args.ownerUid), JSON.stringify(session));
  } catch {
    /* storage unavailable — the session still holds in memory */
  }
  emit();
  return session;
}

export function endAssistedSession(ownerUid?: string): void {
  const uid = ownerUid || current?.ownerUid;
  current = null;
  if (uid) {
    try {
      localStorage.removeItem(keyFor(uid));
    } catch {
      /* nothing to clean */
    }
  }
  emit();
}

export function subscribeAssistedSession(
  fn: (s: AssistedSession | null) => void
): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * The provider the recorder seam consumes: the helper identity to
 * stamp on an event, or null. Pure — it reads only this module's
 * session state. The stamp applies only when the event's actor IS
 * the session owner (the helper is helping on the owner's account —
 * events the helper writes later from their OWN account are theirs
 * alone). Registration on the real recorder lives in
 * lib/assistedAuditWiring (the firebase-touching seam), so this
 * module — and its tests — never pull the Firestore stack.
 */
export function assistedByForEvent(input: {
  actorUid: string;
}): { uid: string; name: string } | null {
  const s = current ?? (input.actorUid ? loadAssistedSession(input.actorUid) : null);
  if (!s) return null;
  if (s.ownerUid !== input.actorUid) return null;
  // helperUid may be '' for a name-only helper (family member who
  // is not a workspace member) — the recorder stamps it as-is.
  return { uid: s.helperUid, name: s.helperName };
}

/** Test/SSR escape hatch: forget the in-memory session. */
export function __resetAssistedSession(): void {
  current = null;
}
