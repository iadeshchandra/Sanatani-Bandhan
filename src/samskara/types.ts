/* Samskara One — types for the family lifecycle suite.
 *
 * The 16 samskaras (ṣoḍaśa saṃskārāḥ) mark the sacred journey of a
 * Sanatani life from conception to the final rites. This module keeps
 * a family's samskara record with reverence — it is a family chronicle,
 * not a checklist to be "completed" for points.
 *
 * RESPECT RULE: sacred family data. No badges, no streaks, no points,
 * no gamification of any kind. Tone throughout is reverent and quiet.
 */

export type SamskaraId =
  | 'garbhadhana' | 'pumsavana' | 'simantonnayana' | 'jatakarma'
  | 'namakarana' | 'nishkramana' | 'annaprashana' | 'chudakarana'
  | 'karnavedha' | 'vidyarambha' | 'upanayana' | 'vedarambha'
  | 'keshanta' | 'samavartana' | 'vivaha' | 'antyeshti';

export interface SamskaraMeta {
  id: SamskaraId;
  /** Sanskrit name in Devanagari. */
  name: string;
  /** Transliterated name. */
  transliteration: string;
  /** Traditional timing, stated gently — customs vary by family and region. */
  timing: string;
  /** One-line reverent description. */
  description: string;
  /** Approximate age in years when this samskara is traditionally observed.
   *  Used only for gentle reminders. -1 = prenatal, -2 = at birth,
   *  -3 = no fixed age (event-driven). */
  typicalAge: number;
  /** Which genders traditionally observe it ('all' | 'male' | 'female').
   *  Shown as guidance only; families decide for themselves. */
  forGender: 'all' | 'male' | 'female';
}

/** The sixteen samskaras in traditional order. Timings follow widely
 *  observed custom; the UI always notes that family and regional
 *  traditions take precedence. */
export const SAMSKARAS: SamskaraMeta[] = [
  {
    id: 'garbhadhana', name: 'गर्भाधान', transliteration: 'Garbhadhana',
    timing: 'Before conception, with prayer and intention',
    description: 'The sacred intention of parenthood — welcoming a soul with prayer.',
    typicalAge: -1, forGender: 'all',
  },
  {
    id: 'pumsavana', name: 'पुंसवन', transliteration: 'Pumsavana',
    timing: 'Third month of pregnancy',
    description: 'Prayers for the wellbeing of the mother and the child in the womb.',
    typicalAge: -1, forGender: 'all',
  },
  {
    id: 'simantonnayana', name: 'सीमन्तोन्नयन', transliteration: 'Simantonnayana',
    timing: 'Fourth, sixth or eighth month of pregnancy',
    description: 'Blessings for the expectant mother; the parting of the hair ceremony.',
    typicalAge: -1, forGender: 'all',
  },
  {
    id: 'jatakarma', name: 'जातकर्म', transliteration: 'Jatakarma',
    timing: 'At birth, before the umbilical cord is cut',
    description: 'Welcoming the newborn — honey and ghee touched to the infant\u2019s lips with mantra.',
    typicalAge: -2, forGender: 'all',
  },
  {
    id: 'namakarana', name: 'नामकरण', transliteration: 'Namakarana',
    timing: 'Eleventh day after birth, or within the first year',
    description: 'The naming ceremony — giving the child their sacred name.',
    typicalAge: 0, forGender: 'all',
  },
  {
    id: 'nishkramana', name: 'निष्क्रमण', transliteration: 'Nishkramana',
    timing: 'Around the fourth month',
    description: 'The infant\u2019s first outing — traditionally, first sight of the sun.',
    typicalAge: 0, forGender: 'all',
  },
  {
    id: 'annaprashana', name: 'अन्नप्राशन', transliteration: 'Annaprashana',
    timing: 'Around the sixth month',
    description: 'The first feeding of solid food — usually sweetened rice.',
    typicalAge: 1, forGender: 'all',
  },
  {
    id: 'chudakarana', name: 'चूडाकरण', transliteration: 'Chudakarana',
    timing: 'First or third year',
    description: 'The first haircut (mundan) — offered with prayers for long life.',
    typicalAge: 1, forGender: 'all',
  },
  {
    id: 'karnavedha', name: 'कर्णवेध', transliteration: 'Karnavedha',
    timing: 'Third or fifth year',
    description: 'Piercing of the ears — traditionally believed to open the inner ear to sacred sound.',
    typicalAge: 3, forGender: 'all',
  },
  {
    id: 'vidyarambha', name: 'विद्यारम्भ', transliteration: 'Vidyarambha',
    timing: 'Around the fifth year, often on Vasant Panchami',
    description: 'Initiation into learning — the child first writes with the guru\u2019s guidance.',
    typicalAge: 5, forGender: 'all',
  },
  {
    id: 'upanayana', name: 'उपनयन', transliteration: 'Upanayana',
    timing: 'Traditionally around the 8th year (varies by varna and family)',
    description: 'The sacred thread ceremony — initiation into study and spiritual discipline.',
    typicalAge: 8, forGender: 'male',
  },
  {
    id: 'vedarambha', name: 'वेदारम्भ', transliteration: 'Vedarambha',
    timing: 'After upanayana, when Vedic study begins',
    description: 'The beginning of Vedic study under a guru.',
    typicalAge: 9, forGender: 'male',
  },
  {
    id: 'keshanta', name: 'केशान्त', transliteration: 'Keshanta',
    timing: 'Around the sixteenth year',
    description: 'The first shaving of the beard — marking the approach of adulthood.',
    typicalAge: 16, forGender: 'male',
  },
  {
    id: 'samavartana', name: 'समावर्तन', transliteration: 'Samavartana',
    timing: 'On completion of studies',
    description: 'Graduation from the guru\u2019s tutelage — the return home as a snataka.',
    typicalAge: 21, forGender: 'male',
  },
  {
    id: 'vivaha', name: 'विवाह', transliteration: 'Vivaha',
    timing: 'At marriageable age, on an auspicious muhurat',
    description: 'The wedding samskara — the sacred union of two souls and two families.',
    typicalAge: -3, forGender: 'all',
  },
  {
    id: 'antyeshti', name: 'अन्त्येष्टि', transliteration: 'Antyeshti',
    timing: 'At the end of life',
    description: 'The final rites — offered with love, guiding the departed soul onward. Handled with utmost reverence.',
    typicalAge: -3, forGender: 'all',
  },
];

