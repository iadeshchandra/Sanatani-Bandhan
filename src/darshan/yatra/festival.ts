/**
 * darshan/yatra/festival.ts — festival-aware yatra headers.
 * ============================================================================
 * Reads PANJIKA_FESTIVALS directly (lib layer — no sangam import, no cycle).
 * During major festivals the yatra gets a warm festival header:
 * "🪔 Diwali Darshan Yatra — 8 temples live".
 */
import { PANJIKA_FESTIVALS, type PanjikaFestival } from '../../lib/panjikaFestivals';
import type { YatraLang } from './types';

const WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // ±3 days

/** Festivals that trigger yatra festival mode. */
export const YATRA_FESTIVALS = new Set([
  'diwali',
  'navaratri',
  'maha-shivaratri',
  'durga-puja',
  'janmashtami',
  'holi',
  'rath-yatra',
  'ganesh-chaturthi',
  'kali-puja',
]);

function slugOf(f: PanjikaFestival): string {
  return f.nameEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Festivals in window right now. Pure. */
export function activeYatraFestivals(
  now: number = Date.now(),
  festivals: PanjikaFestival[] = PANJIKA_FESTIVALS,
): PanjikaFestival[] {
  const out: PanjikaFestival[] = [];
  for (const f of festivals) {
    if (!YATRA_FESTIVALS.has(slugOf(f))) continue;
    const t = new Date(f.date + 'T00:00:00').getTime();
    if (Number.isNaN(t)) continue;
    if (now >= t - WINDOW_MS && now <= t + WINDOW_MS) out.push(f);
  }
  return out;
}

/** Warm festival yatra header. Pure. */
export function festivalYatraHeader(
  festival: PanjikaFestival,
  liveCount: number,
  lang: YatraLang,
): string {
  const name =
    lang === 'hi' ? festival.nameHi || festival.nameEn
    : lang === 'bn' ? festival.nameBn || festival.nameEn
    : festival.nameEn;
  const temples =
    lang === 'hi' ? `${liveCount} मंदिर लाइव`
    : lang === 'bn' ? `${liveCount}টি মন্দির লাইভ`
    : `${liveCount} temple${liveCount === 1 ? '' : 's'} live`;
  if (lang === 'hi') return `🪔 ${name} दर्शन यात्रा — ${temples} 🙏`;
  if (lang === 'bn') return `🪔 ${name} দর্শন যাত্রা — ${temples} 🙏`;
  return `🪔 ${name} Darshan Yatra — ${temples} 🙏`;
}
