/**
 * RosterCard — sevadar roster with gap highlighting (Pillar 2).
 * =====================================================================
 * Roles × shifts matrix. Each cell shows assigned / needed; amber = at
 * least half staffed, red = under half. Trustees assign from the committee
 * member list or type a volunteer name directly (many sevadars are not
 * committee members). All state lives on the war-room plan (offline-first).
 */
import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useUtsav } from '../../utsav/utsavStore';
import { T, Card, Btn, Field, inputCls } from '../../utsav/ui';
import {
  ROSTER_ROLES, ROSTER_SHIFTS,
  type WarFestival, type WarRoomPlan, type RosterGap, type RosterAssignment,
} from '../../lib/festival';

const uid = () => `ra_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

const cellTone = (g: RosterGap): string =>
  g.severity === 'ok'
    ? 'bg-emerald-50 border-emerald-200'
    : g.severity === 'amber'
      ? 'bg-amber-50 border-amber-300'
      : 'bg-red-50 border-red-200';

interface Props {
  wf: WarFestival;
  plan: WarRoomPlan;
  patch: (p: Partial<WarRoomPlan>) => void;
  gaps: RosterGap[];
}

export const RosterCard: React.FC<Props> = ({ plan, patch, gaps }) => {
  const { safeTranslate } = useLanguage();
  const { state: utsav } = useUtsav();
  const [editing, setEditing] = useState<string | null>(null); // `${roleId}:${shiftId}`
  const [name, setName] = useState('');

  const tr = (l: { en: string; bn: string; hi: string }) => safeTranslate('festival.roster', l.en, l.bn, l.hi);

  const addAssignment = (roleId: string, shiftId: string) => {
    const n = name.trim();
    if (!n) return;
    const a: RosterAssignment = { id: uid(), roleId, shiftId, memberName: n.slice(0, 60) };
    patch({ roster: [...plan.roster, a] });
    setName('');
  };

  const removeAssignment = (id: string) => patch({ roster: plan.roster.filter((a) => a.id !== id) });

  const setNeeded = (roleId: string, shiftId: string, v: number) =>
    patch({ rosterNeeded: { ...plan.rosterNeeded, [`${roleId}:${shiftId}`]: Math.max(0, v) } });

  const totalGap = gaps.reduce((s, g) => s + g.gap, 0);
  const redCells = gaps.filter((g) => g.severity === 'red').length;

  const gapFor = (roleId: string, shiftId: string) => gaps.find((g) => g.roleId === roleId && g.shiftId === shiftId)!;
  const assignedFor = (roleId: string, shiftId: string) =>
    plan.roster.filter((a) => a.roleId === roleId && a.shiftId === shiftId);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h3 className="font-extrabold text-stone-800">
            <T en="Sevadar roster" bn="সেবাদার তালিকা" hi="सेवादार सूची" />
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            {totalGap === 0 ? (
              <T en="Every shift is staffed. 🙏" bn="সব শিফটে সেবাদার আছে। 🙏" hi="हर शिफ्ट में सेवादार हैं। 🙏" />
            ) : (
              <T en={`${totalGap} open slot${totalGap > 1 ? 's' : ''} across the festival${redCells ? ` · ${redCells} need${redCells > 1 ? '' : 's'} attention` : ''}`}
                bn={`উৎসবে ${totalGap}টি খালি স্লট${redCells ? ` · ${redCells}টিতে মনোযোগ দরকার` : ''}`}
                hi={`उत्सव में ${totalGap} खाली स्लॉट${redCells ? ` · ${redCells} पर ध्यान चाहिए` : ''}`} />
            )}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-sm border-collapse min-w-[560px]">
          <thead>
            <tr>
              <th className="text-left text-xs font-bold text-stone-500 pb-2 pr-2">
                <T en="Role" bn="ভূমিকা" hi="भूमिका" />
              </th>
              {ROSTER_SHIFTS.map((s) => (
                <th key={s.id} className="text-center text-xs font-bold text-stone-500 pb-2 px-1">{tr(s.name)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROSTER_ROLES.map((r) => (
              <tr key={r.id} className="border-t border-stone-100">
                <td className="py-2 pr-2 font-bold text-stone-700 text-[13px]">{tr(r.name)}</td>
                {ROSTER_SHIFTS.map((s) => {
                  const g = gapFor(r.id, s.id);
                  const list = assignedFor(r.id, s.id);
                  const key = `${r.id}:${s.id}`;
                  const open = editing === key;
                  return (
                    <td key={s.id} className="p-1 align-top">
                      <div className={`rounded-xl border p-2 ${cellTone(g)}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-black ${g.severity === 'ok' ? 'text-emerald-700' : g.severity === 'amber' ? 'text-amber-700' : 'text-red-700'}`}>
                            {g.assigned}<span className="text-stone-400 font-semibold">/{g.needed}</span>
                          </span>
                          <button
                            className="w-11 h-11 -m-1 rounded-lg text-lg font-black text-stone-500 hover:text-orange-700 hover:bg-white/60"
                            aria-label={`Manage ${r.name.en} ${s.name.en}`}
                            onClick={() => { setEditing(open ? null : key); setName(''); }}
                          >{open ? '–' : '+'}</button>
                        </div>
                        {list.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {list.map((a) => (
                              <li key={a.id} className="flex items-center justify-between text-[11px] text-stone-600 bg-white/60 rounded-lg px-1.5 py-0.5">
                                <span className="truncate">{a.memberName}</span>
                                {open && (
                                  <button className="ml-1 text-stone-300 hover:text-red-600 font-bold px-1" aria-label="Remove"
                                    onClick={() => removeAssignment(a.id)}>✕</button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                        {open && (
                          <div className="mt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                            <Field label={<T en="Needed per shift" bn="প্রতি শিফটে দরকার" hi="प्रति शिफ्ट आवश्यक" />}>
                              <input type="number" min={0} className={inputCls} value={g.needed}
                                onChange={(e) => setNeeded(r.id, s.id, parseInt(e.target.value || '0', 10))} />
                            </Field>
                            <div className="flex gap-1.5">
                              <input className={`${inputCls} !py-1.5`} placeholder={safeTranslate('festival.roster.name', 'Volunteer name', 'স্বেচ্ছাসেবীর নাম', 'स्वयंसेवक का नाम')}
                                value={name} onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') addAssignment(r.id, s.id); }} />
                              <Btn className="!px-3" onClick={() => addAssignment(r.id, s.id)} disabled={!name.trim()}>
                                <T en="Add" bn="যোগ" hi="जोड़ें" />
                              </Btn>
                            </div>
                            {utsav.members.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {utsav.members.slice(0, 6).map((m) => (
                                  <button key={m.id}
                                    className="text-[11px] px-2 py-1.5 min-h-[44px] rounded-lg bg-white border border-stone-200 text-stone-600 hover:border-orange-400"
                                    onClick={() => { setName(m.name); }}>
                                    {m.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-stone-400 mt-2">
        <T en="Tap + on a cell to set how many sevadars a shift needs and assign names. Amber = getting there · red = needs attention."
          bn="কর্মী সংখ্যা ও নাম দিতে সেলে + চাপুন। হলুদ = প্রায় প্রস্তুত · লাল = মনোযোগ দরকার।"
          hi="आवश्यक संख्या व नाम हेतु सेल पर + दबाएं। पीला = लगभग तैयार · लाल = ध्यान चाहिए।" />
      </p>
    </Card>
  );
};

export default RosterCard;
