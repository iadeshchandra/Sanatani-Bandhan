import React, { useState, useEffect, useRef, useContext } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Loader2, ShieldCheck, Building2, User, Key, Mail, Phone,
  Lock, ArrowLeft, Eye, EyeOff, AlertTriangle, MapPin, AlignLeft,
  Globe2, Navigation, QrCode, X, WifiOff, CheckCircle2, Flame, Fingerprint, Ban
} from 'lucide-react';
import jsQR from 'jsqr';
import AppLogo from '../common/AppLogo';
import './auth-animations.css';
import { AuthArt, type AuthLang } from './AuthArt';
import { PublicLanguageButton } from './PublicLanguageButton';
import { AuthField } from './AuthField';
import { AuthDoors, type AuthDoorId } from './AuthDoors';
import { SignupCredentialsStep, type SignupCreds } from './SignupCredentialsStep';
import {
  firstNonBlank,
  orgRegistrationErrorSummary,
  orgRegistrationFieldErrorMap,
  validateOrgRegistration,
  type OrgRegistrationField,
} from './orgRegistration';
import { LanguageContext } from '../../context/LanguageContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { SuspendedNotice } from '../auth/SuspendedNotice';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import { WorkspaceConfig, WorkspaceType, ROLE_MIGRATION_MAP } from '../../types';
import { smartDefaultModulesFor } from '../../lib/workspaceRegistry';
import { resolveSigninDestination } from '../../lib/signinRouting';
import { friendlyAuthErrorKey } from '../../lib/friendlyAuthError';
import { mintOrFetchSanataniProfile } from '../../solo/soloSession';
import { sendPasswordResetEmail, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { auth, db } from '../../services/firebaseClient';
import { doc, setDoc, getDoc, getDocs, deleteDoc, serverTimestamp, query, where, collection, limit } from 'firebase/firestore';
import type { UserRole } from '../../types';
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
    btn_access_portal: 'Enter My Space',
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
    door_signin: 'Sign In',
    door_purohit: 'Purohit',
    door_jyotishi: 'Jyotishi',
    hint_login: 'Sign in to your account',
    hint_signin: 'Sign in to your account',
    hint_solo: 'Your personal Sanatani home — no organisation needed',
    hint_signup: 'Create your account — your personal Sanatani home',
    hint_purohit: 'Register as a purohit — earn a PUR-XXXXXX identity',
    hint_jyotishi: 'Register as a jyotishi — earn a JYO-XXXXXX identity',
    view_login_title: 'Welcome back',
    view_login_sub: 'Sign in to your Sanatani identity',
    view_signin_title: 'Welcome back',
    view_signin_sub: 'Sign in to your Sanatani identity',
    view_signup_title: 'Create your account',
    view_signup_sub: 'Your personal Sanatani home — upgrade anytime',
    /* Unified signup — Step 1: credentials first */
    cred_title: 'Create your account',
    cred_sub: 'One account for everything — your personal space is created automatically.',
    cred_or_email: 'OR USE EMAIL',
    cred_name: 'Your name',
    cred_name_ph: 'e.g. Adesh Chandra',
    cred_email: 'Email',
    cred_email_ph: 'you@example.com',
    cred_password: 'Password',
    cred_password_ph: 'Min 6 characters',
    cred_continue: 'Continue',
    cred_creating: 'Creating your account…',
    cred_secure_note: 'Your identity is protected',
    solo_minting: 'Creating your Sanatani ID…',
    cred_name_required: 'Please enter your name.',
    cred_password_min: 'Password must be at least 6 characters.',
    cred_email_in_use: 'This email is already registered. Try signing in instead.',
    cred_failed: 'Account creation failed. Please try again.',
    cred_google_expired: 'Google session expired — please tap the Google button again.',
    /* Unified signup — Step 2: role question after auth */
    reg_unified_note: 'Signed in as {name} — just add your contact number below.',
    view_register_title: 'Create workspace',
    view_register_sub: 'Bring your institution onto Sanatani Bandhan',
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
    btn_access_portal: 'मेरा स्थान खोलें',
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
    door_signin: 'साइन इन',
    door_purohit: 'पुरोहित',
    door_jyotishi: 'ज्योतिषी',
    hint_login: 'अपने खाते में साइन इन करें',
    hint_signin: 'अपने खाते में साइन इन करें',
    hint_solo: 'आपका व्यक्तिगत सनातनी घर — किसी संगठन की आवश्यकता नहीं',
    hint_signup: 'अपना खाता बनाएं — आपका व्यक्तिगत सनातनी घर',
    hint_purohit: 'पुरोहित के रूप में पंजीकरण करें — PUR-XXXXXX पहचान पाएं',
    hint_jyotishi: 'ज्योतिषी के रूप में पंजीकरण करें — JYO-XXXXXX पहचान पाएं',
    view_login_title: 'फिर से स्वागत है',
    view_login_sub: 'अपनी सनातनी पहचान में साइन इन करें',
    view_signin_title: 'फिर से स्वागत है',
    view_signin_sub: 'अपनी सनातनी पहचान में साइन इन करें',
    view_signup_title: 'अपना खाता बनाएं',
    view_signup_sub: 'आपका व्यक्तिगत सनातनी घर — कभी भी अपग्रेड करें',
    cred_title: 'अपना खाता बनाएं',
    cred_sub: 'सब कुछ के लिए एक खाता — आपका व्यक्तिगत स्थान स्वतः बन जाएगा।',
    cred_or_email: 'या ईमेल से',
    cred_name: 'आपका नाम',
    cred_name_ph: 'जैसे आदेश चंद्र',
    cred_email: 'ईमेल',
    cred_email_ph: 'you@example.com',
    cred_password: 'पासवर्ड',
    cred_password_ph: 'कम से कम 6 अक्षर',
    cred_continue: 'आगे बढ़ें',
    cred_creating: 'आपका खाता बनाया जा रहा है…',
    cred_secure_note: 'आपकी पहचान सुरक्षित है',
    solo_minting: 'आपकी सनातनी आईडी बनाई जा रही है…',
    cred_name_required: 'कृपया अपना नाम दर्ज करें।',
    cred_password_min: 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।',
    cred_email_in_use: 'यह ईमेल पहले से पंजीकृत है। साइन इन करने का प्रयास करें।',
    cred_failed: 'खाता निर्माण विफल। कृपया पुनः प्रयास करें।',
    cred_google_expired: 'Google सत्र समाप्त — कृपया Google बटन फिर से दबाएं।',
    reg_unified_note: '{name} के रूप में साइन इन — नीचे सिर्फ अपना संपर्क नंबर जोड़ें।',
    view_register_title: 'कार्यक्षेत्र बनाएं',
    view_register_sub: 'अपनी संस्था को सनातनी बंधन से जोड़ें',
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
    btn_access_portal: 'আমার স্থানে প্রবেশ করুন',
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
    door_signin: 'সাইন ইন',
    door_purohit: 'পুরোহিত',
    door_jyotishi: 'জ্যোতিষী',
    hint_login: 'আপনার অ্যাকাউন্টে সাইন ইন করুন',
    hint_signin: 'আপনার অ্যাকাউন্টে সাইন ইন করুন',
    hint_solo: 'আপনার ব্যক্তিগত সনাতনী ঘর — কোনো সংস্থার প্রয়োজন নেই',
    hint_signup: 'আপনার অ্যাকাউন্ট তৈরি করুন — আপনার ব্যক্তিগত সনাতনী ঘর',
    hint_purohit: 'পুরোহিত হিসেবে নিবন্ধন করুন — PUR-XXXXXX পরিচয় পান',
    hint_jyotishi: 'জ্যোতিষী হিসেবে নিবন্ধন করুন — JYO-XXXXXX পরিচয় পান',
    view_login_title: 'আবার স্বাগতম',
    view_login_sub: 'আপনার সনাতনী পরিচয়ে সাইন ইন করুন',
    view_signin_title: 'আবার স্বাগতম',
    view_signin_sub: 'আপনার সনাতনী পরিচয়ে সাইন ইন করুন',
    view_signup_title: 'আপনার অ্যাকাউন্ট তৈরি করুন',
    view_signup_sub: 'আপনার ব্যক্তিগত সনাতনী ঘর — যেকোনো সময় আপগ্রেড করুন',
    cred_title: 'আপনার অ্যাকাউন্ট তৈরি করুন',
    cred_sub: 'সবকিছুর জন্য একটি অ্যাকাউন্ট — আপনার ব্যক্তিগত স্থান স্বয়ংক্রিয়ভাবে তৈরি হবে।',
    cred_or_email: 'অথবা ইমেল দিয়ে',
    cred_name: 'আপনার নাম',
    cred_name_ph: 'যেমন আদেশ চন্দ্র',
    cred_email: 'ইমেল',
    cred_email_ph: 'you@example.com',
    cred_password: 'পাসওয়ার্ড',
    cred_password_ph: 'কমপক্ষে ৬ অক্ষর',
    cred_continue: 'এগিয়ে যান',
    cred_creating: 'আপনার অ্যাকাউন্ট তৈরি হচ্ছে…',
    cred_secure_note: 'আপনার পরিচয় সুরক্ষিত',
    solo_minting: 'আপনার সনাতনী আইডি তৈরি হচ্ছে…',
    cred_name_required: 'অনুগ্রহ করে আপনার নাম লিখুন।',
    cred_password_min: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।',
    cred_email_in_use: 'এই ইমেল ইতিমধ্যে নিবন্ধিত। সাইন ইন করার চেষ্টা করুন।',
    cred_failed: 'অ্যাকাউন্ট তৈরি ব্যর্থ। অনুগ্রহ করে আবার চেষ্টা করুন।',
    cred_google_expired: 'Google সেশন শেষ — অনুগ্রহ করে Google বোতাম আবার চাপুন।',
    reg_unified_note: '{name} হিসেবে সাইন ইন — নিচে শুধু আপনার যোগাযোগ নম্বর যোগ করুন।',
    view_register_title: 'ওয়ার্কস্পেস তৈরি করুন',
    view_register_sub: 'আপনার প্রতিষ্ঠানকে সনাতনী বন্ধনে আনুন',
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
  /**
   * Solo-first progressive flow: renders ONLY the organisation-registration
   * form for an already-authenticated user (the "Register an Organisation"
   * upgrade card in the Solo dashboard links here). No doors, no chooser.
   */
  orgRegisterOnly?: boolean;
}

