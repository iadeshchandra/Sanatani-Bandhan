import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { doc, collection, onSnapshot, writeBatch, setDoc, addDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  Sparkles, Star, Award, CheckCircle2, MapPin, Phone, CalendarDays, 
  UserCheck, User, Search, Filter, X, Loader2, Heart, ShieldCheck, BookOpen, Plus, 
  Send, Clock, Check, MessageSquare, AlertTriangle, WifiOff, ScrollText, FileText, Banknote,
  ChevronRight, ArrowLeft, Shield, CalendarClock
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { usePlanGate } from '../../hooks/usePlanGate';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { DirectMessageChat } from '../common/DirectMessageChat';
import { useNotifications } from '../../context/NotificationContext';

export function PurohitMarketDesk({ isOnline = navigator.onLine }: { isOnline?: boolean }) {
  const { t, language } = useLanguage();
  const { activeWorkspace, currentDevotee, currentRole } = useAuthWorkspace();
  const { addNotification } = useNotifications();

  const session = {
    communityId: activeWorkspace.id,
    uid: currentDevotee?.id || 'sys-admin',
    userName: currentDevotee?.name || currentDevotee?.fullName || 'Admin',
    role: (currentRole as string) === 'MANAGER' || ['SuperAdmin', 'Trustee', 'Accountant'].includes(currentRole) ? 'MANAGER' : 'MEMBER',
    currency: { symbol: activeWorkspace.currencySymbol || '₹', code: activeWorkspace.currency || 'INR' }
  };

  const { checkGate } = usePlanGate();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('GIGS'); // 'GIGS' | 'MY_ORDERS' | 'MY_OFFERED_GIGS'
  const [submitting, setSubmitting] = useState(false);
  const [isVerifiedPurohit, setIsVerifiedPurohit] = useState(false);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  
  const [applyForm, setApplyForm] = useState({ name: session?.userName || '', phone: '', specialization: 'Vedic Rituals', experienceYears: '5', address: '', whyJoin: '', certificates: '' });
  const [gigForm, setGigForm] = useState({ title: '', description: '', category: 'Mandir & Home Rituals', sampradaya: 'Smarta', language: 'Sanskrit', specialties: 'Vastu', durationHours: 2, dakshinaFee: 1500 });
  const [myOfferedGigs, setMyOfferedGigs] = useState<any[]>([]);

  // ✨ FAIL-SAFE TRANSLATION HELPER
  const safeTranslate = (key: string, fallbackEn: string, fallbackBn?: string, fallbackHi?: string) => {
    const trans = (t as any)(key);
    if (trans !== key && trans) return trans;
    if (language === 'bn') return fallbackBn || fallbackEn;
    if (language === 'hi') return fallbackHi || fallbackEn;
    return fallbackEn;
  };

  // 💾 Offline Cached States
  const [gigs, setGigs] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem(`sb_purohit_gigs_${session?.communityId}`) || '[]'); } catch { return []; }
  });
  const [contracts, setContracts] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem(`sb_purohit_contracts_${session?.communityId}`) || '[]'); } catch { return []; }
  });

  // UI Filters & Modals
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSampradaya, setSelectedSampradaya] = useState('ALL');
  const [selectedLanguage, setSelectedLanguage] = useState('ALL');
  const [selectedGig, setSelectedGig] = useState<any>(null);
  const [checkoutStep, setCheckoutStep] = useState('DETAILS'); // 'DETAILS' | 'FORM'

  // Booking Form State
  const [bookingForm, setBookingForm] = useState({
    yajamanaName: session?.userName || '',
    gotra: '',
    nakshatra: '',
    address: '',
    ceremonyDate: '',
    ceremonyTime: '10:00 AM'
  });

  const [toast, setToast] = useState<{message: string, type: string} | null>(null);
  const curSymbol = session?.currency?.symbol || '₹';

  const showToast = (message: string, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 🔄 Realtime Data Synchronization
  useEffect(() => {
    if (!session?.communityId) return;

    const gigsRef = collection(db, `communities/${session.communityId}/purohit_gigs`);
    const unsubGigs = onSnapshot(gigsRef, (snap) => {
      if (!snap.empty) {
        const list: any[] = snap.docs.map((d) => ({ gigId: d.id, ...d.data() }));
        setGigs(list);
        setMyOfferedGigs(list.filter(g => g.purohitId === session.uid));
        localStorage.setItem(`sb_purohit_gigs_${session.communityId}`, JSON.stringify(list));
      } else {
        // Fallback Premium Gigs (Seed Data for Marketplace Demo)
        setGigs([
          {
            gigId: 'GIG-101',
            purohitId: 'PRH-101',
            purohitName: 'Pt. Shrikant Sharma',
            title: 'Complete Satyanarayan Katha & Puja Vidhi',
            description: 'Traditional performance with precise Vedic Sanskrit pronunciation and Katha meaning explanation. Includes complete Sankalp, Navagraha Shanti, and Havan.',
            category: 'Mandir & Home Rituals',
            sampradaya: 'Vaishnava',
            language: 'Sanskrit',
            specialties: 'Katha, Havan',
            durationHours: 2.5,
            dakshinaFee: 1500,
            ratingAvg: 4.9,
            totalReviewsCount: 128,
            verifiedBadge: true,
            completedOrders: 340
          },
          {
            gigId: 'GIG-102',
            purohitId: 'PRH-102',
            purohitName: 'Acharya Devavrat Shastri',
            title: 'Rudrabhishek Seva & Maha Mrityunjaya Mantra',
            description: 'Powerful ritual for health, peace, and spiritual shielding performed according to Vedic scriptures. I will bring all primary Yantra materials.',
            category: 'Special Seva',
            sampradaya: 'Shaiva',
            language: 'Sanskrit',
            specialties: 'Rudrabhishek, Healing',
            durationHours: 3,
            dakshinaFee: 2500,
            ratingAvg: 5.0,
            totalReviewsCount: 89,
            verifiedBadge: true,
            completedOrders: 195
          },
          {
            gigId: 'GIG-103',
            purohitId: 'PRH-103',
            purohitName: 'Pandit Ramakant Ji',
            title: 'Vastu Shanti & Griha Pravesh Anushthan',
            description: 'Complete home purification ritual ensuring peace and prosperity in your new dwelling. Includes Dwar Puja and Kalash Sthapana.',
            category: 'Off-site Seva',
            sampradaya: 'Smarta',
            language: 'Hindi',
            specialties: 'Vastu, Griha Pravesh',
            durationHours: 4,
            dakshinaFee: 3500,
            ratingAvg: 4.8,
            totalReviewsCount: 45,
            verifiedBadge: false,
            completedOrders: 92
          }
        ]);
      }
      setLoading(false);
    }, (err) => console.warn("Firebase PurohitMarketDesk sync:", err.message));

    const conRef = collection(db, `communities/${session.communityId}/purohit_contracts`);
    const unsubCon = onSnapshot(conRef, (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map((d) => ({ contractId: d.id, ...d.data() }));
        list.sort((a: any,b: any) => b.createdAt - a.createdAt);
        setContracts(session.role === 'MANAGER' ? list : list.filter((c: any) => c.clientId === session.uid || c.purohitId === session.uid));
        localStorage.setItem(`sb_purohit_contracts_${session.communityId}`, JSON.stringify(list));
      } else {
        setContracts([]);
      }
    }, (err) => console.warn("Firebase PurohitMarketDesk sync:", err.message));

    const myPurohitRef = doc(db, `communities/${session.communityId}/purohits/${session.uid}`);
    const unsubMyPurohit = onSnapshot(myPurohitRef, (docSnap) => {
      if (docSnap.exists()) setIsVerifiedPurohit(true);
      else setIsVerifiedPurohit(false);
    }, (err) => console.warn("Firebase PurohitMarketDesk sync:", err.message));

    const failsafe = setTimeout(() => setLoading(false), 1200);
    return () => { unsubGigs(); unsubCon(); unsubMyPurohit(); clearTimeout(failsafe); };
  }, [session?.communityId, activeWorkspace.type]);

  const executeSafeUpdate = async (updates: any, successMsg: string | null = null) => {
    try {
      const batch = writeBatch(db);
      for (const path of Object.keys(updates)) {
        const docRef = doc(db, path);
        if (updates[path] === null) {
          batch.delete(docRef);
        } else {
          batch.set(docRef, updates[path], { merge: true });
        }
      }
      await batch.commit();
      if (successMsg) showToast(successMsg, 'success');
    } catch (e: any) {
      if (!isOnline) {
         showToast(safeTranslate('offline_saved', 'Action cached offline. Syncing soon.'), 'offline');
      } else {
         showToast(safeTranslate('error', 'Error') + ": " + e.message, "error");
      }
    }
  };

  const logAudit = async (actionType: string, description: string) => {
    try { addDoc(collection(db, `communities/${session.communityId}/audit_logs`), { managerName: session.userName, actionType, description, timestamp: Date.now() }); } catch (e) {}
  };

  const handleApplyPurohit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const updates: any = {};
      updates[`communities/${session.communityId}/purohit_applications/${session.uid}`] = {
        id: session.uid,
        name: applyForm.name,
        phone: applyForm.phone,
        specialization: applyForm.specialization,
        experienceYears: applyForm.experienceYears,
        address: applyForm.address,
        whyJoin: applyForm.whyJoin,
        certificates: applyForm.certificates,
        status: 'PENDING',
        createdAt: Date.now()
      };
      await executeSafeUpdate(updates, 'Application submitted successfully! Please wait for admin approval.');
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateGig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const gigId = `GIG-${Math.floor(1000 + Math.random() * 9000)}`;
      const updates: any = {};
      updates[`communities/${session.communityId}/purohit_gigs/${gigId}`] = {
        gigId,
        purohitId: session.uid,
        purohitName: session.userName,
        ...gigForm,
        durationHours: Number(gigForm.durationHours),
        dakshinaFee: Number(gigForm.dakshinaFee),
        ratingAvg: 0,
        totalReviewsCount: 0,
        verifiedBadge: true,
        completedOrders: 0,
        createdAt: Date.now()
      };
      await executeSafeUpdate(updates, 'Gig created successfully!');
      setGigForm({ title: '', description: '', category: 'Mandir & Home Rituals', sampradaya: 'Smarta', language: 'Sanskrit', specialties: 'Vastu', durationHours: 2, dakshinaFee: 1500 });
      setActiveTab('MY_OFFERED_GIGS');
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 🤝 Book Gig (Checkout with Availability Engine & Escrow Sync)
  const handleBookGigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGig) return;
    if (!bookingForm.yajamanaName.trim() || !bookingForm.gotra.trim() || !bookingForm.ceremonyDate) {
      return showToast(safeTranslate('err_all_fields_req', 'Yajamana Name, Gotra, and Date are required.', 'যজমানের নাম, গোত্র এবং তারিখ আবশ্যক।', 'यजमान का नाम, गोत्र और तिथि आवश्यक हैं।'), "error");
    }
    
    // Availability Engine Overlap Check
    const isOverlapping = contracts.some(c => 
      c.purohitId === selectedGig.purohitId && 
      c.status !== 'COMPLETED' && c.status !== 'CANCELLED' && 
      c.yajamanaDetails?.ceremonyDate === bookingForm.ceremonyDate && 
      c.yajamanaDetails?.ceremonyTime === bookingForm.ceremonyTime
    );

    if (isOverlapping) {
      return showToast("Availability Matrix Error: This Purohit is already booked at that specific date and time. Please choose another time.", "error");
    }

    if (!checkGate('devotees', 9999)) return;

    setSubmitting(true);
    try {
      const conKey = `CON-${Math.floor(1000 + Math.random() * 9000)}`;
      const timestamp = Date.now();

      const contractPayload = {
        contractId: conKey,
        gigId: selectedGig.gigId,
        purohitId: selectedGig.purohitId || 'PRH-GLOBAL',
        purohitName: selectedGig.purohitName,
        serviceTitle: selectedGig.title,
        clientId: session.uid,
        clientName: session.userName,
        yajamanaDetails: { ...bookingForm },
        expectedDakshina: selectedGig.dakshinaFee,
        paidDakshina: selectedGig.dakshinaFee,
        status: 'CONFIRMED',
        createdAt: timestamp
      };

      const updates: any = {};
      updates[`communities/${session.communityId}/purohit_contracts/${conKey}`] = contractPayload;

      
      // Unify with Purohit Anushthan CRM directly
      const anuId = `ANU-${Math.floor(1000 + Math.random() * 9000)}`;
      updates[`communities/${session.communityId}/purohit_anushthans/${anuId}`] = {
        id: anuId,
        yajamanName: bookingForm.yajamanaName,
        yajamanPhone: '',
        pujaName: selectedGig.title,
        date: bookingForm.ceremonyDate,
        time: bookingForm.ceremonyTime,
        tithi: '',
        muhurat: '',
        status: 'BOOKED',
        dakshinaEst: selectedGig.dakshinaFee,
        createdAt: timestamp,
        purohitName: selectedGig.purohitName
      };

      // Escrow Treasury Ledger Link - Holding Dakshina
      const transId = doc(collection(db, `communities/${session.communityId}/logs/Donation`)).id;
      updates[`communities/${session.communityId}/logs/Donation/${transId}`] = {
        id: transId,
        name: `${bookingForm.yajamanaName.trim()} [Dakshina Escrow - Held]`,
        amount: selectedGig.dakshinaFee,
        note: `Escrow Hold for Contract: ${conKey} (${selectedGig.title})`,
        collector: `System Escrow`,
        timestamp: timestamp,
        category: 'Escrow',
        role: session.role || 'MEMBER'
      };

      await executeSafeUpdate(updates, 'Service successfully booked! Dakshina held in secure Escrow.');
      logAudit("MARKETPLACE_ORDER", `Contracted service '${selectedGig.title}' with ${selectedGig.purohitName}`);
      
      addNotification({
        title: 'Puja Booking Confirmed',
        message: `Your booking for ${selectedGig.title} with ${selectedGig.purohitName} is confirmed.`,
        type: 'success',
      });

      setSelectedGig(null);
      setCheckoutStep('DETAILS');
      setBookingForm({ yajamanaName: session?.userName || '', gotra: '', nakshatra: '', address: '', ceremonyDate: '', ceremonyTime: '10:00 AM' });
      setActiveTab('MY_ORDERS');
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteOrder = async (con: any) => {
    try {
      setSubmitting(true);
      const updates: any = {};
      
      // Update Contract Status
      updates[`communities/${session.communityId}/purohit_contracts/${con.contractId}/status`] = 'COMPLETED';
      
      // Release Escrow -> Creates a payout record for the Purohit
      const transId = doc(collection(db, `communities/${session.communityId}/logs/Donation`)).id;
      updates[`communities/${session.communityId}/logs/Donation/${transId}`] = {
        id: transId,
        name: `${con.purohitName} [Escrow Released]`,
        amount: -Math.abs(con.paidDakshina), // Negative amount as it leaves treasury to purohit
        note: `Escrow Released for Completed Contract: ${con.contractId}`,
        collector: `System Payout`,
        timestamp: Date.now(),
        category: 'Escrow Payout',
        role: session.role || 'MEMBER'
      };

      await executeSafeUpdate(updates, 'Order marked as completed and Dakshina Escrow released!');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredGigs = useMemo(() => {
    return gigs.filter(g => {
      const matchSearch = g.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          g.purohitName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          g.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === 'ALL' || g.category === selectedCategory;
      const matchSampradaya = selectedSampradaya === 'ALL' || (g.sampradaya && g.sampradaya === selectedSampradaya);
      const matchLang = selectedLanguage === 'ALL' || (g.language && g.language === selectedLanguage);
      return matchSearch && matchCat && matchSampradaya && matchLang;
    });
  }, [gigs, searchTerm, selectedCategory, selectedSampradaya, selectedLanguage]);

  if (loading) return <div className="flex justify-center p-20 text-blue-600"><Loader2 size={40} className="animate-spin" /></div>;

  return (
    <div className="space-y-6 fade-in pb-12 relative w-full flex flex-col min-h-[90vh]">
      {toast && createPortal(
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[10000] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4 ${toast.type === 'error' ? 'bg-red-900' : 'bg-temple-900'} text-white`}>
           <div className={`p-2 rounded-full shrink-0 ${toast.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
             {toast.type === 'error' ? <AlertTriangle size={20}/> : <CheckCircle2 size={20}/>}
           </div>
           <div>
             <p className={`text-xs font-black uppercase tracking-widest mb-0.5 ${toast.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{toast.type === 'error' ? safeTranslate('error', 'Error') : safeTranslate('success', 'Success')}</p>
             <p className="text-sm font-bold">{toast.message}</p>
           </div>
        </div>, document.body
      )}

      {/* HEADER HERO SECTION */}
      <div className="bg-gradient-to-br from-temple-900 via-temple-800 to-saffron-950 p-8 sm:p-12 rounded-3xl shadow-2xl relative overflow-hidden ring-1 ring-black/10 text-white flex flex-col justify-center min-h-[250px]">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 opacity-10 pointer-events-none transform rotate-12">
           <Sparkles size={350} className="text-saffron-300"/>
        </div>

        <div className="relative z-10 max-w-3xl">
          <span className="text-[10px] font-black uppercase tracking-widest bg-saffron-500/20 text-saffron-200 px-3 py-1 rounded-full border border-saffron-400/30 shadow-inner mb-4 inline-block">
            Verified Scholar Network
          </span>
          <h2 className="text-3xl sm:text-4xl font-black mb-3 tracking-tight leading-tight">
            Find the Perfect Vedic Scholar for your Rituals
          </h2>
          <p className="text-sm font-medium text-temple-300 mb-8 max-w-xl leading-relaxed">
            Hire verified experts with transparent ratings, upfront Dakshina, Escrow protection, and guaranteed Sanatani authenticity.
          </p>

          <div className="relative w-full max-w-2xl flex items-center bg-white rounded-2xl p-1 shadow-2xl">
            <Search size={20} className="absolute left-5 text-temple-400" />
            <input 
              type="text" 
              placeholder="What service are you looking for? (e.g. Vastu Shanti)"
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="w-full pl-14 pr-4 py-4 bg-transparent text-sm font-bold text-temple-900 outline-none"
            />
            <button className="bg-saffron-600 hover:bg-saffron-700 text-white px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md hidden sm:block shrink-0">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-2 rounded-2xl border border-temple-200 shadow-sm">
        <div className="flex w-full md:w-auto bg-temple-100/80 p-1.5 rounded-xl overflow-x-auto scrollbar-hide">
          <button onClick={() => setActiveTab('GIGS')} className={`flex-1 md:w-40 py-3 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 whitespace-nowrap px-4 ${activeTab === 'GIGS' ? 'bg-white text-temple-900 shadow-md border border-temple-100' : 'text-temple-500 hover:text-temple-800'}`}>
            <Sparkles size={14}/> Explore Gigs
          </button>
          <button onClick={() => setActiveTab('MY_ORDERS')} className={`flex-1 md:w-40 py-3 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 whitespace-nowrap px-4 ${activeTab === 'MY_ORDERS' ? 'bg-white text-temple-900 shadow-md border border-temple-100' : 'text-temple-500 hover:text-temple-800'}`}>
            <ScrollText size={14}/> My Bookings
          </button>
          <button onClick={() => setActiveTab('INBOX')} className={`flex-1 md:w-32 py-3 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 whitespace-nowrap px-4 ${activeTab === 'INBOX' ? 'bg-white text-temple-900 shadow-md border border-temple-100' : 'text-temple-500 hover:text-temple-800'}`}>
            <MessageSquare size={14}/> Inbox
          </button>
          {isVerifiedPurohit && (
            <button onClick={() => setActiveTab('MY_OFFERED_GIGS')} className={`flex-1 md:w-48 py-3 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 whitespace-nowrap px-4 ${activeTab === 'MY_OFFERED_GIGS' ? 'bg-white text-temple-900 shadow-md border border-temple-100' : 'text-temple-500 hover:text-temple-800'}`}>
              <Award size={14}/> My Offered Services
            </button>
          )}
        </div>
        
        {activeTab === 'GIGS' && (
          <div className="flex w-full md:w-auto items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <Filter size={18} className="text-temple-400 mx-2 shrink-0"/>
            <select 
              value={selectedCategory} 
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-temple-50 border border-temple-200 text-temple-700 text-xs font-bold rounded-xl px-4 py-3 outline-none min-w-[150px]"
            >
              <option value="ALL">All Categories</option>
              <option value="Mandir & Home Rituals">Mandir & Home Rituals</option>
              <option value="Special Seva">Special Seva</option>
              <option value="Off-site Seva">Off-site Seva</option>
              <option value="Samskaras (Sacraments)">Samskaras (Sacraments)</option>
              <option value="Astrology & Vastu">Astrology & Vastu</option>
            </select>
            <select 
              value={selectedSampradaya} 
              onChange={e => setSelectedSampradaya(e.target.value)}
              className="bg-temple-50 border border-temple-200 text-temple-700 text-xs font-bold rounded-xl px-4 py-3 outline-none min-w-[140px]"
            >
              <option value="ALL">Any Sampradaya</option>
              <option value="Smarta">Smarta</option>
              <option value="Vaishnava">Vaishnava</option>
              <option value="Shaiva">Shaiva</option>
              <option value="Shakta">Shakta</option>
            </select>
            <select 
              value={selectedLanguage} 
              onChange={e => setSelectedLanguage(e.target.value)}
              className="bg-temple-50 border border-temple-200 text-temple-700 text-xs font-bold rounded-xl px-4 py-3 outline-none min-w-[120px]"
            >
              <option value="ALL">Any Language</option>
              <option value="Sanskrit">Sanskrit</option>
              <option value="Hindi">Hindi</option>
              <option value="English">English</option>
              <option value="Telugu">Telugu</option>
              <option value="Tamil">Tamil</option>
            </select>
          </div>
        )}
      </div>

      <div className="mt-8">
        {activeTab === 'GIGS' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredGigs.length > 0 ? (
              filteredGigs.map(gig => (
                <div key={gig.gigId} onClick={() => setSelectedGig(gig)} className="bg-white rounded-3xl border border-temple-200 shadow-sm overflow-hidden flex flex-col hover:shadow-xl transition-all cursor-pointer group hover:-translate-y-1">
                  <div className="h-48 relative overflow-hidden bg-temple-100">
                    <img src={gig.imageUrl || 'https://images.unsplash.com/photo-1599839619722-39751411ea63?w=800&q=80'} alt={gig.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                  </div>
                  <div className="p-6 pt-8 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-temple-900 flex items-center gap-1.5 hover:underline">
                          {gig.purohitName}
                          {gig.verifiedBadge && <ShieldCheck size={14} className="text-emerald-500" />}
                        </span>
                        <div className="flex gap-2 items-center mt-0.5">
                           <span className="text-[10px] text-temple-500 font-bold uppercase tracking-widest">{gig.category}</span>
                           <span className="text-[9px] bg-temple-100 text-temple-600 px-1.5 py-0.5 rounded border border-temple-200">{gig.sampradaya || 'Smarta'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 text-saffron-500 font-black text-sm">
                          <Star size={14} className="fill-current"/> {gig.ratingAvg || '5.0'}
                        </div>
                        <span className="text-[9px] text-temple-400 font-bold">({gig.totalReviewsCount || 0} Reviews)</span>
                      </div>
                    </div>

                    <h3 className="text-base font-black text-temple-800 leading-snug group-hover:text-saffron-700 transition-colors mt-2 mb-3 line-clamp-2">
                      I will perform {gig.title}
                    </h3>
                    
                    <div className="text-xs text-temple-500 font-medium line-clamp-1 mb-4 flex items-center gap-1">
                        <BookOpen size={12}/> Speaks: {gig.language || 'Sanskrit, Hindi'}
                    </div>

                    <div className="mt-auto border-t border-temple-100 pt-4 flex justify-between items-center bg-white">
                      <Heart size={18} className="text-temple-300 hover:text-red-500 transition-colors"/>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-temple-400 uppercase tracking-widest mb-0.5">DAKSHINA ESCROW</p>
                        <p className="text-xl font-black text-temple-900 tracking-tight">{curSymbol}{gig.dakshinaFee}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-temple-300 shadow-sm">
                <Search size={48} className="mx-auto mb-4 opacity-20 text-temple-600"/>
                <p className="text-xl font-black text-temple-800 mb-1">No services found.</p>
                <p className="text-xs font-bold text-temple-400 uppercase tracking-widest">Try adjusting your search criteria.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {activeTab === 'MY_ORDERS' && (
        <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto w-full">
          <div className="flex items-center justify-between border-b border-temple-200 pb-4 px-2">
            <div>
              <h3 className="text-xl font-black text-temple-900 flex items-center gap-2"><FileText className="text-temple-700"/> My Active Orders</h3>
              <p className="text-[10px] font-bold text-temple-500 uppercase tracking-widest mt-1">Track rituals and Escrow Dakshina</p>
            </div>
            <span className="bg-temple-100 text-temple-600 px-3 py-1 rounded-lg text-xs font-black shadow-inner border border-temple-200">{contracts.length} Orders</span>
          </div>

          <div className="space-y-4">
            {contracts.length > 0 ? (
              contracts.map((con, idx) => (
                <div key={`${con.contractId}-${idx}`} className="bg-white p-5 sm:p-6 rounded-3xl border border-temple-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${con.status === 'COMPLETED' ? 'bg-emerald-500' : con.status === 'CONFIRMED' ? 'bg-blue-500' : 'bg-temple-400'}`}></div>

                  <div className="flex-1 space-y-3 pl-2 w-full">
                    <div className="flex justify-between items-center sm:justify-start sm:gap-3">
                      <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md border shadow-sm ${con.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : con.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-temple-100 text-temple-600 border-temple-200'}`}>
                        {con.status}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-temple-400 tracking-widest bg-temple-50 px-2 py-0.5 rounded border border-temple-100">ID: {con.contractId}</span>
                    </div>

                    <div>
                      <h4 className="font-black text-temple-900 text-lg leading-tight group-hover:text-saffron-700 transition-colors line-clamp-1">{con.serviceTitle}</h4>
                      <p className="text-xs font-bold text-temple-500 mt-1 flex items-center gap-1.5"><UserCheck size={12} className="text-saffron-500"/> Contracted to: <strong className="text-temple-700">{con.purohitName}</strong></p>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-2">
                      <div className="flex items-center gap-1.5 text-xs text-temple-500 font-medium bg-temple-50 px-2 py-1 rounded border border-temple-100">
                        <CalendarClock size={14} className="text-temple-400"/>
                        {con.yajamanaDetails?.ceremonyDate} @ {con.yajamanaDetails?.ceremonyTime}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-temple-500 font-medium bg-temple-50 px-2 py-1 rounded border border-temple-100">
                        <Banknote size={14} className="text-temple-400"/>
                        Escrow: {curSymbol}{con.paidDakshina}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 border-t sm:border-t-0 sm:border-l border-temple-100 pt-4 sm:pt-0 sm:pl-6 shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="text-[9px] font-black text-temple-400 uppercase tracking-widest mb-0.5">Dakshina Fee</p>
                      <p className="text-2xl font-black text-temple-900 tracking-tight">{curSymbol}{con.expectedDakshina || con.agreedFee}</p>
                    </div>
                    {con.purohitId === session.uid && con.status !== 'COMPLETED' && (
                      <button onClick={() => handleCompleteOrder(con)} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-4 rounded-xl text-[10px] uppercase tracking-widest shadow-sm transition-all flex items-center gap-1.5">
                        <CheckCircle2 size={14}/> Complete & Release Escrow
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-temple-300 shadow-sm">
                <ScrollText size={48} className="mx-auto mb-4 opacity-20 text-temple-400"/>
                <p className="text-xl font-black text-temple-800 mb-1">No active orders found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'INBOX' && (
        <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto w-full">
          <div className="flex items-center justify-between border-b border-temple-200 pb-4 px-2">
            <div>
              <h3 className="text-xl font-black text-temple-900 flex items-center gap-2"><MessageSquare className="text-temple-700"/> Messages</h3>
              <p className="text-[10px] font-bold text-temple-500 uppercase tracking-widest mt-1">Recent communications</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {recentChats.length > 0 ? (
              recentChats.map(chat => {
                const recipientId = chat.participants?.find((p) => p !== session?.uid) || 'Unknown';
                const recipientName = chat.participantNames?.[recipientId] || 'Chat Participant';
                return (
                  <div key={chat.id} className="bg-white p-5 rounded-3xl border border-temple-200 shadow-sm hover:shadow-md transition-all flex justify-between items-center cursor-pointer group hover:-translate-y-0.5" onClick={() => {
                     setSelectedGig({ purohitId: recipientId, purohitName: recipientName, title: 'Chat Inquiry' });
                     setCheckoutStep('CHAT');
                  }}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-saffron-50 rounded-full flex items-center justify-center text-saffron-600 shadow-sm"><User size={20}/></div>
                      <div>
                        <h4 className="text-sm font-black text-temple-900 group-hover:text-saffron-700 transition-colors">{recipientName}</h4>
                        <p className="text-xs text-temple-500 mt-0.5 line-clamp-1 font-medium">{chat.lastMessage || 'No messages yet'}</p>
                      </div>
                    </div>
                    <ChevronRight className="text-temple-300 group-hover:text-saffron-500 transition-colors"/>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-temple-200">
                 <MessageSquare size={48} className="mx-auto mb-4 opacity-20 text-temple-500"/>
                 <p className="text-lg font-black text-temple-800">No recent messages</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'MY_OFFERED_GIGS' && (
         <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto w-full">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-temple-200 shadow-sm">
               <h3 className="text-xl font-black text-temple-900 mb-6 flex items-center gap-2"><Plus className="text-saffron-600"/> Create New Service Listing</h3>
               <form onSubmit={handleCreateGig} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-black text-temple-700 uppercase tracking-widest mb-2">Service Title</label>
                      <input type="text" required value={gigForm.title} onChange={e => setGigForm({...gigForm, title: e.target.value})} className="w-full bg-temple-50 border border-temple-200 rounded-xl px-4 py-3 text-sm font-bold text-temple-900 outline-none focus:border-saffron-500" placeholder="e.g. Complete Vastu Shanti" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-temple-700 uppercase tracking-widest mb-2">Dakshina Fee ({curSymbol})</label>
                      <input type="number" required value={gigForm.dakshinaFee} onChange={e => setGigForm({...gigForm, dakshinaFee: Number(e.target.value)})} className="w-full bg-temple-50 border border-temple-200 rounded-xl px-4 py-3 text-sm font-bold text-temple-900 outline-none focus:border-saffron-500" min="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-temple-700 uppercase tracking-widest mb-2">Category</label>
                      <select required value={gigForm.category} onChange={e => setGigForm({...gigForm, category: e.target.value})} className="w-full bg-temple-50 border border-temple-200 rounded-xl px-4 py-3 text-sm font-bold text-temple-900 outline-none focus:border-saffron-500">
                        <option value="Mandir & Home Rituals">Mandir & Home Rituals</option>
                        <option value="Special Seva">Special Seva</option>
                        <option value="Samskaras (Sacraments)">Samskaras (Sacraments)</option>
                        <option value="Astrology & Vastu">Astrology & Vastu</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-temple-700 uppercase tracking-widest mb-2">Sampradaya</label>
                      <select required value={gigForm.sampradaya} onChange={e => setGigForm({...gigForm, sampradaya: e.target.value})} className="w-full bg-temple-50 border border-temple-200 rounded-xl px-4 py-3 text-sm font-bold text-temple-900 outline-none focus:border-saffron-500">
                        <option value="Smarta">Smarta</option>
                        <option value="Vaishnava">Vaishnava</option>
                        <option value="Shaiva">Shaiva</option>
                        <option value="Shakta">Shakta</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-temple-700 uppercase tracking-widest mb-2">Language Spoken</label>
                      <select required value={gigForm.language} onChange={e => setGigForm({...gigForm, language: e.target.value})} className="w-full bg-temple-50 border border-temple-200 rounded-xl px-4 py-3 text-sm font-bold text-temple-900 outline-none focus:border-saffron-500">
                        <option value="Sanskrit">Sanskrit</option>
                        <option value="Hindi">Hindi</option>
                        <option value="English">English</option>
                        <option value="Telugu">Telugu</option>
                        <option value="Tamil">Tamil</option>
                        <option value="Bengali">Bengali</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-temple-700 uppercase tracking-widest mb-2">Duration (Hours)</label>
                      <input type="number" required value={gigForm.durationHours} onChange={e => setGigForm({...gigForm, durationHours: Number(e.target.value)})} className="w-full bg-temple-50 border border-temple-200 rounded-xl px-4 py-3 text-sm font-bold text-temple-900 outline-none focus:border-saffron-500" min="0.5" step="0.5" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-black text-temple-700 uppercase tracking-widest mb-2">Detailed Description</label>
                      <textarea required value={gigForm.description} onChange={e => setGigForm({...gigForm, description: e.target.value})} rows={3} className="w-full bg-temple-50 border border-temple-200 rounded-xl px-4 py-3 text-sm font-bold text-temple-900 outline-none focus:border-saffron-500" placeholder="Describe the ritual process, what materials you bring, etc."></textarea>
                    </div>
                 </div>
                 <button type="submit" disabled={submitting} className="px-8 py-4 bg-temple-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2">
                   {submitting ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>} Publish Service Listing
                 </button>
               </form>
            </div>
            
            {myOfferedGigs.map(gig => (
               <div key={gig.gigId} className="bg-white p-6 rounded-2xl border border-temple-200 shadow-sm">
                 <h4 className="font-black text-temple-900 text-lg mb-1">{gig.title}</h4>
                 <p className="text-sm font-bold text-temple-500">Category: {gig.category} | Sampradaya: {gig.sampradaya} | Dakshina: {curSymbol}{gig.dakshinaFee}</p>
               </div>
            ))}
         </div>
      )}

      {/* GIG DETAIL FULLSCREEN MODAL */}
      {selectedGig && createPortal(
        <div className="fixed inset-0 bg-temple-900/60 backdrop-blur-sm z-[9999] flex justify-end animate-in fade-in">
          <div className="w-full md:w-3/4 lg:w-2/3 xl:w-1/2 h-full bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-temple-200 bg-white sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-3">
                 <button onClick={() => { setSelectedGig(null); setCheckoutStep('DETAILS'); }} className="p-2 hover:bg-temple-100 rounded-full text-temple-500 transition-colors">
                   <ArrowLeft size={24}/>
                 </button>
                 <div>
                   <h2 className="text-base sm:text-lg font-black text-temple-900 line-clamp-1">{selectedGig.title}</h2>
                   <p className="text-[10px] font-bold text-temple-500 uppercase tracking-widest">{selectedGig.purohitName}</p>
                 </div>
              </div>
              {checkoutStep === 'CHAT' && (
              <div className="flex-1 h-full max-h-[80vh]">
                <DirectMessageChat 
                  recipientId={selectedGig.purohitId} 
                  recipientName={selectedGig.purohitName}
                  recipientPhone={selectedGig.phone || '919876543210'}
                  contextType="PUROHIT"
                  onClose={() => setCheckoutStep('VIEW')}
                />
              </div>
            )}
            
            {checkoutStep === 'FORM' && (
                <button onClick={() => setCheckoutStep('DETAILS')} className="text-xs font-black text-temple-500 hover:text-temple-900 uppercase tracking-widest">Cancel Booking</button>
              )}
            </div>

            {checkoutStep === 'DETAILS' && (
              <div className="flex flex-col md:flex-row h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar pb-32 md:pb-10">
                   <div className="mb-8">
                     <div className="flex items-center gap-3 mb-4">
                       <span className="text-[10px] font-black bg-temple-100 text-temple-600 uppercase tracking-widest px-3 py-1 rounded-full border border-temple-200">{selectedGig.category}</span>
                       <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-200">{selectedGig.sampradaya}</span>
                     </div>
                     <h1 className="text-3xl sm:text-4xl font-black text-temple-900 tracking-tight leading-tight mb-4">{selectedGig.title}</h1>
                     
                     <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm font-black">
                        <div className="flex items-center gap-2 text-temple-700"><UserCheck size={18} className="text-saffron-500"/> {selectedGig.purohitName} {selectedGig.verifiedBadge && <ShieldCheck size={16} className="text-blue-500"/>}</div>
                        <div className="flex items-center gap-2 text-saffron-500"><Star size={18} className="fill-current"/> {selectedGig.ratingAvg} <span className="text-temple-400 font-bold">({selectedGig.totalReviewsCount})</span></div>
                        <div className="flex items-center gap-2 text-temple-700"><BookOpen size={18} className="text-temple-400"/> Language: {selectedGig.language}</div>
                     </div>
                   </div>

                   <div className="prose prose-sm sm:prose-base prose-stone max-w-none">
                     <h3 className="font-black text-temple-900 mb-2">About This Ritual</h3>
                     <p className="text-temple-600 font-medium leading-relaxed whitespace-pre-wrap">{selectedGig.description}</p>
                   </div>
                </div>

                <div className="w-full md:w-80 bg-temple-50 md:bg-white p-6 sm:p-8 flex flex-col justify-start md:sticky md:top-0 h-auto md:h-full border-t md:border-t-0 border-temple-200 fixed bottom-0 left-0 right-0 z-20 md:z-auto">
                   <div className="hidden md:block">
                     <div className="flex justify-between items-center mb-6">
                       <h3 className="text-base font-black text-temple-900">Standard Package</h3>
                       <span className="text-2xl font-black text-temple-900">{curSymbol}{selectedGig.dakshinaFee}</span>
                     </div>
                     <p className="text-xs font-bold text-temple-600 mb-6 leading-relaxed">Includes complete ritual performance, personalized Sankalp, and basic Samagri checklist provision.</p>
                     <div className="space-y-3 mb-8">
                       <div className="flex items-center gap-3 text-xs font-black text-temple-700">
                         <Clock size={16} className="text-temple-400"/> Approx. {selectedGig.durationHours} Hours Duration
                       </div>
                       <div className="flex items-center gap-3 text-xs font-black text-temple-700">
                         <Check size={16} className="text-emerald-500"/> Escrow Dakshina Protection
                       </div>
                       <div className="flex items-center gap-3 text-xs font-black text-temple-700">
                         <Check size={16} className="text-emerald-500"/> Availability Matrix Verified
                       </div>
                     </div>
                   </div>
                   <div className="md:hidden flex justify-between items-center mb-4">
                     <div>
                       <p className="text-[10px] font-black text-temple-500 uppercase tracking-widest">Total Dakshina</p>
                       <span className="text-xl font-black text-temple-900">{curSymbol}{selectedGig.dakshinaFee}</span>
                     </div>
                   </div>
                   <div className="flex flex-col gap-3">
                     <div className="flex gap-3">
                       <button 
                         onClick={() => {
                           const msg = `Hari Om Pandit ji, I am interested in booking: ${selectedGig.title}. Can we discuss?`;
                           const phone = selectedGig.phone || '919876543210';
                           window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                         }}
                         className="flex-1 py-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-2"
                       >
                         <Phone size={16}/> WhatsApp
                       </button>
                       <button 
                         onClick={() => {
                           showToast(`Opening secure chat with ${selectedGig.purohitName}...`, 'success');
                           // In a real app, this would route to the in-app chat module
                         }}
                         className="flex-1 py-4 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-2"
                       >
                         <MessageSquare size={16}/> In-App Chat
                       </button>
                     </div>
                     <button 
                       onClick={() => setCheckoutStep('FORM')}
                       className="w-full py-4 sm:py-5 bg-temple-900 hover:bg-black text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black uppercase tracking-widest shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 flex justify-center items-center gap-2 mt-2"
                     >
                       Continue to Booking <ChevronRight size={18}/>
                     </button>
                   </div>
                </div>
              </div>
            )}

            {checkoutStep === 'FORM' && (
              <form onSubmit={handleBookGigSubmit} className="p-6 sm:p-10 overflow-y-auto flex-1 bg-temple-50/30 scrollbar-hide space-y-8">
                <div className="bg-white p-5 rounded-2xl border border-temple-200 shadow-sm flex items-center gap-4">
                  <div className="w-16 h-16 bg-saffron-50 rounded-xl flex items-center justify-center shrink-0 border border-saffron-100"><Sparkles size={24} className="text-saffron-600"/></div>
                  <div>
                    <h4 className="text-sm font-black text-temple-900 line-clamp-1">{selectedGig.title}</h4>
                    <p className="text-xs font-bold text-temple-500 mt-1">Provider: {selectedGig.purohitName}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-lg font-black text-temple-900 border-b border-temple-200 pb-2">Yajamana & Sankalpa Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-temple-500 uppercase tracking-widest mb-1.5">Yajamana Full Name <span className="text-red-500">*</span></label>
                      <input type="text" required value={bookingForm.yajamanaName} onChange={e => setBookingForm({...bookingForm, yajamanaName: e.target.value})} className="w-full bg-white border border-temple-200 rounded-xl px-4 py-3 text-sm font-bold text-temple-900 outline-none focus:border-blue-500 shadow-sm" placeholder="Name of primary sponsor" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-temple-500 uppercase tracking-widest mb-1.5">Gotra <span className="text-red-500">*</span></label>
                      <input type="text" required value={bookingForm.gotra} onChange={e => setBookingForm({...bookingForm, gotra: e.target.value})} className="w-full bg-white border border-temple-200 rounded-xl px-4 py-3 text-sm font-bold text-temple-900 outline-none focus:border-blue-500 shadow-sm" placeholder="e.g. Kashyapa, Bharadwaja" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black text-temple-500 uppercase tracking-widest mb-1.5">Location / Address</label>
                      <input type="text" value={bookingForm.address} onChange={e => setBookingForm({...bookingForm, address: e.target.value})} className="w-full bg-white border border-temple-200 rounded-xl px-4 py-3 text-sm font-bold text-temple-900 outline-none focus:border-blue-500 shadow-sm" placeholder="Complete address for off-site rituals" />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <h3 className="text-lg font-black text-temple-900 border-b border-temple-200 pb-2">Availability Matrix (Date & Time)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-temple-500 uppercase tracking-widest mb-1.5">Ceremony Date <span className="text-red-500">*</span></label>
                      <input type="date" required value={bookingForm.ceremonyDate} onChange={e => setBookingForm({...bookingForm, ceremonyDate: e.target.value})} className="w-full bg-white border border-temple-200 rounded-xl px-4 py-3 text-sm font-bold text-temple-900 outline-none focus:border-blue-500 shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-temple-500 uppercase tracking-widest mb-1.5">Ceremony Time <span className="text-red-500">*</span></label>
                      <input type="time" required value={bookingForm.ceremonyTime} onChange={e => setBookingForm({...bookingForm, ceremonyTime: e.target.value})} className="w-full bg-white border border-temple-200 rounded-xl px-4 py-3 text-sm font-bold text-temple-900 outline-none focus:border-blue-500 shadow-sm" />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-3xl border border-emerald-200 shadow-inner mt-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="text-center sm:text-left">
                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Dakshina Escrow</p>
                    <p className="text-4xl font-black text-emerald-700 tracking-tight">{curSymbol}{selectedGig.dakshinaFee}</p>
                  </div>
                  <div className="bg-white px-4 py-3 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-3 w-full sm:w-auto justify-center">
                     <div className="bg-emerald-100 p-1.5 rounded-full"><Shield size={16} className="text-emerald-600"/></div>
                     <div className="text-left">
                       <p className="text-[9px] font-black text-temple-400 uppercase tracking-widest">Enterprise Security</p>
                       <p className="text-xs font-black text-temple-800 uppercase tracking-widest">Auto-Syncs to Treasury</p>
                     </div>
                  </div>
                </div>

                <div className="pt-4 shrink-0">
                  <button type="submit" disabled={submitting} className="w-full py-5 bg-temple-900 hover:bg-black text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 flex justify-center items-center gap-2 disabled:opacity-50 disabled:transform-none border border-temple-800">
                    {submitting ? <Loader2 size={20} className="animate-spin mx-auto"/> : <CheckCircle2 size={20}/>} {submitting ? 'PROCESSING...' : 'Confirm Booking & Lock Escrow'}
                  </button>
                  <p className="text-center text-[10px] font-bold text-temple-400 mt-4 uppercase tracking-widest">By confirming, you agree to the Sanatani Bandhan service terms.</p>
                </div>
              </form>
            )}
          </div>
        </div>, document.body
      )}
    </div>
  );
}
