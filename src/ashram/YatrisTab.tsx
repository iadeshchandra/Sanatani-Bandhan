import React, { useMemo, useState } from 'react';
import { useInr } from '../hooks/useWorkspaceInr';
import { useAshram } from './ashramStore';
import { Card, Field, inputCls, Empty, T, useLocaleText } from './ui';

/* Ashram One — yatri history: repeat-guest lookup by phone with a
 * welcome-back note for returning yatris. Derived from stay records
 * (device-local); no separate profile store needed. */

export const YatrisTab: React.FC = () => {
  const inr = useInr();
  const { state } = useAshram();
  const { tr } = useLocaleText();
  const [q, setQ] = useState('');

  const yatris = useMemo(() => {
    const byPhone = new Map<string, { name: string; phone: string; stays: typeof state.stays; totalNights: number; totalDonation: number; lastVisit: string }>();
    for (const s of state.stays) {
      const phone = (s.phone || '').replace(/\D/g, '').slice(-10);
      if (!phone) continue;
      let y = byPhone.get(phone);
      if (!y) {
        y = { name: s.guestName, phone: s.phone, stays: [], totalNights: 0, totalDonation: 0, lastVisit: '' };
        byPhone.set(phone, y);
      }
      y.stays.push(s);
      const co = (s.checkoutAt || s.expectedCheckout).slice(0, 10);
      const nights = Math.max(1, Math.round((new Date(co).getTime() - new Date(s.checkIn.slice(0, 10)).getTime()) / 86400000));
      y.totalNights += nights;
      y.totalDonation += s.actualDonation || 0;
      if (co > y.lastVisit) { y.lastVisit = co; y.name = s.guestName; }
    }
    return [...byPhone.values()].sort((a, b) => b.stays.length - a.stays.length || b.lastVisit.localeCompare(a.lastVisit));
  }, [state.stays]);

  const qd = q.replace(/\D/g, '').slice(-10);
  const filtered = qd ? yatris.filter((y) => y.phone.replace(/\D/g, '').includes(qd) || y.name.toLowerCase().includes(q.toLowerCase())) : yatris;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 no-print">
        <h3 className="font-bold text-stone-800">
          <T en="Yatri history" bn="যাত্রী ইতিহাস" hi="यात्री इतिहास" />{' '}
          <span className="text-xs font-normal text-stone-500">({yatris.length} {tr('ashram.yatris.guests', 'guests', 'অতিথি', 'अतिथि')})</span>
        </h3>
        <div className="sm:ml-auto w-full sm:w-72">
          <Field label={tr('ashram.yatris.search', 'Search by phone or name', 'ফোন/নামে খুঁজুন', 'फोन/नाम से खोजें')}>
            <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="+91 …" />
          </Field>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty text={tr('ashram.yatris.empty', 'No yatri records yet.', 'কোনো রেকর্ড নেই।', 'अभी कोई रिकॉर्ड नहीं।')} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.slice(0, 60).map((y) => (
            <Card key={y.phone}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-stone-800 truncate">{y.name}</div>
                  <div className="text-xs text-stone-500">{y.phone}</div>
                </div>
                {y.stays.length > 1 && (
                  <span className="shrink-0 inline-block px-2 py-1 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-bold">
                    🙏 {tr('ashram.yatris.welcomeBack', 'Welcome back!', 'স্বাগতম!', 'स्वागत है!')}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="rounded-xl bg-stone-50 py-2">
                  <div className="font-extrabold text-stone-800">{y.stays.length}</div>
                  <div className="text-[10px] text-stone-500">{tr('ashram.yatris.stays', 'stays', 'থাকা', 'ठहराव')}</div>
                </div>
                <div className="rounded-xl bg-stone-50 py-2">
                  <div className="font-extrabold text-stone-800">{y.totalNights}</div>
                  <div className="text-[10px] text-stone-500">{tr('ashram.yatris.nights', 'nights', 'রাত', 'रातें')}</div>
                </div>
                <div className="rounded-xl bg-stone-50 py-2">
                  <div className="font-extrabold text-stone-800">{inr(Math.round(y.totalDonation))}</div>
                  <div className="text-[10px] text-stone-500">{tr('ashram.yatris.donated', 'donated', 'দান', 'दान')}</div>
                </div>
              </div>
              <div className="text-xs text-stone-500 mt-2">
                {tr('ashram.yatris.lastVisit', 'Last visit', 'শেষ আগমন', 'अंतिम आगमन')}: {y.lastVisit || '—'}
              </div>
            </Card>
          ))}
        </div>
      )}
      {filtered.length > 60 && (
        <p className="text-xs text-stone-400 text-center no-print">
          {tr('ashram.yatris.more', `Showing 60 of ${filtered.length} — refine your search.`, '…', '…')}
        </p>
      )}
    </div>
  );
};
