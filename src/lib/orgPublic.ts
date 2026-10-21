/**
 * Sanatani Bandhan — Public org profile library (Pillar 3)
 *
 * The public/private boundary for the inbound funnel (public org pages).
 *
 * ARCHITECTURE — the public projection layer:
 *   - `workspaces/{orgId}` is the PRIVATE org doc (trustee/member read only).
 *     Treasury, member lists, bank details, pins NEVER leave this doc.
 *   - `orgPages/{orgId}` is the PUBLIC projection. Firestore rules grant
 *     `allow read: if true` and gate writes to trustees with a server-side
 *     `hasOnly(ORG_PUBLIC_FIELDS)` whitelist (see firestore.rules).
 *
 * The public page reads ONLY from `orgPages/{orgId}` (plus public Storage
 * URLs for logos/gallery). It must NEVER read `workspaces/{orgId}`.
 */
import type { OrgPage } from '../types/membership';

/* ------------------------------------------------------------------ */
/* Public field model                                                  */
/* ------------------------------------------------------------------ */

/** One darshan/aarti timing row, as the trustee wrote it. */
export interface PublicTiming {
  label: string;
  time: string;
}

/** One upcoming public event. Max 10 kept per org (client + rules). */
export interface PublicEventItem {
  title: string;
  /** ISO date (YYYY-MM-DD) or free text like "Every Purnima". */
  date: string;
  time?: string;
  description?: string;
}

export const MAX_GALLERY_IMAGES = 5;
export const MAX_PUBLIC_EVENTS = 10;

/**
 * Canonical whitelist of fields allowed on the public `orgPages` doc.
 * MUST stay in sync with the `hasOnly([...])` list in firestore.rules
 * (`match /orgPages/{orgId}`). Anything not on this list is private by
 * construction — trustees cannot publish it even by accident.
 */
export const ORG_PUBLIC_FIELDS = [
  'orgId',
  'name',
  'type',
  'city',
  'state',
  'country',
  'about',
  'tagline',
  'logoUrl',
  'coverUrl',
  'publicSlug',
  'addressLine',
  'pincode',
  'phone',
  'website',
  'darshanTimings',
  'galleryUrls',
  'upcomingEvents',
  'autoShareEvents',
  'registrationNo',
  'eightyGRegistered',
  'eightyGURN',
  'twelveARegistered',
  'verified',
  'updatedAt',
] as const;
// NOTE: `followerCount` / `memberCount` on the OrgPage type are live-computed
// view-model fields (getCountFromServer) and are never persisted to orgPages,
// so they are intentionally NOT in this whitelist.

/** True when the org has opted into a public page with shareable content. */
export function hasPublicPresence(page: OrgPage | null | undefined): boolean {
  if (!page) return false;
  return Boolean(
    page.tagline ||
      page.about ||
      page.addressLine ||
      page.phone ||
      page.website ||
      page.publicSlug ||
      (page.galleryUrls && page.galleryUrls.length > 0) ||
      (page.darshanTimings && page.darshanTimings.length > 0) ||
      (page.upcomingEvents && page.upcomingEvents.length > 0)
  );
}

/* ------------------------------------------------------------------ */
/* Slug                                                                */
/* ------------------------------------------------------------------ */

/**
 * Turn an org name into a URL-safe slug: lowercase, transliteration-safe
 * (keeps latin chars + digits; strips the rest), dashes between words.
 * Devanagari/Bengali names fall back to `org-{shortId}` at call sites.
 */
