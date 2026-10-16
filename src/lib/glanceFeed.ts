/**
 * glanceFeed.ts — Unified "what needs me" feed
 * ============================================================
 * Merges personal Suchana items with per-org glance cards into ONE
 * ranked, deduplicated stream for the Suchana tab.
 *
 * RANKING — urgency × relevance × recency:
 *   score = severityWeight + recencyBoost + intentBoost + orgBoost
 * - severityWeight: urgent 1000 / attention 100 / nudge 10 / info 1
 * - recencyBoost: dated items get up to +30 (sooner = higher)
 * - intentBoost: +50 when the item matches the user's intent profile
 * - orgBoost: +5 per org the item belongs to (joined orgs matter)
 *
 * RBAC is enforced BEFORE this layer (see orgGlance.glanceForRole) —
 * this file never sees items the role may not see.
 */

import type { SuchanaItem, SuchanaSeverity } from './suchanaFeed';
import type { GlanceSection } from './orgGlance';

export type GlanceAudience = 'personal' | 'steward' | 'member';

export interface GlanceItem extends SuchanaItem {
  audience: GlanceAudience;
  /** Org context — undefined for personal items. */
  orgId?: string;
  orgName?: string;
  /** Ranking score (higher = sooner in feed). */
  score: number;
}

export type IntentKey = 'practice' | 'join' | 'purohit' | 'manage' | 'unknown';

const SEVERITY_WEIGHT: Record<SuchanaSeverity, number> = {
  urgent: 1000,
  attention: 100,
  nudge: 10,
  info: 1,
};

/** Intent → actionRoute keywords that get a relevance boost. */
const INTENT_KEYWORDS: Record<Exclude<IntentKey, 'unknown'>, string[]> = {
  practice: ['panjika', 'sadhana', 'japa', 'vrata', 'sangam'],
  join: ['sangam', 'events', 'orgs', 'devotee'],
  purohit: ['marketplace', 'purohit', 'samskara', 'muhurat', 'jyotish'],
  manage: ['treasury', 'devotees', 'inventory', 'events', 'dashboard'],
};

function daysUntil(iso: string | null): number | null {
  try {
    if (!iso) return null;
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - now.getTime()) / 86400000);
  } catch {
    return null;
  }
}

function intentBoost(item: SuchanaItem, intent: IntentKey): number {
  if (intent === 'unknown') return 0;
  try {
    const kws = INTENT_KEYWORDS[intent] || [];
    const route = String(item.actionRoute || '').toLowerCase();
    const title = `${item.title.en} ${item.message.en}`.toLowerCase();
    return kws.some((k) => route.includes(k) || title.includes(k)) ? 50 : 0;
  } catch {
    return 0;
  }
}

export function scoreGlanceItem(item: SuchanaItem, intent: IntentKey = 'unknown'): number {
  const sev = SEVERITY_WEIGHT[item.severity] ?? 1;
  let recency = 0;
  const du = daysUntil(item.date);
  if (du !== null) recency = Math.max(0, 30 - Math.max(0, du));
  return sev + recency + intentBoost(item, intent);
}

/** Wrap a personal Suchana item as a glance item. */
export function personalToGlance(item: SuchanaItem, intent: IntentKey = 'unknown'): GlanceItem {
  return { ...item, audience: 'personal', score: scoreGlanceItem(item, intent) };
}

export interface OrgGlanceCardInput {
  orgId: string;
  orgName: string;
  orgType: string;
  /** The RBAC-filtered section for this viewer's role. */
  section: GlanceSection;
  audience: 'steward' | 'member';
}

/**
 * Turn an org glance section into feed cards. One card per section with
 * action items, one for info — never a card per raw count (calm feed).
 */
export function orgGlanceToCards(input: OrgGlanceCardInput): GlanceItem[] {
  const cards: GlanceItem[] = [];
  try {
    const { orgId, orgName, section, audience } = input;
    const base = {
      source: 'module' as const,
      roles: ['all'],
      actionRoute: `/app/org/${orgId}`,
    };
    if (section.actionCount > 0) {
      const item: SuchanaItem = {
        ...base,
        id: `glance:${orgId}:${audience}:action`,
        severity: audience === 'steward' ? 'attention' : 'nudge',
        title: {
          en: `${section.actionCount} thing${section.actionCount === 1 ? '' : 's'} need${section.actionCount === 1 ? 's' : ''} you at ${orgName}`,
          bn: `${orgName}-এ ${section.actionCount}টি বিষয়ে আপনার দৃষ্টি প্রয়োজন`,
          hi: `${orgName} में ${section.actionCount} विषयों पर आपका ध्यान चाहिए`,
        },
        message: {
          en:
            audience === 'steward'
              ? 'Approvals, dues or stock alerts waiting for your decision.'
              : 'Upcoming observances or community updates you may want to join.',
          bn: 'আপনার সিদ্ধান্তের অপেক্ষায় থাকা বিষয়গুলি দেখুন।',
          hi: 'आपके निर्णय की प्रतीक्षा कर रहे विषय देखें।',
        },
        actionLabel: { en: 'Open', bn: 'খুলুন', hi: 'खोलें' },
        date: section.soonestDate,
        dedupeKey: `glance:${orgId}:${audience}:action`,
      };
      cards.push({
        ...item,
        audience,
        orgId,
        orgName,
        score: scoreGlanceItem(item) + 5,
      });
    }
    if (section.infoCount > 0) {
      const item: SuchanaItem = {
        ...base,
        id: `glance:${orgId}:${audience}:info`,
        severity: 'info',
        title: {
          en: `${section.infoCount} update${section.infoCount === 1 ? '' : 's'} from ${orgName}`,
          bn: `${orgName} থেকে ${section.infoCount}টি আপডেট`,
          hi: `${orgName} से ${section.infoCount} अपडेट`,
        },
        message: {
          en: 'Community life continues — festivals, gatherings and announcements.',
          bn: 'সম্প্রদায়ের জীবন চলছে — উৎসব, সমাবেশ ও ঘোষণা।',
          hi: 'सामुदायिक जीवन चल रहा है — उत्सव, समागम व घोषणाएँ।',
        },
        actionLabel: { en: 'View', bn: 'দেখুন', hi: 'देखें' },
        date: null,
        dedupeKey: `glance:${orgId}:${audience}:info`,
      };
      cards.push({
        ...item,
        audience,
        orgId,
        orgName,
        score: scoreGlanceItem(item) + 5,
      });
    }
  } catch {
    /* fail-open */
  }
  return cards;
}

/**
 * Merge personal + org cards into the final ranked feed.
 * Dedupe by dedupeKey (first = highest score wins). Cap 40.
 */
export function mergeGlanceFeed(
  personal: GlanceItem[],
  orgCards: GlanceItem[],
  cap = 40
): GlanceItem[] {
  try {
    const all = [...(personal || []), ...(orgCards || [])];
    all.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.id).localeCompare(String(b.id));
    });
    const seen = new Set<string>();
    const out: GlanceItem[] = [];
    for (const it of all) {
      if (!it || seen.has(it.dedupeKey)) continue;
      seen.add(it.dedupeKey);
      out.push(it);
      if (out.length >= cap) break;
    }
    return out;
  } catch {
    return [];
  }
}

/** Filter chips: 'all' or one orgId. Pure. */
export function filterGlanceByOrg(items: GlanceItem[], orgId: string): GlanceItem[] {
  try {
    if (!orgId || orgId === 'all') return items || [];
    return (items || []).filter((it) => !it.orgId || it.orgId === orgId);
  } catch {
    return [];
  }
}
