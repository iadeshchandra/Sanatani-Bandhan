import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { allowsSeedData } from '../lib/workspaceKind';
import {
  PathshalaState, Guru, StaffMember, Varga, Subject, UpasthitiRecord, StaffUpasthitiRecord,
  Pariksha, MarksEntry, ExamRoutine, ClassRoutine, ClassPeriod, FeeHead, FeeReceipt, Suchana,
  Homework, SkillIndicator, SkillGradeRecord, CertificateRecord, ShishyaMeta, PathshalaSettings,
} from './types';
import { uid, todayISO } from './bn';

/* ------------------------------------------------------------------ */
/* Pathshala One store — offline-first, per-workspace localStorage.     */
/* School records (attendance, marks, routines…) live on this device;   */
/* fee collection ALSO posts to treasury (which has the cloud path).   */
/* Shishya roster itself stays in DataContext (gurukulStudents) — this  */
/* store keeps only pathshala-local extensions keyed by student id.     */
/* ------------------------------------------------------------------ */

type EntityKey =
  | 'gurus' | 'staff' | 'vargas' | 'subjects' | 'upasthiti' | 'staffUpasthiti'
  | 'parikshas' | 'marks' | 'examRoutines' | 'classRoutines' | 'feeHeads'
  | 'receipts' | 'suchanas' | 'homework' | 'skills' | 'skillGrades'
  | 'certificates' | 'shishyaMeta';

const EMPTY: PathshalaState = {
  gurus: [], staff: [], vargas: [], subjects: [],
  upasthiti: [], staffUpasthiti: [], parikshas: [], marks: [],
  examRoutines: [], classRoutines: [], feeHeads: [], receipts: [],
  suchanas: [], homework: [], skills: [], skillGrades: [],
  certificates: [], shishyaMeta: [],
  settings: { bhavans: [], stipendAttendancePct: 85 },
};

const storageKey = (ws: string) => `sb_pathshala_${ws}`;

function loadState(ws: string): PathshalaState {
  try {
    const raw = localStorage.getItem(storageKey(ws));
    if (raw) return { ...EMPTY, ...JSON.parse(raw) };
  } catch { /* corrupted → reseed */ }
  return { ...EMPTY };
}

