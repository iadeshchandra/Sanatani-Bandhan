/**
 * JyotishSignupForm — "Join as Jyotishi" registration.
 * =====================================================================
 * Independent signup: no organisation, no workspace. Creates the Firebase
 * Auth user, mints the Universal Jyotish ID (JYO-XXXXXX), writes the
 * identity doc to the global `jyotishProfiles` collection, attaches it to
 * the Sanatani ID spine (roles.jyotishId), creates the identity-only
 * `users/{uid}` doc (never a role — clients cannot self-grant privilege),
 * then enters the jyotishi-personal session.
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { JyotishProvider, useJyotish } from '../context/JyotishContext';
import { mintOrFetchSanataniProfile } from '../solo/soloSession';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import type { GoogleAuthResult } from '../lib/googleAuth';
import { friendlyAuthErrorKey } from '../lib/friendlyAuthError';
import { CheckCircle2 } from 'lucide-react';
import { JYOTISH_SPECIALIZATIONS } from '../types/jyotish';

const inputCls =
  'w-full pl-4 pr-4 py-3.5 bg-temple-50 hover:bg-white border border-temple-200 hover:border-temple-300 rounded-xl text-sm font-medium text-temple-900 placeholder:text-temple-400 focus:bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none transition-all shadow-sm';

const InnerForm: React.FC = () => {
  const { t } = useLanguage();
  const { enterJyotishSession } = useAuthWorkspace();
  const { mintJyotishIdentity } = useJyotish();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
    phone: '',
    city: '',
    languages: 'Sanskrit, Hindi',
    specializations: '',
    parampara: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Google-linked signup: the Google account replaces email/password.
  const [googleUser, setGoogleUser] = useState<GoogleAuthResult | null>(null);

  const handleGoogleSuccess = (result: GoogleAuthResult) => {
    setGoogleUser(result);
    setForm((f) => ({
      ...f,
      displayName: f.displayName || (result.displayName !== 'Sanatani Devotee' ? result.displayName : ''),
      email: result.email || f.email,
    }));
    showToast(t('jyotish.signup.googleLinked').replace('{email}', result.email || ''), 'success');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!googleUser && form.password.length < 6) {
      setError(t('jyotish.signup.passwordTooShort'));
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

      // Enter the jyotishi session FIRST (provisional) so the auth-state
      // listener can never flash org UI before the identity is minted.
      enterJyotishSession({
        id: 'JYO-PENDING',
        uid: fbUid,
        displayName: form.displayName.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        languages: [],
        specializations: [],
        experienceYears: 0,
        verificationTier: 'REGISTERED',
        ratingAggregate: 0,
        ratingCount: 0,
        completedConsultations: 0,
        source: 'independent',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as any);

      const identity = await mintJyotishIdentity({
        uid: fbUid,
        email,
        displayName: form.displayName,
        phone: form.phone,
        city: form.city,
        languages: form.languages.split(',').map((s) => s.trim()).filter(Boolean),
        specializations: form.specializations.split(',').map((s) => s.trim()).filter(Boolean),
        parampara: form.parampara,
        source: 'independent',
      });

      // Attach to the Sanatani ID spine (get-or-mint first — same account).
      // Done directly (no SoloProvider here): the spine's lazy mint later
      // fetches this same profile, jyotishId already attached.
      try {
        await mintOrFetchSanataniProfile(fbUid, identity.displayName, email, {
          phone: identity.phone,
          city: identity.city,
        });
        await setDoc(
          doc(db, 'sanataniProfiles', fbUid),
          { roles: { jyotishId: identity.id }, updatedAt: serverTimestamp() },
          { merge: true }
        );
      } catch {
        /* spine attach is best-effort; the JYO identity itself is minted */
      }

      // Identity-only user doc. No role — clients can never self-grant.
      await setDoc(
        doc(db, 'users', fbUid),
        { uid: fbUid, email, createdAt: serverTimestamp() },
        { merge: true }
      ).catch(() => {});

      enterJyotishSession(identity);
      showToast(`Welcome, ${identity.displayName}! Your Jyotish ID: ${identity.id}`, 'success');
    } catch (err: any) {
      // World-Readiness B4 (G-E3): the shared friendlyAuthError mapper —
      // every Firebase code renders a dictionary sentence, never raw.
      setError(t(friendlyAuthErrorKey(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      key="jyotish-signup"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      onSubmit={submit}
      className="space-y-5 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar"
    >
      <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl text-center">
        <p className="text-xs font-black text-indigo-800 uppercase tracking-widest">🔮 {t('jyotish.signup.title')}</p>
        <p className="text-xs text-indigo-700/80 mt-1 font-medium">
          {t('jyotish.signup.noOrgSub')} earnings, verification and reviews.
        </p>
      </div>

      {!googleUser ? (
        <GoogleSignInButton mode="jyotish" onSuccess={handleGoogleSuccess} onError={(m) => setError(m)} />
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center gap-3">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <p className="text-xs font-bold text-emerald-800">
            {t('jyotish.signup.googleLinked').replace('{email}', googleUser.email || '')}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">
            {t('jyotish.signup.displayName')}
          </label>
          <input required value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder={t('jyotish.signup.nameExample')} className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">
            Email
          </label>
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t('jyotish.signup.emailPlaceholder')} className={inputCls} disabled={!!googleUser} />
        </div>
        {!googleUser && (
        <div>
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">
            {t('jyotish.signup.password')}
          </label>
          <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={t('jyotish.signup.passwordMin')} className={inputCls} />
        </div>
        )}
        <div>
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">
            Phone
          </label>
          <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t('jyotish.signup.phonePlaceholder')} className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">
            City
          </label>
          <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder={t('jyotish.signup.cityExample')} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">
            Parampara / Lineage <span className="normal-case font-medium text-temple-400">(optional)</span>
          </label>
          <input value={form.parampara} onChange={(e) => setForm({ ...form, parampara: e.target.value })} placeholder={t('jyotish.signup.paramparaExample')} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">
            Languages <span className="normal-case font-medium text-temple-400">(comma-separated)</span>
          </label>
          <input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">
            Specializations <span className="normal-case font-medium text-temple-400">(comma-separated)</span>
          </label>
          <input value={form.specializations} onChange={(e) => setForm({ ...form, specializations: e.target.value })} placeholder={[...JYOTISH_SPECIALIZATIONS].slice(0, 3).join(', ')} className={inputCls} />
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
        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black py-3 rounded-xl shadow-md transition-all text-sm disabled:opacity-50 min-h-[44px]"
      >
        {loading ? t('jyotish.signup.creatingIdentity') : `🔮 ${t('jyotish.signup.joinAs')}`}
      </button>
      <p className="text-[11px] text-temple-400 text-center">
        You’ll receive a Universal Jyotish ID (JYO-XXXXXX) and land in your personal workspace.
      </p>
    </motion.form>
  );
};

export const JyotishSignupForm: React.FC = () => (
  <JyotishProvider>
    <InnerForm />
  </JyotishProvider>
);
