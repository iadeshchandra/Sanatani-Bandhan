/**
 * ChecklistOps — operational festival checklist (Pillar 2).
 * =====================================================================
 * The Panjika Intelligence role-aware checklists, wired into real
 * operations: each trustee task gets an assignee, a due date and a
 * done-state, persisted per org per festival (local + Firestore mirror
 * via the war-room plan). Overdue tasks surface at the top in a calm
 * "needs attention" tone — Suchana, not alarm.
 */
import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useUtsav } from '../../utsav/utsavStore';
import { T, Card, Btn, inputCls, fmtDate } from '../../utsav/ui';
import {
  type WarFestival, type WarRoomPlan, type ChecklistItemState,
  checklistDonePct, overdueChecklistItems, todayISO,
} from '../../lib/festival';
import type { FestivalChecklist } from '../../lib/festivalChecklists';

interface Props {
  wf: WarFestival;
  plan: WarRoomPlan;
  patch: (p: Partial<WarRoomPlan>) => void;
  template: FestivalChecklist;
}

export const ChecklistOps: React.FC<Props> = ({ wf, plan, patch, template }) => {
  const { safeTranslate } = useLanguage();
  const { state: utsav } = useUtsav();
  const [openId, setOpenId] = useState<string | null>(null);

  const tr = (l: { en: string; bn: string; hi: string }) => safeTranslate('festival.checklist', l.en, l.bn, l.hi);
  const items = template.items.filter((it) => it.role === 'trustee');
  const pct = checklistDonePct(template, plan.checklist);
  const overdue = overdueChecklistItems(template, plan.checklist);
  const today = todayISO();

  const setItem = (id: string, s: ChecklistItemState) =>
    patch({ checklist: { ...plan.checklist, [id]: s } });

  const toggleDone = (id: string) => {
    const cur = plan.checklist[id] || { done: false };
    setItem(id, { ...cur, done: !cur.done });
  };

  // Default due date suggestion: 7 days before the festival (or today if closer).
  const suggestedDue = ((): string => {
    const d = new Date(wf.dateISO + 'T12:00:00');
    d.setDate(d.getDate() - 7);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return iso < today ? today : iso;
  })();

  const ordered = [...items].sort((a, b) => {
    const ao = overdue.includes(a.id) ? 0 : 1;
    const bo = overdue.includes(b.id) ? 0 : 1;
    if (ao !== bo) return ao - bo;
    const ad = plan.checklist[a.id]?.done ? 1 : 0;
    const bd = plan.checklist[b.id]?.done ? 1 : 0;
    return ad - bd;
  });

  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-extrabold text-stone-800">
          <T en={template.name.en} bn={template.name.bn} hi={template.name.hi} />
        </h3>
        <span className="text-sm font-black text-orange-800">{pct}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden mb-3" role="img" aria-label={`${pct}% complete`}>
        <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all"
          style={{ width: `${pct}%` }} />
      </div>

      <ul className="space-y-2">
        {ordered.map((it) => {
          const s = plan.checklist[it.id] || { done: false };
          const isOverdue = overdue.includes(it.id);
          const open = openId === it.id;
          return (
            <li key={it.id}
              className={`rounded-xl border px-3 py-2 ${s.done ? 'bg-emerald-50/50 border-emerald-100' : isOverdue ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-stone-100'}`}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleDone(it.id)}
                  aria-label={s.done ? 'Mark not done' : 'Mark done'}
                  className={`w-11 h-11 shrink-0 rounded-xl border-2 flex items-center justify-center text-lg font-black transition ${
                    s.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-200 text-transparent hover:border-orange-400'
                  }`}>✓</button>
                <button className="flex-1 min-w-0 text-left min-h-[44px]" onClick={() => setOpenId(openId ? null : it.id)}>
                  <div className={`text-sm font-bold ${s.done ? 'line-through text-stone-400' : 'text-stone-800'}`}>{tr(it.text)}</div>
                  <div className="text-[11px] text-stone-400">
                    {s.assignee ? `👤 ${s.assignee}` : <T en="Unassigned" bn="দায়িত্বহীন" hi="असाइन नहीं" />}
                    {s.dueDate ? ` · 📅 ${fmtDate(s.dueDate)}` : ''}
                    {isOverdue && !s.done && (
                      <span className="ml-1.5 font-bold text-amber-700">
                        <T en="· needs attention" bn="· মনোযোগ দরকার" hi="· ध्यान चाहिए" />
                      </span>
                    )}
                  </div>
                </button>
              </div>
              {open && !s.done && (
                <div className="mt-2 grid grid-cols-2 gap-2 pl-13 ml-[52px]">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">
                      <T en="Assignee" bn="দায়িত্বপ্রাপ্ত" hi="प्रभारी" />
                    </label>
                    <div className="flex gap-1.5">
                      <input className={inputCls} placeholder={safeTranslate('festival.checklist.who', 'Name', 'নাম', 'नाम')}
                        value={s.assignee || ''} onChange={(e) => setItem(it.id, { ...s, assignee: e.target.value })} />
                    </div>
                    {utsav.members.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {utsav.members.slice(0, 5).map((m) => (
                          <button key={m.id}
                            className="text-[11px] px-2 py-1.5 min-h-[44px] rounded-lg bg-stone-50 border border-stone-200 text-stone-600"
                            onClick={() => setItem(it.id, { ...s, assignee: m.name })}>{m.name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">
                      <T en="Due date" bn="শেষ তারিখ" hi="अंतिम तिथि" />
                    </label>
                    <input type="date" className={inputCls}
                      value={s.dueDate || suggestedDue}
                      onChange={(e) => setItem(it.id, { ...s, dueDate: e.target.value })} />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex justify-end">
        <Btn variant="ghost" onClick={() => {
          const all: Record<string, ChecklistItemState> = { ...plan.checklist };
          items.forEach((it) => { if (!all[it.id]?.done && !all[it.id]?.dueDate) all[it.id] = { ...all[it.id], done: false, dueDate: suggestedDue }; });
          patch({ checklist: all });
        }}>
          <T en="Set suggested due dates" bn="প্রস্তাবিত তারিখ দিন" hi="सुझाई तिथियां लगाएं" />
        </Btn>
      </div>
    </Card>
  );
};

export default ChecklistOps;
