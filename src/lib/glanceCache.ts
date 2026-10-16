/**
 * glanceCache.ts — Offline mirror of the glance feed
 * ===================================================
 * The Suchana tab must work with zero internet (standing promise).
 * We cache the last successfully built feed per user in localStorage
 * (the established offline pattern in this codebase — see soloSession).
 * The UI shows an "Updated X ago" badge when serving cached data.
 */
import type { GlanceItem } from './glanceFeed';

const KEY = (uid: string) => `sb_glance_feed_${uid}`;

export interface GlanceCache {
  items: GlanceItem[];
  updatedAt: number;
}

export function readGlanceCache(uid: string): GlanceCache | null {
  try {
    if (!uid || uid === 'anon') return null;
    const raw = localStorage.getItem(KEY(uid));
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || !Array.isArray(p.items)) return null;
    return p as GlanceCache;
  } catch {
    return null;
  }
}

export function writeGlanceCache(uid: string, items: GlanceItem[]): void {
  try {
    if (!uid || uid === 'anon') return;
    localStorage.setItem(KEY(uid), JSON.stringify({ items, updatedAt: Date.now() }));
  } catch {
    /* quota — non-fatal */
  }
}

/** Human "updated X ago" label — en/bn/hi. */
export function cacheAgeText(
  updatedAt: number,
  lang: 'en' | 'bn' | 'hi' = 'en'
): string {
  try {
    const mins = Math.max(0, Math.round((Date.now() - updatedAt) / 60000));
    if (lang === 'bn') {
      if (mins < 1) return 'এইমাত্র হালনাগাদ';
      if (mins < 60) return `${mins} মিনিট আগে হালনাগাদ`;
      const h = Math.round(mins / 60);
      return `${h} ঘণ্টা আগে হালনাগাদ`;
    }
    if (lang === 'hi') {
      if (mins < 1) return 'अभी अपडेट हुआ';
      if (mins < 60) return `${mins} मिनट पहले अपडेट`;
      const h = Math.round(mins / 60);
      return `${h} घंटे पहले अपडेट`;
    }
    if (mins < 1) return 'Updated just now';
    if (mins < 60) return `Updated ${mins} min ago`;
    const h = Math.round(mins / 60);
    return `Updated ${h}h ago`;
  } catch {
    return '';
  }
}
