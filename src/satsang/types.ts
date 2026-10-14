/* Satsang One — types for the satsang mandali organizer suite.
 *
 * This is the ORGANIZER'S tool for local satsang mandalis (members,
 * gatherings, attendance, bhajan repertoire, prasad rotation, small fund).
 * It is distinct from the future Sangam social Satsang circles — no
 * social/feed features live here.
 */

export type MemberRole = 'sanchalak' | 'kirtankar' | 'prasad-seva' | 'member';

export interface Member {
  id: string;
  name: string;
  phone?: string;
  role: MemberRole;
  joinDate: string;          // yyyy-mm-dd
  active: boolean;
  notes?: string;
  createdAt: number;
}

export type GatheringStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Gathering {
  id: string;
  date: string;              // yyyy-mm-dd
  time: string;              // HH:MM
  venue: string;
  hostId?: string;           // member id — rotating host
  theme?: string;
  status: GatheringStatus;
  notes?: string;
  createdAt: number;
}

export interface AttendanceEntry {
  id: string;
  gatheringId: string;
  memberId: string;
  present: boolean;
  createdAt: number;
}

export interface Bhajan {
  id: string;
  title: string;
  deity?: string;            // e.g. "Krishna", "Devi", "Shiva", "Rama"
  language?: string;         // e.g. "Hindi", "Bengali", "Sanskrit"
  lyricsNote?: string;       // where the lyrics are kept (book, link, memory)
  lastSungDate?: string;     // yyyy-mm-dd — avoid repeats
  timesSung: number;
  createdAt: number;
}

export type PrasadStatus = 'assigned' | 'done' | 'skipped';

export interface PrasadAssignment {
  id: string;
  gatheringId: string;
  memberId: string;
  item?: string;             // e.g. "Kheer", "Puri-sabzi"
  status: PrasadStatus;
  createdAt: number;
}

export type FundKind = 'contribution' | 'expense';

export interface FundEntry {
  id: string;
  date: string;              // yyyy-mm-dd
  kind: FundKind;
  memberId?: string;         // contributor for contributions
  amount: number;
  note?: string;             // e.g. "Flowers", "Prasad ingredients"
  treasuryTxId?: string;     // set once posted
  createdAt: number;
}

export interface SatsangSettings {
  mandaliName: string;
  defaultTime: string;       // HH:MM
  defaultVenue: string;
}

export interface SatsangState {
  members: Member[];
  gatherings: Gathering[];
  attendance: AttendanceEntry[];
  bhajans: Bhajan[];
  prasad: PrasadAssignment[];
  fund: FundEntry[];
  settings: SatsangSettings;
}

export const MEMBER_ROLES: MemberRole[] = ['sanchalak', 'kirtankar', 'prasad-seva', 'member'];

export const ROLE_LABEL: Record<MemberRole, string> = {
  sanchalak: 'Sanchalak',
  kirtankar: 'Kirtankar',
  'prasad-seva': 'Prasad Seva',
  member: 'Member',
};