/* ------------------------- demo seed ------------------------- */
function buildSeed(shishyaIds: string[]): PathshalaState {
  const v1: Varga = { id: 'v_prathama', name: 'Prathama', sanskrit: 'प्रथमा', section: 'Ka', room: 'Kaksha 1', classTeacherId: 'g_1' };
  const v2: Varga = { id: 'v_madhyama', name: 'Madhyama', sanskrit: 'मध्यमा', section: 'Ka', room: 'Kaksha 2', classTeacherId: 'g_2' };
  const v3: Varga = { id: 'v_shastri', name: 'Shastri', sanskrit: 'शास्त्री', section: 'Ka', room: 'Kaksha 3', classTeacherId: 'g_3' };
  const v4: Varga = { id: 'v_acharya', name: 'Acharya', sanskrit: 'आचार्य', section: 'Ka', room: 'Kaksha 4', classTeacherId: 'g_4' };
  const gurus: Guru[] = [
    { id: 'g_1', name: 'Pt. Raghunath Shastri', phone: '+91 98100 11111', subjects: [], designation: 'Acharya', joiningDate: '2020-06-01' },
    { id: 'g_2', name: 'Pt. Vishvanath Mishra', phone: '+91 98100 22222', subjects: [], designation: 'Upadhyaya', joiningDate: '2021-07-01' },
    { id: 'g_3', name: 'Smt. Gayatri Devi', phone: '+91 98100 33333', subjects: [], designation: 'Shikshika', joiningDate: '2022-06-15' },
    { id: 'g_4', name: 'Pt. Devkinandan Tiwari', phone: '+91 98100 44444', subjects: [], designation: 'Acharya', joiningDate: '2019-06-01' },
    { id: 'g_5', name: 'Shri Harishankar Pandey', phone: '+91 98100 55555', subjects: [], designation: 'Vyayam Shikshak', joiningDate: '2023-01-10' },
  ];
  const staff: StaffMember[] = [
    { id: 's_1', name: 'Mohanlal Yadav', phone: '+91 98200 11111', role: 'Karyalaya Sahayak', joiningDate: '2021-03-01' },
    { id: 's_2', name: 'Shanti Devi', phone: '+91 98200 22222', role: 'Bhojan-shala', joiningDate: '2022-04-01' },
  ];
  const subj = (id: string, vargaId: string, name: string, nameBn: string, weeklyPeriods: number, guruId?: string): Subject =>
    ({ id, vargaId, name, nameBn, weeklyPeriods, guruId });
  const subjects: Subject[] = [
    subj('sub_p1', 'v_prathama', 'Vyakarana', 'ব্যাকরণ', 6, 'g_1'),
    subj('sub_p2', 'v_prathama', 'Ganita', 'গণিত', 5, 'g_3'),
    subj('sub_p3', 'v_prathama', 'Shloka Kanthastha', 'শ্লোক কণ্ঠস্থ', 6, 'g_1'),
    subj('sub_p4', 'v_prathama', 'Sanskrit Bhasha', 'সংস্কৃত ভাষা', 5, 'g_2'),
    subj('sub_p5', 'v_prathama', 'Bangla Bhasha', 'বাংলা ভাষা', 4, 'g_3'),
    subj('sub_m1', 'v_madhyama', 'Nyaya Shastra', 'ন্যায় শাস্ত্র', 5, 'g_2'),
    subj('sub_m2', 'v_madhyama', 'Veda Patha', 'বেদ পাঠ', 6, 'g_4'),
    subj('sub_m3', 'v_madhyama', 'Jyotisha', 'জ্যোতিষ', 4, 'g_2'),
    subj('sub_m4', 'v_madhyama', 'Ganita', 'গণিত', 5, 'g_3'),
    subj('sub_m5', 'v_madhyama', 'Bangla Sahitya', 'বাংলা সাহিত্য', 4, 'g_3'),
    subj('sub_s1', 'v_shastri', 'Mimamsa', 'মীমাংসা', 6, 'g_4'),
    subj('sub_s2', 'v_shastri', 'Vedanta', 'বেদান্ত', 6, 'g_4'),
    subj('sub_s3', 'v_shastri', 'Sahitya', 'সাহিত্য', 4, 'g_1'),
    subj('sub_a1', 'v_acharya', 'Ghana Patha', 'ঘন পাঠ', 8, 'g_4'),
    subj('sub_a2', 'v_acharya', 'Shrauta Sutra', 'শ্রৌত সূত্র', 6, 'g_1'),
  ];
  gurus[0].subjects = ['sub_p1', 'sub_p3', 'sub_s3', 'sub_a2'];
  gurus[1].subjects = ['sub_p4', 'sub_m1', 'sub_m3'];
  gurus[2].subjects = ['sub_p2', 'sub_p5', 'sub_m4', 'sub_m5'];
  gurus[3].subjects = ['sub_m2', 'sub_s1', 'sub_s2', 'sub_a1'];

  const feeHeads: FeeHead[] = [
    { id: 'fh_1', name: 'Pravesh Shulk (Admission)', nameBn: 'ভর্তি ফি', amount: 1100, frequency: 'one-time' },
    { id: 'fh_2', name: 'Masik Shulk (Monthly)', nameBn: 'মাসিক বেতন', amount: 500, frequency: 'monthly' },
    { id: 'fh_3', name: 'Bhojan Shulk (Meals)', nameBn: 'আহার ফি', amount: 800, frequency: 'monthly' },
    { id: 'fh_4', name: 'Pariksha Shulk (Exam)', nameBn: 'পরীক্ষার ফি', amount: 300, frequency: 'exam' },
  ];

  const today = todayISO();
  // Seed today's shishya attendance: mostly present, one absent (demo realism).
  const upasthiti: UpasthitiRecord[] = shishyaIds.slice(0, 12).map((sid, i) => ({
    id: uid('att'), date: today, vargaId: i % 3 === 0 ? 'v_madhyama' : 'v_prathama',
    studentId: sid, status: i === 5 ? 'absent' : 'present',
  }));
  const staffUpasthiti: StaffUpasthitiRecord[] = [
    ...gurus.map((g) => ({ id: uid('satt'), date: today, personId: g.id, personKind: 'guru' as const, status: 'present' as const })),
    { id: uid('satt'), date: today, personId: 's_2', personKind: 'staff', status: 'leave', leaveType: 'chikitsa' as const },
    { id: uid('satt'), date: today, personId: 's_1', personKind: 'staff', status: 'present' as const },
  ];

  const pariksha: Pariksha = {
    id: 'par_1', name: 'Pratham Pariksha', nameBn: 'প্রথম পরীক্ষা',
    vargaId: 'v_prathama', term: '2026 — Pratham', startDate: today,
  };
  const marks: MarksEntry[] = [];
  const prathamaSubs = subjects.filter((s) => s.vargaId === 'v_prathama');
  shishyaIds.slice(0, 6).forEach((sid, si) => {
    prathamaSubs.forEach((sub, subi) => {
      marks.push({ id: uid('mk'), parikshaId: 'par_1', studentId: sid, subjectId: sub.id, marks: 62 + ((si * 7 + subi * 5) % 34), maxMarks: 100 });
    });
  });

  const periodTimes = ['09:00-09:45', '09:45-10:30', '10:45-11:30', '11:30-12:15', '13:00-13:45', '13:45-14:30'];
  const classRoutines: ClassRoutine[] = [
    {
      id: 'cr_prathama', vargaId: 'v_prathama', title: 'Saptahik Varga Suchi', periodsPerDay: 6,
      periodTimes, updatedAt: new Date().toISOString(),
      slots: buildAutoRoutine('v_prathama', subjects.filter((s) => s.vargaId === 'v_prathama'), 6),
    },
  ];

  const suchanas: Suchana[] = [
    { id: 'n_1', title: 'Vasant Panchami — Saraswati Puja', body: 'সমস্ত শিষ্যদের সকাল ৮টায় প্রাঙ্গণে উপস্থিত থাকতে হবে। Saraswati-puja followed by Vidyarambha for new shishya.', date: today, publishedBy: 'Karyalaya' },
    { id: 'n_2', title: 'Masik Shulk — সময়সীমা', body: 'এই মাসের বেতন আগামী ১০ তারিখের মধ্যে পরিশোধ করুন।', date: today, publishedBy: 'Karyalaya' },
  ];
  const homework: Homework[] = [
    { id: 'hw_1', date: today, vargaId: 'v_prathama', subjectId: 'sub_p1', text: 'Ashtadhyayi 1.1.1–1.1.10 kanthastha + abhyasa pustika p.12' },
    { id: 'hw_2', date: today, vargaId: 'v_prathama', subjectId: 'sub_p2', text: 'গণিত: অনুশীলনী ৩ — ১ থেকে ১০' },
  ];
  const skills: SkillIndicator[] = [
    { id: 'sk_1', vargaId: 'v_prathama', name: 'Shloka Kanthastha', nameBn: 'শ্লোক কণ্ঠস্থ' },
    { id: 'sk_2', vargaId: 'v_prathama', name: 'Sandhya Niyam', nameBn: 'সন্ধ্যা নিয়ম' },
    { id: 'sk_3', vargaId: 'v_prathama', name: 'Lekhan Kaushal', nameBn: 'লেখন দক্ষতা' },
  ];
  const grades: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'A', 'C'];
  const skillGrades: SkillGradeRecord[] = [];
  shishyaIds.slice(0, 4).forEach((sid, si) => {
    skills.forEach((sk, ski) => {
      skillGrades.push({ id: uid('sg'), term: '2026 — Pratham', studentId: sid, skillId: sk.id, grade: grades[(si + ski) % 4] });
    });
  });

  return {
    ...EMPTY,
    gurus, staff, vargas: [v1, v2, v3, v4], subjects,
    upasthiti, staffUpasthiti, parikshas: [pariksha], marks, classRoutines,
    feeHeads, suchanas, homework, skills, skillGrades,
    settings: { bhavans: ['Vidya Bhavan', 'Guru Bhavan', 'Bhojan-shala'], stipendAttendancePct: 85 },
    seededAt: new Date().toISOString(),
  };
}

