import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { doc, collection, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  Heart, ShieldCheck, Lock, MapPin, Briefcase, Star, Search, Filter,
  MessageCircle, UserCircle, CheckCircle2, AlertTriangle, Loader2,
  Image as ImageIcon, X, Clock, UserPlus, EyeOff
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { DirectMessageChat } from '../common/DirectMessageChat';
import { useLanguage } from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationContext';
import { usePlanGate } from '../../hooks/usePlanGate';

export default function SanataniVivahDesk({ isOnline = navigator.onLine }: { isOnline?: boolean }) {
  const { currentDevotee, activeWorkspace } = useAuthWorkspace();
  const { addNotification } = useNotifications();
  const { t, language } = useLanguage();
  const { checkGate } = usePlanGate();

  const currentUser = currentDevotee;
  const workspaceId = activeWorkspace?.id;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('BROWSE'); // 'BROWSE' | 'MATCHES' | 'MY_PROFILE'
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'|'offline'} | null>(null);

  const [profiles, setProfiles] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem(`sb_vivah_profiles_${workspaceId}`);
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [connections, setConnections] = useState<Record<string, any>>({});
  
  const myProfile = useMemo(() => profiles.find(p => p.uid === currentUser?.id), [profiles, currentUser]);

  const [filterCity, setFilterCity] = useState('');
  const [filterGotra, setFilterGotra] = useState('');
  const [filterEducation, setFilterEducation] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [activeChatProfile, setActiveChatProfile] = useState<any>(null);

  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || currentUser?.fullName || '',
    gender: 'MALE',
    dob: '',
    height: '',
    gotra: '',
    dosha: 'None',
    profession: '',
    education: '',
    location: '',
    bio: '',
    photoUrl: ''
  });

  const showToast = (message: string, type: 'success'|'error'|'offline' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (myProfile) {
      setProfileForm({
        name: myProfile.name || '',
        gender: myProfile.gender || 'MALE',
        dob: myProfile.dob || '',
        height: myProfile.height || '',
        gotra: myProfile.gotra || '',
        dosha: myProfile.dosha || 'None',
        profession: myProfile.profession || '',
        education: myProfile.education || '',
        location: myProfile.location || '',
        bio: myProfile.bio || '',
        photoUrl: myProfile.photoUrl || ''
      });
    }
  }, [myProfile]);

  useEffect(() => {
    if (!workspaceId) return;

    // Load Profiles
    const profRef = collection(db, `communities/${workspaceId}/vivah_profiles`);
    const unsubProf = onSnapshot(profRef, snap => {
      if (!snap.empty) {
        const p = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
        setProfiles(p);
        localStorage.setItem(`sb_vivah_profiles_${workspaceId}`, JSON.stringify(p));
      } else {
        // Seed demo profiles
        setProfiles([
          {
            uid: 'sys-demo-1', name: 'Aarushi Sharma', gender: 'FEMALE', dob: '1995-04-12', 
            height: '5\'4"', gotra: 'Bharadwaj', dosha: 'None', profession: 'Software Engineer', 
            location: 'Bangalore', bio: 'Looking for a compatible partner.', photoUrl: ''
          },
          {
            uid: 'sys-demo-2', name: 'Vikram Singh', gender: 'MALE', dob: '1992-08-25', 
            height: '5\'11"', gotra: 'Kashyap', dosha: 'Manglik', profession: 'Doctor', 
            location: 'Delhi', bio: 'Family oriented.', photoUrl: ''
          }
        ]);
      }
      setLoading(false);
    }, (err) => console.warn("Firebase SanataniVivahDesk sync:", err.message));

    // Load Connections (Bidirectional)
    const connRef = collection(db, `communities/${workspaceId}/vivah_connections`);
    const unsubConn = onSnapshot(connRef, snap => {
      const connMap: any = {};
      snap.forEach(d => {
        const data = d.data();
        if (data.fromId === currentUser?.id || data.toId === currentUser?.id) {
          const otherId = data.fromId === currentUser?.id ? data.toId : data.fromId;
          connMap[otherId] = data; // store the full connection object
        }
      });
      setConnections(connMap);
    }, (err) => console.warn("Firebase SanataniVivahDesk sync:", err.message));

    return () => { unsubProf(); unsubConn(); };
  }, [workspaceId, currentUser?.id]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.gotra.trim()) return showToast('Gotra is strictly required.', 'error');
    
    setSubmitting(true);
    try {
      const batch = writeBatch(db);
      const docRef = doc(db, `communities/${workspaceId}/vivah_profiles/${currentUser?.id}`);
      batch.set(docRef, {
        uid: currentUser?.id,
        ...profileForm,
        updatedAt: Date.now()
      }, { merge: true });
      
      await batch.commit();
      showToast('Profile updated successfully!', 'success');
      setActiveTab('BROWSE');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConnect = async (targetUid: string) => {
    if (!checkGate('devotees', 10)) return; // Requires standard plan to connect
    if (!myProfile) return showToast('Please create your profile first.', 'error');
    if (!isOnline) return showToast('Connection requires internet access.', 'offline');
    
    try {
      const batch = writeBatch(db);
      const connId = [currentUser?.id, targetUid].sort().join('_');
      const docRef = doc(db, `communities/${workspaceId}/vivah_connections/${connId}`);
      
      batch.set(docRef, {
        fromId: currentUser?.id,
        toId: targetUid,
        status: 'PENDING',
        updatedAt: Date.now()
      });
      
      await batch.commit();
      showToast('Connection request sent!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleConnectionResponse = async (targetUid: string, action: 'ACCEPTED' | 'REJECTED') => {
    try {
      const batch = writeBatch(db);
      const connId = [currentUser?.id, targetUid].sort().join('_');
      const docRef = doc(db, `communities/${workspaceId}/vivah_connections/${connId}`);
      
      batch.update(docRef, {
        status: action,
        updatedAt: Date.now()
      });
      
      await batch.commit();
      showToast(`Request ${action.toLowerCase()}!`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  if (loading) return <div className="flex justify-center p-20 text-rose-600"><Loader2 size={40} className="animate-spin" /></div>;

  const pendingRequests = Object.values(connections).filter(c => c.toId === currentUser?.id && c.status === 'PENDING');

  return (
    <div className="space-y-8 fade-in pb-12">
      {toast && createPortal(
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[10000] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4 ${toast.type === 'error' ? 'bg-red-900' : toast.type === 'offline' ? 'bg-saffron-900' : 'bg-temple-900'} text-white`}>
           <div className={`p-2 rounded-full shrink-0 ${toast.type === 'error' ? 'bg-red-500/20 text-red-400' : toast.type === 'offline' ? 'bg-saffron-500/20 text-saffron-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
             {toast.type === 'error' ? <AlertTriangle size={20}/> : <CheckCircle2 size={20}/>}
           </div>
           <div>
             <p className={`text-xs font-black uppercase tracking-widest mb-0.5 ${toast.type === 'error' ? 'text-red-400' : toast.type === 'offline' ? 'text-saffron-400' : 'text-emerald-400'}`}>{toast.type.toUpperCase()}</p>
             <p className="text-sm font-bold">{toast.message}</p>
           </div>
        </div>, document.body
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-temple-900 via-temple-800 to-rose-950 p-8 sm:p-12 rounded-3xl shadow-2xl relative overflow-hidden text-white min-h-[200px] flex flex-col justify-center">
        <div className="absolute -right-20 -top-20 opacity-5 pointer-events-none transform rotate-12">
           <Heart size={400} className="text-rose-400"/>
        </div>
        <div className="relative z-10 max-w-2xl">
          <span className="text-[10px] font-black uppercase tracking-widest bg-rose-500/20 text-rose-200 px-3 py-1 rounded-full border border-rose-400/30 mb-4 inline-block">
            Sanatani Matrimony
          </span>
          <h2 className="text-3xl sm:text-4xl font-black mb-3 tracking-tight leading-tight">Find Your Dharmic Partner</h2>
          <p className="text-sm font-medium text-temple-300 leading-relaxed max-w-xl">
            A secure, privacy-first platform enforcing Sagotra Vivah prohibition and rigorous Dosha matching. Personal Details and Photos remain masked until a mutual connection is established.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-2 rounded-2xl border border-temple-200 shadow-sm">
        <div className="flex w-full sm:w-auto bg-temple-100/80 p-1.5 rounded-xl overflow-x-auto scrollbar-hide">
          <button onClick={() => setActiveTab('BROWSE')} className={`flex-1 sm:w-40 py-3 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 whitespace-nowrap px-4 ${activeTab === 'BROWSE' ? 'bg-white text-temple-900 shadow-md border border-temple-100' : 'text-temple-500 hover:text-temple-800'}`}>
            <Search size={14}/> Browse Profiles
          </button>
          <button onClick={() => setActiveTab('MATCHES')} className={`flex-1 sm:w-40 py-3 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 whitespace-nowrap px-4 relative ${activeTab === 'MATCHES' ? 'bg-white text-temple-900 shadow-md border border-temple-100' : 'text-temple-500 hover:text-temple-800'}`}>
            <UserPlus size={14}/> Connections
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shadow-sm">{pendingRequests.length}</span>
            )}
          </button>
          <button onClick={() => setActiveTab('MY_PROFILE')} className={`flex-1 sm:w-40 py-3 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 whitespace-nowrap px-4 ${activeTab === 'MY_PROFILE' ? 'bg-white text-temple-900 shadow-md border border-temple-100' : 'text-temple-500 hover:text-temple-800'}`}>
            <UserCircle size={14}/> My Profile
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'MY_PROFILE' && (
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSaveProfile} className="bg-white p-6 sm:p-10 rounded-3xl border border-temple-200 shadow-sm space-y-8 animate-in fade-in">
            <div>
              <h3 className="text-xl font-black text-temple-900 border-b border-temple-100 pb-2 mb-6">Astrological & Personal Identity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-temple-500 uppercase tracking-widest mb-2">Full Name</label>
                  <input type="text" required value={profileForm.name} onChange={e=>setProfileForm({...profileForm, name: e.target.value})} className="w-full p-4 bg-temple-50 border border-temple-200 rounded-xl text-sm font-bold outline-none focus:border-temple-500 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-temple-500 uppercase tracking-widest mb-2">Gender</label>
                  <select value={profileForm.gender} onChange={e=>setProfileForm({...profileForm, gender: e.target.value})} className="w-full p-4 bg-temple-50 border border-temple-200 rounded-xl text-sm font-bold outline-none focus:border-temple-500 transition-all">
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2">Gotra (Required for Sagotra Check) *</label>
                  <input type="text" required placeholder="e.g., Kashyap, Bharadwaj" value={profileForm.gotra} onChange={e=>setProfileForm({...profileForm, gotra: e.target.value})} className="w-full p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm font-bold outline-none focus:border-rose-500 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-temple-500 uppercase tracking-widest mb-2">Dosha (Manglik / Kuja)</label>
                  <select value={profileForm.dosha} onChange={e=>setProfileForm({...profileForm, dosha: e.target.value})} className="w-full p-4 bg-temple-50 border border-temple-200 rounded-xl text-sm font-bold outline-none focus:border-temple-500 transition-all">
                    <option value="None">No Dosha (None)</option>
                    <option value="Manglik">Manglik (Anshik)</option>
                    <option value="Purna Manglik">Purna Manglik</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-temple-500 uppercase tracking-widest mb-2">Date of Birth</label>
                  <input type="date" required value={profileForm.dob} onChange={e=>setProfileForm({...profileForm, dob: e.target.value})} className="w-full p-4 bg-temple-50 border border-temple-200 rounded-xl text-sm font-bold outline-none focus:border-temple-500 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-temple-500 uppercase tracking-widest mb-2">Height (e.g., 5'10")</label>
                  <input type="text" required placeholder="e.g., 5 foot 8 inches" value={profileForm.height} onChange={e=>setProfileForm({...profileForm, height: e.target.value})} className="w-full p-4 bg-temple-50 border border-temple-200 rounded-xl text-sm font-bold outline-none focus:border-temple-500 transition-all" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black text-temple-900 border-b border-temple-100 pb-2 mb-6">Professional & Background</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-temple-500 uppercase tracking-widest mb-2">Profession / Occupation</label>
                  <input type="text" required value={profileForm.profession} onChange={e=>setProfileForm({...profileForm, profession: e.target.value})} className="w-full p-4 bg-temple-50 border border-temple-200 rounded-xl text-sm font-bold outline-none focus:border-temple-500 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-temple-500 uppercase tracking-widest mb-2">Education</label>
                  <input type="text" required placeholder="e.g. B.Tech, MBA" value={profileForm.education} onChange={e=>setProfileForm({...profileForm, education: e.target.value})} className="w-full p-4 bg-temple-50 border border-temple-200 rounded-xl text-sm font-bold outline-none focus:border-temple-500 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-temple-500 uppercase tracking-widest mb-2">Current Location (City)</label>
                  <input type="text" required value={profileForm.location} onChange={e=>setProfileForm({...profileForm, location: e.target.value})} className="w-full p-4 bg-temple-50 border border-temple-200 rounded-xl text-sm font-bold outline-none focus:border-temple-500 transition-all" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-temple-500 uppercase tracking-widest mb-2">About Me & Partner Preferences</label>
                  <textarea rows={4} required placeholder="Describe your values and what you are looking for..." value={profileForm.bio} onChange={e=>setProfileForm({...profileForm, bio: e.target.value})} className="w-full p-4 bg-temple-50 border border-temple-200 rounded-xl text-sm font-bold outline-none focus:border-temple-500 transition-all resize-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-temple-500 uppercase tracking-widest mb-2">Profile Photo (Auto-Compressed & Privacy Masked)</label>
                  <div className="flex gap-4 items-center">
                    {profileForm.photoUrl ? (
                      <img src={profileForm.photoUrl || undefined} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover shadow-sm border border-temple-200" />
                    ) : (
                      <div className="w-20 h-20 bg-temple-100 rounded-2xl border border-temple-200 border-dashed flex items-center justify-center text-temple-400">
                        <ImageIcon size={24}/>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={async (e) => {
                        if (e.target.files && e.target.files[0]) {
                          try {
                            const { compressAvatarImage } = await import('../../utils/imageCompression');
                            const compressed = await compressAvatarImage(e.target.files[0]);
                            setProfileForm({ ...profileForm, photoUrl: compressed });
                          } catch (err) {
                            showToast("Image compression failed.", "error");
                          }
                        }
                      }} 
                      className="text-xs font-bold text-temple-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-temple-100 file:text-temple-700 hover:file:bg-temple-200 transition-all cursor-pointer" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" disabled={submitting} className="w-full py-5 bg-temple-900 hover:bg-black text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl transition-all flex justify-center items-center gap-2">
              {submitting ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle2 size={18}/>} Save Profile
            </button>
          </form>
        </div>
      )}

      {activeTab === 'BROWSE' && (
        <div className="space-y-6">
          {!myProfile && (
            <div className="bg-saffron-50 border border-saffron-200 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between shadow-sm gap-4 animate-in fade-in">
              <div className="flex items-center gap-3 text-saffron-900">
                <AlertTriangle size={24} className="shrink-0 text-saffron-600"/>
                <div>
                  <h4 className="text-sm font-black">Action Required: Create Your Profile</h4>
                  <p className="text-xs font-medium text-saffron-700 mt-1">You must create a profile and specify your Gotra to view matches (Sagotra prohibition is enforced automatically).</p>
                </div>
              </div>
              <button onClick={() => setActiveTab('MY_PROFILE')} className="px-6 py-3 bg-saffron-600 hover:bg-saffron-700 transition-colors text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md shrink-0 w-full sm:w-auto">
                Set Up Profile
              </button>
            </div>
          )}

          <div className="bg-temple-50 p-4 rounded-2xl border border-temple-200 shadow-inner mb-6 flex flex-wrap gap-4 items-end animate-in fade-in">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[10px] font-black text-temple-500 uppercase tracking-widest mb-1.5"><Filter size={10} className="inline mr-1"/> Filter City</label>
              <input type="text" placeholder="All Cities" value={filterCity} onChange={e=>setFilterCity(e.target.value)} className="w-full p-3 bg-white border border-temple-200 rounded-xl text-xs font-bold outline-none focus:border-temple-500 transition-all" />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[10px] font-black text-temple-500 uppercase tracking-widest mb-1.5"><Filter size={10} className="inline mr-1"/> Filter Gotra</label>
              <input type="text" placeholder="All Gotras" value={filterGotra} onChange={e=>setFilterGotra(e.target.value)} className="w-full p-3 bg-white border border-temple-200 rounded-xl text-xs font-bold outline-none focus:border-temple-500 transition-all" />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[10px] font-black text-temple-500 uppercase tracking-widest mb-1.5"><Filter size={10} className="inline mr-1"/> Education</label>
              <input type="text" placeholder="All Degrees" value={filterEducation} onChange={e=>setFilterEducation(e.target.value)} className="w-full p-3 bg-white border border-temple-200 rounded-xl text-xs font-bold outline-none focus:border-temple-500 transition-all" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in">
            {profiles
              .filter(p => p.uid !== currentUser?.id)
              // Core Filter: Enforce Sagotra Prohibition
              .filter(p => !myProfile?.gotra || (p.gotra?.toLowerCase() !== myProfile.gotra?.toLowerCase()))
              // Advanced Filters
              .filter(p => !filterCity || p.location?.toLowerCase().includes(filterCity.toLowerCase()))
              .filter(p => !filterGotra || p.gotra?.toLowerCase().includes(filterGotra.toLowerCase()))
              .filter(p => !filterEducation || p.education?.toLowerCase().includes(filterEducation.toLowerCase()))
              .map((profile, idx) => {
                const conn = connections[profile.uid];
                const status = conn?.status;
                const isConnected = status === 'ACCEPTED';
                
                // Privacy Masking Engine
                const maskedName = isConnected ? profile.name : (profile.name?.charAt(0) + '********');
                const maskedProfession = isConnected ? profile.profession : 'Hidden until connected';
                const maskedLocation = isConnected ? profile.location : 'Hidden until connected';

                return (
                  <div key={`${profile.uid}-${idx}`} onClick={() => setSelectedProfile(profile)} className="bg-white rounded-3xl border border-temple-200 shadow-sm overflow-hidden flex flex-col group relative cursor-pointer hover:border-rose-200 transition-colors">
                    
                    {/* Privacy Badge overlay */}
                    {!isConnected && (
                      <div className="absolute top-3 right-3 z-20 bg-temple-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-[9px] font-black text-white flex items-center gap-1.5 shadow-xl">
                        <EyeOff size={12} className="text-rose-400"/> PRIVACY MASKED
                      </div>
                    )}
                    
                    <div className="h-56 bg-temple-100 relative overflow-hidden">
                      {profile.photoUrl ? (
                        <img 
                          src={profile.photoUrl || undefined} 
                          alt="Profile" 
                          className={`w-full h-full object-cover transition-transform duration-700 ${!isConnected ? 'blur-2xl grayscale opacity-60' : 'group-hover:scale-105'}`}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-temple-50 to-temple-200">
                          <UserCircle size={64} className="text-temple-300"/>
                        </div>
                      )}
                      {isConnected && (
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-800 flex items-center gap-1 shadow-sm z-10">
                          <ShieldCheck size={12} className="text-emerald-600"/> Connected
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-black text-temple-900 tracking-tight">{maskedName}</h3>
                      </div>
                      <p className="text-xs font-bold text-temple-500 mb-5 flex items-center gap-1.5">
                        <span>{profile.dob || 'Age NA'}</span> 
                        <span className="w-1 h-1 rounded-full bg-temple-300"></span> 
                        <span>{profile.height || 'Height NA'}</span>
                      </p>
                      
                      <div className="space-y-3 mb-6 flex-1">
                        <div className="flex items-center gap-2.5 text-sm text-temple-700">
                          <Star size={16} className="text-rose-500 shrink-0"/> 
                          <span className="font-bold">Gotra: <span className="text-temple-900">{profile.gotra}</span></span>
                        </div>
                        {profile.dosha && profile.dosha !== 'None' && (
                          <div className="flex items-center gap-2.5 text-xs text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-100">
                            <ShieldCheck size={14} className="shrink-0"/> 
                            <span className="font-black">{profile.dosha}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2.5 text-sm text-temple-700">
                          <Briefcase size={16} className="text-temple-400 shrink-0"/> 
                          <span className={isConnected ? 'font-bold' : 'font-medium text-temple-400 italic'}>{maskedProfession}</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-sm text-temple-700">
                          <MapPin size={16} className="text-temple-400 shrink-0"/> 
                          <span className={isConnected ? 'font-bold' : 'font-medium text-temple-400 italic'}>{maskedLocation}</span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); status ? null : handleConnect(profile.uid); }}
                        disabled={status === 'PENDING' || status === 'REJECTED'}
                        className={`w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 
                          ${status === 'PENDING' ? 'bg-temple-100 text-temple-500 border-temple-200 cursor-not-allowed' 
                          : status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-temple-900 hover:bg-black text-white border-temple-800 shadow-md hover:shadow-xl hover:-translate-y-0.5'}`}
                      >
                        {status === 'PENDING' ? <Clock size={16}/> : status === 'ACCEPTED' ? <MessageCircle size={16}/> : <UserPlus size={16}/>}
                        {status === 'PENDING' ? 'Request Pending' : status === 'ACCEPTED' ? 'Chat Available' : 'Connect'}
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {profiles.filter(p => p.uid !== currentUser?.id).length === 0 && (
                <div className="col-span-full py-24 text-center bg-white rounded-3xl border border-dashed border-temple-300">
                  <Search size={48} className="mx-auto mb-4 opacity-20 text-temple-600"/>
                  <p className="text-lg font-black text-temple-900 mb-1">No profiles match your criteria.</p>
                  <p className="text-xs font-bold text-temple-500">Sagotra Vivah rules are strictly enforced.</p>
                </div>
              )}
          </div>
        </div>
      )}

      {activeTab === 'MATCHES' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <h3 className="text-xl font-black text-temple-900 mb-4 flex items-center gap-2"><UserPlus className="text-temple-700"/> Connection Requests</h3>
          
          {Object.entries(connections).length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-temple-200 shadow-sm">
              <UserPlus size={48} className="mx-auto mb-4 opacity-20 text-temple-600"/>
              <p className="text-base font-black text-temple-900">No connections yet.</p>
              <p className="text-xs font-bold text-temple-500 mt-1">Browse profiles and send requests to connect.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(connections).map(([targetId, conn]: [string, any]) => {
                const targetProfile = profiles.find(p => p.uid === targetId);
                if (!targetProfile) return null;

                const isIncoming = conn.toId === currentUser?.id;
                const status = conn.status; // 'PENDING' | 'ACCEPTED' | 'REJECTED'

                return (
                  <div key={targetId} className="bg-white p-5 sm:p-6 rounded-3xl border border-temple-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="w-16 h-16 rounded-2xl bg-temple-100 overflow-hidden shrink-0">
                        {targetProfile.photoUrl && status === 'ACCEPTED' ? (
                          <img src={targetProfile.photoUrl || undefined} className="w-full h-full object-cover"/>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-temple-200"><UserCircle size={32} className="text-temple-400"/></div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-black text-temple-900 text-lg">{status === 'ACCEPTED' ? targetProfile.name : (targetProfile.name.charAt(0) + '********')}</h4>
                        <p className="text-xs font-bold text-temple-500 mt-0.5">Gotra: {targetProfile.gotra} | {targetProfile.location}</p>
                        
                        <div className="mt-2">
                          {status === 'PENDING' && isIncoming && <span className="text-[9px] font-black uppercase tracking-widest bg-saffron-100 text-saffron-800 px-2 py-1 rounded border border-saffron-200">Received Request</span>}
                          {status === 'PENDING' && !isIncoming && <span className="text-[9px] font-black uppercase tracking-widest bg-temple-100 text-temple-600 px-2 py-1 rounded border border-temple-200">Sent Request</span>}
                          {status === 'ACCEPTED' && <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 px-2 py-1 rounded border border-emerald-200">Connected</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {status === 'PENDING' && isIncoming && (
                        <>
                          <button onClick={() => handleConnectionResponse(targetId, 'ACCEPTED')} className="flex-1 sm:flex-none py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors">Accept</button>
                          <button onClick={() => handleConnectionResponse(targetId, 'REJECTED')} className="flex-1 sm:flex-none py-3 px-6 bg-temple-100 hover:bg-temple-200 text-temple-700 text-xs font-black uppercase tracking-widest rounded-xl transition-colors">Decline</button>
                        </>
                      )}
                      {status === 'ACCEPTED' && (
                         <button onClick={() => setActiveChatProfile(targetProfile)} className="w-full sm:w-auto py-3 px-6 bg-temple-900 hover:bg-black text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2">
                           <MessageCircle size={16}/> Message
                         </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedProfile && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-temple-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-temple-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            {(() => {
              const conn = connections[selectedProfile.uid];
              const status = conn?.status;
              const isConnected = status === 'ACCEPTED';
              const maskedName = isConnected ? selectedProfile.name : (selectedProfile.name?.charAt(0) + '********');
              const maskedProfession = isConnected ? selectedProfile.profession : 'Hidden until connected';
              const maskedLocation = isConnected ? selectedProfile.location : 'Hidden until connected';
              const maskedEducation = isConnected ? (selectedProfile.education || 'NA') : 'Hidden until connected';

              return (
                <>
                  <div className="relative h-64 bg-temple-100">
                    {selectedProfile.photoUrl ? (
                      <img 
                        src={selectedProfile.photoUrl || undefined} 
                        alt="Profile" 
                        className={`w-full h-full object-cover ${!isConnected ? 'blur-xl grayscale opacity-70' : ''}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-temple-50 to-temple-200">
                        <UserCircle size={80} className="text-temple-300"/>
                      </div>
                    )}
                    <button onClick={() => setSelectedProfile(null)} className="absolute top-4 right-4 bg-white/50 hover:bg-white/90 backdrop-blur-md p-2 rounded-full text-temple-900 transition-all shadow-sm">
                      <X size={20}/>
                    </button>
                    {!isConnected && (
                      <div className="absolute top-4 left-4 bg-temple-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-[9px] font-black text-white flex items-center gap-1.5 shadow-xl">
                        <EyeOff size={14} className="text-rose-400"/> PRIVACY MASKED
                      </div>
                    )}
                  </div>
                  <div className="p-8">
                    <h2 className="text-2xl font-black text-temple-900 tracking-tight mb-2">{maskedName}</h2>
                    <p className="text-sm font-bold text-temple-500 flex items-center gap-2 mb-6">
                      <span>{selectedProfile.dob || 'Age NA'}</span> 
                      <span className="w-1 h-1 rounded-full bg-temple-300"></span> 
                      <span>{selectedProfile.height || 'Height NA'}</span>
                    </p>

                    <div className="space-y-4 mb-8 bg-temple-50 p-5 rounded-2xl border border-temple-100">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-temple-500 font-bold flex items-center gap-2"><Star size={16} className="text-rose-400"/> Gotra</span>
                        <span className="font-black text-temple-900">{selectedProfile.gotra}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-temple-500 font-bold flex items-center gap-2"><ShieldCheck size={16} className={selectedProfile.dosha !== 'None' ? 'text-rose-600' : 'text-emerald-500'}/> Dosha</span>
                        <span className={`font-black ${selectedProfile.dosha !== 'None' ? 'text-rose-700' : 'text-temple-900'}`}>{selectedProfile.dosha || 'None'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm border-t border-temple-200 pt-4">
                        <span className="text-temple-500 font-bold flex items-center gap-2"><Briefcase size={16} className="text-temple-400"/> Profession</span>
                        <span className={isConnected ? 'font-bold text-temple-900' : 'font-medium text-temple-400 italic'}>{maskedProfession}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-temple-500 font-bold flex items-center gap-2"><ImageIcon size={16} className="text-temple-400"/> Education</span>
                        <span className={isConnected ? 'font-bold text-temple-900' : 'font-medium text-temple-400 italic'}>{maskedEducation}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-temple-500 font-bold flex items-center gap-2"><MapPin size={16} className="text-temple-400"/> Location</span>
                        <span className={isConnected ? 'font-bold text-temple-900' : 'font-medium text-temple-400 italic'}>{maskedLocation}</span>
                      </div>
                    </div>

                    <div className="mb-8">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-temple-400 mb-2">About & Preferences</h4>
                      <p className="text-sm text-temple-700 font-medium leading-relaxed bg-white border border-temple-100 p-4 rounded-xl shadow-sm italic">
                        "{selectedProfile.bio || 'No bio provided.'}"
                      </p>
                    </div>

                    <button 
                      onClick={() => {
                        if (!status) handleConnect(selectedProfile.uid);
                        else if (status === 'ACCEPTED') setActiveChatProfile(selectedProfile);
                      }}
                      disabled={!!status}
                      className={`w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 
                        ${status === 'PENDING' ? 'bg-temple-100 text-temple-500 border-temple-200 cursor-not-allowed' 
                        : status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-temple-900 hover:bg-black text-white border-temple-800 shadow-md hover:shadow-xl hover:-translate-y-0.5'}`}
                    >
                      {status === 'PENDING' ? <Clock size={16}/> : status === 'ACCEPTED' ? <MessageCircle size={16}/> : <UserPlus size={16}/>}
                      {status === 'PENDING' ? 'Request Pending' : status === 'ACCEPTED' ? 'Send Message' : 'Connect'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* CHAT OVERLAY */}
      {activeChatProfile && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-4 bg-temple-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl h-full max-h-[85vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <DirectMessageChat 
              recipientId={activeChatProfile.uid}
              recipientName={activeChatProfile.name}
              recipientPhone={activeChatProfile.phone || '919876543210'}
              contextType="VIVAH"
              onClose={() => setActiveChatProfile(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

