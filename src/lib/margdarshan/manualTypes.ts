/**
 * margdarshan/manualTypes.ts — the J1 manual-content model.
 * =====================================================================
 * J0 derived the DeskPage inventory (deskPages.ts) from the knowledge
 * layer. J1 adds the MANUAL layer on top: the fields the blueprint's
 * desk-page anatomy (§4) needs that the guides do not carry —
 * a real-life example, honest common mistakes, capability lines and
 * an offline statement — plus, for pages with no guide, the "what it
 * does" line and the how-to steps themselves.
 *
 * The no-duplication law (blueprint §3.2): a page that HAS a guide
 * (attached in J0, or joined in J1 via joins.ts) takes its what-it-is
 * and its steps from that guide at resolve time. Its ManualEntry
 * therefore carries ONLY the manual-only fields — authoring a second
 * copy of the guide's prose here would fork the truth. The J1 tests
 * pin this: guide-backed entries must not define whatItDoes/steps;
 * guide-less entries must define both.
 *
 * All prose is Lang3 (en/hi/bn authored, the house pattern of
 * moduleGuides.ts). Draft languages resolve through the same l3
 * clamp the guides use (English shows, with an honest on-page note —
 * never a silent swap dressed as a translation).
 */

import type { Lang3 } from '../moduleGuides';

export interface ManualEntry {
  /**
   * What the desk does, in one or two plain lines. REQUIRED on
   * guide-less pages; FORBIDDEN on guide-backed pages (the guide's
   * whatItIs serves — resolveManualPage enforces the precedence).
   */
  whatItDoes?: Lang3;
  /**
   * Blueprint §4.2 — "In real life": a two-line concrete example.
   * The twin test readers (standing framing law): a small trust
   * with no staff, and a devotee family. REQUIRED on every page.
   */
  realLifeExample: Lang3;
  /**
   * How-to steps, 3–4, task-level and followable with the phone in
   * one hand. REQUIRED on guide-less pages; FORBIDDEN on
   * guide-backed pages (the guide's firstSteps serve).
   */
  steps?: Lang3[];
  /**
   * Blueprint §4.5 — "Good to know / common mistakes": 2–3 honest
   * warnings. Advice, never invented system behaviour. REQUIRED.
   */
  commonMistakes: Lang3[];
  /**
   * What you can do at this desk — 2–4 short capability lines.
   * REQUIRED on every page.
   */
  capabilities: Lang3[];
  /**
   * Offline honesty: true when the desk's core work happens on the
   * device and syncs when the network returns (the app's standing
   * offline-first design). false only where the essence is live
   * data (live maps, sending a broadcast) — the page then says so
   * plainly instead of pretending.
   */
  worksOffline: boolean;
}

/** A ManualEntry fully resolved into one language for rendering. */
export interface ResolvedManualPage {
  slug: string;
  kind: string;
  /** Domain number (1–7) when the page belongs to one. */
  domain?: number;
  /** Localised domain title when resolvable. */
  domainTitle?: string;
  /** Display name (locator name, or guide name on topic pages). */
  name: string;
  /** "Where it lives" fragment — locator pages only. */
  place?: string;
  /** "Who uses it" phrase — locator pages only. */
  usedBy?: string;
  /** Guide tagline, when a guide backs this page. */
  tagline?: string;
  /** What it does (manual entry, else the guide's what-it-is). */
  whatItDoes: string;
  /** Why it matters (guide-backed pages only). */
  whyItMatters?: string;
  /** The real-life example (manual layer, every page). */
  realLifeExample: string;
  /** Steps (manual entry, else the guide's first steps). */
  steps: string[];
  /** Guide pro tips, when a guide backs this page. */
  proTips: string[];
  /** Common mistakes (manual layer, every page). */
  commonMistakes: string[];
  /** Capability lines (manual layer, every page). */
  capabilities: string[];
  worksOffline: boolean;
  /** True when a module guide backs this page (J0 attach or J1 join). */
  guideBacked: boolean;
  /** Catalog desk id for the role door, when the page has one. */
  deskId?: string;
  /** Parent desk page slug (nested pages). */
  parentSlug?: string;
  /** Real app route (solo/public pages). */
  route?: string;
  /** Related page slugs. */
  relatedSlugs: string[];
}
