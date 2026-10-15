import React, { useState } from 'react';
import { useSamskara, uid, memberChronicle, ageYears } from './samskaraStore';
import { SamskaraId, SamskaraMeta, SamskaraRecord, SamskaraStatus, FamilyMember } from './types';
import { Card, Btn, Field, inputCls, Modal, Empty, StatusPill, fmtDate, T, useLocalMeta } from './ui';
import { useLanguage } from '../context/LanguageContext';

/* Samskara One — Samskaras. For each family member, the sixteen
 * samskaras in traditional order — a quiet chronicle of what has
 * been observed, what is planned, and what does not apply. */

const RecordForm: React.FC<{ member: FamilyMember; meta: SamskaraMeta; existing?: SamskaraRecord; onClose: () => void }> = ({
  member, meta, existing, onClose,
}) => {
  const { add, update } = useSamskara();
  const { t } = useLanguage();
  const loc = useLocalMeta();
  const lm = loc(meta);
  const [status, setStatus] = useState<SamskaraStatus>(existing?.status || 'completed');
  const [dateCompleted, setDateCompleted] = useState(existing?.dateCompleted || '');
  const [purohitName, setPurohitName] = useState(existing?.purohitName || '');
  const [location, setLocation] = useState(existing?.location || '');
  const [notes, setNotes] = useState(existing?.notes || '');

  const save = () => {
    const data = {
      status,
      dateCompleted: dateCompleted || undefined,
      purohitName: purohitName.trim() || undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    if (existing) {
      update('records', existing.id, data);
    } else {
      add('records', { id: uid('rec'), memberId: member.id, samskaraId: meta.id, ...data, createdAt: Date.now() });
    }
    onClose();
  };

  return (
    <Modal title={`${meta.name} · ${meta.transliteration}`} onClose={onClose}>
      <p className="text-xs text-stone-500 mb-1">{member.name} · {lm.timing}</p>
      <p className="text-sm text-stone-600 mb-4 italic">{lm.description}</p>
      <div className="space-y-3">
        <Field label={<T k="suites.samskara.samskaras.statusLabel" en="Status" />}>
          <div className="grid grid-cols-3 gap-2">
            {(['completed', 'planned', 'not-applicable'] as SamskaraStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition min-h-[44px] ${
                  status === s ? 'bg-rose-800 text-rose-50 border-rose-900' : 'bg-white text-stone-600 border-stone-200'
                }`}
              >
                {s === 'completed'
                  ? t('suites.samskara.record.completed')
                  : s === 'planned'
                    ? t('suites.samskara.record.planned')
                    : t('suites.samskara.record.notApplicable')}
              </button>
            ))}
          </div>
        </Field>
        {status === 'completed' && (
          <Field label={<T k="suites.samskara.record.dateObserved" en="Date observed" />}>
            <input type="date" className={inputCls} value={dateCompleted} onChange={(e) => setDateCompleted(e.target.value)} />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label={<T k="suites.samskara.record.purohit" en="Purohit" />}>
            <input className={inputCls} value={purohitName} onChange={(e) => setPurohitName(e.target.value)}
              placeholder={t('suites.samskara.record.purohitPh')} />
          </Field>
          <Field label={<T k="suites.samskara.record.place" en="Place" />}>
            <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="—" />
          </Field>
        </div>
        <Field label={<T k="suites.samskara.record.notes" en="Notes & memories" />}>
          <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder={t('suites.samskara.record.notesPh')} />
        </Field>
        <div className="flex gap-2 pt-1">
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

export const SamskarasTab: React.FC = () => {
  const { state, remove } = useSamskara();
  const { t } = useLanguage();
  const loc = useLocalMeta();
  const [memberId, setMemberId] = useState<string>('');
  const [editing, setEditing] = useState<{ meta: SamskaraMeta; existing?: SamskaraRecord } | null>(null);

  const living = state.members.filter((m) => m.isLiving);
  const selected: FamilyMember | undefined = living.find((m) => m.id === memberId) || living[0];
  const chronicle = selected ? memberChronicle(state, selected.id) : [];
  const doneCount = chronicle.filter((c) => c.record?.status === 'completed').length;

  if (living.length === 0) {
    return (
      <Empty text={t('suites.samskara.samskaras.noMembers')} />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <Field label={<T k="suites.samskara.samskaras.familyMember" en="Family member" />}>
          <select className={inputCls} value={selected?.id || ''} onChange={(e) => setMemberId(e.target.value)}>
            {living.map((m) => {
              const age = ageYears(m.birthDate);
              return <option key={m.id} value={m.id}>{m.name}{age >= 0 ? ` (${age})` : ''}</option>;
            })}
          </select>
        </Field>
        {selected && (
          <p className="text-xs text-stone-500 mt-2">
            {t('suites.samskara.samskaras.chronicleFor')}{' '}
            <span className="font-bold text-stone-700">{selected.name}</span>
            {' · '}{doneCount} {t('suites.samskara.samskaras.observed')}
          </p>
        )}
      </Card>

      <div className="space-y-2">
        {chronicle.map(({ meta, record }, idx) => {
          const lm = loc(meta);
          return (
            <button
              key={meta.id}
              onClick={() => selected && setEditing({ meta, existing: record })}
              className="w-full text-left rounded-2xl border border-stone-200 hover:border-rose-300 bg-white p-4 transition min-h-[44px]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-stone-400 w-6 shrink-0">{idx + 1}</span>
                    <span className="text-base font-bold text-stone-800">{meta.name}</span>
                    <span className="text-xs text-stone-500">{meta.transliteration}</span>
                  </div>
                  <div className="text-xs text-stone-500 mt-1 ml-8">{lm.timing}</div>
                  {record?.status === 'completed' && (
                    <div className="text-xs text-stone-600 mt-1 ml-8">
                      {record.dateCompleted && <span className="mr-2">🪔 {fmtDate(record.dateCompleted)}</span>}
                      {record.purohitName && <span className="mr-2">· {record.purohitName}</span>}
                      {record.location && <span>· {record.location}</span>}
                      {record.notes && <div className="italic text-stone-500 mt-0.5">“{record.notes}”</div>}
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  {record ? <StatusPill status={record.status} /> : (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-stone-50 text-stone-400 border border-stone-200">
                      —
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-stone-400 italic text-center px-4">
        {t('suites.samskara.samskaras.footnote')}
      </p>

      {editing && selected && (
        <RecordForm
          member={selected}
          meta={editing.meta}
          existing={editing.existing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
};
