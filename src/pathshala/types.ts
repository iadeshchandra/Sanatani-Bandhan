/**
 * Pathshala One — type definitions.
 * School-management suite for Gurukul + Vidyalaya (Pathshala) workspaces.
 * Terminology: Shishya (student), Guru/Acharya (teacher), Varga (class),
 * Pathyakram (curriculum), Pariksha (exam), Upasthiti (attendance).
 */

export interface Guru {
  id: string;
  name: string;
  phone?: string;
  subjects: string[]; // subject ids they can teach
  designation: string; // e.g. 'Acharya', 'Upadhyaya', 'Shikshak'
  joiningDate?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  phone?: string;
  role: string; // e.g. 'Karyalaya', 'Bhojan-shala', 'Suraksha'
  joiningDate?: string;
}

export interface Varga {
  id: string;
  name: string; // e.g. 'Prathama'
  sanskrit: string; // e.g. 'प्रथमा'
  section?: string; // e.g. 'Ka'
  room?: string;
  classTeacherId?: string; // guru id
}

export interface Subject {
  id: string;
  vargaId: string;
  name: string; // e.g. 'Vyakarana'
  nameBn: string; // e.g. 'ব্যাকরণ'
  weeklyPeriods: number;
  guruId?: string; // assigned guru
}

export type UpasthitiStatus = 'present' | 'absent' | 'leave' | 'holiday';

export interface UpasthitiRecord {
  id: string;
  date: string; // YYYY-MM-DD
  vargaId: string;
  studentId: string; // GurukulStudent.id from DataContext
  status: UpasthitiStatus;
}

export type LeaveType = 'chhuti' | 'noimittik' | 'chikitsa'; // earned/casual/medical

export interface StaffUpasthitiRecord {
  id: string;
  date: string;
  personId: string;
  personKind: 'guru' | 'staff';
  status: 'present' | 'absent' | 'leave';
  leaveType?: LeaveType;
}

export interface Pariksha {
  id: string;
  name: string; // e.g. 'Pratham Pariksha'
  nameBn: string;
  vargaId: string;
  term: string; // e.g. '2026 — Pratham'
  startDate: string;
}

export interface MarksEntry {
  id: string;
  parikshaId: string;
  studentId: string;
  subjectId: string;
  marks: number;
  maxMarks: number;
}

export interface ExamRoutineSlot {
  id: string;
  date: string;
  subjectId: string;
  startTime: string; // HH:MM
  endTime: string;
  room?: string;
}

export interface ExamRoutine {
  id: string;
  parikshaId: string;
  title: string;
  slots: ExamRoutineSlot[];
}

export interface ClassPeriod {
  day: number; // 0=Mon..5=Sat
  period: number; // 0..n
  subjectId: string;
  guruId: string;
}

export interface ClassRoutine {
  id: string;
  vargaId: string;
  title: string;
  periodsPerDay: number;
  periodTimes: string[]; // "09:00-09:45" per period index
  slots: ClassPeriod[];
  updatedAt: string;
}

export interface FeeHead {
  id: string;
  name: string; // e.g. 'Masik Shulk'
  nameBn: string;
  amount: number;
  frequency: 'monthly' | 'one-time' | 'annual' | 'exam';
}

export interface FeeReceipt {
  id: string;
  receiptNo: string; // e.g. PS-2026-0001
  date: string;
  studentId: string;
  studentName: string;
  vargaId: string;
  heads: Array<{ feeHeadId: string; name: string; amount: number }>;
  discount: number;
  total: number;
  receivedBy?: string;
  treasuryTxId?: string;
}

export interface Suchana {
  // Notice-board notice
  id: string;
  title: string;
  body: string;
  date: string;
  publishedBy?: string;
}

export interface Homework {
  id: string;
  date: string;
  vargaId: string;
  subjectId: string;
  text: string;
}

export interface SkillIndicator {
  id: string;
  vargaId: string;
  name: string; // e.g. 'Shloka Kanthastha'
  nameBn: string;
}

export type SkillGrade = 'A' | 'B' | 'C' | 'D';

export interface SkillGradeRecord {
  id: string;
  term: string;
  studentId: string;
  skillId: string;
  grade: SkillGrade;
}

export interface CertificateRecord {
  id: string;
  kind: 'proshongshapotro' | 'chharpotro' | 'letterhead';
  studentId?: string;
  date: string;
  serialNo: string;
  body: string; // custom text
  photoDataUrl?: string;
  issuedBy?: string;
}

export interface ShishyaMeta {
  // Pathshala-local extension of DataContext GurukulStudent (keyed by student id).
  studentId: string;
  vargaId?: string;
  admissionNo?: string;
  admissionDate?: string;
}

export interface PathshalaSettings {
  bhavans: string[]; // campus buildings
  stipendAttendancePct: number; // default 85
}

export interface PathshalaState {
  gurus: Guru[];
  staff: StaffMember[];
  vargas: Varga[];
  subjects: Subject[];
  upasthiti: UpasthitiRecord[];
  staffUpasthiti: StaffUpasthitiRecord[];
  parikshas: Pariksha[];
  marks: MarksEntry[];
  examRoutines: ExamRoutine[];
  classRoutines: ClassRoutine[];
  feeHeads: FeeHead[];
  receipts: FeeReceipt[];
  suchanas: Suchana[];
  homework: Homework[];
  skills: SkillIndicator[];
  skillGrades: SkillGradeRecord[];
  certificates: CertificateRecord[];
  shishyaMeta: ShishyaMeta[];
  settings: PathshalaSettings;
  seededAt?: string;
}
