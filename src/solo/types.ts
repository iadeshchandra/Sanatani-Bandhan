/**
 * Solo Sanatani — personal identity layer types.
 * ============================================================
 * The Universal Sanatani ID (SAN-XXXXXX) is the permanent, person-scoped
 * spine of the platform. Organisation memberships, PUR-XXXXXX (purohit) and
 * JYO-XXXXXX (jyotishi) identities ATTACH to it — one human, one ID, many
 * roles. Never a second account.
 */

export type SanataniVerificationTier = 'REGISTERED' | 'VERIFIED';

/** Tithi-anniversary samskara (from the intelligence engine). */
import type { UserSamskara } from '../lib/panjikaIntelligence';
export type { UserSamskara } from '../lib/panjikaIntelligence';

export interface SanataniProfile {
  /** Universal Sanatani ID, e.g. SAN-7K2Q9M. Permanent, never reassigned. */
  id: string;
  /** Firebase Auth uid — the doc id in `sanataniProfiles/{uid}`. */
  uid: string;
  displayName: string;
  email?: string;
  phone?: string;
  city?: string;
  /**
   * Speakable VDA-style alias, e.g. `aarav@kashi` (Phase 2). A friendly layer
   * on top of the canonical SAN-XXXXXX id — claimable first-write-wins in
   * `vdaAliases/{alias}`, releasable back to the pool. Never a replacement
   * for `id`.
   */
  vdaAlias?: string;
  /** Gotra is optional and private — never exposed publicly. */
  gotra?: string;
  languages: string[];
  homeRegion?: string;
  verificationTier: SanataniVerificationTier;
  /** Attached role identities. A solo account starts with none. */
  roles: {
    purohitId?: string;
    jyotishId?: string;
  };
  /** False until the profile has been written to Firestore (offline mint). */
  synced?: boolean;
  createdAt: number;
  updatedAt: number;
}

const SANATANI_ID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Generates a Universal Sanatani ID like SAN-7K2Q9M (no ambiguous chars). */
export function generateSanataniId(): string {
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += SANATANI_ID_CHARS[Math.floor(Math.random() * SANATANI_ID_CHARS.length)];
  }
  return `SAN-${suffix}`;
}

/* ------------------------------------------------------------------ */
/* Offline-first personal data (device-local; survives every upgrade).  */
/* ------------------------------------------------------------------ */

export interface JapaEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mantra: string;
  count: number;
  createdAt: number;
}

export interface VrataEntry {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  observed: boolean;
  notes?: string;
  createdAt: number;
}

export interface Sankalpa {
  id: string;
  text: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  active: boolean;
  createdAt: number;
}

export type SavedItemKind = 'shloka' | 'stotram' | 'discourse' | 'post' | 'other';

export interface SavedItem {
  id: string;
  kind: SavedItemKind;
  title: string;
  text?: string;
  source?: string;
  createdAt: number;
}

export interface GivingRecord {
  id: string;
  date: string; // YYYY-MM-DD
  orgName: string;
  amount: number;
  purpose?: string;
  receiptNo?: string;
  createdAt: number;
}

export type ReminderKind = 'vrata' | 'shraddha' | 'personal';

export interface PersonalReminder {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  kind: ReminderKind;
  notes?: string;
  createdAt: number;
}

export interface SoloPersonalState {
  japa: JapaEntry[];
  vrata: VrataEntry[];
  sankalpa: Sankalpa[];
  saved: SavedItem[];
  giving: GivingRecord[];
  reminders: PersonalReminder[];
  /** Personal samskara dates for the tithi-anniversary engine. */
  samskaras: UserSamskara[];
}
