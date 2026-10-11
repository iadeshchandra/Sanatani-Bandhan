import React, { useState } from 'react';
import { UserPlus, Search, Plus, UserCheck, Phone, MapPin, Calendar, CheckCircle2, X } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { GuestRecord } from '../../types';
import { useToast } from '../../context/ToastContext';

export const GuestManagerDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const { guests, addGuest, promoteGuestToMember } = useData();
  const { showToast, confirm } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [purpose, setPurpose] = useState('Darshan & Puja');
  const [assignedSevadar, setAssignedSevadar] = useState('Front Desk Sevak');
  const [notes, setNotes] = useState('');

  const filteredGuests = guests.filter(
    (g) =>
      g.name?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      g.phone.includes(searchTerm) ||
      g.city?.toLowerCase().includes(searchTerm?.toLowerCase())
  );

  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      showToast('Name and phone are required', 'warning');
      return;
    }

    addGuest({
      workspaceId: activeWorkspace.id,
      name: name.trim(),
      phone: phone.trim(),
      city: city.trim() || 'Varanasi',
      purpose,
      status: 'Lead',
      assignedSevadar,
      notes: notes.trim() || undefined,
    });

    setIsAddModalOpen(false);
    setName('');
    setPhone('');
    setCity('');
    setNotes('');
  };

  const handlePromote = (guest: GuestRecord) => {
    confirm({
      title: 'Promote Visitor to Member?',
      message: `Enrolling ${guest.name} as an active member in the ${activeWorkspace.type} directory will assign a unique 4-digit PIN and generate a Smart ID Pass. Proceed?`,
      confirmText: 'Yes, Enroll Member',
      variant: 'primary',
      onConfirm: () => promoteGuestToMember(guest.id),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-temple-900/90 border border-temple-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[10px] font-bold uppercase tracking-wider">
              Outreach & Visitor Pipeline
            </span>
            <span className="text-xs text-temple-400 font-mono">
              {guests.length} Logged Inquiries
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-temple-100">
            Guest & Visitor CRM Desk
          </h2>
          <p className="text-xs text-temple-400 mt-0.5">
            Capture pilgrim footfall, track puja inquiries, and promote visitors to enrolled members
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-saffron-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Log New Visitor</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-temple-900/90 border border-temple-800 p-4 rounded-2xl flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-temple-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search visitors by name, city, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-temple-800 border border-temple-700 rounded-xl pl-9 pr-3 py-2 text-xs text-temple-200 placeholder-temple-400 focus:outline-none focus:border-saffron-500"
          />
        </div>
      </div>

      {/* Guest Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGuests.map((guest, idx) => (
          <div
            key={`${guest.id}-${idx}`}
            className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-temple-800">
                <div>
                  <h3 className="font-extrabold text-sm text-temple-100">{guest.name}</h3>
                  <p className="text-xs text-saffron-400">{guest.city}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    guest.status === 'Promoted'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : guest.status === 'Follow-Up'
                      ? 'bg-saffron-500/20 text-saffron-300 border border-saffron-500/30'
                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  }`}
                >
                  {guest.status}
                </span>
              </div>

              <div className="py-3 space-y-1.5 text-xs text-temple-300">
                <p>
                  <span className="text-temple-400">Phone:</span>{' '}
                  <span className="font-mono text-saffron-400">{guest.phone}</span>
                </p>
                <p>
                  <span className="text-temple-400">Purpose:</span>{' '}
                  <span className="font-semibold text-temple-100">{guest.purpose}</span>
                </p>
                <p>
                  <span className="text-temple-400">Visit Date:</span>{' '}
                  <span className="font-mono text-temple-300">{guest.visitDate}</span>
                </p>
                <p>
                  <span className="text-temple-400">Sevak Assigned:</span>{' '}
                  <span className="text-temple-200">{guest.assignedSevadar}</span>
                </p>
                {guest.notes && (
                  <p className="text-[11px] text-temple-400 italic pt-1 border-t border-temple-800">
                    "{guest.notes}"
                  </p>
                )}
              </div>
            </div>

            {/* Action */}
            <div className="pt-3 border-t border-temple-800 flex items-center justify-between">
              <span className="text-[10px] text-temple-400 font-mono">ID: {guest.id}</span>
              {guest.status !== 'Promoted' && (
                <button
                  type="button"
                  onClick={() => handlePromote(guest)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-temple-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Promote to Member</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-950/80 backdrop-blur-md">
          <div className="bg-temple-900 border border-temple-700 rounded-2xl w-full max-w-md shadow-2xl p-6 text-temple-100">
            <div className="flex items-center justify-between pb-3 border-b border-temple-800 mb-4">
              <h3 className="font-bold text-sm">Record Visitor Inquiry</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-temple-400 hover:text-temple-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddGuest} className="space-y-3 text-xs">
              <div>
                <label className="block text-temple-300 font-semibold mb-1">Visitor Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  />
                </div>
                <div>
                  <label className="block text-temple-300 font-semibold mb-1">City / State</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-temple-300 font-semibold mb-1">Purpose of Visit</label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                >
                  <option>Darshan & Puja</option>
                  <option>Pooja Inquiry</option>
                  <option>Annadanam Sponsorship</option>
                  <option>Gau Seva Adoption</option>
                  <option>Ashram Kutir Stay</option>
                  <option>Gurukul Admission</option>
                </select>
              </div>

              <div>
                <label className="block text-temple-300 font-semibold mb-1">Sevak In Charge</label>
                <input
                  type="text"
                  value={assignedSevadar}
                  onChange={(e) => setAssignedSevadar(e.target.value)}
                  className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                />
              </div>

              <div>
                <label className="block text-temple-300 font-semibold mb-1">Inquiry Details</label>
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
                  Save Visitor Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
