/**
 * crisis/crisisFormat.ts — shared dignified formatting for crisis history.
 * Used by PersonalHistory (own log) and FamilySafety (consented view) so
 * both render the SAME card format, as the contract requires.
 */

import { crisisCopy, type TriString } from './crisisStrings';
import type { CrisisSituation } from './crisisCommandTypes';

export function situationLabel(s: CrisisSituation, t: (x: TriString) => string): string {
  switch (s) {
    case 'medical': return t(crisisCopy.sitMedical);
    case 'fire': return t(crisisCopy.sitFire);
    case 'robbery': return t(crisisCopy.sitRobbery);
    case 'crowd': return t(crisisCopy.sitCrowd);
    case 'disaster': return t(crisisCopy.sitDisaster);
    default: return t(crisisCopy.sitOther);
  }
}

export function statusLabel(status: string, t: (x: TriString) => string): string {
  switch (status) {
    case 'active': return t(crisisCopy.activeTitle);
    case 'acknowledged': return t(crisisCopy.stepAck);
    case 'responding': return t(crisisCopy.stepResponding);
    case 'resolved': return t(crisisCopy.stepResolved);
    case 'cancelled': return t(crisisCopy.cancel);
    default: return status;
  }
}

export function statusPillClass(status: string): string {
  // Warm, non-alarming: active = amber glow (held, present), never red.
  switch (status) {
    case 'active': return 'bg-amber-100 text-amber-900 border-amber-300 shadow-[0_0_10px_rgba(217,119,6,0.3)]';
    case 'acknowledged': return 'bg-orange-100 text-[#7F1D1D] border-orange-300';
    case 'responding': return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'resolved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default: return 'bg-stone-100 text-stone-600 border-stone-200';
  }
}

export function formatWhen(ms: number, lang: string): string {
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleString(
      lang === 'bn' ? 'bn-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN',
      { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' },
    );
  } catch {
    return new Date(ms).toLocaleString();
  }
}

export function formatDuration(
  startMs: number,
  endMs: number | null,
  openLabel: string,
): string {
  if (!startMs) return '—';
  if (!endMs) return openLabel;
  const sec = Math.max(0, Math.round((endMs - startMs) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
