/**
 * sangam/stories/types.ts — Sangam Stories data model.
 * ============================================================================
 * 24-hour disappearing posts. "🪔 Today's moments" — not "Stories".
 * Ephemeral by design: no archive, no permanence. Truly gone after 24h.
 */

export type StoryMediaType = 'photo' | 'text';

/** Warm background options for text stories. */
export const STORY_BACKGROUNDS = [
  { id: 'saffron', en: 'Saffron', css: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)' },
  { id: 'maroon', en: 'Deep Maroon', css: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)' },
  { id: 'forest', en: 'Forest', css: 'linear-gradient(135deg, #14532d 0%, #166534 100%)' },
  { id: 'ocean', en: 'Ocean', css: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)' },
  { id: 'stone', en: 'Warm Stone', css: 'linear-gradient(135deg, #57534e 0%, #78716c 100%)' },
] as const;

export type StoryBackgroundId = (typeof STORY_BACKGROUNDS)[number]['id'];

export interface Story {
  id: string;
  authorUid: string;
  authorName: string;
  authorAvatar?: string;
  authorSanId?: string;
  mediaType: StoryMediaType;
  /** File Vault reference (vault://...) for photo stories. */
  mediaUrl?: string;
  /** Text content for text stories (max 120 chars). */
  text?: string;
  /** Background id for text stories. */
  backgroundId?: StoryBackgroundId;
  /** Optional caption for photo stories (max 80 chars). */
  caption?: string;
  createdAt: number;
  expiresAt: number;
  reportCount: number;
}

export const STORY_TTL_MS = 24 * 60 * 60 * 1000;
export const STORY_TEXT_MAX = 120;
export const STORY_CAPTION_MAX = 80;

/** A story is live if it has not yet expired. Pure — testable. */
export function isStoryLive(story: Pick<Story, 'expiresAt'>, now: number = Date.now()): boolean {
  return story.expiresAt > now;
}

/** Milliseconds until expiry. Negative if expired. Pure. */
export function msUntilExpiry(story: Pick<Story, 'expiresAt'>, now: number = Date.now()): number {
  return story.expiresAt - now;
}

/** Group stories by author, newest story first within each group. Pure. */
export function groupStoriesByAuthor(stories: Story[], now: number = Date.now()): Array<{ authorUid: string; authorName: string; authorAvatar?: string; authorSanId?: string; stories: Story[] }> {
  const map = new Map<string, { authorUid: string; authorName: string; authorAvatar?: string; authorSanId?: string; stories: Story[] }>();
  const live = stories.filter((s) => isStoryLive(s, now)).sort((a, b) => b.createdAt - a.createdAt);
  for (const s of live) {
    let g = map.get(s.authorUid);
    if (!g) {
      g = { authorUid: s.authorUid, authorName: s.authorName, authorAvatar: s.authorAvatar, authorSanId: s.authorSanId, stories: [] };
      map.set(s.authorUid, g);
    }
    g.stories.push(s);
  }
  // Sort groups by their newest story.
  return [...map.values()].sort((a, b) => b.stories[0].createdAt - a.stories[0].createdAt);
}

/**
 * Newest-first ordering for live stories (expiresAt desc, then createdAt
 * desc). Pure.
 * AUDIT FIX (Domain 3): the stories query used to be
 * `where(expiresAt > now) + orderBy(expiresAt desc) + orderBy(createdAt desc)`,
 * which needs a composite index that a fresh project may not have — the
 * failure is silent (the subscription error handler returns []), so the
 * stories rail rendered empty. The query now uses a single orderBy and this
 * helper applies the secondary sort client-side on the bounded window.
 */
export function sortStoriesNewest(stories: Story[]): Story[] {
  return [...stories].sort((a, b) => b.expiresAt - a.expiresAt || b.createdAt - a.createdAt);
}

export interface NewStoryInput {
  authorUid: string;
  authorName: string;
  authorAvatar?: string;
  authorSanId?: string;
  mediaType: StoryMediaType;
  mediaUrl?: string;
  text?: string;
  backgroundId?: StoryBackgroundId;
  caption?: string;
}

/** Validate a new story before writing. Returns error key or null. Pure. */
export function validateStory(input: NewStoryInput): string | null {
  if (!input.authorUid || !input.authorName.trim()) return 'author';
  if (input.mediaType === 'photo') {
    if (!input.mediaUrl || !input.mediaUrl.trim()) return 'photo';
    if (input.caption && input.caption.length > STORY_CAPTION_MAX) return 'caption';
  } else {
    const t = (input.text || '').trim();
    if (!t) return 'text';
    if (t.length > STORY_TEXT_MAX) return 'text';
    if (!STORY_BACKGROUNDS.some((b) => b.id === input.backgroundId)) return 'background';
  }
  return null;
}

/** Build the Firestore document for a new story. Pure. */
export function storyDoc(input: NewStoryInput, now: number = Date.now()): Record<string, unknown> {
  const clean: Record<string, unknown> = {
    authorUid: input.authorUid,
    authorName: input.authorName.trim().slice(0, 60),
    mediaType: input.mediaType,
    createdAt: now,
    expiresAt: now + STORY_TTL_MS,
    reportCount: 0,
  };
  if (input.authorAvatar) clean.authorAvatar = input.authorAvatar.slice(0, 500);
  if (input.authorSanId) clean.authorSanId = input.authorSanId.slice(0, 12);
  if (input.mediaType === 'photo') {
    clean.mediaUrl = (input.mediaUrl || '').slice(0, 500);
    if (input.caption && input.caption.trim()) clean.caption = input.caption.trim().slice(0, STORY_CAPTION_MAX);
  } else {
    clean.text = (input.text || '').trim().slice(0, STORY_TEXT_MAX);
    clean.backgroundId = input.backgroundId;
  }
  return clean;
}

/** Sanitize a raw Firestore doc into a Story. Pure. */
export function toStory(id: string, data: Record<string, unknown>): Story {
  const bg = String(data.backgroundId || 'saffron');
  return {
    id,
    authorUid: String(data.authorUid || ''),
    authorName: String(data.authorName || 'Sanatani'),
    authorAvatar: (data.authorAvatar as string) || undefined,
    authorSanId: (data.authorSanId as string) || undefined,
    mediaType: data.mediaType === 'text' ? 'text' : 'photo',
    mediaUrl: (data.mediaUrl as string) || undefined,
    text: (data.text as string) || undefined,
    backgroundId: (STORY_BACKGROUNDS.some((b) => b.id === bg) ? bg : 'saffron') as StoryBackgroundId,
    caption: (data.caption as string) || undefined,
    createdAt: Number(data.createdAt || 0),
    expiresAt: Number(data.expiresAt || 0),
    reportCount: Number(data.reportCount || 0),
  };
}

export function backgroundCss(id?: StoryBackgroundId): string {
  return STORY_BACKGROUNDS.find((b) => b.id === id)?.css || STORY_BACKGROUNDS[0].css;
}

/** Human "time ago" for story headers. Pure. */
export function storyAge(createdAt: number, now: number = Date.now()): string {
  const m = Math.floor((now - createdAt) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
