/** Edit the public purohit profile. */
import React, { useEffect, useState } from 'react';
import { usePurohit } from '../../../context/PurohitContext';
import { Card, SectionTitle, PrimaryButton, Field, inputCls, TierBadge, EmptyState } from '../ui';
import { useLanguage } from '../../../context/LanguageContext';
import { friendlyError } from '../../../lib/friendlyError';

export const ProfileTab: React.FC = () => {
  const { t } = useLanguage();
  const { profile, updateProfile } = usePurohit();
  const [form, setForm] = useState({
    displayName: '',
    phone: '',
    city: '',
    state: '',
    languages: '',
    specializations: '',
    experienceYears: '5',
    bio: '',
    gurukulAffiliation: '',
    dakshinaRangeMin: '',
    dakshinaRangeMax: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        displayName: profile.displayName || '',
        phone: profile.phone || '',
        city: profile.city || '',
        state: profile.state || '',
        languages: (profile.languages || []).join(', '),
        specializations: (profile.specializations || []).join(', '),
        experienceYears: String(profile.experienceYears || 0),
        bio: profile.bio || '',
        gurukulAffiliation: profile.gurukulAffiliation || '',
        dakshinaRangeMin: profile.dakshinaRangeMin ? String(profile.dakshinaRangeMin) : '',
        dakshinaRangeMax: profile.dakshinaRangeMax ? String(profile.dakshinaRangeMax) : '',
      });
    }
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!profile) return <EmptyState title={t('purohit.profile.loading')} />;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        displayName: form.displayName.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        languages: form.languages.split(',').map((s) => s.trim()).filter(Boolean),
        specializations: form.specializations.split(',').map((s) => s.trim()).filter(Boolean),
        experienceYears: Math.max(0, parseInt(form.experienceYears, 10) || 0),
        bio: form.bio.trim().slice(0, 500),
        gurukulAffiliation: form.gurukulAffiliation.trim(),
        dakshinaRangeMin: form.dakshinaRangeMin ? Math.max(0, parseInt(form.dakshinaRangeMin, 10) || 0) : undefined,
        dakshinaRangeMax: form.dakshinaRangeMax ? Math.max(0, parseInt(form.dakshinaRangeMax, 10) || 0) : undefined,
      } as any);
    } catch (err: any) {
      console.error(err);
      alert(friendlyError(err, t, 'save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle sub={t('purohit.profile.titleSub')}>
        {t('purohit.profile.title')}
      </SectionTitle>
      <Card>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-2xl">
            🪔
          </div>
          <div>
            <p className="font-mono text-xs text-stone-500">{profile.id}</p>
            <TierBadge tier={profile.verificationTier} />
            {profile.linkedOrgName && (
              <p className="text-[11px] text-stone-500 mt-1">{t('purohit.profile.alsoServesAt')}: {profile.linkedOrgName}</p>
            )}
          </div>
        </div>
        <form onSubmit={save} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t('purohit.profile.displayName')}>
              <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required className={inputCls} />
            </Field>
            <Field label={t('purohit.profile.phone')}>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required className={inputCls} />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t('purohit.profile.city')}>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required className={inputCls} />
            </Field>
            <Field label={t('purohit.profile.state')}>
              <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <Field label={t('purohit.profile.languages')} hint={t('purohit.profile.commaSeparated')}>
            <input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} className={inputCls} placeholder={t('purohit.profile.languagesPlaceholder')} />
          </Field>
          <Field label={t('purohit.profile.specializations')} hint={t('purohit.profile.commaSeparated')}>
            <input value={form.specializations} onChange={(e) => setForm({ ...form, specializations: e.target.value })} className={inputCls} placeholder={t('purohit.profile.specsPlaceholder')} />
          </Field>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label={t('purohit.profile.experienceYrs')}>
              <input type="number" min={0} max={80} value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} className={inputCls} />
            </Field>
            <Field label={t('purohit.profile.dakshinaMin')}>
              <input type="number" min={0} value={form.dakshinaRangeMin} onChange={(e) => setForm({ ...form, dakshinaRangeMin: e.target.value })} className={inputCls} placeholder="1100" />
            </Field>
            <Field label={t('purohit.profile.dakshinaMax')}>
              <input type="number" min={0} value={form.dakshinaRangeMax} onChange={(e) => setForm({ ...form, dakshinaRangeMax: e.target.value })} className={inputCls} placeholder="11000" />
            </Field>
          </div>
          <Field label={t('purohit.profile.gurukulAffiliation')}>
            <input value={form.gurukulAffiliation} onChange={(e) => setForm({ ...form, gurukulAffiliation: e.target.value })} className={inputCls} />
          </Field>
          <Field label={t('purohit.profile.bio')} hint={t('purohit.profile.bioHint')}>
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className={inputCls} placeholder={t('purohit.profile.bioPlaceholder')} />
          </Field>
          <PrimaryButton type="submit" className="w-full" disabled={saving}>
            {saving ? t('purohit.profile.saving') : t('purohit.profile.saveProfile')}
          </PrimaryButton>
        </form>
      </Card>
    </div>
  );
};
