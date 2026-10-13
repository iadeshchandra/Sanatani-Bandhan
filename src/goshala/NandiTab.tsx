import React, { useMemo, useState } from 'react';
import { useGoshala, uid, todayISO } from './goshalaStore';
import { Nandi, NandiSex, NandiSource, NandiStatus } from './types';
import { Card, T, Btn, Field, inputCls, Empty, Modal, StatusPill, useLocaleText } from './ui';
import { downloadCSV } from '../pathshala/bn';
import { useToast } from '../context/ToastContext';

/* Goshala One — Nandi registry: individual cattle records with ear-tag /
   QR ids, breed, source, life-status. */

const SEXES: NandiSex[] = ['cow', 'bull', 'vatsa'];
const SOURCES: NandiSource[] = ['rescued', 'donated', 'born', 'purchased'];
const STATUSES: NandiStatus[] = ['milking', 'dry', 'pregnant', 'sick', 'retired', 'vatsa', 'quarantine'];

const emptyForm = { name: '', tagId: '', breed: 'Gir', sex: 'cow' as NandiSex, ageYears: 5, source: 'donated' as NandiSource, status: 'dry' as NandiStatus, motherId: '', notes: '' };

export const NandiTab: React.FC = () => {
  const { state, add, update, remove } = useGoshala();
  const { tr } = useLocaleText();
  const { showToast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => state.nandis.filter((n) =>
    (!statusFilter || n.status === statusFilter) &&
    (!search || n.name.toLowerCase().includes(search.toLowerCase()) || n.tagId.toLowerCase().includes(search.toLowerCase()) || n.breed.toLowerCase().includes(search.toLowerCase()))
  ), [state.nandis, search, statusFilter]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.tagId.trim()) { showToast(tr('goshala.nandi.need', 'Name and Tag ID are required', 'নাম ও ট্যাগ আইডি আবশ্যক', 'नाम और टैग आईडी आवश्यक'), 'warning'); return; }
    if (editing) {
      update('nandis', editing, { ...form, name: form.name.trim(), tagId: form.tagId.trim(), motherId: form.motherId || undefined, notes: form.notes || undefined });
      showToast(tr('goshala.nandi.updated', 'Record updated', 'রেকর্ড হালনাগাদ', 'रिकॉर्ड अद्यतन'), 'success');
    } else {
      if (state.nandis.some((n) => n.tagId.toLowerCase() === form.tagId.trim().toLowerCase())) {
        showToast(tr('goshala.nandi.dup', 'Tag ID already exists', 'ট্যাগ আইডি ইতিমধ্যে আছে', 'टैग आईडी पहले से है'), 'warning'); return;
      }
      const rec: Nandi = { id: uid('n'), addedDate: todayISO(), ...form, name: form.name.trim(), tagId: form.tagId.trim().toUpperCase(), motherId: form.motherId || undefined, notes: form.notes || undefined };
      add('nandis', rec);
      showToast(tr('goshala.nandi.added', 'Gau Mata registered — ॥ शुभम् ॥', 'গো-মাতা নিবন্ধিত', 'गौ माता पंजीकृत'), 'success');
    }
    setForm(emptyForm); setEditing(null);
  };

  const startEdit = (n: Nandi) => {
    setEditing(n.id);
    setForm({ name: n.name, tagId: n.tagId, breed: n.breed, sex: n.sex, ageYears: n.ageYears, source: n.source, status: n.status, motherId: n.motherId || '', notes: n.notes || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const exportCSV = () => {
    downloadCSV('goshala-nandi-register.csv', [
      ['Tag ID', 'Name', 'Breed', 'Sex', 'Age (yrs)', 'Source', 'Status', 'Mother Tag', 'Added'],
      ...filtered.map((n) => [n.tagId, n.name, n.breed, n.sex, String(n.ageYears), n.source, n.status, state.nandis.find((m) => m.id === n.motherId)?.tagId || '', n.addedDate]),
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-stone-800"><T en="Nandi registry" bn="নন্দী নিবন্ধন" hi="नंदी पंजीकरण" sa="नन्दी-पञ्जीकरणम्" /></h2>
        <div className="text-sm text-stone-600">{filtered.length} / {state.nandis.length}</div>
      </div>

      <Card>
        <h3 className="font-bold text-stone-800 mb-3">{editing ? <T en="Edit record" bn="রেকর্ড সম্পাদনা" hi="रिकॉर्ड संपादित करें" /> : <T en="Register Gau Mata" bn="গো-মাতা নিবন্ধন" hi="गौ माता पंजीकरण" />}</h3>
        <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3">
          <Field label={<T en="Name" bn="নাম" hi="नाम" />}><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Kamdhenu" /></Field>
          <Field label={<T en="Tag / QR ID" bn="ট্যাগ / QR আইডি" hi="टैग / QR आईडी" />}><input className={inputCls} value={form.tagId} onChange={(e) => setForm({ ...form, tagId: e.target.value })} placeholder="GM-0009" /></Field>
          <Field label={<T en="Breed" bn="জাত" hi="नस्ल" />}><input className={inputCls} value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} placeholder="Gir / Sahiwal / Tharparkar" /></Field>
          <Field label={<T en="Sex" bn="লিঙ্গ" hi="लिंग" />}>
            <select className={inputCls} value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value as NandiSex })}>
              {SEXES.map((s) => <option key={s} value={s}>{s === 'vatsa' ? 'Vatsa (calf)' : s}</option>)}
            </select>
          </Field>
          <Field label={<T en="Age (years)" bn="বয়স (বছর)" hi="आयु (वर्ष)" />}><input type="number" min={0} className={inputCls} value={form.ageYears} onChange={(e) => setForm({ ...form, ageYears: Number(e.target.value) })} /></Field>
          <Field label={<T en="Source" bn="উৎস" hi="स्रोत" />}>
            <select className={inputCls} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as NandiSource })}>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label={<T en="Status" bn="অবস্থা" hi="स्थिति" />}>
            <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as NandiStatus })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label={<T en="Mother (for Vatsa)" bn="মা (বৎসের জন্য)" hi="माता (वत्स हेतु)" />}>
            <select className={inputCls} value={form.motherId} onChange={(e) => setForm({ ...form, motherId: e.target.value })}>
              <option value="">—</option>
              {state.nandis.filter((n) => n.sex === 'cow').map((n) => <option key={n.id} value={n.id}>{n.name} ({n.tagId})</option>)}
            </select>
          </Field>
          <Field label={<T en="Notes" bn="মন্তব্য" hi="टिप्पणी" />}><input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="sm:col-span-3 flex gap-2">
            <Btn type="submit">{editing ? tr('goshala.save', 'Save', 'সংরক্ষণ', 'सहेजें') : tr('goshala.nandi.register', 'Register', 'নিবন্ধন করুন', 'पंजीकृत करें')}</Btn>
            {editing && <Btn variant="ghost" onClick={() => { setEditing(null); setForm(emptyForm); }}>{tr('goshala.cancel', 'Cancel', 'বাতিল', 'रद्द करें')}</Btn>}
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex flex-wrap gap-2 mb-3">
          <input className={`${inputCls} !w-56`} placeholder={tr('goshala.search', 'Search name / tag / breed…', 'নাম / ট্যাগ / জাত খুঁজুন…', 'नाम / टैग / नस्ल खोजें…')} value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={`${inputCls} !w-44`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{tr('goshala.all_status', 'All statuses', 'সব অবস্থা', 'सभी स्थितियाँ')}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Btn variant="ghost" onClick={exportCSV}>CSV</Btn>
        </div>
        {filtered.length === 0 ? <Empty text={tr('goshala.nandi.empty', 'No records yet — register your first Gau Mata above.', 'এখনও কোনো রেকর্ড নেই।', 'अभी कोई रिकॉर्ड नहीं।')} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-stone-500 border-b">
                <th className="py-2 pr-3"><T en="Tag ID" bn="ট্যাগ" hi="टैग" /></th><th className="py-2 pr-3"><T en="Name" bn="নাম" hi="नाम" /></th>
                <th className="py-2 pr-3"><T en="Breed" bn="জাত" hi="नस्ल" /></th><th className="py-2 pr-3"><T en="Age" bn="বয়স" hi="आयु" /></th>
                <th className="py-2 pr-3"><T en="Source" bn="উৎস" hi="स्रोत" /></th><th className="py-2 pr-3"><T en="Status" bn="অবস্থা" hi="स्थिति" /></th>
                <th className="py-2"><T en="Actions" bn="কর্ম" hi="कार्य" /></th>
              </tr></thead>
              <tbody>
                {filtered.map((n) => (
                  <tr key={n.id} className="border-b border-stone-100 hover:bg-amber-50/50">
                    <td className="py-2 pr-3 font-mono font-bold text-amber-800">{n.tagId}</td>
                    <td className="py-2 pr-3 font-semibold">{n.name}</td>
                    <td className="py-2 pr-3">{n.breed}</td>
                    <td className="py-2 pr-3">{n.ageYears}y</td>
                    <td className="py-2 pr-3 text-stone-600">{n.source}</td>
                    <td className="py-2 pr-3"><StatusPill status={n.status} /></td>
                    <td className="py-2 flex gap-1">
                      <button className="text-xs font-bold text-amber-700 hover:underline px-2 py-1" onClick={() => startEdit(n)}>{tr('goshala.edit', 'Edit', 'সম্পাদনা', 'संपादित करें')}</button>
                      <button className="text-xs font-bold text-red-600 hover:underline px-2 py-1" onClick={() => { if (confirm(tr('goshala.confirm_del', 'Delete this record?', 'রেকর্ড মুছবেন?', 'रिकॉर्ड हटाएँ?'))) remove('nandis', n.id); }}>{tr('goshala.del', 'Delete', 'মুছুন', 'हटाएँ')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
