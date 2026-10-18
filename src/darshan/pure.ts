/**
 * darshan/pure.ts — pure helpers with zero Firebase imports.
 * Jest-safe. liveStatus.ts re-exports these.
 */
import type { OrgLiveStatus } from './types';

/** Show the LIVE badge only when definitively live. Never guess. */
export function shouldShowLiveBadge(status: OrgLiveStatus | null | undefined): boolean {
  return status?.isLive === true;
}

/** Human "next aarti" text from a schedule. */
export function nextAartiText(
  schedules: Array<{ name: string; time: string; days?: number[] }>,
  now: Date = new Date(),
): { name: string; text: string } | null {
  if (!schedules?.length) return null;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = now.getDay();

  let best: { name: string; mins: number; daysAhead: number } | null = null;
  for (const s of schedules) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s.time);
    if (!m) continue;
    const tMin = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    for (let d = 0; d < 8; d++) {
      const day = (today + d) % 7;
      if (s.days?.length && !s.days.includes(day)) continue;
      const mins = d * 1440 + tMin - nowMin;
      if (mins <= 0) continue;
      if (!best || mins < best.mins) best = { name: s.name, mins, daysAhead: d };
      break;
    }
  }
  if (!best) return null;
  const { name, mins, daysAhead } = best;
  const time = schedules.find((s) => s.name === name)?.time ?? '';
  let text: string;
  if (daysAhead === 0 && mins < 60) text = `in ${mins}m`;
  else if (daysAhead === 0) text = `in ${Math.floor(mins / 60)}h ${mins % 60}m`;
  else if (daysAhead === 1) text = `tomorrow at ${time}`;
  else text = `in ${daysAhead} days at ${time}`;
  return { name, text };
}
