/**
 * campus/wizardLogic.ts — Pure logic for the "Map Your Temple" guided wizard.
 * ============================================================================
 * No React, no Firestore, no side effects — every function here is unit
 * tested. The wizard UI (MapYourTemple.tsx) is a thin flow around this.
 *
 * Design laws:
 * - Completeness is kind, not strict: required items block publish,
 *   recommended items nudge.
 * - Overlap is a warning, never a blocker (temples are dense places).
 * - Drafts are the source of truth until publish.
 */
import type { CampusZone, OrgKind, ZoneCategory } from './types';
import { slugifyZone } from './types';

/* ------------------------------------------------------------------ */
/* Wizard steps                                                       */
/* ------------------------------------------------------------------ */

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export const WIZARD_STEPS: WizardStep[] = [1, 2, 3, 4, 5];

/* ------------------------------------------------------------------ */
/* Per-org-kind primary zone (the "heart" of the campus)              */
/* ------------------------------------------------------------------ */

/** The category that counts as "main shrine" for each org kind. */
export const PRIMARY_CATEGORY: Record<OrgKind, ZoneCategory> = {
  mandir: 'garbhagriha',
  goshala: 'gaushala',
  ashram: 'meditation',
  gurukul: 'classroom',
  sangha: 'meditation',
  other: 'office',
};

/** Warm display name for the primary zone per org kind. */
export const PRIMARY_LABEL: Record<OrgKind, { en: string; bn: string; hi: string }> = {
  mandir: { en: 'Main shrine', bn: 'মূল মন্দির', hi: 'मुख्य मंदिर' },
  goshala: { en: 'Gaushala sheds', bn: 'গোশালা', hi: 'गौशाला' },
  ashram: { en: 'Meditation hall', bn: 'ধ্যান কক্ষ', hi: 'ध्यान कक्ष' },
  gurukul: { en: 'Classrooms', bn: 'শ্রেণীকক্ষ', hi: 'कक्षाएँ' },
  sangha: { en: 'Prayer hall', bn: 'প্রার্থনা কক্ষ', hi: 'प्रार्थना कक्ष' },
  other: { en: 'Main building', bn: 'মূল ভবন', hi: 'मुख्य भवन' },
};

/* ------------------------------------------------------------------ */
/* Step 3 — essential comforts                                       */
/* ------------------------------------------------------------------ */

export interface ComfortItem {
  category: ZoneCategory;
  /** Display name when auto-created from the checklist. */
  defaultName: { en: string; bn: string; hi: string };
}

export const ESSENTIAL_COMFORTS: ComfortItem[] = [
  {
    category: 'prasad',
    defaultName: { en: 'Prasad Counter', bn: 'প্রসাদ কাউন্টার', hi: 'प्रसाद काउंटर' },
  },
  {
    category: 'restroom',
    defaultName: { en: 'Restrooms', bn: 'শৌচাগার', hi: 'शौचालय' },
  },
  {
    category: 'shoe_stand',
    defaultName: { en: 'Shoe Stand', bn: 'জুতো রাখার স্থান', hi: 'जूता स्टैंड' },
  },
  {
    category: 'other',
    defaultName: { en: 'Drinking Water', bn: 'পানীয় জল', hi: 'पीने का पानी' },
  },
];

/* ------------------------------------------------------------------ */
/* Completeness check                                                 */
/* ------------------------------------------------------------------ */

export interface CompletenessItem {
  id: string;
  label: { en: string; bn: string; hi: string };
  required: boolean;
  done: boolean;
  /** Category to place when the user taps "add it". */
  addCategory?: ZoneCategory;
  addName?: { en: string; bn: string; hi: string };
}

export interface CompletenessReport {
  items: CompletenessItem[];
  /** Publish is blocked until all required items are done. */
  canPublish: boolean;
  requiredDone: number;
  requiredTotal: number;
  recommendedDone: number;
  recommendedTotal: number;
}

const hasZoneWithCoords = (zones: CampusZone[], category: ZoneCategory): boolean =>
  zones.some((z) => z.category === category && z.name.trim().length > 0 && z.lat != null && z.lng != null);

/**
 * The heart of "correctly": required blocks publish, recommended nudges.
 * A zone only counts when it has a name AND coordinates (placed on map).
 */
