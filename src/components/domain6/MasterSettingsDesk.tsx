import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { updatePassword, User as FirebaseUser } from 'firebase/auth';
import { auth, db, doc, collection, setDoc, serverTimestamp, query, where, getDocs } from '../../firebase';
import { 
  Settings, Shield, Building2, Key, Loader2, Save, Crown, 
  AlertTriangle, CreditCard, Send, CheckCircle2, Globe,
  WifiOff, MapPin, Phone, Mail, Copy, Camera, FileText, Image as ImageIcon, Briefcase, FileSignature, 
  X, Lock, QrCode, HelpCircle, Users, FileDigit, Navigation, AlertCircle, Palette, History
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { executeSafeUpdate } from '../../lib/dbUtils';
// import { pushToDataLayer } from '../../utils/gtm'; // Mocking or ignoring if missing

const getCurrencyDetails = (countryCode: string) => {
  switch(countryCode) {
    case 'INR': return { code: 'INR', symbol: '₹' };
    case 'BDT': return { code: 'BDT', symbol: '৳' };
    case 'NPR': return { code: 'NPR', symbol: 'रु' };
    case 'GBP': return { code: 'GBP', symbol: '£' };
    case 'USD': return { code: 'USD', symbol: '$' };
    default: return { code: 'BDT', symbol: '৳' }; 
  }
};

export const MasterSettingsDesk: React.FC = () => {
  const { activeWorkspace, updateWorkspaceDetails, currentRole, currentUser, checkPermission } = useAuthWorkspace();
  const { safeTranslate, t, language } = useLanguage();
  const localSafeTranslate = (key: string, en: string) => safeTranslate(key, en, en, en);
  const { showToast } = useToast();
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [saving, setSaving] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'BILLING'>('GENERAL');
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [appTheme, setAppTheme] = useState<'saffron' | 'classic'>(() => {
    return (localStorage.getItem('app-theme') as 'saffron' | 'classic') || 'saffron';
  });

  const toggleTheme = (newTheme: 'saffron' | 'classic') => {
    setAppTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    if (newTheme === 'classic') {
      document.documentElement.setAttribute('data-theme', 'classic');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    showToast(`Theme updated to ${newTheme === 'saffron' ? 'Saffron' : 'Classic'} Mode`, "success");
  };

  useEffect(() => {
    if (appTheme === 'classic') {
      document.documentElement.setAttribute('data-theme', 'classic');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [appTheme]);
  
  const [confirmDialog, setConfirmDialog] = useState<any>(null);

  const [workspaceInfo, setWorkspaceInfo] = useState({ 
    name: activeWorkspace?.name || '', 
    type: activeWorkspace?.type || 'MANDIR', 
    email: activeWorkspace?.email || '', 
    phone: activeWorkspace?.phone || '', 
    address: activeWorkspace?.address || '', 
    country: activeWorkspace?.country || 'N/A', 
    currencyCode: activeWorkspace?.currency || 'BDT',
    logoUrl: activeWorkspace?.logoUrl || '',
    bannerUrl: activeWorkspace?.bannerUrl || '',
    registrationNo: activeWorkspace?.trustRegNumber || '',
    taxId: activeWorkspace?.taxExemptionNumber || '',
    description: activeWorkspace?.tagline || ''
  });
  
  const [limits, setLimits] = useState({ plan: 'FREE', devoteeCount: 15, pdfsGenerated: 2 });

  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [passLoading, setPassLoading] = useState(false);

  // ✨ SMART PRO UPGRADE STATE
  const [saasConfig, setSaasConfig] = useState({ 
    bdtPrice: 5000, 
    usdPrice: 50, 
    originalBdtPrice: 8000, 
    originalUsdPrice: 80,   
    maxFreeMembers: 50, 
    maxFreePdfs: 3,
    duration: "LIFETIME ACCESS",
    subtitle: "NO HIDDEN FEES",
    features: ["Unlimited Devotees", "Master PDFs", "Mass Broadcasts"]
  });

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [paymentTab, setPaymentTab] = useState<'BD' | 'INTL'>('BD'); 
  const [copied, setCopied] = useState(false);

  const [upgradeForm, setUpgradeForm] = useState({ 
    contact: currentUser?.name || '', 
    senderNumber: '',
    paymentMethod: 'bKash',
    trxId: '' 
  });
  const [submittingTrx, setSubmittingTrx] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Geolocation states
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(
    (activeWorkspace as any)?.location?.lat ? (activeWorkspace as any)?.location : null
  );

  const BKASH_ROCKET_NUM = "01608533529";
  const NAGAD_NUM = "01701987744"; 
  const INTL_PAYMENT_LINK = "https://wise.com/pay/me/adeshc";

  const isAdmin = checkPermission(['TRUSTEE']);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { 
      window.removeEventListener('online', handleOnline); 
      window.removeEventListener('offline', handleOffline); 
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'BILLING' && activeWorkspace?.id) {
      const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
          const q = query(collection(db, 'upgrade_requests'), where('communityId', '==', activeWorkspace.id));
          const snapshot = (await getDocs(q).catch(e => { console.warn("Firebase getDocs error", e.message); return { empty: true, forEach: () => {}, docs: [] }; }));
          const history = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
          history.sort((a, b) => {
            const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
            const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
            return timeB - timeA;
          });
          setPaymentHistory(history);
        } catch (err) {
          console.error("Failed to fetch payment history", err);
        } finally {
          setLoadingHistory(false);
        }
      };
      fetchHistory();
    }
  }, [activeTab, activeWorkspace?.id]);

  if (!activeWorkspace) return null;
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'banner'|'logo') => {
    if (!isAdmin) return showToast(localSafeTranslate('err_unauthorized', "Unauthorized. Only Trustees can upload images."), "error");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return showToast(localSafeTranslate('err_only_images', "Only images allowed."), "error");

    try {
      const { compressImageFile } = await import('../../utils/imageCompression');
      const MAX_DIMENSION = type === 'banner' ? 1200 : 400; 
      const quality = type === 'banner' ? 0.7 : 0.8;
      const base64String = await compressImageFile(file, { maxWidth: MAX_DIMENSION, maxHeight: MAX_DIMENSION, quality });
      
      if (type === 'banner') setWorkspaceInfo(prev => ({ ...prev, bannerUrl: base64String }));
      else setWorkspaceInfo(prev => ({ ...prev, logoUrl: base64String }));
    } catch (err) {
      console.error('Failed to compress workspace image:', err);
      showToast(localSafeTranslate('err_image_upload', "Failed to process image."), "error");
    }
    e.target.value = ''; 
  };

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return showToast(localSafeTranslate('err_unauthorized', "Unauthorized. Only Trustees can modify workspace settings."), "error");

    setSaving(true);
    try {
      const newCurrencyObj = getCurrencyDetails(workspaceInfo.currencyCode);
      const safeName = workspaceInfo.name?.trim() || '';
      
      const updates = {
        name: safeName,
        address: workspaceInfo.address?.trim() || '',
        phone: workspaceInfo.phone?.trim() || '',
        email: workspaceInfo.email?.trim() || '',
        country: workspaceInfo.country?.trim() || '',
        currency: newCurrencyObj.code,
        currencySymbol: newCurrencyObj.symbol,
        logoUrl: workspaceInfo.logoUrl || '',
        bannerUrl: workspaceInfo.bannerUrl || '',
        trustRegNumber: workspaceInfo.registrationNo?.trim() || '',
        taxExemptionNumber: workspaceInfo.taxId?.trim() || '',
        tagline: workspaceInfo.description?.trim() || '',
        ...(coords && { location: coords })
      };

      updateWorkspaceDetails(updates);
      await executeSafeUpdate('workspaces', activeWorkspace?.id, updates, 'update');

      showToast(localSafeTranslate('settings_saved', "Workspace Settings Updated Successfully!"), "success");
    } catch (err: any) {
      showToast(err.message || "Error saving workspace", "error");
    } finally {
      setSaving(false);
    }
  };

  const detectLocation = () => {
    if (!isAdmin) return showToast(localSafeTranslate('err_unauthorized', "Unauthorized. Only Trustees can modify location."), "error");
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser.", "error");
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setIsDetectingLocation(false);
        showToast("Location detected successfully! Save settings to commit.", "success");
      },
      () => {
        setIsDetectingLocation(false);
        showToast("Unable to retrieve your location.", "error");
      }
    );
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword.length < 6) return showToast(localSafeTranslate('err_pass_length', "Password must be at least 6 characters."), "error");
    if (passwordData.newPassword !== passwordData.confirmPassword) return showToast(localSafeTranslate('err_pass_match', "Passwords do not match."), "error");

    setConfirmDialog({
      title: localSafeTranslate('update_password', "Update Admin Password"),
      message: localSafeTranslate('confirm_pass_update', "Are you sure you want to change your secure master password?"),
      confirmText: localSafeTranslate('btn_update_pass', "UPDATE PASSWORD"),
      isDanger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        setPassLoading(true);
        try {
          const user = auth.currentUser;
          if (user) {
            await updatePassword(user, passwordData.newPassword);
            showToast(localSafeTranslate('pass_updated_success', "Secure Password Updated Successfully!"), "success");
            setPasswordData({ newPassword: '', confirmPassword: '' });
          } else {
            throw new Error("No active auth session found. Please re-login.");
          }
        } catch (err: any) {
          if (err.message.includes('requires-recent-login')) {
            showToast("Security timeout. Please log out and log back in to change password.", "error");
          } else {
            showToast(err.message, "error");
          }
        } finally {
          setPassLoading(false);
        }
      }
    });
  };

  const handleSubmitUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!upgradeForm.contact || !upgradeForm.trxId) return showToast("Contact and Transaction ID are required.", "error");
    if (paymentTab === 'BD' && !upgradeForm.senderNumber) return showToast("Sender Number is required for verification.", "error");

    setSubmittingTrx(true);
    try {
      const requestRef = doc(collection(db, 'upgrade_requests'));
      await setDoc(requestRef, {
        requestId: requestRef.id,
        communityId: activeWorkspace?.id,
        communityName: workspaceInfo.name,
        adminName: currentUser?.name || 'Admin',
        contactInfo: upgradeForm.contact.trim(),
        senderNumber: paymentTab === 'BD' ? upgradeForm.senderNumber.trim() : 'N/A', 
        paymentMethod: paymentTab === 'BD' ? upgradeForm.paymentMethod : 'INTL Gateway (Wise/Payoneer)', 
        transactionId: upgradeForm.trxId.trim(),
        timestamp: serverTimestamp(),
        status: "PENDING",
        requestedPlan: "SMART_PRO" 
      });

      setShowUpgradeModal(false);
      setUpgradeForm({ contact: currentUser?.name || '', senderNumber: '', paymentMethod: 'bKash', trxId: '' });

      setConfirmDialog({
        title: localSafeTranslate('req_submitted', "Request Submitted!"),
        message: localSafeTranslate('dakshina_submitted_desc', "✅ Your transaction ID has been securely submitted. Our backend team will verify this within 24 hours and activate your SMART PRO status."),
        confirmText: localSafeTranslate('understood', "UNDERSTOOD"),
        isDanger: false,
        onConfirm: () => setConfirmDialog(null)
      });

    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmittingTrx(false);
    }
  };

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopied(true);
    showToast(localSafeTranslate('copied_success', "Number Copied Successfully!"), "success");
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6 fade-in pb-12 relative">

      {/* ✨ CONFIRMATION DIALOG PORTAL */}
      {confirmDialog && createPortal(
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 sm:p-8 animate-in zoom-in-95 ring-1 ring-white/20 text-center border-t-4 border-sanatani-orange">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner ${confirmDialog.isDanger ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
              {confirmDialog.isDanger ? <AlertTriangle size={32}/> : <CheckCircle2 size={32}/>}
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight">{confirmDialog.title}</h3>
            <p className="text-sm font-bold text-gray-500 mb-8 leading-relaxed whitespace-pre-wrap">{confirmDialog.message}</p>
            <div className="flex gap-3">
              {confirmDialog.isDanger && <button onClick={() => setConfirmDialog(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black py-3.5 rounded-xl text-xs uppercase tracking-widest transition-colors shadow-sm">{localSafeTranslate('btn_cancel', 'Cancel')}</button>}
              <button onClick={confirmDialog.onConfirm} className={`flex-1 font-black py-3.5 rounded-xl text-xs uppercase tracking-widest text-white shadow-md transition-all hover:-translate-y-0.5 ${confirmDialog.isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {!isOnline && (
        <div className="bg-red-600 text-white p-3 rounded-2xl flex items-center justify-center gap-3 shadow-lg mb-2 animate-pulse">
          <WifiOff size={18} />
          <span className="text-xs font-black uppercase tracking-widest">Offline Mode: Operating from local vault.</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl shadow-sm ring-1 ring-black/5">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
            <Settings className="text-sanatani-orange" size={28} /> {localSafeTranslate('nav_settings', 'Workspace Settings')}
          </h2>
          <p className="text-xs text-gray-500 font-bold mt-1 uppercase tracking-widest">{localSafeTranslate('settings_subtitle', 'Manage identity, usage counters, and secure access.')}</p>
        </div>
        {!isAdmin && (
           <div className="bg-gray-100 text-gray-500 border border-gray-200 px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm w-fit">
             <Lock size={16}/> <span className="text-[10px] font-black uppercase tracking-widest">View Only Mode</span>
           </div>
        )}
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex gap-2 border-b border-gray-200 mb-2 overflow-x-auto scrollbar-hide">
         <button onClick={() => setActiveTab('GENERAL')} className={`pb-3 text-sm font-black uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap px-2 ${activeTab === 'GENERAL' ? 'text-sanatani-orange border-b-2 border-sanatani-orange' : 'text-gray-400 hover:text-gray-700'}`}>
           <Settings size={16}/> General Settings
         </button>
         <button onClick={() => setActiveTab('BILLING')} className={`pb-3 text-sm font-black uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap px-2 ${activeTab === 'BILLING' ? 'text-sanatani-orange border-b-2 border-sanatani-orange' : 'text-gray-400 hover:text-gray-700'}`}>
           <CreditCard size={16}/> Billing & Subscription
         </button>
      </div>

      {activeTab === 'GENERAL' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN: Workspace Info & Geolocation */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden ring-1 ring-black/5">

             {/* Dynamic Banner Area */}
             <div className="h-32 sm:h-40 bg-gray-200 relative group">
                {workspaceInfo.bannerUrl ? (
                   <img src={workspaceInfo.bannerUrl || undefined} alt="Cover Banner" className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center text-gray-400">
                     <ImageIcon size={32} className="opacity-50"/>
                   </div>
                )}
                {isAdmin && (
                  <>
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm" onClick={() => bannerInputRef.current?.click()}>
                       <span className="text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 bg-black/50 px-4 py-2 rounded-xl border border-white/20"><Camera size={16}/> Update Cover Banner</span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" ref={bannerInputRef} onChange={(e) => handleImageUpload(e, 'banner')} />
                  </>
                )}
             </div>

             <div className="px-6 sm:px-8 pb-8">
               <div className="flex justify-center sm:justify-start -mt-12 mb-6 relative z-10">
                 <div className="relative group w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden shrink-0 cursor-pointer">
                    {workspaceInfo.logoUrl ? (
                      <img src={workspaceInfo.logoUrl || undefined} alt="Organization Logo" className="w-full h-full object-cover bg-white" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-saffron-50 to-saffron-100 text-sanatani-orange flex items-center justify-center font-black text-4xl shadow-inner border border-saffron-200">
                        {workspaceInfo.name ? workspaceInfo.name.charAt(0).toUpperCase() : 'ॐ'}
                      </div>
                    )}
                    {isAdmin && (
                      <>
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => logoInputRef.current?.click()}>
                          <Camera size={24} className="text-white"/>
                        </div>
                        <input type="file" accept="image/*" className="hidden" ref={logoInputRef} onChange={(e) => handleImageUpload(e, 'logo')} />
                      </>
                    )}
                 </div>
               </div>

               <h3 className="text-sm font-black text-gray-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-gray-100 pb-4 uppercase tracking-widest">
                 <div className="flex items-center gap-2">
                   <Building2 size={18} className="text-sanatani-orange" /> {localSafeTranslate('official_identity', 'Official Identity')}
                 </div>
                 <span className="text-[10px] bg-gray-50 text-gray-500 px-3 py-1.5 rounded-lg font-mono font-bold border border-gray-200 shadow-sm flex items-center gap-1.5">
                    <QrCode size={12}/> ID: {activeWorkspace?.id}
                 </span>
               </h3>

               <form onSubmit={handleSaveWorkspace} className="space-y-6">
                  {/* BASIC INFO */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{workspaceInfo.type} {localSafeTranslate('name', 'Name')} *</label>
                      <input type="text" required value={workspaceInfo.name} onChange={e=>setWorkspaceInfo({...workspaceInfo, name: e.target.value})} disabled={!isAdmin} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-sanatani-orange focus:ring-4 focus:ring-saffron-50 outline-none transition-all shadow-sm disabled:text-gray-500 disabled:cursor-not-allowed" />
                    </div>
                    {/* LOCKED ORGANIZATION TYPE */}
                    <div className="relative">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">{localSafeTranslate('org_type', 'Organization Type')}</label>
                      <input type="text" value={workspaceInfo.type} disabled={true} className="w-full p-4 pr-10 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 outline-none shadow-inner cursor-not-allowed" />
                      <Lock size={14} className="absolute right-4 top-[40px] text-gray-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Globe size={12}/> {localSafeTranslate('operating_currency', 'Operating Currency')}</label>
                      <select value={workspaceInfo.currencyCode} onChange={e=>setWorkspaceInfo({...workspaceInfo, currencyCode: e.target.value})} disabled={!isAdmin} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-sanatani-orange focus:ring-4 focus:ring-saffron-50 outline-none transition-all shadow-sm cursor-pointer appearance-none disabled:text-gray-500 disabled:cursor-not-allowed">
                        <option value="BDT">BDT (৳) - Bangladesh</option>
                        <option value="INR">INR (₹) - India</option>
                        <option value="NPR">NPR (रु) - Nepal</option>
                        <option value="USD">USD ($) - Global</option>
                        <option value="GBP">GBP (£) - UK</option>
                      </select>
                    </div>

                    <div className="relative">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><MapPin size={12}/> {localSafeTranslate('country', 'Country')}</label>
                      <input type="text" value={workspaceInfo.country} onChange={e=>setWorkspaceInfo({...workspaceInfo, country: e.target.value})} disabled={!isAdmin} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-sanatani-orange focus:ring-4 focus:ring-saffron-50 outline-none transition-all shadow-sm uppercase tracking-wider disabled:text-gray-500 disabled:cursor-not-allowed" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="relative">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Phone size={12}/> {localSafeTranslate('official_phone', 'Official Phone')}</label>
                      <input type="tel" value={workspaceInfo.phone} onChange={e=>setWorkspaceInfo({...workspaceInfo, phone: e.target.value})} disabled={!isAdmin} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-sanatani-orange focus:ring-4 focus:ring-saffron-50 outline-none transition-all shadow-sm disabled:text-gray-500 disabled:cursor-not-allowed" />
                    </div>
                    <div className="relative">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Mail size={12}/> {localSafeTranslate('official_email', 'Official Email')}</label>
                      <input type="email" value={workspaceInfo.email} onChange={e=>setWorkspaceInfo({...workspaceInfo, email: e.target.value})} disabled={!isAdmin} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-sanatani-orange focus:ring-4 focus:ring-saffron-50 outline-none transition-all shadow-sm disabled:text-gray-500 disabled:cursor-not-allowed" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5">
                    <div className="w-full">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><MapPin size={12}/> {localSafeTranslate('physical_address', 'Physical Address')}</label>
                      <input type="text" value={workspaceInfo.address} onChange={e=>setWorkspaceInfo({...workspaceInfo, address: e.target.value})} disabled={!isAdmin} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-sanatani-orange focus:ring-4 focus:ring-saffron-50 outline-none transition-all shadow-sm disabled:text-gray-500 disabled:cursor-not-allowed" placeholder="House, Street, City, Region..."/>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-6 mt-6">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-1.5"><Briefcase size={14}/> {localSafeTranslate('legal_info', 'Legal & Extended Information')}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{localSafeTranslate('reg_no', 'Registration No.')}</label>
                        <input type="text" value={workspaceInfo.registrationNo} onChange={e=>setWorkspaceInfo({...workspaceInfo, registrationNo: e.target.value})} disabled={!isAdmin} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-sanatani-orange focus:ring-4 focus:ring-saffron-50 outline-none transition-all shadow-sm disabled:text-gray-500 disabled:cursor-not-allowed" placeholder="Trust/Society Reg No."/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{localSafeTranslate('tax_id', 'Tax ID (PAN/BIN/EIN)')}</label>
                        <input type="text" value={workspaceInfo.taxId} onChange={e=>setWorkspaceInfo({...workspaceInfo, taxId: e.target.value})} disabled={!isAdmin} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-sanatani-orange focus:ring-4 focus:ring-saffron-50 outline-none transition-all shadow-sm disabled:text-gray-500 disabled:cursor-not-allowed" placeholder="Official Tax Identity"/>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><FileSignature size={12}/> {localSafeTranslate('mission_desc', 'Mission / Description')}</label>
                      <textarea rows={3} value={workspaceInfo.description} onChange={e=>setWorkspaceInfo({...workspaceInfo, description: e.target.value})} disabled={!isAdmin} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-sanatani-orange focus:ring-4 focus:ring-saffron-50 outline-none transition-all shadow-sm resize-none disabled:text-gray-500 disabled:cursor-not-allowed" placeholder="Describe your organization's mission..."></textarea>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex justify-end pt-4">
                      <button type="submit" disabled={saving} className="w-full sm:w-auto bg-gray-900 hover:bg-black text-white font-black py-4 px-8 rounded-xl text-xs uppercase tracking-widest flex justify-center items-center gap-2 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none">
                        {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} {localSafeTranslate('btn_save_settings', 'SAVE SETTINGS')}
                      </button>
                    </div>
                  )}
               </form>
             </div>
          </div>

          {/* GEOLOCATION SECTION */}
          <div className="bg-white border border-gray-100 p-6 sm:p-8 rounded-3xl shadow-sm ring-1 ring-black/5">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-6 border-b border-gray-100 pb-4 uppercase tracking-widest">
              <MapPin size={18} className="text-rose-500" />
              {localSafeTranslate('global_footprint', 'Global Footprint & Geolocation')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 space-y-4">
                <p className="text-[11px] font-bold text-gray-500 leading-relaxed uppercase tracking-widest">
                  {localSafeTranslate('geo_desc', "Pinpoint your organization's exact global coordinates. This enables nearby devotee discovery and localized panchang timings.")}
                </p>
                <button
                  onClick={detectLocation}
                  disabled={!isAdmin || isDetectingLocation}
                  className={`flex items-center justify-center w-full gap-2 py-3.5 px-4 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-sm ${
                    !isAdmin || isDetectingLocation 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:-translate-y-0.5'
                  }`}
                >
                  <Navigation className={`w-4 h-4 ${isDetectingLocation ? 'animate-pulse' : ''}`} />
                  {isDetectingLocation 
                    ? localSafeTranslate('detecting', 'Detecting...') 
                    : localSafeTranslate('detect_location_btn', 'Detect My Location')}
                </button>
              </div>
              
              <div className="md:col-span-2 relative overflow-hidden rounded-2xl bg-gray-50 border border-gray-200 h-48 flex items-center justify-center">
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
                
                {coords ? (
                  <div className="relative z-10 flex flex-col items-center bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-lg border border-gray-200/50">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3 shadow-inner">
                      <CheckCircle2 size={24} />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                      {localSafeTranslate('coords_locked', 'Coordinates Locked')}
                    </p>
                    <div className="flex gap-4 text-xs font-black font-mono text-gray-700 bg-gray-100 px-4 py-2 rounded-xl">
                      <span>LAT: {coords.lat.toFixed(6)}</span>
                      <span>LNG: {coords.lng.toFixed(6)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10 flex flex-col items-center text-gray-400">
                    <MapPin size={32} className="mb-3 opacity-50" />
                    <p className="text-xs font-black uppercase tracking-widest">
                      {localSafeTranslate('no_coords', 'No Coordinates Set')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Theme & Security */}
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden ring-1 ring-black/5">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-6 border-b border-gray-100 pb-4 uppercase tracking-widest"><Palette size={18} className="text-sanatani-orange" /> {localSafeTranslate('theme_appearance', 'Theme & Appearance')}</h3>
            <p className="text-[11px] font-bold text-gray-500 leading-relaxed uppercase tracking-widest mb-4">
              {localSafeTranslate('theme_desc', 'Customize the visual atmosphere of the portal. This preference is saved securely on this device.')}
            </p>
            <div className="flex bg-gray-100 p-1.5 rounded-2xl shadow-inner border border-gray-200 w-full">
              <button 
                type="button"
                onClick={() => toggleTheme('saffron')} 
                className={`flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex justify-center gap-2 items-center ${appTheme === 'saffron' ? 'bg-white text-saffron-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}>
                <Crown size={16} /> Saffron Mode
              </button>
              <button 
                type="button"
                onClick={() => toggleTheme('classic')} 
                className={`flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex justify-center gap-2 items-center ${appTheme === 'classic' ? 'bg-white text-blue-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}>
                <Shield size={16} /> Classic Mode
              </button>
            </div>
          </div>

          {isAdmin && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden ring-1 ring-black/5">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-6 border-b border-gray-100 pb-4 uppercase tracking-widest"><Shield size={18} className="text-blue-600" /> {localSafeTranslate('admin_security', 'Admin Security')}</h3>
               <form onSubmit={handleChangePassword} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{localSafeTranslate('new_master_pass', 'New Master Password')}</label>
                    <input type="password" required placeholder={localSafeTranslate('min_6_char', "Min 6 characters")} value={passwordData.newPassword} onChange={e=>setPasswordData({...passwordData, newPassword:e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{localSafeTranslate('confirm_pass', 'Confirm Password')}</label>
                    <input type="password" required placeholder={localSafeTranslate('retype_pass', "Retype password")} value={passwordData.confirmPassword} onChange={e=>setPasswordData({...passwordData, confirmPassword:e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm" />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="submit" disabled={passLoading} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-8 rounded-xl text-xs uppercase tracking-widest flex justify-center items-center gap-2 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none">
                      {passLoading ? <Loader2 size={16} className="animate-spin"/> : <Key size={16}/>} {localSafeTranslate('btn_update_pass', 'UPDATE PASSWORD')}
                    </button>
                  </div>
               </form>
            </div>
          )}
        </div>
      </div>
      )}

      {activeTab === 'BILLING' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Payment History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 ring-1 ring-black/5">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-6 border-b border-gray-100 pb-4 uppercase tracking-widest">
              <History size={18} className="text-blue-600" /> Payment & Request History
            </h3>
            
            {loadingHistory ? (
              <div className="flex justify-center p-12">
                <Loader2 className="animate-spin text-gray-400" size={32} />
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200 border-dashed">
                <FileText size={40} className="mx-auto text-gray-300 mb-4" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">No payment records found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paymentHistory.map(record => (
                  <div key={record.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-white hover:shadow-sm transition-all group">
                    <div className="mb-3 sm:mb-0">
                      <div className="flex items-center gap-3 mb-2">
                         <span className="text-sm font-black text-gray-900 tracking-tight">{record.requestedPlan || 'SMART_PRO'}</span>
                         <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md border ${
                           record.status === 'APPROVED' ? 'bg-green-50 text-green-600 border-green-200' :
                           record.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-200' :
                           'bg-orange-50 text-orange-600 border-orange-200'
                         }`}>{record.status}</span>
                      </div>
                      <p className="text-[10px] font-bold text-gray-500 font-mono tracking-widest flex items-center gap-1.5"><FileDigit size={12}/> TRX: {record.transactionId}</p>
                      <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{record.timestamp?.toDate ? record.timestamp.toDate().toLocaleString() : new Date().toLocaleString()}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] font-black text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200 inline-flex items-center gap-1.5 uppercase tracking-widest shadow-sm">
                        <CreditCard size={12}/> {record.paymentMethod}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Limits & Upgrades */}
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 ring-1 ring-black/5">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-5 border-b border-gray-100 pb-4 flex items-center gap-2"><Settings size={16}/> {localSafeTranslate('current_limits', 'Current Limits')}</h3>
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-end mb-2.5">
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-1.5"><Users size={12}/> {localSafeTranslate('registered_members', 'Registered Members')}</p>
                  <p className="text-base font-black text-gray-900">{limits.devoteeCount} <span className="text-gray-400 text-xs font-bold">/ {['PREMIUM', 'SMART_PRO'].includes(limits.plan) ? '∞' : saasConfig.maxFreeMembers}</span></p>
                </div>
                <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden shadow-inner"><div className={`h-full rounded-full transition-all duration-1000 ${limits.devoteeCount >= saasConfig.maxFreeMembers && !['PREMIUM', 'SMART_PRO'].includes(limits.plan) ? 'bg-red-500' : 'bg-gradient-to-r from-green-400 to-green-500'}`} style={{ width: ['PREMIUM', 'SMART_PRO'].includes(limits.plan) ? '100%' : `${Math.min((limits.devoteeCount / saasConfig.maxFreeMembers) * 100, 100)}%` }}></div></div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-end mb-2.5">
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-1.5"><FileDigit size={12}/> {localSafeTranslate('pdfs_generated', 'PDFs Generated')}</p>
                  <p className="text-base font-black text-gray-900">{limits.pdfsGenerated} <span className="text-gray-400 text-xs font-bold">/ {['PREMIUM', 'SMART_PRO'].includes(limits.plan) ? '∞' : saasConfig.maxFreePdfs}</span></p>
                </div>
                <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden shadow-inner"><div className={`h-full rounded-full transition-all duration-1000 ${limits.pdfsGenerated >= saasConfig.maxFreePdfs && !['PREMIUM', 'SMART_PRO'].includes(limits.plan) ? 'bg-red-500' : 'bg-gradient-to-r from-blue-400 to-blue-500'}`} style={{ width: ['PREMIUM', 'SMART_PRO'].includes(limits.plan) ? '100%' : `${Math.min((limits.pdfsGenerated / saasConfig.maxFreePdfs) * 100, 100)}%` }}></div></div>
              </div>
            </div>
          </div>

          {!['PREMIUM', 'SMART_PRO'].includes(limits.plan) ? (
             <div className="bg-gradient-to-br from-saffron-500 to-red-600 p-6 sm:p-8 rounded-3xl shadow-lg text-white text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                <Crown size={48} className="mx-auto mb-3 text-yellow-300 drop-shadow-md" />
                <h3 className="text-2xl font-black mb-1 tracking-tight">{localSafeTranslate('upgrade_title', 'Upgrade to Smart Pro')}</h3>

                <p className="text-[10px] font-black text-saffron-100 uppercase tracking-widest mb-5 bg-black/10 inline-block px-3 py-1 rounded-full">{saasConfig.duration} • {saasConfig.subtitle}</p>
                
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-4 mb-6 flex flex-col gap-3 text-[11px] font-black uppercase tracking-widest text-white shadow-inner text-left">
                   {saasConfig.features.map((feat, idx) => (
                     <span key={idx} className="flex items-center gap-2"><CheckCircle2 size={14} className="text-yellow-300 shrink-0"/> {feat}</span>
                   ))}
                </div>

                {isAdmin ? (
                  <button onClick={() => { setShowUpgradeModal(true); }} className="w-full bg-white text-sanatani-orange hover:bg-gray-50 font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 relative z-10 flex items-center justify-center gap-2">
                    {localSafeTranslate('offer_dakshina', 'OFFER DAKSHINA (UPGRADE)')}
                  </button>
                ) : (
                  <div className="bg-black/20 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 flex items-center justify-center gap-2 relative z-10">
                    <Lock size={16} className="inline"/> Contact Admin to Upgrade
                  </div>
                )}
             </div>
          ) : (
            <div className="bg-gradient-to-br from-saffron-50 to-saffron-50 p-8 rounded-3xl shadow-sm border border-saffron-200 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Crown size={120}/></div>
                <Crown size={48} className="mx-auto mb-4 text-sanatani-orange relative z-10" />
                <h3 className="text-xl font-black text-gray-900 mb-2 relative z-10">You are on Smart Pro!</h3>
                <p className="text-xs font-bold text-gray-600 leading-relaxed relative z-10">Your Workspace has absolute unlimited access to all platform features.</p>
             </div>
          )}
        </div>
      </div>
      )}

      {/* ✨ SECURE UPGRADE & PAYMENT MODAL */}
      {showUpgradeModal && createPortal(
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden fade-in flex flex-col max-h-[90vh] ring-1 ring-white/20 border-t-4 border-sanatani-orange">

            <div className="bg-gradient-to-br from-gray-900 to-black p-6 sm:p-8 text-white text-center relative shrink-0">
               <button onClick={() => setShowUpgradeModal(false)} className="absolute top-5 right-5 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-colors"><X size={18}/></button>
               <Crown size={40} className="mx-auto mb-3 text-sanatani-orange drop-shadow-md" />
               <h2 className="text-3xl font-black tracking-tight mb-2">Smart PRO</h2>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{saasConfig.duration} • {saasConfig.subtitle}</p>

               <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 mt-6 flex justify-center gap-3 sm:gap-4 text-[9px] font-black uppercase tracking-widest text-gray-200 flex-wrap shadow-inner">
                  {saasConfig.features.map((feat, idx) => (
                    <span key={idx} className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-sanatani-orange"/> {feat}</span>
                  ))}
               </div>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto bg-white flex-1 scrollbar-hide">

               <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-6 shadow-inner border border-gray-200">
                 <button onClick={() => setPaymentTab('BD')} className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex justify-center gap-2 items-center ${paymentTab === 'BD' ? 'bg-white text-green-700 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}>
                   <CreditCard size={14} /> BD (৳{saasConfig.bdtPrice})
                 </button>
                 <button onClick={() => setPaymentTab('INTL')} className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex justify-center gap-2 items-center ${paymentTab === 'INTL' ? 'bg-white text-blue-700 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}>
                   <Globe size={14} /> INTL (${saasConfig.usdPrice})
                 </button>
               </div>

               {paymentTab === 'BD' ? (
                 <div className="bg-green-50/50 border border-green-200 rounded-3xl p-5 mb-6 shadow-sm relative overflow-hidden text-left">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-green-500"></div>
                    <div className="flex justify-between items-center border-b border-green-100 pb-4 mb-4 pl-2">
                      <h4 className="text-xs font-black text-green-800 uppercase tracking-widest flex items-center gap-2">
                        <CreditCard size={16}/> Payment Instructions
                      </h4>
                      <span className="text-[10px] font-black text-gray-400 line-through">৳{saasConfig.originalBdtPrice?.toLocaleString()}</span>
                    </div>

                    <div className="space-y-3 pl-2">
                       <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-green-100 shadow-sm hover:border-green-300 transition-colors">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                               {/* Empty placeholder for images */}
                               <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">bKash / Rocket (Personal)</p>
                            </div>
                            <p className="text-xl font-black text-gray-900 font-mono tracking-wider">{BKASH_ROCKET_NUM}</p>
                            <p className="text-[9px] font-bold text-gray-400 mt-1">Instruction: Use "Send Money" option.</p>
                          </div>
                          <button type="button" onClick={() => handleCopyNumber(BKASH_ROCKET_NUM)} className="p-3 bg-gray-50 rounded-xl border border-gray-200 hover:bg-green-50 text-gray-500 hover:text-green-600 transition-colors shadow-sm">
                             <Copy size={16}/>
                          </button>
                       </div>

                       <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-green-100 shadow-sm hover:border-green-300 transition-colors">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                               <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nagad (Personal)</p>
                            </div>
                            <p className="text-xl font-black text-gray-900 font-mono tracking-wider">{NAGAD_NUM}</p>
                            <p className="text-[9px] font-bold text-gray-400 mt-1">Instruction: Use "Send Money" option.</p>
                          </div>
                          <button type="button" onClick={() => handleCopyNumber(NAGAD_NUM)} className="p-3 bg-gray-50 rounded-xl border border-gray-200 hover:bg-green-50 text-gray-500 hover:text-green-600 transition-colors shadow-sm">
                             <Copy size={16}/>
                          </button>
                       </div>

                       <div className="flex flex-col items-center justify-center bg-white p-5 rounded-2xl border border-green-100 shadow-sm mt-4">
                          <div className="flex items-center gap-4 mb-3">
                             <div className="w-24 h-24 bg-gray-50 rounded-xl shadow-md border border-gray-200 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform" onClick={() => setZoomedImage('/tallypay_qr.png')}>
                               <QrCode size={36} className="text-gray-400"/>
                             </div>
                             <div className="w-24 h-24 bg-gray-50 rounded-xl shadow-md border border-gray-200 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform" onClick={() => setZoomedImage('/tallypay_guide.png')}>
                               <FileText size={36} className="text-gray-400"/>
                             </div>
                          </div>
                          <p className="text-xs font-black text-gray-800 uppercase tracking-widest">TallyPay / Bangla QR</p>
                          <p className="text-[10px] font-bold text-gray-500 text-center mt-1">Tap image to zoom. Scan from bKash, Nagad, Rocket, or any Bank App.</p>
                       </div>
                    </div>
                 </div>
               ) : (
                 <div className="bg-blue-50/50 border border-blue-200 rounded-3xl p-8 mb-6 text-center shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                    <div className="flex justify-center items-center gap-3 mb-4">
                      <p className="text-xs font-black text-blue-800 uppercase tracking-widest flex items-center gap-2"><Globe size={16}/> Pay securely via International Gateways</p>
                      <span className="text-[10px] font-black text-gray-400 line-through">${saasConfig.originalUsdPrice} USD</span>
                    </div>

                    <div className="flex flex-col gap-3 mt-4">
                      <button type="button" onClick={() => window.open(INTL_PAYMENT_LINK, '_blank')} className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl text-xs uppercase tracking-widest font-black flex justify-center items-center gap-2 mx-auto hover:bg-blue-700 transition-all shadow-md hover:-translate-y-0.5">
                        OPEN SECURE CHECKOUT (WISE)
                      </button>
                      <button type="button" onClick={() => window.open('https://www.payoneer.com/', '_blank')} className="w-full bg-orange-600 text-white px-6 py-4 rounded-xl text-xs uppercase tracking-widest font-black flex justify-center items-center gap-2 mx-auto hover:bg-orange-700 transition-all shadow-md hover:-translate-y-0.5">
                        PAY VIA PAYONEER (REQUEST LINK)
                      </button>
                    </div>

                    <p className="text-[10px] font-bold text-gray-500 mt-4 leading-relaxed bg-white p-3 rounded-xl border border-blue-100">Please copy your Wise or Payoneer Transaction ID after payment is complete and paste it below to verify.</p>
                 </div>
               )}

               <form onSubmit={handleSubmitUpgrade} className="space-y-5">
                 <div className="border-t border-gray-200 pt-6 mb-4">
                   <h3 className="text-sm font-black text-gray-900 mb-1 flex items-center gap-2"><Shield size={16} className="text-sanatani-orange"/> Verify Dakshina</h3>
                   <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Submit details to activate PRO instantly.</p>
                 </div>

                 <div>
                   <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Contact Method *</label>
                   <div className="relative">
                     <Phone size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                     <input type="text" required value={upgradeForm.contact} onChange={e=>setUpgradeForm({...upgradeForm, contact: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-sanatani-orange transition-all shadow-sm" placeholder="Phone or Email" />
                   </div>
                 </div>

                 {paymentTab === 'BD' && (
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Payment Method *</label>
                       <select required value={upgradeForm.paymentMethod} onChange={e=>setUpgradeForm({...upgradeForm, paymentMethod: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-sanatani-orange shadow-sm cursor-pointer appearance-none transition-all">
                         <option value="bKash">bKash</option>
                         <option value="Nagad">Nagad</option>
                         <option value="Rocket">Rocket</option>
                         <option value="TallyPay/BanglaQR">TallyPay QR</option>
                         <option value="Other">Other Bank</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Sender Number *</label>
                       <input type="text" required value={upgradeForm.senderNumber} onChange={e=>setUpgradeForm({...upgradeForm, senderNumber: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-sanatani-orange transition-all shadow-sm" placeholder="017..." />
                     </div>
                   </div>
                 )}

                 <div>
                   <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Transaction ID (TrxID) *</label>
                   <div className="relative">
                     <FileText size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                     <input type="text" required value={upgradeForm.trxId} onChange={e=>setUpgradeForm({...upgradeForm, trxId: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold font-mono outline-none focus:bg-white focus:border-sanatani-orange transition-all shadow-sm uppercase" placeholder="Enter TrxID" />
                   </div>

                   <div className="bg-gray-100/80 p-4 rounded-xl border border-gray-200 mt-3 flex items-start gap-3 shadow-inner">
                     <HelpCircle size={16} className="text-gray-500 shrink-0 mt-0.5" />
                     <div className="text-[10px] text-gray-600 font-bold leading-relaxed">
                       <span className="text-gray-900 font-black">How to find TrxID?</span><br/>
                       After sending money, check your confirmation SMS or App screen. Look for "TrxID" or "Transaction ID" (e.g., 9A7BC8FXYZ).
                     </div>
                   </div>
                 </div>

                 <button type="submit" disabled={submittingTrx} className="w-full bg-gray-900 hover:bg-black text-white font-black py-4 rounded-xl shadow-lg hover:shadow-xl text-xs uppercase tracking-widest transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:transform-none">
                   {submittingTrx ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />} SUBMIT FOR VERIFICATION
                 </button>
               </form>

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ✨ FULL-SCREEN IMAGE ZOOM MODAL */}
      {zoomedImage && createPortal(
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-sm z-[11000] flex items-center justify-center p-4" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-3xl w-full flex justify-center items-center animate-in zoom-in-95">
             <button onClick={() => setZoomedImage(null)} className="absolute -top-12 right-0 sm:-right-12 sm:top-0 bg-white/10 hover:bg-white/30 text-white p-3 rounded-full transition-colors backdrop-blur-md">
               <X size={24}/>
             </button>
             {/* Replace this with an actual image tag if needed, omitted due to no actual path available currently */}
             <div className="w-full h-96 bg-gray-800 flex items-center justify-center rounded-xl border border-white/20 shadow-2xl">
                <p className="text-white font-black">{zoomedImage}</p>
             </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
