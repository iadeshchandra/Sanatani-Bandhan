/**
 * TASK: sadhana_summary
 * =====================================================================
 * DATA SOURCE: the devotee's OWN device-local solo store —
 * localStorage key `sb_solo_personal_${uid}` (src/solo/soloStore.tsx):
 * japa / vrata / sankalpa collections. Keyed by uid; never leaves the
 * device; never mixed with another user's data.
 * OFFLINE STORY: fully offline — device-local by design (the SadhanaTab
 * header documents "Device-local, offline-first").
 * FAIL-OPEN: corrupt/missing storage → the 'empty' variant, never a crash.
 */
import { suggestionsFor } from '../templates';
import type { TaskCtx, TaskOutcome } from '../types';

interface JapaRec { date?: string; count?: number }
interface VrataRec { id?: string }
interface SankalpaRec { id?: string }
interface SoloPersonal {
  japa?: JapaRec[];
  vrata?: VrataRec[];
  sankalpa?: SankalpaRec[];
}

function loadPersonal(uid: string): SoloPersonal {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(`sb_solo_personal_${uid}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SoloPersonal;
    return {
      japa: Array.isArray(parsed.japa) ? parsed.japa : [],
      vrata: Array.isArray(parsed.vrata) ? parsed.vrata : [],
      sankalpa: Array.isArray(parsed.sankalpa) ? parsed.sankalpa : [],
    };
  } catch {
    return {};
  }
}

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Consecutive-day streak ending today (or yesterday, still alive). */
function streakDays(japa: JapaRec[]): number {
  const days = new Set(
    japa.filter((j) => (j.count || 0) > 0 && typeof j.date === 'string').map((j) => j.date as string)
  );
  if (days.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  // Allow "today not yet logged" — streak counts if yesterday is present.
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (!days.has(iso(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(iso(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function sadhanaSummaryTask(ctx: TaskCtx): TaskOutcome {
  const personal = loadPersonal(ctx.uid);
  const japa = personal.japa ?? [];
  const today = todayISO();

  const japaToday = japa
    .filter((j) => j.date === today)
    .reduce((s, j) => s + (typeof j.count === 'number' ? j.count : 0), 0);
  const streak = streakDays(japa);
  const vrataCount = (personal.vrata ?? []).length;
  const sankalpaCount = (personal.sankalpa ?? []).length;

  if (japa.length === 0 && vrataCount === 0 && sankalpaCount === 0) {
    return { params: {}, variant: 'empty' };
  }
  return {
    params: { japaToday, streak, vrataCount, sankalpaCount },
    variant: 'summary',
    suggestions: suggestionsFor('sadhana_summary', ctx.lang),
  };
}
