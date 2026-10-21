import React, { useMemo } from 'react';
import { useAshram, todayISO, daysFrom, roomLoadOn, occupiedNights, eachDate } from './ashramStore';
import { Card, Stat, T, useLocaleText, StatusPill } from './ui';
import { useInr } from '../hooks/useWorkspaceInr';

/* Ashram One — occupancy dashboard: today's occupancy %, arrivals /
 * departures, upcoming bookings, stay donations this week/month, rooms
 * in maintenance, and today's bhandara meal load. */

export const DashboardTab: React.FC = () => {
  const { state } = useAshram();
  const { tr } = useLocaleText();
  const today = todayISO();

  const m = useMemo(() => {
    const usable = state.rooms.filter((r) => r.status !== 'maintenance');
    const beds = usable.reduce((s, r) => s + r.capacity, 0);
    const usedBeds = usable.reduce((s, r) => s + roomLoadOn(r, today, state).used, 0);
    const occPct = beds ? Math.round((usedBeds / beds) * 100) : 0;

    const arrivals = state.stays.filter((s) => s.status === 'checked-in' && s.checkIn.slice(0, 10) === today);
    const departures = state.stays.filter(
      (s) => s.status === 'checked-in' && s.expectedCheckout <= today,
    );
    const upcoming = state.bookings
      .filter((b) => (b.status === 'held' || b.status === 'confirmed') && b.checkIn >= today)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
      .slice(0, 5);
    const maintenance = state.rooms.filter((r) => r.status === 'maintenance');

    const weekAgo = daysFrom(-7);
    const monthAgo = daysFrom(-30);
    const done = state.stays.filter((s) => s.status === 'checked-out' && s.checkoutAt);
    const wk = done.filter((s) => (s.checkoutAt as string).slice(0, 10) >= weekAgo)
      .reduce((s, x) => s + (x.actualDonation || 0), 0);
    const mo = done.filter((s) => (s.checkoutAt as string).slice(0, 10) >= monthAgo)
      .reduce((s, x) => s + (x.actualDonation || 0), 0);

    // 7-day occupancy spark
    const spark = eachDate(daysFrom(-6), daysFrom(1)).map((d) => {
      const u = usable.reduce((s, r) => s + roomLoadOn(r, d, state).used, 0);
      return { d: d.slice(5), pct: beds ? Math.round((u / beds) * 100) : 0 };
    });
    const avgOcc = usable.length && beds
      ? Math.round(
          (usable.reduce((s, r) => s + occupiedNights(r, daysFrom(-6), daysFrom(1), state), 0) /
            (beds * 7)) * 100,
        )
      : 0;
    return { usable, beds, usedBeds, occPct, arrivals, departures, upcoming, maintenance, wk, mo, spark, avgOcc };
  }, [state, today]);

  const inr = useInr();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label={<T en="Occupancy today" bn="আজকের দখল" hi="आज की अधिभोग" />}
          value={`${m.occPct}%`}
          sub={<T en={`${m.usedBeds} of ${m.beds} beds`} bn={`${m.beds}-এর মধ্যে ${m.usedBeds} শয্যা`} hi={`${m.beds} में से ${m.usedBeds} बिस्तर`} />}
          tone={m.occPct >= 85 ? 'red' : m.occPct >= 50 ? 'amber' : 'emerald'}
        />
        <Stat
          label={<T en="Arrivals today" bn="আজকের আগমন" hi="आज आगमन" />}
          value={m.arrivals.length}
          sub={<T en="Departures due" bn="প্রস্থান বাকি" hi="प्रस्थान बाकी" />}
          tone="sky"
        />
        <Stat
          label={<T en="Donations · 7 days" bn="দান · ৭ দিন" hi="दान · 7 दिन" />}
          value={inr(m.wk)}
          sub={<T en={`30 days: ${inr(m.mo)}`} bn={`৩০ দিন: ${inr(m.mo)}`} hi={`30 दिन: ${inr(m.mo)}`} />}
          tone="emerald"
        />
        <Stat
          label={<T en="Rooms in maintenance" bn="মেরামতাধীন কক্ষ" hi="रखरखाव वाले कमरे" />}
          value={m.maintenance.length}
          sub={m.maintenance.map((r) => r.number).join(', ') || '—'}
          tone={m.maintenance.length ? 'red' : 'emerald'}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold text-stone-800 mb-3">
            <T en="7-day occupancy" bn="৭ দিনের দখল" hi="7-दिन अधिभोग" />
            <span className="text-xs font-normal text-stone-500 ml-2">
              {tr('ashram.dash.avg', 'avg', 'গড়', 'औसत')}: {m.avgOcc}%
            </span>
          </h3>
          <div className="flex items-end gap-1.5 h-28">
            {m.spark.map((s) => (
              <div key={s.d} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-amber-100 rounded-t-md relative" style={{ height: '100%' }}>
                  <div
                    className={`absolute bottom-0 w-full rounded-t-md ${s.pct >= 85 ? 'bg-red-400' : s.pct >= 50 ? 'bg-amber-500' : 'bg-emerald-400'}`}
                    style={{ height: `${Math.max(4, s.pct)}%` }}
                    title={`${s.d}: ${s.pct}%`}
                  />
                </div>
                <span className="text-[10px] text-stone-500">{s.d}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-bold text-stone-800 mb-3">
            <T en="Upcoming bookings" bn="আসন্ন বুকিং" hi="आगामी बुकिंग" />
          </h3>
          {m.upcoming.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">
              {tr('ashram.dash.noUpcoming', 'No upcoming bookings.', 'কোনো আসন্ন বুকিং নেই।', 'कोई आगामी बुकिंग नहीं।')}
            </p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {m.upcoming.map((b) => (
                <li key={b.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-stone-800 text-sm truncate">{b.guestName}</div>
                    <div className="text-xs text-stone-500">
                      {b.checkIn} → {b.checkOut} · {b.partySize} {tr('ashram.dash.persons', 'persons', 'জন', 'व्यक्ति')}
                      {b.roomType ? ` · ${b.roomType}` : ''}
                    </div>
                  </div>
                  <StatusPill status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {(m.arrivals.length > 0 || m.departures.length > 0) && (
        <Card>
          <h3 className="font-bold text-stone-800 mb-3">
            <T en="Today's movements" bn="আজকের আসা-যাওয়া" hi="आज की आवाजाही" />
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">
                {tr('ashram.dash.arr', 'Arrivals', 'আগমন', 'आगमन')} ({m.arrivals.length})
              </div>
              <ul className="space-y-1.5">
                {m.arrivals.map((s) => (
                  <li key={s.id} className="text-sm text-stone-700">
                    {s.guestName} <span className="text-stone-400">· {s.partySize} · {tr('ashram.dash.room', 'room', 'কক্ষ', 'कमरा')} {state.rooms.find((r) => r.id === s.roomId)?.number}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">
                {tr('ashram.dash.dep', 'Departures due', 'প্রস্থান বাকি', 'प्रस्थान बाकी')} ({m.departures.length})
              </div>
              <ul className="space-y-1.5">
                {m.departures.map((s) => (
                  <li key={s.id} className="text-sm text-stone-700">
                    {s.guestName} <span className="text-stone-400">· {tr('ashram.dash.expected', 'expected', 'প্রত্যাশিত', 'अपेक्षित')} {s.expectedCheckout}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
