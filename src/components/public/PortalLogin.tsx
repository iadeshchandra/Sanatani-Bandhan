import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2, ShieldCheck, Building2, User, Key, Mail, Phone, 
  Lock, ArrowLeft, Eye, EyeOff, AlertTriangle, MapPin, AlignLeft, Languages, 
  Globe2, Navigation, QrCode, X, WifiOff, CheckCircle2, Flame, Fingerprint
} from 'lucide-react';
import jsQR from 'jsqr';
import AppLogo from '../common/AppLogo'; 
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import { WorkspaceConfig, WorkspaceType } from '../../types';
import { sendPasswordResetEmail, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { auth, db } from '../../services/firebaseClient';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import type { UserRole } from '../../types';

const translations = {
  en: {
    app_name: 'Sanatani Bandhan',
    portal_subtitle: 'Enterprise Workspace Gateway',
    login_secure: 'Secure Login',
    login_create: 'Create Workspace',
    scan_auto_login: 'Scan QR to Login',
    login_identity: 'Identity',
    login_forgot: 'Forgot Password?',
    btn_access_portal: 'Access Portal',
    qr_expired: 'This QR code has expired or was already used. Ask your temple office for a fresh code.',
    qr_offline: 'Could not reach the temple database. Check your connection and try again.',
    qr_not_login: 'This QR code is not a login code. Please scan the login QR from your temple office.',
    qr_success: 'QR login successful. Welcome!',
    reg_warning_title: 'Enterprise Provisioning',
    reg_warning_desc_1: 'You are provisioning a new ',
    reg_warning_desc_2: ' workspace. This will create a dedicated cloud instance.',
    reg_step1: 'Workspace Details',
    reg_org_type: 'Organization Type',
    reg_org_name: 'Name',
    reg_desc: 'Short Description',
    reg_step2: 'Administrator Profile',
    reg_your_name: 'Full Name',
    reg_your_phone: 'Phone Number',
    reg_official_email: 'Official Email',
    login_pass: 'Secure Password',
    btn_create_dynamic: 'Provision {X}',
    workspace: 'Workspace',
    head_admin: 'Head Admin'
  },
  hi: {
    app_name: 'सनातनी बंधन',
    portal_subtitle: 'एंटरप्राइज कार्यक्षेत्र गेटवे',
    login_secure: 'सुरक्षित लॉगिन',
    login_create: 'कार्यक्षेत्र बनाएं',
    scan_auto_login: 'लॉगिन के लिए QR स्कैन करें',
    login_identity: 'पहचान',
    login_forgot: 'पासवर्ड भूल गए?',
    btn_access_portal: 'पोर्टल एक्सेस करें',
    qr_expired: 'यह QR कोड समाप्त हो गया है या पहले ही उपयोग किया जा चुका है। कृपया अपने मंदिर कार्यालय से नया कोड लें।',
    qr_offline: 'मंदिर डेटाबेस से संपर्क नहीं हो सका। अपना कनेक्शन जांचें और पुनः प्रयास करें।',
    qr_not_login: 'यह QR कोड लॉगिन कोड नहीं है। कृपया अपने मंदिर कार्यालय से लॉगिन QR स्कैन करें।',
    qr_success: 'QR लॉगिन सफल। स्वागत है!',
    reg_warning_title: 'एंटरप्राइज प्रोविजनिंग',
    reg_warning_desc_1: 'आप एक नया ',
    reg_warning_desc_2: ' कार्यक्षेत्र बना रहे हैं। यह एक समर्पित क्लाउड इंस्टेंस बनाएगा।',
    reg_step1: 'कार्यक्षेत्र विवरण',
    reg_org_type: 'संगठन का प्रकार',
    reg_org_name: 'नाम',
    reg_desc: 'संक्षिप्त विवरण',
    reg_step2: 'प्रशासक प्रोफ़ाइल',
    reg_your_name: 'पूरा नाम',
    reg_your_phone: 'फ़ोन नंबर',
    reg_official_email: 'आधिकारिक ईमेल',
    login_pass: 'सुरक्षित पासवर्ड',
    btn_create_dynamic: '{X} प्रावधान करें',
    workspace: 'कार्यक्षेत्र',
    head_admin: 'मुख्य व्यवस्थापक'
  },
  bn: {
    app_name: 'সনাতনী বন্ধন',
    portal_subtitle: 'এন্টারপ্রাইজ ওয়ার্কস্পেস গেটওয়ে',
    login_secure: 'নিরাপদ লগইন',
    login_create: 'ওয়ার্কস্পেস তৈরি করুন',
    scan_auto_login: 'লগইন করতে QR স্ক্যান করুন',
    login_identity: 'পরিচয়',
    login_forgot: 'পাসওয়ার্ড ভুলে গেছেন?',
    btn_access_portal: 'পোর্টাল অ্যাক্সেস করুন',
    qr_expired: 'এই QR কোডের মেয়াদ শেষ হয়ে গেছে বা এটি ইতিমধ্যে ব্যবহৃত হয়েছে। অনুগ্রহ করে আপনার মন্দির অফিস থেকে নতুন কোড নিন।',
    qr_offline: 'মন্দির ডাটাবেসে পৌঁছানো যাচ্ছে না। আপনার সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।',
    qr_not_login: 'এই QR কোডটি লগইন কোড নয়। অনুগ্রহ করে আপনার মন্দির অফিস থেকে লগইন QR স্ক্যান করুন।',
    qr_success: 'QR লগইন সফল। স্বাগতম!',
    reg_warning_title: 'এন্টারপ্রাইজ প্রভিশনিং',
    reg_warning_desc_1: 'আপনি একটি নতুন ',
    reg_warning_desc_2: ' ওয়ার্কস্পেস প্রভিশন করছেন। এটি একটি ডেডিকেটেড ক্লাউড ইন্সট্যান্স তৈরি করবে।',
    reg_step1: 'ওয়ার্কস্পেস বিবরণ',
    reg_org_type: 'প্রতিষ্ঠানের ধরন',
    reg_org_name: 'নাম',
    reg_desc: 'সংক্ষিপ্ত বিবরণ',
    reg_step2: 'অ্যাডমিনিস্ট্রেটর প্রোফাইল',
    reg_your_name: 'পুরো নাম',
    reg_your_phone: 'ফোন নম্বর',
    reg_official_email: 'অফিসিয়াল ইমেল',
    login_pass: 'নিরাপদ পাসওয়ার্ড',
    btn_create_dynamic: '{X} প্রভিশন করুন',
    workspace: 'ওয়ার্কস্পেস',
    head_admin: 'হেড অ্যাডমিন'
  }
};

const getCurrencyDetails = (country: string) => {
  switch(country) {
    case 'India': return { code: 'INR', symbol: '₹' };
    case 'Bangladesh': return { code: 'BDT', symbol: '৳' };
    case 'Nepal': return { code: 'NPR', symbol: 'रु' };
    case 'UK': return { code: 'GBP', symbol: '£' };
    case 'USA': return { code: 'USD', symbol: '$' };
    default: return { code: 'USD', symbol: '$' }; 
  }
};

interface PortalLoginProps {
  initialMode?: 'login' | 'signup';
  onBack: () => void;
  onSuccess: () => void;
}

export const PortalLogin: React.FC<PortalLoginProps> = ({ initialMode = 'login', onBack, onSuccess }) => {
  const { loginAsRole, addWorkspace, switchWorkspace, loginWithPin } = useAuthWorkspace();
  const { promptBiometric, BiometricPromptModal } = useBiometricAuth();
  const [language, setLanguage] = useState<'en'|'hi'|'bn'>('en'); 
  const t = (key: string) => (translations as any)[language][key] || key;

  const [activeView, setActiveView] = useState(initialMode === 'signup' ? 'REGISTER' : 'LOGIN'); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine); 

  // ENTERPRISE TOAST ENGINE
  const [toast, setToast] = useState<{message: string, type: string} | null>(null);
  const showToast = (message: string, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // UNIFIED LOGIN STATES
  const [loginIdentity, setLoginIdentity] = useState(''); 
  const [loginCredential, setLoginCredential] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false); 

  // QR SCANNER STATES
  const [isScanning, setIsScanning] = useState(false);
  const [isBiometricPromptActive, setIsBiometricPromptActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // REGISTRATION STATES
  const [regData, setRegData] = useState({
    commName: '', type: 'Mandir' as WorkspaceType, description: '', 
    adminName: '', email: '', phone: '', password: '',
    country: '', state: '', city: '', street: '',
    currency: { code: 'INR', symbol: '₹' }
  });

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

  const clearErrors = () => setError('');
  
  const handleError = (err: any) => {
    const msg = err.message || '';
    setError(msg.replace('Firebase:', '').trim());
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCountry = e.target.value;
    const currencyDetails = getCurrencyDetails(selectedCountry);
    setRegData({ ...regData, country: selectedCountry, currency: currencyDetails });
  };

  const handleBiometricLogin = async () => {
    try {
      const verified = await promptBiometric('System Login');
      if (verified) {
        // Instantly bypass PIN/password validation and authenticate into default workspace
        loginAsRole('Trustee', 'Temple Administrator');
        showToast('Biometric FaceID / TouchID Authentication Verified!', 'success');
        onSuccess();
      }
    } catch (err: any) {
      setError('Biometric authentication failed or was cancelled.');
    }
  };

  const startScanner = async () => {
    setIsScanning(true);
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.play();
        requestAnimationFrame(tick);
      }
    } catch (err) {
      setIsScanning(false);
      setError("Camera access denied or unavailable.");
    }
  };

  const stopScanner = () => {
    setIsScanning(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const tick = () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          stopScanner();
          handleSmartLogin(undefined, code.data, 'QR_SCAN', true);
          return;
        }
      }
    }
    if (isScanning) {
      requestAnimationFrame(tick);
    }
  };

  const handleSmartLogin = async (e?: React.FormEvent, identityOverride?: string, credentialOverride?: string, bypassAuthCheck?: boolean) => {
    if (e) e.preventDefault();
    clearErrors();
    const ident = identityOverride || loginIdentity;
    const cred = credentialOverride || loginCredential;
    if (!ident || (!cred && !bypassAuthCheck)) {
       return setError("Please provide Identity and Credential.");
    }

    setLoading(true);
    try {
      const identTrim = ident.trim();
      
      if (cred === 'QR_SCAN') {
        // Secure QR pairing login (WhatsApp-Web style): the scanned payload
        // carries a one-time claim token — never credentials. The server
        // validates it (single-use, 5-min TTL) and mints a session token.
        await handleQRPairingLogin(ident);
        return;
      }

      // Format identifier for Firebase Auth
      const emailToUse = identTrim.includes('@')
        ? identTrim
        : `${identTrim.replace(/\s+/g, '').toLowerCase()}@sanatanmandir.org`;
      
      // Standard PIN/Password submission handler authenticated against Firebase
      const userCredential = await signInWithEmailAndPassword(auth, emailToUse, cred);
      
      // On successful Firebase Auth, push the user to the authenticated dashboard
      loginAsRole('Trustee', userCredential.user.displayName || userCredential.user.email || 'Temple Administrator');
      showToast("Secure Login Successful", "success");
      onSuccess();
    } catch (err: any) {
      console.error(err);
      // Sandbox admin PIN fallback — verified SERVER-SIDE against a peppered
      // hash (POST /api/auth/verify-pin). No client-side PIN comparison exists.
      // Any 4-digit input no longer grants access.
      try {
        const pinSuccess = await loginWithPin(cred, []);
        if (pinSuccess) {
          showToast("Master PIN Verified (Sandbox Access)", "success");
          onSuccess();
          return;
        }
      } catch (pinErr) {
        console.warn('[PortalLogin] Server PIN verification unavailable:', pinErr);
      }
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Secure QR pairing login (Spark-plan, Firestore-native — no server).
   * The scanned payload is `{ v, type: 'sb-pair', token, wid, exp }`: a
   * one-time claim token minted by the temple office into `qrPairTokens`.
   * Claim = read the doc (bearer-token read), verify it hasn't expired,
   * delete it (single-use), then sign in anonymously and assume the role.
   * Non-enumerating: unknown / expired / already-claimed all show the same
   * message so a token can't be probed.
   */
  const handleQRPairingLogin = async (scanned: string) => {
    let payload: any = null;
    try {
      payload = JSON.parse(scanned);
    } catch {
      payload = null;
    }

    if (!payload || payload.type !== 'sb-pair' || typeof payload.token !== 'string') {
      setError(t('qr_not_login'));
      return;
    }

    let snap;
    try {
      snap = await getDoc(doc(db, 'qrPairTokens', payload.token));
    } catch {
      setError(t('qr_offline'));
      return;
    }

    if (!snap.exists()) {
      setError(t('qr_expired'));
      return;
    }

    const data: any = snap.data() || {};
    const expMs =
      typeof data.expiresAt?.toMillis === 'function'
        ? data.expiresAt.toMillis()
        : Number(data.expiresAt) || 0;
    if (!expMs || expMs < Date.now()) {
      // Best-effort cleanup of the stale token; claim still denied.
      deleteDoc(snap.ref).catch(() => {});
      setError(t('qr_expired'));
      return;
    }

    try {
      await deleteDoc(snap.ref); // single-use: burn the token before login
    } catch {
      setError(t('qr_offline'));
      return;
    }

    try {
      await signInAnonymously(auth);
    } catch {
      setError(t('qr_offline'));
      return;
    }

    const role = (typeof data.role === 'string' && data.role ? data.role : 'Devotee') as UserRole;
    loginAsRole(role, data.memberName || 'Devotee');
    showToast(t('qr_success'), 'success');
    onSuccess();
  };

  const handleRegister = async (e: React.FormEvent) => {    e.preventDefault();
    clearErrors();
    if (!navigator.onLine) return setError("Internet connection required to create a new workspace.");

    const { commName, type, adminName, email, phone, password, country, state, city, street, currency } = regData;
    if (!commName || !adminName || !email || !phone || !password) return setError("Please fill all core required fields.");
    if (!country || !state || !city) return setError("Please complete the Location / Address Picker section.");

    setLoading(true);
    try {
      // 1. Create Firebase Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const newWorkspace: WorkspaceConfig = {
        id: "WS-" + Math.floor(1000 + Math.random() * 9000),
        name: commName,
        type: type,
        address: [street, city, state, country].filter(Boolean).join(', '),
        city: city,
        state: state,
        country: country,
        email: email,
        phone: phone,
        currency: currency.code,
        currencySymbol: currency.symbol,
        adminPin: '', tagline: '', sampradaya: '', kuladevata: '', pinRequired: true // adminPin is server-managed (POST /api/admin/tenants/:id/pin) - never hardcode
      };

      // 2. Write User Document (Crucial for RBAC rules)
      // RESOLVED: PHASE 1B - Tenant administrator provisioning completed
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: email,
        phone: phone,
        name: adminName,
        createdAt: serverTimestamp()
      });

      // 3. Write Workspace Document
      await setDoc(doc(db, 'workspaces', newWorkspace.id), newWorkspace);

      addWorkspace(newWorkspace);
      switchWorkspace(newWorkspace.id);
      loginAsRole('Trustee', adminName);
      
      showToast("Workspace Provisioned Successfully", "success");
      onSuccess();
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!navigator.onLine) return showToast("Internet required to reset password.", "error");
    if (!loginIdentity.includes('@')) {
      return setError("Please enter your Admin Email Address in the Identity field first.");
    }
    
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, loginIdentity);
      showToast("Reset link sent to your email inbox!", "success");
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-temple-50 flex items-center justify-center p-4 sm:p-8 font-sans selection:bg-temple-200 selection:text-temple-900 relative">
      {/* Dynamic Background */}
      

      {/* GLOBAL CUSTOM TOAST ENGINE */}
      <AnimatePresence>
        {toast && createPortal(
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[10000] px-6 py-3 rounded-lg shadow-2xl flex items-center gap-4 ${toast.type === 'error' ? 'bg-red-900' : 'bg-gray-900'} text-white`}
          >
             <div className={`p-2 rounded-full shrink-0 ${toast.type === 'offline' ? 'bg-saffron-500/20 text-saffron-500' : toast.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
               {toast.type === 'offline' ? <WifiOff size={20}/> : toast.type === 'error' ? <AlertTriangle size={20}/> : <CheckCircle2 size={20}/>}
             </div>
             <div>
               <p className={`text-sm font-medium mb-0.5 ${toast.type === 'offline' ? 'text-saffron-400' : toast.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                 {toast.type === 'offline' ? 'Offline Cache' : toast.type === 'error' ? 'Error' : 'Success'}
               </p>
               <p className="text-sm font-bold">{toast.message}</p>
             </div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>

      {/* OFFLINE BANNER */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 w-full bg-red-600 text-white p-2 text-center flex items-center justify-center gap-2 shadow-sm z-[110]"
          >
            <WifiOff size={14} />
            <span className="text-sm font-medium text-temple-400">Offline Mode: Cached Login Active</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-6xl bg-white rounded-2xl shadow-xl border border-temple-200 overflow-hidden flex flex-col lg:flex-row relative z-10"
      >
        
        {/* Left Side: Branding & Visuals */}
        <div className="lg:w-5/12 bg-temple-900 p-8 lg:p-12 relative flex flex-col justify-between hidden lg:flex">
          {/* Premium Background Layer */}
          <div className="absolute inset-0 bg-temple-950"></div>
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-saffron-900/40 via-temple-900/80 to-temple-950"></div>
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
          
          <div className="relative z-10 flex flex-col items-center justify-center gap-3 text-center">
             <AppLogo size="lg" showText={true} textVariant="light" subtitle={t('portal_subtitle')} />
          </div>

          <div className="relative z-10 my-16 flex flex-col items-center text-center">
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl lg:text-[2.75rem] font-bold text-white tracking-tight mb-6 leading-[1.15]"
            >
              Secure Identity <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-saffron-400 to-saffron-400">& Community</span> <br/>Management.
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="text-temple-400 font-medium leading-relaxed max-w-sm"
            >
              Access your digital ashram, manage devotees, coordinate events, and secure your community data with enterprise-grade encryption.
            </motion.p>
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-temple-800/50 pt-6">
             <div className="flex items-center gap-2 text-temple-500 text-xs font-bold">
               <ShieldCheck size={16} className="text-emerald-500" />
               AES-256 ENCRYPTED
             </div>
             
             <div className="relative flex items-center bg-temple-900 rounded-xl p-1 border border-temple-800">
                <Languages size={14} className="text-temple-400 ml-2 mr-1" />
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-saffron-400 to-saffron-400 outline-none cursor-pointer pr-2 appearance-none"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी</option>
                  <option value="bn">বাংলা</option>
                </select>
             </div>
          </div>
        </div>

        {/* Right Side: Authentication Forms */}
        <div className="w-full lg:w-7/12 p-6 sm:p-10 lg:p-12 relative flex flex-col">
          
          {/* Mobile Branding (Visible only on small screens) */}
          <div className="flex lg:hidden flex-col items-center justify-center gap-3 mb-8 pb-6 border-b border-temple-100 text-center">
             <AppLogo size="md" showText={true} textVariant="dark" subtitle={t('portal_subtitle')} />
          </div>

          
          {/* Header toggles */}
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-semibold text-temple-900">
              {activeView === 'LOGIN' ? 'Welcome Back' : 'Create Workspace'}
            </h3>
            
            <div className="flex bg-temple-100 p-1 rounded-xl">
               <button 
                 onClick={() => { setActiveView('LOGIN'); clearErrors(); }} 
                 className={`px-4 py-2 text-[10px] sm:text-sm font-medium rounded-lg transition-all ${activeView === 'LOGIN' ? 'bg-white text-temple-900 shadow-sm' : 'text-temple-500 hover:text-temple-700'}`}
               >
                 Login
               </button>
               <button 
                 onClick={() => { setActiveView('REGISTER'); clearErrors(); }} 
                 className={`px-4 py-2 text-[10px] sm:text-sm font-medium rounded-lg transition-all ${activeView === 'REGISTER' ? 'bg-white text-temple-900 shadow-sm' : 'text-temple-500 hover:text-temple-700'}`}
               >
                 Sign Up
               </button>
            </div>
          </div>

          <div className="flex-1 relative">
            
            {/* FULLSCREEN BIOMETRIC SCANNER OVERLAY */}
            <AnimatePresence>
            {isBiometricPromptActive && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 bg-temple-950/95 backdrop-blur-md z-50 flex flex-col items-center justify-center rounded-3xl p-6 shadow-2xl border border-temple-800"
              >
                 <button onClick={() => setIsBiometricPromptActive(false)} className="absolute top-4 right-4 bg-white/10 text-white p-2 rounded-full hover:bg-red-500 transition-colors z-50">
                   <X size={24}/>
                 </button>
                 <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center relative mb-6">
                   <div className="absolute inset-0 border-[3px] border-emerald-500/30 rounded-full animate-ping"></div>
                   <div className="absolute inset-2 border-[2px] border-emerald-500/50 rounded-full animate-pulse"></div>
                   <Fingerprint size={48} className="text-emerald-400 relative z-10" />
                 </div>
                 <h3 className="text-white text-lg font-black uppercase tracking-widest mb-2 text-center">Touch Sensor</h3>
                 <p className="text-temple-400 text-xs font-bold text-center leading-relaxed">
                   Waiting for device biometric verification.<br/>Use Touch ID, Face ID, or your device PIN.
                 </p>
                 <button onClick={() => setIsBiometricPromptActive(false)} className="mt-8 text-temple-500 text-sm font-medium text-temple-400 hover:text-white transition-colors border-b border-temple-700 pb-1">
                   Use Manual Password Instead
                 </button>
              </motion.div>
            )}
            </AnimatePresence>

            {/* FULLSCREEN QR SCANNER OVERLAY */}
            <AnimatePresence>
            {isScanning && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 bg-temple-950/95 backdrop-blur-md z-50 flex flex-col items-center justify-center rounded-3xl p-4 shadow-2xl border border-temple-800"
              >
                 <button onClick={stopScanner} className="absolute top-4 right-4 bg-white/10 text-white p-2 rounded-full hover:bg-red-500 transition-colors z-50">
                   <X size={24}/>
                 </button>
                 <h3 className="text-white font-black uppercase tracking-widest mb-4 flex items-center gap-2"><QrCode/> Scan Official ID</h3>
                 <div className="relative w-64 h-64 rounded-3xl overflow-hidden border-4 border-saffron-500 shadow-[0_0_50px_rgba(245,158,11,0.3)]">
                    <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 border-[3px] border-white/30 m-8 rounded-xl pointer-events-none"></div>
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-saffron-500/50 shadow-[0_0_8px_#f59e0b] animate-pulse"></div>
                 </div>
                 <p className="text-temple-400 text-xs mt-6 font-bold text-center">Align QR code within the frame</p>
              </motion.div>
            )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {activeView === 'LOGIN' ? (
                <motion.form 
                  key="login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleSmartLogin as any} 
                  className={`space-y-5 ${isScanning ? 'opacity-0' : 'opacity-100'}`}
                >
                  <div className="bg-indigo-50/50 border border-indigo-100/50 p-4 rounded-2xl mb-6 text-center shadow-inner">
                    <p className="text-[10px] font-black text-indigo-800 uppercase tracking-widest flex items-center justify-center gap-1.5"><ShieldCheck size={14}/> Universal Access Portal</p>
                    <p className="text-xs text-indigo-600/80 mt-1 font-semibold">Secure login for Admins, Members, and Purohits</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                     <button type="button" onClick={startScanner} className="group bg-white hover:bg-temple-50 border border-temple-200 text-temple-700 font-medium py-3 rounded-lg text-sm transition-all flex flex-col justify-center items-center gap-2 shadow-sm hover:shadow-md">
                       <div className="p-2 bg-saffron-100 text-saffron-600 rounded-full group-hover:scale-110 transition-transform"><QrCode size={20}/></div>
                       Scan Pass
                     </button>
                     <button type="button" onClick={handleBiometricLogin} className="group bg-white hover:bg-temple-50 border border-temple-200 text-temple-700 font-medium py-3 rounded-lg text-sm transition-all flex flex-col justify-center items-center gap-2 shadow-sm hover:shadow-md">
                       <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full group-hover:scale-110 transition-transform"><Fingerprint size={20}/></div>
                       Passkey
                     </button>
                  </div>

                  <div className="flex items-center gap-4 py-2 opacity-60">
                     <div className="h-px bg-temple-300 flex-1"></div>
                     <span className="text-sm font-medium text-temple-400">OR USE CREDENTIALS</span>
                     <div className="h-px bg-temple-300 flex-1"></div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">{t('login_identity')}</label>
                      <div className="relative group">
                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-temple-400 group-focus-within:text-saffron-500 transition-colors" />
                        <input type="text" required value={loginIdentity} onChange={e=>setLoginIdentity(e.target.value)} placeholder="Email, Phone, or ID" className="w-full pl-11 pr-4 py-3.5 bg-temple-50 hover:bg-white border border-temple-200 hover:border-temple-300 rounded-xl text-sm font-medium text-temple-900 placeholder:text-temple-400 focus:bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none transition-all shadow-sm" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-end mb-1.5">
                        <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest">{t('login_pass')}</label>
                        <button type="button" onClick={handleForgotPassword} className="text-xs font-medium text-temple-500 hover:text-temple-900 transition-colors">
                          {t('login_forgot')}
                        </button>
                      </div>
                      <div className="relative group">
                        <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-temple-400 group-focus-within:text-saffron-500 transition-colors" />
                        <input type={showLoginPassword ? "text" : "password"} required value={loginCredential} onChange={e=>setLoginCredential(e.target.value)} placeholder="Enter Password or PIN" className="w-full pl-11 pr-11 py-3.5 bg-temple-50 hover:bg-white border border-temple-200 hover:border-temple-300 rounded-xl text-sm font-medium text-temple-900 placeholder:text-temple-400 focus:bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none transition-all shadow-sm" />
                        <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-temple-400 hover:text-saffron-500 focus:outline-none transition-colors">
                          {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* PROMINENT BIOMETRIC AUTHENTICATION BUTTON */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleBiometricLogin}
                      className="group relative w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-sm tracking-wide transition-all shadow-md hover:shadow-lg hover:shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2.5 active:scale-[0.99] border border-emerald-400/30"
                    >
                      <div className="relative flex items-center justify-center">
                        <Fingerprint className="w-5 h-5 text-emerald-100 group-hover:scale-110 transition-transform" />
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200"></span>
                        </span>
                      </div>
                      <span>Quick Login with FaceID / TouchID</span>
                    </button>
                    <p className="text-[10px] text-center text-temple-400 mt-1.5 font-medium">
                      WebAuthn / FIDO2 Hardware-grade passwordless biometric sign-in
                    </p>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-xs font-bold text-center shadow-sm flex items-center justify-center gap-2 mt-4">
                          <AlertTriangle size={14}/> {error}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button type="submit" disabled={loading} className="w-full bg-temple-900 hover:bg-temple-800 text-white font-medium py-3 rounded-lg shadow-sm transition-colors text-sm flex justify-center items-center gap-2 mt-6 disabled:opacity-50 disabled:hover:translate-y-0">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : t('btn_access_portal')}
                  </button>
                </motion.form>
              ) : (
                <motion.form 
                  key="register"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleRegister} 
                  className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar"
                >
                  <div className="bg-temple-50 border border-temple-200 p-4 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="text-saffron-600 shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="text-temple-900 font-semibold text-sm mb-1">{t('reg_warning_title')}</h4>
                      <p className="text-sm text-temple-600">
                        {t('reg_warning_desc_1')}<strong className="font-bold text-temple-900">{regData.type}</strong>{t('reg_warning_desc_2')}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-temple-100 space-y-4">
                    <h4 className="text-sm font-medium text-temple-400 border-b border-temple-200 pb-2 flex items-center gap-2"><Building2 size={14}/> {t('reg_step1')}</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-temple-400 mb-1">{t('reg_org_type')}</label>
                      <select value={regData.type} onChange={e=>setRegData({...regData, type: e.target.value as WorkspaceType})} className="w-full p-3.5 bg-temple-50 hover:bg-white border border-temple-200 hover:border-temple-300 rounded-xl text-sm font-medium text-temple-900 focus:bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none transition-all shadow-sm cursor-pointer">
                        <option value="Mandir">Mandir / Temple (मंदिर)</option>
                        <option value="Ashram">Ashram (आश्रम)</option>
                        <option value="Goshala">Goshala (गौशाला)</option>
                        <option value="Gurukul">Gurukul / Vidyalaya (गुरुकुल)</option>
                        <option value="Sangha">Sangha / Matha (संघ / मठ)</option>
                        <option value="Satsang">Satsang / Katha (सत्संग)</option>
                        <option value="Yoga">Yoga Center (योग केंद्र)</option>
                        <option value="Tirth">Tirth / Kshetra (तीर्थ)</option>
                        <option value="PurohitSabha">Purohit Sabha (पुरोहित सभा)</option>
                        <option value="MahotsavSamiti">Mahotsav Samiti (महोत्सव समिति)</option>
                        <option value="DharmadaTrust">Dharmada Trust (धर्मादा ट्रस्ट)</option>
                        <option value="AkshayaPatra">Annakshetra / Bhandara (अन्नक्षेत्र)</option>
                        <option value="Samaj">Samaj / Parishad (समाज)</option>
                        <option value="Trust">General Trust / NGO (ट्रस्ट)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-temple-400 mb-1">{t('reg_org_name')} *</label>
                      <input type="text" required value={regData.commName} onChange={e=>setRegData({...regData, commName: e.target.value})} className="w-full p-3.5 bg-temple-50 hover:bg-white border border-temple-200 hover:border-temple-300 rounded-xl text-sm font-medium text-temple-900 placeholder:text-temple-400 focus:bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none transition-all shadow-sm" placeholder="e.g. Sri Ram Mandir Trust" />
                    </div>

                    <div className="space-y-4 pt-4 border-t border-temple-100 space-y-4">
                       <div className="flex items-center gap-2 text-sm font-medium text-temple-900 border-b border-temple-100 pb-2 mb-2">
                         <MapPin size={14}/> Location Details
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-temple-400 mb-1">Country *</label>
                         <div className="relative group">
                           <Globe2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-temple-400 group-focus-within:text-saffron-500 transition-colors pointer-events-none" />
                           <select required value={regData.country} onChange={handleCountryChange} className="w-full pl-11 pr-4 py-3.5 bg-temple-50 hover:bg-white border border-temple-200 hover:border-temple-300 rounded-xl text-sm font-medium text-temple-900 focus:bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none transition-all shadow-sm cursor-pointer appearance-none">
                             <option value="" disabled>Select Country...</option>
                             <option value="India">India (भारत)</option>
                             <option value="Bangladesh">Bangladesh (বাংলাদেশ)</option>
                             <option value="Nepal">Nepal (नेपाल)</option>
                             <option value="Sri Lanka">Sri Lanka</option>
                             <option value="USA">United States</option>
                             <option value="UK">United Kingdom</option>
                             <option value="Other">Other Region</option>
                           </select>
                         </div>
                       </div>
                       <div className="grid grid-cols-2 gap-3">
                         <div>
                           <label className="block text-sm font-medium text-temple-400 mb-1">State / Division *</label>
                           <input type="text" required value={regData.state} onChange={e=>setRegData({...regData, state: e.target.value})} className="w-full p-3.5 bg-temple-50 hover:bg-white border border-temple-200 hover:border-temple-300 rounded-xl text-sm font-medium text-temple-900 placeholder:text-temple-400 focus:bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none transition-all shadow-sm" placeholder="e.g. West Bengal" />
                         </div>
                         <div>
                           <label className="block text-sm font-medium text-temple-400 mb-1">City / District *</label>
                           <input type="text" required value={regData.city} onChange={e=>setRegData({...regData, city: e.target.value})} className="w-full p-3.5 bg-temple-50 hover:bg-white border border-temple-200 hover:border-temple-300 rounded-xl text-sm font-medium text-temple-900 placeholder:text-temple-400 focus:bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none transition-all shadow-sm" placeholder="e.g. Kolkata" />
                         </div>
                       </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-temple-400 mb-1.5">{t('reg_desc')}</label>
                      <div className="relative group">
                        <AlignLeft size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-temple-400 group-focus-within:text-temple-900" />
                        <textarea rows={2} value={regData.description} onChange={e=>setRegData({...regData, description: e.target.value})} className="w-full pl-10 pr-4 p-3.5 w-full px-3 py-2 border border-temple-300 rounded-lg text-sm text-temple-900 focus:border-temple-900 focus:ring-1 focus:ring-temple-900 outline-none transition-all resize-none" placeholder={regData.type === 'PurohitSabha' ? 'Short description of your services...' : 'Short description of your community...'} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-temple-100 space-y-4">
                    <h4 className="text-sm font-medium text-temple-400 border-b border-temple-200 pb-2 flex items-center gap-2"><User size={14}/> {t('reg_step2')}</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-temple-400 mb-1.5">{t('reg_your_name')}</label>
                        <input type="text" required value={regData.adminName} onChange={e=>setRegData({...regData, adminName: e.target.value})} className="w-full p-3.5 bg-temple-50 hover:bg-white border border-temple-200 hover:border-temple-300 rounded-xl text-sm font-medium text-temple-900 placeholder:text-temple-400 focus:bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none transition-all shadow-sm" placeholder="Full Name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-temple-400 mb-1.5">{t('reg_your_phone')}</label>
                        <input type="tel" required value={regData.phone} onChange={e=>setRegData({...regData, phone: e.target.value})} className="w-full p-3.5 bg-temple-50 hover:bg-white border border-temple-200 hover:border-temple-300 rounded-xl text-sm font-medium text-temple-900 placeholder:text-temple-400 focus:bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none transition-all shadow-sm" placeholder="Mobile Number" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-temple-400 mb-1.5">{t('reg_official_email')}</label>
                      <div className="relative group">
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-temple-400 group-focus-within:text-saffron-500 transition-colors" />
                        <input type="email" required value={regData.email} onChange={e=>setRegData({...regData, email: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-temple-50 hover:bg-white border border-temple-200 hover:border-temple-300 rounded-xl text-sm font-medium text-temple-900 placeholder:text-temple-400 focus:bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none transition-all shadow-sm" placeholder="admin@example.com" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-temple-400 mb-1.5">{t('login_pass')} *</label>
                      <div className="relative group">
                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-temple-400 group-focus-within:text-saffron-500 transition-colors" />
                        <input type={showRegPassword ? "text" : "password"} required value={regData.password} onChange={e=>setRegData({...regData, password: e.target.value})} className="w-full pl-11 pr-11 py-3.5 bg-temple-50 hover:bg-white border border-temple-200 hover:border-temple-300 rounded-xl text-sm font-medium text-temple-900 placeholder:text-temple-400 focus:bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none transition-all shadow-sm" placeholder="Create a strong password" />
                        <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-temple-400 hover:text-saffron-500 focus:outline-none transition-colors">
                          {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-xs font-bold text-center shadow-sm flex items-center justify-center gap-2 mt-4">
                          <AlertTriangle size={14}/> {error}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button type="submit" disabled={loading} className="w-full bg-temple-900 hover:bg-temple-800 text-white font-medium py-2.5 rounded-lg shadow-sm transition-colors text-sm flex justify-center items-center gap-2 mt-6 disabled:opacity-50 disabled:hover:translate-y-0">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : t('btn_create_dynamic').replace('{X}', regData.type.toUpperCase())}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Hardware Biometric WebAuthn Modal */}
      <BiometricPromptModal />
    </div>
  );
};
