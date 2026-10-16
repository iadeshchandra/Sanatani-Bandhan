import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  SoloPersonalState,
  JapaEntry,
  VrataEntry,
  Sankalpa,
  SavedItem,
  GivingRecord,
  PersonalReminder,
} from './types';

/* Solo Sanatani store — offline-first, per-uid localStorage.
 * =====================================================================
 * Personal data (sadhana, saved, giving, reminders) lives on THIS DEVICE.
 * It is keyed by the Firebase uid (or 'anon'), so it SURVIVES every
 * progressive upgrade: joining an organisation, becoming a purohit or a
 * jyotishi never touches this store. DataContext.tsx is never involved.
 */

const storageKey = (uid: string) => `sb_solo_personal_${uid}`;

const emptyState = (): SoloPersonalState => ({
  japa: [],
  vrata: [],
  sankalpa: [],
  saved: [],
  giving: [],
  reminders: [],
  samskaras: [],
});

function loadState(uid: string): SoloPersonalState {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return { ...emptyState(), ...parsed };
  } catch {
    return emptyState();
  }
}

export const uid = (p: string) =>
  `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const todayISO = () => new Date().toISOString().slice(0, 10);

type Collection = keyof SoloPersonalState;

interface SoloStoreCtx {
  state: SoloPersonalState;
  add: <K extends Collection>(col: K, rec: SoloPersonalState[K][number]) => void;
  update: <K extends Collection>(col: K, id: string, patch: Partial<SoloPersonalState[K][number]>) => void;
  remove: (col: Collection, id: string) => void;
  exportJSON: () => string;
  importJSON: (raw: string) => boolean;
  resetAll: () => void;
}

const Ctx = createContext<SoloStoreCtx | null>(null);

export const SoloStoreProvider: React.FC<{ uid: string; children: React.ReactNode }> = ({ uid: userUid, children }) => {
  const wsRef = useRef(userUid);
  const [state, setState] = useState<SoloPersonalState>(() => loadState(userUid));

  // Guarded re-load: only when the uid actually changes (never clobbers
  // in-flight writes on mount — the Goshala One seed-clobber lesson).
  useEffect(() => {
    if (wsRef.current !== userUid) {
      wsRef.current = userUid;
      setState(loadState(userUid));
    }
  }, [userUid]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(wsRef.current), JSON.stringify(state));
    } catch {
      /* quota exceeded — data stays in memory for the session */
    }
  }, [state]);

  const api = useMemo<SoloStoreCtx>(
    () => ({
      state,
      add: (col, rec) =>
        setState((s) => ({ ...s, [col]: [rec as never, ...(s[col] as never[])] })),
      update: (col, id, patch) =>
        setState((s) => ({
          ...s,
          [col]: (s[col] as Array<{ id: string }>).map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      remove: (col, id) =>
        setState((s) => ({
          ...s,
          [col]: (s[col] as Array<{ id: string }>).filter((r) => r.id !== id),
        })),
      exportJSON: () => JSON.stringify({ exportedAt: new Date().toISOString(), state }),
      importJSON: (raw: string) => {
        try {
          const parsed = JSON.parse(raw);
          const incoming = parsed.state || parsed;
          setState({ ...emptyState(), ...incoming });
          return true;
        } catch {
          return false;
        }
      },
      resetAll: () => setState(emptyState()),
    }),
    [state]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
};

export const useSoloStore = (): SoloStoreCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSoloStore must be used inside SoloStoreProvider');
  return ctx;
};

/* Re-export entry types for tabs. */
export type { JapaEntry, VrataEntry, Sankalpa, SavedItem, GivingRecord, PersonalReminder };
