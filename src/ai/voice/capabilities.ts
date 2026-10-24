/**
 * Sanatani Bandhan — AI Assistant Phase 1 · capability probe
 * =====================================================================
 * Decides whether this device can host the on-device voice.
 * Pure detection — no downloads, no prompts, no side effects.
 *
 * Graceful absence is a first-class outcome: anything that is not a
 * confident "yes" resolves to `unavailable`, and the caller shows the
 * honest settings note. Phase 0 works fully regardless.
 */

import { REQUIRED_FREE_BYTES, VOICE_MODEL } from './models';
import { getWebLlm } from './webllm';
import {
  getDlPersist,
  reconcileDlOnBoot,
  setDlPersist,
  type VoiceDlPersist,
  type VoiceDlState,
} from './storage';
import type { UnavailableReason, VoiceCapability } from './types';

function hasWebGPU(): boolean {
  try {
    if (typeof navigator === 'undefined') return false;
    const nav = navigator as Navigator & { gpu?: unknown };
    return !!nav.gpu;
  } catch {
    return false;
  }
}

/**
 * WORLD-READY (Exhibit 1): `navigator.gpu` EXISTING is not the same as a
 * GPU being usable. The owner's desktop browser exposes the API yet
 * `requestAdapter()` fails ("Unable to find a compatible GPU"), so the
 * old presence-only probe waved the device through to a download that
 * could only ever fail at engine-load time — with the raw engine error
 * shown to the user. Probe a real adapter instead:
 *   · adapter resolves        → usable
 *   · adapter resolves null,
 *     or the call rejects     → definitively NOT usable ('no-webgpu')
 *   · call hangs past timeout → indeterminate; fall back to the
 *                               presence result rather than denying a
 *                               possibly-capable device.
 * Memoised per session: one adapter request is enough.
 */
const ADAPTER_PROBE_TIMEOUT_MS = 5000;
let adapterProbeCache: Promise<boolean | null> | null = null;

function probeGpuAdapter(): Promise<boolean | null> {
  if (adapterProbeCache) return adapterProbeCache;
  adapterProbeCache = (async (): Promise<boolean | null> => {
    try {
      const nav = navigator as Navigator & {
        gpu?: { requestAdapter?: () => Promise<unknown> };
      };
      if (!nav.gpu || typeof nav.gpu.requestAdapter !== 'function') return false;
      const TIMEOUT = Symbol('adapter-probe-timeout');
      const winner = await Promise.race([
        nav.gpu.requestAdapter(),
        new Promise<typeof TIMEOUT>((resolve) =>
          setTimeout(() => resolve(TIMEOUT), ADAPTER_PROBE_TIMEOUT_MS)
        ),
      ]);
      if (winner === TIMEOUT) return null; // indeterminate — presence fallback
      return winner != null; // null adapter = definitively no usable GPU
    } catch {
      return false; // a rejecting requestAdapter is a definitive no
    }
  })();
  return adapterProbeCache;
}

async function freeStorageBytes(): Promise<number | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
    const est = await navigator.storage.estimate();
    if (typeof est.quota === 'number' && typeof est.usage === 'number') {
      return Math.max(0, est.quota - est.usage);
    }
    return null;
  } catch {
    return null;
  }
}

/** True when the model weights are already in the WebLLM cache. */
export async function isModelCached(): Promise<boolean> {
  try {
    // Single gateway (./webllm): keeps @mlc-ai/web-llm in ONE async chunk.
    // Separate dynamic imports per module duplicated the lib (incl. tvmjs)
    // into the main chunk and broke the PWA precache build (2026-10-18).
    const { hasModelInCache } = await getWebLlm();
    return await hasModelInCache(VOICE_MODEL.id);
  } catch {
    return false;
  }
}

export interface ResolvedVoiceState {
  /** Effective UI state after reconciling cache, storage, and version. */
  state: VoiceDlState | 'unavailable';
  dl: VoiceDlPersist;
  cap: VoiceCapability;
}

/**
 * Resolve the effective voice state: boot-reconcile the persisted
 * machine, probe capability, then cross-check the real cache —
 * adopting unexpected cache hits and expiring phantom 'downloaded'
 * states, and surfacing 'update-available' when the blessed model
 * version moved past the downloaded one (unless dismissed).
 * Never throws — worst case is 'not-downloaded'.
 */
export async function resolveVoiceState(): Promise<ResolvedVoiceState> {
  try {
    const dl0 = reconcileDlOnBoot();
    const cap = await probeVoiceCapability();
    if (cap.status === 'unavailable') return { state: 'unavailable', dl: dl0, cap };
    const cached = cap.status === 'downloaded';
    let dl = dl0;
    if ((dl.state === 'downloaded' || dl.state === 'update-available') && !cached) {
      // Cache cleared externally (browser eviction) — stop pretending.
      dl = setDlPersist({ state: 'not-downloaded', progress: 0, version: '' });
    } else if (dl.state === 'not-downloaded' && cached) {
      // Cache present but we have no record — adopt it honestly.
      dl = setDlPersist({ state: 'downloaded', progress: 1, version: VOICE_MODEL.version });
    } else if (dl.state === 'downloaded' && cached) {
      if (dl.version === '') {
        dl = setDlPersist({ version: VOICE_MODEL.version });
      } else if (dl.version !== VOICE_MODEL.version && dl.ignoredVersion !== VOICE_MODEL.version) {
        dl = setDlPersist({ state: 'update-available' });
      }
    }
    return { state: dl.state, dl, cap };
  } catch {
    const dl = getDlPersist();
    return {
      state: 'not-downloaded',
      dl,
      cap: { status: 'unavailable', webgpu: false, freeStorageGB: null, reason: 'unknown' },
    };
  }
}

/**
 * Full probe: WebGPU → storage → cache state.
 * Never throws — failure to probe is itself `unavailable`.
 */
export async function probeVoiceCapability(): Promise<VoiceCapability> {
  let reason: UnavailableReason | undefined;
  try {
    const webgpu = hasWebGPU();
    if (!webgpu) {
      // Covers iPhones and old devices: no usable WebGPU → no 3B model.
      // (iOS Safari exposes no WebGPU with enough memory for this class;
      //  engine creation would OOM — we fail here, honestly, instead.)
      reason = 'no-webgpu';
      return { status: 'unavailable', webgpu: false, freeStorageGB: null, reason };
    }
    // The API object exists — but is there a real adapter behind it?
    // (Exhibit 1: a desktop browser with navigator.gpu present yet no
    // compatible GPU was offered a download that could only fail.)
    const adapterUsable = await probeGpuAdapter();
    if (adapterUsable === false) {
      reason = 'no-webgpu';
      return { status: 'unavailable', webgpu: false, freeStorageGB: null, reason };
    }
    const free = await freeStorageBytes();
    const freeGB = free === null ? null : free / 1073741824;
    if (free !== null && free < REQUIRED_FREE_BYTES) {
      reason = 'low-storage';
      return { status: 'unavailable', webgpu: true, freeStorageGB: freeGB, reason };
    }
    const cached = await isModelCached();
    return {
      status: cached ? 'downloaded' : 'available',
      webgpu: true,
      freeStorageGB: freeGB,
    };
  } catch {
    reason = 'unknown';
    return { status: 'unavailable', webgpu: false, freeStorageGB: null, reason };
  }
}
