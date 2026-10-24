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

/**
 * WORLD-READY (E-10): rhythm, never a streak. The old helper counted
 * CONSECUTIVE days and the template headlined them as "unbroken
 * practice" — one quiet day broke the chain, which is exactly the
 * loss-framing Blueprint D bans. The summary now reports on how many
 * of the last 7 days japa flowered: a rhythm that can soften and
 * return, but never "breaks".
 */
function rhythmDays(japa: JapaRec[]): number {
  const days = new Set(
    japa.filter((j) => (j.count || 0) > 0 && typeof j.date === 'string').map((j) => j.date as string)
  );
  if (days.size === 0) return 0;
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  let n = 0;
  const cursor = new Date();
  for (let i = 0; i < 7; i++) {
    if (days.has(iso(cursor))) n += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}

export function sadhanaSummaryTask(ctx: TaskCtx): TaskOutcome {
  const personal = loadPersonal(ctx.uid);
  const japa = personal.japa ?? [];
  const today = todayISO();

  const japaToday = japa
    .filter((j) => j.date === today)
    .reduce((s, j) => s + (typeof j.count === 'number' ? j.count : 0), 0);
  const rhythm7 = rhythmDays(japa);
  const vrataCount = (personal.vrata ?? []).length;
  const sankalpaCount = (personal.sankalpa ?? []).length;

  if (japa.length === 0 && vrataCount === 0 && sankalpaCount === 0) {
    return { params: {}, variant: 'empty' };
  }
  return {
    params: { japaToday, rhythm7, vrataCount, sankalpaCount },
    variant: 'summary',
    suggestions: suggestionsFor('sadhana_summary', ctx.lang),
  };
}