/** Greedy auto class-routine: fills periods round-robin, never double-books a guru in a slot. */
export function buildAutoRoutine(vargaId: string, vargaSubjects: Subject[], periodsPerDay: number): ClassPeriod[] {
  const slots: ClassPeriod[] = [];
  const queue: Subject[] = [];
  for (const s of vargaSubjects) for (let i = 0; i < s.weeklyPeriods; i++) queue.push(s);
  let qi = 0;
  for (let day = 0; day < 6; day++) {
    const busyGurus = new Set<string>();
    for (let p = 0; p < periodsPerDay; p++) {
      let placed = false;
      for (let tries = 0; tries < queue.length; tries++) {
        const s = queue[(qi + tries) % queue.length];
        const gid = s.guruId || '';
        if (gid && busyGurus.has(gid)) continue;
        slots.push({ day, period: p, subjectId: s.id, guruId: gid });
        if (gid) busyGurus.add(gid);
        qi = (qi + tries + 1) % queue.length;
        placed = true;
        break;
      }
      if (!placed && queue.length) {
        const s = queue[qi % queue.length];
        slots.push({ day, period: p, subjectId: s.id, guruId: s.guruId || '' });
        qi++;
      }
    }
  }
  return slots;
}

/* ------------------------- context ------------------------- */
interface PathshalaCtx {
  state: PathshalaState;
  workspaceId: string;
  add: <K extends EntityKey>(key: K, item: PathshalaState[K] extends Array<infer T> ? T : never) => void;
  update: <K extends EntityKey>(key: K, id: string, patch: Partial<PathshalaState[K] extends Array<infer T> ? T : never>) => void;
  remove: (key: EntityKey, id: string) => void;
  replace: (key: EntityKey, items: unknown[]) => void;
  setSettings: (patch: Partial<PathshalaSettings>) => void;
  setShishyaMeta: (studentId: string, patch: Partial<ShishyaMeta>) => void;
  ensureSeeded: (shishyaIds: string[]) => void;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  resetAll: () => void;
}

