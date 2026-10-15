import React, { useState } from 'react';
import { useSamskara, uid, nextMonthDay, daysUntil } from './samskaraStore';
import { Ancestor } from './types';
import { Card, Btn, Field, inputCls, Modal, Empty, fmtDate, fmtMonthDay, T, useTr } from './ui';
import { useLanguage } from '../context/LanguageContext';

/* Samskara One — Pitra. Ancestor records and annual shraddha
 * remembrance, kept with tenderness. This is a memorial, not a
 * database — every word here should feel like a folded hand. */

const AncestorForm: React.FC<{ familyId: string; families: Array<{ id: string; name: string }>; initial?: Ancestor; onClose: () => void }> = ({
  familyId, families, initial, onClose,
}) => {
  const { add, update } = useSamskara();
  const { t } = useLanguage();
  const [famId, setFamId] = useState(initial?.familyId || familyId);
  const [name, setName] = useState(initial?.name || '');
  const [relation, setRelation] = useState(initial?.relation || '');
  const [deathDate, setDeathDate] = useState(initial?.deathDate || '');
  const [shraddhaMonthDay, setShraddhaMonthDay] = useState(initial?.shraddhaMonthDay || '');
  const [deathTithiNote, setDeathTithiNote] = useState(initial?.deathTithiNote || '');
  const [notes, setNotes] = useState(initial?.notes || '');

  const save = () => {
    if (!name.trim() || !famId) return;
    const data = {
      familyId: famId,
      name: name.trim(),
      relation: relation.trim(),
      deathDate: deathDate || undefined,
      shraddhaMonthDay: shraddhaMonthDay || undefined,
      deathTithiNote: deathTithiNote.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    if (initial) {
      update('ancestors', initial.id, data);
    } else {
      add('ancestors', { id: uid('pitra'), ...data, createdAt: Date.now() });
    }
    onClose();
  };

  return (
    <Modal title={initial
      ? t('suites.samskara.pitra.edit')
      : t('suites.samskara.pitra.new')} onClose={onClose}>
      <div className="space-y-3">
        {families.length > 1 && (
          <Field label={<T k="suites.samskara.common.family" en="Family" />}>
            <select className={inputCls} value={famId} onChange={(e) => setFamId(e.target.value)}>
              {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </Field>
        )}
        <Field label={<T k="suites.samskara.pitra.name" en="Name" />}>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)}
            placeholder={t('suites.samskara.pitra.namePh')} />
        </Field>
        <Field label={<T k="suites.samskara.pitra.relationship" en="Relationship" />}>
          <input className={inputCls} value={relation} onChange={(e) => setRelation(e.target.value)}
            placeholder={t('suites.samskara.pitra.relationPh')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={<T k="suites.samskara.pitra.departedLabel" en="Departed on" />}>
            <input type="date" className={inputCls} value={deathDate} onChange={(e) => setDeathDate(e.target.value)} />
          </Field>
          <Field label={<T k="suites.samskara.pitra.shraddhaLabel" en="Annual shraddha (month–day)" />}>
            <input type="text" className={inputCls} value={shraddhaMonthDay} onChange={(e) => setShraddhaMonthDay(e.target.value)}
              placeholder="MM-DD" pattern="\d{2}-\d{2}" />
          </Field>
        </div>
        <Field label={<T k="suites.samskara.pitra.tithiNoteLabel" en="Tithi note" />}>
          <input className={inputCls} value={deathTithiNote} onChange={(e) => setDeathTithiNote(e.target.value)}
            placeholder={t('suites.samskara.pitra.tithiPh')} />
        </Field>
        <Field label={<T k="suites.samskara.pitra.memories" en="Memories" />}>
          <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder={t('suites.samskara.pitra.notesPh')} />
        </Field>
        <p className="text-[11px] text-stone-400 italic">
          {t('suites.samskara.pitra.tithiNote')}
        </p>
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

export const PitraTab: React.FC = () => {
  const { state, remove } = useSamskara();
  const { t } = useLanguage();
  const tr = useTr();
  const [showForm, setShowForm] = useState(false);
  const [editAncestor, setEditAncestor] = useState<Ancestor | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Ancestor | null>(null);

  const sorted = [...state.ancestors].sort((a, b) => (a.deathDate || '9999').localeCompare(b.deathDate || '9999'));

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-b from-stone-50 to-amber-50/40 border-amber-100">
        <p className="text-sm text-stone-600 italic leading-relaxed text-center">
          ॥ पितृदेवो भव ॥<br />
          <span className="text-xs not-italic">
            {t('suites.samskara.pitra.blessing')}
          </span>
        </p>
      </Card>

      <div className="flex justify-end">
        <Btn onClick={() => setShowForm(true)} disabled={state.families.length === 0}>
          + {t('suites.samskara.pitra.new')}
        </Btn>
      </div>

      {state.families.length === 0 && (
        <Empty text={t('suites.samskara.pitra.noFamily')} />
      )}

      {state.families.length > 0 && sorted.length === 0 && (
        <Empty text={t('suites.samskara.pitra.empty')} />
      )}

      <div className="space-y-3">
        {sorted.map((a) => {
          const next = a.shraddhaMonthDay ? nextMonthDay(a.shraddhaMonthDay) : null;
          const inDays = next ? daysUntil(next) : null;
          const familyName = state.families.find((f) => f.id === a.familyId)?.name;
          return (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-base font-bold text-stone-800">🪔 {a.name}</div>
                  {a.relation && <div className="text-xs text-stone-500 mt-0.5">{a.relation}</div>}
                  <div className="text-xs text-stone-500 mt-1 space-y-0.5">
                    {a.deathDate && <div>{t('suites.samskara.pitra.departed')}: {fmtDate(a.deathDate)}</div>}
                    {a.shraddhaMonthDay && (
                      <div>
                        {t('suites.samskara.pitra.shraddha')}: {fmtMonthDay(a.shraddhaMonthDay)}
                        {inDays !== null && inDays <= 30 && (
                          <span className="ml-2 font-bold text-amber-700">
                            · {inDays === 0
                              ? t('suites.samskara.pitra.today')
                              : inDays === 1
                                ? t('suites.samskara.pitra.inOneDay')
                                : tr('suites.samskara.pitra.inDays', { days: inDays })}
                          </span>
                        )}
                      </div>
                    )}
                    {a.deathTithiNote && <div className="italic">{a.deathTithiNote}</div>}
                    {familyName && <div className="text-stone-400">{familyName}</div>}
                  </div>
                  {a.notes && <p className="text-xs text-stone-600 italic mt-2 leading-relaxed">“{a.notes}”</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditAncestor(a)} className="min-w-[44px] min-h-[44px] rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm font-bold px-2" aria-label={t('suites.samskara.common.edit')}>✎</button>
                  <button onClick={() => setConfirmDelete(a)} className="min-w-[44px] min-h-[44px] rounded-xl bg-stone-100 hover:bg-red-100 text-stone-500 hover:text-red-600 text-sm font-bold px-2" aria-label={t('suites.samskara.common.delete')}>🗑</button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {showForm && state.families[0] && (
        <AncestorForm familyId={state.families[0].id} families={state.families} onClose={() => setShowForm(false)} />
      )}
      {editAncestor && (
        <AncestorForm familyId={editAncestor.familyId} families={state.families} initial={editAncestor} onClose={() => setEditAncestor(null)} />
      )}
      {confirmDelete && (
        <Modal title={t('suites.samskara.common.confirmDelete')} onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-stone-600 mb-4">
            {t('suites.samskara.pitra.deleteBody')}
            <span className="block mt-2 font-bold text-stone-800">🪔 {confirmDelete.name}</span>
          </p>
          <div className="flex gap-2">
            <Btn variant="danger" onClick={() => { remove('ancestors', confirmDelete.id); setConfirmDelete(null); }} className="flex-1">
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
