/**
 * BecomeJyotishModal — devotee/solo → jyotishi upgrade path (dual identity).
 * =====================================================================
 * A signed-in user (solo Sanatani or org devotee) can ALSO become a
 * jyotishi without leaving their existing identity. This mints the
 * Universal Jyotish ID (JYO-XXXXXX) linked to their existing Firebase
 * account (source: 'devotee_upgrade') and attaches it to the Sanatani ID
 * spine via roles.jyotishId. The verification tiers apply identically
 * regardless of entry path. After minting, the mode switcher takes them to
 * the personal jyotishi workspace — zero org data there.
 */
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useJyotish } from '../context/JyotishContext';
import { useSolo } from '../solo/SoloContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { VerificationBadge } from '../components/common/VerificationBadge';
import { friendlyError } from '../lib/friendlyError';
import { JYOTISH_SPECIALIZATIONS, JyotishIdentity } from '../types/jyotish';

interface BecomeJyotishModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]';

export const BecomeJyotishModal: React.FC<BecomeJyotishModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { firebaseUser, currentDevotee, enterJyotishSession } = useAuthWorkspace();
  const { mintJyotishIdentity } = useJyotish();
  const { attachRole } = useSolo();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    displayName: currentDevotee?.fullName || '',
    phone: currentDevotee?.phone || '',
    city: '',
    languages: 'Sanskrit, Hindi',
    specializations: '',
    parampara: '',
  });
  const [saving, setSaving] = useState(false);
  const [minted, setMinted] = useState<JyotishIdentity | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const isOfflineError = (err: any): boolean => {
    const msg = String(err?.message || err?.code || '').toLowerCase();
    return msg.includes('offline') || msg.includes('network') || msg.includes('failed to get document') || msg.includes('unavailable');
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.displayName.trim()) errs.displayName = t('jyotish.become.errName');
    if (!form.phone.trim()) errs.phone = t('jyotish.become.errPhone');
    if (!form.city.trim()) errs.city = t('jyotish.become.errCity');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const errCls = (field: string) => errors[field] ? 'border-red-500 focus:ring-red-500' : '';
  const errMsg = (field: string) => errors[field] ? <p className="text-xs text-red-600 font-bold mt-1">{errors[field]}</p> : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) {
      showToast(t('jyotish.become.signInFirst'), 'error');
      return;
    }
    if (!validate()) return;
    setSaving(true);
    try {
      const identity = await mintJyotishIdentity({
        uid: firebaseUser.uid,
        email: firebaseUser.email || undefined,
        displayName: form.displayName,
        phone: form.phone,
        city: form.city,
        languages: form.languages.split(',').map((s) => s.trim()).filter(Boolean),
        specializations: form.specializations.split(',').map((s) => s.trim()).filter(Boolean),
        parampara: form.parampara,
        source: 'devotee_upgrade',
      });
      // Attach to the Sanatani ID spine (rules: validJyotishAttach).
      try {
        await attachRole('jyotish', identity.id);
      } catch {
        /* attach is best-effort; the JYO identity itself is minted */
      }
      setMinted(identity);
      showToast(t('jyotish.become.welcome').replace('{name}', identity.displayName).replace('{id}', identity.id), 'success');
    } catch (err: any) {
      if (isOfflineError(err)) {
        showToast(t('jyotish.become.connectionRequired'), 'error');
      } else {
        console.error(err);
        showToast(friendlyError(err, t, 'save'), 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const openWorkspace = () => {
    if (minted) enterJyotishSession(minted);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-5 rounded-t-3xl flex items-start justify-between">
          <div>
            <h3 className="font-black text-lg">🔮 {t('jyotish.become.title')}</h3>
            <p className="text-xs text-indigo-100 mt-1">
              One account, many roles — your existing identity stays untouched.
            </p>
          </div>
          <button onClick={onClose} className="p-2 -m-1 text-white/80 hover:text-white min-h-[44px] min-w-[44px]" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {!minted ? (
          <form onSubmit={submit} noValidate className="p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">{t('jyotish.become.displayName')}</label>
              <input value={form.displayName} onChange={(e) => { setForm({ ...form, displayName: e.target.value }); clearError('displayName'); }} placeholder={t('jyotish.become.nameExample')} className={`${inputCls} ${errCls('displayName')}`} aria-invalid={!!errors.displayName} />{errMsg('displayName')}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">{t('jyotish.become.phone')}</label>
                <input value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); clearError('phone'); }} placeholder="+91 …" className={`${inputCls} ${errCls('phone')}`} aria-invalid={!!errors.phone} />{errMsg('phone')}
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">{t('jyotish.become.city')}</label>
                <input value={form.city} onChange={(e) => { setForm({ ...form, city: e.target.value }); clearError('city'); }} placeholder={t('jyotish.become.cityExample')} className={`${inputCls} ${errCls('city')}`} aria-invalid={!!errors.city} />{errMsg('city')}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">{t('jyotish.become.parampara')}</label>
              <input value={form.parampara} onChange={(e) => setForm({ ...form, parampara: e.target.value })} placeholder={t('jyotish.become.paramparaExample')} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">{t('jyotish.become.languages')}</label>
              <input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">{t('jyotish.become.specializations')}</label>
              <input value={form.specializations} onChange={(e) => setForm({ ...form, specializations: e.target.value })} placeholder={[...JYOTISH_SPECIALIZATIONS].slice(0, 3).join(', ')} className={inputCls} />
            </div>
            <button type="submit" disabled={saving} className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black py-3 rounded-xl text-sm disabled:opacity-50 min-h-[44px]">
              {saving ? t('jyotish.become.minting') : `🔮 ${t('jyotish.become.createIdentity')}`}
            </button>
            <p className="text-[11px] text-stone-400 text-center">
              You’ll get a Universal Jyotish ID (JYO-XXXXXX), attached to your Sanatani ID.
            </p>
          </form>
        ) : (
          <div className="p-6 text-center space-y-4">
            <div className="text-5xl">🪐</div>
            <h4 className="font-black text-stone-900 text-lg">Identity created</h4>
            <div className="inline-flex items-center gap-2">
              <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2">{minted.id}</span>
              <VerificationBadge tier={minted.verificationTier} subject="Jyotishi" />
            </div>
            <p className="text-sm text-stone-500">
              Your Jyotish ID is attached to your Sanatani ID. Open your personal workspace to
              set availability, apply for verification and receive consultations.
            </p>
            <button onClick={openWorkspace} className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black py-3 rounded-xl text-sm min-h-[44px]">
              Open my Jyotishi workspace →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
