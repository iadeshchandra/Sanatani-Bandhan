import React, { useMemo } from 'react';
import {
  Sunrise, Moon, BookOpen, Award, Users, Flame, ChevronRight,
  GraduationCap, Library, Landmark, Sparkles,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { readParamparaCounts } from '../../lib/paramparaCounts';

/* ------------------------------------------------------------------ */
/* GurukulHome — the dedicated home for Gurukul / Vidyalaya workspaces */
/* R-1 (Gurukul vibe): the education experience must feel like a        */
/* traditional gurukul, not a school ERP. Deep maroon/amber, Sanskrit   */
/* headers with translations, CSS-only mandala/diya motifs (no assets). */
/* ------------------------------------------------------------------ */

interface DinacharyaSlot {
  time: string;
  startHour: number;
  endHour: number;
  sanskrit: string;
  label: string;
  detail: string;
}

const DINACHARYA: DinacharyaSlot[] = [
  { time: '04:00 – 05:30', startHour: 4, endHour: 5.5, sanskrit: 'ब्राह्ममुहूर्त', label: 'Brahma-muhurta', detail: 'Japa, dhyana & Veda smarana' },
  { time: '05:30 – 06:30', startHour: 5.5, endHour: 6.5, sanskrit: 'स्नान-संध्या', label: 'Snana & Pratah Sandhyavandanam', detail: 'Snanam, sandhya, surya-namaskara' },
  { time: '06:30 – 08:00', startHour: 6.5, endHour: 8, sanskrit: 'वेदपाठ', label: 'Veda Patha (Svadhyaya)', detail: 'Morning recitation with Acharya' },
  { time: '08:00 – 09:00', startHour: 8, endHour: 9, sanskrit: 'गोसेवा', label: 'Gau-seva & Prasada', detail: 'Serving gomata, then anna-prasada' },
  { time: '09:00 – 13:00', startHour: 9, endHour: 13, sanskrit: 'शास्त्रवर्ग', label: 'Pathyakram — Shastra Varga', detail: 'Vyakarana, Nyaya, Mimamsa classes' },
  { time: '13:00 – 15:00', startHour: 13, endHour: 15, sanskrit: 'मध्याह्न', label: 'Madhyahna Sandhya & Vishrama', detail: 'Midday sandhya, rest, svadhyaya' },
  { time: '15:00 – 18:00', startHour: 15, endHour: 18, sanskrit: 'कण्ठस्थाभ्यास', label: 'Kanthastha Abhyasa', detail: 'Memorization & Ghana-patha practice' },
  { time: '18:00 – 19:30', startHour: 18, endHour: 19.5, sanskrit: 'सायंसंध्या', label: 'Sayam Sandhya & Agnihotra', detail: 'Evening sandhya, homa, arati' },
  { time: '19:30 – 21:00', startHour: 19.5, endHour: 21, sanskrit: 'सत्संग', label: 'Satsang / Katha', detail: 'Itihasa-Purana katha with Gurus' },
];

interface Parva {
  name: string;
  sanskrit: string;
  date: string; // ISO
  note: string;
}

/** Traditional observances relevant to gurukul life (tithi-based, indicative). */
const PARVAS: Parva[] = [
  { name: 'Deepavali', sanskrit: 'दीपावलिः', date: '2026-11-08', note: 'Kartika Amavasya — deepa-dana & Lakshmi-puja' },
  { name: 'Govardhan Puja', sanskrit: 'गोवर्धनपूजा', date: '2026-11-09', note: 'Gau-puja & Annakuta — special for brahmacharis' },
  { name: 'Kartika Purnima', sanskrit: 'कार्तिकपूर्णिमा', date: '2026-11-24', note: 'Dev-Deepavali — Veda parayana at the ghat' },
  { name: 'Gita Jayanti', sanskrit: 'गीताजयन्ती', date: '2026-12-19', note: 'Margashirsha Shukla Ekadashi — mass Gita patha' },
  { name: 'Makara Sankranti', sanskrit: 'मकरसंक्रान्तिः', date: '2027-01-14', note: 'Uttarayana — new adhyayana session begins' },
  { name: 'Vasant Panchami', sanskrit: 'वसन्तपञ्चमी', date: '2027-01-23', note: 'Saraswati-puja — Vidyarambha for new shishya' },
  { name: 'Maha Shivaratri', sanskrit: 'महाशिवरात्रिः', date: '2027-03-07', note: 'Ratri-jagarana with Rudra parayana' },
];

const VARGA_META: Array<{ key: string; sanskrit: string; translation: string }> = [
  { key: 'Prathama (Grammar)', sanskrit: 'प्रथमा', translation: 'Grammar & Ashtadhyayi' },
  { key: 'Madhyama (Shastras)', sanskrit: 'मध्यमा', translation: 'Shastras & Suktas' },
  { key: 'Shastri (Philosophy)', sanskrit: 'शास्त्री', translation: 'Philosophy & Karmakanda' },
  { key: 'Acharya (Vedanta)', sanskrit: 'आचार्य', translation: 'Vedanta & Ghana-patha' },
];

const fmtDate = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const GurukulHome: React.FC<{ onNavigate: (id: string) => void }> = ({ onNavigate }) => {
  const { gurukulStudents } = useData();
  const { activeWorkspace } = useAuthWorkspace();

  const nowHour = new Date().getHours() + new Date().getMinutes() / 60;
  const currentSlot = DINACHARYA.find((s) => nowHour >= s.startHour && nowHour < s.endHour);

  const vargaCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of gurukulStudents) counts[s.courseLevel] = (counts[s.courseLevel] || 0) + 1;
    return counts;
  }, [gurukulStudents]);
  const totalShishya = gurukulStudents.length || 1;

  const leaderboard = useMemo(
    () =>
      [...gurukulStudents]
        .sort((a, b) => (b.shlokaRecitationScore || 0) - (a.shlokaRecitationScore || 0))
        .slice(0, 5),
    [gurukulStudents]
  );

  // QUEUED #59 (A4-3): the Parampara figures come from the register
  // that actually holds them — Pathshala One's suite store (its gurus
  // are the acharyas; its parikshas are the examinations held). The
  // old code read a dead legacy key (`sb_gurukul_exams_<ws>`, which
  // the current suite never writes) and floored the Acharya count at
  // 3 — an invented lineage. Real register or honest zero, nothing else.
  const parampara = useMemo(() => {
    const counts = readParamparaCounts(activeWorkspace.id);
    return { acharyaCount: counts.acharyaCount, parikshas: counts.parikshaCount };
  }, [activeWorkspace.id]);

  const upcomingParvas = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return PARVAS.filter((p) => p.date >= today).slice(0, 4);
  }, []);

  const quickLinks = [
    { id: 'gurukul', label: 'Shishya Registry', sub: 'Dinacharya & pariksha', icon: GraduationCap },
    { id: 'gurukulAcademy', label: 'Shastric Academy', sub: 'Varga & grading', icon: BookOpen },
    { id: 'granthLibrary', label: 'Granth Library', sub: 'Shastras & manuscripts', icon: Library },
    { id: 'treasury', label: 'Treasury', sub: 'Vidya Danam & vyaya', icon: Landmark },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Masthead — deep maroon, CSS mandala motif */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#3d0f1e] via-[#5c1a2a] to-[#7c2d12] p-6 sm:p-8 text-amber-50 shadow-xl">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 w-72 h-72 rounded-full opacity-25"
          style={{
            background:
              'repeating-conic-gradient(from 0deg, #f59e0b 0deg 6deg, transparent 6deg 18deg)',
            maskImage: 'radial-gradient(circle, black 30%, transparent 68%)',
            WebkitMaskImage: 'radial-gradient(circle, black 30%, transparent 68%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 -bottom-20 w-56 h-56 rounded-full opacity-20 blur-2xl"
          style={{ background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)' }}
        />
        <div className="relative">
          <p className="font-serif text-3xl sm:text-4xl text-amber-200">गुरुकुलम्</p>
          <h2 className="mt-1 text-lg sm:text-xl font-bold tracking-tight">
            Gurukulam — <span className="font-medium text-amber-100/90">the residential seat of Vedic learning</span>
          </h2>
          <p className="mt-2 text-xs text-amber-100/80 max-w-xl leading-relaxed">
            आचार्याद्धैव विद्या विदिता — "Knowledge is truly known only through the Acharya."
            Today's dinacharya, pathyakram and kanthastha — one glance.
          </p>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickLinks.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => onNavigate(q.id)}
                className="flex items-center gap-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-amber-200/20 px-3.5 py-3 text-left transition-colors cursor-pointer min-h-[56px]"
              >
                <q.icon className="w-5 h-5 text-amber-300 shrink-0" />
                <span>
                  <span className="block text-xs font-bold text-amber-50">{q.label}</span>
                  <span className="block text-[10px] text-amber-100/70">{q.sub}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dinacharya timeline */}
        <section className="lg:col-span-2 rounded-3xl bg-[#fffaf0] border border-amber-200/60 p-5 sm:p-6 shadow-sm">
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="font-serif text-xl font-bold text-[#5c1a2a]">
              दिनचर्या <span className="text-sm font-sans font-semibold text-stone-500">· Daily routine</span>
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
              Brahma-muhurta → Sandhya
            </span>
          </div>
          <p className="text-[11px] text-stone-500 mb-4">The shishya's day, as ordained by the shastras.</p>
          <ol className="relative border-l-2 border-amber-200/70 ml-2 space-y-1">
            {DINACHARYA.map((slot) => {
              const active = currentSlot?.label === slot.label;
              return (
                <li key={slot.label} className="relative pl-6 py-2">
                  <span
                    className={`absolute -left-[7px] top-3 w-3 h-3 rounded-full border-2 ${
                      active ? 'bg-amber-500 border-amber-700 shadow-[0_0_8px_#f59e0b]' : 'bg-amber-100 border-amber-300'
                    }`}
                  />
                  <div
                    className={`rounded-2xl px-4 py-2.5 transition-colors ${
                      active ? 'bg-amber-500/15 border border-amber-400/50' : 'hover:bg-amber-500/5'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span className="font-mono text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                        {slot.time}
                      </span>
                      <span className="font-serif text-sm font-bold text-[#5c1a2a]">{slot.sanskrit}</span>
                      <span className="text-xs font-bold text-stone-700">{slot.label}</span>
                      {active && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-200/70 px-2 py-0.5 rounded-full">
                          ● Now
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">{slot.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Parampara + Parvas */}
        <section className="flex flex-col gap-6">
          <div className="rounded-3xl bg-gradient-to-br from-[#3d0f1e] to-[#5c1a2a] p-5 text-amber-50 shadow-sm relative overflow-hidden">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -bottom-10 w-40 h-40 rounded-full opacity-20"
              style={{
                background: 'repeating-conic-gradient(from 0deg, #f59e0b 0deg 8deg, transparent 8deg 24deg)',
                maskImage: 'radial-gradient(circle, black 30%, transparent 70%)',
                WebkitMaskImage: 'radial-gradient(circle, black 30%, transparent 70%)',
              }}
            />
            <h3 className="font-serif text-lg font-bold text-amber-200 relative">
              परम्परा <span className="text-xs font-sans font-semibold text-amber-100/70">· Guru–Shishya lineage</span>
            </h3>
            <div className="mt-3 grid grid-cols-3 gap-2 relative">
              <div className="rounded-2xl bg-white/10 border border-amber-200/20 p-3 text-center">
                <Users className="w-4 h-4 mx-auto text-amber-300 mb-1" />
                <p className="text-2xl font-black">{gurukulStudents.length}</p>
                <p className="text-[9px] uppercase tracking-widest text-amber-100/70 font-bold">Shishya</p>
              </div>
              <div className="rounded-2xl bg-white/10 border border-amber-200/20 p-3 text-center">
                <Flame className="w-4 h-4 mx-auto text-amber-300 mb-1" />
                <p className="text-2xl font-black">{parampara.acharyaCount}</p>
                <p className="text-[9px] uppercase tracking-widest text-amber-100/70 font-bold">Acharya</p>
              </div>
              <div className="rounded-2xl bg-white/10 border border-amber-200/20 p-3 text-center">
                <Award className="w-4 h-4 mx-auto text-amber-300 mb-1" />
                <p className="text-2xl font-black">{parampara.parikshas}</p>
                <p className="text-[9px] uppercase tracking-widest text-amber-100/70 font-bold">Pariksha</p>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-amber-100/70 relative leading-relaxed">
              Every shishya learns at a Guru's feet; every pariksha is examined by an Acharya with swara assessment.
            </p>
          </div>

          <div className="rounded-3xl bg-[#fffaf0] border border-amber-200/60 p-5 shadow-sm">
            <h3 className="font-serif text-lg font-bold text-[#5c1a2a]">
              उत्सव-पर्व <span className="text-xs font-sans font-semibold text-stone-500">· Upcoming observances</span>
            </h3>
            <ul className="mt-3 space-y-2.5">
              {upcomingParvas.map((p) => (
                <li key={p.date} className="flex items-start gap-3 rounded-2xl bg-white/70 border border-amber-100 px-3.5 py-2.5">
                  <span className="font-serif text-base text-amber-700 leading-none mt-0.5">🪔</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-800">
                      <span className="font-serif">{p.sanskrit}</span> · {p.name}
                      <span className="ml-2 font-mono text-[10px] font-bold text-amber-700">{fmtDate(p.date)}</span>
                    </p>
                    <p className="text-[11px] text-stone-500 truncate">{p.note}</p>
                  </div>
                </li>
              ))}
              {upcomingParvas.length === 0 && (
                <li className="text-xs text-stone-500">No upcoming parvas in the almanac window.</li>
              )}
            </ul>
            <button
              type="button"
              onClick={() => onNavigate('utsavPanjika')}
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
            >
              Open Utsav Panjika <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pathyakram progress */}
        <section className="rounded-3xl bg-[#fffaf0] border border-amber-200/60 p-5 sm:p-6 shadow-sm">
          <h3 className="font-serif text-xl font-bold text-[#5c1a2a]">
            पाठ्यक्रम <span className="text-sm font-sans font-semibold text-stone-500">· Curriculum by Varga</span>
          </h3>
          <p className="text-[11px] text-stone-500 mb-4 mt-0.5">Shishya distribution across the four varga (levels).</p>
          <div className="space-y-3.5">
            {VARGA_META.map((v) => {
              const count = vargaCounts[v.key] || 0;
              const pct = Math.round((count / totalShishya) * 100);
              return (
                <div key={v.key}>
                  <div className="flex items-baseline justify-between text-xs mb-1">
                    <span className="font-bold text-stone-700">
                      <span className="font-serif text-amber-800">{v.sanskrit}</span>
                      {' · '}{v.translation}
                    </span>
                    <span className="font-mono font-bold text-stone-600">{count} shishya</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-amber-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#7c2d12] via-amber-600 to-amber-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => onNavigate('gurukulAcademy')}
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
          >
            Open Shastric Academy <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </section>

        {/* Kanthastha leaderboard */}
        <section className="rounded-3xl bg-[#fffaf0] border border-amber-200/60 p-5 sm:p-6 shadow-sm">
          <h3 className="font-serif text-xl font-bold text-[#5c1a2a]">
            कण्ठस्थ <span className="text-sm font-sans font-semibold text-stone-500">· Memorization leaderboard</span>
          </h3>
          <p className="text-[11px] text-stone-500 mb-4 mt-0.5">Shloka recitation scores — the heart of oral tradition.</p>
          {leaderboard.length === 0 ? (
            <p className="text-xs text-stone-500">No shishya enrolled yet — the leaderboard awaits its first voice.</p>
          ) : (
            <ol className="space-y-2">
              {leaderboard.map((s, i) => (
                <li
                  key={s.id}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 border ${
                    i === 0
                      ? 'bg-amber-500/15 border-amber-400/60'
                      : 'bg-white/70 border-amber-100'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      i === 0
                        ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-stone-800 truncate">{s.studentName}</p>
                    <p className="text-[10px] text-stone-500 font-mono">{s.rollNo} · {s.courseLevel}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-[#5c1a2a]">{s.shlokaRecitationScore}<span className="text-[10px] font-bold text-stone-400">/100</span></p>
                    <p className="text-[9px] uppercase tracking-widest text-amber-700 font-bold flex items-center gap-1 justify-end">
                      <Sparkles className="w-2.5 h-2.5" /> Kanthastha
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <button
            type="button"
            onClick={() => onNavigate('gurukul')}
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
          >
            Open Shishya Registry <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </section>
      </div>

      {/* Dawn invocation strip */}
      <div className="rounded-3xl border border-amber-200/60 bg-gradient-to-r from-amber-50 via-[#fffaf0] to-amber-50 px-6 py-4 flex items-center gap-4 shadow-sm">
        <span className="text-2xl" aria-hidden>🪔</span>
        <p className="text-xs text-stone-600 leading-relaxed">
          <span className="font-serif font-bold text-[#5c1a2a]">गुरुकुलवासः — </span>
          the shishya rises at brahma-muhurta, serves the Guru and the gomata, and carries the Veda on the tongue.
          This home mirrors that day: <strong>Dinacharya</strong> (routine), <strong>Pathyakram</strong> (curriculum),{' '}
          <strong>Kanthastha</strong> (memorization) and <strong>Parampara</strong> (lineage).
        </p>
        <Sunrise className="w-5 h-5 text-amber-600 shrink-0 ml-auto" aria-hidden />
      </div>
    </div>
  );
};

export default GurukulHome;
