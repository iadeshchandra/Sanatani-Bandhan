/**
 * appgrowth — App Growth program shared type contract.
 * ====================================================
 * QR-driven app download system: smart link (/get-app) + landing page.
 *
 * Firestore collections (deny-by-default rules are owned by the Admin
 * builder — this module only reads/writes through these shapes):
 * - appGrowth/config              (single doc)
 * - appGrowthCampaigns/{campaignId}
 * - appGrowthScans/{scanId}        (anonymous, client-writable, tight validation)
 * - appGrowthInstalls/{installId}  (written on first app open)
 * - appGrowthWaitlist/{id}         ("Notify me" capture)
 */

/** Platform buckets used across detection, logging and UI branching. */
export type GrowthPlatform = 'android' | 'ios' | 'desktop' | 'unknown';

/**
 * Single doc at appGrowth/config. Fail-open defaults live in growthService.
 *
 * @deprecated Phase 5: the landing + admin converge on the config shape in
 * `useAppGrowthConfig.ts` (which also carries the `content` override).
 * This shape is kept only for growthService's deprecated getGrowthConfig.
 */
export interface AppGrowthConfig {
  /** Google Play listing URL (empty until the app is published). */
  playStoreUrl: string;
  /** True only when the Play listing is live and installable. */
  playStoreLive: boolean;
  /** iOS has no store app — always 'pwa' for now. */
  iosMode: 'pwa';
  /** Reserved for a future App Store listing. */
  appStoreUrl: string;
  /** When true, the PWA is the primary path (store badges hidden without a URL). */
  pwaFallbackEnabled: boolean;
  /** Last update timestamp (ms). Null when the doc has never been written. */
  updatedAt: number | null;
}

/** Campaign doc at appGrowthCampaigns/{campaignId}, e.g. ?c=dhakeshwari2026 */
export interface AppGrowthCampaign {
  id: string;
  label: string;
  /** Human temple/org name used for page personalization. */
  templeName?: string;
  /**
   * Optional deferred deep-link target (e.g. '/festival/dhakeshwari/diwali-2026').
   * Set by the GodMode campaign manager; the boot path routes there after
   * onboarding. Absent campaigns simply show the generic landing.
   */
  deepLink?: string;
  active: boolean;
  createdAt: number;
}

/** Anonymous scan log — NO PII. Written once per /get-app page load. */
export interface AppGrowthScan {
  campaignId: string | null;
  platform: GrowthPlatform;
  /** Client timestamp; server-side rules should prefer request.time. */
  ts: number;
}

/** Install log — written ONCE on first app open (wired by the app boot code). */
export interface AppGrowthInstall {
  campaignId?: string;
  platform: GrowthPlatform;
  ts: number;
}

/** "Notify me" capture for the pre-launch Play Store state. */
export interface AppGrowthWaitlistEntry {
  platform: GrowthPlatform;
  ts: number;
}

/** Outcome of the native-app deep-link probe. */
export interface DeepLinkAttempt {
  /** True when the native app claimed the URL (page should stay hidden). */
  claimed: boolean;
}