const Ctx = createContext<PathshalaCtx | null>(null);

export const PathshalaProvider: React.FC<{ workspaceId: string; children: React.ReactNode }> = ({ workspaceId, children }) => {
  const [state, setState] = useState<PathshalaState>(() => loadState(workspaceId));
  const wsRef = useRef(workspaceId);
  // Workspace switch → reload.
  useEffect(() => {
    if (wsRef.current !== workspaceId) { wsRef.current = workspaceId; setState(loadState(workspaceId)); }
  }, [workspaceId]);
  // Persist (device-local).
  useEffect(() => {
    try { localStorage.setItem(storageKey(wsRef.current), JSON.stringify(state)); } catch { /* quota */ }
  }, [state]);

  const api = useMemo<PathshalaCtx>(() => ({
    state, workspaceId,
    add: (key, item) => setState((s) => ({ ...s, [key]: [...(s[key] as unknown[]), item] })),
    update: (key, id, patch) => setState((s) => ({
      ...s,
      [key]: (s[key] as Array<{ id: string }>).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })),
    remove: (key, id) => setState((s) => ({
      ...s, [key]: (s[key] as Array<{ id: string }>).filter((r) => r.id !== id),
    })),
    replace: (key, items) => setState((s) => ({ ...s, [key]: items })),
    setSettings: (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    setShishyaMeta: (studentId, patch) => setState((s) => {
      const ex = s.shishyaMeta.find((m) => m.studentId === studentId);
      return {
        ...s,
        shishyaMeta: ex
          ? s.shishyaMeta.map((m) => (m.studentId === studentId ? { ...m, ...patch } : m))
          : [...s.shishyaMeta, { studentId, ...patch }],
      };
    }),
    ensureSeeded: (shishyaIds) => {
      // QUEUED #45 seed law: this seeder fabricates seed classes AND
      // 'present' attendance rows — in a real workspace that is fictitious
      // data masquerading as real (incl. attendance for real children).
      // Demo contexts only; a real gurukul's register starts EMPTY.
      if (!allowsSeedData(workspaceId)) return;
      setState((s) => {
      if (s.seededAt) {
        // Top-up: seed attendance/marks for shishyas never seen before.
        const known = new Set(s.upasthiti.map((u) => u.studentId));
        const fresh = shishyaIds.filter((id) => !known.has(id));
        if (!fresh.length) return s;
        const today = todayISO();
        const extra: UpasthitiRecord[] = fresh.map((sid) => ({
          id: uid('att'), date: today, vargaId: s.vargas[0]?.id || 'v_prathama', studentId: sid, status: 'present',
        }));
        return { ...s, upasthiti: [...s.upasthiti, ...extra] };
      }
      return buildSeed(shishyaIds);
      });
    },
    exportJSON: () => JSON.stringify({ exportedAt: new Date().toISOString(), workspaceId, state }, null, 2),
    importJSON: (json) => {
      try {
        const parsed = JSON.parse(json);
        const st = parsed.state || parsed;
        if (!st || !Array.isArray(st.vargas)) return false;
        setState({ ...EMPTY, ...st });
        return true;
      } catch { return false; }
    },
    resetAll: () => setState({ ...EMPTY }),
  }), [state, workspaceId]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
};

export function usePathshala(): PathshalaCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePathshala must be used inside PathshalaProvider');
  return c;
}
