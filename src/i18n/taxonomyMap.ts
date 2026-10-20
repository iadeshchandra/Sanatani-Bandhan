/**
 * taxonomyMap.ts — per-workspace-type vocabulary matrix (QUEUED #49).
 * =====================================================================
 * Extracted from LanguageContext so the map is a pure, testable module.
 * Coverage law: EVERY workspace type resolves to a complete matrix —
 * Mandir, Goshala, Ashram, Gurukul and Sangha carry their own words;
 * any other workspace type degrades to the Mandir matrix, so a member
 * noun can NEVER render as "undefined" again (live audit, build
 * b91aa94: Ashram/Gurukul/Sangha showed "Personal Mode (undefined)",
 * "All Undefined", "Register New undefined").
 *
 * Vocabulary grounding:
 *  - Ashram 'Sadhaks' — Matha One's role vocabulary (ROLE_LABEL
 *    'Sadhak', matha/types.ts) and its guide copy ("Sadhaks follow one
 *    shared rhythm"); the ashram's registered people are its resident
 *    practitioners, distinct from transient Yatris (Stays/Yatris tabs).
 *  - Gurukul 'Shishyas' — the Pathshala suite's own word (ShishyaTab,
 *    "Register shishya (student) in the Gurukul residential ledger").
 *  - Sangha 'Sadasyas' — dharmicTaxonomy's Sangha Participant is
 *    literally "Sadasya (Member)" and its offering "Sadasyata Shulk".
 *  - Funds/inventory terms reuse dharmicTaxonomy's FinancialOffering /
 *    SacredInventory lines for the same types where they exist.
 */

export interface TaxonomyMatrix {
  workspaceLabel: string;
  directoryName: string;
  memberTerm: string;
  fundsTerm: string;
  assetsTerm: string;
  inventoryTerm: string;
  memberNoun?: string;
  kartaNoun?: string;
  offeringNoun?: string;
}