export const samskaraMeta = (id: SamskaraId): SamskaraMeta =>
  SAMSKARAS.find((s) => s.id === id) ?? SAMSKARAS[0];

/* ------------------------- family ------------------------- */

export interface Family {
  id: string;
  name: string;            // e.g. "Sharma Parivar"
  gotra?: string;
  kuladevata?: string;     // family deity
  moolSthan?: string;      // ancestral place
  notes?: string;
  createdAt: number;
}

export type Relation =
  | 'self' | 'spouse' | 'father' | 'mother' | 'son' | 'daughter'
  | 'brother' | 'sister' | 'grandfather' | 'grandmother'
  | 'grandson' | 'granddaughter' | 'father-in-law' | 'mother-in-law'
  | 'uncle' | 'aunt' | 'nephew' | 'niece' | 'other';

export const RELATIONS: Relation[] = [
  'self', 'spouse', 'father', 'mother', 'son', 'daughter',
  'brother', 'sister', 'grandfather', 'grandmother',
  'grandson', 'granddaughter', 'father-in-law', 'mother-in-law',
  'uncle', 'aunt', 'nephew', 'niece', 'other',
];

export const RELATION_LABEL: Record<Relation, string> = {
  self: 'Self', spouse: 'Spouse', father: 'Father', mother: 'Mother',
  son: 'Son', daughter: 'Daughter', brother: 'Brother', sister: 'Sister',
  grandfather: 'Grandfather', grandmother: 'Grandmother',
  grandson: 'Grandson', granddaughter: 'Granddaughter',
  'father-in-law': 'Father-in-law', 'mother-in-law': 'Mother-in-law',
  uncle: 'Uncle', aunt: 'Aunt', nephew: 'Nephew', niece: 'Niece', other: 'Other',
};

export interface FamilyMember {
  id: string;
  familyId: string;
  name: string;
  relation: Relation;
  gender: 'male' | 'female' | 'other';
  birthDate?: string;      // yyyy-mm-dd
  isLiving: boolean;
  gotra?: string;
  notes?: string;
  createdAt: number;
}

