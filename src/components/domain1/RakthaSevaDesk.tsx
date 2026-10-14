import React, { useState } from 'react';
import { HeartPulse, Search, Plus, Filter, Phone, MapPin, Activity, Droplet, Download, ShieldCheck, CheckCircle2, Users } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';

interface BloodDonor {
  id: string;
  name: string;
  bloodGroup: string;
  phone: string;
  location: string;
  lastDonationDate: string | null;
  isAvailable: boolean;
  donorType: 'Emergency' | 'Regular' | 'Rare';
}

const INITIAL_DONORS: BloodDonor[] = [
  { id: '1', name: 'Rahul Sharma', bloodGroup: 'O+', phone: '+91 9876543210', location: 'Varanasi North', lastDonationDate: '2023-11-15', isAvailable: true, donorType: 'Regular' },
  { id: '2', name: 'Vikram Singh', bloodGroup: 'AB-', phone: '+91 9123456789', location: 'Dashashwamedh', lastDonationDate: null, isAvailable: true, donorType: 'Rare' },
  { id: '3', name: 'Priya Patel', bloodGroup: 'B+', phone: '+91 9988776655', location: 'Lanka', lastDonationDate: '2024-01-20', isAvailable: false, donorType: 'Regular' },
  { id: '4', name: 'Amit Desai', bloodGroup: 'O-', phone: '+91 9998887776', location: 'Cantt', lastDonationDate: '2023-08-10', isAvailable: true, donorType: 'Emergency' },
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const RakthaSevaDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [donors, setDonors] = useState<BloodDonor[]>(INITIAL_DONORS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [newDonor, setNewDonor] = useState<Partial<BloodDonor>>({ bloodGroup: 'O+', donorType: 'Regular', isAvailable: true });

  const filteredDonors = donors.filter((d) => {
    const matchesSearch = d.name?.toLowerCase().includes(searchTerm?.toLowerCase()) || d.location?.toLowerCase().includes(searchTerm?.toLowerCase()) || d.phone.includes(searchTerm);
    const matchesGroup = filterGroup === 'all' || d.bloodGroup === filterGroup;
    return matchesSearch && matchesGroup;
  });

  const getGroupColor = (group: string) => {
    if (group.includes('-')) return 'bg-rose-100 text-rose-700 border-rose-200';
    return 'bg-red-50 text-red-600 border-red-100';
  };

  const getAvailabilityBadge = (isAvailable: boolean, lastDonation: string | null) => {
    if (!isAvailable) return <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold flex items-center gap-1 w-fit"><Activity className="w-3 h-3" /> Resting / Unavailable</span>;
    
    if (lastDonation) {
      const days = Math.floor((new Date().getTime() - new Date(lastDonation).getTime()) / (1000 * 3600 * 24));
      if (days < 90) return <span className="px-2 py-1 bg-saffron-100 text-saffron-700 rounded-lg text-xs font-bold flex items-center gap-1 w-fit"><Activity className="w-3 h-3" /> Recovery ({90 - days} days left)</span>;
    }
    
    return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" /> Ready to Donate</span>;
  };

  const handleAddDonor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDonor.name || !newDonor.phone) {
      showToast('Name and phone are required', 'warning');
      return;
    }
    const donor: BloodDonor = {
      id: Date.now().toString(),
      name: newDonor.name,
      bloodGroup: newDonor.bloodGroup || 'O+',
      phone: newDonor.phone,
      location: newDonor.location || 'Unknown',
      lastDonationDate: newDonor.lastDonationDate || null,
      isAvailable: newDonor.isAvailable ?? true,
      donorType: newDonor.donorType as any || 'Regular',
    };
    setDonors([donor, ...donors]);
    setIsAddModalOpen(false);
    showToast('Donor successfully registered to the network', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-rose-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
              <HeartPulse className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Raktha Seva (Blood Registry)</h1>
          </div>
          <p className="text-sm text-slate-500 font-medium ml-11">Life-saving community emergency response & donor matching network.</p>
        </div>
        <div className="flex items-center gap-3 z-10">
          <button className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm transition-colors shadow-sm flex items-center gap-2">
            <Download className="w-4 h-4" /> Export DB
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-rose-500/30 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Register Donor
          </button>
        </div>
      </div>

      {/* Analytics / Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Donors', value: donors.length, icon: Users, color: 'indigo' },
          { label: 'Ready for Emergency', value: donors.filter(d => d.isAvailable && (!d.lastDonationDate || Math.floor((new Date().getTime() - new Date(d.lastDonationDate).getTime()) / (1000 * 3600 * 24)) >= 90)).length, icon: Activity, color: 'emerald' },
          { label: 'Rare Groups (Rh-)', value: donors.filter(d => d.bloodGroup.includes('-')).length, icon: Droplet, color: 'rose' },
          { label: 'Verified Integrity', value: '100%', icon: ShieldCheck, color: 'amber' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-${stat.color}-50 text-${stat.color}-600`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-800">{stat.value}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, location, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            <button
              onClick={() => setFilterGroup('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold shrink-0 transition-colors ${filterGroup === 'all' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              All Types
            </button>
            {BLOOD_GROUPS.map((bg, idx) => (
              <button
                key={bg}
                onClick={() => setFilterGroup(bg)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold shrink-0 transition-colors ${filterGroup === bg ? 'bg-rose-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'}`}
              >
                {bg}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Donor Details</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Blood Group</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Location / Contact</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status & Availability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDonors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    <Droplet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-medium">No donors found matching criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredDonors.map((donor, idx) => (
                  <tr key={`${donor.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{donor.name}</span>
                        <span className="text-xs text-slate-500 mt-0.5">{donor.donorType} Donor</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-sm font-extrabold border ${getGroupColor(donor.bloodGroup)}`}>
                        {donor.bloodGroup}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {donor.location}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-indigo-400" /> {donor.phone}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {getAvailabilityBadge(donor.isAvailable, donor.lastDonationDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal Overlay */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-rose-600" />
                <h2 className="text-lg font-bold text-slate-800">Register New Donor</h2>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-200/50 rounded-full text-slate-500 transition-colors">
                <Search className="w-4 h-4 hidden" /> {/* Dummy to avoid import issue if X is missing, wait I didn't import X. Let me use plain SVG */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <form onSubmit={handleAddDonor} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input type="text" required value={newDonor.name || ''} onChange={e => setNewDonor({...newDonor, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500" placeholder="e.g. Rahul Sharma" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                  <select value={newDonor.bloodGroup} onChange={e => setNewDonor({...newDonor, bloodGroup: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500">
                    {BLOOD_GROUPS.map((g, idx) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input type="tel" required value={newDonor.phone || ''} onChange={e => setNewDonor({...newDonor, phone: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500" placeholder="+91..." />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Location / Area</label>
                <input type="text" value={newDonor.location || ''} onChange={e => setNewDonor({...newDonor, location: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500" placeholder="e.g. Cantt Area" />
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2 hover:bg-slate-100 text-slate-600 font-bold rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition-colors">Save Donor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
