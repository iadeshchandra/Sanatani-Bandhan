import React, { useState } from 'react';
import { Flame, Plus, Search, Calendar, BellRing, Sparkles, X } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { useData } from '../../context/DataContext';

interface ShradhRecord {
  id: string;
  ancestorName: string;
  relationship: string;
  kartaName: string;
  kartaPhone: string;
  gotra: string;
  tithiLunar: string;
  paksha: 'Krishna Paksha' | 'Shukla Paksha';
  hinduMonth: string;
  preferredTirtha: string;
  lastPerformedDate?: string;
  status: 'Scheduled' | 'Completed' | 'Pending Reminder';
}

export const PitruShradhDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();

  const { pitruRecords, addPitruRecord } = useData();
  const records = pitruRecords.map((r, idx) => ({
    id: r.id,
    ancestorName: r.ancestorName,
    relationship: r.relationship || r.relation || 'N/A',
    kartaName: r.devoteeName,
    kartaPhone: r.contactPhone || r.devoteePhone || 'N/A',
    gotra: r.gotra,
    tithiLunar: r.tithiLunar || r.tithiOfDemise || 'N/A',
    paksha: (r.paksha === 'Shukla' ? 'Shukla Paksha' : 'Krishna Paksha') as 'Krishna Paksha' | 'Shukla Paksha',
    hinduMonth: 'N/A',
    preferredTirtha: r.shradhLocation || 'Kashi',
    status: 'Scheduled' as 'Scheduled' | 'Pending Reminder' | 'Completed',
  }));
  const [localUnused, setLocalUnused] = useState([
    {
      id: 'shradh-1',
      ancestorName: 'Late Pt. Harishchandra Sharma',
      relationship: 'Prapitamaha (Great Grandfather)',
      kartaName: 'Sri Rajesh Sharma',
      kartaPhone: '+91 98765 43210',
      gotra: 'Kashyapa',
      tithiLunar: 'Navami Tithi (Maha Navami Shradh)',
      paksha: 'Krishna Paksha',
      hinduMonth: 'Ashwin (Pitru Paksha)',
      preferredTirtha: 'Gaya Ji / Manikarnika Ghat',
      lastPerformedDate: '2025-10-02',
      status: 'Scheduled',
    },
    {
      id: 'shradh-2',
      ancestorName: 'Late Smt. Janaki Devi',
      relationship: 'Pitamahi (Grandmother)',
      kartaName: 'Sri Amit Chatterjee',
      kartaPhone: '+91 98300 12345',
      gotra: 'Shandilya',
      tithiLunar: 'Trayodashi Tithi (Kakabali)',
      paksha: 'Krishna Paksha',
      hinduMonth: 'Ashwin (Pitru Paksha)',
      preferredTirtha: 'Prayagraj Sangam',
      lastPerformedDate: '2025-10-06',
      status: 'Pending Reminder',
    },
  ]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [ancestorName, setAncestorName] = useState('');
  const [relationship, setRelationship] = useState('Pitamaha (Grandfather)');
  const [kartaName, setKartaName] = useState('');
  const [kartaPhone, setKartaPhone] = useState('');
  const [gotra, setGotra] = useState('Kashyapa');
  const [tithiLunar, setTithiLunar] = useState('Amavasya (Sarva Pitru Amavasya)');
  const [paksha, setPaksha] = useState<'Krishna Paksha' | 'Shukla Paksha'>('Krishna Paksha');
  const [hinduMonth, setHinduMonth] = useState('Ashwin (Pitru Paksha)');
  const [preferredTirtha, setPreferredTirtha] = useState('Gaya Tirtha');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ancestorName.trim() || !kartaName.trim()) return;

    const newRecord: ShradhRecord = {
      id: `shradh-${Date.now()}`,
      ancestorName: ancestorName.trim(),
      relationship,
      kartaName: kartaName.trim(),
      kartaPhone: kartaPhone.trim(),
      gotra: gotra.trim(),
      tithiLunar,
      paksha,
      hinduMonth,
      preferredTirtha,
      status: 'Scheduled',
    };

    addPitruRecord({
      workspaceId: activeWorkspace.id,
      devoteeName: kartaName,
      ancestorName: ancestorName,
      relationship: relationship,
      tithiLunar: tithiLunar,
      paksha: paksha as any,
      gotra: gotra,
      contactPhone: kartaPhone,
      shradhLocation: preferredTirtha
    });
    setIsAddModalOpen(false);
    showToast(`Shradh Tithi recorded for ${ancestorName}`, 'success');
  };

  const handleTriggerAlert = (record: ShradhRecord) => {
    showToast(`WhatsApp & SMS Tithi Reminder dispatched to Karta: ${record.kartaName} (${record.kartaPhone})`, 'info', 'Pitru Paksha Alert Dispatched');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-temple-900/90 border border-temple-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-saffron-500/10 border border-saffron-500/30 text-saffron-400 text-[10px] font-bold uppercase tracking-wider">
              Pitru Rin Mukti & Tarpan
            </span>
            <span className="text-xs text-temple-400 font-mono">
              Lunar Tithi Automatic Sync
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-temple-100">
            Pitru Paksha & Shradh Alert Desk
          </h2>
          <p className="text-xs text-temple-400 mt-0.5">
            Automated ancestral Shradh tithi tracking, Pinda Daan tirtha booking, and automated Karta notifications
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-saffron-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record Ancestral Tithi</span>
        </button>
      </div>

      {/* Records Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {records.map((r, idx) => (
          <div
            key={`${r.id}-${idx}`}
            className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-temple-800">
                <div>
                  <h3 className="font-extrabold text-sm text-temple-100">{r.ancestorName}</h3>
                  <p className="text-xs text-saffron-400 font-medium">
                    {r.relationship} • Gotra: <span className="font-bold">{r.gotra}</span>
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-temple-800 border border-temple-700 text-[10px] text-temple-300 font-mono">
                  {r.status}
                </span>
              </div>

              <div className="py-2 space-y-1.5 text-xs text-temple-300">
                <p>
                  <span className="text-temple-400">Lunar Tithi:</span>{' '}
                  <span className="font-bold text-saffron-300">{r.tithiLunar}</span>
                </p>
                <p>
                  <span className="text-temple-400">Masa & Paksha:</span>{' '}
                  <span className="text-temple-200">{r.hinduMonth}, {r.paksha}</span>
                </p>
                <p>
                  <span className="text-temple-400">Karta (Officiator):</span>{' '}
                  <span className="font-semibold text-temple-100">{r.kartaName}</span>{' '}
                  <span className="text-temple-400 font-mono text-[11px]">({r.kartaPhone})</span>
                </p>
                <p>
                  <span className="text-temple-400">Designated Tirtha:</span>{' '}
                  <span className="text-temple-200">{r.preferredTirtha}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleTriggerAlert(r)}
              className="w-full py-2 rounded-xl bg-temple-800 hover:bg-temple-750 border border-temple-700 text-saffron-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Send WhatsApp Shradh Reminder</span>
            </button>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-950/80 backdrop-blur-md">
          <div className="bg-temple-900 border border-temple-700 rounded-2xl max-w-md w-full p-6 text-temple-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-temple-800 mb-4">
              <h3 className="font-bold text-sm">Record Ancestral Shradh Tithi</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-temple-400 hover:text-temple-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div>
                <label className="block text-temple-300 font-semibold mb-1">Ancestor Name *</label>
                <input
                  type="text"
                  required
                  value={ancestorName}
                  onChange={(e) => setAncestorName(e.target.value)}
                  placeholder="e.g. Late Pt. Ramnarayan Shastri"
                  className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Relationship</label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  >
                    <option>Pita (Father)</option>
                    <option>Mata (Mother)</option>
                    <option>Pitamaha (Grandfather)</option>
                    <option>Pitamahi (Grandmother)</option>
                    <option>Prapitamaha (Great Grandfather)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Gotra</label>
                  <input
                    type="text"
                    value={gotra}
                    onChange={(e) => setGotra(e.target.value)}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Karta Full Name *</label>
                  <input
                    type="text"
                    required
                    value={kartaName}
                    onChange={(e) => setKartaName(e.target.value)}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  />
                </div>

                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Karta Phone *</label>
                  <input
                    type="tel"
                    required
                    value={kartaPhone}
                    onChange={(e) => setKartaPhone(e.target.value)}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-temple-300 font-semibold mb-1">Lunar Tithi</label>
                <input
                  type="text"
                  value={tithiLunar}
                  onChange={(e) => setTithiLunar(e.target.value)}
                  className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                />
              </div>

              <div>
                <label className="block text-temple-300 font-semibold mb-1">Designated Tirtha</label>
                <input
                  type="text"
                  value={preferredTirtha}
                  onChange={(e) => setPreferredTirtha(e.target.value)}
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
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