export const PortalLogin: React.FC<PortalLoginProps> = ({ initialMode = 'login', onBack, onSuccess, orgRegisterOnly = false }) => {
  const { loginAsRole, switchWorkspace, activateCreatedWorkspace, loginWithPin, workspaces, activeWorkspace, enterPurohitSession, enterJyotishSession, enterSoloSession, exitSoloSession, exitPurohitSession, exitJyotishSession, sessionKind, firebaseUser, soloProfile, currentDevotee, accountSuspended, clearSuspensionNotice } = useAuthWorkspace();
  const { promptBiometric, BiometricPromptModal } = useBiometricAuth();
  // Locale follows the app-wide LanguageContext (English default). The
  // header's canonical PublicLanguageButton writes the global locale;
  // the clamped local copy below serves this file's un-migrated dict.
  const langCtx = useContext(LanguageContext);
  const [language, setLanguage] = useState<'en'|'hi'|'bn'>(() => {
    const c = langCtx?.currentLang;
    return c === 'hi' || c === 'bn' ? c : 'en';
  });
  const t = (key: string) => (translations as any)[language][key] || key;
  // Language Completion Sweep B2: global dictionary for the surfaces wired
  // out of this file's local dict (auth/surfaces.portalLogin keys). Local `t`
  // above keeps serving the still-local keys.
  const gt = (key: string) => langCtx?.t(key) ?? key;
  // (B4: the local changeLanguage helper died with the private <select>;
  // the canonical door writes the global locale and the effect below
  // keeps this page's clamped local copy in step.)
  // Sync when the global locale changes elsewhere (e.g. the
  // NativeWelcomeSheet): the local copy above is only the mount value.
  useEffect(() => {
    const c = langCtx?.currentLang;
    if (c === 'hi' || c === 'bn') setLanguage(c);
    else if (c) setLanguage('en');
  }, [langCtx?.currentLang]);
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

  const [activeView, setActiveView] = useState<AuthDoorId>(initialMode === 'signup' ? 'SIGNUP' : 'SIGNIN');
  // Solo-first progressive flow: Sign Up = credentials ONLY. There is no
  // role/path choice — every new account becomes a Solo Sanatani by default
  // and lands in the personal dashboard. Upgrades (organisation, purohit,
  // jyotishi) are discovered later from the "Grow with Sanatani Bandhan"
  // section inside the Solo dashboard.
  const [signupCreds, setSignupCreds] = useState<SignupCreds | null>(null);
  // True while the fresh Solo identity (SAN-XXXXXX) is minted after
  // credentials complete.
  const [signupMinting, setSignupMinting] = useState(false);
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

  // QUEUED #41: per-field registration errors (field → message), rendered
  // under each input by AuthField's error prop + summed in the banner.
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<OrgRegistrationField, string>>>({});
  const clearFieldError = (field: OrgRegistrationField) =>
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  // Session identity as the register-org form sees it (orgRegisterOnly):
  // the admin name/email are taken from the live session, and the name
  // may live ONLY in the app's own profile sources — the Firebase Auth
  // profile is just one source (see orgRegistration.ts, QUEUED #41).
  // When the session cannot supply one of them, the form renders that
  // field so the user can type it — the dead-end cannot recur.
  const sessionDisplayName = orgRegisterOnly
    ? firstNonBlank([(firebaseUser as any)?.displayName, soloProfile?.displayName, currentDevotee?.fullName])
    : '';
  const sessionEmail = orgRegisterOnly
    ? firstNonBlank([(firebaseUser as any)?.email, soloProfile?.email, currentDevotee?.email])
    : '';

  // H-11: is this Firebase user the recorded creator of the workspace being
  // entered? Checked against the local workspace registry (populated at
  // registration with `createdBy`). A user can only ever be the creator of
  // workspaces they provisioned themselves — never someone else's.
  const isWorkspaceCreator = (uid: string): boolean => {
    if (!uid) return false;
    const ws = workspaces?.find((w) => w.id === activeWorkspace?.id) || activeWorkspace;
    return !!ws && (ws as any).createdBy === uid;
  };
  
  // World-Readiness B4 (G-E2): EVERY auth failure renders through the one
  // shared mapper — a plain, in-language sentence from the dictionary.
  // Raw Firebase codes/messages never reach the screen (the old body
  // stripped only the "Firebase:" prefix and showed the rest verbatim).
  const handleError = (err: any) => {
    setError(gt(friendlyAuthErrorKey(err)));
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
        showToast(gt('auth.identityReconfirmed'), 'success');
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
          showToast(gt('surfaces.portalLogin.masterPinVerified'), "success");
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
   * Resolves the role from users/{uid} (H-11: never self-granted), then
   * routes by RBAC priority (see src/lib/signinRouting.ts):
   *   SuperAdmin → admin view · Trustee/member → MRU org dashboard ·
   *   Purohit → purohit dashboard · Jyotishi → jyotishi dashboard ·
   *   everyone else → Solo personal dashboard (identity minted get-or-create).
   * The session switcher keeps "Personal (Sanatani)" one tap away from any
   * role view. Google users get the identical treatment — no privileged
   * role is ever minted here.
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

    const displayName = fbUser.displayName || fbUser.email || 'Sanatani Devotee';

    // Org membership edges (rules-enforced workspaceMembers docs) — used to
    // land trustees/staff on their most-recently-used org dashboard.
    let trusteeOrgId = '';
    let memberOrgId = '';
    let memberRole: UserRole = 'Devotee';
    try {
      const memSnap = await getDocs(
        query(collection(db, 'workspaceMembers'), where('uid', '==', fbUser.uid), limit(20))
      );
      const edges: Array<{ workspaceId: string; role: string; joinedAt: number }> = [];
      memSnap.forEach((d) => {
        const m = d.data() as any;
        if (m?.workspaceId) {
          edges.push({
            workspaceId: String(m.workspaceId),
            role: String(m.role || ''),
            joinedAt: typeof m.joinedAt?.toMillis === 'function' ? m.joinedAt.toMillis() : 0,
          });
        }
      });
      // MRU: the locally last-used workspace wins when it is one of the
      // user's edges; otherwise the most recently joined edge.
      let mruWs = '';
      try { mruWs = localStorage.getItem('sanatani_active_workspace_id') || ''; } catch { /* no storage */ }
      const byMru = (list: typeof edges) =>
        list.find((e) => e.workspaceId === mruWs) ||
        [...list].sort((a, b) => b.joinedAt - a.joinedAt)[0];
      const trusteeEdge = byMru(edges.filter((e) => e.role === 'Trustee'));
      const anyEdge = byMru(edges);
      if (trusteeEdge) trusteeOrgId = trusteeEdge.workspaceId;
      else if (anyEdge) {
        memberOrgId = anyEdge.workspaceId;
        memberRole = (ROLE_MIGRATION_MAP[anyEdge.role] || anyEdge.role || 'Devotee') as UserRole;
      }
    } catch (memErr) {
      console.warn('[PortalLogin] workspace-member lookup failed:', (memErr as any)?.message);
    }

    // Purohit One: a purohit's profile routes them to their personal
    // workspace (session-kind isolation; the switcher offers Personal).
    let purohitProfile: any = null;
    try {
      const pSnap = await getDocs(
        query(collection(db, 'purohits'), where('uid', '==', fbUser.uid), limit(1))
      );
      if (!pSnap.empty) {
        purohitProfile = { id: pSnap.docs[0].id, ...(pSnap.docs[0].data() as any) };
      }
    } catch (pErr) {
      console.warn('[PortalLogin] purohit lookup failed:', (pErr as any)?.message);
    }

    // Jyotish One: mirror of the purohit lookup.
    let jyotishProfile: any = null;
    try {
      const jSnap = await getDocs(
        query(collection(db, 'jyotishProfiles'), where('uid', '==', fbUser.uid), limit(1))
      );
      if (!jSnap.empty) {
        jyotishProfile = { id: jSnap.docs[0].id, ...(jSnap.docs[0].data() as any) };
      }
    } catch (jErr) {
      console.warn('[PortalLogin] jyotish lookup failed:', (jErr as any)?.message);
    }

    const dest = resolveSigninDestination({
      role,
      trusteeOrgId,
      memberOrgId,
      memberRole,
      fallbackWorkspaceId: activeWorkspace?.id || '',
      hasPurohitProfile: !!purohitProfile,
      hasJyotishProfile: !!jyotishProfile,
    });

    // Leave any personal session before entering an org/admin session so
    // the AppContentRouter guard renders the right shell.
    const ensureOrgSessionKind = () => {
      if (sessionKind === 'solo') exitSoloSession();
      else if (sessionKind === 'purohit') exitPurohitSession();
      else if (sessionKind === 'jyotish') exitJyotishSession();
    };

    switch (dest.kind) {
      case 'admin':
        ensureOrgSessionKind();
        loginAsRole('SuperAdmin', displayName);
        showToast(gt('auth.loginSuccess'), 'success');
        onSuccess();
        return;
      case 'org': {
        ensureOrgSessionKind();
        // Best-effort: land on the MRU org dashboard. A denial keeps the
        // current workspace — the workspace switcher remains available.
        try { await switchWorkspace(dest.workspaceId); } catch { /* keep current */ }
        loginAsRole(dest.role, displayName);
        showToast(gt('auth.loginSuccess'), 'success');
        onSuccess();
        return;
      }
      case 'purohit':
        enterPurohitSession(purohitProfile);
        showToast(gt('surfaces.portalLogin.welcomeBackToYourPurohitWorkspace'), 'success');
        onSuccess();
        return;
      case 'jyotish':
        enterJyotishSession(jyotishProfile);
        showToast(gt('surfaces.portalLogin.welcomeBackToYourJyotishiWorkspace'), 'success');
        onSuccess();
        return;
      case 'solo':
      default: {
        // Solo-first: the default landing is the personal dashboard. The
        // identity is minted get-or-create — never duplicates.
        const profile = await mintOrFetchSanataniProfile(fbUser.uid, displayName, fbUser.email || emailToUse);
        enterSoloSession(profile);
        showToast(gt('surfaces.portalLogin.toastWelcomeId').replace('{id}', profile.id), 'success');
        onSuccess();
        return;
      }
    }
  };

  // Google sign-in state. When set, the email/password register form is
  // skipped — the Google-linked account is used for workspace creation.
  const [googleUser, setGoogleUser] = useState<GoogleAuthResult | null>(null);

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
        // Solo-first: a brand-new Google user becomes a Solo Sanatani —
        // no role question, straight to the personal dashboard.
        const profile = await mintOrFetchSanataniProfile(
          result.uid,
          result.displayName && result.displayName !== 'Sanatani Devotee' ? result.displayName : '',
          result.email
        );
        await setDoc(doc(db, 'users', result.uid), {
          uid: result.uid,
          email: result.email,
          createdAt: serverTimestamp(),
        }, { merge: true }).catch(() => {});
        enterSoloSession(profile);
        showToast(gt('surfaces.portalLogin.toastWelcomeId').replace('{id}', profile.id), 'success');
        onSuccess();
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
    showToast(gt('surfaces.portalLogin.toastGoogleLinked').replace('{email}', result.email), 'success');
  };

  const handleGoogleError = (message: string) => {
    setError(message);
  };

  /**
   * Solo-first signup completion. Step 1 (SignupCredentialsStep) created the
   * Firebase Auth user — there is no Step 2. The Solo Sanatani identity
   * (SAN-XXXXXX) is minted here via the SAME get-or-create path the Solo
   * signup form used (no logic change), then the personal session starts
   * and the user lands in their Solo dashboard.
   */
  const completeSoloSignup = async (creds: SignupCreds) => {
    clearErrors();
    setSignupCreds(creds);
    setSignupMinting(true);
    try {
      const current = auth.currentUser;
      if (!current || current.uid !== creds.uid) {
        setError('Session expired — please start again from the Sign Up tab.');
        setSignupCreds(null);
        return;
      }
      // Mint-or-fetch: an existing profile is returned as-is, never duplicated.
      const profile = await mintOrFetchSanataniProfile(creds.uid, creds.displayName, creds.email);
      // Identity-only user doc. No role — clients can never self-grant.
      await setDoc(doc(db, 'users', creds.uid), {
        uid: creds.uid,
        email: creds.email,
        createdAt: serverTimestamp(),
      }, { merge: true }).catch(() => {});
      enterSoloSession(profile);
      showToast(gt('surfaces.portalLogin.toastWelcomeId').replace('{id}', profile.id), 'success');
      onSuccess();
    } catch (err: any) {
      setError(gt(friendlyAuthErrorKey(err)));
    } finally {
      setSignupMinting(false);
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
    setFieldErrors({});
    if (!navigator.onLine) return setError("Internet connection required to create a new workspace.");

    const { commName, type, adminName, email, phone, password, country, state, city, street, currency } = regData;
    // Progressive upgrade (orgRegisterOnly): the user is already signed in —
    // reuse the live session's identity, exactly like the unified Step 1
    // session below.
    // QUEUED #41 (P0): resolve the session name/email from EVERY identity
    // source, not only the Firebase Auth profile. The app's own
    // email/password signup never writes displayName onto the Auth user,
    // so Auth-only resolution yielded '' here and the validation below
    // rejected complete forms on a field the form doesn't even render.
    const sessionCreds = orgRegisterOnly && auth.currentUser && firebaseUser && auth.currentUser.uid === (firebaseUser as any).uid
      ? {
          uid: auth.currentUser.uid,
          displayName: firstNonBlank([
            auth.currentUser.displayName,
            (firebaseUser as any).displayName,
            soloProfile?.displayName,
            currentDevotee?.fullName,
          ]),
          email: firstNonBlank([
            auth.currentUser.email,
            soloProfile?.email,
            currentDevotee?.email,
          ]),
        }
      : null;
    // Unified signup (Step 1) already authenticated — reuse those credentials.
    const unifiedCreds = signupCreds || sessionCreds;
    const effAdminName = unifiedCreds?.displayName || adminName;
    const effEmail = unifiedCreds?.email || email;
    // Field-named validation (pure, unit-tested — orgRegistration.ts):
    // the banner names every missing field and each field shows its own
    // message. Google-linked / session signups skip the password (the
    // linked identity is the credential).
    const regErrors = validateOrgRegistration({
      orgName: commName,
      adminName: effAdminName,
      email: effEmail,
      phone,
      password,
      country,
      state,
      city,
      hasLinkedIdentity: !!(googleUser || unifiedCreds),
    });
    if (regErrors.length > 0) {
      setFieldErrors(orgRegistrationFieldErrorMap(regErrors));
      return setError(orgRegistrationErrorSummary(regErrors));
    }

    setLoading(true);
    try {
      // 1. Firebase Auth user: unified Step 1 session first, then Google-linked
      //    accounts reuse the linked uid; otherwise create the email/password
      //    user as before.
      let user: any;
      if (unifiedCreds) {
        const current = auth.currentUser;
        if (!current || current.uid !== unifiedCreds.uid) {
          return setError("Session expired — please start again from the Sign Up tab.");
        }
        user = current;
      } else if (googleUser) {
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
        // Seva Suggestions: smart archetype defaults — the new workspace
        // starts with its org type's high-confidence modules already
        // enabled, so discovery isn't gated on visiting the App Store.
        enabledModules: smartDefaultModulesFor(type),
        // H-11: record the provisioner — the creator is this workspace's
        // administrator, resolved back to Trustee on later logins.
        createdBy: user.uid,
        address: [street, city, state, country].filter(Boolean).join(', '),
        city: city,
        state: state,
        country: country,
        email: effEmail,
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
        email: effEmail,
        phone: phone,
        name: effAdminName,
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

      // QUEUED #50 (audit D7): activate the workspace just created — it
      // becomes THE active workspace, the creator lands in its staff
      // console as Trustee. The old sequence also fired switchWorkspace
      // un-awaited (verified against the pre-create auth closure) and
      // then called loginAsRole('Trustee') — the DEMO persona helper,
      // which reset the active workspace to DEMO_ws-mandir and signed
      // the user in anonymously, replacing the real session; the auth
      // listener's anonymous branch demoted the role to Devotee, so the
      // router landed on the demo Mandir's Devotee view, never the new
      // org. activateCreatedWorkspace is the pure state transition.
      activateCreatedWorkspace(newWorkspace);
      // Progressive upgrade: a Solo user registering an organisation leaves
      // the personal session so the router lands on the new org dashboard
      // (the Solo identity itself is untouched — one tap back via Personal).
      if (sessionKind === 'solo') exitSoloSession();

      // First-run Setup Wizard: mark this fresh workspace as pending setup so
      // the wizard greets the new owner exactly once on first entry.
      try {
        localStorage.setItem('sb_setup_pending', newWorkspace.id);
      } catch {
        /* storage unavailable — wizard simply won't trigger */
      }

      showToast(gt('auth.workspaceProvisioned'), "success");
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
    if (!navigator.onLine) return showToast(gt('auth.resetPasswordInternet'), "error");
    if (!loginIdentity.includes('@')) {
      return setError("Please enter your Admin Email Address in the Identity field first.");
    }
    
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, loginIdentity);
      showToast(gt('auth.resetLinkSent'), "success");
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };


  // Per-door card titles (locale-driven). In org-upgrade mode the card
  // always shows the workspace-creation title.
  const viewMeta: Record<AuthDoorId, { title: string; sub: string }> = {
    SIGNIN: { title: t('view_signin_title'), sub: t('view_signin_sub') },
    SIGNUP: orgRegisterOnly
      ? { title: t('view_register_title'), sub: t('view_register_sub') }
      : { title: t('view_signup_title'), sub: t('view_signup_sub') },
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
      {/* Step 8: soft-ban — a paused account sees dignity, not a login form. */}
      {accountSuspended && (
        <div className="relative z-10">
          <SuspendedNotice info={accountSuspended} onDismiss={clearSuspensionNotice} />
        </div>
      )}
      {!accountSuspended && (<>
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
            <span className="text-[13px] font-bold">{gt('auth.offlineMode')}</span>
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
          {/* World-Readiness B4 (G-L9): the canonical language door — the
              old private 3-language <select> is gone; the local dict still
              serves its un-migrated keys via the clamped sync below. */}
          <PublicLanguageButton tone="dark" />
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
          <main className="auth-rise w-full min-w-0 flex" style={{ ['--d' as any]: '0.28s' }}>
            <div className="auth-glass relative w-full min-w-0 rounded-[1.75rem] p-5 sm:p-8 flex flex-col overflow-hidden my-auto">
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

              {/* Two doors — sliding segmented control (hidden in the
                  org-upgrade flow: the user is already signed in). */}
              {!orgRegisterOnly && (
              <AuthDoors
                active={activeView}
                onChange={(d) => { setActiveView(d); clearErrors(); if (d === 'SIGNUP') { setSignupCreds(null); setSignupMinting(false); } }}
                labels={{
                  SIGNIN: t('door_signin'),
                  SIGNUP: t('door_signup'),
                }}
                hints={{
                  SIGNIN: t('hint_signin'),
                  SIGNUP: t('hint_signup'),
                }}
              />
              )}

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
                     <h3 className="text-white text-lg font-black uppercase tracking-widest mb-2 text-center">{gt('surfaces.portalLogin.touchSensor')}</h3>
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
                     <button onClick={stopScanner} className="absolute top-4 right-4 bg-white/10 text-white p-2 rounded-full hover:bg-red-500 transition-colors z-50" aria-label={gt('auth.closeScanner')}>
                       <X size={24}/>
                     </button>
                     <h3 className="text-white font-black uppercase tracking-widest mb-4 flex items-center gap-2"><QrCode/>{' '}{gt('auth.scanId')}</h3>
                     <div className="relative w-64 h-64 rounded-3xl overflow-hidden border-4 border-saffron-500 shadow-[0_0_50px_rgba(245,158,11,0.3)]">
                        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="absolute inset-0 border-[3px] border-white/30 m-8 rounded-xl pointer-events-none"></div>
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-saffron-500/50 shadow-[0_0_8px_#f59e0b] animate-pulse"></div>
                     </div>
                     <p className="text-white/50 text-xs mt-6 font-bold text-center">{gt('auth.alignQr')}</p>
                  </motion.div>
                )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {activeView === 'SIGNIN' ? (
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
                        <p className="text-[11.5px] font-bold text-white/60 tracking-wide">{gt('surfaces.portalLogin.secureLoginForAdminsMembersPurohits')}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <button type="button" onClick={startScanner} className="group rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.11] hover:border-white/25 px-3.5 py-3 flex items-center gap-3 text-left transition-all hover:-translate-y-0.5 min-h-[44px]">
                           <span className="p-2.5 rounded-xl bg-saffron-500/20 text-saffron-300 group-hover:scale-110 transition-transform shrink-0"><QrCode size={19}/></span>
                           <span className="min-w-0">
                             <span className="block text-[13px] font-bold text-white leading-tight">{gt('auth.scanPass')}</span>
                             <span className="block text-[10.5px] text-white/45 font-medium">{gt('auth.qrLogin')}</span>
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
                         <span className="text-[10.5px] font-black tracking-[0.22em] text-white/45">{gt('auth.orUseCredentials')}</span>
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
                            <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} aria-label={gt('auth.togglePassword')} className="min-w-[44px] min-h-[44px] flex items-center justify-center">
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

                      {/* Biometric re-confirm — deliberately SECONDARY: the single
                          primary CTA on this screen is "Enter My Space"
                          below. This only re-confirms an existing session. */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleBiometricLogin}
                          className="w-full py-3 px-4 rounded-2xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white font-bold text-[13px] tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2.5 min-h-[52px]"
                        >
                          <Fingerprint className="w-5 h-5 text-emerald-300/80" />
                          <span>{gt('surfaces.portalLogin.reConfirmSessionWithFaceidTouchid')}</span>
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
                  ) : orgRegisterOnly ? (
                    /* Progressive upgrade: an already-authenticated Solo user
                       registering their organisation — no doors, just the form. */
                    <motion.div
                      key="org-register"
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.32, ease: 'easeOut' }}
                    >
                      {true && (
                    <motion.form
                      key="register"
                      initial={{ opacity: 0, x: -24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 24 }}
                      transition={{ duration: 0.32, ease: 'easeOut' }}
                      onSubmit={handleRegister}
                      className="space-y-4 max-h-[62vh] overflow-y-auto pr-1.5 custom-scrollbar"
                    >
                      {/* Google-linked signup: link first, then complete the form — no password needed.
                          Unified signup (Step 1) already authenticated — skip entirely. */}
                      {(signupCreds || orgRegisterOnly) ? null : !googleUser ? (
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
                            <option value="Mandir">{gt('surfaces.portalLogin.mandirTemple')}</option>
                            <option value="Ashram">{gt('surfaces.portalLogin.ashram')}</option>
                            <option value="Goshala">{gt('surfaces.portalLogin.goshala')}</option>
                            <option value="Gurukul">{gt('surfaces.portalLogin.gurukulVidyalaya')}</option>
                            <option value="Sangha">{gt('surfaces.portalLogin.sanghaMatha')}</option>
                            <option value="Satsang">{gt('surfaces.portalLogin.satsangKatha')}</option>
                            <option value="Yoga">{gt('surfaces.portalLogin.yogaCenter')}</option>
                            <option value="Tirth">{gt('surfaces.portalLogin.tirthKshetra')}</option>
                            <option value="PurohitSabha">{gt('surfaces.portalLogin.purohitSabha')}</option>
                            <option value="MahotsavSamiti">{gt('surfaces.portalLogin.mahotsavSamiti')}</option>
                            <option value="DharmadaTrust">{gt('surfaces.portalLogin.dharmadaTrust')}</option>
                            <option value="AkshayaPatra">{gt('surfaces.portalLogin.annakshetraBhandara')}</option>
                            <option value="Samaj">{gt('surfaces.portalLogin.samajParishad')}</option>
                            <option value="Trust">{gt('surfaces.portalLogin.generalTrustNgo')}</option>
                          </select>
                        </div>

                        <AuthField
                          label={`${t('reg_org_name')} *`}
                          type="text" required
                          value={regData.commName}
                          onChange={e=>{setRegData({...regData, commName: e.target.value}); clearFieldError('orgName');}}
                          autoComplete="organization"
                          error={fieldErrors.orgName}
                        />

                        <div className="space-y-4 pt-4 border-t border-white/10">
                           <div className="flex items-center gap-2 text-[11px] font-black text-white/45 uppercase tracking-[0.18em]">
                             <MapPin size={14}/> Location Details
                           </div>
                           <div>
                             <label className="block text-[10px] font-black text-saffron-300/90 uppercase tracking-[0.15em] mb-1.5">{gt('auth.country')}</label>
                             <div className="relative">
                               <Globe2 size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                               <select required value={regData.country} onChange={e=>{clearFieldError('country'); handleCountryChange(e);}} className={`w-full pl-11 pr-4 py-3.5 bg-white/[0.07] border ${fieldErrors.country ? 'border-red-400/60' : 'border-white/15'} rounded-2xl text-[14px] font-semibold text-white outline-none focus:border-saffron-400/70 focus:bg-white/[0.10] transition-colors cursor-pointer appearance-none [&>option]:text-temple-900`}>
                                 <option value="" disabled>{gt('auth.selectCountry')}</option>
                                 <option value="India">{gt('surfaces.portalLogin.india')}</option>
                                 <option value="Bangladesh">{gt('surfaces.portalLogin.bangladesh')}</option>
                                 <option value="Nepal">{gt('surfaces.portalLogin.nepal')}</option>
                                 <option value="Sri Lanka">{gt('surfaces.portalLogin.sriLanka')}</option>
                                 <option value="USA">{gt('surfaces.portalLogin.unitedStates')}</option>
                                 <option value="UK">{gt('surfaces.portalLogin.unitedKingdom')}</option>
                                 <option value="Other">{gt('surfaces.portalLogin.otherRegion')}</option>
                               </select>
                             </div>
                             {fieldErrors.country && (
                               <p className="text-[12px] font-semibold text-red-300 mt-1.5 ml-1">{fieldErrors.country}</p>
                             )}
                           </div>
                           <div className="grid grid-cols-2 gap-3">
                             <AuthField label="State / Division *" type="text" required value={regData.state} onChange={e=>{setRegData({...regData, state: e.target.value}); clearFieldError('state');}} autoComplete="address-level1" error={fieldErrors.state} />
                             <AuthField label="City / District *" type="text" required value={regData.city} onChange={e=>{setRegData({...regData, city: e.target.value}); clearFieldError('city');}} autoComplete="address-level2" error={fieldErrors.city} />
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

                        {(signupCreds || orgRegisterOnly) ? (
                          /* Identity already established — just the phone. */
                          <div className="bg-emerald-500/15 border border-emerald-400/30 p-3.5 rounded-2xl flex items-center gap-3">
                            <CheckCircle2 size={18} className="text-emerald-300 shrink-0" />
                            <p className="text-[12px] font-bold text-emerald-200">
                              {t('reg_unified_note').replace('{name}', signupCreds?.displayName || sessionDisplayName || (firebaseUser as any)?.email || '')}
                            </p>
                          </div>
                        ) : null}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* QUEUED #41: in org-upgrade mode the name comes
                              from the session — but if NO identity source
                              carries one, render the field so the user can
                              supply it instead of hitting a dead-end. */}
                          {!signupCreds && (!orgRegisterOnly || !sessionDisplayName) && (
                            <AuthField label={t('reg_your_name')} type="text" required value={regData.adminName} onChange={e=>{setRegData({...regData, adminName: e.target.value}); clearFieldError('adminName');}} autoComplete="name" error={fieldErrors.adminName} />
                          )}
                          <AuthField label={t('reg_your_phone')} icon={<Phone size={16} />} type="tel" required value={regData.phone} onChange={e=>{setRegData({...regData, phone: e.target.value}); clearFieldError('phone');}} autoComplete="tel" error={fieldErrors.phone} />
                        </div>

                        {/* QUEUED #41: same rule as the name field — in
                            org-upgrade mode the email field appears only
                            when the session carries no email to reuse. */}
                        {!signupCreds && (!orgRegisterOnly || !sessionEmail) && (
                          <AuthField
                            label={t('reg_official_email')}
                            icon={<Mail size={17} />}
                            type="email" required
                            value={regData.email}
                            onChange={e=>{setRegData({...regData, email: e.target.value}); clearFieldError('email');}}
                            autoComplete="email"
                            error={fieldErrors.email}
                          />
                        )}

                        {!googleUser && !signupCreds && !orgRegisterOnly && (
                          <AuthField
                            label={`${t('login_pass')} *`}
                            icon={<Lock size={17} />}
                            type={showRegPassword ? 'text' : 'password'} required
                            value={regData.password}
                            onChange={e=>{setRegData({...regData, password: e.target.value}); clearFieldError('password');}}
                            autoComplete="new-password"
                            error={fieldErrors.password}
                            rightSlot={
                              <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} aria-label={gt('auth.togglePassword')} className="min-w-[44px] min-h-[44px] flex items-center justify-center">
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
                      )}
                    </motion.div>
                  ) : signupMinting ? (
                    /* Solo identity is being minted — the only "Step 2". */
                    <motion.div
                      key="solo-minting"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.32 }}
                      className="py-10 flex flex-col items-center text-center gap-4"
                    >
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-saffron-400 to-orange-600 flex items-center justify-center shadow-[0_10px_30px_rgba(255,142,0,0.45)]">
                        <Loader2 size={28} className="animate-spin text-white" />
                      </div>
                      <div>
                        <p className="text-white font-black text-[15px]">{t('solo_minting')}</p>
                        <p className="text-white/50 text-[12.5px] font-medium mt-1">{t('cred_secure_note')}</p>
                      </div>
                      {darkError}
                    </motion.div>
                  ) : (
                    /* Step 1 — credentials first, no decisions. On completion
                       the Solo identity is minted automatically. */
                    <SignupCredentialsStep
                      key="signup-creds"
                      onComplete={completeSoloSignup}
                      t={t}
                    />
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
      </>)}
    </div>
  );
};
