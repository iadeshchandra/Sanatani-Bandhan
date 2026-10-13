import React, { useMemo } from 'react';
import { useGoshala, todayISO } from './goshalaStore';
import { Card, Stat, T, StatusPill } from './ui';
import { LocalOnlyBadge } from '../components/common/LocalOnlyBadge';
import { inr, fmtDateEn } from '../pathshala/bn';

/* Goshala One — dashboard: headcount, sick list, today's milk, fodder
   days-remaining, grant-vs-cost gap, upcoming vaccinations. */

export const DashboardTab: React.FC = () => {
  const { state } = useGoshala();
  const today = todayISO();

  const m = useMemo(() => {
    const headcount = state.nandis.length;
    const sick = state.nandis.filter((n) => n.status === 'sick' || n.status === 'quarantine');
    const milking = state.nandis.filter((n) => n.status === 'milking').length;
    const todayMilk = state.milk.filter((r) => r.date === today).reduce((s, r) => s + r.liters, 0);
    // Fodder days-remaining: stock / avg daily use (last 7 days).
    const since = new Date(); since.setDate(since.getDate() - 7);
    const sinceISO = since.toISOString().slice(0, 10);
    const fodderDays = state.fodderItems.map((it) => {
      const used = state.fodderUse.filter((u) => u.itemId === it.id && u.date >= sinceISO).reduce((s, u) => s + u.qty, 0);
      const avg = used / 7;
      return { item: it, days: avg > 0 ? Math.floor(it.stockQty / avg) : 999 };
    });
    const lowest = fodderDays.sort((a, b) => a.days - b.days)[0];
    // Grant gap: (real cost − grant) × headcount.
    const gapPerDay = Math.max(0, state.settings.estCostPerDay - state.settings.grantPerDay);
    const upcomingVax = state.health
      .filter((h) => h.nextDue && h.nextDue >= today)
      .sort((a, b) => a.nextDue!.localeCompare(b.nextDue!))
      .slice(0, 5);
    const overdueVax = state.health.filter((h) => h.nextDue && h.nextDue < today);
    const activeSponsors = state.sponsorships.filter((s) => s.status === 'active').length;
    const expiring = state.sponsorships.filter((s) => s.status === 'expiring');
    const pendingGrants = state.grants.filter((g) => g.status === 'pending' || g.status === 'applied');
    return { headcount, sick, milking, todayMilk, lowest, gapPerDay, upcomingVax, overdueVax, activeSponsors, expiring, pendingGrants };
  }, [state, today]);

  const nandiName = (id: string) => state.nandis.find((n) => n.id === id)?.name || '—';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-stone-800">
          <T en="Goshala dashboard" bn="গোশালা ড্যাশবোর্ড" hi="गोशाला डैशबोर्ड" sa="गोशाला प्रबन्धनम्" />
        </h2>
        <LocalOnlyBadge />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={<T en="Headcount" bn="মোট গো-সংখ্যা" hi="कुल पशु" />} value={m.headcount} sub={<T en="Gau Mata under care" bn="সেবায় গো-মাতা" hi="सेवा में गौ माता" />} tone="amber" />
        <Stat label={<T en="Milking now" bn="দুগ্ধবতী" hi="दुधारू" />} value={m.milking} sub={<T en="in milk" bn="দুধ দিচ্ছে" hi="दूध दे रही" />} tone="emerald" />
        <Stat label={<T en="Today's milk" bn="আজকের দুধ" hi="आज का दूध" />} value={`${m.todayMilk.toFixed(1)} L`} sub={<T en="recorded yield" bn="রেকর্ডকৃত" hi="दर्ज उत्पादन" />} tone="sky" />
        <Stat
          label={<T en="Daily grant gap" bn="দৈনিক অনুদান ঘাটতি" hi="दैनिक अनुदान अंतर" />}
          value={inr(m.gapPerDay * m.headcount)}
          sub={<T en={`₹${state.settings.estCostPerDay} cost vs ₹${state.settings.grantPerDay} grant / animal`} bn={`প্রতি পশু খরচ ₹${state.settings.estCostPerDay}, অনুদান ₹${state.settings.grantPerDay}`} hi={`प्रति पशु लागत ₹${state.settings.estCostPerDay}, अनुदान ₹${state.settings.grantPerDay}`} />}
          tone="red"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold text-stone-800 mb-2"><T en="Needs attention" bn="যত্ন প্রয়োজন" hi="ध्यान आवश्यक" /></h3>
          {m.sick.length === 0 && m.overdueVax.length === 0 && m.expiring.length === 0 ? (
            <p className="text-sm text-emerald-700"><T en="All Gau Mata healthy — no pending alerts. ॥ शुभम् ॥" bn="সব গো-মাতা সুস্থ — কোনো সতর্কতা নেই।" hi="सभी गौ माता स्वस्थ — कोई चेतावनी नहीं।" /></p>
          ) : (
            <ul className="space-y-2 text-sm">
              {m.sick.map((n) => (
                <li key={n.id} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <span className="font-semibold text-red-900">{n.name} <span className="text-red-500 font-normal">({n.tagId})</span></span>
                  <StatusPill status={n.status} />
                </li>
              ))}
              {m.overdueVax.map((h) => (
                <li key={h.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <span className="text-amber-900"><T en="Overdue" bn="বিলম্বিত" hi="अतिदेय" />: {h.title} — {nandiName(h.nandiId)}</span>
                  <span className="text-xs text-amber-700">{fmtDateEn(h.nextDue!)}</span>
                </li>
              ))}
              {m.expiring.map((s) => (
                <li key={s.id} className="flex items-center justify-between bg-sky-50 border border-sky-200 rounded-xl px-3 py-2">
                  <span className="text-sky-900"><T en="Sponsorship expiring" bn="পৃষ্ঠপোষকতা শেষ হচ্ছে" hi="प्रायोजन समाप्त हो रहा" />: {s.sponsorName}</span>
                  <span className="text-xs text-sky-700">{fmtDateEn(s.endDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="font-bold text-stone-800 mb-2"><T en="Upcoming vaccinations & follow-ups" bn="আসন্ন টিকা ও ফলো-আপ" hi="आगामी टीकाकरण" /></h3>
          {m.upcomingVax.length === 0 ? (
            <p className="text-sm text-stone-500"><T en="Nothing scheduled." bn="কিছু নির্ধারিত নেই।" hi="कुछ निर्धारित नहीं।" /></p>
          ) : (
            <ul className="space-y-2 text-sm">
              {m.upcomingVax.map((h) => (
                <li key={h.id} className="flex items-center justify-between border border-stone-200 rounded-xl px-3 py-2">
                  <span><b>{h.title}</b> — {nandiName(h.nandiId)}{h.vetName ? ` · ${h.vetName}` : ''}</span>
                  <span className="text-xs text-stone-600">{fmtDateEn(h.nextDue!)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 pt-3 border-t border-stone-100 grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-stone-500"><T en="Fodder stock" bn="খাদ্য মজুদ" hi="चारा भंडार" />:</span><br />
              <b className={m.lowest && m.lowest.days < 7 ? 'text-red-700' : 'text-stone-800'}>
                {m.lowest ? `${m.lowest.item.name} — ${m.lowest.days} ${m.lowest.days === 1 ? 'day' : 'days'}` : '—'}
              </b>
            </div>
            <div><span className="text-stone-500"><T en="Active sponsors" bn="সক্রিয় পৃষ্ঠপোষক" hi="सक्रिय प्रायोजक" />:</span><br /><b className="text-stone-800">{m.activeSponsors}</b></div>
            <div><span className="text-stone-500"><T en="Grants pending" bn="বিচারাধীন অনুদান" hi="लंबित अनुदान" />:</span><br /><b className="text-stone-800">{m.pendingGrants.length} · {inr(m.pendingGrants.reduce((s, g) => s + g.amountApplied, 0))}</b></div>
            <div><span className="text-stone-500"><T en="Monthly gap" bn="মাসিক ঘাটতি" hi="मासिक अंतर" />:</span><br /><b className="text-red-700">{inr(m.gapPerDay * m.headcount * 30)}</b></div>
          </div>
        </Card>
      </div>
    </div>
  );
};
