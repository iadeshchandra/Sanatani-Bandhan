import React from 'react';
import { useYoga, batchStudents, batchRunsOn, feesCollected, feesOverdue, lowAttendanceStudents, monthISO, todayISO } from './yogaStore';
import { T, Card, Stat, inr, fmtTime } from './ui';
import { LEVEL_LABEL, WEEKDAYS_SHORT } from './types';

/* Yoga One dashboard — shala at a glance. */

export const DashboardTab: React.FC = () => {
  const { state } = useYoga();
  const today = todayISO();
  const period = monthISO();
  const wd = new Date(today + 'T12:00:00').getDay();

  const activeBatches = state.batches.filter((b) => b.active);
  const activeStudents = state.students.filter((s) => s.status === 'active');
  const todaysBatches = activeBatches.filter((b) => b.days.includes(wd));
  const collected = feesCollected(state, period);
  const overdue = feesOverdue(state, period);
  const lowAtt = lowAttendanceStudents(state);

  const totalCapacity = activeBatches.reduce((s, b) => s + b.capacity, 0);
  const fillPct = totalCapacity ? Math.round((activeStudents.length / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={<T en="Active students" bn="সক্রিয় শিক্ষার্থী" hi="सक्रिय छात्र" />} value={activeStudents.length} sub={<T en={`${activeBatches.length} batches · ${fillPct}% full`} bn={`${activeBatches.length} ব্যাচ`} hi={`${activeBatches.length} बैच`} />} />
        <Stat tone="sky" label={<T en="Batches today" bn="আজকের ব্যাচ" hi="आज के बैच" />} value={todaysBatches.length} sub={todaysBatches.map((b) => b.name).slice(0, 2).join(' · ') || '—'} />
        <Stat tone="emerald" label={<T en="Fees collected" bn="আদায়কৃত ফি" hi="वसूला शुल्क" />} value={inr(collected)} sub={<T en="this month" bn="এই মাসে" hi="इस माह" />} />
        <Stat tone={overdue.length ? 'red' : 'stone'} label={<T en="Fees overdue" bn="বকেয়া ফি" hi="बकाया शुल्क" />} value={overdue.length} sub={overdue.length ? <T en="students unpaid" bn="শিক্ষার্থী বাকি" hi="छात्र बकाया" /> : <T en="all clear" bn="সব পরিষ্কার" hi="सब साफ़" />} />
      </div>

      {todaysBatches.length > 0 && (
        <Card>
          <h3 className="font-extrabold text-stone-800 mb-2"><T en={`Today's classes (${WEEKDAYS_SHORT[wd]})`} bn="আজকের ক্লাস" hi="आज की कक्षाएं" /></h3>
          <div className="space-y-2">
            {todaysBatches.map((b) => {
              const n = batchStudents(state, b.id).length;
              return (
                <div key={b.id} className="flex items-center justify-between gap-2 py-2 border-b border-stone-100 last:border-0">
                  <div>
                    <div className="font-bold text-stone-800 text-sm">{b.name}</div>
                    <div className="text-xs text-stone-500">{LEVEL_LABEL[b.level]} · {fmtTime(b.startTime)}–{fmtTime(b.endTime)} · {n}/{b.capacity}</div>
                  </div>
                  <div className="w-24 bg-stone-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${b.capacity ? Math.min(100, (n / b.capacity) * 100) : 0}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {lowAtt.length > 0 && (
        <Card className="border-amber-200">
          <h3 className="font-extrabold text-amber-800 mb-1">⚠️ <T en="Low attendance — check in with them" bn="কম উপস্থিতি" hi="कम उपस्थिति" /></h3>
          <p className="text-xs text-stone-500 mb-2"><T en="Below the alert threshold, 4+ sessions marked." bn="সতর্কতা সীমার নিচে।" hi="चेतावनी सीमा से नीचे।" /></p>
          <div className="space-y-1">
            {lowAtt.slice(0, 5).map(({ student, pct }) => (
              <div key={student.id} className="flex justify-between text-sm py-1 border-b border-stone-100 last:border-0">
                <span className="font-semibold text-stone-700">{student.name}</span>
                <span className="font-extrabold text-amber-700">{pct}%</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {overdue.length > 0 && (
        <Card className="border-red-200">
          <h3 className="font-extrabold text-red-800 mb-2">💰 <T en="Fee defaulters this month" bn="এই মাসের বকেয়া" hi="इस माह के बकायादार" /></h3>
          <div className="space-y-1">
            {overdue.slice(0, 8).map((s) => {
              const b = state.batches.find((x) => x.id === s.batchId);
              return (
                <div key={s.id} className="flex justify-between text-sm py-1 border-b border-stone-100 last:border-0">
                  <span className="font-semibold text-stone-700">{s.name} <span className="text-stone-400 font-normal">· {b?.name}</span></span>
                  <span className="font-extrabold text-red-700">{inr(b?.feeMonthly || 0)}</span>
                </div>
              );
            })}
            {overdue.length > 8 && <div className="text-xs text-stone-500">+{overdue.length - 8} more</div>}
          </div>
        </Card>
      )}
    </div>
  );
};
