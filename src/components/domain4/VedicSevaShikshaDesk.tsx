import React, { useState } from 'react';
import { BookOpen, Plus, Award, User, Sparkles, GraduationCap, CheckCircle2, X } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { useData } from '../../context/DataContext';

interface Vidyarthi {
  id: string;
  name: string;
  vedaShakha: string;
  entryYear: number;
  currentKanda: string;
  acharyaMentor: string;
  recitationGrade: 'A+' | 'A' | 'B+';
  monthlySponsorshipCost: number;
  sponsorName?: string;
}

export const VedicSevaShikshaDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();

  const { gurukulStudents, addGurukulStudent } = useData();
  const students = gurukulStudents.map((s, idx) => ({
    id: s.id,
    name: s.studentName,
    vedaShakha: s.courseLevel,
    entryYear: 2026,
    currentKanda: 'N/A',
    acharyaMentor: 'Acharya',
    recitationGrade: 'A' as any,
    monthlySponsorshipCost: 2100,
    sponsorName: undefined
  }));
  const [localUnused, setLocalUnused] = useState([
    {
      id: 'vid-1',
      name: 'Vidyarthi Chinmay Joshi',
      vedaShakha: 'Shukla Yajurveda',
      entryYear: 2022,
      currentKanda: 'Rudradhyaya & Chamakam Parayanam',
      acharyaMentor: 'Acharya Vidyadhar Shastri',
      recitationGrade: 'A+',
      monthlySponsorshipCost: 4500,
      sponsorName: 'Sri Raghav Sharma',
    },
    {
      id: 'vid-2',
      name: 'Vidyarthi Madhavan Nair',
      vedaShakha: 'Samaveda (Kauthuma)',
      entryYear: 2023,
      currentKanda: 'Gramageya Gana Chapter 4',
      acharyaMentor: 'Dr. Raghavan Namboodiri',
      recitationGrade: 'A',
      monthlySponsorshipCost: 4500,
      sponsorName: undefined,
    },
    {
      id: 'vid-3',
      name: 'Vidyarthi Someshwar Dixit',
      vedaShakha: 'Rigveda (Shakala)',
      entryYear: 2024,
      currentKanda: 'Mandala 1 Suktas 1-20 (Agnimeele Purohitam)',
      acharyaMentor: 'Pandit Somnath Dwivedi',
      recitationGrade: 'A+',
      monthlySponsorshipCost: 4500,
      sponsorName: undefined,
    },
  ]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [vedaShakha, setVedaShakha] = useState('Shukla Yajurveda');
  const [currentKanda, setCurrentKanda] = useState('Purusha Suktam');
  const [acharyaMentor, setAcharyaMentor] = useState('Acharya Vidyadhar Shastri');

  const handleAddVidyarthi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newStudent: Vidyarthi = {
      id: `vid-${Date.now()}`,
      name: name.trim(),
      vedaShakha,
      entryYear: new Date().getFullYear(),
      currentKanda: currentKanda.trim(),
      acharyaMentor: acharyaMentor.trim(),
      recitationGrade: 'A',
      monthlySponsorshipCost: 4500,
    };

    addGurukulStudent({
      workspaceId: activeWorkspace.id,
      studentName: name.trim(),
      rollNo: `GUK-${Date.now().toString().slice(-4)}`,
      courseLevel: 'Prathama (Grammar)',
      sandhyaVandanaRegularity: 100,
      shlokaRecitationScore: 95,
      guardianName: 'N/A',
      guardianPhone: 'N/A',
      attendancePct: 100
    });
    setIsAddModalOpen(false);
    showToast(`Vidyarthi ${name} enrolled into Gurukul Registry!`, 'success');
  };

  const handleSponsor = (vid: Vidyarthi) => {
    showToast(`Sponsorship portal linked for ${vid.name} (₹${vid.monthlySponsorshipCost}/mo)`, 'info', 'Veda Pathshala Seva');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-temple-900/90 border border-temple-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-saffron-500/10 border border-saffron-500/30 text-saffron-400 text-[10px] font-bold uppercase tracking-wider">
              Veda Pathshala & Gurukul Census
            </span>
            <span className="text-xs text-temple-400 font-mono">
              {students.length} Residential Brahmacharis
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-temple-100">
            Vedic Gurukul & Shastra Education Desk
          </h2>
          <p className="text-xs text-temple-400 mt-0.5">
            Oral tradition preservation, Veda Shakha syllabus tracking, and monthly Vidyarthi Vidya Danam
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-saffron-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Enroll New Vidyarthi</span>
        </button>
      </div>

      {/* Vidyarthi Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map((st, idx) => (
          <div
            key={`${st.id}-${idx}`}
            className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-temple-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-saffron-500/20 border border-saffron-500/30 flex items-center justify-center text-saffron-400 font-bold">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-temple-100">{st.name}</h3>
                    <p className="text-xs text-saffron-400 font-medium">{st.vedaShakha}</p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                  Grade {st.recitationGrade}
                </span>
              </div>

              <div className="py-2 space-y-1.5 text-xs text-temple-300">
                <p>
                  <span className="text-temple-400">Current Kanda / Sukta:</span>{' '}
                  <span className="font-semibold text-temple-100">{st.currentKanda}</span>
                </p>
                <p>
                  <span className="text-temple-400">Guru Mentor:</span>{' '}
                  <span className="text-temple-200">{st.acharyaMentor}</span>
                </p>
                <p>
                  <span className="text-temple-400">Enrolled Year:</span>{' '}
                  <span className="font-mono text-temple-300">{st.entryYear}</span>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-temple-950/60 border border-temple-800 text-xs">
                {st.sponsorName ? (
                  <div>
                    <p className="text-[10px] text-emerald-400 uppercase font-bold">Vidya Danam Sponsor</p>
                    <p className="font-bold text-temple-100 mt-0.5">{st.sponsorName}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[10px] text-saffron-400 uppercase font-bold">Needs Vidya Danam Patron</p>
                    <p className="text-temple-300 text-[11px]">₹{st.monthlySponsorshipCost}/mo (Food & Books)</p>
                  </div>
                )}
              </div>
            </div>

            {!st.sponsorName && (
              <button
                type="button"
                onClick={() => handleSponsor(st)}
                className="w-full py-2 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-saffron-600/20 transition-all cursor-pointer"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Sponsor Vidyarthi Education</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-950/80 backdrop-blur-md">
          <div className="bg-temple-900 border border-temple-700 rounded-2xl max-w-md w-full p-6 text-temple-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-temple-800 mb-4">
              <h3 className="font-bold text-sm">Enroll New Gurukul Vidyarthi</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-temple-400 hover:text-temple-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddVidyarthi} className="space-y-3 text-xs">
              <div>
                <label className="block text-temple-300 font-semibold mb-1">Vidyarthi Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vidyarthi Shrirang Shastri"
                  className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                />
              </div>

              <div>
                <label className="block text-temple-300 font-semibold mb-1">Veda Shakha</label>
                <select
                  value={vedaShakha}
                  onChange={(e) => setVedaShakha(e.target.value)}
                  className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                >
                  <option>Shukla Yajurveda (Madhyandina)</option>
                  <option>Krishna Yajurveda (Taittiriya)</option>
                  <option>Rigveda (Shakala)</option>
                  <option>Samaveda (Kauthuma / Jaiminiya)</option>
                  <option>Atharvaveda (Shaunaka)</option>
                </select>
              </div>

              <div>
                <label className="block text-temple-300 font-semibold mb-1">Current Syllabus / Kanda</label>
                <input
                  type="text"
                  value={currentKanda}
                  onChange={(e) => setCurrentKanda(e.target.value)}
                  className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                />
              </div>

              <div>
                <label className="block text-temple-300 font-semibold mb-1">Assigned Guru Mentor</label>
                <input
                  type="text"
                  value={acharyaMentor}
                  onChange={(e) => setAcharyaMentor(e.target.value)}
                  className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-temple-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-temple-800 text-temple-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold"
                >
                  Save Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
