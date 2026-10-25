import React, { useState, useEffect, useRef } from 'react';
import { appLocale } from '../../lib/format';
import { createPortal } from 'react-dom';
import { updatePassword, User as FirebaseUser } from 'firebase/auth';
import { auth, db, collection, query, where, getDocs } from '../../firebase';
import { 
  Settings, Shield, Building2, Key, Loader2, Save, Crown, 
  AlertTriangle, CreditCard, CheckCircle2, Globe,
  WifiOff, MapPin, Phone, Mail, Copy, Camera, FileText, Image as ImageIcon, Briefcase, FileSignature, 
  Lock, QrCode, Users, FileDigit, Navigation, AlertCircle, Palette, History
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { executeSafeUpdate } from '../../lib/dbUtils';
import { GeoPaymentsManager } from './GeoPaymentsManager';
import { getTerms, tierForPlan, type PlatformTerms } from '../../lib/termsConfig';
import { checkLimit, loadWorkspaceSubscription, type LimitMetric } from '../../lib/planLimits';
import {
  resolveSettingsPlan,
  buildSettingsUsageRows,
  planPriceLabel,
  planPerks,
  workspaceTypeNameLabel,
  paymentHistoryView,
  type SettingsPlanInfo,
  type SettingsUsageMetric,
} from '../../lib/settingsHonesty';
import { normalizePublicSlug, resolvePublicSlugDefault } from '../../lib/orgPublic';
import { openPlanUpgrade } from '../../billing/PlanUpgradeFlow';
import {
  claimToHistoryRow,
  combineHistoryStreams,
  requestToHistoryRow,
  type HistoryRow,
  type StreamResult,
} from '../../lib/paymentHistoryMerge';
import { OrgBrandingSection, type BrandingSectionHandle } from './OrgBrandingSection';
// Pillar 3: trustee-curated public profile (what the world sees on /org/…).
import { OrgPublicProfileSection } from './OrgPublicProfileSection';
import { SampleDataCard } from './SampleDataCard';
import { PracticeModeCard } from './PracticeModeCard';
import { AccessReviewCard } from './AccessReviewCard';
import { AssistedSessionCard } from './AssistedSessionCard';
import { PrivacyNoticeCard } from '../account/PrivacyNotice';
import { OrgLogo } from '../common/OrgLogo';
import { isOwnerEmail } from '../../config/ownerAllowlist';
import { BranchManager } from '../branch/BranchManager';
import { SandhyaSettings } from '../common/SandhyaSettings';
import { PaymentDetailsCard } from '../org/PaymentDetailsCard';
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

/* QUEUED #54: the bespoke geo payment views that served the retired
 * Settings upgrade modal were removed with it — payment instructions
 * now live in the canonical PlanUpgradeFlow (billing/PlanUpgradeFlow). */

export const MasterSettingsDesk: React.FC = () => {
  const { activeWorkspace, updateWorkspaceDetails, currentRole, currentUser, checkPermission } = useAuthWorkspace();
  const { safeTranslate, t, language } = useLanguage();
  const localSafeTranslate = (key: string, en: string) => safeTranslate(key, en, en, en);
  const { showToast } = useToast();
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [saving, setSaving] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'BILLING' | 'GEO'>('GENERAL');
  const [paymentHistory, setPaymentHistory] = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyPartialError, setHistoryPartialError] = useState<string | null>(null);
  const [historyRetry, setHistoryRetry] = useState(0);
  
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
    // H-1: 80G registration gate
    eightyGRegistered: activeWorkspace?.trust80GRegistered || false,
    eightyGURN: activeWorkspace?.trust80GURN || '',
    eightyGRegNo: activeWorkspace?.trust80GRegNo || '',
    // P2: statutory compliance checklist — 12A + PAN
    twelveARegistered: (activeWorkspace as any)?.trust12ARegistered || false,
    twelveANumber: (activeWorkspace as any)?.trust12ANumber || '',
    trustPAN: (activeWorkspace as any)?.trustPAN || '',
    description: activeWorkspace?.tagline || '',
    // QUEUED #51 (D9c): the org's OWN saved slug — '' until the org sets
    // one. Never prefilled from any other organisation.
    publicSlug: activeWorkspace?.publicSlug || ''
  });
  
  // QUEUED #51 (D9a/D9b): the plan Settings names and the limits it shows
  // come from ONE source of truth — the #31 terms snapshot, the
  // subscription lifecycle, and the same server counts planLimits
  // enforces app-wide. (The old hard-coded `limits`/`saasConfig` sample
  // state — 15 members, 2 PDFs, a fake 'Smart Pro' price — is gone:
  // there is no honest PDF counter in the terms, so none is shown.)
  const [termsSnapshot, setTermsSnapshot] = useState<PlatformTerms | null>(null);
  const [planInfo, setPlanInfo] = useState<SettingsPlanInfo | null>(null);
  const [planUsage, setPlanUsage] = useState<Partial<Record<SettingsUsageMetric, number>>>({});
  const [planLoading, setPlanLoading] = useState(false);

  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [passLoading, setPassLoading] = useState(false);


  const bannerInputRef = useRef<HTMLInputElement>(null);
  // Pillar 1: the branding section owns the logo pipeline (validate → crop
  // → upload → preview); the avatar circle below just opens its picker.
  const brandingRef = useRef<BrandingSectionHandle>(null);

  // Geolocation states
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(
    (activeWorkspace as any)?.location?.lat ? (activeWorkspace as any)?.location : null
  );


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
        setHistoryError(null);
        setHistoryPartialError(null);
        // QUEUED #54: the panel unions BOTH billing streams for the org —
        // legacy upgrade_requests (retired Settings-modal era) and the
        // canonical paymentClaims (PlanUpgradeFlow; org-readable since
        // the #54 rules bundle). The streams settle independently: one
        // stream's failure must never fake-empty the other's rows (the
        // D9e honesty law) — it surfaces as a partial-error note beside
        // the surviving rows; only a double failure lands in the full
        // error state below.
        const [reqRes, claimRes] = await Promise.allSettled([
          getDocs(query(collection(db, 'upgrade_requests'), where('communityId', '==', activeWorkspace.id))),
          getDocs(query(collection(db, 'paymentClaims'), where('workspaceId', '==', activeWorkspace.id))),
        ]);
        const toStream = (
          res: PromiseSettledResult<any>,
          mapRow: (id: string, data: Record<string, any>) => HistoryRow,
        ): StreamResult =>
          res.status === 'fulfilled'
            ? { status: 'ok', rows: res.value.docs.map((d: any) => mapRow(d.id, d.data())) }
            : { status: 'error', error: (res.reason as any)?.message || 'Could not load payment history.' };
        const combined = combineHistoryStreams(
          toStream(reqRes, requestToHistoryRow),
          toStream(claimRes, claimToHistoryRow),
        );
        if (combined.fullError || combined.partialError) {
          console.error("Failed to fetch payment history", combined.fullError || combined.partialError);
        }
        setPaymentHistory(combined.rows);
        setHistoryError(combined.fullError);
        setHistoryPartialError(combined.partialError);
        setLoadingHistory(false);
      };
      fetchHistory();
    }
  }, [activeTab, activeWorkspace?.id, historyRetry]);

  // QUEUED #51: resolve the org's REAL plan + usage when Billing opens —
  // terms snapshot for names/limits/prices, subscription doc for lifecycle,
  // planLimits.checkLimit for the enforced usage counts.
  useEffect(() => {
    if (activeTab !== 'BILLING' || !activeWorkspace?.id) return;
    let cancelled = false;
    (async () => {
      setPlanLoading(true);
      try {
        const [terms, subscription] = await Promise.all([
          getTerms(),
          loadWorkspaceSubscription(activeWorkspace.id),
        ]);
        const info = resolveSettingsPlan({
          planId: subscription?.planId || (activeWorkspace as any).planId,
          subscription,
          terms,
          isDemo: activeWorkspace.id.startsWith('DEMO'),
        });
        const metrics: LimitMetric[] = ['devotees', 'transactions', 'seats'];
        // checkLimit takes the workspace-like (it short-circuits demo ids,
        // honours the pre-loaded subscription, and counts server-side).
        const wsLike = {
          id: activeWorkspace.id,
          planId: (activeWorkspace as any).planId ?? null,
          branchCount: Array.isArray((activeWorkspace as any).branches)
            ? (activeWorkspace as any).branches.length
            : 0,
          subscription,
        };
        const results = await Promise.all(metrics.map((m) => checkLimit(wsLike, m)));
        if (cancelled) return;
        const usage: Partial<Record<SettingsUsageMetric, number>> = {
          branches: wsLike.branchCount,
        };
        results.forEach((r, i) => { usage[metrics[i]] = r.used; });
        setTermsSnapshot(terms);
        setPlanInfo(info);
        setPlanUsage(usage);
      } catch (err) {
        console.warn('Settings plan resolution failed', err);
      } finally {
        if (!cancelled) setPlanLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, activeWorkspace?.id]);

  // QUEUED #51 derived display state — all from the resolvers above.
  const wsCurrencyCode = (activeWorkspace as any)?.currency || workspaceInfo.currencyCode || 'BDT';
  const offerPlan = planInfo?.nextPlanId && termsSnapshot ? termsSnapshot.plans[planInfo.nextPlanId] : null;
  const usageRows = planInfo ? buildSettingsUsageRows(planInfo.limits, planUsage) : [];
  const historyView = paymentHistoryView({ loading: loadingHistory, error: historyError, count: paymentHistory.length });
  const slugResolution = resolvePublicSlugDefault({ name: workspaceInfo.name, publicSlug: workspaceInfo.publicSlug });
  const planStatusLabel = planInfo
    ? planInfo.status === 'free' ? 'FREE PLAN'
      : planInfo.status === 'active' ? 'ACTIVE'
      : planInfo.status === 'grace' ? 'GRACE PERIOD'
      : planInfo.status === 'expired' ? 'EXPIRED — SEVA FREE APPLIES'
      : 'DEMO'
    : '';

  if (!activeWorkspace) return null;
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'banner') => {
    if (!isAdmin) return showToast(localSafeTranslate('err_unauthorized', "Unauthorized. Only Trustees can upload images."), "error");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return showToast(localSafeTranslate('err_only_images', "Only images allowed."), "error");

    try {
      const { compressImageFile } = await import('../../utils/imageCompression');
      const base64String = await compressImageFile(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.7 });
      setWorkspaceInfo(prev => ({ ...prev, bannerUrl: base64String }));
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
        // H-1: 80G registration gate — only a registered URN may appear on receipts.
        trust80GRegistered: !!workspaceInfo.eightyGRegistered,
        trust80GURN: workspaceInfo.eightyGURN?.trim() || '',
        trust80GRegNo: workspaceInfo.eightyGRegNo?.trim() || '',
        // P2: statutory compliance checklist — 12A + PAN persist with settings.
        trust12ARegistered: !!(workspaceInfo as any).twelveARegistered,
        trust12ANumber: ((workspaceInfo as any).twelveANumber || '').trim(),
        trustPAN: ((workspaceInfo as any).trustPAN || '').trim().toUpperCase(),
        tagline: workspaceInfo.description?.trim() || '',
        // QUEUED #51 (D9c): persist ONLY the slug this org typed
        // (normalized); empty clears it back to the name-derived link.
        publicSlug: normalizePublicSlug(workspaceInfo.publicSlug || ''),
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


  return (
    <div className="space-y-6 fade-in pb-12 relative">

      {/* ✨ CONFIRMATION DIALOG PORTAL */}
      {confirmDialog && createPortal(
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-sm p-6 sm:p-8 animate-in zoom-in-95 ring-1 ring-white/20 text-center border-t-4 border-sanatani-orange max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] overflow-y-auto">
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
      {/* QUEUED #61 (mobile clipping): the strip used to scroll sideways
          with its scrollbar hidden, so "Billing & Subscription" clipped
          mid-word with no affordance. Tabs now WRAP to a second row on
          narrow screens — every label fully visible, nothing hidden. */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 mb-2">
         <button onClick={() => setActiveTab('GENERAL')} className={`pb-3 pt-2 min-h-[44px] text-sm font-black uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap px-2 ${activeTab === 'GENERAL' ? 'text-sanatani-orange border-b-2 border-sanatani-orange' : 'text-gray-400 hover:text-gray-700'}`}>
           <Settings size={16}/> General Settings
         </button>
         <button onClick={() => setActiveTab('BILLING')} className={`pb-3 pt-2 min-h-[44px] text-sm font-black uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap px-2 ${activeTab === 'BILLING' ? 'text-sanatani-orange border-b-2 border-sanatani-orange' : 'text-gray-400 hover:text-gray-700'}`}>
           <CreditCard size={16}/> Billing & Subscription
         </button>
         {isOwnerEmail(auth.currentUser?.email) && (
           <button onClick={() => setActiveTab('GEO')} className={`pb-3 pt-2 min-h-[44px] text-sm font-black uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap px-2 ${activeTab === 'GEO' ? 'text-sanatani-orange border-b-2 border-sanatani-orange' : 'text-gray-400 hover:text-gray-700'}`}>
             <Globe size={16}/> Geo Payments
           </button>
         )}
      </div>

      {activeTab === 'GENERAL' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN: Workspace Info & Geolocation */}
        <div className="lg:col-span-2 space-y-6">
          {/* Blueprint B — payout/payment account details under
              maker–checker dual control: edits file an approval
              request; a second pair of eyes applies the change. */}
          <PaymentDetailsCard />
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
                 {/* Pillar 1: shared OrgLogo — uploaded logo or dignified monogram, never a broken image. */}
                 <div className="relative group shrink-0 cursor-pointer">
                    <OrgLogo
                      name={workspaceInfo.name || activeWorkspace?.name || ''}
                      logoUrl={workspaceInfo.logoUrl}
                      size={112}
                      className="border-4 border-white shadow-lg"
                    />
                    {isAdmin && (
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label="Update institution logo"
                        onClick={() => brandingRef.current?.openPicker()}
                        onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') brandingRef.current?.openPicker(); }}
                        className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      >
                        <Camera size={24} className="text-white"/>
                      </div>
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
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{`${workspaceTypeNameLabel(workspaceInfo.type, localSafeTranslate('name', 'Name'))} *`}</label>
                      <input type="text" required value={workspaceInfo.name} onChange={e=>setWorkspaceInfo({...workspaceInfo, name: e.target.value})} disabled={!isAdmin} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-sanatani-orange focus:ring-4 focus:ring-saffron-50 outline-none transition-all shadow-sm disabled:text-gray-500 disabled:cursor-not-allowed" />
                    </div>
                    {/* LOCKED ORGANIZATION TYPE */}
                    <div className="relative">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">{localSafeTranslate('org_type', 'Organization Type')}</label>
                      <input type="text" value={workspaceInfo.type} disabled={true} className="w-full p-4 pr-10 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 outline-none shadow-inner cursor-not-allowed" />
                      <Lock size={14} className="absolute right-4 top-[40px] text-gray-400" />
                    </div>
                  </div>

                  {/* QUEUED #51 (D9c): public profile slug — empty until THIS
                      org sets it; the suggestion is derived from the org's
                      OWN name only. */}
                  <div className="grid grid-cols-1 gap-5">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Globe size={12}/> Public Profile Link (Slug)</label>
                      <div className="flex items-stretch gap-2">
                        <span className="hidden sm:flex items-center px-3 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 font-mono whitespace-nowrap">sanatanibandhan.web.app/org/</span>
                        <input type="text" value={workspaceInfo.publicSlug} onChange={e=>setWorkspaceInfo({...workspaceInfo, publicSlug: e.target.value})} placeholder={slugResolution.suggested || 'your-organisation'} disabled={!isAdmin} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold font-mono text-gray-900 focus:bg-white focus:border-sanatani-orange focus:ring-4 focus:ring-saffron-50 outline-none transition-all shadow-sm disabled:text-gray-500 disabled:cursor-not-allowed" />
                      </div>
                      <p className="text-[11px] font-bold text-gray-400 mt-1.5 leading-relaxed">
                        {slugResolution.value
                          ? <>Your public page: <span className="font-mono text-gray-500">/org/{slugResolution.value}</span></>
                          : slugResolution.suggested
                            ? <>Not set yet — your page currently answers to <span className="font-mono text-gray-500">/org/{slugResolution.suggested}</span>, suggested from your organisation's own name. Save a slug here only if you want a different one.</>
                            : 'Not set yet — type a short link name (letters, numbers, dashes) for your public page.'}
                      </p>
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
                    {/* H-1: 80G registration gate — receipts are SAMPLE until this is set */}
                    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                      <h5 className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Shield size={14}/> Section 80G Registration (Income Tax Act)
                      </h5>
                      <label className="flex items-start gap-3 cursor-pointer mb-4">
                        <input
                          type="checkbox"
                          checked={!!workspaceInfo.eightyGRegistered}
                          onChange={e=>setWorkspaceInfo({...workspaceInfo, eightyGRegistered: e.target.checked})}
                          disabled={!isAdmin}
                          className="mt-1 w-5 h-5 accent-amber-600 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-gray-800 leading-relaxed">
                          This organisation is registered under Section 80G of the Income Tax Act, 1961
                          <span className="block text-[11px] font-medium text-gray-500 mt-0.5">
                            Until enabled, all 80G receipts are clearly marked SAMPLE and carry no URN — issuing
                            unregistered 80G receipts is a compliance violation.
                          </span>
                        </span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">80G URN (from IT Portal)</label>
                          <input type="text" value={workspaceInfo.eightyGURN} onChange={e=>setWorkspaceInfo({...workspaceInfo, eightyGURN: e.target.value.toUpperCase()})} disabled={!isAdmin} className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 focus:bg-white focus:border-sanatani-orange focus:ring-4 focus:ring-saffron-50 outline-none transition-all shadow-sm disabled:text-gray-500 disabled:cursor-not-allowed" placeholder="e.g. AAATK1088RF20214"/>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">80G Registration No.</label>
                          <input type="text" value={workspaceInfo.eightyGRegNo} onChange={e=>setWorkspaceInfo({...workspaceInfo, eightyGRegNo: e.target.value})} disabled={!isAdmin} className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-sanatani-orange focus:ring-4 focus:ring-saffron-50 outline-none transition-all shadow-sm disabled:text-gray-500 disabled:cursor-not-allowed" placeholder="CIT(E) approval number"/>
                        </div>
                      </div>
                    </div>
                                        {/* P2: statutory compliance checklist — 12A + PAN + progress */}
                    <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-[10px] font-black text-indigo-800 uppercase tracking-widest flex items-center gap-1.5">
                          <Shield size={14}/> Statutory Compliance Checklist
                        </h5>
                        {(() => {
                          const items = [
                            !!(workspaceInfo as any).eightyGRegistered && (workspaceInfo as any).eightyGURN?.trim(),
                            !!(workspaceInfo as any).twelveARegistered && ((workspaceInfo as any).twelveANumber || '').trim(),
                            !!((workspaceInfo as any).trustPAN || '').trim(),
                            !!(workspaceInfo as any).registrationNo?.trim(),
                          ];
                          const done = items.filter(Boolean).length;
                          return (
                            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                              {done} of {items.length} complete
                            </span>
                          );
                        })()}
                      </div>
                      {(() => {
                        const items = [
                          !!(workspaceInfo as any).eightyGRegistered && (workspaceInfo as any).eightyGURN?.trim(),
                          !!(workspaceInfo as any).twelveARegistered && ((workspaceInfo as any).twelveANumber || '').trim(),
                          !!((workspaceInfo as any).trustPAN || '').trim(),
                          !!(workspaceInfo as any).registrationNo?.trim(),
                        ];
                        const done = items.filter(Boolean).length;
                        const pct = Math.round((done / items.length) * 100);
                        return (
                          <div className="h-2 rounded-full bg-indigo-100 overflow-hidden mb-4">
                            <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        );
                      })()}
                      <label className="flex items-start gap-3 cursor-pointer mb-4">
                        <input
                          type="checkbox"
                          checked={!!(workspaceInfo as any).twelveARegistered}
                          onChange={e=>setWorkspaceInfo({...workspaceInfo, twelveARegistered: e.target.checked} as any)}
                          disabled={!isAdmin}
                          className="mt-1 w-5 h-5 accent-indigo-600 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-gray-800 leading-relaxed">
                          Registered under Section 12A / 12AB of the Income Tax Act, 1961
                          <span className="block text-[11px] font-medium text-gray-500 mt-0.5">
                            12A registration establishes the trust as a recognised charitable institution —
                            required alongside 80G for donor tax benefits.
                          </span>
                        </span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">12A Registration No.</label>
                          <input type="text" value={(workspaceInfo as any).twelveANumber || ''} onChange={e=>setWorkspaceInfo({...workspaceInfo, twelveANumber: e.target.value.toUpperCase()} as any)} disabled={!isAdmin} className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 focus:border-sanatani-orange focus:ring-4 focus:ring-saffron-50 outline-none transition-all shadow-sm disabled:text-gray-500 disabled:cursor-not-allowed" placeholder="e.g. AAATK1088RF20214"/>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Trust / Organisation PAN</label>
                          <input type="text" value={(workspaceInfo as any).trustPAN || ''} onChange={e=>setWorkspaceInfo({...workspaceInfo, trustPAN: e.target.value.toUpperCase()} as any)} disabled={!isAdmin} maxLength={10} className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 focus:border-sanatani-orange focus:ring-4 focus:ring-saffron-50 outline-none transition-all shadow-sm disabled:text-gray-500 disabled:cursor-not-allowed" placeholder="e.g. AAATK1088R"/>
                        </div>
                      </div>
                      <p className="text-[11px] font-medium text-gray-500 mt-3 leading-relaxed">
                        Completing the 80G item above flips the flag the receipt desks gate on — receipts stay
                        in SAMPLE mode until a real URN is saved.
                      </p>
                    </div>

                    {/* Multi-branch: location management (admin-only inside) */}
                    <BranchManager />

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
          {/* Pillar 1 — Institution branding: upload + live letterhead preview. */}
          <OrgBrandingSection
            ref={brandingRef}
            onLogoSaved={(logoUrl) => setWorkspaceInfo((prev) => ({ ...prev, logoUrl }))}
          />
          {/* Pillar 3 — Public profile: what the world sees on the public org page. */}
          <OrgPublicProfileSection isAdmin={isAdmin} />
          {/* QUEUED #59 (A4-4): sample-data promise — counts + one-tap
              clear of exactly the isDemoSeed / sample-era records.
              Renders nothing when the workspace holds no samples. */}
          <SampleDataCard />
          {/* Blueprint D — practice mode, the trustee access review,
              assisted sessions, and the plain-words privacy notice. */}
          <PracticeModeCard />
          <AccessReviewCard />
          <AssistedSessionCard />
          <PrivacyNoticeCard />
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
            {/* VIBE B3 — Sandhya Mode (the dusk theme): Off / On /
                Automatic at dusk, device-persisted, dict-voiced. */}
            <div className="mt-6">
              <SandhyaSettings />
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

            {historyPartialError && historyView !== 'loading' && (
              <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                <p className="text-[11px] font-bold text-amber-700 leading-relaxed flex-1">Some records couldn't be loaded — {historyPartialError}</p>
                <button type="button" onClick={() => setHistoryRetry((n) => n + 1)} className="px-4 py-2 min-h-[44px] bg-white border border-amber-300 text-amber-700 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-amber-100 transition-colors shrink-0">Retry</button>
              </div>
            )}
            
            {historyView === 'loading' ? (
              <div className="flex justify-center p-12">
                <Loader2 className="animate-spin text-gray-400" size={32} />
              </div>
            ) : historyView === 'error' ? (
              <div className="text-center py-12 bg-red-50 rounded-2xl border border-red-200 border-dashed px-6">
                <AlertTriangle size={36} className="mx-auto text-red-400 mb-3" />
                <p className="text-xs font-black text-red-700 uppercase tracking-widest mb-1.5">Payment history couldn't be loaded</p>
                <p className="text-[11px] font-bold text-red-500 leading-relaxed mb-4">{historyError}</p>
                <button type="button" onClick={() => setHistoryRetry((n) => n + 1)} className="px-5 py-2.5 min-h-[44px] bg-white border border-red-300 text-red-700 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors">Retry</button>
              </div>
            ) : historyView === 'empty' ? (
              <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200 border-dashed px-6">
                <FileText size={40} className="mx-auto text-gray-300 mb-4" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">No payment records found.</p>
                <p className="text-[11px] font-bold text-gray-400 mt-2 normal-case tracking-normal">Upgrade requests and payments you submit will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paymentHistory.map(record => (
                  <div key={record.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-white hover:shadow-sm transition-all group">
                    <div className="mb-3 sm:mb-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                         <span className="text-sm font-black text-gray-900 tracking-tight">{record.planLabel}</span>
                         <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md border ${
                           record.statusLabel === 'APPROVED' ? 'bg-green-50 text-green-600 border-green-200' :
                           record.statusLabel === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-200' :
                           'bg-orange-50 text-orange-600 border-orange-200'
                         }`}>{record.statusLabel}</span>
                         <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-md border bg-blue-50 text-blue-600 border-blue-200">{record.sourceLabel}</span>
                      </div>
                      <p className="text-[10px] font-bold text-gray-500 font-mono tracking-widest flex items-center gap-1.5"><FileDigit size={12}/> TRX: {record.transactionId}</p>
                      <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{record.timestampMillis ? new Date(record.timestampMillis).toLocaleString(appLocale()) : '—'}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] font-black text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200 inline-flex items-center gap-1.5 uppercase tracking-widest shadow-sm">
                        <CreditCard size={12}/> {record.methodLabel}
                      </p>
                      {record.amountLabel && (
                        <p className="text-[10px] font-bold text-gray-400 mt-1.5">{record.amountLabel}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Current Plan, Limits & Upgrades — QUEUED #51:
            everything here derives from the terms snapshot + real usage
            (settingsHonesty resolvers fed by planLimits.checkLimit). */}
        <div className="space-y-6">
          {/* CURRENT PLAN — the org's plan is always NAMED (D9a) */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 ring-1 ring-black/5">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-5 border-b border-gray-100 pb-4 flex items-center gap-2"><Crown size={16} className="text-sanatani-orange"/> Current Plan</h3>
            {planLoading && !planInfo ? (
              <div className="flex items-center gap-3 py-4">
                <Loader2 className="animate-spin text-gray-400" size={20} />
                <p className="text-xs font-bold text-gray-400">Loading your plan…</p>
              </div>
            ) : planInfo ? (
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-2xl font-black text-gray-900 tracking-tight">{planInfo.name}</p>
                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md border ${
                    planInfo.status === 'active' ? 'bg-green-50 text-green-600 border-green-200' :
                    planInfo.status === 'expired' ? 'bg-red-50 text-red-600 border-red-200' :
                    planInfo.status === 'grace' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                    'bg-gray-50 text-gray-500 border-gray-200'
                  }`}>{planStatusLabel}</span>
                </div>
                <p className="text-xs font-bold text-gray-500 mt-2">{planInfo.periodLabel}</p>
                {planInfo.planId !== 'seva' && termsSnapshot && (
                  <p className="text-xs font-bold text-gray-600 mt-1.5">
                    {planPriceLabel(termsSnapshot.plans[planInfo.planId], wsCurrencyCode, 'monthly')} · {planPriceLabel(termsSnapshot.plans[planInfo.planId], wsCurrencyCode, 'annual')}
                  </p>
                )}
                {planInfo.downgraded && (
                  <p className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mt-3 leading-relaxed">
                    Your paid plan has ended, so {planInfo.name} limits apply right now. Renew below to restore your previous plan.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs font-bold text-gray-500 leading-relaxed">Plan details couldn't be loaded. Reopen this tab to try again.</p>
            )}
          </div>

          {/* CURRENT LIMITS — real usage vs the plan's terms limits (D9b) */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 ring-1 ring-black/5">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-5 border-b border-gray-100 pb-4 flex items-center gap-2"><Settings size={16}/> {localSafeTranslate('current_limits', 'Current Limits')}</h3>
            {planLoading && !planInfo ? (
              <div className="flex items-center gap-3 py-4">
                <Loader2 className="animate-spin text-gray-400" size={20} />
                <p className="text-xs font-bold text-gray-400">Counting your workspace…</p>
              </div>
            ) : planInfo ? (
              <>
                <div className="space-y-6">
                  {usageRows.map((row) => (
                    <div key={row.metric} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <div className="flex justify-between items-end mb-2.5">
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{row.label}</p>
                        <p className="text-base font-black text-gray-900">{row.used} <span className="text-gray-400 text-xs font-bold">/ {row.limit === -1 ? '∞' : row.limit}</span></p>
                      </div>
                      <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden shadow-inner">
                        <div className={`h-full rounded-full transition-all duration-1000 ${row.overLimit ? 'bg-red-500' : 'bg-gradient-to-r from-green-400 to-green-500'}`} style={{ width: row.limit === -1 ? '100%' : `${row.percent}%` }}></div>
                      </div>
                      {row.limit === -1 && <p className="text-[10px] font-bold text-gray-400 mt-1.5 uppercase tracking-widest">Unlimited on your plan</p>}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] font-bold text-gray-400 mt-4 leading-relaxed">
                  Counted live from your workspace records against your plan's limits — the same numbers the app enforces everywhere.
                </p>
              </>
            ) : (
              <p className="text-xs font-bold text-gray-500 leading-relaxed">Limits couldn't be loaded. Reopen this tab to try again.</p>
            )}
          </div>

          {/* UPGRADE — the real next plan from the terms snapshot */}
          {planInfo && offerPlan ? (
             <div className="bg-gradient-to-br from-saffron-500 to-red-600 p-6 sm:p-8 rounded-3xl shadow-lg text-white text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                <Crown size={48} className="mx-auto mb-3 text-yellow-300 drop-shadow-md" />
                <h3 className="text-2xl font-black mb-1 tracking-tight">Upgrade to {offerPlan.name}</h3>

                <p className="text-[10px] font-black text-saffron-100 uppercase tracking-widest mb-5 bg-black/10 inline-block px-3 py-1 rounded-full">{planPriceLabel(offerPlan, wsCurrencyCode, 'monthly')} · or {planPriceLabel(offerPlan, wsCurrencyCode, 'annual')} — 2 months free</p>

                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-4 mb-6 flex flex-col gap-3 text-[11px] font-black uppercase tracking-widest text-white shadow-inner text-left">
                   {planPerks(planInfo.nextPlanId!).map((feat, idx) => (
                     <span key={idx} className="flex items-center gap-2"><CheckCircle2 size={14} className="text-yellow-300 shrink-0"/> {feat}</span>
                   ))}
                </div>

                {isAdmin ? (
                  <button onClick={() => openPlanUpgrade(planInfo?.nextPlanId ? tierForPlan(planInfo.nextPlanId) : undefined)} className="w-full bg-white text-sanatani-orange hover:bg-gray-50 font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 relative z-10 flex items-center justify-center gap-2">
                    {localSafeTranslate('offer_dakshina', 'OFFER DAKSHINA (UPGRADE)')}
                  </button>
                ) : (
                  <div className="bg-black/20 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 flex items-center justify-center gap-2 relative z-10">
                    <Lock size={16} className="inline"/> Contact Admin to Upgrade
                  </div>
                )}
             </div>
          ) : planInfo ? (
            <div className="bg-gradient-to-br from-saffron-50 to-saffron-50 p-8 rounded-3xl shadow-sm border border-saffron-200 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Crown size={120}/></div>
                <Crown size={48} className="mx-auto mb-4 text-sanatani-orange relative z-10" />
                <h3 className="text-xl font-black text-gray-900 mb-2 relative z-10">You are on {planInfo.name}!</h3>
                <p className="text-xs font-bold text-gray-600 leading-relaxed relative z-10">This is the highest plan — every feature is open to your workspace. Dhanyavaad for walking with Sanatani Bandhan.</p>
            </div>
          ) : null}
        </div>
      </div>
      )}

      {activeTab === 'GEO' && isOwnerEmail(auth.currentUser?.email) && (
        <GeoPaymentsManager />
      )}

      {/* QUEUED #54: the bespoke upgrade modal was retired — upgrades now
          file through the canonical PlanUpgradeFlow (openPlanUpgrade →
          paymentClaims → owner approval → plan activates). */}

    </div>
  );
};
