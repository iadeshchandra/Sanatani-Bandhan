/**
 * Sanatani Bandhan — AI Assistant Phase 1 · device-local voice state
 * =====================================================================
 * All voice preferences live on the device (localStorage) — never
 * uploaded, never synced. Private by design, like the assistant thread.
 *
 * Keys (prefix sb-ai-voice-):
 * - status: 'downloaded' | 'removed' | '' — last known cache state; the
 *   capability probe revalidates against the real cache, this is only a
 *   fast-path hint so the UI doesn't flash.
 * - uses: count of successful assistant answers (drives the one-time nudge)
 * - nudgeDismissed: '1' — the devotee declined the warmer voice, forever
 * - nudgeShownAt: ISO timestamp of the single nudge offer
 */

const PREFIX = 'sb-ai-voice-';
const K = {
  status: `${PREFIX}status`,
  uses: `${PREFIX}uses`,
  nudgeDismissed: `${PREFIX}nudge-dismissed`,
  nudgeShownAt: `${PREFIX}nudge-shown-at`,
} as const;

function lsGet(key: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch {
    /* storage full/blocked — voice prefs are best-effort */
  }
}

function lsDel(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export type CachedVoiceStatus = 'downloaded' | 'removed' | '';

export function getCachedStatus(): CachedVoiceStatus {
  const v = lsGet(K.status);
  return v === 'downloaded' || v === 'removed' ? v : '';
}

export function setCachedStatus(s: Exclude<CachedVoiceStatus, ''>): void {
  lsSet(K.status, s);
}

export function clearCachedStatus(): void {
  lsDel(K.status);
}

/** Increment after each successful assistant answer; returns the new count. */
export function countAssistantUse(): number {
  const n = parseInt(lsGet(K.uses) || '0', 10);
  const next = Number.isFinite(n) ? n + 1 : 1;
  lsSet(K.uses, String(next));
  return next;
}

export function getAssistantUses(): number {
  const n = parseInt(lsGet(K.uses) || '0', 10);
  return Number.isFinite(n) ? n : 0;
}

export function isNudgeDismissed(): boolean {
  return lsGet(K.nudgeDismissed) === '1';
}

export function dismissNudgeForever(): void {
  lsSet(K.nudgeDismissed, '1');
}

export function markNudgeShown(): void {
  lsSet(K.nudgeShownAt, new Date().toISOString());
}

export function wasNudgeShown(): boolean {
  return lsGet(K.nudgeShownAt) !== null;
}

/**
 * The one-time nudge rule: after 3+ real uses, exactly once, never if
 * the devotee already declined. Callers additionally gate on capability
 * ('available') and download state (not downloaded).
 */
export function shouldShowNudge(): boolean {
  return getAssistantUses() >= 3 && !wasNudgeShown() && !isNudgeDismissed();
}

/* ------------------------------------------------------------------ */
/* Download state machine (persisted — survives app restart)           */
/* ------------------------------------------------------------------ */
/**
 * not-downloaded → downloading → downloaded → update-available
 * downloading → paused (pause/cancel — clean, resumable) → downloading
 * downloading → error (retry) → downloading
 * downloaded → removed → not-downloaded
 *
 * Every state is recoverable from the Settings card. If the app restarts
 * while 'downloading', the state reconciles to 'paused' with the last
 * known progress — the devotee taps Resume, cached shards are reused.
 */
export type VoiceDlState =
  | 'not-downloaded'
  | 'downloading'
  | 'paused'
  | 'downloaded'
  | 'update-available'
  | 'removed'
  | 'error';

export interface VoiceDlPersist {
  state: VoiceDlState;
  /** 0..1 last known progress (for the paused resume hint). */
  progress: number;
  /** Model version that was downloaded ('' when none). */
  version: string;
  updatedAt: number;
  /**
   * Error KIND token when state === 'error' ('gpu' | 'storage' |
   * 'integrity' | 'network' | 'unknown' — see downloader.ts
   * classifyDownloadError). NEVER a raw engine message: raw technical
   * text must never reach the user's screen (Exhibit 1). Values
   * persisted by older builds may be raw strings; renderers must map
   * anything that is not a known token to the generic line.
   */
  error?: string;
  /** Model version whose update offer was dismissed (don't re-nag). */
  ignoredVersion?: string;
}

const DL_KEY = `${PREFIX}dl-state`;

const DEFAULT_DL: VoiceDlPersist = {
  state: 'not-downloaded',
  progress: 0,
  version: '',
  updatedAt: 0,
};

export function getDlPersist(): VoiceDlPersist {
  try {
    const raw = lsGet(DL_KEY);
    if (!raw) return { ...DEFAULT_DL };
    const p = JSON.parse(raw) as Partial<VoiceDlPersist>;
    if (!p || typeof p.state !== 'string') return { ...DEFAULT_DL };
    return {
      state: p.state as VoiceDlState,
      progress: typeof p.progress === 'number' ? Math.min(1, Math.max(0, p.progress)) : 0,
      version: typeof p.version === 'string' ? p.version : '',
      updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : 0,
      error: typeof p.error === 'string' ? p.error : undefined,
      ignoredVersion: typeof p.ignoredVersion === 'string' ? p.ignoredVersion : undefined,
    };
  } catch {
    return { ...DEFAULT_DL };
  }
}

export function setDlPersist(patch: Partial<VoiceDlPersist>): VoiceDlPersist {
  const next: VoiceDlPersist = {
    ...getDlPersist(),
    ...patch,
    updatedAt: Date.now(),
  };
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(DL_KEY, JSON.stringify(next));
  } catch {
    /* best-effort */
  }
  return next;
}

/**
 * Reconcile on app start: a download interrupted by a restart was
 * 'downloading' — it becomes 'paused' with its last progress, so the
 * card offers Resume instead of a broken spinner.
 */
export function reconcileDlOnBoot(): VoiceDlPersist {
  const p = getDlPersist();
  if (p.state === 'downloading') {
    return setDlPersist({ state: 'paused' });
  }
  return p;
}
