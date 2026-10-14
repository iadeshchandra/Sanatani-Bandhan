import React from 'react';
import { useNyas, attentionRegs, overdueItems, dueSoonItems, healthScore, currentFY, appliedForFY, daysUntil } from './nyasStore';
import { T, Card, Stat, StatusPill, inr, fmtDate } from './ui';
import { useData } from '../context/DataContext';
import { fyRange } from './nyasStore';
import { REG_KINDS } from './types';

/* Nyas One dashboard — compliance health at a glance. */

const scoreTone = (s: number) => (s >= 80 ? 'emerald' : s >= 50 ? 'amber' : 'red');

export const DashboardTab: React.FC = () => {
  const { state } = useNyas();
  const { treasury } = useData();
  const fy = currentFY();
  const { score, detail } = healthScore(state);
  const regs = attentionRegs(state);
  const overdue = overdueItems(state);
  const dueSoon = dueSoonItems(state);

  // 85% rule: FY income from treasury vs confirmed applications.
  const [fyStart, fyEnd] = fyRange(fy);
  const fyIncome = (treasury || [])
    .filter((t) => t.type === 'Income' && t.date >= fyStart && t.date.slice(0, 10) <= fyEnd)
    .reduce((s, t) => s + (t.amount || 0), 0);
  const applied = appliedForFY(state, fy);
  const pct = fyIncome > 0 ? Math.min(100, Math.round((applied / fyIncome) * 100)) : 0;
  const shortfall = Math.max(0, Math.round(fyIncome * 0.85) - applied);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat tone={scoreTone(score)} label={<T en="Compliance health" bn="অনুপালন স্বাস্থ্য" hi="अनुपालन स्वास्थ्य" />} value={`${score}/100`} sub={detail} />
        <Stat tone={regs.length ? 'red' : 'emerald'} label={<T en="Registrations needing attention" bn="নিবন্ধনে মনোযোগ প্রয়োজন" hi="ध्यान चाहिए — पंजीकरण" />} value={regs.length} sub={regs.length ? <T en="Expired or expiring within 90 days" bn="মেয়াদোত্তীর্ণ বা ৯০ দিনের মধ্যে" hi="समाप्त या 90 दिनों में" /> : <T en="All registrations current" bn="সব নিবন্ধন হালনাগাদ" hi="सभी पंजीकरण वर्तमान" />} />
        <Stat tone={overdue.length ? 'red' : 'emerald'} label={<T en="Overdue filings" bn="বকেয়া ফাইলিং" hi="बकाया फाइलिंग" />} value={overdue.length} sub={dueSoon.length ? <T en={`${dueSoon.length} due in next 30 days`} bn={`আগামী ৩০ দিনে ${dueSoon.length}টি`} hi={`अगले 30 दिनों में ${dueSoon.length}`} /> : <T en="Nothing due in 30 days" bn="৩০ দিনে কিছু বকেয়া নেই" hi="30 दिनों में कुछ बकाया नहीं" />} />
        <Stat tone={pct >= 85 ? 'emerald' : 'amber'} label={<T en={`85% applied · FY ${fy}`} bn={`৮৫% প্রয়োগ · অর্থবছর ${fy}`} hi={`85% प्रयुक्त · वि.व. ${fy}`} />} value={`${pct}%`} sub={inr(applied) + ' / ' + inr(fyIncome)} />
      </div>

      {/* 85% progress bar */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-stone-800"><T en="85% application rule" bn="৮৫% প্রয়োগ নিয়ম" hi="85% प्रयोग नियम" /></h3>
          <span className="text-xs text-stone-500">FY {fy}</span>
        </div>
        <div className="h-3 rounded-full bg-stone-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct >= 85 ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-stone-500 mt-2">
          <T
            en={`Income ${inr(fyIncome)} · confirmed applied ${inr(applied)}${shortfall > 0 ? ` · shortfall ${inr(shortfall)} to reach 85%` : ' · 85% met ✓'}. Confirm with your CA what counts as "applied".`}
            bn={`আয় ${inr(fyIncome)} · নিশ্চিত প্রয়োগ ${inr(applied)}। "প্রয়োগ" কী গণ্য হবে তা সিএ-এর সঙ্গে নিশ্চিত করুন।`}
            hi={`आय ${inr(fyIncome)} · पुष्ट प्रयुक्त ${inr(applied)}। "प्रयुक्त" में क्या गिना जाए, अपने CA से पुष्टि करें।`}
          />
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Registrations needing attention */}
        <Card>
          <h3 className="font-bold text-stone-800 mb-3"><T en="Registrations — act now" bn="নিবন্ধন — এখনই ব্যবস্থা" hi="पंजीकरण — अभी कार्रवाई" /></h3>
          {regs.length === 0 && <p className="text-sm text-stone-400"><T en="No registration expiring or expired." bn="কোনো নিবন্ধনের মেয়াদ শেষ হয়নি।" hi="कोई पंजीकरण समाप्त नहीं हो रहा।" /></p>}
          {regs.map((r) => {
            const kind = REG_KINDS.find((k) => k.id === r.kind);
            const d = r.validTo ? daysUntil(r.validTo) : 0;
            return (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                <div>
                  <div className="text-sm font-bold text-stone-800">{r.customName || kind?.en || r.kind}</div>
                  <div className="text-xs text-stone-500">
                    {r.validTo ? (
                      d < 0
                        ? <T en={`Expired ${fmtDate(r.validTo)}`} bn={`মেয়াদোত্তীর্ণ ${fmtDate(r.validTo)}`} hi={`समाप्त ${fmtDate(r.validTo)}`} />
                        : <T en={`Expires ${fmtDate(r.validTo)} (${d} days)`} bn={`মেয়াদ ${fmtDate(r.validTo)} (${d} দিন)`} hi={`समाप्ति ${fmtDate(r.validTo)} (${d} दिन)`} />
                    ) : <T en="Lifetime validity" bn="আজীবন বৈধ" hi="आजीवन वैध" />}
                  </div>
                </div>
                <StatusPill status={d < 0 ? 'expired' : 'expiring'} />
              </div>
            );
          })}
        </Card>

        {/* Overdue + due soon */}
        <Card>
          <h3 className="font-bold text-stone-800 mb-3"><T en="Filings — overdue & upcoming" bn="ফাইলিং — বকেয়া ও আসন্ন" hi="फाइलिंग — बकाया व आगामी" /></h3>
          {overdue.length === 0 && dueSoon.length === 0 && (
            <p className="text-sm text-stone-400"><T en="Nothing overdue. Nothing due in the next 30 days." bn="কিছু বকেয়া নেই। আগামী ৩০ দিনে কিছু বকেয়া নেই।" hi="कुछ बकाया नहीं। अगले 30 दिनों में कुछ देय नहीं।" /></p>
          )}
          {[...overdue, ...dueSoon].slice(0, 8).map((c) => {
            const d = daysUntil(c.dueDate);
            return (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                <div>
                  <div className="text-sm font-bold text-stone-800">{c.customName || c.kind}</div>
                  <div className="text-xs text-stone-500">
                    {d < 0
                      ? <T en={`Was due ${fmtDate(c.dueDate)}`} bn={`${fmtDate(c.dueDate)} তারিখে বকেয়া ছিল`} hi={`${fmtDate(c.dueDate)} को देय था`} />
                      : <T en={`Due ${fmtDate(c.dueDate)}`} bn={`বকেয়া ${fmtDate(c.dueDate)}`} hi={`देय ${fmtDate(c.dueDate)}`} />}
                    {c.owner ? ` · ${c.owner}` : ''}
                  </div>
                </div>
                <StatusPill status={d < 0 ? 'overdue' : 'pending'} />
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
};
