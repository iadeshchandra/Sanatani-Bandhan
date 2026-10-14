import React, { useState } from 'react';
import { useSamskara, uid, todayISO } from './samskaraStore';
import { CeremonyPlan, SamskaraId, SAMSKARAS, samskaraMeta, FamilyMember } from './types';
import { Card, Btn, Field, inputCls, Modal, Empty, StatusPill, fmtDate, T } from './ui';
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
  const { safeTranslate } = useLanguage();
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
          <Field label={<T en="Target date" bn="লক্ষ্য তারিখ" hi="लक्ष्य तिथि" />}>
            <input type="date" className={inputCls} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </Field>
          <Field label={<T en="Muhurat note" bn="মুহূর্ত নোট" hi="मुहूर्त टिप्पणी" />}>
            <input className={inputCls} value={muhuratNote} onChange={(e) => setMuhuratNote(e.target.value)}
              placeholder={safeTranslate('samskara.ceremony.muhuratPh', 'Confirm with purohit / jyotishi', 'পুরোহিত / জ্যোতিষীর সঙ্গে নিশ্চিত করুন', 'पुरोहित / ज्योतिषी से पुष्टि करें')} />
          </Field>
        </div>

        <div>
          <h4 className="text-sm font-bold text-stone-700 mb-2">
            {safeTranslate('samskara.ceremony.checklist', 'Preparation', 'প্রস্তুতি', 'तैयारी')}
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
              placeholder={safeTranslate('samskara.ceremony.addItem', 'Add a preparation step…', 'প্রস্তুতির ধাপ যোগ করুন…', 'तैयारी का चरण जोड़ें…')}
              onKeyDown={(e) => e.key === 'Enter' && addItem()} />
            <Btn variant="ghost" onClick={addItem}>+</Btn>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={<T en="Purohit" bn="পুরোহিত" hi="पुरोहित" />}>
            <input className={inputCls} value={purohitName} onChange={(e) => setPurohitName(e.target.value)} />
          </Field>
          <Field label={<T en="Purohit contact" bn="পুরোহিতের যোগাযোগ" hi="पुरोहित संपर्क" />}>
            <input className={inputCls} value={purohitContact} onChange={(e) => setPurohitContact(e.target.value)} placeholder="—" />
          </Field>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <h4 className="text-sm font-bold text-amber-900 mb-2">
            {safeTranslate('samskara.ceremony.dakshina', 'Dakshina', 'দক্ষিণা', 'दक्षिणा')}
          </h4>
          {plan.dakshinaPosted ? (
            <div className="flex items-center gap-2">
              <StatusPill status="posted" />
              <span className="text-xs text-stone-500">
                {safeTranslate('samskara.ceremony.postedNote', 'Posted to treasury with gratitude.', 'কৃতজ্ঞতার সঙ্গে কোষাগারে পোস্ট করা হয়েছে।', 'कृतज्ञता सहित कोषागार में दर्ज।')}
              </span>
            </div>
          ) : (
            <div className="flex gap-2">
              <input type="number" min="0" className={inputCls} value={dakshinaAmount}
                onChange={(e) => setDakshinaAmount(e.target.value)} placeholder="₹" />
              <Btn variant="ghost" onClick={postDakshina} disabled={!Number(dakshinaAmount)}>
                {safeTranslate('samskara.ceremony.post', 'Post to treasury', 'কোষাগারে পোস্ট করুন', 'कोषागार में दर्ज करें')}
              </Btn>
            </div>
          )}
          <p className="text-[11px] text-amber-700/80 italic mt-2">
            {safeTranslate(
              'samskara.ceremony.dakshinaNote',
              'Dakshina is an offering of gratitude, never a fee. Only post what has actually been given.',
              'দক্ষিণা কৃতজ্ঞতার নৈবেদ্য, কখনো ফি নয়। শুধুমাত্র যা প্রকৃতপক্ষে দেওয়া হয়েছে তাই পোস্ট করুন।',
              'दक्षिणा कृतज्ञता का अर्पण है, कभी शुल्क नहीं। केवल वही दर्ज करें जो वास्तव में दिया गया हो।'
            )}
          </p>
        </div>

        <Field label={<T en="Notes" bn="নোট" hi="टिप्पणी" />}>
          <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <div className="flex gap-2">
          <Btn onClick={save} className="flex-1">
            {safeTranslate('samskara.common.save', 'Save', 'সংরক্ষণ', 'सहेजें')}
          </Btn>
          <Btn variant="ghost" onClick={onClose}>
            {safeTranslate('samskara.common.cancel', 'Cancel', 'বাতিল', 'रद्द करें')}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};