/* ------------------------- samskara records ------------------------- */

export type SamskaraStatus = 'completed' | 'planned' | 'not-applicable';

export interface SamskaraRecord {
  id: string;
  memberId: string;
  samskaraId: SamskaraId;
  status: SamskaraStatus;
  dateCompleted?: string;  // yyyy-mm-dd
  purohitName?: string;
  location?: string;
  notes?: string;
  createdAt: number;
}

/* ------------------------- pitra / shraddha ------------------------- */

export interface Ancestor {
  id: string;
  familyId: string;
  name: string;
  relation: string;         // free text, e.g. "Paternal grandfather"
  deathDate?: string;      // yyyy-mm-dd
  /** Annual shraddha date as MM-DD (solar approximation). The family is
   *  reminded to confirm the tithi with their purohit each year. */
  shraddhaMonthDay?: string;
  deathTithiNote?: string; // e.g. "Ashwin Krishna Paksha — confirm yearly"
  notes?: string;
  createdAt: number;
}

/* ------------------------- ceremony planning ------------------------- */

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface CeremonyPlan {
  id: string;
  memberId: string;
  samskaraId: SamskaraId;
  targetDate?: string;     // yyyy-mm-dd
  checklist: ChecklistItem[];
  purohitName?: string;
  purohitContact?: string;
  muhuratNote?: string;    // free text; link to Jyotish One suggested in UI
  dakshinaAmount?: number;
  dakshinaPosted?: boolean;
  treasuryTxId?: string;   // set once posted to the cloud ledger
  notes?: string;
  createdAt: number;
}

/* ------------------------- state ------------------------- */

export interface SamskaraState {
  families: Family[];
  members: FamilyMember[];
  records: SamskaraRecord[];
  ancestors: Ancestor[];
  plans: CeremonyPlan[];
}

export const SAMSARA_DEFAULT_CHECKLIST: Record<SamskaraId, string[]> = {
  garbhadhana: ['Consult family purohit for auspicious timing', 'Prepare the home altar', 'Observe prayer and fasting as advised'],
  pumsavana: ['Confirm month of pregnancy', 'Arrange purohit and samagri', 'Prepare prasad for family'],
  simantonnayana: ['Confirm month with family elders', 'Arrange purohit and samagri', 'Invite close family'],
  jatakarma: ['Keep honey and ghee ready', 'Inform family purohit at birth', 'Record birth time for janma-kundali'],
  namakarana: ['Choose name with elders (nakshatra-based)', 'Arrange purohit for 11th day', 'Prepare for family gathering'],
  nishkramana: ['Choose auspicious day', 'Prepare for first outing', 'Offer prayers at home shrine'],
  annaprashana: ['Prepare sweetened rice / kheer', 'Arrange purohit', 'Invite maternal family traditionally'],
  chudakarana: ['Choose auspicious day with purohit', 'Arrange barber and samagri', 'Prepare for temple visit if customary'],
  karnavedha: ['Consult purohit for timing', 'Arrange goldsmith / piercing', 'Prepare prasad'],
  vidyarambha: ['Choose Vasant Panchami or auspicious day', 'Arrange guru / purohit', 'Prepare slate, chalk, sweets'],
  upanayana: ['Confirm timing with purohit (varies by family)', 'Arrange yajnopavita and samagri', 'Plan bhiksha and brahmacharya guidance', 'Invite extended family'],
  vedarambha: ['Coordinate with guru', 'Prepare study materials', 'Set daily svadhyaya routine'],
  keshanta: ['Arrange purohit', 'Prepare samagri', 'Mark transition with family blessing'],
  samavartana: ['Coordinate with guru for completion', 'Prepare guru-dakshina with gratitude', 'Plan homecoming'],
  vivaha: ['Match kundalis / consult jyotishi for muhurat', 'Book venue and purohit early', 'Prepare guest list with both families', 'Arrange all vivaha samagri', 'Plan dakshina with gratitude'],
  antyeshti: ['Contact family purohit immediately', 'Inform close family with care', 'Arrange cremation / burial per family custom', 'Prepare for 13-day observances', 'Keep this record with tenderness'],
};
