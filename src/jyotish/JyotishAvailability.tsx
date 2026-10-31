/**
 * jyotish/JyotishAvailability.tsx — availability made VISIBLE (JY-07).
 * =====================================================================
 * The audit found availability was write-only: a jyotishi could save
 * weekly slots in their workspace, and nothing anywhere ever read them
 * — the public profile and the booking sheet behaved as if the feature
 * did not exist. This module is the read side (the pure maths lives in
 * availabilityLogic.ts, jest-safe):
 *
 *  - `JyotishAvailabilityStrip` renders the saved weekly pattern on
 *    public surfaces (marketplace card, unified profile, booking
 *    sheet). It renders NOTHING when the jyotishi never recorded
 *    availability — absence of a claim, never an invented one.
 *  - `JyotishAvailabilityNote` is the booking sheet's soft note: when
 *    the requested date's weekday has no slot on, it says so warmly
 *    and explicitly does NOT block — the jyotishi confirms every
 *    booking personally, and day-level slots carry no time-of-day.
 *
 * Reads use the existing public-read `jyotishAvailability/{id}` doc —
 * zero rules changes.
 */
import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  summariseAvailability,
  availabilityVerdictForDate,
  weekdayNameForDate,
} from './availabilityLogic';

export {
  summariseAvailability,
  availabilityVerdictForDate,
  weekdayNameForDate,
} from './availabilityLogic';

/** Fetch the saved slots for a jyotishi (null = none recorded / failed). */
export function useJyotishAvailabilitySlots(
  jyotishId: string | undefined
): Record<string, boolean> | null {
  const [slots, setSlots] = useState<Record<string, boolean> | null>(null);
  useEffect(() => {
    let live = true;
    if (!jyotishId) {
      setSlots(null);
      return;
    }
    getDoc(doc(db, 'jyotishAvailability', jyotishId))
      .then((snap) => {
        if (!live) return;
        setSlots(snap.exists() ? ((snap.data() as any).slots || {}) : null);
      })
      .catch(() => {
        if (live) setSlots(null);
      });
    return () => {
      live = false;
    };
  }, [jyotishId]);
  return slots;
}

/** Public strip: "🗓️ Usually available: Mon morning · Wed evening". */
export const JyotishAvailabilityStrip: React.FC<{ jyotishId: string }> = ({ jyotishId }) => {
  const slots = useJyotishAvailabilitySlots(jyotishId);
  const days = summariseAvailability(slots);
  if (days.length === 0) return null;
  return (
    <p className="text-xs text-stone-600">
      🗓️ <span className="font-bold">Usually available:</span>{' '}
      {days.map((d) => `${d.label} ${d.shifts.join(' & ')}`).join(' · ')}
    </p>
  );
};

/**
 * Booking-sheet soft note. Renders only on a definite 'outside'
 * verdict; booking is NEVER blocked — the jyotishi confirms personally.
 */
export const JyotishAvailabilityNote: React.FC<{
  jyotishId: string;
  dateStr: string;
  jyotishName: string;
}> = ({ jyotishId, dateStr, jyotishName }) => {
  const slots = useJyotishAvailabilitySlots(jyotishId);
  const verdict = availabilityVerdictForDate(slots, dateStr);
  if (verdict !== 'outside' || !dateStr) return null;
  const day = weekdayNameForDate(dateStr);
  return (
    <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
      🗓️ {jyotishName} is usually not available on {day}s. You may still send the request —
      they will confirm personally, and another day can always be arranged.
    </p>
  );
};