export const CeremonyTab: React.FC = () => {
  const { state, newPlan, remove } = useSamskara();
  const { safeTranslate } = useLanguage();
  const [memberId, setMemberId] = useState('');
  const [samskaraId, setSamskaraId] = useState<SamskaraId>('upanayana');
  const [openPlan, setOpenPlan] = useState<CeremonyPlan | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CeremonyPlan | null>(null);

  const living = state.members.filter((m) => m.isLiving);
  const memberName = (id: string) => state.members.find((m) => m.id === id)?.name ?? '—';
  const sorted = [...state.plans].sort((a, b) => (a.targetDate || '9999').localeCompare(b.targetDate || '9999'));

  const create = () => {
    if (!memberId) return;
    const plan = newPlan(memberId, samskaraId);
    setOpenPlan(plan);
  };

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-bold text-stone-800 mb-3">
          {safeTranslate('samskara.ceremony.new', 'Plan a ceremony', 'অনুষ্ঠান পরিকল্পনা করুন', 'अनुष्ठान की योजना बनाएं')}
        </h3>
        {living.length === 0 ? (
          <p className="text-sm text-stone-400 italic">
            {safeTranslate('samskara.ceremony.noMembers', 'Add family members first.', 'প্রথমে পরিবারের সদস্য যোগ করুন।', 'पहले परिवार के सदस्य जोड़ें।')}
          </p>
        ) : (
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label={<T en="For whom" bn="কার জন্য" hi="किसके लिए" />}>
              <select className={inputCls} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                <option value="">{safeTranslate('samskara.common.choose', 'Choose…', 'বেছে নিন…', 'चुनें…')}</option>
                {living.map((m: FamilyMember) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label={<T en="Samskara" bn="সংস্কার" hi="संस्कार" />}>
              <select className={inputCls} value={samskaraId} onChange={(e) => setSamskaraId(e.target.value as SamskaraId)}>
                {SAMSKARAS.map((s) => <option key={s.id} value={s.id}>{s.transliteration} · {s.name}</option>)}
              </select>
            </Field>
            <div className="flex items-end">
              <Btn onClick={create} disabled={!memberId} className="w-full">
                {safeTranslate('samskara.ceremony.begin', 'Begin planning', 'পরিকল্পনা শুরু করুন', 'योजना आरंभ करें')}
              </Btn>
            </div>
          </div>
        )}
      </Card>

      <Card className="border-amber-100 bg-amber-50/40">
        <p className="text-xs text-amber-800/90 italic leading-relaxed">
          {safeTranslate(
            'samskara.ceremony.philosophy',
            'Dakshina is an offering of gratitude to the purohit and the divine — never a fee, never a transaction. Give what your heart and means allow.',
            'দক্ষিণা পুরোহিত ও দিব্যের প্রতি কৃতজ্ঞতার নৈবেদ্য — কখনো ফি নয়, কখনো লেনদেন নয়। আপনার হৃদয় ও সামর্থ্য অনুযায়ী দিন।',
            'दक्षिणा पुरोहित व दिव्य के प्रति कृतज्ञता का अर्पण है — कभी शुल्क नहीं, कभी लेनदेन नहीं। अपने हृदय व सामर्थ्य अनुसार दें।'
          )}
        </p>
      </Card>

      {sorted.length === 0 ? (
        <Empty text={safeTranslate(
          'samskara.ceremony.empty',
          'No ceremonies being planned. When a samskara approaches, its preparations can rest here.',
          'কোনো অনুষ্ঠান পরিকল্পনাধীন নেই। যখন সংস্কার আসন্ন হবে, তার প্রস্তুতি এখানে থাকতে পারে।',
          'कोई अनुष्ठान योजनाधीन नहीं है। जब संस्कार निकट आए, उसकी तैयारी यहाँ रह सकती है।'
        )} />
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
                    {` · ${done}/${p.checklist.length} ${safeTranslate('samskara.ceremony.ready', 'ready', 'প্রস্তুত', 'तैयार')}`}
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  {p.dakshinaPosted && <StatusPill status="posted" />}
                  <button onClick={() => setConfirmDelete(p)} className="min-w-[44px] min-h-[44px] rounded-xl bg-stone-100 hover:bg-red-100 text-stone-500 hover:text-red-600 text-sm font-bold px-2" aria-label="Delete plan">🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openPlan && <PlanDetail plan={openPlan} onClose={() => setOpenPlan(null)} />}
      {confirmDelete && (
        <Modal title={safeTranslate('samskara.common.confirmDelete', 'Remove this record?', 'এই রেকর্ড মুছবেন?', 'यह रिकॉर्ड हटाएं?')} onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-stone-600 mb-4">
            {safeTranslate('samskara.ceremony.deleteBody', 'This ceremony plan will be quietly removed from this device.', 'এই অনুষ্ঠান পরিকল্পনা এই ডিভাইস থেকে নীরবে মুছে যাবে।', 'यह अनुष्ठान योजना इस डिवाइस से शांति से हट जाएगी।')}
          </p>
          <div className="flex gap-2">
            <Btn variant="danger" onClick={() => { remove('plans', confirmDelete.id); setConfirmDelete(null); }} className="flex-1">
              {safeTranslate('samskara.common.delete', 'Remove', 'মুছুন', 'हटाएं')}
            </Btn>
            <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>
              {safeTranslate('samskara.common.cancel', 'Cancel', 'বাতিল', 'रद्द करें')}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
