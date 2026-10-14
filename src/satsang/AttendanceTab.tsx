import React, { useState } from 'react';
import { useSatsang, uid, activeMembers, attendancePct } from './satsangStore';
import { T, Card, Btn, inputCls, fmtDate, fmtTime, Empty } from './ui';
import { useToast } from '../context/ToastContext';

/* ------------------------------------------------------------------ */
/* Attendance — per-gathering tap-to-mark, plus per-member attendance  */
/* percentages and the irregular-member insight.                       */
/* ------------------------------------------------------------------ */

export const AttendanceTab: React.FC = () => {
  const { state, add, update } = useSatsang();
  const { showToast } = useToast();
  const [gid, setGid] = useState('');

  const gatherings = [...state.gatherings].sort((a, b) => b.date.localeCompare(a.date));
  const g = gatherings.find((x) => x.id === gid) || gatherings[0];
  const members = activeMembers(state);

  const entryFor = (memberId: string) =>
    state.attendance.find((a) => a.gatheringId === g?.id && a.memberId === memberId);

  const toggle = (memberId: string) => {
    if (!g) return;
    const existing = entryFor(memberId);
    if (existing) {
      update('attendance', existing.id, { present: !existing.present });
    } else {
      add('attendance', { id: uid('a'), gatheringId: g.id, memberId, present: true, createdAt: Date.now() });
    }
  };

  const markAll = (present: boolean) => {
    if (!g) return;
    members.forEach((m) => {
      const existing = entryFor(m.id);
      if (existing) update('attendance', existing.id, { present });
      else add('attendance', { id: uid('a'), gatheringId: g.id, memberId: m.id, present, createdAt: Date.now() });
    });
    showToast(present ? 'Everyone marked present.' : 'Everyone marked absent.', 'success');
  };

  if (!g) return <Empty text="No gatherings yet. Schedule one first." />;

  const presentN = members.filter((m) => entryFor(m.id)?.present).length;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <select className={inputCls + ' max-w-xs'} value={g.id} onChange={(e) => setGid(e.target.value)} aria-label="Choose gathering">
            {gatherings.map((x) => (
              <option key={x.id} value={x.id}>{fmtDate(x.date)} · {fmtTime(x.time)} ({x.status})</option>
            ))}
          </select>
          <div className="text-sm font-bold text-stone-700">
            {presentN} / {members.length} <T en="present" bn="উপস্থিত" hi="उपस्थित" />
          </div>
          <div className="flex gap-2 no-print">
            <Btn variant="emerald" onClick={() => markAll(true)}><T en="All present" bn="সবাই উপস্থিত" hi="सभी उपस्थित" /></Btn>
            <Btn variant="ghost" onClick={() => markAll(false)}><T en="All absent" bn="সবাই অনুপস্থিত" hi="सभी अनुपस्थित" /></Btn>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {members.map((m) => {
          const e = entryFor(m.id);
          const pct = attendancePct(state, m.id);
          const present = !!e?.present;
          return (
            <button
              key={m.id}
              onClick={() => toggle(m.id)}
              className={`text-left rounded-2xl border p-3 transition min-h-[56px] ${
                present ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-stone-200 hover:border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm text-stone-800">{m.name}</span>
                <span className={`text-lg ${present ? 'text-emerald-600' : 'text-stone-300'}`}>{present ? '✓' : '○'}</span>
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">
                {pct === null ? 'no history yet' : `${pct}% attendance`}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-stone-500">
        <T en="Tap a member to toggle present / absent. Attendance is this device's record." bn="উপস্থিত / অনুপস্থিত টগল করতে সদস্যে ট্যাপ করুন। উপস্থিতি এই ডিভাইসের রেকর্ড।" hi="उपस्थित / अनुपस्थित टॉगल करने के लिए सदस्य पर टैप करें। उपस्थिति इस डिवाइस का रिकॉर्ड है।" />
      </p>
    </div>
  );
};
