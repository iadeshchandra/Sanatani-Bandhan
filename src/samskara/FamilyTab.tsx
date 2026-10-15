import React, { useState } from 'react';
import { useSamskara, uid, familyMembers, ageYears } from './samskaraStore';
import { Family, FamilyMember, Relation, RELATIONS } from './types';
import { Card, Btn, Field, inputCls, Modal, Empty, fmtDate, T } from './ui';
import { useLanguage } from '../context/LanguageContext';

/* Samskara One — Family. Create family units, add members across
 * generations with birth dates, relationships and gotra. */

const FamilyForm: React.FC<{ initial?: Family; onClose: () => void }> = ({ initial, onClose }) => {
  const { add, update } = useSamskara();
  const { t } = useLanguage();
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
      ? t('suites.samskara.family.edit')
      : t('suites.samskara.family.new')} onClose={onClose}>
      <div className="space-y-3">
        <Field label={<T k="suites.samskara.family.name" en="Family name" />}>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)}
            placeholder={t('suites.samskara.family.namePh')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={<T k="suites.samskara.common.gotra" en="Gotra" />}>
            <input className={inputCls} value={gotra} onChange={(e) => setGotra(e.target.value)} placeholder="—" />
          </Field>
          <Field label={<T k="suites.samskara.family.kuladevata" en="Kuladevata" />}>
            <input className={inputCls} value={kuladevata} onChange={(e) => setKuladevata(e.target.value)} placeholder="—" />
          </Field>
        </div>
        <Field label={<T k="suites.samskara.family.ancestralPlace" en="Ancestral place (Mool Sthan)" />}>
          <input className={inputCls} value={moolSthan} onChange={(e) => setMoolSthan(e.target.value)} placeholder="—" />
        </Field>
        <Field label={<T k="suites.samskara.common.notes" en="Notes" />}>
          <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex gap-2 pt-1">
          <Btn onClick={save} disabled={!name.trim()} className="flex-1">
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

const MemberForm: React.FC<{ familyId: string; initial?: FamilyMember; onClose: () => void }> = ({ familyId, initial, onClose }) => {
  const { add, update } = useSamskara();
  const { t } = useLanguage();
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
      ? t('suites.samskara.member.edit')
      : t('suites.samskara.member.new')} onClose={onClose}>
      <div className="space-y-3">
        <Field label={<T k="suites.samskara.member.name" en="Name" />}>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={<T k="suites.samskara.member.relationship" en="Relationship" />}>
            <select className={inputCls} value={relation} onChange={(e) => setRelation(e.target.value as Relation)}>
              {RELATIONS.map((r) => <option key={r} value={r}>{t(`suites.samskara.relations.${r}`)}</option>)}
            </select>
          </Field>
          <Field label={<T k="suites.samskara.member.gender" en="Gender" />}>
            <select className={inputCls} value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other')}>
              <option value="male">{t('suites.samskara.member.male')}</option>
              <option value="female">{t('suites.samskara.member.female')}</option>
              <option value="other">{t('suites.samskara.member.other')}</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={<T k="suites.samskara.member.birthDate" en="Birth date" />}>
            <input type="date" className={inputCls} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </Field>
          <Field label={<T k="suites.samskara.common.gotra" en="Gotra" />}>
            <input className={inputCls} value={gotra} onChange={(e) => setGotra(e.target.value)} placeholder="—" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-stone-700 min-h-[44px]">
          <input type="checkbox" checked={isLiving} onChange={(e) => setIsLiving(e.target.checked)} className="w-5 h-5 accent-rose-700" />
          {t('suites.samskara.member.living')}
        </label>
        <Field label={<T k="suites.samskara.common.notes" en="Notes" />}>
          <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex gap-2 pt-1">
          <Btn onClick={save} disabled={!name.trim()} className="flex-1">
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

export const FamilyTab: React.FC = () => {
  const { state, remove } = useSamskara();
  const { t } = useLanguage();
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
          + {t('suites.samskara.family.new')}
        </Btn>
      </div>

      {state.families.length === 0 && (
        <Empty text={t('suites.samskara.family.empty')} />
      )}

      {state.families.map((f) => {
        const members = familyMembers(state, f.id);
        return (
          <Card key={f.id}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <h3 className="font-bold text-lg text-stone-800">{f.name}</h3>
                <div className="text-xs text-stone-500 mt-0.5">
                  {f.gotra && <span className="mr-3">{t('suites.samskara.common.gotra')}: {f.gotra}</span>}
                  {f.kuladevata && <span className="mr-3">{t('suites.samskara.family.kuladevata')}: {f.kuladevata}</span>}
                  {f.moolSthan && <span>{f.moolSthan}</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditFamily(f)} className="min-w-[44px] min-h-[44px] rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm font-bold px-2" aria-label={t('suites.samskara.common.edit')}>✎</button>
                <button onClick={() => setConfirmDelete({ kind: 'family', id: f.id, name: f.name })} className="min-w-[44px] min-h-[44px] rounded-xl bg-stone-100 hover:bg-red-100 text-stone-500 hover:text-red-600 text-sm font-bold px-2" aria-label={t('suites.samskara.common.delete')}>🗑</button>
              </div>
            </div>

            {members.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">
                {t('suites.samskara.family.noMembers')}
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
                          {t(`suites.samskara.relations.${m.relation}`)}
                          {age >= 0 && ` · ${age} ${t('suites.samskara.member.yrs')}`}
                          {m.birthDate && ` · ${fmtDate(m.birthDate)}`}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => setEditMember(m)} className="min-w-[44px] min-h-[44px] rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm font-bold px-2" aria-label={t('suites.samskara.common.edit')}>✎</button>
                        <button onClick={() => setConfirmDelete({ kind: 'member', id: m.id, name: m.name })} className="min-w-[44px] min-h-[44px] rounded-xl bg-stone-100 hover:bg-red-100 text-stone-500 hover:text-red-600 text-sm font-bold px-2" aria-label={t('suites.samskara.common.delete')}>🗑</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Btn variant="ghost" className="mt-3 w-full" onClick={() => setMemberFor(f.id)}>
              + {t('suites.samskara.member.new')}
            </Btn>
          </Card>
        );
      })}

      {showFamilyForm && <FamilyForm onClose={() => setShowFamilyForm(false)} />}
      {editFamily && <FamilyForm initial={editFamily} onClose={() => setEditFamily(null)} />}
      {memberFor && <MemberForm familyId={memberFor} onClose={() => setMemberFor(null)} />}
      {editMember && <MemberForm familyId={editMember.familyId} initial={editMember} onClose={() => setEditMember(null)} />}

      {confirmDelete && (
        <Modal title={t('suites.samskara.common.confirmDelete')} onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-stone-600 mb-4">
            {t('suites.samskara.common.confirmDeleteBody')}
            <span className="block mt-2 font-bold text-stone-800">{confirmDelete.name}</span>
          </p>
          <div className="flex gap-2">
            <Btn variant="danger" onClick={doDelete} className="flex-1">
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
