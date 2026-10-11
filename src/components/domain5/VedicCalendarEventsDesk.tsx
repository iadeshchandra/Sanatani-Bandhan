import React, { useState } from 'react';
import { Calendar, Plus, MapPin, Users, Sparkles, Clock, CheckCircle2, X, Download } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';

interface UtsavEvent {
  id: string;
  title: string;
  tithi: string;
  startDate: string;
  endDate: string;
  expectedFootfall: number;
  chiefCoordinator: string;
  budgetAllocated: number;
  highlights: string[];
}

export const VedicCalendarEventsDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();

  const [events, setEvents] = useState<UtsavEvent[]>([
    {
      id: 'event-1',
      title: 'Maha Shivaratri & Rudra Maha Yajna',
      tithi: 'Phalguna Krishna Chaturdashi',
      startDate: '2027-03-07',
      endDate: '2027-03-08',
      expectedFootfall: 50000,
      chiefCoordinator: 'Sri Raghavendra Shastri',
      budgetAllocated: 250000,
      highlights: ['Char Prahar Continuous Abhishekam', '108 Pandit Vedic Chanting', 'Continuous 24-hr Prasadam'],
    },
    {
      id: 'event-2',
      title: 'Sri Krishna Janmashtami & Nandotsav',
      tithi: 'Bhadrapada Krishna Ashtami (Rohini Nakshatra)',
      startDate: '2026-09-04',
      endDate: '2026-09-05',
      expectedFootfall: 35000,
      chiefCoordinator: 'Sri Aloknath Mukherjee',
      budgetAllocated: 180000,
      highlights: ['Midnight Maha Arati', 'Matki Phod Utsav', 'Chappan Bhog Samaroh'],
    },
    {
      id: 'event-3',
      title: 'Sri Rama Navami Brahmotsavam',
      tithi: 'Chaitra Shukla Navami',
      startDate: '2027-04-15',
      endDate: '2027-04-16',
      expectedFootfall: 40000,
      chiefCoordinator: 'Pandit Somnath Dwivedi',
      budgetAllocated: 200000,
      highlights: ['Sita-Rama Kalyanam', 'Akhand Ramacharitmanas Path', 'Shobha Yatra'],
    },
  ]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [tithi, setTithi] = useState('');
  const [startDate, setStartDate] = useState('2026-10-20');
  const [expectedFootfall, setExpectedFootfall] = useState<number>(25000);
  const [chiefCoordinator, setChiefCoordinator] = useState('Chief Sevadar');
  const [budgetAllocated, setBudgetAllocated] = useState<number>(150000);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newEvent: UtsavEvent = {
      id: `event-${Date.now()}`,
      title: title.trim(),
      tithi: tithi.trim() || 'Shukla Paksha',
      startDate,
      endDate: startDate,
      expectedFootfall: Number(expectedFootfall),
      chiefCoordinator: chiefCoordinator.trim(),
      budgetAllocated: Number(budgetAllocated),
      highlights: ['Special Darshan & Aarti', 'Prasadam Distribution'],
    };

    setEvents([newEvent, ...events]);
    setIsAddModalOpen(false);
    showToast(`Utsav ${title} added to Temple Calendar!`, 'success');
  };

  const handleExportICS = (ev: UtsavEvent) => {
    const formatDate = (dateStr: string) => dateStr.replace(/-/g, '');

    const startDate = formatDate(ev.startDate);
    const endDateObj = new Date(ev.endDate);
    endDateObj.setDate(endDateObj.getDate() + 1);
    const endDate = endDateObj.toISOString().split('T')[0].replace(/-/g, '');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Sanatani Bandhan//Vedic Calendar//EN',
      'BEGIN:VEVENT',
      `UID:${ev.id}@sanatanibandhan.org`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART;VALUE=DATE:${startDate}`,
      `DTEND;VALUE=DATE:${endDate}`,
      `SUMMARY:${ev.title}`,
      `DESCRIPTION:Tithi: ${ev.tithi}\\nCoordinator: ${ev.chiefCoordinator}\\nHighlights: ${ev.highlights.join(', ')}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\\r\\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${ev.title.replace(/\\s+/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Calendar invite for ${ev.title} downloaded!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-temple-900/90 border border-temple-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-saffron-500/10 border border-saffron-500/30 text-saffron-400 text-[10px] font-bold uppercase tracking-wider">
              Utsav & Mahotsav Planner
            </span>
            <span className="text-xs text-temple-400 font-mono">
              {events.length} Major Annual Festivals
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-temple-100">
            Vedic Festival & Mahotsav Calendar Desk
          </h2>
          <p className="text-xs text-temple-400 mt-0.5">
            Coordinate pilgrim footfall, security barriers, Bhandara budgets, and seva shift assignments
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-saffron-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule New Utsav</span>
        </button>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {events.map((ev, idx) => (
          <div
            key={`${ev.id}-${idx}`}
            className="bg-temple-900/90 border border-temple-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-temple-800">
                <div>
                  <span className="text-[10px] font-bold text-saffron-400 uppercase">
                    {ev.tithi}
                  </span>
                  <h3 className="font-extrabold text-base text-temple-100 mt-1">{ev.title}</h3>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-temple-300 block">{ev.startDate}</span>
                </div>
              </div>

              <div className="py-2 space-y-1.5 text-xs text-temple-300">
                <p>
                  <span className="text-temple-400">Expected Footfall:</span>{' '}
                  <span className="font-bold text-saffron-400">~{(ev.expectedFootfall || 0).toLocaleString()} Devotees</span>
                </p>
                <p>
                  <span className="text-temple-400">Chief Coordinator:</span>{' '}
                  <span className="text-temple-100">{ev.chiefCoordinator}</span>
                </p>
                <p>
                  <span className="text-temple-400">Budget:</span>{' '}
                  <span className="font-mono text-emerald-400 font-bold">₹{(ev.budgetAllocated || 0).toLocaleString()}</span>
                </p>

                <div className="pt-2">
                  <span className="text-temple-400 text-[10px] uppercase font-bold block mb-1">Key Highlights:</span>
                  <ul className="space-y-1">
                    {ev.highlights.map((h, i) => (
                      <li key={i} className="text-[11px] text-temple-300 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-saffron-500 shrink-0" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-temple-800 flex items-center justify-between text-xs">
              <span className="text-[10px] text-temple-400 font-mono">ID: {ev.id}</span>
              <div className="flex gap-4 items-center">
                <button
                  type="button"
                  onClick={() => handleExportICS(ev)}
                  className="flex items-center gap-1.5 text-temple-300 font-semibold hover:text-white transition-colors"
                  title="Export to Calendar (.ics)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
                <button
                  type="button"
                  onClick={() => showToast(`Roster opened for ${ev.title}`, 'info')}
                  className="text-saffron-400 font-bold hover:underline cursor-pointer"
                >
                  View Seva Roster &rarr;
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-950/80 backdrop-blur-md">
          <div className="bg-temple-900 border border-temple-700 rounded-2xl max-w-md w-full p-6 text-temple-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-temple-800 mb-4">
              <h3 className="font-bold text-sm">Schedule Annual Utsav / Mahotsav</h3>
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
                <label className="block text-temple-300 font-semibold mb-1">Festival Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Deepotsav Maha Parva"
                  className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Lunar Tithi</label>
                  <input
                    type="text"
                    value={tithi}
                    onChange={(e) => setTithi(e.target.value)}
                    placeholder="Kartika Amavasya"
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  />
                </div>
                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Expected Footfall</label>
                  <input
                    type="number"
                    value={expectedFootfall}
                    onChange={(e) => setExpectedFootfall(Number(e.target.value))}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  />
                </div>
                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Budget (₹)</label>
                  <input
                    type="number"
                    value={budgetAllocated}
                    onChange={(e) => setBudgetAllocated(Number(e.target.value))}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200 font-bold text-saffron-400"
                  />
                </div>
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
                  Save Utsav
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
