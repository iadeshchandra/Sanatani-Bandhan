import React, { useState, useEffect, useRef, useContext } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Loader2, ShieldCheck, Building2, User, Key, Mail, Phone,
  Lock, ArrowLeft, Eye, EyeOff, AlertTriangle, MapPin, AlignLeft, Languages,
  Globe2, Navigation, QrCode, X, WifiOff, CheckCircle2, Flame, Fingerprint, Ban
} from 'lucide-react';
import jsQR from 'jsqr';
import AppLogo from '../common/AppLogo';
import './auth-animations.css';
import { AuthArt, type AuthLang } from './AuthArt';
import { AuthField } from './AuthField';
import { AuthDoors, type AuthDoorId } from './AuthDoors';
import { LanguageContext } from '../../context/LanguageContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import { WorkspaceConfig, WorkspaceType, ROLE_MIGRATION_MAP } from '../../types';
import { sendPasswordResetEmail, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { auth, db } from '../../services/firebaseClient';
import { doc, setDoc, getDoc, getDocs, deleteDoc, serverTimestamp, query, where, collection, limit } from 'firebase/firestore';
import type { UserRole } from '../../types';
import { PurohitSignupForm } from '../purohit/PurohitSignupForm';
import { SoloSignupForm } from '../../solo/SoloSignupForm';
import { JyotishSignupForm } from '../../jyotish/JyotishSignupForm';
import { GoogleSignInButton } from '../auth/GoogleSignInButton';
import type { GoogleAuthResult } from '../../lib/googleAuth';
import { syncOrgPage } from '../../context/MembershipContext';

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
    reg_warning_title: 'Create Your Free Workspace',
    reg_warning_desc_1: 'You are creating a free ',
    reg_warning_desc_2: ' workspace. Free forever — upgrade anytime.',
    reg_step1: 'Workspace Details',
    reg_org_type: 'Organization Type',
    reg_org_name: 'Name',
    reg_desc: 'Short Description',
    reg_step2: 'Administrator Profile',
    reg_your_name: 'Full Name',
    reg_your_phone: 'Phone Number',
    reg_official_email: 'Official Email',
    login_pass: 'Secure Password',
    btn_create_dynamic: 'Create {X} Workspace',
    workspace: 'Workspace',
    head_admin: 'Head Admin',
    back: 'Back',
    door_login: 'Login',
    door_solo: 'Solo',
    door_signup: 'Sign Up',
    door_purohit: 'Purohit',
    door_jyotishi: 'Jyotishi',
    hint_login: 'Sign in to your account',
    hint_solo: 'Your personal Sanatani home — no organisation needed',
    hint_signup: 'Create an organisation workspace',
    hint_purohit: 'Register as a purohit — earn a PUR-XXXXXX identity',
    hint_jyotishi: 'Register as a jyotishi — earn a JYO-XXXXXX identity',
    view_login_title: 'Welcome back',
    view_login_sub: 'Sign in to your Sanatani identity',
    view_solo_title: 'Solo Sanatani',
    view_solo_sub: 'Your personal Sanatani home — no organisation needed',
    view_register_title: 'Create workspace',
    view_register_sub: 'Bring your institution onto Sanatani Bandhan',
    view_purohit_title: 'Join as Purohit',
    view_purohit_sub: 'Offer rituals, earn a verified PUR-XXXXXX identity',
    view_jyotishi_title: 'Join as Jyotishi',
    view_jyotishi_sub: 'Offer consultations, earn a verified JYO-XXXXXX identity',
    trust_offline: 'Offline-first',
    trust_data: 'Your data stays yours',
    trust_noads: 'No ads, ever'
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
    reg_warning_title: 'अपना निःशुल्क कार्यक्षेत्र बनाएं',
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
    btn_create_dynamic: '{X} कार्यक्षेत्र बनाएं',
    workspace: 'कार्यक्षेत्र',
    head_admin: 'मुख्य व्यवस्थापक',
    back: 'वापस',
    door_login: 'लॉगिन',
    door_solo: 'सोलो',
    door_signup: 'साइन अप',
    door_purohit: 'पुरोहित',
    door_jyotishi: 'ज्योतिषी',
    hint_login: 'अपने खाते में साइन इन करें',
    hint_solo: 'आपका व्यक्तिगत सनातनी घर — किसी संगठन की आवश्यकता नहीं',
    hint_signup: 'संगठन कार्यक्षेत्र बनाएं',
    hint_purohit: 'पुरोहित के रूप में पंजीकरण करें — PUR-XXXXXX पहचान पाएं',
    hint_jyotishi: 'ज्योतिषी के रूप में पंजीकरण करें — JYO-XXXXXX पहचान पाएं',
    view_login_title: 'फिर से स्वागत है',
    view_login_sub: 'अपनी सनातनी पहचान में साइन इन करें',
    view_solo_title: 'सोलो सनातनी',
    view_solo_sub: 'आपका व्यक्तिगत सनातनी घर — किसी संगठन की आवश्यकता नहीं',
    view_register_title: 'कार्यक्षेत्र बनाएं',
    view_register_sub: 'अपनी संस्था को सनातनी बंधन से जोड़ें',
    view_purohit_title: 'पुरोहित बनें',
    view_purohit_sub: 'अनुष्ठान सेवा दें, सत्यापित PUR-XXXXXX पहचान पाएं',
    view_jyotishi_title: 'ज्योतिषी बनें',
    view_jyotishi_sub: 'परामर्श दें, सत्यापित JYO-XXXXXX पहचान पाएं',
    trust_offline: 'ऑफ़लाइन-फर्स्ट',
    trust_data: 'आपका डेटा आपका ही रहता है',
    trust_noads: 'कोई विज्ञापन नहीं'
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
    reg_warning_title: 'আপনার বিনামূল্যের কর্মক্ষেত্র তৈরি করুন',
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
    btn_create_dynamic: '{X} কর্মক্ষেত্র তৈরি করুন',
    workspace: 'ওয়ার্কস্পেস',
    head_admin: 'হেড অ্যাডমিন',
    back: 'ফিরে যান',
    door_login: 'লগইন',
    door_solo: 'সোলো',
    door_signup: 'সাইন আপ',
    door_purohit: 'পুরোহিত',
    door_jyotishi: 'জ্যোতিষী',
    hint_login: 'আপনার অ্যাকাউন্টে সাইন ইন করুন',
    hint_solo: 'আপনার ব্যক্তিগত সনাতনী ঘর — কোনো সংস্থার প্রয়োজন নেই',
    hint_signup: 'সংস্থার ওয়ার্কস্পেস তৈরি করুন',
    hint_purohit: 'পুরোহিত হিসেবে নিবন্ধন করুন — PUR-XXXXXX পরিচয় পান',
    hint_jyotishi: 'জ্যোতিষী হিসেবে নিবন্ধন করুন — JYO-XXXXXX পরিচয় পান',
    view_login_title: 'আবার স্বাগতম',
    view_login_sub: 'আপনার সনাতনী পরিচয়ে সাইন ইন করুন',
    view_solo_title: 'সোলো সনাতনী',
    view_solo_sub: 'আপনার ব্যক্তিগত সনাতনী ঘর — কোনো সংস্থার প্রয়োজন নেই',
    view_register_title: 'ওয়ার্কস্পেস তৈরি করুন',
    view_register_sub: 'আপনার প্রতিষ্ঠানকে সনাতনী বন্ধনে আনুন',
    view_purohit_title: 'পুরোহিত হিসেবে যোগ দিন',
    view_purohit_sub: 'অনুষ্ঠান সেবা দিন, যাচাইকৃত PUR-XXXXXX পরিচয় পান',
    view_jyotishi_title: 'জ্যোতিষী হিসেবে যোগ দিন',
    view_jyotishi_sub: 'পরামর্শ দিন, যাচাইকৃত JYO-XXXXXX পরিচয় পান',
    trust_offline: 'অফলাইন-ফার্স্ট',
    trust_data: 'আপনার ডেটা আপনারই থাকে',
    trust_noads: 'কোনো বিজ্ঞাপন নয়'
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
  const { loginAsRole, addWorkspace, switchWorkspace, loginWithPin, workspaces, activeWorkspace, enterPurohitSession } = useAuthWorkspace();
  const { promptBiometric, BiometricPromptModal } = useBiometricAuth();
  // Locale follows the app-wide LanguageContext (English default). The auth
  // page's own selector also pushes the choice back to the global locale.
  const langCtx = useContext(LanguageContext);
  const [language, setLanguage] = useState<'en'|'hi'|'bn'>(() => {
    const c = langCtx?.currentLang;
    return c === 'hi' || c === 'bn' ? c : 'en';
  });
  const t = (key: string) => (translations as any)[language][key] || key;
  const changeLanguage = (l: 'en'|'hi'|'bn') => {
    setLanguage(l);
    try { langCtx?.changeLanguage(l); } catch { /* no provider — local only */ }
  };
  const authLang: AuthLang = language;

  // Ambient-scene helpers: transform/opacity only, reduced-motion aware.
  const artWrapRef = useRef<HTMLDivElement>(null);
  const reducedMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const handleParallax = (e: React.MouseEvent) => {
    if (reducedMotion) return;
    const el = artWrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--px', (((e.clientX - r.left) / r.width) - 0.5).toFixed(3));
    el.style.setProperty('--py', (((e.clientY - r.top) / r.height) - 0.5).toFixed(3));
  };
  const magneticGlow = (e: React.MouseEvent<HTMLButtonElement>) => {
    const b = e.currentTarget;
    const r = b.getBoundingClientRect();
    b.style.setProperty('--mx', `${(e.clientX - r.left).toFixed(0)}px`);
    b.style.setProperty('--my', `${(e.clientY - r.top).toFixed(0)}px`);
  };

  const [activeView, setActiveView] = useState<'LOGIN' | 'REGISTER' | 'SOLO' | 'PUROHIT' | 'JYOTISHI'>(initialMode === 'signup' ? 'SOLO' : 'LOGIN'); 
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

  // H-11: is this Firebase user the recorded creator of the workspace being
  // entered? Checked against the local workspace registry (populated at
  // registration with `createdBy`). A user can only ever be the creator of
  // workspaces they provisioned themselves — never someone else's.
  const isWorkspaceCreator = (uid: string): boolean => {
    if (!uid) return false;
    const ws = workspaces?.find((w) => w.id === activeWorkspace?.id) || activeWorkspace;
    return !!ws && (ws as any).createdBy === uid;
  };
  
  const handleError = (err: any) => {
    const msg = err.message || '';
    setError(msg.replace('Firebase:', '').trim());
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCountry = e.target.value;
    const currencyDetails = getCurrencyDetails(selectedCountry);
    setRegData({ ...regData, country: selectedCountry, currency: currencyDetails });
  };

  // H-10: biometrics are SESSION RE-CONFIRMATION ONLY (device-unlock grade).
  // They may re-confirm an already-signed-in session — they must NEVER mint
  // a privileged session from signed-out state.
  const handleBiometricLogin = async () => {
    if (!auth.currentUser) {
      setError('Sign in first — biometrics only re-confirm your existing session.');
      return;
    }
    try {
      const verified = await promptBiometric('Session Re-confirmation');
      if (verified) {
        // Session re-confirmed on this device. The existing Firebase session
        // (and its role) is unchanged — no privilege is granted here.
        showToast('Identity re-confirmed on this device.', 'success');
        onSuccess();
      } else {
        setError('Biometric authentication failed or was cancelled.');
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
      await finalizeLogin(userCredential.user, emailToUse);
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
   * Post-auth finalization shared by email/password AND Google sign-in.
   * Resolves the role from users/{uid} (H-11: never self-granted),
   * routes independent purohits to their personal workspace, and otherwise
   * signs the user into the org context. Google users get the identical
   * treatment — no privileged role is ever minted here.
   */
  const finalizeLogin = async (fbUser: any, emailToUse: string) => {
    // H-11: NEVER self-grant Trustee. The role comes from the authoritative
    // users/{uid} Firestore doc. The rules forbid clients from writing
    // `role` themselves, so the doc is created with identity fields only;
    // the Devotee default is applied in-memory (safe default). The one
    // exception: the recorded creator of the workspace being entered
    // (workspaces/{id}.createdBy) is its administrator — that fact is
    // written once at registration under rules that allow it, and cannot
    // be forged for someone else's workspace.
    const VALID_ROLES: UserRole[] = ['SuperAdmin', 'Trustee', 'Priest', 'Accountant', 'Sevadar', 'Devotee', 'CSO'];
    let role: UserRole = 'Devotee';
    try {
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const rawRole = String(userSnap.data()?.role || '');
        const normalized = (ROLE_MIGRATION_MAP[rawRole] || rawRole) as UserRole;
        if (rawRole && VALID_ROLES.includes(normalized)) {
          role = normalized;
        } else if (isWorkspaceCreator(fbUser.uid)) {
          role = 'Trustee';
        }
      } else {
        // Rules-allowed keys only: `role`/`workspaceId` are never
        // client-writable (clients can never self-grant privilege).
        await setDoc(userDocRef, {
          uid: fbUser.uid,
          email: fbUser.email || emailToUse,
          createdAt: serverTimestamp(),
        }, { merge: true }).catch(() => {});
        if (isWorkspaceCreator(fbUser.uid)) {
          role = 'Trustee';
        }
      }
    } catch (roleErr: any) {
      console.warn('[PortalLogin] users-doc role lookup failed, defaulting to Devotee:', roleErr?.message || roleErr);
      if (isWorkspaceCreator(fbUser.uid)) {
        role = 'Trustee';
      }
    }

    // Purohit One: an independent purohit's account belongs to no
    // organisation. Route them straight into their personal workspace.
    // Dual-identity (devotee_upgrade) users stay in org context here —
    // the mode switcher in their account area flips them over.
    try {
      const pSnap = await getDocs(
        query(collection(db, 'purohits'), where('uid', '==', fbUser.uid), limit(1))
      );
      if (!pSnap.empty) {
        const pData = pSnap.docs[0].data() as any;
        if (pData?.source === 'independent') {
          enterPurohitSession({ id: pSnap.docs[0].id, ...pData });
          showToast('Welcome back to your purohit workspace', 'success');
          onSuccess();
          return;
        }
      }
    } catch (pErr) {
      console.warn('[PortalLogin] purohit lookup failed, continuing org login:', (pErr as any)?.message);
    }

    // On successful Firebase Auth, push the user to the authenticated dashboard
    loginAsRole(role, fbUser.displayName || fbUser.email || 'Sanatani Devotee');
    showToast("Secure Login Successful", "success");
    onSuccess();
  };

  // Google sign-in state. When set, the email/password register form is
  // skipped — the Google-linked account is used for workspace creation.
  const [googleUser, setGoogleUser] = useState<GoogleAuthResult | null>(null);
  // New Google users choose their path instead of landing on a blank screen.
  const [showGoogleWelcome, setShowGoogleWelcome] = useState<GoogleAuthResult | null>(null);

  /** Google on the LOGIN view: identical finalization to email login. */
  const handleGoogleLogin = async (result: GoogleAuthResult) => {
    clearErrors();
    setLoading(true);
    try {
      const fbUser = auth.currentUser;
      if (!fbUser || fbUser.uid !== result.uid) {
        setError('Google session mismatch — please try again.');
        return;
      }
      if (result.isNewUser) {
        // Brand-new Google user: offer paths instead of stranding them.
        setShowGoogleWelcome(result);
        return;
      }
      await finalizeLogin(fbUser, result.email);
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  /** Google on the SIGNUP view: links Google, then the workspace form completes registration. */
  const handleGoogleSignup = async (result: GoogleAuthResult) => {
    clearErrors();
    setGoogleUser(result);
    setRegData((prev) => ({
      ...prev,
      email: result.email || prev.email,
      adminName: result.displayName && result.displayName !== 'Sanatani Devotee' ? result.displayName : prev.adminName,
    }));
    showToast(`Google linked (${result.email}). Complete the organisation details below.`, 'success');
  };

  const handleGoogleError = (message: string) => {
    setError(message);
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
      setError(t('qr.notLoggedIn'));
      return;
    }

    let snap;
    try {
      snap = await getDoc(doc(db, 'qrPairTokens', payload.token));
    } catch {
      setError(t('qr.offline'));
      return;
    }

    if (!snap.exists()) {
      setError(t('qr.expired'));
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
      setError(t('qr.expired'));
      return;
    }

    try {
      await deleteDoc(snap.ref); // single-use: burn the token before login
    } catch {
      setError(t('qr.offline'));
      return;
    }

    try {
      await signInAnonymously(auth);
    } catch {
      setError(t('qr.offline'));
      return;
    }

    const role = (typeof data.role === 'string' && data.role ? data.role : 'Devotee') as UserRole;
    loginAsRole(role, data.memberName || 'Devotee');
    showToast(t('qr.success'), 'success');
    onSuccess();
  };

  const handleRegister = async (e: React.FormEvent) => {    e.preventDefault();
    clearErrors();
    if (!navigator.onLine) return setError("Internet connection required to create a new workspace.");

    const { commName, type, adminName, email, phone, password, country, state, city, street, currency } = regData;
    // Google-linked signup skips the password (the Google account is the credential).
    if (!commName || !adminName || !email || !phone || (!password && !googleUser)) return setError("Please fill all core required fields.");
    if (!country || !state || !city) return setError("Please complete the Location / Address Picker section.");

    setLoading(true);
    try {
      // 1. Firebase Auth user: Google-linked accounts reuse the linked uid;
      //    otherwise create the email/password user as before.
      let user: any;
      if (googleUser) {
        const current = auth.currentUser;
        if (!current || current.uid !== googleUser.uid) {
          return setError("Google session expired — please tap “Sign up with Google” again.");
        }
        user = current;
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      }

      const newWorkspace: WorkspaceConfig = {
        id: "WS-" + Math.floor(1000 + Math.random() * 9000),
        name: commName,
        type: type,
        // C-6: every real signup starts on the Seva Free (LITE) plan.
        planId: 'LITE',
        // H-11: record the provisioner — the creator is this workspace's
        // administrator, resolved back to Trustee on later logins.
        createdBy: user.uid,
        address: [street, city, state, country].filter(Boolean).join(', '),
        city: city,
        state: state,
        country: country,
        email: email,
        phone: phone,
        currency: currency.code,
        currencySymbol: currency.symbol,
        tagline: '', sampradaya: '', kuladevata: '', pinRequired: true
      };

      // 2. Write User Document (Crucial for RBAC rules)
      // RESOLVED: PHASE 1B - Tenant administrator provisioning completed
      // H-11: identity fields only — the rules forbid clients from writing
      // `role`/`workspaceId` (no self-granted privilege). The creator's
      // Trustee access is resolved via workspaces/{id}.createdBy at login.
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: email,
        phone: phone,
        name: adminName,
        createdAt: serverTimestamp()
      });

      // 3. Write Workspace Document
      // NOTE: no `adminPin` key — the rules deny any workspace doc carrying
      // it (server-managed only). Writing it breaks signup with a
      // "Missing or insufficient permissions" error.
      await setDoc(doc(db, 'workspaces', newWorkspace.id), newWorkspace);

      // 3b. Creator self-provisions as the workspace's first Trustee.
      // Rules path (c): allowed only when workspaces/{id}.createdBy == me
      // and role == 'Trustee'. Without this edge the org-page sync below
      // (trustee-only) and later trustee-gated writes fail for the creator.
      await setDoc(doc(db, 'workspaceMembers', `${newWorkspace.id}_${user.uid}`), {
        workspaceId: newWorkspace.id,
        uid: user.uid,
        role: 'Trustee',
        via: 'creator',
        joinedAt: serverTimestamp(),
      });

      addWorkspace(newWorkspace);
      switchWorkspace(newWorkspace.id);
      loginAsRole('Trustee', adminName);

      // First-run Setup Wizard: mark this fresh workspace as pending setup so
      // the wizard greets the new owner exactly once on first entry.
      try {
        localStorage.setItem('sb_setup_pending', newWorkspace.id);
      } catch {
        /* storage unavailable — wizard simply won't trigger */
      }

      showToast("Workspace Provisioned Successfully", "success");
      // Membership sprint: publish the public organisation page so the
      // org appears in discovery, follows and join requests.
      await syncOrgPage(newWorkspace);
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


  // Per-door card titles (locale-driven).
  const viewMeta: Record<AuthDoorId, { title: string; sub: string }> = {
    LOGIN: { title: t('view_login_title'), sub: t('view_login_sub') },
    SOLO: { title: t('view_solo_title'), sub: t('view_solo_sub') },
    REGISTER: { title: t('view_register_title'), sub: t('view_register_sub') },
    PUROHIT: { title: t('view_purohit_title'), sub: t('view_purohit_sub') },
    JYOTISHI: { title: t('view_jyotishi_title'), sub: t('view_jyotishi_sub') },
  };

  const trustBadges = [
    { icon: <WifiOff size={12} />, text: t('trust_offline') },
    { icon: <ShieldCheck size={12} />, text: t('trust_data') },
    { icon: <Ban size={12} />, text: t('trust_noads') },
  ];

  const darkError = error && (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
        <div className="bg-red-500/15 border border-red-400/30 text-red-200 p-3.5 rounded-2xl text-[12.5px] font-bold text-center shadow-sm flex items-center justify-center gap-2">
          <AlertTriangle size={14} className="shrink-0" /> {error}
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className="auth-scene relative min-h-screen font-sans overflow-x-hidden bg-[#0b0620] text-white">
      {/* ============ IMMERSIVE DAWN SCENE ============ */}
      <div className="fixed inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[linear-gradient(168deg,#08041a_0%,#170d38_30%,#3c1756_50%,#8f3413_70%,#e07f16_88%,#f7b733_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-[radial-gradient(85%_65%_at_50%_112%,rgba(255,190,80,0.55),rgba(255,130,30,0.14)_55%,transparent_78%)]" />
        <div className="auth-rays absolute -inset-[25%] bg-[conic-gradient(from_205deg_at_50%_118%,transparent_0deg,rgba(255,205,120,0.10)_7deg,transparent_15deg,rgba(255,205,120,0.07)_24deg,transparent_33deg,rgba(255,205,120,0.10)_44deg,transparent_52deg)]" />
        <div
          className="auth-grain absolute inset-0 opacity-[0.055]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'140\' height=\'140\' viewBox=\'0 0 140 140\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'2\'/%3E%3C/filter%3E%3Crect width=\'140\' height=\'140\' filter=\'url(%23n)\' opacity=\'1\'/%3E%3C/svg%3E")' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(115%_85%_at_50%_38%,transparent_52%,rgba(4,2,14,0.6)_100%)]" />
      </div>

      {/* ============ GLOBAL TOAST ============ */}
      <AnimatePresence>
        {toast && createPortal(
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[10000] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-xl ${toast.type === 'error' ? 'bg-red-950/90 border-red-500/40' : toast.type === 'offline' ? 'bg-amber-950/90 border-amber-500/40' : 'bg-emerald-950/90 border-emerald-500/40'} text-white`}
          >
             <div className={`p-2 rounded-full shrink-0 ${toast.type === 'offline' ? 'bg-saffron-500/20 text-saffron-400' : toast.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
               {toast.type === 'offline' ? <WifiOff size={20}/> : toast.type === 'error' ? <AlertTriangle size={20}/> : <CheckCircle2 size={20}/>}
             </div>
             <div>
               <p className={`text-[11px] font-black uppercase tracking-widest mb-0.5 ${toast.type === 'offline' ? 'text-saffron-400' : toast.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                 {toast.type === 'offline' ? 'Offline Cache' : toast.type === 'error' ? 'Error' : 'Success'}
               </p>
               <p className="text-sm font-bold">{toast.message}</p>
             </div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>

      {/* ============ OFFLINE BANNER ============ */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 inset-x-0 z-[110] bg-red-600/95 backdrop-blur text-white p-2 text-center flex items-center justify-center gap-2 shadow-lg"
          >
            <WifiOff size={14} />
            <span className="text-[13px] font-bold">Offline Mode: Cached Login Active</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* ============ TOP BAR ============ */}
        <header className="auth-rise w-full max-w-7xl mx-auto flex items-center justify-between px-5 sm:px-8 pt-5" style={{ ['--d' as any]: '0s' }}>
          <button
            onClick={onBack}
            className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] backdrop-blur-md px-4 py-2 text-[13px] font-bold text-white/80 hover:text-white hover:border-white/30 hover:bg-white/[0.10] transition-all min-h-[40px]"
          >
            <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
            {t('back')}
          </button>
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] backdrop-blur-md pl-3 pr-2 py-1.5">
            <Languages size={14} className="text-saffron-300" />
            <select
              value={language}
              onChange={(e) => changeLanguage(e.target.value as any)}
              aria-label="Language"
              className="bg-transparent text-[12.5px] font-bold text-white/85 outline-none cursor-pointer appearance-none pr-1 [&>option]:text-temple-900"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
              <option value="bn">বাংলা</option>
            </select>
          </div>
        </header>

        {/* ============ SCENE GRID ============ */}
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 grid gap-6 lg:gap-10 lg:grid-cols-[1.04fr_0.96fr] items-stretch">
          {/* Mobile compact art band */}
          <AuthArt lang={authLang} compact className="auth-rise lg:hidden rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-md shadow-[0_18px_50px_rgba(0,0,0,0.4)]" />

          {/* Desktop ambient art panel (mouse parallax) */}
          <div ref={artWrapRef} onMouseMove={handleParallax} className="hidden lg:block">
            <AuthArt
              lang={authLang}
              className="auth-rise flex h-full min-h-[76vh] rounded-[2rem] border border-white/10 bg-black/20 backdrop-blur-sm shadow-[0_30px_90px_rgba(0,0,0,0.5)]"
            />
          </div>

          {/* ============ GLASS AUTH CARD ============ */}
          <main className="auth-rise w-full flex" style={{ ['--d' as any]: '0.28s' }}>
            <div className="auth-glass relative w-full rounded-[1.75rem] p-5 sm:p-8 flex flex-col overflow-hidden my-auto">
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-saffron-300/70 to-transparent" />

              {/* Card header */}
              <div className="flex items-center gap-3.5 mb-6">
                <div className="auth-float shrink-0 drop-shadow-[0_0_18px_rgba(255,142,0,0.45)]">
                  <AppLogo size="md" showText={false} textVariant="light" glow />
                </div>
                <div className="min-w-0">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeView}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                    >
                      <h2 className="text-[22px] sm:text-2xl font-black text-white tracking-tight leading-tight">{viewMeta[activeView].title}</h2>
                      <p className="text-[12.5px] text-white/55 font-medium mt-0.5 truncate">{viewMeta[activeView].sub}</p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Five doors — sliding segmented control */}
              <AuthDoors
                active={activeView}
                onChange={(d) => { setActiveView(d); clearErrors(); }}
                labels={{
                  LOGIN: t('door_login'),
                  SOLO: t('door_solo'),
                  REGISTER: t('door_signup'),
                  PUROHIT: t('door_purohit'),
                  JYOTISHI: t('door_jyotishi'),
                }}
                hints={{
                  LOGIN: t('hint_login'),
                  SOLO: t('hint_solo'),
                  REGISTER: t('hint_signup'),
                  PUROHIT: t('hint_purohit'),
                  JYOTISHI: t('hint_jyotishi'),
                }}
              />

              {/* Tab content */}
              <div className="flex-1 relative mt-6">
                {/* FULLSCREEN BIOMETRIC OVERLAY */}
                <AnimatePresence>
                {isBiometricPromptActive && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="absolute inset-0 bg-[#120826]/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center rounded-[1.75rem] p-6 shadow-2xl border border-white/15"
                  >
                     <button onClick={() => setIsBiometricPromptActive(false)} className="absolute top-4 right-4 bg-white/10 text-white p-2 rounded-full hover:bg-red-500 transition-colors z-50" aria-label="Close">
                       <X size={24}/>
                     </button>
                     <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center relative mb-6">
                       <div className="absolute inset-0 border-[3px] border-emerald-500/30 rounded-full animate-ping"></div>
                       <div className="absolute inset-2 border-[2px] border-emerald-500/50 rounded-full animate-pulse"></div>
                       <Fingerprint size={48} className="text-emerald-400 relative z-10" />
                     </div>
                     <h3 className="text-white text-lg font-black uppercase tracking-widest mb-2 text-center">Touch Sensor</h3>
                     <p className="text-white/50 text-xs font-bold text-center leading-relaxed">
                       Waiting for device biometric verification.<br/>Use Touch ID, Face ID, or your device PIN.
                     </p>
                     <button onClick={() => setIsBiometricPromptActive(false)} className="mt-8 text-white/50 text-sm font-medium hover:text-white transition-colors border-b border-white/20 pb-1">
                       Use Manual Password Instead
                     </button>
                  </motion.div>
                )}
                </AnimatePresence>

                {/* FULLSCREEN QR SCANNER OVERLAY */}
                <AnimatePresence>
                {isScanning && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="absolute inset-0 bg-[#120826]/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center rounded-[1.75rem] p-4 shadow-2xl border border-white/15"
                  >
                     <button onClick={stopScanner} className="absolute top-4 right-4 bg-white/10 text-white p-2 rounded-full hover:bg-red-500 transition-colors z-50" aria-label="Close scanner">
                       <X size={24}/>
                     </button>
                     <h3 className="text-white font-black uppercase tracking-widest mb-4 flex items-center gap-2"><QrCode/> Scan Official ID</h3>
                     <div className="relative w-64 h-64 rounded-3xl overflow-hidden border-4 border-saffron-500 shadow-[0_0_50px_rgba(245,158,11,0.3)]">
                        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="absolute inset-0 border-[3px] border-white/30 m-8 rounded-xl pointer-events-none"></div>
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-saffron-500/50 shadow-[0_0_8px_#f59e0b] animate-pulse"></div>
                     </div>
                     <p className="text-white/50 text-xs mt-6 font-bold text-center">Align QR code within the frame</p>
                  </motion.div>
                )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {showGoogleWelcome ? (
                    <motion.div
                      key="google-welcome"
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.32 }}
                      className="rounded-2xl bg-[#f7f4ef]/95 p-4 sm:p-6 text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white text-2xl font-black mx-auto shadow-lg">
                        {(showGoogleWelcome.displayName || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div className="mt-3">
                        <h3 className="text-xl font-black text-temple-900">
                          Namaste{showGoogleWelcome.displayName && showGoogleWelcome.displayName !== 'Sanatani Devotee' ? `, ${showGoogleWelcome.displayName.split(' ')[0]}` : ''}! 🙏
                        </h3>
                        <p className="text-sm text-temple-500 mt-1">Your Google account is linked. What would you like to do first?</p>
                      </div>
                      <div className="space-y-3 pt-4 text-left">
                        <button
                          onClick={() => { setShowGoogleWelcome(null); setActiveView('SOLO'); }}
                          className="w-full flex items-center gap-3 p-4 bg-white border-2 border-amber-400 hover:border-amber-600 rounded-2xl text-left transition-all shadow-sm hover:shadow-md min-h-[44px]"
                        >
                          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 text-xl">🙏</div>
                          <div>
                            <p className="text-sm font-black text-temple-900">Solo Sanatani <span className="text-[10px] font-bold text-amber-600 bg-amber-100 rounded-full px-2 py-0.5 ml-1">RECOMMENDED</span></p>
                            <p className="text-xs text-temple-500">Your personal Sanatani home — no organisation needed.</p>
                          </div>
                        </button>
                        <button
                          onClick={() => { setShowGoogleWelcome(null); setActiveView('REGISTER'); }}
                          className="w-full flex items-center gap-3 p-4 bg-white border-2 border-temple-200 hover:border-amber-500 rounded-2xl text-left transition-all shadow-sm hover:shadow-md min-h-[44px]"
                        >
                          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0"><Building2 size={20} /></div>
                          <div>
                            <p className="text-sm font-black text-temple-900">Create an Organisation</p>
                            <p className="text-xs text-temple-500">Mandir, sangha, ashram, gurukul, trust…</p>
                          </div>
                        </button>
                        <button
                          onClick={() => { setShowGoogleWelcome(null); setActiveView('PUROHIT'); }}
                          className="w-full flex items-center gap-3 p-4 bg-white border-2 border-temple-200 hover:border-amber-500 rounded-2xl text-left transition-all shadow-sm hover:shadow-md min-h-[44px]"
                        >
                          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 text-xl">🪔</div>
                          <div>
                            <p className="text-sm font-black text-temple-900">Join as Purohit</p>
                            <p className="text-xs text-temple-500">Offer ritual services, get verified.</p>
                          </div>
                        </button>
                        <button
                          onClick={async () => {
                            const r = showGoogleWelcome;
                            setShowGoogleWelcome(null);
                            setLoading(true);
                            try {
                              const fbUser = auth.currentUser;
                              if (fbUser) await finalizeLogin(fbUser, r.email);
                            } finally {
                              setLoading(false);
                            }
                          }}
                          className="w-full flex items-center gap-3 p-4 bg-white border-2 border-temple-200 hover:border-amber-500 rounded-2xl text-left transition-all shadow-sm hover:shadow-md min-h-[44px]"
                        >
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><User size={20} /></div>
                          <div>
                            <p className="text-sm font-black text-temple-900">Continue as Devotee</p>
                            <p className="text-xs text-temple-500">Explore, follow organisations, join later.</p>
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  ) : activeView === 'LOGIN' ? (
                    <motion.form
                      key="login"
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.32, ease: 'easeOut' }}
                      onSubmit={handleSmartLogin as any}
                      className={`space-y-4 ${isScanning ? 'opacity-0' : 'opacity-100'}`}
                    >
                      <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                        <ShieldCheck size={16} className="text-emerald-300 shrink-0" />
                        <p className="text-[11.5px] font-bold text-white/60 tracking-wide">Secure login for Admins, Members &amp; Purohits</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <button type="button" onClick={startScanner} className="group rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.11] hover:border-white/25 px-3.5 py-3 flex items-center gap-3 text-left transition-all hover:-translate-y-0.5 min-h-[44px]">
                           <span className="p-2.5 rounded-xl bg-saffron-500/20 text-saffron-300 group-hover:scale-110 transition-transform shrink-0"><QrCode size={19}/></span>
                           <span className="min-w-0">
                             <span className="block text-[13px] font-bold text-white leading-tight">Scan Pass</span>
                             <span className="block text-[10.5px] text-white/45 font-medium">QR login</span>
                           </span>
                         </button>
                         <button type="button" onClick={handleBiometricLogin} className="group rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.11] hover:border-white/25 px-3.5 py-3 flex items-center gap-3 text-left transition-all hover:-translate-y-0.5 min-h-[44px]">
                           <span className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 group-hover:scale-110 transition-transform shrink-0"><Fingerprint size={19}/></span>
                           <span className="min-w-0">
                             <span className="block text-[13px] font-bold text-white leading-tight">Re-confirm</span>
                             <span className="block text-[10.5px] text-white/45 font-medium">Biometric</span>
                           </span>
                         </button>
                      </div>

                      {/* Google sign-in — one tap for non-technical users. */}
                      <GoogleSignInButton mode="login" onSuccess={handleGoogleLogin} onError={handleGoogleError} />

                      <div className="flex items-center gap-4 py-1 opacity-70">
                         <div className="h-px bg-white/15 flex-1"></div>
                         <span className="text-[10.5px] font-black tracking-[0.22em] text-white/45">OR USE CREDENTIALS</span>
                         <div className="h-px bg-white/15 flex-1"></div>
                      </div>

                      <AuthField
                        label={t('login_identity')}
                        icon={<User size={17} />}
                        type="text" required
                        value={loginIdentity}
                        onChange={e => setLoginIdentity(e.target.value)}
                        autoComplete="username"
                      />
                      <div>
                        <AuthField
                          label={t('login_pass')}
                          icon={<Key size={17} />}
                          type={showLoginPassword ? 'text' : 'password'} required
                          value={loginCredential}
                          onChange={e => setLoginCredential(e.target.value)}
                          autoComplete="current-password"
                          rightSlot={
                            <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} aria-label="Toggle password visibility" className="p-1">
                              {showLoginPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                          }
                        />
                        <div className="flex justify-end mt-2">
                          <button type="button" onClick={handleForgotPassword} className="text-[12.5px] font-bold text-saffron-300/90 hover:text-saffron-200 transition-colors">
                            {t('login_forgot')}
                          </button>
                        </div>
                      </div>

                      {/* PROMINENT BIOMETRIC AUTHENTICATION BUTTON */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleBiometricLogin}
                          onMouseMove={magneticGlow}
                          className="auth-cta group relative w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-[13.5px] tracking-wide transition-all shadow-[0_10px_30px_rgba(16,185,129,0.35)] hover:shadow-[0_14px_40px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2.5 border border-emerald-300/30 min-h-[52px]"
                        >
                          <span className="auth-cta-shimmer" />
                          <span className="relative flex items-center justify-center">
                            <Fingerprint className="w-5 h-5 text-emerald-100 group-hover:scale-110 transition-transform" />
                            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200"></span>
                            </span>
                          </span>
                          <span className="relative">Re-confirm Session with FaceID / TouchID</span>
                        </button>
                        <p className="text-[10.5px] text-center text-white/40 mt-2 font-medium leading-relaxed px-2">
                          Device-unlock grade: re-confirms your existing signed-in session on this device.
                          It cannot sign you in or grant access by itself — sign in with your credentials first.
                        </p>
                      </div>

                      {darkError}

                      <button
                        type="submit"
                        disabled={loading}
                        onMouseMove={magneticGlow}
                        data-loading={loading}
                        className="auth-cta w-full py-4 rounded-2xl bg-gradient-to-r from-saffron-500 via-amber-500 to-orange-500 hover:from-saffron-400 hover:via-amber-400 hover:to-orange-400 text-[#2a1503] font-black text-[15px] tracking-wide shadow-[0_12px_36px_rgba(255,142,0,0.45)] hover:shadow-[0_16px_44px_rgba(255,142,0,0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:hover:translate-y-0 flex justify-center items-center gap-2 min-h-[56px]"
                      >
                        <span className="auth-cta-shimmer" />
                        <span className="relative flex items-center gap-2">
                          {loading ? <Loader2 size={19} className="animate-spin" /> : t('btn_access_portal')}
                        </span>
                      </button>
                    </motion.form>
                  ) : activeView === 'REGISTER' ? (
                    <motion.form
                      key="register"
                      initial={{ opacity: 0, x: -24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 24 }}
                      transition={{ duration: 0.32, ease: 'easeOut' }}
                      onSubmit={handleRegister}
                      className="space-y-4 max-h-[62vh] overflow-y-auto pr-1.5 custom-scrollbar"
                    >
                      {/* Google-linked signup: link first, then complete the form — no password needed. */}
                      {!googleUser ? (
                        <GoogleSignInButton mode="signup" onSuccess={handleGoogleSignup} onError={handleGoogleError} />
                      ) : (
                        <div className="bg-emerald-500/15 border border-emerald-400/30 p-3.5 rounded-2xl flex items-center gap-3">
                          <CheckCircle2 size={18} className="text-emerald-300 shrink-0" />
                          <p className="text-[12px] font-bold text-emerald-200">
                            Google linked ({googleUser.email}) — no password needed. Complete the organisation details below.
                          </p>
                        </div>
                      )}

                      <div className="bg-amber-500/10 border border-amber-400/25 p-4 rounded-2xl flex items-start gap-3">
                        <AlertTriangle className="text-amber-300 shrink-0 mt-0.5" size={20} />
                        <div>
                          <h4 className="text-white font-bold text-[13.5px] mb-1">{t('reg_warning_title')}</h4>
                          <p className="text-[12.5px] text-white/60">
                            {t('reg_warning_desc_1')}<strong className="font-bold text-amber-200">{regData.type}</strong>{t('reg_warning_desc_2')}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-white/10">
                        <h4 className="text-[11px] font-black text-white/45 uppercase tracking-[0.18em] flex items-center gap-2"><Building2 size={14}/> {t('reg_step1')}</h4>

                        <div>
                          <label className="block text-[10px] font-black text-saffron-300/90 uppercase tracking-[0.15em] mb-1.5">{t('reg_org_type')}</label>
                          <select value={regData.type} onChange={e=>setRegData({...regData, type: e.target.value as WorkspaceType})} className="w-full px-4 py-3.5 bg-white/[0.07] border border-white/15 rounded-2xl text-[14px] font-semibold text-white outline-none focus:border-saffron-400/70 focus:bg-white/[0.10] transition-colors cursor-pointer appearance-none [&>option]:text-temple-900">
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

                        <AuthField
                          label={`${t('reg_org_name')} *`}
                          type="text" required
                          value={regData.commName}
                          onChange={e=>setRegData({...regData, commName: e.target.value})}
                          autoComplete="organization"
                        />

                        <div className="space-y-4 pt-4 border-t border-white/10">
                           <div className="flex items-center gap-2 text-[11px] font-black text-white/45 uppercase tracking-[0.18em]">
                             <MapPin size={14}/> Location Details
                           </div>
                           <div>
                             <label className="block text-[10px] font-black text-saffron-300/90 uppercase tracking-[0.15em] mb-1.5">Country *</label>
                             <div className="relative">
                               <Globe2 size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                               <select required value={regData.country} onChange={handleCountryChange} className="w-full pl-11 pr-4 py-3.5 bg-white/[0.07] border border-white/15 rounded-2xl text-[14px] font-semibold text-white outline-none focus:border-saffron-400/70 focus:bg-white/[0.10] transition-colors cursor-pointer appearance-none [&>option]:text-temple-900">
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
                             <AuthField label="State / Division *" type="text" required value={regData.state} onChange={e=>setRegData({...regData, state: e.target.value})} autoComplete="address-level1" />
                             <AuthField label="City / District *" type="text" required value={regData.city} onChange={e=>setRegData({...regData, city: e.target.value})} autoComplete="address-level2" />
                           </div>
                        </div>

                        <AuthField
                          label={t('reg_desc')}
                          icon={<AlignLeft size={16} />}
                          multiline rows={2}
                          value={regData.description}
                          onChange={e=>setRegData({...regData, description: e.target.value})}
                        />
                      </div>

                      <div className="space-y-4 pt-4 border-t border-white/10">
                        <h4 className="text-[11px] font-black text-white/45 uppercase tracking-[0.18em] flex items-center gap-2"><User size={14}/> {t('reg_step2')}</h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <AuthField label={t('reg_your_name')} type="text" required value={regData.adminName} onChange={e=>setRegData({...regData, adminName: e.target.value})} autoComplete="name" />
                          <AuthField label={t('reg_your_phone')} icon={<Phone size={16} />} type="tel" required value={regData.phone} onChange={e=>setRegData({...regData, phone: e.target.value})} autoComplete="tel" />
                        </div>

                        <AuthField
                          label={t('reg_official_email')}
                          icon={<Mail size={17} />}
                          type="email" required
                          value={regData.email}
                          onChange={e=>setRegData({...regData, email: e.target.value})}
                          autoComplete="email"
                        />

                        {!googleUser && (
                          <AuthField
                            label={`${t('login_pass')} *`}
                            icon={<Lock size={17} />}
                            type={showRegPassword ? 'text' : 'password'} required
                            value={regData.password}
                            onChange={e=>setRegData({...regData, password: e.target.value})}
                            autoComplete="new-password"
                            rightSlot={
                              <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} aria-label="Toggle password visibility" className="p-1">
                                {showRegPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                              </button>
                            }
                          />
                        )}
                      </div>

                      {darkError}

                      <button
                        type="submit"
                        disabled={loading}
                        onMouseMove={magneticGlow}
                        data-loading={loading}
                        className="auth-cta w-full py-4 rounded-2xl bg-gradient-to-r from-saffron-500 via-amber-500 to-orange-500 hover:from-saffron-400 hover:via-amber-400 hover:to-orange-400 text-[#2a1503] font-black text-[15px] tracking-wide shadow-[0_12px_36px_rgba(255,142,0,0.45)] hover:shadow-[0_16px_44px_rgba(255,142,0,0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:hover:translate-y-0 flex justify-center items-center gap-2 min-h-[56px]"
                      >
                        <span className="auth-cta-shimmer" />
                        <span className="relative flex items-center gap-2">
                          {loading ? <Loader2 size={19} className="animate-spin" /> : t('btn_create_dynamic').replace('{X}', regData.type.toUpperCase())}
                        </span>
                      </button>
                    </motion.form>
                  ) : (
                    /* SOLO / PUROHIT / JYOTISHI keep their verified light-theme
                       forms; the paper sheet preserves them pixel-identically. */
                    <motion.div
                      key={'door-' + activeView}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.32, ease: 'easeOut' }}
                      className="rounded-2xl bg-[#f7f4ef]/95 p-4 sm:p-6 shadow-[inset_0_2px_14px_rgba(0,0,0,0.07)]"
                    >
                      {activeView === 'SOLO' ? (
                        <SoloSignupForm />
                      ) : activeView === 'JYOTISHI' ? (
                        <JyotishSignupForm />
                      ) : (
                        <PurohitSignupForm />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ============ TRUST STRIP ============ */}
              <div className="mt-7 pt-5 border-t border-white/10 flex items-center justify-center gap-2 flex-wrap">
                {trustBadges.map((b) => (
                  <span key={b.text} className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[10.5px] font-bold text-white/60">
                    <span className="text-saffron-300/90">{b.icon}</span>
                    {b.text}
                  </span>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Hardware Biometric WebAuthn Modal */}
      <BiometricPromptModal />
    </div>
  );
};
