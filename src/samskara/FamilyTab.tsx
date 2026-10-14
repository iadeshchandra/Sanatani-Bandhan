import React, { useState } from 'react';
import { useSamskara, uid, familyMembers, ageYears } from './samskaraStore';
import { Family, FamilyMember, Relation, RELATIONS, RELATION_LABEL } from './types';
import { Card, Btn, Field, inputCls, Modal, Empty, fmtDate, T } from './ui';
import { useLanguage } from '../context/LanguageContext';

/* Samskara One — Family. Create family units, add members across
 * generations with birth dates, relationships and gotra. */

const FamilyForm: React.FC<{ initial?: Family; onClose: () => void }> = ({ initial, onClose }) => {
  const { add, update } = useSamskara();
  const { safeTranslate } = useLanguage();
  const [name, setName] = useState(initial?.name || '');
  const [gotra, setGotra] = useState(initial?.gotra || '');
  const [kuladevata, setKuladevata] = useState(initial?.kuladevata || '');
  const [moolSthan, setMoolSthan] = useState(initial?.moolSthan || '');
  const [notes, setNotes] = useState(initial?.notes || '');

  const save = () => {
    if (!name.trim()) return;
    if (initial) {
      update('families', initial.id, { name: name.trim(), gotra: gotra.trim(), kuladevata: kuladevata.trim(), moolSthan: moolSthan.trim(), notes: notes.trim() });
    } else {
      add('families', { id: uid('fam'), name: name.trim(), gotra: gotra.trim(), kuladevata: kuladevata.trim(), moolSthan: moolSthan.trim(), notes: notes.trim(), createdAt: Date.now() });
    }
    onClose();
  };

  return (
    <Modal title={initial
      ? safeTranslate('samskara.family.edit', 'Edit family', 'পরিবার সম্পাদনা', 'परिवार संपादित करें')
      : safeTranslate('samskara.family.new', 'New family', 'নতুন পরিবার', 'नया परिवार')} onClose={onClose}>
      <div className="space-y-3">
        <Field label={<T en="Family name" bn="পরিবারের নাম" hi="परिवार का नाम" />}>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)}
            placeholder={safeTranslate('samskara.family.namePh', 'e.g. Sharma Parivar', 'যেমন শর্মা পরিবার', 'जैसे शर्मा परिवार')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={<T en="Gotra" bn="গোত্র" hi="गोत्र" />}>
            <input className={inputCls} value={gotra} onChange={(e) => setGotra(e.target.value)} placeholder="—" />
          </Field>
          <Field label={<T en="Kuladevata" bn="কুলদেবতা" hi="कुलदेवता" />}>
            <input className={inputCls} value={kuladevata} onChange={(e) => setKuladevata(e.target.value)} placeholder="—" />
          </Field>
        </div>
        <Field label={<T en="Ancestral place (Mool Sthan)" bn="পৈতৃক স্থান" hi="पैतृक स्थान" />}>
          <input className={inputCls} value={moolSthan} onChange={(e) => setMoolSthan(e.target.value)} placeholder="—" />
        </Field>
        <Field label={<T en="Notes" bn="নোট" hi="टिप्पणी" />}>
          <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex gap-2 pt-1">
          <Btn onClick={save} disabled={!name.trim()} className="flex-1">
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

const MemberForm: React.FC<{ familyId: string; initial?: FamilyMember; onClose: () => void }> = ({ familyId, initial, onClose }) => {
  const { add, update } = useSamskara();
  const { safeTranslate } = useLanguage();
  const [name, setName] = useState(initial?.name || '');
  const [relation, setRelation] = useState<Relation>(initial?.relation || 'other');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(initial?.gender || 'other');
  const [birthDate, setBirthDate] = useState(initial?.birthDate || '');
  const [isLiving, setIsLiving] = useState(initial?.isLiving ?? true);
  const [gotra, setGotra] = useState(initial?.gotra || '');
  const [notes, setNotes] = useState(initial?.notes || '');

  const save = () => {
    if (!name.trim()) return;
    const data = {
      name: name.trim(), relation, gender,
      birthDate: birthDate || undefined, isLiving,
      gotra: gotra.trim() || undefined, notes: notes.trim() || undefined,
    };
    if (initial) {
      update('members', initial.id, data);
    } else {
      add('members', { id: uid('mem'), familyId, ...data, createdAt: Date.now() });
    }
    onClose();
  };

  return (
    <Modal title={initial
      ? safeTranslate('samskara.member.edit', 'Edit member', 'সদস্য সম্পাদনা', 'सदस्य संपादित करें')
      : safeTranslate('samskara.member.new', 'Add family member', 'পরিবারের সদস্য যোগ করুন', 'परिवार का सदस्य जोड़ें')} onClose={onClose}>
      <div className="space-y-3">
        <Field label={<T en="Name" bn="নাম" hi="नाम" />}>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={<T en="Relationship" bn="সম্পর্ক" hi="संबंध" />}>
            <select className={inputCls} value={relation} onChange={(e) => setRelation(e.target.value as Relation)}>
              {RELATIONS.map((r) => <option key={r} value={r}>{RELATION_LABEL[r]}</option>)}
            </select>
          </Field>
          <Field label={<T en="Gender" bn="লিঙ্গ" hi="लिंग" />}>
            <select className={inputCls} value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other')}>
              <option value="male">{safeTranslate('samskara.member.male', 'Male', 'পুরুষ', 'पुरुष')}</option>
              <option value="female">{safeTranslate('samskara.member.female', 'Female', 'মহিলা', 'महिला')}</option>
              <option value="other">{safeTranslate('samskara.member.other', 'Other', 'অন্যান্য', 'अन्य')}</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={<T en="Birth date" bn="জন্ম তারিখ" hi="जन्म तिथि" />}>
            <input type="date" className={inputCls} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </Field>
          <Field label={<T en="Gotra" bn="গোত্র" hi="गोत्र" />}>
            <input className={inputCls} value={gotra} onChange={(e) => setGotra(e.target.value)} placeholder="—" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-stone-700 min-h-[44px]">
          <input type="checkbox" checked={isLiving} onChange={(e) => setIsLiving(e.target.checked)} className="w-5 h-5 accent-rose-700" />
          {safeTranslate('samskara.member.living', 'Living', 'জীবিত', 'जीवित')}
        </label>
        <Field label={<T en="Notes" bn="নোট" hi="टिप्पणी" />}>
          <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex gap-2 pt-1">
          <Btn onClick={save} disabled={!name.trim()} className="flex-1">
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

export const FamilyTab: React.FC = () => {
  const { state, remove } = useSamskara();
  const { safeTranslate } = useLanguage();
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [editFamily, setEditFamily] = useState<Family | null>(null);
  const [memberFor, setMemberFor] = useState<string | null>(null);
  const [editMember, setEditMember] = useState<FamilyMember | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'family' | 'member'; id: string; name: string } | null>(null);

  const doDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.kind === 'family') {
      // Remove family and its members' related records quietly.
      state.members.filter((m) => m.familyId === confirmDelete.id).forEach((m) => {
        state.records.filter((r) => r.memberId === m.id).forEach((r) => remove('records', r.id));
        state.plans.filter((p) => p.memberId === m.id).forEach((p) => remove('plans', p.id));
        remove('members', m.id);
      });
      state.ancestors.filter((a) => a.familyId === confirmDelete.id).forEach((a) => remove('ancestors', a.id));
      remove('families', confirmDelete.id);
    } else {
      state.records.filter((r) => r.memberId === confirmDelete.id).forEach((r) => remove('records', r.id));
      state.plans.filter((p) => p.memberId === confirmDelete.id).forEach((p) => remove('plans', p.id));
      remove('members', confirmDelete.id);
    }
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Btn onClick={() => setShowFamilyForm(true)}>
          + {safeTranslate('samskara.family.new', 'New family', 'নতুন পরিবার', 'नया परिवार')}
        </Btn>
      </div>

      {state.families.length === 0 && (
        <Empty text={safeTranslate(
          'samskara.family.empty',
          'No families yet. Create your first family to begin the sacred chronicle.',
          'এখনো কোনো পরিবার নেই। পবিত্র ইতিহাস শুরু করতে প্রথম পরিবার তৈরি করুন।',
          'अभी कोई परिवार नहीं है। पवित्र वृत्तांत आरंभ करने के लिए पहला परिवार बनाएं।'
        )} />
      )}

      {state.families.map((f) => {
        const members = familyMembers(state, f.id);
        return (
          <Card key={f.id}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <h3 className="font-bold text-lg text-stone-800">{f.name}</h3>
                <div className="text-xs text-stone-500 mt-0.5">
                  {f.gotra && <span className="mr-3">{safeTranslate('samskara.family.gotra', 'Gotra', 'গোত্র', 'गोत्र')}: {f.gotra}</span>}
                  {f.kuladevata && <span className="mr-3">{safeTranslate('samskara.family.kuladevata', 'Kuladevata', 'কুলদেবতা', 'कुलदेवता')}: {f.kuladevata}</span>}
                  {f.moolSthan && <span>{f.moolSthan}</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditFamily(f)} className="min-w-[44px] min-h-[44px] rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm font-bold px-2" aria-label="Edit family">✎</button>
                <button onClick={() => setConfirmDelete({ kind: 'family', id: f.id, name: f.name })} className="min-w-[44px] min-h-[44px] rounded-xl bg-stone-100 hover:bg-red-100 text-stone-500 hover:text-red-600 text-sm font-bold px-2" aria-label="Delete family">🗑</button>
              </div>
            </div>

            {members.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">
                {safeTranslate('samskara.family.noMembers', 'No members yet — add the first.', 'এখনো সদস্য নেই — প্রথমজন যোগ করুন।', 'अभी कोई सदस्य नहीं — पहला जोड़ें।')}
              </p>
            ) : (
              <div className="divide-y divide-stone-100">
                {members.map((m) => {
                  const age = ageYears(m.birthDate);
                  return (
                    <div key={m.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-stone-800 truncate">
                          {m.name}
                          {!m.isLiving && <span className="ml-2 text-[11px] font-normal text-stone-400">॥ ॐ शान्तिः ॥</span>}
                        </div>
                        <div className="text-xs text-stone-500">
                          {RELATION_LABEL[m.relation]}
                          {age >= 0 && ` · ${age} ${safeTranslate('samskara.member.yrs', 'yrs', 'বছর', 'वर्ष')}`}
                          {m.birthDate && ` · ${fmtDate(m.birthDate)}`}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => setEditMember(m)} className="min-w-[44px] min-h-[44px] rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm font-bold px-2" aria-label="Edit member">✎</button>
                        <button onClick={() => setConfirmDelete({ kind: 'member', id: m.id, name: m.name })} className="min-w-[44px] min-h-[44px] rounded-xl bg-stone-100 hover:bg-red-100 text-stone-500 hover:text-red-600 text-sm font-bold px-2" aria-label="Delete member">🗑</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Btn variant="ghost" className="mt-3 w-full" onClick={() => setMemberFor(f.id)}>
              + {safeTranslate('samskara.member.new', 'Add family member', 'পরিবারের সদস্য যোগ করুন', 'परिवार का सदस्य जोड़ें')}
            </Btn>
          </Card>
        );
      })}

      {showFamilyForm && <FamilyForm onClose={() => setShowFamilyForm(false)} />}
      {editFamily && <FamilyForm initial={editFamily} onClose={() => setEditFamily(null)} />}
      {memberFor && <MemberForm familyId={memberFor} onClose={() => setMemberFor(null)} />}
      {editMember && <MemberForm familyId={editMember.familyId} initial={editMember} onClose={() => setEditMember(null)} />}

      {confirmDelete && (
        <Modal title={safeTranslate('samskara.common.confirmDelete', 'Remove this record?', 'এই রেকর্ড মুছবেন?', 'यह रिकॉर्ड हटाएं?')} onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-stone-600 mb-4">
            {safeTranslate('samskara.common.confirmDeleteBody', 'This will quietly remove the record and its linked entries from this device. This cannot be undone.', 'এটি এই ডিভাইস থেকে রেকর্ড ও সংযুক্ত এন্ট্রি নীরবে মুছে দেবে। এটি পূর্বাবস্থায় ফেরানো যাবে না।', 'यह इस डिवाइस से रिकॉर्ड व जुड़ी प्रविष्टियां शांति से हटा देगा। इसे वापस नहीं लाया जा सकता।')}
            <span className="block mt-2 font-bold text-stone-800">{confirmDelete.name}</span>
          </p>
          <div className="flex gap-2">
            <Btn variant="danger" onClick={doDelete} className="flex-1">
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
