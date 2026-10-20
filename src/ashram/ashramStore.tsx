import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { allowsSeedData } from '../lib/workspaceKind';
import { purgePersistedSeedState } from '../lib/seedPurge';
import {
  AshramState, AshramSettings, Booking, MealCount, Room, Stay,
} from './types';

/* ------------------------------------------------------------------ */
/* Ashram One store — offline-first, per-workspace localStorage.       */
/* Room registry, bookings, stays, meal counts and settings live on    */
/* this device; money (stay donations at checkout) ALSO posts to       */
/* treasury, which has the cloud path. New data-layer module —         */
/* DataContext is never touched (128KB transport limit).               */
/*                                                                     */
/* OVERBOOKING RULES (the core correctness guarantee):                 */
/* - Ranges are [checkIn, checkOut): the checkout day is free for the  */
/*   next guest.                                                       */
/* - single/double/family rooms: one party per room per night.          */
/* - dormitories: sum of party sizes across overlapping stays +        */
/*   held/confirmed bookings must not exceed capacity (bed count).      */
/* - Rooms flagged 'maintenance' are never bookable.                   */
/* ------------------------------------------------------------------ */

type EntityKey = 'rooms' | 'bookings' | 'stays' | 'meals';

const EMPTY: AshramState = {
  rooms: [], bookings: [], stays: [], meals: [],
  settings: { defaultSuggestedDonation: 201, mealsPerGuest: 2 },
};

const storageKey = (ws: string) => `sb_ashram_${ws}`;
export const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const daysFrom = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
/** Whole nights between two yyyy-mm-dd dates. */
export const nightsBetween = (a: string, b: string): number => {
  const ms = new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime();
  return Math.max(0, Math.round(ms / 86400000));
};
/** [aStart, aEnd) overlaps [bStart, bEnd) — end-exclusive, checkout day is free. */
export const rangesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string): boolean =>
  aStart < bEnd && bStart < aEnd;

/** All yyyy-mm-dd dates in [start, end). */
export const eachDate = (start: string, end: string): string[] => {
  const out: string[] = [];
  const d = new Date(start + 'T12:00:00');
  const stop = new Date(end + 'T12:00:00').getTime();
  while (d.getTime() < stop) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
};

const stayRange = (s: Stay): [string, string] => [
  s.checkIn.slice(0, 10),
  (s.checkoutAt ? s.checkoutAt.slice(0, 10) : s.expectedCheckout),
];

const ACTIVE_BOOKING = (b: Booking) => b.status === 'held' || b.status === 'confirmed';

/**
 * Beds occupied in a room on a given date by checked-in stays +
 * held/confirmed bookings. Optionally ignore one stay/booking (for edits).
 */
export function roomLoadOn(
  room: Room, date: string, state: AshramState,
  ignore?: { stayId?: string; bookingId?: string },
): { used: number; capacity: number; full: boolean; by: string[] } {
  const by: string[] = [];
  let used = 0;
  for (const s of state.stays) {
    if (s.status !== 'checked-in' || s.roomId !== room.id) continue;
    if (ignore?.stayId && s.id === ignore.stayId) continue;
    const [a, b] = stayRange(s);
    if (a <= date && date < b) {
      by.push(s.guestName);
      used += room.type === 'dormitory' ? s.partySize : 1;
    }
  }
  for (const bk of state.bookings) {
    if (!ACTIVE_BOOKING(bk) || bk.roomId !== room.id) continue;
    if (ignore?.bookingId && bk.id === ignore.bookingId) continue;
    if (bk.checkIn <= date && date < bk.checkOut) {
      by.push(bk.guestName);
      used += room.type === 'dormitory' ? bk.partySize : 1;
    }
  }
  return { used, capacity: room.capacity, full: used >= room.capacity, by };
}

/** True when `partySize` fits in the room for every night of [ci, co). */
export function isRoomFreeForRange(
  room: Room, ci: string, co: string, partySize: number, state: AshramState,
  ignore?: { stayId?: string; bookingId?: string },
): { ok: boolean; clashDate?: string } {
  if (room.status === 'maintenance') return { ok: false };
  for (const d of eachDate(ci, co)) {
    const load = roomLoadOn(room, d, state, ignore);
    const need = room.type === 'dormitory' ? partySize : 1;
    if (load.used + need > room.capacity) return { ok: false, clashDate: d };
  }
  return { ok: true };
}

