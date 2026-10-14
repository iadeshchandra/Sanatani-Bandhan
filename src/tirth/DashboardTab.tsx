import React from 'react';
import { useTirth, todayISO, tokensFor, slotIssued, slotUtilPct, noShowPct, peakCrowd, sevaIncome, nowServingSeq } from './tirthStore';
import { T, Card, Stat, Empty, inr, fmtTime } from './ui';

/* Tirth One — dashboard: today's tokens, slot utilisation, queue health. */

export const DashboardTab: React.FC = () => {
  const { state } = useTirth();
  const date = todayISO();

  const todays = tokensFor(state, date);
  const issued = todays.length;
  const served = todays.filter((t) => t.status === 'served').length;
  const waiting = todays.filter((t) => t.status === 'waiting').length;
  const activeSlots = state.slots.filter((s) => s.active);
  const avgUtil = activeSlots.length
    ? Math.round(activeSlots.reduce((s, sl) => s + slotUtilPct(state, sl, date), 0) / activeSlots.length)
    : 0;
  const ns = noShowPct(state, date);
  const peak = peakCrowd(state, date);
  const seva = sevaIncome(state, date);

  if (!state.slots.length) return <Card><Empty text="Add darshan slots first — the dashboard lights up once slots exist." /></Card>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={<T en="Tokens issued today" bn="আজকের টোকেন" hi="आज के टोकन" />} value={issued} tone="teal" />
        <Stat label={<T en="Served" bn="সেবিত" hi="सेवित" />} value={served} tone="emerald" sub={`${waiting} waiting`} />
        <Stat label={<T en="Avg slot utilisation" bn="গড় স্লট ব্যবহার" hi="औसत स्लॉट उपयोग" />} value={`${avgUtil}%`} tone="sky" />
        <Stat label={<T en="No-show rate" bn="অনুপস্থিতির হার" hi="नो-शो दर" />} value={`${ns}%`} tone={ns > 20 ? 'red' : 'amber'} sub="served + no-show basis" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-extrabold text-stone-800 mb-3"><T en="Slot status — today" bn="স্লট অবস্থা — আজ" hi="स्लॉट स्थिति — आज" /></h3>
          <div className="space-y-2">
            {activeSlots.map((sl) => {
              const nowSeq = nowServingSeq(state, sl.id, date);
              const w = waitingTokensCount(sl.id);
              return (
                <div key={sl.id} className="flex items-center justify-between gap-2 rounded-xl border border-stone-100 px-3 py-2.5">
                  <div>
                    <div className="font-bold text-sm text-stone-800">{sl.name}</div>
                    <div className="text-xs text-stone-500">{fmtTime(sl.startTime)} – {fmtTime(sl.endTime)} · {sl.slotType}</div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-extrabold text-teal-700 text-base">
                      {nowSeq !== null ? `T-${String(nowSeq).padStart(4, '0')}` : '—'}
                    </div>
                    <div className="text-stone-500">now serving · {w} waiting · {slotUtilPct(state, sl, date)}% full</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="font-extrabold text-stone-800 mb-2"><T en="Crowd pulse" bn="ভিড়ের চিত্র" hi="भीड़ की स्थिति" /></h3>
            {peak ? (
              <div className="text-sm text-stone-600">
                <span className="font-extrabold text-teal-700 text-lg">{peak.count}</span> devotees — peak at{' '}
                <span className="font-bold">{peak.hour}</span> today.
              </div>
            ) : (
              <div className="text-sm text-stone-400">No crowd snapshots today yet — record one from the Crowd tab.</div>
            )}
          </Card>
          <Card>
            <h3 className="font-extrabold text-stone-800 mb-2"><T en="Seva-darshan income today" bn="আজকের সেবা-দর্শন আয়" hi="आज की सेवा-दर्शन आय" /></h3>
            <div className="text-2xl font-extrabold text-emerald-700">{inr(seva)}</div>
            <div className="text-xs text-stone-500 mt-1">Posted to treasury per booking · generally not 80G-eligible</div>
          </Card>
        </div>
      </div>
    </div>
  );

  function waitingTokensCount(slotId: string): number {
    return todays.filter((t) => t.slotId === slotId && t.status === 'waiting').length;
  }
};
