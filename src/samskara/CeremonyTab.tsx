import React, { useState } from 'react';
import { useSamskara, uid, todayISO } from './samskaraStore';
import { CeremonyPlan, SamskaraId, SAMSKARAS, samskaraMeta, FamilyMember } from './types';
import { Card, Btn, Field, inputCls, Modal, Empty, StatusPill, fmtDate, T, useTr } from './ui';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';

/* Samskara One — Ceremony. Plan an upcoming samskara with reverence:
 * traditional checklist, purohit details, muhurat notes (confirm with
 * jyotishi), and dakshina tracking that posts honestly to treasury. */

const PlanDetail: React.FC<{ plan: CeremonyPlan; onClose: () => void }> = ({ plan, onClose }) => {
  const { state, update, toggleChecklist } = useSamskara();
  const { addTreasuryTransaction } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const { t } = useLanguage();
  const [targetDate, setTargetDate] = useState(plan.targetDate || '');
  const [purohitName, setPurohitName] = useState(plan.purohitName || '');
  const [purohitContact, setPurohitContact] = useState(plan.purohitContact || '');
  const [muhuratNote, setMuhuratNote] = useState(plan.muhuratNote || '');
  const [dakshinaAmount, setDakshinaAmount] = useState(plan.dakshinaAmount ? String(plan.dakshinaAmount) : '');
  const [notes, setNotes] = useState(plan.notes || '');
  const [newItem, setNewItem] = useState('');
  const meta = samskaraMeta(plan.samskaraId);
  const member = state.members.find((m) => m.id === plan.memberId);

  const save = () => {
    update('plans', plan.id, {
      targetDate: targetDate || undefined,
      purohitName: purohitName.trim() || undefined,
      purohitContact: purohitContact.trim() || undefined,
      muhuratNote: muhuratNote.trim() || undefined,
      dakshinaAmount: dakshinaAmount ? Number(dakshinaAmount) : undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    update('plans', plan.id, {
      checklist: [...plan.checklist, { id: uid('ci'), text: newItem.trim(), done: false }],
    });
    setNewItem('');
  };

  const postDakshina = () => {
    const amount = Number(dakshinaAmount);
    if (!amount || amount <= 0 || plan.dakshinaPosted) return;
    const ok = addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      date: new Date().toISOString(),
      type: 'Income', category: 'Samskara Dakshina',
      subcategory: `Samskara One — ${meta.transliteration}`,
      amount,
      handledBy: 'Samskara',
      paymentMode: 'Cash', referenceNo: plan.id,
      purpose: `Dakshina for ${meta.transliteration}${member ? ` — ${member.name}` : ''}`,
      is80GEligible: false, taxReceiptIssued: false,
    });
    if (ok) {
      update('plans', plan.id, { dakshinaPosted: true, treasuryTxId: 'posted', dakshinaAmount: amount });
    }
  };

  const doneCount = plan.checklist.filter((c) => c.done).length;

  return (
    <Modal wide title={`${meta.name} · ${meta.transliteration}${member ? ` — ${member.name}` : ''}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={<T k="suites.samskara.ceremony.targetDate" en="Target date" />}>
            <input type="date" className={inputCls} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </Field>
          <Field label={<T k="suites.samskara.ceremony.muhuratNote" en="Muhurat note" />}>
            <input className={inputCls} value={muhuratNote} onChange={(e) => setMuhuratNote(e.target.value)}
              placeholder={t('suites.samskara.ceremony.muhuratPh')} />
          </Field>
        </div>

        <div>
          <h4 className="text-sm font-bold text-stone-700 mb-2">
            {t('suites.samskara.ceremony.checklist')}
            <span className="ml-2 text-xs font-normal text-stone-400">{doneCount}/{plan.checklist.length}</span>
          </h4>
          <div className="space-y-1.5">
            {plan.checklist.map((c) => (
              <label key={c.id} className="flex items-start gap-2.5 rounded-xl border border-stone-100 bg-stone-50/50 px-3 py-2.5 cursor-pointer min-h-[44px]">
                <input type="checkbox" checked={c.done} onChange={() => toggleChecklist(plan.id, c.id)} className="w-5 h-5 mt-0.5 accent-rose-700 shrink-0" />
                <span className={`text-sm ${c.done ? 'line-through text-stone-400' : 'text-stone-700'}`}>{c.text}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input className={inputCls} value={newItem} onChange={(e) => setNewItem(e.target.value)}
              placeholder={t('suites.samskara.ceremony.addItem')}
              onKeyDown={(e) => e.key === 'Enter' && addItem()} />
            <Btn variant="ghost" onClick={addItem}>+</Btn>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={<T k="suites.samskara.ceremony.purohit" en="Purohit" />}>
            <input className={inputCls} value={purohitName} onChange={(e) => setPurohitName(e.target.value)} />
          </Field>
          <Field label={<T k="suites.samskara.ceremony.purohitContact" en="Purohit contact" />}>
            <input className={inputCls} value={purohitContact} onChange={(e) => setPurohitContact(e.target.value)} placeholder="—" />
          </Field>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <h4 className="text-sm font-bold text-amber-900 mb-2">
            {t('suites.samskara.ceremony.dakshina')}
          </h4>
          {plan.dakshinaPosted ? (
            <div className="flex items-center gap-2">
              <StatusPill status="posted" />
              <span className="text-xs text-stone-500">
                {t('suites.samskara.ceremony.postedNote')}
              </span>
            </div>
          ) : (
            <div className="flex gap-2">
              <input type="number" min="0" className={inputCls} value={dakshinaAmount}
                onChange={(e) => setDakshinaAmount(e.target.value)} placeholder="₹" />
              <Btn variant="ghost" onClick={postDakshina} disabled={!Number(dakshinaAmount)}>
                {t('suites.samskara.ceremony.post')}
              </Btn>
            </div>
          )}
          <p className="text-[11px] text-amber-700/80 italic mt-2">
            {t('suites.samskara.ceremony.dakshinaNote')}
          </p>
        </div>

        <Field label={<T k="suites.samskara.common.notes" en="Notes" />}>
          <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <div className="flex gap-2">
          <Btn onClick={save} className="flex-1">
            {t('suites.samskara.common.save')}
          </Btn>
          <Btn variant="ghost" onClick={onClose}>
            {t('suites.samskara.common.cancel')}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};

export const CeremonyTab: React.FC = () => {
  const { state, newPlan, remove } = useSamskara();
  const { t } = useLanguage();
  const tr = useTr();
  const [memberId, setMemberId] = useState('');
  const [samskaraId, setSamskaraId] = useState<SamskaraId>('upanayana');
  const [openPlan, setOpenPlan] = useState<CeremonyPlan | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CeremonyPlan | null>(null);

  const living = state.members.filter((m) => m.isLiving);
  const memberName = (id: string) => state.members.find((m) => m.id === id)?.name ?? '—';
  const sorted = [...state.plans].sort((a, b) => (a.targetDate || '9999').localeCompare(b.targetDate || '9999'));

  const create = () => {
    if (!memberId) return;
    const plan = newPlan(memberId, samskaraId, tr);
    setOpenPlan(plan);
  };

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-bold text-stone-800 mb-3">
          {t('suites.samskara.ceremony.new')}
        </h3>
        {living.length === 0 ? (
          <p className="text-sm text-stone-400 italic">
            {t('suites.samskara.ceremony.noMembers')}
          </p>
        ) : (
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label={<T k="suites.samskara.ceremony.forWhom" en="For whom" />}>
              <select className={inputCls} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                <option value="">{t('suites.samskara.common.choose')}</option>
                {living.map((m: FamilyMember) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label={<T k="suites.samskara.ceremony.samskara" en="Samskara" />}>
              <select className={inputCls} value={samskaraId} onChange={(e) => setSamskaraId(e.target.value as SamskaraId)}>
                {SAMSKARAS.map((s) => <option key={s.id} value={s.id}>{s.transliteration} · {s.name}</option>)}
              </select>
            </Field>
            <div className="flex items-end">
              <Btn onClick={create} disabled={!memberId} className="w-full">
                {t('suites.samskara.ceremony.begin')}
              </Btn>
            </div>
          </div>
        )}
      </Card>

      <Card className="border-amber-100 bg-amber-50/40">
        <p className="text-xs text-amber-800/90 italic leading-relaxed">
          {t('suites.samskara.ceremony.philosophy')}
        </p>
      </Card>

      {sorted.length === 0 ? (
        <Empty text={t('suites.samskara.ceremony.empty')} />
      ) : (
        <div className="space-y-2">
          {sorted.map((p) => {
            const meta = samskaraMeta(p.samskaraId);
            const done = p.checklist.filter((c) => c.done).length;
            return (
              <div key={p.id} className="rounded-2xl border border-stone-200 bg-white p-4 flex items-center justify-between gap-3">
                <button onClick={() => setOpenPlan(p)} className="text-left min-w-0 flex-1 min-h-[44px]">
                  <div className="text-sm font-bold text-stone-800">{meta.transliteration} · {meta.name}</div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {memberName(p.memberId)}
                    {p.targetDate && ` · ${fmtDate(p.targetDate)}`}
                    {` · ${done}/${p.checklist.length} ${t('suites.samskara.ceremony.ready')}`}
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  {p.dakshinaPosted && <StatusPill status="posted" />}
                  <button onClick={() => setConfirmDelete(p)} className="min-w-[44px] min-h-[44px] rounded-xl bg-stone-100 hover:bg-red-100 text-stone-500 hover:text-red-600 text-sm font-bold px-2" aria-label={t('suites.samskara.common.delete')}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openPlan && <PlanDetail plan={openPlan} onClose={() => setOpenPlan(null)} />}
      {confirmDelete && (
        <Modal title={t('suites.samskara.common.confirmDelete')} onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-stone-600 mb-4">
            {t('suites.samskara.ceremony.deleteBody')}
          </p>
          <div className="flex gap-2">
            <Btn variant="danger" onClick={() => { remove('plans', confirmDelete.id); setConfirmDelete(null); }} className="flex-1">
              {t('suites.samskara.common.delete')}
            </Btn>
            <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>
              {t('suites.samskara.common.cancel')}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
