/** Devotee posts a ritual requirement to the marketplace. */
import React, { useState } from 'react';
import { usePurohit } from '../../context/PurohitContext';
import { RITUAL_TYPES } from '../../types/purohit';
import { Card, SectionTitle, PrimaryButton, Field, inputCls } from './ui';

export const PostRequirement: React.FC<{ onPosted?: () => void }> = ({ onPosted }) => {
  const { postGig } = usePurohit();
  const [form, setForm] = useState({
    ritualType: RITUAL_TYPES[0] as string,
    preferredDate: '',
    city: '',
    language: 'Sanskrit',
    budgetMin: '1100',
    budgetMax: '11000',
    notes: '',
    devoteePhone: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await postGig({
        ritualType: form.ritualType,
        preferredDate: form.preferredDate,
        city: form.city.trim(),
        language: form.language.trim() || 'Sanskrit',
        budgetMin: Math.max(0, parseInt(form.budgetMin, 10) || 0),
        budgetMax: Math.max(0, parseInt(form.budgetMax, 10) || 0),
        notes: form.notes.trim().slice(0, 500),
        devoteePhone: form.devoteePhone.trim() || undefined,
      });
      setForm({ ...form, notes: '', preferredDate: '' });
      onPosted?.();
    } catch (err: any) {
      alert(err.message || 'Could not post requirement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <SectionTitle sub="Verified independent purohits see your requirement and can accept it directly. No organisation involved.">
        Post a ritual requirement
      </SectionTitle>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Ritual type">
            <select value={form.ritualType} onChange={(e) => setForm({ ...form, ritualType: e.target.value })} className={`${inputCls} bg-white`}>
              {RITUAL_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Preferred date">
            <input type="date" value={form.preferredDate} onChange={(e) => setForm({ ...form, preferredDate: e.target.value })} required className={inputCls} />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="City">
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required className={inputCls} placeholder="e.g. Varanasi" />
          </Field>
          <Field label="Preferred language">
            <input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Budget min (₹)">
            <input type="number" min={0} value={form.budgetMin} onChange={(e) => setForm({ ...form, budgetMin: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Budget max (₹)">
            <input type="number" min={0} value={form.budgetMax} onChange={(e) => setForm({ ...form, budgetMax: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Your phone (for the purohit)">
            <input value={form.devoteePhone} onChange={(e) => setForm({ ...form, devoteePhone: e.target.value })} className={inputCls} placeholder="Optional" />
          </Field>
        </div>
        <Field label="Notes" hint="Sankalp intention, venue, samagri availability…">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className={inputCls} placeholder="e.g. Grihapravesh havan for a 3BHK, morning slot preferred…" />
        </Field>
        <PrimaryButton type="submit" className="w-full" disabled={saving}>
          {saving ? 'Posting…' : 'Post requirement'}
        </PrimaryButton>
      </form>
    </Card>
  );
};
