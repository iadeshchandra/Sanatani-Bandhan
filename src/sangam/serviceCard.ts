/* Seva Bazar — service_card validation + helpers.
 * =====================================================================
 * A service_card is a SEVA NOTICE, not an ad. These validators enforce
 * the editorial bar at the composer (client) AND are mirrored in
 * Firestore rules (server). Cheap signals are banned by construction:
 * no strikethroughs, countdowns, scarcity, caps actions, or "discount"
 * language. Dignity is the product.
 */

import type { SangamPost, ServiceCardDetails } from './types';
import { validateDemoVideoUrl } from './sevaBazarVideo';

export interface ServiceCardDraft {
  devotionalText: string;
  serviceLine: string;
  dakshina: string; // raw input; parsed to number
  currency: 'INR' | 'BDT' | 'USD';
  includes: string;
  modes: Array<'home' | 'temple' | 'video'>;
  availability: string;
  lineage: string;
  photoUrl: string;
  /** Optional YouTube URL for the provider's intro demo (Phase 3). */
  demoVideoUrl?: string;
}

/** Cheap-signal patterns — the language of ads, never of seva. */
const CHEAP_SIGNAL_PATTERNS: Array<{ re: RegExp; why: string }> = [
  { re: /discount|flat\s*\d+\s*%?\s*off|sale|deal\b/i, why: 'no "discount/deal" language — seva is never on sale' },
  { re: /only\s+\d+\s+(left|slot|seat)/i, why: 'no scarcity pressure ("only N left")' },
  { re: /hurry|act\s+now|limited\s+period|ending\s+soon/i, why: 'no urgency pressure' },
  { re: /\d+\s*(hr|hour|min)\s*left/i, why: 'no countdowns' },
  { re: /~~|̶/u, why: 'no strikethrough pricing' },
  { re: /!!!+/, why: 'no shouting (!!!)' },
];

export interface CardViolation {
  field: string;
  message: string;
}

/** Validate a service_card draft. Returns violations (empty = OK). */
export function validateServiceCard(draft: ServiceCardDraft): CardViolation[] {
  const out: CardViolation[] = [];
  const dev = draft.devotionalText.trim();
  const line = draft.serviceLine.trim();

  if (dev.length < 30) {
    out.push({
      field: 'devotionalText',
      message: 'Share a few heartfelt words first — at least 30 characters. The human before the offer. 🪔',
    });
  }
  if (!line) {
    out.push({ field: 'serviceLine', message: 'One clear service line — what is this seva?' });
  } else if (line.length > 140) {
    out.push({ field: 'serviceLine', message: 'Keep the service line to one line (140 characters).' });
  }
  const dakshina = Number(draft.dakshina);
  if (!Number.isFinite(dakshina) || dakshina <= 0) {
    out.push({ field: 'dakshina', message: 'A suggested dakshina keeps things honest — enter an amount above zero.' });
  } else if (dakshina > 1000000) {
    out.push({ field: 'dakshina', message: 'That amount looks unusual — please check the dakshina.' });
  }
  if (draft.modes.length === 0) {
    out.push({ field: 'modes', message: 'How is this seva offered — at home, at the temple, or over video?' });
  }
  // Demo video URL (Phase 3) — validated, never blocks the card.
  if (draft.demoVideoUrl && draft.demoVideoUrl.trim()) {
    const { error } = validateDemoVideoUrl(draft.demoVideoUrl);
    if (error) {
      out.push({ field: 'demoVideoUrl', message: error });
    }
  }
  // Cheap-signal scan across all free text.
  const freeText = `${dev}\n${line}\n${draft.includes}\n${draft.availability}`;
  for (const { re, why } of CHEAP_SIGNAL_PATTERNS) {
    if (re.test(freeText)) {
      out.push({ field: 'tone', message: `This reads like an ad, not a seva notice: ${why}.` });
      break;
    }
  }
  // Shouting: more than 30% caps in the service line.
  const letters = line.replace(/[^A-Za-z]/g, '');
  const caps = line.replace(/[^A-Z]/g, '');
  if (letters.length >= 10 && caps.length / letters.length > 0.3) {
    out.push({ field: 'serviceLine', message: 'Please write in sentence case — seva speaks softly. 🪔' });
  }
  return out;
}

/** Spam line: 1 service_card per 72h per provider (client-side check). */
export const SERVICE_CARD_COOLDOWN_MS = 72 * 60 * 60 * 1000;

export function lastServiceCardAt(posts: SangamPost[], providerUid: string): number | null {
  let latest: number | null = null;
  for (const p of posts) {
    if (p.kind !== 'service_card' || p.status === 'removed') continue;
    const uid = p.serviceCard?.providerUid || p.authorUid;
    if (uid !== providerUid) continue;
    if (latest === null || p.createdAt > latest) latest = p.createdAt;
  }
  return latest;
}

