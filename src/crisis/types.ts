/**
 * crisis/types.ts — Crisis Command Phase 1 shared data contract.
 * ==============================================================
 * All four crisis phases share this contract. Field names, shapes and
 * nullability below are the single source of truth — do not deviate.
 *
 * Safety notes:
 * - `location` is captured ONLY at the SOS moment, never tracked.
 * - `medicalShare` is pulled from the private profile ONLY for an active SOS
 *   and is visible only to acknowledged responders / emergency contacts.
 * - All nullable fields are honest (`| null`), never `undefined as X` casts.
 */

export type SituationKind = 'medical' | 'fire' | 'robbery' | 'crowd' | 'disaster' | 'other';

export type SOSStatus = 'active' | 'acknowledged' | 'responding' | 'resolved' | 'cancelled';

export type SOSSeverity = 'critical' | 'high' | 'medium';

export type AckStatus = 'coming' | 'arrived';

export interface SOSLocation {
  lat: number | null;
  lng: number | null;
  /** Human-readable label captured at SOS time (may be null offline). */
  address: string | null;
  /** Epoch ms when the fix was captured. */
  capturedAt: number | null;
}

export interface SOSMedicalShare {
  allergies: string[];
  conditions: string[];
}

export interface CrisisEvent {
  id: string;
  senderUid: string;
  senderName: string;
  senderPhoto: string | null;
  /** Solo Sanatani ID (SAN-XXXXXX), if the sender has one. */
  sanId: string | null;
  bloodGroup: string | null;
  situation: SituationKind;
  details: string | null;
  voiceNoteUrl: string | null;
  location: SOSLocation;
  medicalShare: SOSMedicalShare;
  status: SOSStatus;
  severity: SOSSeverity;
  orgId: string | null;
  workspaceId: string | null;
  /** Uids of family/emergency contacts notified (attempted). */
  familyNotified: string[];
  createdAt: number;
  resolvedAt: number | null;
  outcomeNote: string | null;
  /** Denormalized counters — incremented atomically via increment(). */
  ackCount: number;
  responderCount: number;
}

export interface CrisisResponse {
  uid: string;
  name: string;
  photo: string | null;
  status: AckStatus;
  /** Straight-line distance from responder to the SOS point, metres. Null when unknown. */
  distanceM: number | null;
  createdAt: number;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface EmergencyContactsDoc {
  contacts: EmergencyContact[];
}

export interface CrisisAbuseRecord {
  /** Count of false alarms inside the current rolling window. */
  falseCount: number;
  /** Epoch ms when the current 30-day window started. */
  windowStart: number;
  warned: boolean;
  /** Epoch ms until which SOS sends show a calm-down nudge. Null = no cooldown. */
  cooldownUntil: number | null;
}

/** Input accepted by sosService.triggerSOS(). */
export interface TriggerSOSInput {
  situation: SituationKind;
  details?: string | null;
  voiceNoteBlob?: Blob | null;
}

/** Snapshot of the sender assembled at trigger time (profile-derived). */
export interface SenderSnapshot {
  uid: string;
  name: string;
  photo: string | null;
  sanId: string | null;
  bloodGroup: string | null;
  allergies: string[];
  conditions: string[];
  workspaceId: string | null;
  orgId: string | null;
}

/** Severity mapping: medical/robbery = critical, fire/disaster = high, crowd/other = medium. */
export const SITUATION_SEVERITY: Record<SituationKind, SOSSeverity> = {
  medical: 'critical',
  robbery: 'critical',
  fire: 'high',
  disaster: 'high',
  crowd: 'medium',
  other: 'medium',
};

/** Firestore collection names used by Crisis Command. */
export const CRISIS_COLLECTIONS = {
  events: 'crisis_events',
  responses: 'responses',
  emergencyContacts: 'emergencyContacts',
  abuse: 'crisisAbuse',
  /** Storage path for SOS voice notes: sosVoice/{uid}/{eventId}.webm */
  voiceNoteStoragePath: (uid: string, eventId: string) => `sosVoice/${uid}/${eventId}.webm`,
} as const;
