import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Flame, Book, Sun, CheckCircle2, TrendingUp, Calendar as CalIcon, Medal, Heart, Users, Trophy, BookOpen, Share2, MessageCircle } from 'lucide-react';
import { doc, collection, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function PersonalSadhanaDesk() {
  const { currentUser, activeWorkspace } = useAuthWorkspace();
  const { t, language } = useLanguage();
  const { addNotification } = useNotifications();
  
  const [activeTab, setActiveTab] = useState<'MY_JOURNAL' | 'COMMUNITY' | 'LEADERBOARD'>('MY_JOURNAL');
  const [logs, setLogs] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [sadhanaForm, setSadhanaForm] = useState({
    japaCount: 108,
    meditationMins: 15,
    scriptureRead: 'Bhagavad Gita',
    vratFasting: false,
    notes: '',
    isPublic: true
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'|'offline'} | null>(null);

  const safeTranslate = (key: string, fallbackEn: string, fallbackBn?: string, fallbackHi?: string) => {
    const val = t(key);
    if (val !== key) return val;
    if (language === 'bn' && fallbackBn) return fallbackBn;
    if (language === 'hi' && fallbackHi) return fallbackHi;
    return fallbackEn;
  };

  const showToast = (msg: string, type: 'success'|'error'|'offline' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!activeWorkspace?.id) return;
    const logsRef = collection(db, `communities/${activeWorkspace.id}/sadhana_logs`);
    const unsub = onSnapshot(logsRef, (snap) => {
      const parsedLogs: any[] = snap.docs.map((d, idx) => ({ id: d.id, ...d.data() }));
      
      const myLogs = parsedLogs.filter(l => l.uid === currentUser?.id).sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
      setLogs(myLogs);
      
      const publicLogs = parsedLogs.filter(l => l.isPublic).sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
      setAllLogs(publicLogs);
      
      setLoading(false);
    }, (err) => console.warn("Firebase PersonalSadhanaDesk sync:", err.message));
    return () => unsub();
  }, [activeWorkspace?.id, currentUser?.id]);

  const handleLogSadhana = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace?.id || !currentUser?.id) return;
    setSubmitting(true);
    try {
      const batch = writeBatch(db);
      const logId = `LOG-${Date.now()}`;
      const logRef = doc(db, `communities/${activeWorkspace.id}/sadhana_logs/${logId}`);
      
      const karmaEarned = Math.floor(sadhanaForm.japaCount / 10) + sadhanaForm.meditationMins;
      
      batch.set(logRef, {
        ...sadhanaForm,
        uid: currentUser.id,
        userName: currentUser.name || 'Anonymous Sadhak',
        timestamp: Date.now(),
        karmaEarned
      });
      
      await batch.commit();
      showToast(safeTranslate('sadhana_logged', 'Sadhana logged successfully!'));
      
      addNotification({
        title: 'Sadhana Logged',
        message: `You earned ${karmaEarned} Karma points for completing ${sadhanaForm.japaCount} Japa and ${sadhanaForm.meditationMins} mins of meditation.`,
        type: 'success',
      });
      
      setSadhanaForm({ ...sadhanaForm, notes: '', japaCount: 108, meditationMins: 15 });
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (logId: string, currentLikes: string[]) => {
    if (!activeWorkspace?.id || !currentUser?.id) return;
    try {
      const batch = writeBatch(db);
      const logRef = doc(db, `communities/${activeWorkspace.id}/sadhana_logs/${logId}`);
      const hasLiked = currentLikes?.includes(currentUser.id);
      
      let newLikes = [...(currentLikes || [])];
      if (hasLiked) {
        newLikes = newLikes.filter(id => id !== currentUser.id);
      } else {
        newLikes.push(currentUser.id);
      }
      
      batch.update(logRef, { likes: newLikes });
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
  };

  // Analytics for MY_JOURNAL
  const totalJapa = logs.reduce((acc, curr) => acc + (Number(curr.japaCount) || 0), 0);
  const totalMeditation = logs.reduce((acc, curr) => acc + (Number(curr.meditationMins) || 0), 0);
  const totalKarma = logs.reduce((acc, curr) => acc + (Number(curr.karmaEarned) || 0), 0);
  
  // Calculate Streak
  const streak = useMemo(() => {
    if (logs.length === 0) return 0;
    
    // Get unique dates sorted descending
    const uniqueDates = Array.from(new Set(logs.map((l, idx) => new Date(l.timestamp).toDateString())))
                             .map((d, idx) => new Date(d))
                             .sort((a, b) => b.getTime() - a.getTime());
                             
    let currentStreak = 0;
    let today = new Date();
    today.setHours(0,0,0,0);
    
    // Check if the most recent activity is today or yesterday
    if (uniqueDates.length > 0) {
      const mostRecent = uniqueDates[0];
      const diffTime = Math.abs(today.getTime() - mostRecent.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 1) return 0; // Lost streak
      
      currentStreak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const prev = uniqueDates[i-1];
        const curr = uniqueDates[i];
        const diff = Math.abs(prev.getTime() - curr.getTime());
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
    return currentStreak;
  }, [logs]);
  
  // Chart Data (Last 7 Days)
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      
      const dayLogs = logs.filter(l => new Date(l.timestamp).toDateString() === dateStr);
      const japa = dayLogs.reduce((acc, curr) => acc + (Number(curr.japaCount) || 0), 0);
      const med = dayLogs.reduce((acc, curr) => acc + (Number(curr.meditationMins) || 0), 0);
      
      data.push({
        name: d.toLocaleDateString('default', { weekday: 'short' }),
        japa,
        meditation: med,
        date: d
      });
    }
    return data;
  }, [logs]);

  // Leaderboard data
  const leaderboard = useMemo(() => {
    const userMap: Record<string, { name: string, karma: number, totalJapa: number, totalMed: number }> = {};
    allLogs.forEach(log => {
      if (!userMap[log.uid]) {
        userMap[log.uid] = { name: log.userName || 'Anonymous', karma: 0, totalJapa: 0, totalMed: 0 };
      }
      userMap[log.uid].karma += (Number(log.karmaEarned) || 0);
      userMap[log.uid].totalJapa += (Number(log.japaCount) || 0);
      userMap[log.uid].totalMed += (Number(log.meditationMins) || 0);
    });
    return Object.values(userMap).sort((a, b) => b.karma - a.karma).slice(0, 10);
  }, [allLogs]);

  if (loading) return <div className="p-10 text-center"><div className="animate-spin w-8 h-8 border-4 border-saffron-500 border-t-transparent rounded-full mx-auto"></div></div>;

  return (
    <div className="h-full flex flex-col bg-gray-50/50 relative">
      {toast && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[10000] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4 ${toast.type === 'error' ? 'bg-red-900' : 'bg-gray-900'} text-white`}>
          <CheckCircle2 size={20} className={toast.type === 'error' ? 'text-red-400' : 'text-green-400'}/>
          <p className="text-sm font-bold">{toast.msg}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Flame size={100}/></div>
        <div className="relative z-10">
          <p className="text-[10px] font-black text-saffron-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Sun size={14}/> {safeTranslate('sanatani_life', 'Individual Sanatani Life')}</p>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Personal Sadhana</h1>
          <p className="text-sm text-gray-500 font-bold mt-1 max-w-xl">Track your spiritual progress, share with the community, and earn Karma.</p>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 shrink-0">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
          <button onClick={() => setActiveTab('MY_JOURNAL')} className={`py-4 text-xs font-black tracking-widest uppercase transition-all whitespace-nowrap border-b-2 flex items-center gap-2 ${activeTab === 'MY_JOURNAL' ? 'border-saffron-500 text-saffron-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
            <BookOpen size={16}/> My Journal
          </button>
          <button onClick={() => setActiveTab('COMMUNITY')} className={`py-4 text-xs font-black tracking-widest uppercase transition-all whitespace-nowrap border-b-2 flex items-center gap-2 ${activeTab === 'COMMUNITY' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
            <Users size={16}/> Community Feed
          </button>
          <button onClick={() => setActiveTab('LEADERBOARD')} className={`py-4 text-xs font-black tracking-widest uppercase transition-all whitespace-nowrap border-b-2 flex items-center gap-2 ${activeTab === 'LEADERBOARD' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
            <Trophy size={16}/> Leaderboard
          </button>
        </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'MY_JOURNAL' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in">
               <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-all">
                  <div className="w-10 h-10 bg-saffron-50 text-saffron-600 rounded-full flex items-center justify-center mb-3"><Activity size={20}/></div>
                  <p className="text-3xl font-black text-gray-900">{totalJapa.toLocaleString()}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Total Mantras</p>
               </div>
               <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-all">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3"><Sun size={20}/></div>
                  <p className="text-3xl font-black text-gray-900">{Math.floor(totalMeditation/60)}h {totalMeditation%60}m</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Meditation Time</p>
               </div>
               <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-all">
                  <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-3"><Flame size={20}/></div>
                  <p className="text-3xl font-black text-gray-900">{streak} Days</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Active Streak</p>
               </div>
               <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-all">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-3"><Medal size={20}/></div>
                  <p className="text-3xl font-black text-gray-900">{totalKarma.toLocaleString()}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Karma Points</p>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden animate-in slide-in-from-left-4">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-saffron-50 rounded-bl-full -z-10"></div>
                  <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-6"><CheckCircle2 className="text-green-500"/> Log Today's Sadhana</h2>
                  
                  <form onSubmit={handleLogSadhana} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Japa Count (Mantras)</label>
                      <input type="number" required min={0} value={sadhanaForm.japaCount} onChange={e=>setSadhanaForm({...sadhanaForm, japaCount: Number(e.target.value)})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-saffron-500 transition-all shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Meditation (Minutes)</label>
                      <input type="number" required min={0} value={sadhanaForm.meditationMins} onChange={e=>setSadhanaForm({...sadhanaForm, meditationMins: Number(e.target.value)})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-saffron-500 transition-all shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Scripture Read</label>
                      <input type="text" placeholder="e.g. Ramayana Ch 2" value={sadhanaForm.scriptureRead} onChange={e=>setSadhanaForm({...sadhanaForm, scriptureRead: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-saffron-500 transition-all shadow-sm" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-saffron-50 border border-saffron-100 rounded-xl">
                      <label htmlFor="vrat" className="text-sm font-bold text-saffron-900 cursor-pointer">Observing Vrat/Fasting</label>
                      <input type="checkbox" id="vrat" checked={sadhanaForm.vratFasting} onChange={e=>setSadhanaForm({...sadhanaForm, vratFasting: e.target.checked})} className="w-5 h-5 accent-saffron-600 rounded cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Journal / Notes</label>
                      <textarea rows={2} value={sadhanaForm.notes} onChange={e=>setSadhanaForm({...sadhanaForm, notes: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-saffron-500 transition-all resize-none shadow-sm" />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input type="checkbox" id="public" checked={sadhanaForm.isPublic} onChange={e=>setSadhanaForm({...sadhanaForm, isPublic: e.target.checked})} className="w-4 h-4 accent-gray-900 rounded cursor-pointer" />
                      <label htmlFor="public" className="text-xs font-bold text-gray-600 cursor-pointer">Share to Community Feed</label>
                    </div>

                    <button type="submit" disabled={submitting} className="w-full py-4 mt-2 bg-gradient-to-r from-gray-900 to-black hover:from-black hover:to-gray-900 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-xl hover:shadow-2xl transition-all flex justify-center items-center gap-2 disabled:opacity-50">
                      {submitting ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div> : <><CheckCircle2 size={18}/> Save & Earn Karma</>}
                    </button>
                  </form>
                </div>
              </div>

              {/* Chart & History */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm animate-in fade-in">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-black text-gray-900 flex items-center gap-2"><TrendingUp className="text-blue-500"/> Last 7 Days Activity</h2>
                  </div>
                  
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 800 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 800 }} axisLine={false} tickLine={false} />
                        <Tooltip 
                          cursor={{ fill: '#f3f4f6' }}
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold', fontSize: '12px' }}
                        />
                        <Bar dataKey="japa" fill="#f97316" radius={[4, 4, 0, 0]} name="Mantras" stackId="a" maxBarSize={40} />
                        <Bar dataKey="meditation" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Meditation (mins)" stackId="a" maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm animate-in slide-in-from-right-4">
                  <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-6"><BookOpen className="text-emerald-500"/> My Log History</h2>
                  <div className="space-y-4">
                    {logs.map((log, idx) => (
                      <div key={`${log.id}-${idx}`} className="flex gap-4 p-4 border border-gray-100 rounded-2xl bg-gray-50 hover:bg-white transition-colors group">
                        <div className="w-12 h-12 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center shrink-0">
                           <span className="text-[10px] font-black text-gray-400 uppercase">{new Date(log.timestamp).toLocaleString('default', {month:'short'})}</span>
                           <span className="text-sm font-black text-gray-800">{new Date(log.timestamp).getDate()}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {log.vratFasting && <span className="px-2 py-0.5 bg-saffron-100 text-saffron-700 rounded text-[9px] font-black uppercase tracking-widest">Fasting</span>}
                            <span className="text-xs font-bold text-gray-500">{new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            <span className="ml-auto text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">+${log.karmaEarned || 0} Karma</span>
                          </div>
                          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700 font-bold">
                             <span className="flex items-center gap-1.5"><Activity size={14} className="text-saffron-500"/> {log.japaCount} Mantras</span>
                             <span className="flex items-center gap-1.5"><Sun size={14} className="text-blue-500"/> {log.meditationMins} Mins</span>
                             {log.scriptureRead && <span className="flex items-center gap-1.5"><Book size={14} className="text-purple-500"/> {log.scriptureRead}</span>}
                          </div>
                          {log.notes && <p className="text-xs text-gray-500 mt-2 italic bg-white p-3 rounded-xl border border-gray-100">"{log.notes}"</p>}
                        </div>
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <div className="py-12 text-center text-gray-400">
                        <CalIcon size={48} className="mx-auto mb-4 opacity-20"/>
                        <p className="text-sm font-bold">No sadhana logs yet. Start tracking your daily progress!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'COMMUNITY' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
            {allLogs.length > 0 ? allLogs.map((log, idx) => (
              <div key={`${log.id}-${idx}`} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center border border-indigo-200 shadow-inner">
                      <span className="text-indigo-700 font-black text-lg">{log.userName?.charAt(0) || 'A'}</span>
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900">{log.userName || 'Anonymous'}</h4>
                      <p className="text-xs font-bold text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100">
                    +${log.karmaEarned || 0} Karma
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center gap-2">
                    <Activity size={16} className="text-saffron-500"/>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Japa</p>
                      <p className="font-bold text-gray-800 text-sm">{log.japaCount}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center gap-2">
                    <Sun size={16} className="text-blue-500"/>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Meditation</p>
                      <p className="font-bold text-gray-800 text-sm">{log.meditationMins}m</p>
                    </div>
                  </div>
                  {log.scriptureRead && (
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center gap-2 col-span-2 sm:col-span-1">
                      <Book size={16} className="text-purple-500"/>
                      <div className="truncate w-full">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Scripture</p>
                        <p className="font-bold text-gray-800 text-sm truncate" title={log.scriptureRead}>{log.scriptureRead}</p>
                      </div>
                    </div>
                  )}
                </div>

                {log.notes && (
                  <p className="text-sm text-gray-600 font-medium italic border-l-2 border-gray-200 pl-3 py-1 mb-4">
                    "{log.notes}"
                  </p>
                )}

                <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                  <button 
                    onClick={() => handleLike(log.id, log.likes || [])}
                    className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${
                      log.likes?.includes(currentUser?.id) ? 'bg-rose-50 text-rose-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <Heart size={14} className={log.likes?.includes(currentUser?.id) ? 'fill-current' : ''} />
                    {log.likes?.length || 0} Pranam
                  </button>
                  <button className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-all">
                    <MessageCircle size={14}/> Reply
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                <Users size={48} className="mx-auto mb-4 text-gray-300"/>
                <p className="text-lg font-black text-gray-800">Community feed is empty</p>
                <p className="text-sm font-bold text-gray-500 mt-1">Be the first to share your sadhana!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'LEADERBOARD' && (
          <div className="max-w-4xl mx-auto animate-in slide-in-from-right-4">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-900 p-8 text-center text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Trophy size={120}/></div>
                <h2 className="text-2xl font-black relative z-10">Global Karma Leaderboard</h2>
                <p className="text-sm font-bold text-gray-400 mt-2 relative z-10">Top Sadhaks in the community by Karma points</p>
              </div>
              
              <div className="p-4 sm:p-6">
                <div className="space-y-3">
                  {leaderboard.map((user, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md transition-all group">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm
                          ${idx === 0 ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' : 
                            idx === 1 ? 'bg-gray-200 text-gray-700 border border-gray-300' : 
                            idx === 2 ? 'bg-saffron-100 text-saffron-800 border border-saffron-300' : 
                            'bg-white text-gray-500 border border-gray-200'}
                        `}>
                          #{idx + 1}
                        </div>
                        <div>
                          <h4 className="font-black text-gray-900 text-base">{user.name}</h4>
                          <div className="flex gap-3 mt-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            <span className="flex items-center gap-1"><Activity size={10}/> {user.totalJapa}</span>
                            <span className="flex items-center gap-1"><Sun size={10}/> {user.totalMed}m</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-emerald-600">{(user.karma || 0).toLocaleString()}</p>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Karma</p>
                      </div>
                    </div>
                  ))}
                  {leaderboard.length === 0 && (
                    <div className="text-center py-10 text-gray-400">
                      <p className="font-bold">No active users yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
