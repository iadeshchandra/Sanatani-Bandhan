import React, { useRef, useState } from 'react';
import { useSolo } from './SoloContext';
import { useSoloStore } from './soloStore';
import { Card, T, Btn, Field, inputCls, useLocaleText } from './ui';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useToast } from '../context/ToastContext';
import { VerificationBadge } from '../components/common/VerificationBadge';
import { useMyPurohitIdentity } from '../components/purohit/useMyPurohitIdentity';

/* ProfileTab — the Sanatani ID card.
 * =====================================================================
 * SAN-XXXXXX display (tap to copy), editable personal details, attached
 * role identities, and backup/restore of the device-local personal data.
 * Gotra stays private — it is never rendered in any public context.
 */

export const ProfileTab: React.FC = () => {
  const { profile, updateProfile } = useSolo();
  const { exportJSON, importJSON } = useSoloStore();
  const { logout } = useAuthWorkspace();
  const { identity: purohitIdentity } = useMyPurohitIdentity();
  const { showToast } = useToast();
  const { tr } = useLocaleText();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    displayName: profile?.displayName || '',
    phone: profile?.phone || '',
    city: profile?.city || '',
    gotra: profile?.gotra || '',
    homeRegion: profile?.homeRegion || '',
    languages: (profile?.languages || []).join(', '),
  });
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        displayName: form.displayName.trim(),
        phone: form.phone.trim() || undefined,
        city: form.city.trim() || undefined,
        gotra: form.gotra.trim() || undefined,
        homeRegion: form.homeRegion.trim() || undefined,
        languages: form.languages.split(',').map((s) => s.trim()).filter(Boolean),
      });
      showToast(tr('solo.profile.saved', 'Profile saved', 'প্রোফাইল সংরক্ষিত', 'परिचय सहेजा गया'), 'success');
    } finally {
      setSaving(false);
    }
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(profile?.id || '');
      showToast(tr('solo.profile.copied', 'Sanatani ID copied', 'আইডি কপি হয়েছে', 'आईडी कॉपी हुई'), 'success');
    } catch {
      showToast(profile?.id || '', 'info');
    }
  };

  const doBackup = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sanatani-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doRestore = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      const ok = importJSON(String(r.result || ''));
      showToast(
        ok
          ? tr('solo.profile.restored', 'Backup restored', 'ব্যাকআপ ফিরিয়ে আনা হয়েছে', 'बैकअप पुनर्स्थापित')
          : tr('solo.profile.badfile', 'Invalid backup file', 'অবৈধ ফাইল', 'अमान्य फ़ाइल'),
        ok ? 'success' : 'error'
      );
    };
    r.readAsText(file);
  };

  return (
    <div className="space-y-4">
      {/* ID card */}
      <div className="rounded-3xl bg-gradient-to-br from-temple-950 via-stone-900 to-amber-950 text-amber-50 p-6">
        <div className="text-[10px] font-black uppercase tracking-widest text-amber-400/80">
          ॥ <T en="Universal Sanatani ID" bn="ইউনিভার্সাল সনাতনী আইডি" hi="यूनिवर्सल सनातनी आईडी" /> ॥
        </div>
        <button onClick={copyId} className="font-mono text-3xl font-black text-amber-300 mt-2 hover:text-amber-200" title={tr('solo.profile.tapCopy', 'Tap to copy', 'কপি করতে চাপুন', 'कॉपी हेतु दबाएँ')}>
          {profile?.id || 'SAN-…'}
        </button>
        <div className="text-lg font-bold mt-1">{profile?.displayName}</div>
        <div className="mt-2 flex items-center gap-2">
          <VerificationBadge tier={profile?.verificationTier === 'VERIFIED' ? 'PLATFORM_VERIFIED' : 'REGISTERED'} />
          {!profile?.synced && (
            <span className="text-[10px] font-bold text-amber-200/70 border border-amber-200/30 rounded-full px-2 py-0.5">
              <T en="Saved on this device" bn="এই ডিভাইসে সংরক্ষিত" hi="इस डिवाइस पर सहेजा" />
            </span>
          )}
        </div>
      </div>

      {/* Attached roles */}
      <Card>
        <h3 className="font-extrabold text-stone-900 mb-3">
          <T en="Attached identities" bn="সংযুক্ত পরিচয়" hi="संलग्न पहचान" />
        </h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center justify-between rounded-xl bg-stone-50 border border-stone-100 px-3 py-2">
            <span className="font-bold text-stone-700">🪔 <T en="Sanatani" bn="সনাতনী" hi="सनातनी" /></span>
            <span className="font-mono text-xs text-emerald-700 font-bold">{profile?.id}</span>
          </li>
          <li className="flex items-center justify-between rounded-xl bg-stone-50 border border-stone-100 px-3 py-2">
            <span className="font-bold text-stone-700">🕉️ <T en="Purohit" bn="পুরোহিত" hi="पुरोहित" /></span>
            <span className="font-mono text-xs font-bold text-stone-500">
              {profile?.roles?.purohitId || purohitIdentity?.id || <T en="Not attached" bn="সংযুক্ত নয়" hi="जुड़ा नहीं" />}
            </span>
          </li>
          <li className="flex items-center justify-between rounded-xl bg-stone-50 border border-stone-100 px-3 py-2">
            <span className="font-bold text-stone-700">🔮 <T en="Jyotishi" bn="জ্যোতিষী" hi="ज्योतिषी" /></span>
            <span className="font-mono text-xs font-bold text-stone-500">
              {profile?.roles?.jyotishId || <T en="Coming soon" bn="শীঘ্রই" hi="शीघ्र" />}
            </span>
          </li>
        </ul>
        <p className="text-[11px] text-stone-400 mt-2">
          <T en="One account, many roles — your personal data never moves." bn="একটি অ্যাকাউন্ট, অনেক ভূমিকা — ব্যক্তিগত তথ্য কখনও সরবে না।" hi="एक खाता, अनेक भूमिकाएँ — आपका व्यक्तिगत डेटा कभी नहीं हटेगा।" />
        </p>
      </Card>

      {/* Edit details */}
      <Card>
        <h3 className="font-extrabold text-stone-900 mb-3">
          <T en="Personal details" bn="ব্যক্তিগত তথ্য" hi="व्यक्तिगत विवरण" />
        </h3>
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-3">
          <Field label={<T en="Name" bn="নাম" hi="नाम" />}>
            <input className={inputCls} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </Field>
          <Field label={<T en="Phone" bn="ফোন" hi="फ़ोन" />}>
            <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label={<T en="City" bn="শহর" hi="नगर" />}>
            <input className={inputCls} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label={<T en="Home region" bn="নিজ এলাকা" hi="गृह क्षेत्र" />}>
            <input className={inputCls} value={form.homeRegion} onChange={(e) => setForm({ ...form, homeRegion: e.target.value })} />
          </Field>
          <Field label={<T en="Gotra (private)" bn="গোত্র (গোপন)" hi="गोत्र (निजी)" />}>
            <input className={inputCls} value={form.gotra} onChange={(e) => setForm({ ...form, gotra: e.target.value })} />
          </Field>
          <Field label={<T en="Languages (comma-separated)" bn="ভাষা" hi="भाषाएँ" />}>
            <input className={inputCls} value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Btn type="submit" disabled={saving}>
              {saving ? <T en="Saving…" bn="সংরক্ষণ…" hi="सहेज रहे…" /> : <T en="Save details" bn="সংরক্ষণ করুন" hi="सहेजें" />}
            </Btn>
          </div>
        </form>
      </Card>

      {/* Backup / sign out */}
      <Card>
        <h3 className="font-extrabold text-stone-900 mb-3">
          <T en="Data & session" bn="তথ্য ও সেশন" hi="डेटा व सत्र" />
        </h3>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={doBackup}>
            ⬇ <T en="Download backup" bn="ব্যাকআপ নিন" hi="बैकअप लें" />
          </Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()}>
            ⬆ <T en="Restore backup" bn="ব্যাকআপ ফেরান" hi="बैकअप लाएं" />
          </Btn>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doRestore(f); e.target.value = ''; }} />
          <Btn variant="danger" onClick={() => logout()}>
            <T en="Sign out" bn="সাইন আউট" hi="साइन आउट" />
          </Btn>
        </div>
      </Card>
    </div>
  );
};
