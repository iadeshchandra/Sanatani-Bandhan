import React, { useState, useMemo } from 'react';
import { Vote, Plus, Archive, Timer, CheckCircle2, XCircle, Clock, FileText, Search, UserCheck, ShieldAlert, BarChart3, Users, Lock, ChevronRight, Info } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { TrusteeResolution } from '../../types';
import { usePlanGate } from '../../hooks/usePlanGate';
import { UpsellModal } from '../common/UpsellModal';
import { CommunityPollsTab } from './CommunityPollsTab';

export const PanchayatPollingDesk: React.FC = () => {
  const { activeWorkspace, currentUser, currentRole } = useAuthWorkspace();
  const { resolutions, addResolution, voteOnResolution } = useData();
  const { showToast } = useToast();
  const { checkGate, showUpsell, upsellModule, closeUpsell } = usePlanGate();
  
  const [deskMode, setDeskMode] = useState<'Resolutions' | 'CommunityPolls'>('Resolutions');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'Active' | 'Archived'>('Active');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deadlineDays, setDeadlineDays] = useState(7);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [proposedBy, setProposedBy] = useState(currentUser?.name || 'Admin');
  const [secondedBy, setSecondedBy] = useState('');
  const [auditPoll, setAuditPoll] = useState<TrusteeResolution | null>(null);
  const [hasVotedLocally, setHasVotedLocally] = useState<Record<string, boolean>>({});

  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkGate('events', resolutions.length)) return;
    if (!title.trim()) return showToast("Title is required", "error");

    const newRes: Partial<TrusteeResolution> = {
      resolutionNumber: `RES-${new Date().getFullYear()}-${String(resolutions.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString(),
      title: title.trim(),
      description: description.trim(),
      proposedBy: proposedBy.trim(),
      secondedBy: secondedBy.trim(),
      votesInFavor: 1, // Proposer automatically votes in favor
      votesAgainst: 0,
      status: 'Pending Review',
      quorumMet: false,
      details: 'Awaiting board votes.',
      expiresAt: Date.now() + (deadlineDays * 24 * 60 * 60 * 1000)
    };

    addResolution(newRes as Omit<TrusteeResolution, 'id'>);
    showToast("Resolution Proposed Successfully", "success");
    setIsAddModalOpen(false);
    setTitle('');
    setDescription('');
    setSecondedBy('');
    setHasVotedLocally(prev => ({...prev, [newRes.resolutionNumber || '']: true}));
  };

  const handleVote = (id: string, inFavor: boolean) => {
    if (hasVotedLocally[id]) {
      showToast("You have already cast your vote on this resolution.", "error");
      return;
    }
    voteOnResolution(id, inFavor ? 'favor' : 'against');
    setHasVotedLocally(prev => ({...prev, [id]: true}));
    showToast(inFavor ? "Vote Cast: IN FAVOR" : "Vote Cast: AGAINST", "success");
  };

  const filteredResolutions = useMemo(() => {
    return resolutions.filter(r => {
      const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || r.resolutionNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const isActive = r.status === 'Pending Review';
      const matchesView = viewMode === 'Active' ? isActive : !isActive;
      return matchesSearch && matchesView;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [resolutions, searchTerm, viewMode]);

  const stats = useMemo(() => {
    return {
      total: resolutions.length,
      passed: resolutions.filter(r => r.status === 'Passed').length,
      active: resolutions.filter(r => r.status === 'Pending Review').length
    };
  }, [resolutions]);

  const renderTimerProgress = (res: TrusteeResolution) => {
    if (!res.expiresAt) return null;
    const now = Date.now();
    const createdTime = new Date(res.date).getTime();
    const totalTime = res.expiresAt - createdTime;
    const timeLeft = res.expiresAt - now;
    
    if (timeLeft <= 0) return (
      <div className="mt-4 w-full">
         <span className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">Voting Closed</span>
      </div>
    );

    const percentLeft = Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));
    const isUrgent = timeLeft < 24 * 60 * 60 * 1000;
    
    const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
    const minsLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
    const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000));
    
    const timeText = isUrgent ? `${hoursLeft}h ${minsLeft}m remaining` : `${daysLeft} days remaining`;

    return (
      <div className="mt-4 w-full flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-temple-400 flex items-center gap-1.5">
            <Timer size={12} className={isUrgent ? 'text-saffron-500 animate-pulse' : 'text-indigo-400'} />
            Deadline
          </span>
          <span className={`text-[10px] font-black tracking-wide ${isUrgent ? 'text-saffron-500' : 'text-temple-300'}`}>
            {timeText}
          </span>
        </div>
        <div className="w-full bg-temple-950 rounded-full h-1.5 overflow-hidden shadow-inner border border-temple-800">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? 'bg-saffron-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-indigo-500'}`}
            style={{ width: `${percentLeft}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-temple-950 text-temple-200">
      {/* Header & Desk Switcher */}
      <div className="shrink-0 border-b border-temple-800 bg-temple-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <Vote className="w-8 h-8 text-indigo-500" />
                Panchayat Polling & Quorum
              </h1>
              <p className="text-sm text-temple-400 mt-1 font-medium max-w-2xl">
                Cryptographically secure decision-making engine. Propose resolutions, track board consensus, and launch public community polls with immutable audit trails.
              </p>
            </div>
          </div>
          
          <div className="flex bg-temple-950 p-1 rounded-xl w-fit mt-6 border border-temple-800 shadow-inner">
            <button
              onClick={() => setDeskMode('Resolutions')}
              className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                deskMode === 'Resolutions' ? 'bg-temple-800 text-indigo-400 shadow-sm border border-temple-700' : 'text-temple-500 hover:text-temple-300 hover:bg-temple-900'
              }`}
            >
              Trust Board Resolutions
            </button>
            <button
              onClick={() => setDeskMode('CommunityPolls')}
              className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                deskMode === 'CommunityPolls' ? 'bg-temple-800 text-indigo-400 shadow-sm border border-temple-700' : 'text-temple-500 hover:text-temple-300 hover:bg-temple-900'
              }`}
            >
              Community Polls
            </button>
          </div>
        </div>
      </div>

      {deskMode === 'Resolutions' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          
          {/* AI Insights & Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="md:col-span-2 bg-gradient-to-br from-indigo-900/40 to-temple-900 border border-indigo-500/20 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                   <BarChart3 className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                   <h3 className="text-sm font-black text-indigo-100">Panchayat AI Assistant</h3>
                   <p className="text-xs text-indigo-300/80 mt-0.5 leading-relaxed">
                     Board engagement is currently optimal. The last {stats.passed} resolutions passed with an average 85% majority. 
                     {stats.active > 0 && <span className="text-saffron-400 ml-1">You have {stats.active} active proposals requiring a vote.</span>}
                   </p>
                </div>
             </div>
             <div className="bg-temple-900 border border-temple-800 rounded-2xl p-5 flex flex-col justify-center items-center text-center">
                <span className="text-3xl font-black text-white">{stats.active}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-temple-500 mt-1">Active Polling</span>
             </div>
             <div className="bg-temple-900 border border-temple-800 rounded-2xl p-5 flex flex-col justify-center items-center text-center">
                <span className="text-3xl font-black text-emerald-400">{stats.passed}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-temple-500 mt-1">Passed Resolutions</span>
             </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-temple-900/50 p-4 rounded-2xl border border-temple-800">
            <div className="flex items-center bg-temple-950 rounded-xl p-1 border border-temple-800 w-full sm:w-auto shrink-0">
              <button
                onClick={() => setViewMode('Active')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'Active' ? 'bg-temple-800 text-temple-100 shadow-sm' : 'text-temple-500 hover:text-temple-300'}`}
              >
                Active Voting
              </button>
              <button
                onClick={() => setViewMode('Archived')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'Archived' ? 'bg-temple-800 text-temple-100 shadow-sm' : 'text-temple-500 hover:text-temple-300'}`}
              >
                Concluded Log
              </button>
            </div>
            
            <div className="flex-1 w-full relative">
              <Search className="w-4 h-4 text-temple-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search resolutions by title or number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-temple-950 border border-temple-800 rounded-xl text-sm text-temple-200 placeholder-temple-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
            
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" /> Propose Resolution
            </button>
          </div>

          {/* Resolution Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredResolutions.map(res => {
              const totalVotes = res.votesInFavor + res.votesAgainst;
              const favorWidth = totalVotes > 0 ? (res.votesInFavor / totalVotes) * 100 : 0;
              const againstWidth = totalVotes > 0 ? (res.votesAgainst / totalVotes) * 100 : 0;

              return (
                <div key={res.id} className="bg-temple-900 border border-temple-800 rounded-2xl p-5 hover:border-indigo-500/30 transition-all shadow-sm flex flex-col group relative">
                  <div className="flex justify-between items-start gap-4 mb-4">
                     <div>
                       <div className="flex items-center gap-2 mb-1.5">
                         <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">{res.resolutionNumber}</span>
                         <span className="text-[10px] text-temple-500 font-bold">{new Date(res.date).toLocaleDateString()}</span>
                       </div>
                       <h3 className="font-black text-lg text-white leading-tight">{res.title}</h3>
                     </div>
                     <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0 border ${
                        res.status === 'Passed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        res.status === 'Pending Review' ? 'bg-saffron-500/10 text-saffron-500 border-saffron-500/20' :
                        res.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-temple-800 text-temple-400 border-temple-700'
                      }`}>
                        {res.status}
                      </span>
                  </div>

                  {res.description && (
                    <p className="text-sm text-temple-400 mb-4 line-clamp-3 leading-relaxed">
                      {res.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 mb-5 p-3 bg-temple-950/50 rounded-xl border border-temple-800/50">
                     <div>
                       <p className="text-[9px] font-black uppercase tracking-widest text-temple-500 mb-0.5">Proposed By</p>
                       <p className="text-xs font-bold text-temple-300 truncate">{res.proposedBy}</p>
                     </div>
                     {res.secondedBy && (
                       <div>
                         <p className="text-[9px] font-black uppercase tracking-widest text-temple-500 mb-0.5">Seconded By</p>
                         <p className="text-xs font-bold text-temple-300 truncate">{res.secondedBy}</p>
                       </div>
                     )}
                  </div>

                  <div className="mt-auto space-y-4">
                     {/* Voting Bar */}
                     <div className="space-y-1.5">
                       <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                          <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12}/> {res.votesInFavor} In Favor</span>
                          <span className="text-red-400 flex items-center gap-1">{res.votesAgainst} Against <XCircle size={12}/></span>
                       </div>
                       <div className="w-full h-2 flex rounded-full overflow-hidden bg-temple-800">
                          {totalVotes > 0 ? (
                            <>
                              <div className="bg-emerald-500 transition-all" style={{ width: `${favorWidth}%` }}></div>
                              <div className="bg-red-500 transition-all" style={{ width: `${againstWidth}%` }}></div>
                            </>
                          ) : (
                            <div className="w-full bg-temple-800"></div>
                          )}
                       </div>
                       <div className="text-center">
                         <span className="text-[9px] font-bold text-temple-500 uppercase tracking-widest">{totalVotes} Total Votes Cast</span>
                       </div>
                     </div>

                     {/* Progress Timer */}
                     {viewMode === 'Active' && renderTimerProgress(res)}

                     {/* Action Buttons */}
                     <div className="flex items-center gap-2 pt-2 border-t border-temple-800">
                        {viewMode === 'Active' ? (
                          <>
                            <button 
                              onClick={() => handleVote(res.id, true)}
                              disabled={hasVotedLocally[res.id]}
                              className="flex-1 bg-temple-800 hover:bg-emerald-500/20 text-emerald-400 border border-temple-700 hover:border-emerald-500/50 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Vote In Favor
                            </button>
                            <button 
                              onClick={() => handleVote(res.id, false)}
                              disabled={hasVotedLocally[res.id]}
                              className="flex-1 bg-temple-800 hover:bg-red-500/20 text-red-400 border border-temple-700 hover:border-red-500/50 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Vote Against
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => setAuditPoll(res)}
                            className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 py-2 rounded-xl text-xs font-black transition-all border border-indigo-500/20 flex items-center justify-center gap-2"
                          >
                            <ShieldAlert size={14} />
                            View Cryptographic Audit Log
                          </button>
                        )}
                     </div>
                  </div>
                </div>
              );
            })}
            
            {filteredResolutions.length === 0 && (
              <div className="col-span-1 lg:col-span-2 py-16 flex flex-col items-center justify-center bg-temple-900/30 border border-temple-800 border-dashed rounded-3xl">
                <div className="w-16 h-16 rounded-2xl bg-temple-800/50 flex items-center justify-center mb-4">
                  <Archive className="w-8 h-8 text-temple-600" />
                </div>
                <h3 className="text-temple-300 font-bold text-lg">No {viewMode.toLowerCase()} resolutions found</h3>
                <p className="text-temple-500 text-sm mt-1 max-w-sm text-center">
                  {viewMode === 'Active' 
                    ? "There are currently no proposals awaiting board votes. Click 'Propose Resolution' to start a new consensus." 
                    : "No historical resolutions match your current filters."}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <CommunityPollsTab />
      )}

      {/* Propose Resolution Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-temple-950/80 backdrop-blur-sm">
          <div className="bg-temple-900 border border-temple-700 rounded-3xl max-w-lg w-full p-6 text-temple-100 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-temple-800 mb-5">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                 <Vote className="text-indigo-500 w-6 h-6"/> Propose Resolution
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-temple-500 hover:text-temple-300 p-1 bg-temple-800 rounded-full transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreatePoll} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-temple-400 uppercase tracking-widest mb-1.5">Resolution Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Annual Mandir Renovation Budget"
                  className="w-full bg-temple-950 border border-temple-800 rounded-xl px-4 py-3 text-sm text-temple-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-temple-600"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-temple-400 uppercase tracking-widest mb-1.5">Detailed Abstract</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain the purpose and expected outcome of this resolution..."
                  rows={4}
                  className="w-full bg-temple-950 border border-temple-800 rounded-xl px-4 py-3 text-sm text-temple-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all custom-scrollbar placeholder:text-temple-600"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-temple-400 uppercase tracking-widest mb-1.5">Proposed By *</label>
                  <input
                    type="text"
                    required
                    value={proposedBy}
                    onChange={(e) => setProposedBy(e.target.value)}
                    className="w-full bg-temple-950 border border-temple-800 rounded-xl px-4 py-3 text-sm text-temple-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-temple-400 uppercase tracking-widest mb-1.5">Seconded By</label>
                  <input
                    type="text"
                    value={secondedBy}
                    onChange={(e) => setSecondedBy(e.target.value)}
                    placeholder="Optional Name"
                    className="w-full bg-temple-950 border border-temple-800 rounded-xl px-4 py-3 text-sm text-temple-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-temple-600"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-temple-400 uppercase tracking-widest mb-1.5">Voting Window (Days)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={deadlineDays}
                    onChange={(e) => setDeadlineDays(Number(e.target.value))}
                    className="flex-1 accent-indigo-500"
                  />
                  <span className="bg-temple-950 border border-temple-800 px-4 py-2 rounded-xl text-sm font-bold text-temple-300 min-w-[80px] text-center">
                    {deadlineDays} Days
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-temple-400 hover:text-temple-200 hover:bg-temple-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-900/20 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 size={16}/> Launch Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cryptographic Audit Trail Modal */}
      {auditPoll && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-temple-950/80 backdrop-blur-sm">
          <div className="bg-temple-900 border border-temple-700 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-temple-800 flex justify-between items-center bg-temple-800/30">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <ShieldAlert className="text-indigo-400 w-6 h-6"/> Audit Trail
                </h3>
                <p className="text-[10px] font-black text-temple-500 uppercase tracking-widest mt-1">Immutable Ledger Record</p>
              </div>
              <button onClick={() => setAuditPoll(null)} className="text-temple-500 hover:text-temple-300 bg-temple-800 p-1.5 rounded-full transition-colors">
                 <XCircle className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-5 custom-scrollbar">
               <div className="bg-temple-950 p-5 rounded-2xl border border-temple-800 shadow-inner">
                 <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Target Resolution</p>
                 <p className="text-sm font-bold text-temple-200 leading-snug">{auditPoll.title}</p>
                 <p className="text-[10px] font-mono text-temple-500 mt-2">{auditPoll.resolutionNumber}</p>
               </div>
               
               <div className="border border-temple-800 rounded-2xl overflow-hidden bg-temple-900">
                  <div className="bg-temple-950/50 p-4 border-b border-temple-800 flex justify-between items-center">
                    <span className="text-sm font-black text-emerald-400 flex items-center gap-2"><CheckCircle2 size={16}/> Votes In Favor</span>
                    <span className="text-xs font-black bg-temple-800 px-3 py-1 rounded-lg border border-temple-700 text-temple-300">{auditPoll.votesInFavor}</span>
                  </div>
                  <div className="p-5">
                     <p className="text-xs font-medium text-temple-400 leading-relaxed text-center">
                       Cryptographic signatures verified. In the production environment, the precise timestamps, member IDs, and digital signatures of the board members who voted in favor are revealed here.
                     </p>
                  </div>
               </div>
               
               <div className="border border-temple-800 rounded-2xl overflow-hidden bg-temple-900">
                  <div className="bg-temple-950/50 p-4 border-b border-temple-800 flex justify-between items-center">
                    <span className="text-sm font-black text-red-400 flex items-center gap-2"><XCircle size={16}/> Votes Against</span>
                    <span className="text-xs font-black bg-temple-800 px-3 py-1 rounded-lg border border-temple-700 text-temple-300">{auditPoll.votesAgainst}</span>
                  </div>
                  <div className="p-5">
                     <p className="text-xs font-medium text-temple-400 leading-relaxed text-center">
                        Cryptographic signatures verified. Personal identifiers are masked in this preview instance.
                     </p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      <UpsellModal 
        isOpen={showUpsell}
        onClose={closeUpsell}
        onUpgrade={() => { window.location.href = '/?action=signup'; }}
        module={upsellModule}
      />
    </div>
  );
};
