import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, X, Download, Award, ShieldCheck, Sparkles, Heart, Clock, 
  Phone, MapPin, User, Mail, CreditCard, Droplet, Globe2, FileText, 
  Edit, Lock, Banknote, Filter, History, FileDigit, HeartHandshake, Plus, Flame, Send, ShieldAlert, LogOut, Camera, CheckCircle2, AlertTriangle, Ticket,
  LayoutDashboard, Bell
, Fingerprint } from 'lucide-react';
import { DevoteeSelfService } from '../account/DevoteeSelfService';
import QRCode from 'qrcode';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import { generateDevoteeCardPDF, generateTaxReceiptPDF } from '../../utils/pdfGenerator';
import { generateSecureQRToken, generateDynamicToken } from '../../utils/qrUtils';
import { useToast } from '../../context/ToastContext';

interface MySpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (moduleName: string) => void;
}

export const MySpaceModal: React.FC<MySpaceModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const { activeWorkspace, currentDevotee, currentRole, logout } = useAuthWorkspace();
  const { devotees, updateDevotee, treasury } = useData();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

  const handleBiometricToggle = async () => {
    try {
      if (!window.PublicKeyCredential) {
        showToast('Biometric authentication is not supported on this device.', 'error');
        return;
      }

      // Prevent console errors in AI Studio iframe preview by checking frame context
      if (window.self !== window.top) {
         if (!isBiometricEnabled) {
            setIsBiometricEnabled(true);
            showToast('Preview Mode: Biometric setup simulated. Open in a new tab for real WebAuthn.', 'success');
         } else {
            setIsBiometricEnabled(false);
            showToast('Biometric authentication disabled.', 'success');
         }
         return;
      }

      if (!isBiometricEnabled) {
        const publicKey: PublicKeyCredentialCreationOptions = {
          challenge: new Uint8Array(32),
          rp: { name: "Sanatani Bandhan", id: window.location.hostname },
          user: {
            id: new Uint8Array(16),
            name: activeMember?.email || 'user@example.com',
            displayName: activeMember?.fullName || activeMember?.name || 'User'
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" as "public-key" }],
          authenticatorSelection: { authenticatorAttachment: "platform" as AuthenticatorAttachment },
          timeout: 60000,
        };
        const cred = await navigator.credentials.create({ publicKey });
        if (cred) {
          setIsBiometricEnabled(true);
          showToast('Biometric authentication enabled successfully!', 'success');
        }
      } else {
         setIsBiometricEnabled(false);
         showToast('Biometric authentication disabled.', 'success');
      }
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        showToast('Preview restricted: Please open the app in a new tab to use Biometrics.', 'error');
      } else {
        showToast('Biometric setup failed or was cancelled.', 'error');
      }
      console.error(err);
    }
  };
  const [profileTab, setProfileTab] = useState<'DASHBOARD' | 'PASS' | 'IDENTITY' | 'ACTIVITY' | 'GLOBAL' | 'SECURITY'>('DASHBOARD');
  
  const [editModal, setEditModal] = useState<{field: string, displayName: string, value: string} | null>(null);
  const [activityFilterType, setActivityFilterType] = useState('ALL');
  const [activityDateRange, setActivityDateRange] = useState({ start: '', end: '' });
  const [showQR, setShowQR] = useState(false);
  
  const editPhotoRef = useRef<HTMLInputElement>(null);

  const activeMember = currentDevotee || devotees[0];
  const [dynamicGatePassQr, setDynamicGatePassQr] = useState<string>('');
  const [gatePassSecondsLeft, setGatePassSecondsLeft] = useState<number>(300);

  const refreshDynamicPass = useCallback(() => {
    if (!activeMember) return;
    const dynamicToken = generateDynamicToken(
      {
        uid: activeMember.id,
        id: activeMember.id,
        name: activeMember.fullName || activeMember.name,
        fullName: activeMember.fullName || activeMember.name,
        sevaTier: activeMember.sevaTier || 'Devotee',
        workspaceId: activeWorkspace?.id || 'default',
        purpose: 'Sanctum Darshan & Prasad Entry',
      },
      300
    );

    QRCode.toDataURL(dynamicToken, {
      margin: 1,
      width: 280,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).then((url) => setDynamicGatePassQr(url));
    setGatePassSecondsLeft(300);
  }, [activeMember, activeWorkspace]);

  useEffect(() => {
    if (!activeMember) return;
    refreshDynamicPass();
    const interval = setInterval(() => {
      setGatePassSecondsLeft((prev) => {
        if (prev <= 1) {
          refreshDynamicPass();
          return 300;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeMember, refreshDynamicPass]);

  useEffect(() => {
    if (!activeMember) return;
    const qrPayload = generateSecureQRToken(activeMember);
    QRCode.toDataURL(qrPayload, {
      margin: 1,
      width: 250,
      color: { dark: '#000000', light: '#ffffff' },
    }).then((url) => setQrDataUrl(url));
  }, [activeMember, activeWorkspace]);

  const handleDownloadPDF = async () => {
    if (!activeMember) return;
    try {
      setIsGeneratingPdf(true);
      await generateDevoteeCardPDF(activeMember, activeWorkspace);
      showToast('Smart Devotee Card PDF generated and downloaded!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to generate Smart Card', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const submitEditField = () => {
    if (!editModal || !editModal.value.trim() || !activeMember) return;
    const trimmedVal = editModal.value.trim();
    if (trimmedVal === (activeMember as any)[editModal.field]) {
      setEditModal(null);
      return;
    }
    
    updateDevotee(activeMember.id, { [editModal.field]: trimmedVal });
    showToast('Record updated successfully', 'success');
    setEditModal(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeMember) return;
    try {
      const { compressAvatarImage } = await import('../../utils/imageCompression');
      const downloadUrl = await compressAvatarImage(file);
      updateDevotee(activeMember.id, { photoUrl: downloadUrl });
      showToast("Profile photo updated successfully.", "success");
    } catch (err) {
      console.error('Failed to compress avatar:', err);
    }
    e.target.value = ''; 
  };

  if (!isOpen || !activeMember) return null;

  const calculateSevaScore = (donated: number, volunteerHours: number) => {
    const base = 50; 
    const volumePoints = Math.floor((donated || 0) / 1000) * 5; 
    const habitPoints = (volunteerHours || 0) * 10;
    return base + volumePoints + habitPoints;
  };

  const score = activeMember.sevaIndex || calculateSevaScore(activeMember.totalDonated || 0, activeMember.volunteerHours || 0);
  
  const getHaloDesign = (s: number) => {
    if(s >= 1500) return { color: 'from-yellow-400 via-saffron-500 to-purple-600', name: 'Ratna (Pillar)' };
    if(s >= 500) return { color: 'from-temple-300 to-blue-500', name: 'Vishesh (Core)' };
    if(s >= 100) return { color: 'from-saffron-400 to-red-500', name: 'Kormi (Active)' };
    return { color: 'from-temple-200 to-temple-300', name: 'Sadharan (Member)' };
  };

  const halo = getHaloDesign(score);

  const myTransactions = treasury.filter(tr => tr.devoteeId === activeMember.id);
  const filteredPersonalTransactions = myTransactions.filter(tr => {
    if (activityFilterType === 'INCOME' && tr.type !== 'Income') return false;
    if (activityFilterType === 'EXPENSE' && tr.type !== 'Expense') return false;
    if (activityDateRange.start && new Date(tr.date).getTime() < new Date(activityDateRange.start).getTime()) return false;
    if (activityDateRange.end && new Date(tr.date).getTime() > new Date(activityDateRange.end).setHours(23, 59, 59, 999)) return false;
    return true;
  });

  const calculateProfileCompletion = () => {
    let pts = 0;
    if (activeMember.fullName || activeMember.name) pts += 20;
    if (activeMember.phone) pts += 15;
    if (activeMember.email) pts += 10;
    if (activeMember.address) pts += 15;
    if ((activeMember as any).nid) pts += 10;
    if (activeMember.bloodGroup) pts += 10;
    if (activeMember.emergencyContact && activeMember.emergencyPhone) pts += 20;
    return pts;
  };
  const completionScore = calculateProfileCompletion();

  const getInitial = (name: string) => name ? name.charAt(0).toUpperCase() : 'ॐ';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-temple-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-0 sm:p-4 pt-safe pb-safe">
        <motion.div 
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          className="bg-white w-full sm:w-[95%] max-w-4xl h-full sm:h-auto max-h-[100dvh] sm:max-h-[95dvh] mx-auto sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/20"
        >
          {/* Header Banner */}
          <div className="h-32 sm:h-40 bg-gradient-to-r from-temple-900 to-black relative shrink-0 pt-safe">
             <button onClick={onClose} className="absolute top-4 right-4 text-temple-400 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-sm z-10"><X size={20}/></button>
          </div>

          <div className="px-5 sm:px-10 pb-0 shrink-0 bg-white border-b border-temple-100 z-10 relative">
             <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 mb-4 relative z-10">
               {/* Profile Photo */}
               <div className="relative group cursor-pointer w-28 h-28 sm:w-32 sm:h-32 -mt-14 sm:-mt-16 rounded-full border-4 border-white bg-white shadow-md shrink-0 mx-auto sm:mx-0" onClick={() => editPhotoRef.current?.click()}>
                 <div className={`w-full h-full rounded-full p-1 bg-gradient-to-tr ${halo.color}`}>
                   {activeMember.photoUrl && activeMember.photoUrl !== "" ? (
                     <img src={activeMember.photoUrl || undefined} alt="Profile" className="w-full h-full object-cover rounded-full border-2 border-white" />
                   ) : (
                     <div className="w-full h-full bg-white text-temple-400 rounded-full flex items-center justify-center font-black text-4xl sm:text-5xl border-2 border-white">
                       {getInitial(activeMember.fullName || activeMember.name || 'U')}
                     </div>
                   )}
                 </div>
                 <div className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md border border-temple-100 text-temple-700 hover:text-saffron-500 transition-colors z-10">
                   <Camera size={16}/>
                 </div>
                 <input type="file" accept="image/*" className="hidden" ref={editPhotoRef} onChange={handlePhotoUpload} />
               </div>

               <div className="flex-1 pb-2 text-center sm:text-left sm:ml-4 min-w-0">
                 <h2 className="text-2xl sm:text-3xl font-black text-temple-900 leading-tight mb-1 truncate px-2 sm:px-0">{activeMember.fullName || activeMember.name || 'Unnamed Profile'}</h2>
                 <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                   <span className="text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest bg-temple-100 text-temple-700 border border-temple-200">
                      {activeMember.role || 'Member'}
                   </span>
                   <span className="text-[10px] text-temple-500 font-mono font-bold tracking-wider px-2 py-1 bg-white border border-temple-200 rounded-md shadow-sm">ID: {activeMember.id}</span>
                 </div>
               </div>
             </div>

             {/* Profile Tabs */}
             <div className="flex items-center justify-start gap-5 sm:gap-6 border-b border-temple-200 overflow-x-auto scrollbar-hide w-full px-4 sm:px-0">
                <button onClick={()=>setProfileTab('DASHBOARD')} className={`pb-3 text-[11px] sm:text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap flex items-center gap-1.5 ${profileTab === 'DASHBOARD' ? 'text-saffron-600 border-b-2 border-saffron-600' : 'text-temple-400 hover:text-temple-700'}`}><LayoutDashboard size={14} className="mb-0.5 mr-1"/> Overview</button>
                <button onClick={()=>setProfileTab('PASS')} className={`pb-3 text-[11px] sm:text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap flex items-center gap-1.5 ${profileTab === 'PASS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-temple-400 hover:text-temple-700'}`}><Ticket size={14} className="mb-0.5 mr-1"/> Gate Pass</button>
                <button onClick={()=>setProfileTab('IDENTITY')} className={`pb-3 text-[11px] sm:text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap ${profileTab === 'IDENTITY' ? 'text-saffron-500 border-b-2 border-saffron-500' : 'text-temple-400 hover:text-temple-700'}`}>Identity</button>
                <button onClick={()=>setProfileTab('ACTIVITY')} className={`pb-3 text-[11px] sm:text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap ${profileTab === 'ACTIVITY' ? 'text-saffron-500 border-b-2 border-saffron-500' : 'text-temple-400 hover:text-temple-700'}`}>Activity</button>
                <button onClick={()=>setProfileTab('GLOBAL')} className={`pb-3 text-[11px] sm:text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap flex items-center gap-1 ${profileTab === 'GLOBAL' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-temple-400 hover:text-temple-700'}`}><Globe2 size={14} className="mb-0.5"/> Vedic Hub</button>
                <button onClick={()=>setProfileTab('SECURITY')} className={`pb-3 text-[11px] sm:text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap ${profileTab === 'SECURITY' ? 'text-red-500 border-b-2 border-red-500' : 'text-temple-400 hover:text-temple-700'}`}>Security</button>
             </div>
          </div>

          <div className="p-4 sm:p-8 overflow-y-auto bg-temple-50 flex-1 min-h-0 pb-12 custom-scrollbar">

            
            {profileTab === 'DASHBOARD' && (
              <div className="space-y-6 animate-in fade-in">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div className="bg-white p-5 rounded-3xl shadow-sm border border-temple-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
                     <Award className="w-8 h-8 text-saffron-500 mb-2" />
                     <p className="text-[10px] font-bold text-temple-500 uppercase tracking-widest">Seva Score</p>
                     <p className="text-2xl font-black text-temple-900">{score}</p>
                   </div>
                   <div className="bg-white p-5 rounded-3xl shadow-sm border border-temple-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
                     <Banknote className="w-8 h-8 text-emerald-500 mb-2" />
                     <p className="text-[10px] font-bold text-temple-500 uppercase tracking-widest">Total Donated</p>
                     <p className="text-2xl font-black text-temple-900">₹{(activeMember.totalDonated || 0).toLocaleString()}</p>
                   </div>
                   <div className="bg-white p-5 rounded-3xl shadow-sm border border-temple-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
                     <Clock className="w-8 h-8 text-blue-500 mb-2" />
                     <p className="text-[10px] font-bold text-temple-500 uppercase tracking-widest">Seva Hours</p>
                     <p className="text-2xl font-black text-temple-900">{activeMember.volunteerHours || 0} hrs</p>
                   </div>
                   <div className="bg-white p-5 rounded-3xl shadow-sm border border-temple-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
                     <CheckCircle2 className="w-8 h-8 text-indigo-500 mb-2" />
                     <p className="text-[10px] font-bold text-temple-500 uppercase tracking-widest">Profile Status</p>
                     <p className="text-2xl font-black text-temple-900">{completionScore}%</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {/* Left Column: Role & Permissions + Recent Activity */}
                   <div className="md:col-span-2 space-y-6">
                      <div className="bg-white rounded-3xl shadow-sm border border-temple-100 p-6 sm:p-8 relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                            <ShieldCheck className="w-40 h-40" />
                         </div>
                         <h3 className="text-sm font-black text-temple-900 uppercase tracking-widest mb-6 flex items-center gap-2"><Lock className="w-4 h-4 text-temple-400"/> Role & Access Summary</h3>
                         <div className="flex flex-col sm:flex-row gap-6 relative z-10">
                            <div className="flex-1 bg-temple-50 rounded-2xl p-5 border border-temple-100 flex flex-col justify-center">
                               <p className="text-[10px] font-bold text-temple-500 uppercase tracking-widest mb-1">Assigned Role</p>
                               <p className="text-xl font-black text-temple-900">{currentRole}</p>
                            </div>
                            <div className="flex-1 bg-temple-50 rounded-2xl p-5 border border-temple-100 flex flex-col justify-center">
                               <p className="text-[10px] font-bold text-temple-500 uppercase tracking-widest mb-1">Seva Tier</p>
                               <p className="text-xl font-black text-saffron-600">{activeMember.sevaTier || 'Sadharan'}</p>
                            </div>
                         </div>
                      </div>

                      <div className="bg-white rounded-3xl shadow-sm border border-temple-100 p-6 sm:p-8">
                         <h3 className="text-sm font-black text-temple-900 uppercase tracking-widest mb-6 flex items-center gap-2"><History className="w-4 h-4 text-temple-400"/> Recent Activity</h3>
                         {filteredPersonalTransactions.length > 0 ? (
                            <div className="space-y-3">
                               {filteredPersonalTransactions.slice(0, 3).map((tr, i) => (
                                 <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-temple-50 transition-colors border border-transparent hover:border-temple-100 group cursor-default">
                                    <div className="flex items-center gap-4">
                                       <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${tr.type === 'Income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                          <Banknote size={16} />
                                       </div>
                                       <div>
                                          <p className="text-sm font-bold text-temple-900 group-hover:text-temple-700 transition-colors">{tr.category}</p>
                                          <p className="text-[10px] font-bold text-temple-500 mt-0.5">{new Date(tr.date).toLocaleDateString()}</p>
                                       </div>
                                    </div>
                                    <p className={`text-sm font-black ${tr.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                       {tr.type === 'Income' ? '+' : '-'}₹{tr.amount.toLocaleString()}
                                    </p>
                                 </div>
                               ))}
                            </div>
                         ) : (
                            <div className="text-center py-10 text-temple-400 bg-temple-50 rounded-2xl border border-temple-100 border-dashed flex flex-col items-center justify-center">
                               <History className="w-8 h-8 mb-3 opacity-20" />
                               <p className="text-xs font-bold uppercase tracking-widest">No recent activity</p>
                            </div>
                         )}
                      </div>
                   </div>

                   {/* Right Column: Notifications Center */}
                   <div className="md:col-span-1">
                      <div className="bg-white rounded-3xl shadow-sm border border-temple-100 p-6 sm:p-8 h-full flex flex-col">
                         <div className="flex items-center justify-between mb-6">
                           <h3 className="text-sm font-black text-temple-900 uppercase tracking-widest flex items-center gap-2"><Bell className="w-4 h-4 text-temple-400"/> Notifications</h3>
                           <span className="bg-saffron-100 text-saffron-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">3 New</span>
                         </div>
                         
                         <div className="space-y-4 flex-1">
                            {[
                               { id: 1, title: 'Profile Incomplete', desc: 'Please add your emergency contact.', icon: AlertTriangle, color: 'text-saffron-500', bg: 'bg-saffron-50' },
                               { id: 2, title: 'Upcoming Duty', desc: 'You have a volunteer shift tomorrow at 8 AM.', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
                               { id: 3, title: 'Donation Received', desc: 'Thank you for your recent contribution.', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' },
                            ].map(notif => (
                               <div key={notif.id} className="flex gap-3 items-start p-4 rounded-2xl bg-temple-50/50 hover:bg-temple-50 border border-temple-100 transition-colors cursor-pointer group">
                                  <div className={`mt-0.5 w-8 h-8 shrink-0 rounded-full flex items-center justify-center shadow-sm ${notif.bg} ${notif.color}`}>
                                     <notif.icon size={14} />
                                  </div>
                                  <div>
                                     <p className="text-xs font-bold text-temple-900 group-hover:text-temple-700 transition-colors">{notif.title}</p>
                                     <p className="text-[10px] text-temple-500 font-medium leading-snug mt-1">{notif.desc}</p>
                                  </div>
                               </div>
                            ))}
                         </div>
                         
                         <button className="w-full mt-4 py-3 bg-temple-100 hover:bg-temple-200 text-temple-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors">
                           View All
                         </button>
                      </div>
                   </div>
                </div>
              </div>
            )}
{profileTab === 'PASS' && (
              <div className="space-y-6 animate-in fade-in flex flex-col items-center justify-center py-4">
                 <div className="bg-white rounded-3xl shadow-xl border border-temple-200 w-full max-w-sm overflow-hidden relative">
                    <div className="bg-gradient-to-r from-saffron-500 to-red-600 p-6 text-center">
                       <div className="flex items-center justify-center gap-1.5 mb-1">
                          <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                            <Sparkles size={11} /> Anti-Screenshot Dynamic Pass
                          </span>
                       </div>
                       <h3 className="text-2xl font-black text-white tracking-widest uppercase">Gate Pass</h3>
                       <p className="text-saffron-100 text-xs font-bold mt-0.5">{activeWorkspace.name}</p>
                    </div>
                    <div className="p-6 flex flex-col items-center bg-white relative">
                       <div className="absolute -left-4 top-0 w-8 h-8 bg-temple-50 rounded-full shadow-inner border border-temple-100"></div>
                       <div className="absolute -right-4 top-0 w-8 h-8 bg-temple-50 rounded-full shadow-inner border border-temple-100"></div>

                       {/* QR Image with Refresh Timer */}
                       <div className="relative mb-3">
                         <img
                           src={dynamicGatePassQr || qrDataUrl || undefined}
                           alt="Dynamic Gate Pass QR"
                           className="w-48 h-48 rounded-2xl shadow-md border-4 border-temple-50 bg-white p-2"
                         />
                       </div>

                       {/* Expiry Countdown Chip */}
                       <div className="flex items-center gap-2 mb-3">
                         <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono font-bold">
                           <Clock size={13} className="text-amber-600 animate-spin" style={{ animationDuration: '6s' }} />
                           <span>
                             Valid: {Math.floor(gatePassSecondsLeft / 60)}:
                             {(gatePassSecondsLeft % 60).toString().padStart(2, '0')}
                           </span>
                         </div>
                         <button
                           type="button"
                           onClick={refreshDynamicPass}
                           className="p-1 rounded-full bg-temple-100 hover:bg-temple-200 text-temple-700 transition-colors"
                           title="Force Refresh Dynamic Token"
                         >
                           <Sparkles size={13} />
                         </button>
                       </div>

                       <h4 className="text-xl font-black text-temple-900 text-center">{activeMember.fullName || activeMember.name}</h4>
                       <p className="text-sm font-mono font-bold text-temple-500 tracking-widest mt-0.5 text-center">{activeMember.id}</p>

                       {completionScore === 100 ? (
                         <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-full mt-3 border border-emerald-200 flex items-center gap-1.5">
                           <ShieldCheck size={14}/> Identity Verified
                         </p>
                       ) : (
                         <button onClick={() => setProfileTab('IDENTITY')} className="text-[10px] font-black text-temple-500 hover:text-saffron-600 uppercase tracking-widest bg-temple-100 hover:bg-saffron-50 px-3 py-1.5 rounded-full mt-3 border border-temple-200 hover:border-saffron-200 flex items-center gap-1.5 transition-colors">
                           <AlertTriangle size={14}/> Complete Profile
                         </button>
                       )}
                    </div>
                    <div className="bg-temple-50 p-4 border-t border-temple-100 text-center">
                       <p className="text-[10px] font-bold text-temple-500 uppercase tracking-widest leading-relaxed">
                         Screenshots expire automatically. Present this dynamic live pass to volunteers at entry gates.
                       </p>
                    </div>
                 </div>
                 
                 {/* Quick Actions (Gate Pass) */}
                 <div className="flex gap-3 w-full max-w-sm mt-4">
                    <button onClick={handleDownloadPDF} className="flex-1 bg-white border border-temple-200 text-temple-700 hover:text-temple-900 hover:bg-temple-50 font-black py-4 rounded-xl text-[10px] uppercase tracking-widest flex justify-center items-center gap-2 shadow-sm transition-all hover:-translate-y-0.5">
                      <Download size={16}/> Download
                    </button>
                    <button onClick={() => {
                        const shareText = `Here is my Digital Gate Pass for ${activeWorkspace.name}`;
                        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                        window.open(whatsappUrl, '_blank');
                    }} className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-widest flex justify-center items-center gap-2 shadow-sm transition-all hover:-translate-y-0.5">
                      <Send size={16}/> Share on WhatsApp
                    </button>
                 </div>
              </div>
            )}

            {profileTab === 'IDENTITY' && (
              <div className="animate-in fade-in">
                <DevoteeSelfService />
              </div>
            )}

            {profileTab === 'ACTIVITY' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="bg-white border border-temple-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-tr ${halo.color} text-white flex items-center justify-center shrink-0 shadow-lg`}>
                    <Award size={28}/>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-lg font-black text-temple-900 mb-1">Seva Index: <span className="text-saffron-500">{score}</span></h3>
                    <p className="text-xs font-bold text-temple-500">Your current rank is <strong className="text-temple-800">{halo.name}</strong></p>
                  </div>
                </div>

                <div className="bg-white border border-emerald-200 rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 right-0 -mt-6 -mr-6 opacity-5 pointer-events-none"><Banknote size={120} className="text-emerald-600"/></div>
                   <div className="text-center sm:text-left relative z-10">
                     <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1.5 flex items-center justify-center sm:justify-start gap-1.5"><Banknote size={14}/> Lifetime Donated</p>
                     <p className="text-4xl font-black text-emerald-600 tracking-tight">₹{(activeMember.totalDonated || 0).toLocaleString()}</p>
                   </div>
                </div>

                <div className="bg-white border border-temple-200 rounded-3xl overflow-hidden shadow-sm">
                  <div className="bg-temple-50 px-5 py-4 border-b border-temple-200 flex flex-col gap-3">
                    <span className="text-[10px] font-black text-temple-500 uppercase tracking-widest flex items-center gap-1.5"><Filter size={14}/> Filters</span>

                    <div className="grid grid-cols-2 md:flex md:flex-row items-center gap-3 w-full">
                      <select 
                        value={activityFilterType} 
                        onChange={e => setActivityFilterType(e.target.value)}
                        className="col-span-2 md:col-span-1 p-3 bg-white border border-temple-200 rounded-xl text-xs font-bold text-temple-700 outline-none cursor-pointer shadow-sm transition-colors focus:border-saffron-500"
                      >
                        <option value="ALL">All Activities</option>
                        <option value="INCOME">Donations Only</option>
                        <option value="EXPENSE">Expenses Only</option>
                      </select>

                      <div className="col-span-2 md:w-auto flex items-center bg-white border border-temple-200 p-1.5 rounded-xl shadow-sm overflow-x-auto">
                        <input type="date" value={activityDateRange.start} onChange={e => setActivityDateRange({ ...activityDateRange, start: e.target.value })} className="p-1.5 bg-transparent text-xs text-temple-700 font-bold outline-none flex-1 min-w-[110px]" />
                        <span className="text-temple-300 font-bold px-2">-</span>
                        <input type="date" value={activityDateRange.end} onChange={e => setActivityDateRange({ ...activityDateRange, end: e.target.value })} className="p-1.5 bg-transparent text-xs text-temple-700 font-bold outline-none flex-1 min-w-[110px]" />
                        {(activityDateRange.start || activityDateRange.end) && (
                          <button onClick={() => setActivityDateRange({start:'', end:''})} className="bg-temple-100 hover:bg-temple-200 p-1.5 rounded-lg transition-colors ml-1"><X size={14}/></button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto p-3 custom-scrollbar">
                     {filteredPersonalTransactions.length > 0 ? (
                       <div className="space-y-2">
                         {filteredPersonalTransactions.map((tr, idx) => (
                           <div key={`${tr.id}-${idx}`} className="p-4 bg-white border border-temple-100 hover:border-temple-200 hover:shadow-sm rounded-2xl transition-all flex justify-between items-center group min-w-0">
                             <div className="min-w-0 pr-4">
                               <p className="text-sm font-black text-temple-900 truncate">{tr.purpose || tr.category}</p>
                               <p className="text-[10px] font-bold text-temple-400 tracking-wider mt-1">{new Date(tr.date).toLocaleString()}</p>
                             </div>

                             <div className="flex items-center gap-4 shrink-0">
                               <div className="text-right">
                                 <p className={`text-base font-black ${tr.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>{tr.type === 'Income' ? '+' : '-'}₹{Math.abs(tr.amount)}</p>
                                 <p className="text-[9px] font-bold text-temple-400 uppercase tracking-widest mt-0.5">By {tr.handledBy?.split(' ')[0] || 'System'}</p>
                               </div>
                               <button 
                                 onClick={async (e) => { 
                                   e.stopPropagation();
                                   try {
                                     await generateTaxReceiptPDF(tr, activeWorkspace);
                                     showToast("Receipt downloaded successfully.", "success");
                                   } catch (err: any) { showToast(err.message, "error"); }
                                 }} 
                                 className="text-temple-500 hover:text-saffron-500 p-2.5 bg-temple-50 hover:bg-saffron-50 rounded-xl border border-transparent hover:border-saffron-200 transition-all shadow-sm" 
                                 title="Download Receipt"
                               >
                                 <FileDigit size={16}/>
                               </button>
                             </div>
                           </div>
                         ))}
                       </div>
                     ) : (
                       <div className="py-12 text-center text-temple-400">
                         <History size={32} className="mx-auto mb-3 opacity-20"/>
                         <p className="text-xs font-bold uppercase tracking-widest">No activities found.</p>
                       </div>
                     )}
                  </div>
                </div>
              </div>
            )}

            {profileTab === 'GLOBAL' && (
              <div className="space-y-6 animate-in fade-in">
                {/* VIVAH BANDHAN MATRIMONIAL WIDGET */}
                <div className="bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-200 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <div className="absolute top-0 right-0 -mt-6 -mr-6 opacity-10 pointer-events-none">
                     <Heart size={150} className="text-pink-500 fill-current"/>
                  </div>
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md border border-pink-100 shrink-0 relative z-10">
                    <HeartHandshake size={32} className="text-pink-600"/>
                  </div>
                  <div className="flex-1 text-center sm:text-left relative z-10">
                    <h4 className="text-lg font-black text-temple-900 mb-1">Vivah Bandhan Matrimonial</h4>
                    <p className="text-xs font-bold text-temple-600 mb-4 max-w-sm leading-relaxed">
                      Find verified, compatible matches within the Sanatan community based on strict Gotra alignment.
                    </p>
                    <button 
                      onClick={() => {
                        if (onNavigate) onNavigate('matrimony');
                      }}
                      className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 inline-flex items-center gap-2"
                    >
                      <Plus size={14}/> Create Matrimonial Profile
                    </button>
                  </div>
                </div>

                {/* GLOBAL PUROHIT WIDGET */}
                <div className="bg-gradient-to-br from-saffron-50 to-red-50 border border-saffron-200 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <div className="absolute top-0 right-0 -mt-6 -mr-6 opacity-10 pointer-events-none">
                     <Flame size={150} className="text-saffron-500 fill-current"/>
                  </div>
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md border border-saffron-100 shrink-0 relative z-10">
                    <Sparkles size={32} className="text-saffron-500"/>
                  </div>
                  <div className="flex-1 text-center sm:text-left relative z-10">
                    <h4 className="text-lg font-black text-temple-900 mb-1">Global Purohit Registry</h4>
                    <p className="text-xs font-bold text-temple-600 mb-4 max-w-sm leading-relaxed">
                      Are you a qualified Acharya, Pandit, or Vedic Scholar? Apply to join the global registry.
                    </p>
                    <button 
                      onClick={() => {
                        if (onNavigate) onNavigate('purohitMarket');
                      }}
                      className="bg-temple-900 hover:bg-black text-white px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 inline-flex items-center gap-2"
                    >
                      <Send size={14}/> Apply for Verified Badge
                    </button>
                  </div>
                </div>
              </div>
            )}

            {profileTab === 'SECURITY' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="bg-white border border-indigo-100 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col sm:flex-row items-center gap-6 sm:gap-8 relative overflow-hidden text-center sm:text-left">
                   <div className="absolute top-0 left-0 w-1.5 sm:w-full h-full sm:h-1.5 bg-indigo-500"></div>

                   {showQR ? (
                     <div className="flex flex-col items-center bg-temple-50 p-4 rounded-2xl shadow-inner border border-temple-200 shrink-0 animate-in zoom-in-95 relative overflow-hidden">
                        <img 
                          src={qrDataUrl || undefined} 
                          alt="Secure Auto-Login URL QR" 
                          className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl mb-3 border border-temple-200 shadow-sm blur-sm hover:blur-none transition-all duration-300"
                        />
                        <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-200 shadow-sm">Auto-Login Active</p>
                     </div>
                   ) : (
                     <div className="w-32 h-32 sm:w-40 sm:h-40 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-300 shrink-0 shadow-inner">
                       <QrCode size={48}/>
                     </div>
                   )}

                   <div className="flex flex-col justify-center w-full">
                      <h3 className="text-lg font-black text-temple-900 mb-1">Account Recovery QR</h3>
                      <p className="text-xs font-bold text-temple-500 mb-4 max-w-sm mx-auto sm:mx-0 leading-relaxed">
                        Download or scan this to automatically log back into your workspace if you forget your PIN.
                      </p>

                      <p className="text-[10px] font-bold text-rose-500 mb-6 bg-rose-50 p-3 rounded-xl border border-rose-100 text-left flex items-start gap-2 leading-relaxed">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5"/> 
                        WARNING: This QR code contains your secure PIN. Do not show this to volunteers at the gate. Use the "Gate Pass" tab instead.
                      </p>

                      <div className="flex flex-col sm:flex-row gap-3 w-full">
                         <button onClick={() => setShowQR(!showQR)} className="flex-1 bg-white border border-temple-200 text-temple-700 hover:bg-temple-50 font-black py-3.5 rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-sm">
                           {showQR ? 'Hide QR' : 'View QR'}
                         </button>
                         <button onClick={handleDownloadPDF} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 rounded-xl text-[10px] uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5">
                           <Download size={14}/> Download PDF
                         </button>
                      </div>
                   </div>
                </div>

                <div className="bg-white border border-temple-200 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden mt-6">
                   <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${isBiometricEnabled ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-temple-50 border-temple-200 text-temple-400'}`}>
                         <Fingerprint size={24} />
                      </div>
                      <div>
                         <h3 className="text-sm font-black text-temple-900 mb-1">Biometric Authentication</h3>
                         <p className="text-xs font-bold text-temple-500 leading-relaxed max-w-sm">Use Face ID or Touch ID to log in securely without entering your PIN.</p>
                      </div>
                   </div>
                   <button
                     onClick={handleBiometricToggle}
                     className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 shrink-0 ${isBiometricEnabled ? 'bg-emerald-500' : 'bg-temple-300'}`}
                   >
                     <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${isBiometricEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                   </button>
                </div>

                <div className="border border-rose-100 bg-rose-50/50 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden mt-6">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
                  <p className="text-[10px] font-black text-rose-600 flex items-center gap-2 uppercase tracking-widest mb-5 border-b border-rose-100 pb-4"><ShieldAlert size={16}/> Security Controls</p>

                  <button onClick={() => { logout(); onClose(); }} className="w-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-widest flex justify-center items-center gap-2 transition-all shadow-sm hover:-translate-y-0.5">
                    <LogOut size={16}/> Secure Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Inline Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-temple-900/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 ring-1 ring-white/20 relative">
              <button onClick={() => setEditModal(null)} className="absolute top-4 right-4 text-temple-400 hover:text-temple-900 bg-temple-100 p-2.5 rounded-full transition-colors"><X size={16}/></button>

              <div className="mb-6">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner border border-indigo-100"><Edit size={24}/></div>
                <h3 className="text-xl font-black text-temple-900 tracking-tight">Update {editModal.displayName}</h3>
                <p className="text-xs font-bold text-temple-500 mt-1">Enter your new information below.</p>
              </div>

              {editModal.field === 'address' ? (
                <textarea 
                  rows={3} 
                  value={editModal.value} 
                  onChange={(e) => setEditModal({...editModal, value: e.target.value})} 
                  autoFocus
                  className="w-full p-4 bg-temple-50 border border-temple-200 rounded-xl outline-none text-sm font-bold text-temple-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm resize-none"
                  placeholder="Street, City, Zip Code..."
                />
              ) : (
                <input 
                  type={editModal.field === 'email' ? 'email' : editModal.field === 'phone' ? 'tel' : 'text'} 
                  value={editModal.value} 
                  onChange={(e) => setEditModal({...editModal, value: e.target.value})} 
                  autoFocus
                  className="w-full p-4 bg-temple-50 border border-temple-200 rounded-xl outline-none text-sm font-bold text-temple-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm"
                />
              )}

              <div className="flex gap-3 mt-8">
                 <button onClick={() => setEditModal(null)} className="flex-1 px-4 py-3.5 bg-temple-100 text-temple-600 hover:bg-temple-200 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-sm">Cancel</button>
                 <button onClick={submitEditField} className="flex-[2] px-4 py-3.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all hover:-translate-y-0.5 flex justify-center items-center gap-2">
                   Save <CheckCircle2 size={16}/>
                </button>
              </div>
           </div>
        </div>
      )}
    </AnimatePresence>
  );
};