export function normalizePublicSlug(input: string): string {
  const slug = (input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .slice(0, 60);
  return slug;
}

/** Canonical public path for an org — slug when set, else the raw id. */
export function orgPublicPath(page: { orgId: string; publicSlug?: string }): string {
  return `/org/${page.publicSlug || page.orgId}`;
}

/**
 * The slug a settings/profile form may show for an org (QUEUED #51, D9c):
 *   - `value`     — ONLY the slug the org itself saved (normalized). EMPTY
 *                   until the org sets one. Never a hard-coded temple name,
 *                   never silently borrowed from another organisation.
 *   - `suggested` — the org's OWN name slugified, offered as a placeholder /
 *                   one-tap suggestion. Derived, never prefilled as fact.
 */
export function resolvePublicSlugDefault(input: {
  name?: string | null;
  publicSlug?: string | null;
}): { value: string; suggested: string } {
  return {
    value: normalizePublicSlug(input.publicSlug || ''),
    suggested: normalizePublicSlug(input.name || ''),
  };
}

/* ------------------------------------------------------------------ */
/* Presentation helpers                                                */
/* ------------------------------------------------------------------ */

/** "Street, City, State PINCODE, Country" — only the parts that exist. */
export function formatAddressLine(page: {
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}): string {
  const cityState = [page.city, page.state].filter(Boolean).join(', ');
  const tail = [page.pincode, page.country].filter(Boolean).join(', ');
  return [page.addressLine, cityState, tail].filter(Boolean).join(', ');
}

/** Google Maps search link for the address (no API key needed). */
export function mapsSearchUrl(address: string, name?: string): string {
  const q = encodeURIComponent(address || name || '');
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/** Absolute URL for the current origin + path (for share links). */
export function absoluteUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}

/** wa.me share link — this is how temples spread in Bharat. */
export function whatsappShareUrl(pageUrl: string, orgName: string): string {
  const text = encodeURIComponent(`🙏 ${orgName}\n${pageUrl}`);
  return `https://wa.me/?text=${text}`;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Document head (manual — the app has no react-helmet)                */
/*                                                                     */
/* NOTE (honest caveat): these tags help JS-capable crawlers (Google), */
/* in-app share sheets and browser tabs. WhatsApp/Facebook unfurlers   */
/* do NOT execute JavaScript, so link previews there will only render   */
/* rich cards once a server-rendered (or pre-rendered) head exists —   */
/* a follow-up for the owner (Cloud Function / Hosting pre-render).    */
/* ------------------------------------------------------------------ */

export interface PageMeta {
  title: string;
  description: string;
  image?: string;
  url: string;
}

const DEFAULT_META: PageMeta = {
  title: 'Sanatani Bandhan | Dharmic Institution Management Platform',
  description:
    'Sanatani Bandhan — the digital home of Sanatana Dharma institutions. Find temples, follow their journey, and stay connected.',
  url: typeof window !== 'undefined' ? window.location.origin : '',
};

let headTouched: string[] = [];

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
    headTouched.push(`${attr}:${key}`);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
    headTouched.push(`link:${rel}`);
  }
  el.setAttribute('href', href);
}

/** Set title + description + Open Graph tags for the public org page. */
export function applyPageMeta(meta: PageMeta): void {
  document.title = meta.title;
  upsertMeta('name', 'description', meta.description);
  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:site_name', 'Sanatani Bandhan');
  upsertMeta('property', 'og:title', meta.title);
  upsertMeta('property', 'og:description', meta.description);
  upsertMeta('property', 'og:url', meta.url);
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', meta.title);
  upsertMeta('name', 'twitter:description', meta.description);
  if (meta.image) {
    upsertMeta('property', 'og:image', meta.image);
    upsertMeta('name', 'twitter:image', meta.image);
  }
  upsertLink('canonical', meta.url);
}

/** Restore the app's default head after leaving a public org page. */
export function resetPageMeta(): void {
  document.title = DEFAULT_META.title;
  upsertMeta('name', 'description', DEFAULT_META.description);
  upsertMeta('property', 'og:title', DEFAULT_META.title);
  upsertMeta('property', 'og:description', DEFAULT_META.description);
  upsertMeta('property', 'og:url', DEFAULT_META.url);
  for (const key of ['og:image', 'twitter:image']) {
    document.head
      .querySelector(`meta[property="${key}"], meta[name="${key}"]`)
      ?.remove();
  }
  document.head.querySelector('link[rel="canonical"]')?.remove();
  headTouched = [];
}

/** Build the meta for an org page: name first, tagline/about as description. */
export function orgPageMeta(page: OrgPage): PageMeta {
  const path = orgPublicPath(page);
  const description = (
    page.tagline ||
    page.about ||
    `Visit ${page.name} — find darshan timings, upcoming events and contact details.`
  ).slice(0, 200);
  return {
    title: `${page.name} · Sanatani Bandhan`,
    description,
    image: page.logoUrl || undefined,
    url: absoluteUrl(path),
  };
}
