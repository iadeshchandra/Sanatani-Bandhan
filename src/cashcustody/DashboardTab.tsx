import React, { useMemo } from 'react';
import { useCashCustody, denomTotal } from './cashCustodyStore';
import { DENOMINATIONS, DENOM_LABEL } from './types';
import { T, Card, Stat, fmtDateTime } from './ui';
import { useInr } from '../hooks/useWorkspaceInr';

/* ------------------------------------------------------------------ */
/* Trustee dashboard — daily / weekly / monthly collections,           */
/* denomination mix, box-wise comparison, pending deposits, and who    */
/* counted what. Everything a trustee needs to spot anomalies.         */
/* ------------------------------------------------------------------ */

const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);

export const DashboardTab: React.FC = () => {
  const inr = useInr();
  const { state } = useCashCustody();

  const stats = useMemo(() => {
    const closed = state.sessions.filter((s) => s.status === 'closed');
    const now = Date.now();
    const day = 864e5;
    const sum = (list: typeof closed) => list.reduce((a, s) => a + s.total, 0);
    const daily = sum(closed.filter((s) => (s.closedAt || 0) > now - day));
    const weekly = sum(closed.filter((s) => (s.closedAt || 0) > now - 7 * day));
    const monthly = sum(closed.filter((s) => (s.closedAt || 0) > now - 30 * day));
    const pending = state.deposits.filter((d) => d.status === 'pending');
    const pendingAmt = pending.reduce((a, d) => a + d.amount, 0);

    // Denomination mix across closed sessions (maker counts).
    const mix: Record<string, number> = {};
    closed.forEach((s) => {
      DENOMINATIONS.forEach((k) => { mix[k] = (mix[k] || 0) + (s.makerCounts[k] || 0) * (k === 'coins' ? 1 : Number(k)); });
    });
    const mixTotal = Object.values(mix).reduce((a, b) => a + b, 0);

    // Box-wise totals.
    const byBox = state.boxes.map((b) => ({
      box: b,
      total: sum(closed.filter((s) => s.boxId === b.id)),
      count: closed.filter((s) => s.boxId === b.id).length,
    })).sort((a, b) => b.total - a.total);
    const maxBox = Math.max(1, ...byBox.map((x) => x.total));

    // Last 7 days.
    const days: Array<{ label: string; total: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * day);
      const key = d.toISOString().slice(0, 10);
      const total = sum(closed.filter((s) => s.closedAt && dayKey(s.closedAt) === key));
      days.push({ label: d.toLocaleDateString('en-IN', { weekday: 'short' }), total });
    }
    const maxDay = Math.max(1, ...days.map((d) => d.total));

    return { daily, weekly, monthly, pending, pendingAmt, mix, mixTotal, byBox, maxBox, days, maxDay, closed };
  }, [state]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={<T en="Today" bn="আজ" hi="आज" />} value={inr(stats.daily)} tone="emerald" />
        <Stat label={<T en="Last 7 days" bn="৭ দিন" hi="७ दिन" />} value={inr(stats.weekly)} tone="amber" />
        <Stat label={<T en="Last 30 days" bn="৩০ দিন" hi="३० दिन" />} value={inr(stats.monthly)} tone="sky" />
        <Stat
          label={<T en="Pending deposits" bn="বকেয়া জমা" hi="लंबित जमा" />}
          value={inr(stats.pendingAmt)}
          sub={<T en={`${stats.pending.length} slip(s) not yet banked`} bn="স্লিপ ব্যাংকে যায়নি" hi="पर्ची बैंक नहीं गई" />}
          tone={stats.pending.length ? 'red' : 'emerald'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-extrabold text-stone-800 mb-3"><T en="Last 7 days" bn="গত ৭ দিন" hi="पिछले ७ दिन" /></h3>
          <div className="flex items-end gap-2 h-32">
            {stats.days.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-amber-600 to-amber-400 min-h-[4px]"
                  style={{ height: `${Math.max(4, (d.total / stats.maxDay) * 100)}%` }}
                  title={inr(d.total)}
                />
                <span className="text-[10px] text-stone-500 font-bold">{d.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-extrabold text-stone-800 mb-3"><T en="Denomination mix (closed sessions)" bn="মূল্যমান মিশ্রণ" hi="मूल्यवर्ग मिश्रण" /></h3>
          <div className="space-y-1.5">
            {DENOMINATIONS.filter((k) => (stats.mix[k] || 0) > 0).map((k) => {
              const pct = stats.mixTotal ? Math.round((stats.mix[k] / stats.mixTotal) * 100) : 0;
              return (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <span className="w-14 font-bold text-stone-600">{DENOM_LABEL[k]}</span>
                  <div className="flex-1 h-3 rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-16 text-right text-stone-500">{inr(stats.mix[k])} · {pct}%</span>
                </div>
              );
            })}
            {stats.mixTotal === 0 && <p className="text-xs text-stone-400"><T en="No closed sessions yet." bn="এখনও নেই।" hi="अभी नहीं।" /></p>}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="font-extrabold text-stone-800 mb-3"><T en="Box-wise collections" bn="বাক্স অনুযায়ী" hi="पेटी अनुसार" /></h3>
        <div className="space-y-2">
          {stats.byBox.map(({ box, total, count }) => (
            <div key={box.id} className="flex items-center gap-3 text-sm">
              <span className="w-40 font-bold text-stone-700 truncate">{box.boxCode}</span>
              <div className="flex-1 h-4 rounded-full bg-stone-100 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-orange-600 to-amber-500" style={{ width: `${Math.max(2, (total / stats.maxBox) * 100)}%` }} />
              </div>
              <span className="w-24 text-right font-extrabold text-stone-800">{inr(total)}</span>
              <span className="w-20 text-right text-xs text-stone-400">{count} <T en="sessions" bn="সেশন" hi="सत्र" /></span>
            </div>
          ))}
        </div>
      </Card>

      {stats.pending.length > 0 && (
        <Card>
          <h3 className="font-extrabold text-red-700 mb-2">⚠️ <T en="Deposits not yet banked" bn="ব্যাংকে জমা হয়নি" hi="बैंक में जमा नहीं" /></h3>
          <div className="divide-y divide-stone-100 text-sm">
            {stats.pending.map((d) => (
              <div key={d.id} className="py-2 flex justify-between">
                <span className="text-stone-600 font-mono">{d.slipNo} · {fmtDateTime(d.createdAt)}</span>
                <span className="font-extrabold text-red-700">{inr(d.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
