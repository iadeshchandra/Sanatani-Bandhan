/**
 * Sanatani Bandhan — AI Assistant Phase 1 · downloader
 * =====================================================================
 * Informed-consent download of the on-device model into the WebLLM cache
 * (Cache Storage). Design law: the user taps with full knowledge —
 * what it is, how big (~1.8 GB), WiFi-only by default, removable anytime
 * with the freed space stated up front.
 *
 * Flow:
 *   requestDownload() → connection check → { ok } | { needsConfirm }
 *   confirmDownload(onProgress) → CreateMLCEngine (progress via engine.ts)
 *                                → integrity: hasModelInCache() must be true
 *   cancelDownload() → best-effort abort + partial-cache cleanup
 *   removeVoice() → deleteModelInCache + unloadEngine + status bookkeeping
 *
 * No Firestore, no rules changes: voice state is device-local.
 */

import { VOICE_MODEL, modelSizeLabel } from './models';
import { getWebLlm } from './webllm';
import { isModelCached } from './capabilities';
import { getEngine, unloadEngine, warmEngine } from './engine';
import { setCachedStatus, setDlPersist, getDlPersist } from './storage';
import type { DownloadProgress } from './types';

export type DownloadGate =
  | { ok: true }
  | { ok: false; needsConfirm: true; reason: string };

interface NavConnection {
  effectiveType?: string;
  type?: string;
  saveData?: boolean;
}

function connection(): NavConnection | null {
  try {
    if (typeof navigator === 'undefined') return null;
    return (navigator as Navigator & { connection?: NavConnection }).connection ?? null;
  } catch {
    return null;
  }
}

/**
 * WiFi gate. Returns ok:true on unmetered-looking connections; otherwise
 * asks the UI to confirm explicitly (the consent screen states the size).
 * Unknown connection type → confirm (honest: "we can't tell your network").
 */
export function downloadGate(): DownloadGate {
  const c = connection();
  if (!c) {
    return {
      ok: false,
      needsConfirm: true,
      reason: `We can't tell your network type — the download is ${modelSizeLabel()}.`,
    };
  }
  if (c.saveData) {
    return {
      ok: false,
      needsConfirm: true,
      reason: `Data Saver is on — the download is ${modelSizeLabel()}.`,
    };
  }
  const slow = c.effectiveType === 'slow-2g' || c.effectiveType === '2g';
  const cellular = c.type === 'cellular';
  if (slow || cellular) {
    return {
      ok: false,
      needsConfirm: true,
      reason: `You're on mobile data — the download is ${modelSizeLabel()}. WiFi is kinder.`,
    };
  }
  return { ok: true };
}

let cancelled = false;

/** Best-effort pause: the in-flight CreateMLCEngine cannot be hard-aborted
 *  mid-shard, so we stop at the next progress tick and keep partial cache.
 *  State → 'paused' with last progress — Resume continues from cached shards. */
export function pauseDownload(): void {
  cancelled = true;
}

/**
 * Cancel mid-download → a CLEAN paused state (per the state machine):
 * partial cache is swept, progress resets, and Resume starts fresh.
 * Nothing is left half-broken; everything is recoverable from the card.
 */
export function cancelDownload(): void {
  cancelled = true;
  setDlPersist({ state: 'paused', progress: 0, error: undefined });
}

export function resetDownloadCancel(): void {
  cancelled = false;
}

/** Persist progress (throttled by the caller on 5% steps). */
function noteProgress(p: DownloadProgress): void {
  setDlPersist({ state: 'downloading', progress: p.progress });
}

/**
 * WORLD-READY (Exhibit 1) — error KIND tokens, never raw error text.
 * =====================================================================
 * The persisted `error` field used to store the engine's raw message
 * (e.g. WebLLM's "Unable to find a compatible GPU… webgpureport.org"),
 * and the settings card rendered it verbatim — a raw technical error
 * in the middle of a Bangla UI. From now on the field stores ONLY one
 * of these kind tokens; the card maps a token to ONE plain line in the
 * user's language. Classification:
 *   'gpu'       — no usable GPU / adapter / device (PERMANENT on this
 *                 device: the card must not offer a retry that can
 *                 only fail the same way)
 *   'storage'   — quota / disk full (retry is futile until space frees)
 *   'integrity' — the downloaded cache failed its safety check
 *   'network'   — fetch/connection failure (retry is meaningful)
 *   'unknown'   — anything else, incl. legacy raw strings persisted by
 *                 older builds (they fall into this bucket at render
 *                 time and are never shown).
 */
export type VoiceDownloadErrorKind = 'gpu' | 'storage' | 'integrity' | 'network' | 'unknown';

export const VOICE_ERROR_KINDS: readonly VoiceDownloadErrorKind[] = [
  'gpu',
  'storage',
  'integrity',
  'network',
  'unknown',
];

