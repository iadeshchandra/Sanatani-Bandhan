/**
 * sacredAudio.ts — a soft temple bell, synthesized, zero assets (Pillar 5).
 * =====================================================================
 * The bell is generated with the Web Audio API — no audio files, no
 * network, fully offline-safe. A small stack of detuned sine partials
 * with exponential decay reads as a distant temple bell rather than a
 * notification "ding".
 *
 * RESPECT RULES (non-negotiable):
 *  - Never autoplay: `playSoftBell()` is only ever called from a direct
 *    user gesture (tapping +108 / +1008 on the japa counter).
 *  - Never play when the tab is hidden.
 *  - The user can mute it permanently from My Space → Profile →
 *    Preferences; the choice persists in localStorage.
 */

import { useCallback, useEffect, useState } from 'react';

const MUTE_KEY = 'sb.sacredSound.muted';

/** True when the user has muted sacred sounds. */
export function isSacredSoundMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Persist the user's mute choice. */
export function setSacredSoundMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* storage unavailable — the mute simply won't persist, harmless */
  }
}

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    // Some browsers start suspended until a gesture; we are always called
    // from one, so resume opportunistically.
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Play one soft temple bell. Fire-and-forget; every failure mode is
 * swallowed — a bell must never break the flow it celebrates.
 */
export function playSoftBell(): void {
  try {
    if (isSacredSoundMuted()) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    const ac = audioContext();
    if (!ac) return;

    const now = ac.currentTime;
    const master = ac.createGain();
    // Gentle overall level — felt, not startling.
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
    master.connect(ac.destination);

    // Temple-bell partials: a warm fundamental with soft upper shimmer.
    // Slight detune between the pair gives the slow "breathing" beat of
    // real bronze.
    const partials: Array<{ freq: number; gain: number; decay: number }> = [
      { freq: 523.25, gain: 1.0, decay: 2.6 }, // C5 — the body
      { freq: 524.4, gain: 0.55, decay: 2.2 }, // detuned twin
      { freq: 784.0, gain: 0.28, decay: 1.7 }, // G5 — fifth shimmer
      { freq: 1046.5, gain: 0.12, decay: 1.2 }, // C6 — faint crown
    ];
    for (const p of partials) {
      const osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.freq, now);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(p.gain, now + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);
      osc.connect(g);
      g.connect(master);
      osc.start(now);
      osc.stop(now + p.decay + 0.1);
    }
  } catch {
    /* audio is decoration — never throw */
  }
}

/** React binding for the Preferences toggle. */
export function useSacredSound(): {
  muted: boolean;
  setMuted: (m: boolean) => void;
  playBell: () => void;
} {
  const [muted, setMutedState] = useState<boolean>(() => isSacredSoundMuted());

  useEffect(() => {
    // Keep in sync if another tab flips the preference.
    const onStorage = (e: StorageEvent) => {
      if (e.key === MUTE_KEY) setMutedState(isSacredSoundMuted());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setMuted = useCallback((m: boolean) => {
    setSacredSoundMuted(m);
    setMutedState(m);
  }, []);

  return { muted, setMuted, playBell: playSoftBell };
}
