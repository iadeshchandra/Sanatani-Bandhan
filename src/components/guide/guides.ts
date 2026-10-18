/**
 * guide/guides.ts — the app-wide Quick Guide registry.
 * =====================================================
 * One definition per major feature: 2–3 steps, plain words, Sanatani
 * tone (warm, blessings language — never corporate-cold).
 *
 * All user-facing copy lives in the i18n system under `guide.*` —
 * this file only wires anchors to key paths. Anchors are matched
 * against `[data-guide-anchor="..."]` in the DOM; a step whose anchor
 * is missing degrades gracefully to a centered card (FirstRunExplainer
 * style) instead of pointing at nothing.
 */

export interface GuideStepDef {
  /** DOM anchor id (data-guide-anchor). Omit for a centered card step. */
  anchor?: string;
  /** i18n key for the step title, e.g. 'guide.sos.s1t'. */
  titleKey: string;
  /** i18n key for the step body, e.g. 'guide.sos.s1b'. */
  bodyKey: string;
}

export interface GuideDef {
  /** Stable id, also the localStorage progress key suffix. */
  id: string;
  /** i18n key for the coach-mark card title. */
  titleKey: string;
  /** i18n key for the invitational pill text. */
  pillKey: string;
  steps: GuideStepDef[];
}

export type GuideId =
  | 'sos'
  | 'wallet'
  | 'booking'
  | 'campus'
  | 'p2p'
  | 'suchana'
  | 'profile'
  | 'orgdash'
  | 'dana'
  | 'devotional'
  | 'vda'
  | 'sevacards'
  | 'sevabazar'
  | 'sevaBooking'
  | 'tirtha'
  | 'groups';

