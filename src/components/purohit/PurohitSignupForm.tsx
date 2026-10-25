/**
 * PurohitSignupForm — "Join as Purohit" registration.
 * =====================================================================
 * Independent signup: no organisation, no workspace. Creates the Firebase
 * Auth user, mints the Universal Purohit ID (PUR-XXXXXX), writes the
 * identity doc to the global `purohits` collection, creates the identity-only
 * `users/{uid}` doc (never a role — clients cannot self-grant privilege),
 * then enters the purohit-personal session.
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { PurohitProvider, usePurohit } from '../../context/PurohitContext';
import { useToast } from '../../context/ToastContext';
import { GoogleSignInButton } from '../auth/GoogleSignInButton';
import type { GoogleAuthResult } from '../../lib/googleAuth';
import { friendlyAuthErrorKey } from '../../lib/friendlyAuthError';
import { CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const inputCls =
  'w-full pl-4 pr-4 py-3.5 bg-temple-50 hover:bg-white border border-temple-200 hover:border-temple-300 rounded-xl text-sm font-medium text-temple-900 placeholder:text-temple-400 focus:bg-white focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20 outline-none transition-all shadow-sm';

const InnerForm: React.FC = () => {
  const { t } = useLanguage();
  const { enterPurohitSession } = useAuthWorkspace();
  const { mintPurohitIdentity } = usePurohit();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
    phone: '',
    city: '',
    languages: 'Sanskrit, Hindi',
    specializations: '',
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
    showToast(t('purohit.signup.googleLinked').replace('{email}', result.email || ''), 'success');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!googleUser && form.password.length < 6) {
      setError(t('purohit.signup.passwordTooShort'));
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

      // Enter the purohit session FIRST (provisional) so the auth-state
      // listener can never flash org UI before the identity is minted.
      enterPurohitSession({
        id: 'PUR-PENDING',
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
        completedGigs: 0,
        source: 'independent',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as any);

      const identity = await mintPurohitIdentity({
        uid: fbUid,
        email,
        displayName: form.displayName,
        phone: form.phone,
        city: form.city,
        languages: form.languages.split(',').map((s) => s.trim()).filter(Boolean),
        specializations: form.specializations.split(',').map((s) => s.trim()).filter(Boolean),
        source: 'independent',
      });

      // Identity-only user doc. No role — H-11: clients can never self-grant.
      await setDoc(
        doc(db, 'users', fbUid),
        { uid: fbUid, email, createdAt: serverTimestamp() },
        { merge: true }
      ).catch(() => {});

      enterPurohitSession(identity);
      showToast(`Welcome, ${identity.displayName}! Your Purohit ID: ${identity.id}`, 'success');
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
      key="purohit-signup"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      onSubmit={submit}
      className="space-y-5 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar"
    >
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-center">
        <p className="text-xs font-black text-amber-800 uppercase tracking-widest">🪔 {t('purohit.signup.title')}</p>
        <p className="text-xs text-amber-700/80 mt-1 font-medium">
          {t('purohit.signup.noOrgSub')}
        </p>
      </div>

      {!googleUser ? (
        <GoogleSignInButton mode="purohit" onSuccess={handleGoogleSuccess} onError={(m) => setError(m)} />
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center gap-3">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <p className="text-xs font-bold text-emerald-800">
            {t('purohit.signup.googleLinked').replace('{email}', googleUser.email || '')}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">
            {t('purohit.signup.displayName')}
          </label>
          <input required value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder={t('purohit.signup.nameExample')} className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">
            Email
          </label>
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t('purohit.signup.emailPlaceholder')} className={inputCls} disabled={!!googleUser} />
        </div>
        {!googleUser && (
        <div>
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">
            Password
          </label>
          <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={t('purohit.signup.passwordMin')} className={inputCls} />
        </div>
        )}
        <div>
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">
            Phone
          </label>
          <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t('purohit.signup.phonePlaceholder')} className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">
            City
          </label>
          <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder={t('purohit.signup.cityExample')} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">
            Languages <span className="normal-case font-medium text-temple-400">{t('surfaces.portalLogin.commaSeparated')}</span>
          </label>
          <input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-black text-temple-600 uppercase tracking-widest mb-1.5">
            Specializations <span className="normal-case font-medium text-temple-400">{t('surfaces.portalLogin.commaSeparated')}</span>
          </label>
          <input value={form.specializations} onChange={(e) => setForm({ ...form, specializations: e.target.value })} placeholder={t('purohit.signup.specsPlaceholder')} className={inputCls} />
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
        {loading ? t('purohit.signup.creatingIdentity') : `🪔 ${t('purohit.signup.joinAs')}`}
      </button>
      <p className="text-[11px] text-temple-400 text-center">
        {t('purohit.signup.receiveId')}
      </p>
    </motion.form>
  );
};

export const PurohitSignupForm: React.FC = () => (
  <PurohitProvider>
    <InnerForm />
  </PurohitProvider>
);
