import React, { useState } from 'react';
import { useSamskara, uid, nextMonthDay, daysUntil } from './samskaraStore';
import { Ancestor } from './types';
import { Card, Btn, Field, inputCls, Modal, Empty, fmtDate, fmtMonthDay, T } from './ui';
import { useLanguage } from '../context/LanguageContext';

/* Samskara One — Pitra. Ancestor records and annual shraddha
 * remembrance, kept with tenderness. This is a memorial, not a
 * database — every word here should feel like a folded hand. */

const AncestorForm: React.FC<{ familyId: string; families: Array<{ id: string; name: string }>; initial?: Ancestor; onClose: () => void }> = ({
  familyId, families, initial, onClose,
}) => {
  const { add, update } = useSamskara();
  const { safeTranslate } = useLanguage();
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
      ? safeTranslate('samskara.pitra.edit', 'Remember with care', 'যত্নে স্মরণ করুন', 'स्नेह से स्मरण करें')
      : safeTranslate('samskara.pitra.new', 'Add an ancestor to remember', 'স্মরণীয় পূর্বপুরুষ যোগ করুন', 'स्मरणीय पूर्वज जोड़ें')} onClose={onClose}>
      <div className="space-y-3">
        {families.length > 1 && (
          <Field label={<T en="Family" bn="পরিবার" hi="परिवार" />}>
            <select className={inputCls} value={famId} onChange={(e) => setFamId(e.target.value)}>
              {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </Field>
        )}
        <Field label={<T en="Name" bn="নাম" hi="नाम" />}>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)}
            placeholder={safeTranslate('samskara.pitra.namePh', 'Name as the family remembers them', 'পরিবার যেভাবে স্মরণ করে', 'परिवार जैसे स्मरण करता है')} />
        </Field>
        <Field label={<T en="Relationship" bn="সম্পর্ক" hi="संबंध" />}>
          <input className={inputCls} value={relation} onChange={(e) => setRelation(e.target.value)}
            placeholder={safeTranslate('samskara.pitra.relationPh', 'e.g. Paternal grandfather', 'যেমন পিতামহ', 'जैसे दादाजी')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={<T en="Departed on" bn="প্রয়াণ তারিখ" hi="प्रयाण तिथि" />}>
            <input type="date" className={inputCls} value={deathDate} onChange={(e) => setDeathDate(e.target.value)} />
          </Field>
          <Field label={<T en="Annual shraddha (month–day)" bn="বার্ষিক শ্রাদ্ধ" hi="वार्षिक श्राद्ध" />}>
            <input type="text" className={inputCls} value={shraddhaMonthDay} onChange={(e) => setShraddhaMonthDay(e.target.value)}
              placeholder="MM-DD" pattern="\d{2}-\d{2}" />
          </Field>
        </div>
        <Field label={<T en="Tithi note" bn="তিথি নোট" hi="तिथि टिप्पणी" />}>
          <input className={inputCls} value={deathTithiNote} onChange={(e) => setDeathTithiNote(e.target.value)}
            placeholder={safeTranslate('samskara.pitra.tithiPh', 'e.g. Ashwin Krishna Paksha — confirm yearly with purohit', 'যেমন আশ্বিন কৃষ্ণপক্ষ — প্রতি বছর পুরোহিতের সঙ্গে নিশ্চিত করুন', 'जैसे आश्विन कृष्ण पक्ष — प्रतिवर्ष पुरोहित से पुष्टि करें')} />
        </Field>
        <Field label={<T en="Memories" bn="স্মৃতি" hi="स्मृतियां" />}>
          <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder={safeTranslate('samskara.pitra.notesPh', 'What the family wishes to remember…', 'পরিবার যা মনে রাখতে চায়…', 'परिवार जो याद रखना चाहता है…')} />
        </Field>
        <p className="text-[11px] text-stone-400 italic">
          {safeTranslate(
            'samskara.pitra.tithiNote',
            'Shraddha follows the lunar tithi, which shifts each year. Please confirm the exact date with your family purohit annually.',
            'শ্রাদ্ধ চান্দ্র তিথি অনুসরণ করে, যা প্রতি বছর বদলায়। প্রতি বছর পারিবারিক পুরোহিতের সঙ্গে সঠিক তারিখ নিশ্চিত করুন।',
            'श्राद्ध चंद्र तिथि का पालन करता है, जो प्रतिवर्ष बदलती है। कृपया प्रतिवर्ष अपने पारिवारिक पुरोहित से सही तिथि पुष्टि करें।'
          )}
        </p>
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

export const PitraTab: React.FC = () => {
  const { state, remove } = useSamskara();
  const { safeTranslate } = useLanguage();
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
            {safeTranslate(
              'samskara.pitra.blessing',
              'Those who came before us live on in our remembrance. Keep their names gently.',
              'যারা আমাদের আগে এসেছিলেন তারা আমাদের স্মরণে বেঁচে আছেন। তাদের নাম যত্নে রাখুন।',
              'जो हमसे पहले आए वे हमारी स्मृति में जीवित हैं। उनके नाम स्नेह से रखें।'
            )}
          </span>
        </p>
      </Card>

      <div className="flex justify-end">
        <Btn onClick={() => setShowForm(true)} disabled={state.families.length === 0}>
          + {safeTranslate('samskara.pitra.new', 'Add an ancestor to remember', 'স্মরণীয় পূর্বপুরুষ যোগ করুন', 'स्मरणीय पूर्वज जोड़ें')}
        </Btn>
      </div>

      {state.families.length === 0 && (
        <Empty text={safeTranslate(
          'samskara.pitra.noFamily',
          'Create a family first — ancestors are remembered within a family.',
          'প্রথমে একটি পরিবার তৈরি করুন — পূর্বপুরুষদের পরিবারের মধ্যে স্মরণ করা হয়।',
          'पहले एक परिवार बनाएं — पूर्वजों का स्मरण परिवार के भीतर होता है।'
        )} />
      )}

      {state.families.length > 0 && sorted.length === 0 && (
        <Empty text={safeTranslate(
          'samskara.pitra.empty',
          'No ancestors recorded yet. Their names, and the days the family remembers them, can rest here.',
          'এখনো কোনো পূর্বপুরুষ লিপিবদ্ধ নেই। তাদের নাম, এবং পরিবার যেদিন তাদের স্মরণ করে, এখানে থাকতে পারে।',
          'अभी कोई पूर्वज अंकित नहीं हैं। उनके नाम, और वे दिन जब परिवार उन्हें स्मरण करता है, यहाँ रह सकते हैं।'
        )} />
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
                    {a.deathDate && <div>{safeTranslate('samskara.pitra.departed', 'Departed', 'প্রয়াণ', 'प्रयाण')}: {fmtDate(a.deathDate)}</div>}
                    {a.shraddhaMonthDay && (
                      <div>
                        {safeTranslate('samskara.pitra.shraddhaOn', 'Shraddha', 'শ্রাদ্ধ', 'श्राद्ध')}: {fmtMonthDay(a.shraddhaMonthDay)}
                        {inDays !== null && inDays <= 30 && (
                          <span className="ml-2 font-bold text-amber-700">
                            · {inDays === 0
                              ? safeTranslate('samskara.pitra.today', 'today', 'আজ', 'आज')
                              : safeTranslate('samskara.pitra.inDays', `in ${inDays} days`, `${inDays} দিনে`, `${inDays} दिनों में`)}
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
                  <button onClick={() => setEditAncestor(a)} className="min-w-[44px] min-h-[44px] rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm font-bold px-2" aria-label="Edit">✎</button>
                  <button onClick={() => setConfirmDelete(a)} className="min-w-[44px] min-h-[44px] rounded-xl bg-stone-100 hover:bg-red-100 text-stone-500 hover:text-red-600 text-sm font-bold px-2" aria-label="Delete">🗑</button>
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
        <Modal title={safeTranslate('samskara.common.confirmDelete', 'Remove this record?', 'এই রেকর্ড মুছবেন?', 'यह रिकॉर्ड हटाएं?')} onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-stone-600 mb-4">
            {safeTranslate('samskara.pitra.deleteBody', 'This memorial will be quietly removed from this device. Please be certain.', 'এই স্মৃতি এই ডিভাইস থেকে নীরবে মুছে যাবে। নিশ্চিত হোন।', 'यह स्मृति इस डिवाइस से शांति से हट जाएगी। कृपया निश्चिंत हों।')}
            <span className="block mt-2 font-bold text-stone-800">🪔 {confirmDelete.name}</span>
          </p>
          <div className="flex gap-2">
            <Btn variant="danger" onClick={() => { remove('ancestors', confirmDelete.id); setConfirmDelete(null); }} className="flex-1">
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