export const GUIDES: Record<GuideId, GuideDef> = {
  sos: {
    id: 'sos',
    titleKey: 'guide.sos.title',
    pillKey: 'guide.sos.pill',
    steps: [
      {
        anchor: 'sos-button',
        titleKey: 'guide.sos.s1t',
        bodyKey: 'guide.sos.s1b',
      },
      { titleKey: 'guide.sos.s2t', bodyKey: 'guide.sos.s2b' },
      { titleKey: 'guide.sos.s3t', bodyKey: 'guide.sos.s3b' },
    ],
  },
  wallet: {
    id: 'wallet',
    titleKey: 'guide.wallet.title',
    pillKey: 'guide.wallet.pill',
    steps: [
      {
        anchor: 'wallet-seva',
        titleKey: 'guide.wallet.s1t',
        bodyKey: 'guide.wallet.s1b',
      },
      {
        anchor: 'wallet-personal',
        titleKey: 'guide.wallet.s2t',
        bodyKey: 'guide.wallet.s2b',
      },
      { titleKey: 'guide.wallet.s3t', bodyKey: 'guide.wallet.s3b' },
    ],
  },
  booking: {
    id: 'booking',
    titleKey: 'guide.booking.title',
    pillKey: 'guide.booking.pill',
    steps: [
      {
        anchor: 'booking-dakshina',
        titleKey: 'guide.booking.s1t',
        bodyKey: 'guide.booking.s1b',
      },
      {
        anchor: 'booking-escrow',
        titleKey: 'guide.booking.s2t',
        bodyKey: 'guide.booking.s2b',
      },
      {
        anchor: 'booking-confirm',
        titleKey: 'guide.booking.s3t',
        bodyKey: 'guide.booking.s3b',
      },
    ],
  },
  campus: {
    id: 'campus',
    titleKey: 'guide.campus.title',
    pillKey: 'guide.campus.pill',
    steps: [
      {
        anchor: 'campus-map',
        titleKey: 'guide.campus.s1t',
        bodyKey: 'guide.campus.s1b',
      },
      {
        anchor: 'campus-zones',
        titleKey: 'guide.campus.s2t',
        bodyKey: 'guide.campus.s2b',
      },
      { titleKey: 'guide.campus.s3t', bodyKey: 'guide.campus.s3b' },
    ],
  },
  p2p: {
    id: 'p2p',
    titleKey: 'guide.p2p.title',
    pillKey: 'guide.p2p.pill',
    steps: [
      {
        anchor: 'p2p-requests',
        titleKey: 'guide.p2p.s1t',
        bodyKey: 'guide.p2p.s1b',
      },
      {
        anchor: 'p2p-reference',
        titleKey: 'guide.p2p.s2t',
        bodyKey: 'guide.p2p.s2b',
      },
      { titleKey: 'guide.p2p.s3t', bodyKey: 'guide.p2p.s3b' },
    ],
  },
  suchana: {
    id: 'suchana',
    titleKey: 'guide.suchana.title',
    pillKey: 'guide.suchana.pill',
    steps: [
      {
        anchor: 'suchana-feed',
        titleKey: 'guide.suchana.s1t',
        bodyKey: 'guide.suchana.s1b',
      },
      { titleKey: 'guide.suchana.s2t', bodyKey: 'guide.suchana.s2b' },
      { titleKey: 'guide.suchana.s3t', bodyKey: 'guide.suchana.s3b' },
    ],
  },
  profile: {
    id: 'profile',
    titleKey: 'guide.profile.title',
    pillKey: 'guide.profile.pill',
    steps: [
      {
        anchor: 'profile-id',
        titleKey: 'guide.profile.s1t',
        bodyKey: 'guide.profile.s1b',
      },
      {
        anchor: 'profile-identities',
        titleKey: 'guide.profile.s2t',
        bodyKey: 'guide.profile.s2b',
      },
      { titleKey: 'guide.profile.s3t', bodyKey: 'guide.profile.s3b' },
    ],
  },
  orgdash: {
    id: 'orgdash',
    titleKey: 'guide.orgdash.title',
    pillKey: 'guide.orgdash.pill',
    steps: [
      { titleKey: 'guide.orgdash.s1t', bodyKey: 'guide.orgdash.s1b' },
      { titleKey: 'guide.orgdash.s2t', bodyKey: 'guide.orgdash.s2b' },
      { titleKey: 'guide.orgdash.s3t', bodyKey: 'guide.orgdash.s3b' },
    ],
  },
  dana: {
    id: 'dana',
    titleKey: 'guide.dana.title',
    pillKey: 'guide.dana.pill',
    steps: [
      {
        anchor: 'dana-amount',
        titleKey: 'guide.dana.s1t',
        bodyKey: 'guide.dana.s1b',
      },
      {
        anchor: 'dana-shradha',
        titleKey: 'guide.dana.s2t',
        bodyKey: 'guide.dana.s2b',
      },
      { titleKey: 'guide.dana.s3t', bodyKey: 'guide.dana.s3b' },
    ],
  },
  devotional: {
    id: 'devotional',
    titleKey: 'guide.devotional.title',
    pillKey: 'guide.devotional.pill',
    steps: [
      {
        anchor: 'giving-ledger',
        titleKey: 'guide.devotional.s1t',
        bodyKey: 'guide.devotional.s1b',
      },
      {
        anchor: 'giving-ledger-share',
        titleKey: 'guide.devotional.s2t',
        bodyKey: 'guide.devotional.s2b',
      },
      { titleKey: 'guide.devotional.s3t', bodyKey: 'guide.devotional.s3b' },
    ],
  },
  vda: {
    id: 'vda',
    titleKey: 'guide.vda.title',
    pillKey: 'guide.vda.pill',
    steps: [
      {
        anchor: 'vda-alias',
        titleKey: 'guide.vda.s1t',
        bodyKey: 'guide.vda.s1b',
      },
      { titleKey: 'guide.vda.s2t', bodyKey: 'guide.vda.s2b' },
      { titleKey: 'guide.vda.s3t', bodyKey: 'guide.vda.s3b' },
    ],
  },
  sevacards: {
    id: 'sevacards',
    titleKey: 'guide.sevacards.title',
    pillKey: 'guide.sevacards.pill',
    steps: [
      {
        anchor: 'seva-cards',
        titleKey: 'guide.sevacards.s1t',
        bodyKey: 'guide.sevacards.s1b',
      },
      { titleKey: 'guide.sevacards.s2t', bodyKey: 'guide.sevacards.s2b' },
    ],
  },
  sevabazar: {
    id: 'sevabazar',
    titleKey: 'guide.sevabazar.title',
    pillKey: 'guide.sevabazar.pill',
    steps: [
      {
        anchor: 'sevabazar-card',
        titleKey: 'guide.sevabazar.s1t',
        bodyKey: 'guide.sevabazar.s1b',
      },
      {
        anchor: 'sevabazar-ask',
        titleKey: 'guide.sevabazar.s2t',
        bodyKey: 'guide.sevabazar.s2b',
      },
      { titleKey: 'guide.sevabazar.s3t', bodyKey: 'guide.sevabazar.s3b' },
    ],
  },
  sevaBooking: {
    id: 'sevaBooking',
    titleKey: 'guide.sevaBooking.title',
    pillKey: 'guide.sevaBooking.pill',
    steps: [
      {
        anchor: 'sevabooking-mode',
        titleKey: 'guide.sevaBooking.s1t',
        bodyKey: 'guide.sevaBooking.s1b',
      },
      {
        anchor: 'sevabooking-muhurat',
        titleKey: 'guide.sevaBooking.s2t',
        bodyKey: 'guide.sevaBooking.s2b',
      },
      {
        anchor: 'sevabooking-suraksha',
        titleKey: 'guide.sevaBooking.s3t',
        bodyKey: 'guide.sevaBooking.s3b',
      },
    ],
  },
  tirtha: {
    id: 'tirtha',
    titleKey: 'guide.tirtha.title',
    pillKey: 'guide.tirtha.pill',
    steps: [
      {
        anchor: 'tirtha-visit',
        titleKey: 'guide.tirtha.s1t',
        bodyKey: 'guide.tirtha.s1b',
      },
      {
        titleKey: 'guide.tirtha.s2t',
        bodyKey: 'guide.tirtha.s2b',
      },
      {
        titleKey: 'guide.tirtha.s3t',
        bodyKey: 'guide.tirtha.s3b',
      },
    ],
  },
  groups: {
    id: 'groups',
    titleKey: 'guide.groups.title',
    pillKey: 'guide.groups.pill',
    steps: [
      {
        titleKey: 'guide.groups.s1t',
        bodyKey: 'guide.groups.s1b',
      },
      {
        titleKey: 'guide.groups.s2t',
        bodyKey: 'guide.groups.s2b',
      },
    ],
  },
};

/** Look up a guide by id; unknown ids return undefined (never throw). */
export function getGuide(id: string): GuideDef | undefined {
  return (GUIDES as Record<string, GuideDef>)[id];
}