export const TAXONOMY_MAP: Record<string, Record<string, TaxonomyMatrix>> = {
  en: {
    MANDIR: {
      workspaceLabel: 'Mandir / Temple',
      directoryName: 'Devotee Directory',
      memberTerm: 'Bhaktas',
      fundsTerm: 'Chanda / Pranami',
      assetsTerm: 'Temple Assets',
      inventoryTerm: 'Bhandara & Store',
    },
    GOSHALA: {
      workspaceLabel: 'Goshala',
      directoryName: 'Gau Sevak Directory',
      memberTerm: 'Gau Sevaks',
      fundsTerm: 'Gau Seva Nidhi',
      assetsTerm: 'Gomata & Nandi Records',
      inventoryTerm: 'Fodder & Medicine Store',
    },
    ASHRAM: {
      workspaceLabel: 'Ashram',
      directoryName: 'Sadhak Directory',
      memberTerm: 'Sadhaks',
      fundsTerm: 'Guru Dakshina / Bhiksha',
      assetsTerm: 'Ashram Assets',
      inventoryTerm: 'Ashram Bhandar',
    },
    GURUKUL: {
      workspaceLabel: 'Gurukul',
      directoryName: 'Shishya Directory',
      memberTerm: 'Shishyas',
      fundsTerm: 'Vidyadaan / Shulka',
      assetsTerm: 'Gurukul Assets',
      inventoryTerm: 'Pathashala Samagri',
    },
    SANGHA: {
      workspaceLabel: 'Sangha / Matha',
      directoryName: 'Sadasya Directory',
      memberTerm: 'Sadasyas',
      fundsTerm: 'Sadasyata Shulk / Chanda',
      assetsTerm: 'Sangha Sampada',
      inventoryTerm: 'Samoohik Bhandar',
    },
  },
  hi: {
    MANDIR: {
      workspaceLabel: 'मंदिर',
      directoryName: 'भक्त नामावली',
      memberTerm: 'भक्तजन',
      fundsTerm: 'चंदा / दान',
      assetsTerm: 'मंदिर संपदा',
      inventoryTerm: 'भंडार एवं राशन',
    },
    GOSHALA: {
      workspaceLabel: 'गौशाला',
      directoryName: 'गौ सेवक नामावली',
      memberTerm: 'गौ सेवक',
      fundsTerm: 'गौ सेवा निधि',
      assetsTerm: 'गोमाता एवं नंदी विवरण',
      inventoryTerm: 'चारा एवं औषधि भंडार',
    },
    ASHRAM: {
      workspaceLabel: 'आश्रम',
      directoryName: 'साधक नामावली',
      memberTerm: 'साधक',
      fundsTerm: 'गुरु दक्षिणा / भिक्षा',
      assetsTerm: 'आश्रम संपदा',
      inventoryTerm: 'आश्रम भंडार',
    },
    GURUKUL: {
      workspaceLabel: 'गुरुकुल',
      directoryName: 'शिष्य नामावली',
      memberTerm: 'शिष्य',
      fundsTerm: 'विद्यादान / शुल्क',
      assetsTerm: 'गुरुकुल संपदा',
      inventoryTerm: 'पाठशाला सामग्री',
    },
    SANGHA: {
      workspaceLabel: 'संघ',
      directoryName: 'सदस्य नामावली',
      memberTerm: 'सदस्य',
      fundsTerm: 'सदस्यता शुल्क / चंदा',
      assetsTerm: 'संघ संपदा',
      inventoryTerm: 'सामूहिक भंडार',
    },
  },
  bn: {
    MANDIR: {
      workspaceLabel: 'মন্দির',
      directoryName: 'ভক্ত তালিকা',
      memberTerm: 'ভক্তবৃন্দ',
      fundsTerm: 'প্রণামী / চাঁদা',
      assetsTerm: 'মন্দির সম্পদ',
      inventoryTerm: 'ভাণ্ডার',
    },
    GOSHALA: {
      workspaceLabel: 'গোশালা',
      directoryName: 'গো সেবক তালিকা',
      memberTerm: 'গো সেবক',
      fundsTerm: 'গো সেবা নিধি',
      assetsTerm: 'গোমাতা ও নন্দীর বিবরণ',
      inventoryTerm: 'খাদ্য ও ঔষধ ভাণ্ডার',
    },
    ASHRAM: {
      workspaceLabel: 'আশ্রম',
      directoryName: 'সাধক তালিকা',
      memberTerm: 'সাধক',
      fundsTerm: 'গুরু দক্ষিণা / ভিক্ষা',
      assetsTerm: 'আশ্রম সম্পদ',
      inventoryTerm: 'আশ্রম ভাণ্ডার',
    },
    GURUKUL: {
      workspaceLabel: 'গুরুকুল',
      directoryName: 'শিষ্য তালিকা',
      memberTerm: 'শিষ্য',
      fundsTerm: 'বিদ্যাদান / শুল্ক',
      assetsTerm: 'গুরুকুল সম্পদ',
      inventoryTerm: 'পাঠশালা সামগ্রী',
    },
    SANGHA: {
      workspaceLabel: 'সঙ্ঘ',
      directoryName: 'সদস্য তালিকা',
      memberTerm: 'সদস্য',
      fundsTerm: 'সদস্যতা শুল্ক / চাঁদা',
      assetsTerm: 'সঙ্ঘ সম্পদ',
      inventoryTerm: 'সম্মিলিত ভাণ্ডার',
    },
  },
};

/** Every WorkspaceType (src/types.ts), uppercased — the keys this map serves. */
export const WORKSPACE_TYPE_KEYS: ReadonlySet<string> = new Set([
  'MANDIR',
  'GOSHALA',
  'SANGHA',
  'ASHRAM',
  'GURUKUL',
  'SATSANG',
  'YOGA',
  'TRUST',
  'VIDYALAYA',
  'PUROHIT',
  'TIRTH',
  'SAMAJ',
  'AKSHAYAPATRA',
  'KASHIKSHETRA',
  'DHARMADATRUST',
  'MAHOTSAVSAMITI',
  'PUROHITSABHA',
]);

/**
 * Resolve the vocabulary matrix for a language + workspace type.
 * Exact entry → English entry → (workspace-type key) Mandir matrix →
 * null for non-workspace strings (callers pass those through verbatim).
 * Never returns a partial matrix.
 */
export function resolveTaxonomyMatrix(lang: string, typeKey: string): TaxonomyMatrix | null {
  const key = String(typeKey || 'MANDIR').toUpperCase();
  const direct = TAXONOMY_MAP[lang]?.[key] || TAXONOMY_MAP.en[key];
  if (direct) return direct;
  if (WORKSPACE_TYPE_KEYS.has(key)) return TAXONOMY_MAP.en.MANDIR;
  return null;
}