export function serviceCardCooldownRemainingMs(posts: SangamPost[], providerUid: string, now = Date.now()): number {
  const last = lastServiceCardAt(posts, providerUid);
  if (last === null) return 0;
  return Math.max(0, last + SERVICE_CARD_COOLDOWN_MS - now);
}

/** Warm cooldown message (EN/HI/BN). */
export function cooldownMessage(remainingMs: number, lang: 'en' | 'hi' | 'bn' = 'en'): string {
  const hours = Math.ceil(remainingMs / 3600000);
  const msgs = {
    en: `One seva notice every 3 days keeps the feed sacred. Yours blooms again in ~${hours}h. 🪔`,
    hi: `फ़ीड पवित्र रहे — हर 3 दिन में एक सेवा सूचना। आपकी अगली ~${hours} घंटे में। 🪔`,
    bn: `ফিড পবিত্র থাকুক — প্রতি ৩ দিনে একটি সেবা বিজ্ঞপ্তি। আপনার পরেরটি ~${hours} ঘণ্টা পর। 🪔`,
  };
  return msgs[lang];
}

/** Build the ServiceCardDetails from a validated draft + provider info. */
export function buildServiceCardDetails(
  draft: ServiceCardDraft,
  provider: {
    uid: string;
    name: string;
    tier: 'REGISTERED' | 'VERIFIED' | 'TRUSTED';
    roleId?: string;
    lineage?: string;
    yearsOfSeva?: number;
    blessingsReceived?: number;
    trustScore?: number;
  }
): ServiceCardDetails {
  const { videoId } = validateDemoVideoUrl(draft.demoVideoUrl || '');
  return {
    devotionalText: draft.devotionalText.trim(),
    serviceLine: draft.serviceLine.trim(),
    dakshina: Number(draft.dakshina),
    currency: draft.currency,
    includes: draft.includes.trim() || undefined,
    modes: [...draft.modes],
    availability: draft.availability.trim() || undefined,
    providerName: provider.name,
    lineage: draft.lineage.trim() || provider.lineage,
    providerTier: provider.tier,
    providerRoleId: provider.roleId,
    providerUid: provider.uid,
    yearsOfSeva: provider.yearsOfSeva,
    blessingsReceived: provider.blessingsReceived,
    trustScore: provider.trustScore,
    photoUrl: draft.photoUrl.trim() || undefined,
    demoVideoId: videoId || undefined,
  };
}

/** Warm pre-filled opener for the Ask → chat handoff. */
export function serviceCardAskOpener(
  card: ServiceCardDetails,
  lang: 'en' | 'hi' | 'bn' = 'en'
): string {
  const openers = {
    en: `🙏 Pranam ${card.providerName}ji! I saw your seva notice for "${card.serviceLine}" and would like to know more. 🪔`,
    hi: `🙏 प्रणाम ${card.providerName}जी! आपकी "${card.serviceLine}" सेवा सूचना देखी — और जानना चाहूँगा/चाहूँगी। 🪔`,
    bn: `🙏 প্রণাম ${card.providerName}জি! আপনার "${card.serviceLine}" সেবা বিজ্ঞপ্তি দেখলাম — আরও জানতে চাই। 🪔`,
  };
  return openers[lang];
}

/* Feed density — service cards are guests in the community feed.
 * =====================================================================
 * - ≤15% of visible posts may be service_cards. Ever. No paid placement.
 * - Service cards stay chronological among themselves.
 * - The first card per session carries the "🪔 From your community"
 *   framing so its nature is unmistakable.
 */

/** Max share of the feed that may be service cards. */
export const SERVICE_CARD_MAX_DENSITY = 0.15;

/**
 * Thin a chronological post list so service_cards never exceed 15%.
 * Keeps the most recent cards up to the cap, preserving chronological
 * order. Pure — safe to call on every render.
 */
export function applyServiceCardDensity<T extends { kind: string; createdAt: number }>(
  posts: T[]
): T[] {
  const total = posts.length;
  if (total === 0) return posts;
  const cards = posts.filter((p) => p.kind === 'service_card');
  const maxCards = Math.max(1, Math.floor(total * SERVICE_CARD_MAX_DENSITY));
  if (cards.length <= maxCards) return posts;
  // Keep the most recent `maxCards` cards; drop the older ones from view.
  const keepIds = new Set(
    [...cards].sort((a, b) => b.createdAt - a.createdAt).slice(0, maxCards).map((c) => (c as { id?: string }).id ?? c)
  );
  return posts.filter((p) => {
    if (p.kind !== 'service_card') return true;
    const id = (p as { id?: string }).id ?? p;
    return keepIds.has(id);
  });
}

/** Session framing: the first service card per session gets the community frame. */
export function isFirstServiceCardThisSession(
  postId: string,
  seenRef: { current: Set<string> }
): boolean {
  if (seenRef.current.has(postId)) return false;
  seenRef.current.add(postId);
  return true;
}
