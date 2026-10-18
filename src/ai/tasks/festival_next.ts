/**
 * TASK: festival_next
 * =====================================================================
 * DATA SOURCE: PANJIKA_FESTIVALS (src/lib/panjikaFestivals.ts — curated,
 * confidence-graded festival data 2026–2028) and findEkadashis()
 * (src/lib/vrataSchedule.ts — Drik-computed Ekadashi observances).
 * OFFLINE STORY: fully offline — bundled data + on-device computation.
 * Where traditional schools diverge, the underlying data carries altDate
 * / schoolNote; the executor surfaces the primary date honestly.
 */
import { upcomingFestivals } from '../../lib/panjikaFestivals';
import { findEkadashis } from '../../lib/vrataSchedule';
import { suggestionsFor } from '../templates';
import type { TaskCtx, TaskOutcome } from '../types';

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function festName(f: { nameEn: string; nameBn: string; nameHi?: string }, lang: string): string {
  const l = (lang || 'en').toLowerCase();
  if (l === 'bn') return f.nameBn || f.nameEn;
  if (l === 'hi') return f.nameHi || f.nameEn;
  return f.nameEn;
}

export function festivalNextTask(ctx: TaskCtx): TaskOutcome {
  const iso = todayISO();

  // "When is Ekadashi?" — Drik-computed, 60-day window.
  if (ctx.slots['festivalQuery'] === 'ekadashi') {
    const now = new Date();
    const days = findEkadashis(now, new Date(now.getTime() + 60 * 86400000));
    const next = days[0];
    if (next) {
      const lang = (ctx.lang || 'en').toLowerCase();
      const name = lang === 'bn' ? next.nameBn || next.name : next.name;
      return {
        params: { date: next.smartaIso || next.iso, name },
        variant: 'ekadashi',
        suggestions: suggestionsFor('festival_next', ctx.lang),
      };
    }
  }

  const upcoming = upcomingFestivals(iso, 5);
  if (upcoming.length === 0) {
    return { params: {}, variant: 'none' };
  }
  const list = upcoming
    .map((f) => `• ${f.date} — ${festName(f, ctx.lang)}`)
    .join('\n');
  return {
    params: { list },
    variant: 'list',
    suggestions: suggestionsFor('festival_next', ctx.lang),
  };
}
