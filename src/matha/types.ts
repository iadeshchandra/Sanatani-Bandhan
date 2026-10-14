/* Matha One — types for the Sangha/Matha monastic management suite. */

export type SannyasiRole =
  | 'acharya' | 'mahant' | 'brahmachari' | 'brahmacharini'
  | 'sadhak' | 'sadhika' | 'sevak' | 'sevika';

export type SannyasiStatus = 'resident' | 'itinerant' | 'mahasamadhi';

export interface Sannyasi {
  id: string;
  poorvashramName: string;   // name before diksha
  sannyasName: string;       // name after diksha
  dikshaDate?: string;       // yyyy-mm-dd
  dikshaGuruId?: string;     // link to another sannyasi in the registry
  parampara: string;         // lineage name, e.g. "Sringeri", "Dashanami"
  role: SannyasiRole;
  status: SannyasiStatus;
  contactNote?: string;
  notes?: string;
  createdAt: number;
}

export interface BranchMatha {
  id: string;
  name: string;
  location: string;
  inChargeId?: string;       // sannyasi id
  phone?: string;
  establishedYear?: string;
  notes?: string;
  createdAt: number;
}

export interface DinacharyaItem {
  id: string;
  time: string;              // HH:MM
  activity: string;          // e.g. "Mangala Aarti"
  days: number[];            // 0=Sun..6=Sat; empty = every day
  notes?: string;
  createdAt: number;
}

export interface GurukulStudent {
  id: string;
  name: string;
  age?: string;
  guruId?: string;           // sannyasi id
  subjects: string;          // free text: "Veda, Vyakarana"
  progressNotes?: string;
  joinDate: string;          // yyyy-mm-dd
  status: 'studying' | 'completed' | 'left';
  createdAt: number;
}

export interface SevaAssignment {
  id: string;
  seva: string;              // e.g. "Rasoi", "Dwar", "Udyan", "Pustakalaya"
  assigneeId: string;        // sannyasi or student id
  assigneeKind: 'sannyasi' | 'student';
  frequency: string;         // e.g. "Daily", "Mon/Wed/Fri", "Weekly rotation"
  notes?: string;
  createdAt: number;
}

export interface Observance {
  id: string;
  name: string;              // e.g. "Guru Purnima"
  monthDay: string;          // MM-DD (recurs yearly)
  kind: 'guru-purnima' | 'diksha-anniversary' | 'festival' | 'other';
  relatedId?: string;        // sannyasi id for diksha anniversaries
  notes?: string;
  createdAt: number;
}

export interface DakshinaRecord {
  id: string;
  date: string;              // yyyy-mm-dd
  donorName: string;
  amount: number;
  purpose: 'guru-dakshina' | 'general-donation' | 'annadana' | 'other';
  paymentMode: string;
  treasuryTxId?: string;     // set once posted
  notes?: string;
  createdAt: number;
}

export interface MathaSettings {
  mathaName: string;
  paramparaName: string;
}

export interface MathaState {
  sannyasis: Sannyasi[];
  branches: BranchMatha[];
  dinacharya: DinacharyaItem[];
  students: GurukulStudent[];
  seva: SevaAssignment[];
  observances: Observance[];
  dakshina: DakshinaRecord[];
  settings: MathaSettings;
}

export const SANNYASI_ROLES: SannyasiRole[] = [
  'acharya', 'mahant', 'brahmachari', 'brahmacharini', 'sadhak', 'sadhika', 'sevak', 'sevika',
];

export const ROLE_LABEL: Record<SannyasiRole, string> = {
  acharya: 'Acharya',
  mahant: 'Mahant',
  brahmachari: 'Brahmachari',
  brahmacharini: 'Brahmacharini',
  sadhak: 'Sadhak',
  sadhika: 'Sadhika',
  sevak: 'Sevak',
  sevika: 'Sevika',
};
