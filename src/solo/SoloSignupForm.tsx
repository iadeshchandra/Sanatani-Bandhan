/**
 * SoloSignupForm — "Solo Sanatani" registration (the default door).
 * =====================================================================
 * Independent personal signup: no organisation, no profession. Creates the
 * Firebase Auth user, mints the Universal Sanatani ID (SAN-XXXXXX), writes
 * the identity doc to the global `sanataniProfiles` collection, creates the
 * identity-only `users/{uid}` doc (never a role — clients cannot self-grant
 * privilege), then enters the solo-personal session.
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { SoloProvider, useSolo } from './SoloContext';
import { useToast } from '../context/ToastContext';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import type { GoogleAuthResult } from '../lib/googleAuth';
import { CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { WARM_SUCCESS, pickLang } from '../lib/microcopy';
import { friendlyAuthErrorKey } from '../lib/friendlyAuthError';

const inputCls =
  'w-full pl-4 pr-4 py-3.5 bg-temple-50 hover:bg-white border border-temple-200 hover:border-temple-300 rounded-xl text-sm font-medium text-temple-900 placeholder:text-temple-400 focus:bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none transition-all shadow-sm';

const InnerForm: React.FC = () => {
  const { t } = useLanguage();
  const { enterSoloSession } = useAuthWorkspace();
  const { ensureProfile } = useSolo();
  const { showToast } = useToast();
  const { currentLang } = useLanguage();
  const t3 = pickLang(currentLang);

  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
    phone: '',
    city: '',
    gotra: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleUser, setGoogleUser] = useState<GoogleAuthResult | null>(null);

  const handleGoogleSuccess = (result: GoogleAuthResult) => {
    setGoogleUser(result);
    setForm((f) => ({
      ...f,
      displayName: f.displayName || (result.displayName !== 'Sanatani Devotee' ? result.displayName : ''),
      email: result.email || f.email,
    }));
    showToast(`Google linked (${result.email}). Complete your details below.`, 'success');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!googleUser && form.password.length < 6) {
      setError(t('solo.signup.passwordTooShort'));
      return;
    }
    setLoading(true);
    try {
      const email = (googleUser?.email || form.email).trim().toLowerCase();
      let fbUid: string;
      if (googleUser) {
        const current = auth.currentUser;
        if (!current || current.uid !== googleUser.uid) {
          setError('Google session expired — please tap the Google button again.');
          setLoading(false);
          return;
        }
        fbUid = current.uid;
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, form.password);
        fbUid = cred.user.uid;
      }

      // Mint the Universal Sanatani ID (get-or-create: never duplicates),
      // enriched with the details the user just gave.
      const enriched = await ensureProfile(fbUid, form.displayName.trim(), email, {
        phone: form.phone.trim() || undefined,
        city: form.city.trim() || undefined,
        gotra: form.gotra.trim() || undefined,
      });

      // Identity-only user doc. No role — clients can never self-grant.
      await setDoc(
        doc(db, 'users', fbUid),
        { uid: fbUid, email, createdAt: serverTimestamp() },
        { merge: true }
      ).catch(() => {});

      enterSoloSession(enriched);
      showToast(t3(WARM_SUCCESS.welcomeNew(enriched.id)), 'success');
    } catch (err: any) {
      // Never surface raw Firebase messages — warm, actionable copy.
      // World-Readiness B4 (G-E3): auth failures render through the one
      // shared mapper + dictionary (all 10 languages), superseding the
      // trilingual humanizeError on this auth surface.
      setError(t(friendlyAuthErrorKey(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      key="solo-signup"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      onSubmit={submit}
      className="space-y-5 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar"
    >
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-center">
        <p className="text-xs font-black text-amber-800 uppercase tracking-widest">{t('solo.signup.title')}</p>
        <p className="text-xs text-amber-700/80 mt-1 font-medium">
          Your personal Sanatani home — sadhana, panchang, saved shlokas, giving history.
          No organisation needed. Join one later, or become a Purohit / Jyotishi, anytime.
        </p>
      </div>

      {!googleUser ? (
        <GoogleSignInButton mode="solo" onSuccess={handleGoogleSuccess} onError={(m) => setError(m)} />
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center gap-3">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <p className="text-xs font-bold text-emerald-800">
            Google linked ({googleUser.email}) — no password needed. Complete your details below.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">{t('solo.signup.yourName')}</label>
          <input required value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder={t('solo.signup.namePlaceholder')} className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">{t('solo.signup.email')}</label>
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t('solo.signup.emailPlaceholder')} className={inputCls} disabled={!!googleUser} />
        </div>
        {!googleUser && (
          <div>
            <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">{t('solo.signup.password')}</label>
            <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={t('solo.signup.passwordHint')} className={inputCls} />
          </div>
        )}
        <div>
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">{t('solo.signup.phone')} <span className="normal-case font-medium text-temple-400">(optional)</span>
          </label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t('solo.signup.phonePlaceholder')} className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">{t('solo.signup.city')} <span className="normal-case font-medium text-temple-400">(optional)</span>
          </label>
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder={t('solo.signup.cityPlaceholder')} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">{t('solo.signup.gotra')} <span className="normal-case font-medium text-temple-400">{t('surfaces.portalLogin.optionalPrivate')}</span>
          </label>
          <input value={form.gotra} onChange={(e) => setForm({ ...form, gotra: e.target.value })} placeholder={t('solo.signup.gotraPlaceholder')} className={inputCls} />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-xs font-bold text-center">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black py-3 rounded-xl shadow-md transition-all text-sm disabled:opacity-50 min-h-[44px]"
      >
        {loading ? t('auth.creatingAccount') : t('solo.signup.title')}
      </button>
      <p className="text-[11px] text-temple-400 text-center">{t('solo.signup.sanataniIdNote')}</p>
    </motion.form>
  );
};

export const SoloSignupForm: React.FC = () => (
  <SoloProvider uid={null}>
    <InnerForm />
  </SoloProvider>
);
