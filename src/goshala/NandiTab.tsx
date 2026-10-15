import React, { useMemo, useState } from 'react';
import { useGoshala, uid, todayISO } from './goshalaStore';
import { Nandi, NandiSex, NandiSource, NandiStatus } from './types';
import { Card, Btn, Field, inputCls, Empty, Modal, StatusPill, SEX_KEY, SOURCE_KEY, STATUS_KEY, labelFor } from './ui';
import { downloadCSV } from '../pathshala/bn';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* Goshala One — Nandi registry: individual cattle records with ear-tag /
   QR ids, breed, source, life-status. */

const SEXES: NandiSex[] = ['cow', 'bull', 'vatsa'];
const SOURCES: NandiSource[] = ['rescued', 'donated', 'born', 'purchased'];
const STATUSES: NandiStatus[] = ['milking', 'dry', 'pregnant', 'sick', 'retired', 'vatsa', 'quarantine'];

const emptyForm = { name: '', tagId: '', breed: 'Gir', sex: 'cow' as NandiSex, ageYears: 5, source: 'donated' as NandiSource, status: 'dry' as NandiStatus, motherId: '', notes: '' };

export const NandiTab: React.FC = () => {
  const { state, add, update, remove } = useGoshala();
  const { t } = useLanguage();
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
    if (!form.name.trim() || !form.tagId.trim()) { showToast(t('suites.goshala.nandi.need'), 'warning'); return; }
    if (editing) {
      update('nandis', editing, { ...form, name: form.name.trim(), tagId: form.tagId.trim(), motherId: form.motherId || undefined, notes: form.notes || undefined });
      showToast(t('suites.goshala.nandi.updated'), 'success');
    } else {
      if (state.nandis.some((n) => n.tagId.toLowerCase() === form.tagId.trim().toLowerCase())) {
        showToast(t('suites.goshala.nandi.dup'), 'warning'); return;
      }
      const rec: Nandi = { id: uid('n'), addedDate: todayISO(), ...form, name: form.name.trim(), tagId: form.tagId.trim().toUpperCase(), motherId: form.motherId || undefined, notes: form.notes || undefined };
      add('nandis', rec);
      showToast(t('suites.goshala.nandi.added'), 'success');
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
        <h2 className="text-lg font-bold text-stone-800">{t('suites.goshala.nandi.title')}</h2>
        <div className="text-sm text-stone-600">{filtered.length} / {state.nandis.length}</div>
      </div>

      <Card>
        <h3 className="font-bold text-stone-800 mb-3">{editing ? t('suites.goshala.nandi.editRecord') : t('suites.goshala.nandi.registerTitle')}</h3>
        <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3">
          <Field label={t('suites.goshala.nandi.name')}><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('suites.goshala.nandi.phName')} /></Field>
          <Field label={t('suites.goshala.nandi.tagId')}><input className={inputCls} value={form.tagId} onChange={(e) => setForm({ ...form, tagId: e.target.value })} placeholder={t('suites.goshala.nandi.phTag')} /></Field>
          <Field label={t('suites.goshala.nandi.breed')}><input className={inputCls} value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} placeholder={t('suites.goshala.nandi.phBreed')} /></Field>
          <Field label={t('suites.goshala.nandi.sex')}>
            <select className={inputCls} value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value as NandiSex })}>
              {SEXES.map((s) => <option key={s} value={s}>{t(SEX_KEY[s])}</option>)}
            </select>
          </Field>
          <Field label={t('suites.goshala.nandi.age')}><input type="number" min={0} className={inputCls} value={form.ageYears} onChange={(e) => setForm({ ...form, ageYears: Number(e.target.value) })} /></Field>
          <Field label={t('suites.goshala.nandi.source')}>
            <select className={inputCls} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as NandiSource })}>
              {SOURCES.map((s) => <option key={s} value={s}>{t(SOURCE_KEY[s])}</option>)}
            </select>
          </Field>
          <Field label={t('suites.goshala.nandi.status')}>
            <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as NandiStatus })}>
              {STATUSES.map((s) => <option key={s} value={s}>{t(STATUS_KEY[s])}</option>)}
            </select>
          </Field>
          <Field label={t('suites.goshala.nandi.mother')}>
            <select className={inputCls} value={form.motherId} onChange={(e) => setForm({ ...form, motherId: e.target.value })}>
              <option value="">—</option>
              {state.nandis.filter((n) => n.sex === 'cow').map((n) => <option key={n.id} value={n.id}>{n.name} ({n.tagId})</option>)}
            </select>
          </Field>
          <Field label={t('suites.goshala.nandi.notes')}><input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="sm:col-span-3 flex gap-2">
            <Btn type="submit">{editing ? t('suites.goshala.common.save') : t('suites.goshala.nandi.register')}</Btn>
            {editing && <Btn variant="ghost" onClick={() => { setEditing(null); setForm(emptyForm); }}>{t('suites.goshala.common.cancel')}</Btn>}
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex flex-wrap gap-2 mb-3">
          <input className={`${inputCls} !w-56`} placeholder={t('suites.goshala.nandi.searchPh')} value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={`${inputCls} !w-44`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{t('suites.goshala.nandi.allStatuses')}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t(STATUS_KEY[s])}</option>)}
          </select>
          <Btn variant="ghost" onClick={exportCSV}>CSV</Btn>
        </div>
        {filtered.length === 0 ? <Empty text={t('suites.goshala.nandi.empty')} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-stone-500 border-b">
                <th className="py-2 pr-3">{t('suites.goshala.nandi.thTag')}</th><th className="py-2 pr-3">{t('suites.goshala.nandi.thName')}</th>
                <th className="py-2 pr-3">{t('suites.goshala.nandi.thBreed')}</th><th className="py-2 pr-3">{t('suites.goshala.nandi.thAge')}</th>
                <th className="py-2 pr-3">{t('suites.goshala.nandi.thSource')}</th><th className="py-2 pr-3">{t('suites.goshala.nandi.thStatus')}</th>
                <th className="py-2">{t('suites.goshala.nandi.thActions')}</th>
              </tr></thead>
              <tbody>
                {filtered.map((n) => (
                  <tr key={n.id} className="border-b border-stone-100 hover:bg-amber-50/50">
                    <td className="py-2 pr-3 font-mono font-bold text-amber-800">{n.tagId}</td>
                    <td className="py-2 pr-3 font-semibold">{n.name}</td>
                    <td className="py-2 pr-3">{n.breed}</td>
                    <td className="py-2 pr-3">{t('suites.goshala.nandi.ageYears').replace('{age}', String(n.ageYears))}</td>
                    <td className="py-2 pr-3 text-stone-600">{labelFor(t, SOURCE_KEY, n.source)}</td>
                    <td className="py-2 pr-3"><StatusPill status={n.status} /></td>
                    <td className="py-2 flex gap-1">
                      <button className="text-xs font-bold text-amber-700 hover:underline px-2 py-1" onClick={() => startEdit(n)}>{t('suites.goshala.common.edit')}</button>
                      <button className="text-xs font-bold text-red-600 hover:underline px-2 py-1" onClick={() => { if (confirm(t('suites.goshala.common.confirmDelete'))) remove('nandis', n.id); }}>{t('suites.goshala.common.delete')}</button>
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
