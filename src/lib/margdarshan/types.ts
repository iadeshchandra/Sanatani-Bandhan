/**
 * margdarshan/types.ts — the DeskPage model (Margdarshan J0).
 * =====================================================================
 * Margdarshan (मार्गदर्शन — "showing the way") is the app's Help,
 * Manual & Community centre (blueprint:
 * workspace/your_files/jigyasa/JIGYASA-STRUCTURE.md). Its manual does
 * NOT keep a second copy of the truth: one DeskPage per desk/topic is
 * DERIVED from the knowledge layer the app already owns —
 *
 *   - the Copilot locator map   (src/ai/locator.ts, LOCATOR_MAP)
 *   - the module guide library  (src/lib/moduleGuides.ts, MODULE_GUIDES)
 *   - the desk directory model  (src/lib/deskDirectory.ts — the atlas
 *     grouping by the locator/catalog's 7 domains)
 *
 * A DeskPage therefore stores REFERENCES into those sources (ids,
 * domain, the locator's role-phrase key), never copied prose. Display
 * text is produced at read time by resolveDeskPage() in deskPages.ts,
 * through the same overlay machinery the Copilot uses — so fixing a
 * guide step fixes the Copilot, the manual and the tours together.
 *
 * J0 scope: the model + inventory only. No routes are mounted and no
 * UI consumes this yet (J1). The two manual-only fields the blueprint
 * adds per page (real-life example, common mistakes) exist in the
 * type but are ABSENT in J0 — J1 authors them; nothing here invents
 * content to fill them.
 */

export type DeskPageKind =
  /** A MODULE_CATALOG desk (locator kind 'desk'). */
  | 'desk'
  /** A feature nested inside a desk (Bahi-Khata inside Treasury…). */
  | 'nested'
  /** A Solo-shell surface (locator kind 'solo'). */
  | 'solo'
  /** A public surface (locator kind 'public'). */
  | 'public'
  /**
   * A knowledge topic that exists only as a module guide — the guide
   * library's Solo/platform topics (wallet, P2P safety, chat…) that
   * have no locator entry. Derived so every guide attaches to exactly
   * one page.
   */
  | 'topic';

export interface DeskPage {
  /** Stable page id — identical to the slug in J0. */
  id: string;
  /** Route segment for /margdarshan/manual/<slug> (mounted in J1). */
  slug: string;
  kind: DeskPageKind;
  /** Source locator entry id ('loc.treasury'); absent on topic pages. */
  locatorEntryId?: string;
  /**
   * Catalog desk id. Desk pages carry their own; nested pages carry
   * their PARENT desk's id (the locator's deskId semantics).
   */
  deskId?: string;
  /** Nested pages only: the slug of the parent desk's page. */
  parentSlug?: string;
  /** Sidebar domain number (1–7) when the sources carry one. */
  domain?: number;
  /**
   * English domain title, DERIVED from the locator's own generated
   * place fragments (which embed the catalog's domain titles) — never
   * hand-copied. Draft-language titles resolve at read time through
   * the locator catalogue overlays (locatorCatalogOverlay.domains).
   */
  domainTitle?: string;
  /**
   * The locator's shared "used by" role-phrase key (fin / finops /
   * gov / mgr / ritual / sec / staff / edu / care / aud / counter) —
   * the role-door signal the sources carry, resolved by identity via
   * usedByKeyOf(). Absent when the entry's phrase is not one of the
   * shared eleven.
   */
  usedByKey?: string;
  /** Real app route (solo/public locator entries only). */
  route?: string;
  /** The module guide attached to this page, when one exists. */
  guideId?: string;
  /**
   * Related pages (slugs), derived from the attached guide's
   * relatedModules where those ids resolve to pages. May be empty.
   */
  relatedSlugs: string[];
  /**
   * J1-authored manual field (blueprint §4.2): a two-line real-life
   * example. ABSENT in J0 — never fabricated.
   */
  realLifeExample?: string;
  /**
   * J1-authored manual field (blueprint §4.5): honest warnings.
   * ABSENT in J0 — never fabricated.
   */
  commonMistakes?: string[];
}

/**
 * A DeskPage's display content in one language, produced by
 * resolveDeskPage() through the existing overlay machinery. Fields
 * are absent (never empty-string fakes) when the underlying source
 * does not carry them.
 */
export interface ResolvedDeskPage {
  /** Locator name (or the guide's name on topic pages). */
  name: string;
  /** "Where it lives" fragment — locator pages only. */
  place?: string;
  /** "Who uses it" phrase — locator pages only. */
  usedBy?: string;
  /** Guide tagline, when a guide is attached. */
  tagline?: string;
  /** Guide "what it is" — the page's one-line purpose. */
  purpose?: string;
  /** Guide "why it matters". */
  whyItMatters?: string;
  /** Guide first steps, in order. Empty when no guide is attached. */
  steps: string[];
  /** Guide pro tips. Empty when no guide is attached. */
  proTips: string[];
}