export function classifyDownloadError(e: unknown): VoiceDownloadErrorKind {
  const msg = (e instanceof Error ? e.message : String(e ?? '')).toLowerCase();
  if (msg.includes('voice-download-integrity-failed')) return 'integrity';
  if (/gpu|webgpu|adapter|device lost|devicelost|out of memory|\boom\b/.test(msg)) return 'gpu';
  if (/quota|no space|disk full|storage.*full|insufficient storage/.test(msg)) return 'storage';
  if (/fetch|network|net::|offline|failed to load|load failed|http \d{3}|timed out|timeout|connection/.test(msg))
    return 'network';
  return 'unknown';
}

/**
 * Run the download. Progress covers fetch (weights) + load (GPU compile).
 * Persisted so an app restart reconciles to 'paused' (resumable).
 * Throws on failure — callers show the warm error and stay on Phase 0.
 */
export async function confirmDownload(onProgress: (p: DownloadProgress) => void): Promise<void> {
  resetDownloadCancel();
  setDlPersist({ state: 'downloading', progress: 0, error: undefined });
  let lastNoted = -1;
  // getEngine creates via CreateMLCEngine with the progress callback;
  // the model must already be cached OR this first creation fetches it.
  // To force a clean fetch path we create directly here instead of the
  // cached singleton (which refuses when not cached).
  // Single gateway (./webllm): one async chunk for the whole lib.
  const webllm = await getWebLlm();
  let engine: { unload(): Promise<void> } | null = null;
  try {
    engine = await webllm.CreateMLCEngine(VOICE_MODEL.id, {
      initProgressCallback: (report) => {
        if (cancelled) throw new Error('voice-download-cancelled');
        const phase = /fetch/i.test(report.text) ? 'fetch' : 'load';
        const progress = Math.min(1, Math.max(0, report.progress));
        onProgress({ progress, phase, text: report.text });
        if (progress - lastNoted >= 0.05 || progress >= 1) {
          lastNoted = progress;
          noteProgress({ progress, phase, text: report.text });
        }
      },
    });
  } catch (e) {
    const wasCancel = cancelled || (e instanceof Error && e.message === 'voice-download-cancelled');
    if (wasCancel) {
      await sweepPartialCache();
      const cur = getDlPersist();
      if (cur.state !== 'paused') setDlPersist({ state: 'paused', progress: 0 });
    } else {
      // Store the error KIND token only — never the raw engine message
      // (Exhibit 1: raw text must never reach the user's screen).
      setDlPersist({ state: 'error', error: classifyDownloadError(e) });
    }
    throw e;
  }
  if (cancelled) {
    try {
      await engine.unload();
    } catch {
      /* ignore */
    }
    await sweepPartialCache();
    throw new Error('voice-download-cancelled');
  }
  // Integrity: the cache must now hold the model, or we did not succeed.
  const cached = await isModelCached();
  if (!cached) {
    try {
      await engine.unload();
    } catch {
      /* ignore */
    }
    setDlPersist({ state: 'error', error: 'integrity' });
    throw new Error('voice-download-integrity-failed');
  }
  // Hand the warm engine to the singleton for the rest of the session.
  await unloadEngine();
  setCachedStatus('downloaded');
  setDlPersist({ state: 'downloaded', progress: 1, version: VOICE_MODEL.version, error: undefined });
  warmEngine();
  onProgress({ progress: 1, phase: 'load', text: 'Ready 🙏' });
}

/**
 * Resume a paused download — cached shards are reused by WebLLM, so this
 * continues (or cleanly restarts) rather than re-fetching everything.
 */
export async function resumeDownload(onProgress: (p: DownloadProgress) => void): Promise<void> {
  return confirmDownload(onProgress);
}

/**
 * Update to a newer blessed model version: sweep the old weights, then
 * download fresh. Only offered in 'update-available' state.
 */
export async function updateVoice(onProgress: (p: DownloadProgress) => void): Promise<void> {
  await unloadEngine();
  try {
    await deleteCachedModel();
  } catch {
    /* already gone */
  }
  setDlPersist({ state: 'downloading', progress: 0, version: '', error: undefined });
  return confirmDownload(onProgress);
}

/**
 * Single gateway (./webllm): keeps @mlc-ai/web-llm in ONE async chunk.
 * Separate dynamic imports per module duplicated the lib (incl. tvmjs)
 * into the main chunk and broke the PWA precache build (2026-10-18).
 */
async function deleteCachedModel(): Promise<void> {
  const { deleteModelInCache } = await getWebLlm();
  await deleteModelInCache(VOICE_MODEL.id);
}

async function sweepPartialCache(): Promise<void> {
  try {
    await deleteCachedModel();
  } catch {
    /* best-effort */
  }
}

/**
 * Remove the voice: delete weights from cache, unload GPU, clear status.
 * Returns the human label of the freed space for the confirmation UI.
 */
export async function removeVoice(): Promise<{ freedLabel: string }> {
  await unloadEngine();
  try {
    await deleteCachedModel();
  } catch {
    /* already gone */
  }
  setCachedStatus('removed');
  setDlPersist({ state: 'removed', progress: 0, version: '', error: undefined });
  return { freedLabel: modelSizeLabel() };
}
