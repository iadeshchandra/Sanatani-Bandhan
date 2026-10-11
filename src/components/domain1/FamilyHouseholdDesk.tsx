import React, { useState } from 'react';
import { Home, Plus, Users, Phone, MapPin, Sparkles, Heart, ChevronRight, X } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { MemberSearchSelect } from '../common/MemberSearchSelect';

export const FamilyHouseholdDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const { families, devotees, addFamily } = useData();
  const { showToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [kartaDevoteeId, setKartaDevoteeId] = useState('');
  const [gotra, setGotra] = useState('Shandilya');
  const [kuladevata, setKuladevata] = useState('Mata Annapurna Devi');
  const [residenceAddress, setResidenceAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');

  const handleKartaChange = (id: string) => {
    setKartaDevoteeId(id);
    const d = devotees.find((item) => item.id === id);
    if (d) {
      if (!familyName) setFamilyName(`${d.fullName.split(' ')[1] || d.fullName} Kul Parivar`);
      setGotra(d.gotra);
      setContactPhone(d.phone);
      if (d.address) setResidenceAddress(d.address);
    }
  };

  const handleAddFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim() || !kartaDevoteeId) {
      showToast('Family name and Karta selection are required', 'warning');
      return;
    }

    addFamily({
      workspaceId: activeWorkspace.id,
      familyName: familyName.trim(),
      kartaDevoteeId,
      gotra: gotra.trim(),
      kuladevata: kuladevata.trim(),
      residenceAddress: residenceAddress.trim(),
      contactPhone: contactPhone.trim(),
      memberIds: [kartaDevoteeId],
      totalFamilyDonations: 0,
      notes: notes.trim(),
    });

    setIsAddModalOpen(false);
    setFamilyName('');
    setKartaDevoteeId('');
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-temple-900/90 border border-temple-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-saffron-500/10 border border-saffron-500/30 text-saffron-400 text-[10px] font-bold uppercase tracking-wider">
              Kul Parivar Registry
            </span>
            <span className="text-xs text-temple-400 font-mono">
              {families.length} Registered Households
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-temple-100">
            Household & Family Census Desk
          </h2>
          <p className="text-xs text-temple-400 mt-0.5">
            Group individual devotees into joint households under ancestral Gotra & Kuladevata
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-saffron-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Household</span>
        </button>
      </div>

      {/* Household Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {families.map((fam, idx) => {
          const karta = devotees.find((d) => d.id === fam.kartaDevoteeId);

          return (
            <div
              key={`${fam.id}-${idx}`}
              className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg space-y-4"
            >
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-temple-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-saffron-500/10 border border-saffron-500/30 flex items-center justify-center text-saffron-400">
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-temple-100">{fam.familyName}</h3>
                    <p className="text-xs text-saffron-400 font-medium">
                      Gotra: <span className="font-bold">{fam.gotra}</span> • Kuladevata: {fam.kuladevata}
                    </p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full bg-temple-800 border border-temple-700 text-[10px] font-mono text-temple-300">
                  {fam.memberIds.length} Members
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-temple-300">
                <p>
                  <span className="text-temple-400">Head of Household (Karta):</span>{' '}
                  <span className="font-bold text-temple-100">
                    {karta?.fullName || 'Sri Karta'}
                  </span>
                </p>
                <p>
                  <span className="text-temple-400">Contact Phone:</span>{' '}
                  <span className="font-mono text-saffron-400">{fam.contactPhone}</span>
                </p>
                <p>
                  <span className="text-temple-400">Residence Address:</span>{' '}
                  <span className="text-temple-200">{fam.residenceAddress}</span>
                </p>
                {fam.notes && (
                  <p className="text-[11px] text-temple-400 italic pt-1 border-t border-temple-800/60">
                    "{fam.notes}"
                  </p>
                )}
              </div>

              {/* Family Seva Stats */}
              <div className="p-3 rounded-xl bg-temple-950/60 border border-temple-800 flex items-center justify-between text-xs">
                <div>
                  <p className="text-[10px] text-temple-400 uppercase font-semibold">Cumulative Chanda</p>
                  <p className="font-black text-saffron-400 text-sm">
                    ₹{(fam.totalFamilyDonations || (karta ? karta.totalDonated : 0)).toLocaleString()}
                  </p>
                </div>
                {fam.lastChandaDate && (
                  <div className="text-right">
                    <p className="text-[10px] text-temple-400 uppercase font-semibold">Last Seva Date</p>
                    <p className="font-mono text-temple-300 text-[11px]">{fam.lastChandaDate}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-950/80 backdrop-blur-md">
          <div className="bg-temple-900 border border-temple-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-temple-100">
            <div className="flex items-center justify-between pb-3 border-b border-temple-800 mb-4">
              <h3 className="font-bold text-sm">Register Kul Parivar (Household)</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-temple-400 hover:text-temple-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddFamily} className="space-y-3 text-xs">
              <div>
                <label className="block text-temple-300 font-semibold mb-1">Select Karta (Head of Family) *</label>
                <MemberSearchSelect
                  value=""
                  onChange={(name, id) => handleKartaChange(id)}
                  placeholder="Search and select existing enrolled member..."
                  allowFreeText={false}
                />
              </div>

              <div>
                <label className="block text-temple-300 font-semibold mb-1">Family Title / Household Name *</label>
                <input
                  type="text"
                  required
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="e.g. Shastri Parivar (Kashi)"
                  className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Ancestral Gotra</label>
                  <input
                    type="text"
                    value={gotra}
                    onChange={(e) => setGotra(e.target.value)}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  />
                </div>
                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Kuladevata</label>
                  <input
                    type="text"
                    value={kuladevata}
                    onChange={(e) => setKuladevata(e.target.value)}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-temple-300 font-semibold mb-1">Residence Address</label>
                <input
                  type="text"
                  value={residenceAddress}
                  onChange={(e) => setResidenceAddress(e.target.value)}
                  className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                />
              </div>

              <div>
                <label className="block text-temple-300 font-semibold mb-1">Historical Notes / Ancestral Village</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
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
                  Save Household
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