/** First room of a type with space for the whole range (lowest number first). */
export function findFreeRoom(
  rooms: Room[], type: Room['type'], ci: string, co: string, partySize: number, state: AshramState,
): Room | null {
  const cands = rooms
    .filter((r) => r.type === type && r.status !== 'maintenance')
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  for (const r of cands) {
    if (isRoomFreeForRange(r, ci, co, partySize, state).ok) return r;
  }
  return null;
}

/** Nights a room is occupied inside [from, to) — for occupancy %. */
export function occupiedNights(room: Room, from: string, to: string, state: AshramState): number {
  let n = 0;
  for (const d of eachDate(from, to)) {
    if (roomLoadOn(room, d, state).used > 0) n += 1;
  }
  return n;
}

function loadState(ws: string): AshramState {
  try {
    const raw = localStorage.getItem(storageKey(ws));
    if (raw) {
      const parsed = JSON.parse(raw);
      // QUEUED #53: one-time purge of pre-law persisted seed residue
      // (real workspaces only; exact seed-id match — see lib/seedPurge).
      return purgePersistedSeedState('ashram', ws, { ...EMPTY, ...parsed, settings: { ...EMPTY.settings, ...(parsed.settings || {}) } });
    }
  } catch { /* corrupted → reseed */ }
  return { ...EMPTY };
}

/* ------------------------- demo seed ------------------------- */
function buildSeed(): AshramState {
  const rooms: Room[] = [
    { id: 'r_101', number: '101', type: 'single', capacity: 1, facilities: ['Attached bath', 'Geyser'], suggestedDonation: 201, status: 'available', floor: 'Ground' },
    { id: 'r_102', number: '102', type: 'single', capacity: 1, facilities: ['Attached bath'], suggestedDonation: 201, status: 'available', floor: 'Ground' },
    { id: 'r_103', number: '103', type: 'double', capacity: 2, facilities: ['Attached bath', 'Geyser', 'Balcony'], suggestedDonation: 351, status: 'available', floor: 'First' },
    { id: 'r_104', number: '104', type: 'double', capacity: 2, facilities: ['Attached bath', 'Geyser'], suggestedDonation: 351, status: 'available', floor: 'First' },
    { id: 'r_201', number: '201', type: 'family', capacity: 4, facilities: ['2 rooms', 'Attached bath', 'Geyser', 'Kitchenette'], suggestedDonation: 551, status: 'available', floor: 'Second' },
    { id: 'r_202', number: '202', type: 'family', capacity: 4, facilities: ['2 rooms', 'Attached bath'], suggestedDonation: 551, status: 'available', floor: 'Second' },
    { id: 'r_d1', number: 'D-1', type: 'dormitory', capacity: 10, facilities: ['Common bath', 'Lockers'], suggestedDonation: 101, status: 'available', floor: 'Ground' },
    { id: 'r_d2', number: 'D-2', type: 'dormitory', capacity: 8, facilities: ['Common bath', 'Lockers'], suggestedDonation: 101, status: 'available', floor: 'Ground' },
    { id: 'r_105', number: '105', type: 'double', capacity: 2, facilities: ['Attached bath'], suggestedDonation: 351, status: 'maintenance', floor: 'First', notes: 'Bathroom repair — plumber booked' },
  ];
  const stays: Stay[] = [
    {
      id: 's_1', guestName: 'Shri Harishchandra Patel', phone: '+91 98250 11111',
      idType: 'Aadhaar', idNumber: 'XXXX-XXXX-1234', purpose: 'Somnath darshan', partySize: 2,
      roomId: 'r_103', checkIn: daysFrom(-1) + 'T14:30:00', expectedCheckout: daysFrom(2),
      status: 'checked-in', suggestedTotal: 351 * 3,
    },
    {
      id: 's_2', guestName: 'Smt. Lakshmi Devi', phone: '+91 98250 22222',
      purpose: 'Sadhana shivir', partySize: 1,
      roomId: 'r_101', checkIn: daysFrom(0) + 'T10:00:00', expectedCheckout: daysFrom(4),
      status: 'checked-in', suggestedTotal: 201 * 4,
    },
    {
      id: 's_3', guestName: 'Shri Ramesh Gupta', phone: '+91 98250 33333',
      purpose: 'Business yatra', partySize: 6,
      roomId: 'r_d1', checkIn: daysFrom(0) + 'T18:00:00', expectedCheckout: daysFrom(1),
      status: 'checked-in', suggestedTotal: 101 * 6,
    },
  ];
  const bookings: Booking[] = [
    {
      id: 'b_1', guestName: 'Shri Anil Deshmukh', phone: '+91 98250 44444',
      roomType: 'family', partySize: 4, checkIn: daysFrom(5), checkOut: daysFrom(8),
      purpose: 'Parivar yatra', status: 'confirmed', createdAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'b_2', guestName: 'Smt. Geeta Nair', phone: '+91 98250 55555',
      roomType: 'double', partySize: 2, checkIn: daysFrom(5), checkOut: daysFrom(7),
      purpose: 'Temple visit', status: 'waitlist', notes: 'Waitlisted — no double room free for these dates yet',
      createdAt: Date.now() - 86400000,
    },
  ];
  const meals: MealCount[] = [
    { id: 'm_1', date: daysFrom(-1), breakfast: 12, lunch: 28, dinner: 24, autoSuggested: true },
    { id: 'm_2', date: todayISO(), breakfast: 9, lunch: 0, dinner: 0, autoSuggested: true, notes: 'Auto-suggested from occupancy — confirm counts' },
  ];
  return { ...EMPTY, rooms, bookings, stays, meals, settings: { ...EMPTY.settings } };
}