export function checkCompleteness(zones: CampusZone[], orgKind: OrgKind): CompletenessReport {
  const primary = PRIMARY_CATEGORY[orgKind] ?? PRIMARY_CATEGORY.other;
  const primaryLabel = PRIMARY_LABEL[orgKind] ?? PRIMARY_LABEL.other;

  const items: CompletenessItem[] = [
    {
      id: 'primary',
      label: primaryLabel,
      required: true,
      done: hasZoneWithCoords(zones, primary),
      addCategory: primary,
      addName: primaryLabel,
    },
    {
      id: 'gate',
      label: { en: 'Entrance', bn: 'প্রবেশপথ', hi: 'प्रवेश द्वार' },
      required: true,
      done: hasZoneWithCoords(zones, 'gate'),
      addCategory: 'gate',
      addName: { en: 'Main Gate', bn: 'প্রধান ফটক', hi: 'मुख्य द्वार' },
    },
    ...ESSENTIAL_COMFORTS.map((c) => ({
      id: `comfort-${c.category}`,
      label: c.defaultName,
      required: false,
      done: hasZoneWithCoords(zones, c.category),
      addCategory: c.category,
      addName: c.defaultName,
    })),
  ];

  const required = items.filter((i) => i.required);
  const recommended = items.filter((i) => !i.required);
  return {
    items,
    canPublish: required.every((i) => i.done),
    requiredDone: required.filter((i) => i.done).length,
    requiredTotal: required.length,
    recommendedDone: recommended.filter((i) => i.done).length,
    recommendedTotal: recommended.length,
  };
}

/* ------------------------------------------------------------------ */
/* Overlap detection                                                  */
/* ------------------------------------------------------------------ */

export interface OverlapWarning {
  zoneA: CampusZone;
  zoneB: CampusZone;
  distanceM: number;
}

/** Haversine distance in metres. */
export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

const OVERLAP_THRESHOLD_M = 5;

/**
 * Gentle nudge, never a blocker: returns pairs of zones closer than
 * ~5 metres. Temples are dense — this is a "is that right?" not an error.
 */
export function detectOverlaps(zones: CampusZone[]): OverlapWarning[] {
  const placed = zones.filter(
    (z) => z.lat != null && z.lng != null && z.name.trim().length > 0,
  );
  const warnings: OverlapWarning[] = [];
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      const d = haversineM(a.lat!, a.lng!, b.lat!, b.lng!);
      if (d < OVERLAP_THRESHOLD_M) {
        warnings.push({ zoneA: a, zoneB: b, distanceM: Math.round(d * 10) / 10 });
      }
    }
  }
  return warnings;
}

/* ------------------------------------------------------------------ */
/* Draft helpers                                                      */
/* ------------------------------------------------------------------ */

export const draftKey = (orgId: string): string => `sb_campus_draft_${orgId}`;

export interface WizardDraft {
  orgId: string;
  orgName: string;
  orgKind: OrgKind;
  mode: 'geo' | 'image';
  zones: CampusZone[];
  layoutImageUrl: string | null;
  /** Highest step the user has reached (resume point). */
  step: WizardStep;
  updatedAt: number;
}

export function createDraft(orgId: string, orgName: string, orgKind: OrgKind): WizardDraft {
  return {
    orgId,
    orgName,
    orgKind,
    mode: 'geo',
    zones: [],
    layoutImageUrl: null,
    step: 1,
    updatedAt: Date.now(),
  };
}

/** Clamp a resume step into the valid range (corrupt drafts fail safe). */
export function clampStep(n: unknown): WizardStep {
  const s = typeof n === 'number' ? Math.floor(n) : 1;
  if (s < 1) return 1;
  if (s > 5) return 5;
  return s as WizardStep;
}

/** Validate a parsed draft object; returns null when unusable. */
export function parseDraft(raw: unknown): WizardDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.orgId !== 'string' || !d.orgId) return null;
  if (!Array.isArray(d.zones)) return null;
  const zones = (d.zones as unknown[]).filter(
    (z): z is CampusZone =>
      !!z && typeof z === 'object' && typeof (z as CampusZone).id === 'string',
  );
  return {
    orgId: d.orgId,
    orgName: typeof d.orgName === 'string' ? d.orgName : '',
    orgKind: (typeof d.orgKind === 'string' ? d.orgKind : 'other') as OrgKind,
    mode: d.mode === 'image' ? 'image' : 'geo',
    zones,
    layoutImageUrl: typeof d.layoutImageUrl === 'string' ? d.layoutImageUrl : null,
    step: clampStep(d.step),
    updatedAt: typeof d.updatedAt === 'number' ? d.updatedAt : Date.now(),
  };
}

/* ------------------------------------------------------------------ */
/* Zone placement helpers                                             */
/* ------------------------------------------------------------------ */

/** Create a new zone ready for pin placement. */
export function newZoneFor(category: ZoneCategory, name: string): CampusZone {
  return {
    id: `${slugifyZone(name)}_${Date.now().toString(36)}`,
    name,
    category,
  };
}

/** Count zones of a category that have coordinates (actually placed). */
export function countPlaced(zones: CampusZone[], category: ZoneCategory): number {
  return zones.filter(
    (z) => z.category === category && z.lat != null && z.lng != null,
  ).length;
}

/** Remove a zone by id (pure). */
export function removeZone(zones: CampusZone[], id: string): CampusZone[] {
  return zones.filter((z) => z.id !== id);
}

/** Move a zone to new coordinates (pure). */
export function moveZone(
  zones: CampusZone[],
  id: string,
  lat: number,
  lng: number,
): CampusZone[] {
  return zones.map((z) => (z.id === id ? { ...z, lat, lng } : z));
}
