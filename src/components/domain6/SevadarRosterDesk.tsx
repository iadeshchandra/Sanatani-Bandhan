import React, { useState } from 'react';
import { Calendar, Clock, UserCheck, Search, Plus, MapPin, Shield, ShieldCheck, Sparkles, X, CheckCircle2, Star } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { db } from '../../firebase';
import { doc, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';

export const SevadarRosterDesk: React.FC = () => {
  const { t } = useLanguage();
  const { currentDevotee, activeWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();

  const [activeView, setActiveView] = useState<'upcoming' | 'past'>('upcoming');
  const [smartAssignShift, setSmartAssignShift] = useState<any | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const suggestedVolunteers = [
    { id: 'v1', name: 'Vikram Singh', match: 98, skills: ['Crowd Control', 'Security'], rating: 4.9, pastShifts: 42, availability: 'Available' },
    { id: 'v2', name: 'Anjali Sharma', match: 92, skills: ['Prasadam', 'Crowd Control'], rating: 4.8, pastShifts: 28, availability: 'Available' },
    { id: 'v3', name: 'Rohan Gupta', match: 85, skills: ['Shoe Counter', 'General'], rating: 4.5, pastShifts: 15, availability: 'Available' },
  ];

  const handleSmartAssign = (shift: any) => {
    setSmartAssignShift(shift);
  };

  const confirmAssignment = (volunteer: any) => {
    setIsAssigning(true);
    setTimeout(() => {
      setIsAssigning(false);
      setSmartAssignShift(null);
      showToast(`${volunteer.name} has been successfully assigned!`, 'success', 'Smart Assign Complete');
    }, 800);
  };



  const completeShift = async (shift: any) => {
    if (!currentDevotee) {
      showToast('You must be logged in as a devotee to claim karma points.', 'error', 'Error');
      return;
    }

    try {
      const batch = writeBatch(db);
      
      // Update devotee's total karma (sevaIndex)
      const devoteeRef = doc(db, 'workspaces', activeWorkspace.id, 'devotees', currentDevotee.id);
      batch.update(devoteeRef, {
        sevaIndex: increment(shift.karmaPoints)
      });

      // Log the karma transaction
      const ledgerRef = doc(db, 'workspaces', activeWorkspace.id, 'karma_ledger', `${Date.now()}_${currentDevotee.id}`);
      batch.set(ledgerRef, {
        devoteeId: currentDevotee.id,
        points: shift.karmaPoints,
        source: 'Sevadar Shift',
        shiftRole: shift.role,
        timestamp: serverTimestamp()
      });

      await batch.commit();
      showToast(`Successfully awarded ${shift.karmaPoints} pts to your profile.`, 'success', 'Karma Awarded!');
    } catch (error) {
      console.error("Error awarding karma:", error);
      showToast('Could not record karma points. Check connection.', 'error', 'Update Failed');
    }
  };

  const shifts = [
    { id: '1', role: 'Crowd Control', location: 'Main Temple Gate', time: '06:00 AM - 10:00 AM', status: 'FILLED', volunteers: ['Rahul S.', 'Amit K.'], required: 2, karmaPoints: 50 },
    { id: '2', role: 'Prasadam Distribution', location: 'Annadanam Hall', time: '12:00 PM - 03:00 PM', status: 'NEEDS_VOLUNTEERS', volunteers: ['Priya M.'], required: 4, karmaPoints: 75 },
    { id: '3', role: 'Shoe Counter', location: 'Gate 2', time: '04:00 PM - 08:00 PM', status: 'FILLED', volunteers: ['Suresh V.'], required: 1, karmaPoints: 30 }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-indigo-600" />
            {t('sevadarRoster') || 'Sevadar Shift Roster'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage volunteer schedules and assign tasks for daily operations.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">
          <Plus className="w-4 h-4" />
          Create Shift
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl inline-flex w-full sm:w-auto overflow-x-auto">
            <button 
              onClick={() => setActiveView('upcoming')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap ${activeView === 'upcoming' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Upcoming Shifts
            </button>
            <button 
              onClick={() => setActiveView('past')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap ${activeView === 'past' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Past & Completed
            </button>
          </div>

          <div className="space-y-4">
            {shifts.map((shift, idx) => (
              <div key={`${shift.id}-${idx}`} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-indigo-200 transition-colors">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-slate-800">{shift.role}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${shift.status === 'FILLED' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-saffron-100 text-saffron-800 border-saffron-200'}`}>
                        {shift.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 font-medium">
                      <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" /> {shift.location}</div>
                      <div className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400" /> {shift.time}</div>
                    </div>
                  </div>
                  <div className="text-right sm:text-left">
                    <div className="bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 text-indigo-700 font-bold text-xs">
                      <ShieldCheck className="w-4 h-4" />
                      +{shift.karmaPoints} Karma Points
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {shift.volunteers.map((v, i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-600">
                          {v.charAt(0)}
                        </div>
                      ))}
                    </div>
                    <span className="text-sm font-medium text-slate-500 ml-2">
                      {shift.volunteers.length} / {shift.required} Volunteers
                    </span>
                  </div>
                  {shift.status !== 'FILLED' ? (
                    <div className="flex items-center gap-2">
                      <button className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-sm transition-colors">
                        Assign
                      </button>
                      <button 
                        onClick={() => handleSmartAssign(shift)}
                        className="px-4 py-2 bg-gradient-to-r from-saffron-500 to-saffron-500 hover:from-saffron-600 hover:to-saffron-600 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-1.5 shadow-sm hover:shadow-md"
                      >
                        <Sparkles className="w-4 h-4" />
                        Smart Assign
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => completeShift(shift)} className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-sm transition-colors">
                      Complete & Award Karma
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              Calendar Overview
            </h3>
            <div className="bg-slate-50 rounded-xl p-8 border border-slate-100 text-center">
              <p className="text-sm font-bold text-slate-500">Calendar Widget</p>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Assign Modal */}
      {smartAssignShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-temple-100 flex items-center justify-between bg-temple-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-saffron-100 to-saffron-100 flex items-center justify-center text-saffron-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-temple-800">AI Smart Assign</h2>
                  <p className="text-sm text-temple-500 font-medium">Finding best matches for {smartAssignShift.role}</p>
                </div>
              </div>
              <button 
                onClick={() => setSmartAssignShift(null)}
                className="w-8 h-8 rounded-full bg-temple-200/50 flex items-center justify-center text-temple-500 hover:bg-temple-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 bg-temple-50/30 flex-1">
              {suggestedVolunteers.map((vol, idx) => (
                <div key={vol.id} className="bg-white border border-temple-100 p-4 rounded-2xl shadow-sm hover:border-saffron-200 hover:shadow-md transition-all group flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-temple-100 border-2 border-white shadow-sm flex items-center justify-center font-bold text-temple-600 text-lg shrink-0">
                      {vol.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-temple-800">{vol.name}</h4>
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md">{vol.availability}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-temple-500 font-medium mb-2">
                        <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-saffron-500 fill-saffron-500" /> {vol.rating} Rating</span>
                        <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> {vol.pastShifts} Shifts</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {vol.skills.map((s, i) => (
                          <span key={i} className="bg-temple-100 text-temple-600 text-[10px] font-bold px-2 py-0.5 rounded-md border border-temple-200">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex sm:flex-col items-center justify-between sm:justify-center sm:items-end gap-3 sm:border-l sm:border-temple-100 sm:pl-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-saffron-500 to-saffron-500">
                        {vol.match}%
                      </span>
                      <span className="text-[10px] uppercase font-bold text-temple-400 leading-tight">Match<br/>Score</span>
                    </div>
                    <button 
                      onClick={() => confirmAssignment(vol)}
                      disabled={isAssigning}
                      className="px-4 py-2 bg-temple-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                    >
                      {isAssigning ? 'Assigning...' : 'Assign to Shift'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