/* ------------------------- context ------------------------- */
interface AshramCtx {
  state: AshramState;
  workspaceId: string;
  add: <K extends EntityKey>(key: K, item: AshramState[K] extends Array<infer T> ? T : never) => void;
  update: <K extends EntityKey>(key: K, id: string, patch: Partial<AshramState[K] extends Array<infer T> ? T : never>) => void;
  remove: (key: EntityKey, id: string) => void;
  setSettings: (patch: Partial<AshramSettings>) => void;
  ensureSeeded: () => void;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  resetAll: () => void;
}

const Ctx = createContext<AshramCtx | null>(null);

export const AshramProvider: React.FC<{ workspaceId: string; children: React.ReactNode }> = ({ workspaceId, children }) => {
  const [state, setState] = useState<AshramState>(() => loadState(workspaceId));
  const wsRef = useRef(workspaceId);
  // Workspace switch → reload. Guarded so the mount pass never clobbers
  // a seed applied by the desk's own effect in the same commit.
  useEffect(() => {
    if (wsRef.current !== workspaceId) { wsRef.current = workspaceId; setState(loadState(workspaceId)); }
  }, [workspaceId]);
  useEffect(() => {
    try { localStorage.setItem(storageKey(wsRef.current), JSON.stringify(state)); } catch { /* quota → keep in memory */ }
  }, [state]);

  const api = useMemo<AshramCtx>(() => ({
    state,
    workspaceId,
    add: (key, item) => setState((s) => ({ ...s, [key]: [...(s[key] as unknown[]), item] })),
    update: (key, id, patch) => setState((s) => ({
      ...s,
      [key]: (s[key] as Array<{ id: string }>).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })),
    remove: (key, id) => setState((s) => ({
      ...s,
      [key]: (s[key] as Array<{ id: string }>).filter((r) => r.id !== id),
    })),
    setSettings: (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    // Seed guard: only seed when no rooms exist (never clobber user data).
    ensureSeeded: () => {
      // QUEUED #45 seed law: fictitious seed data hydrates ONLY in an
      // explicit demo context. In a real workspace an empty store
      // stays EMPTY — no phantom herds, rooms, meals or members.
      if (!allowsSeedData(workspaceId)) return;
      setState((s) => (s.rooms.length ? s : buildSeed()));
    },
    exportJSON: () => JSON.stringify(state, null, 2),
    importJSON: (json) => {
      try {
        const parsed = JSON.parse(json);
        if (!parsed || !Array.isArray(parsed.rooms)) return false;
        setState({ ...EMPTY, ...parsed, settings: { ...EMPTY.settings, ...(parsed.settings || {}) } });
        return true;
      } catch { return false; }
    },
    resetAll: () => setState(allowsSeedData(workspaceId) ? buildSeed() : EMPTY),
  }), [state, workspaceId]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
};

export const useAshram = (): AshramCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAshram must be used inside AshramProvider');
  return ctx;
};
