/**
 * WarRoomTab — Festival mission control (Pillar 2).
 * =====================================================================
 * Trustee view: auto-picked next major festival from the Panjika engine,
 * tithi-aware countdown, readiness ring, footfall planner (honest
 * estimates), prasad planner, then roster / budget / checklist / publish
 * sections below. Rendered as the "War Room" tab inside UtsavDesk —
 * no existing module restructured.
 */
import React, { useMemo, useState } from 'react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useUtsav } from '../../utsav/utsavStore';
import { T, Card, Btn, Field, Empty, inputCls, fmtDate } from '../../utsav/ui';
import {
  pickWarFestivals, warChecklistTemplate, projectFootfall, distributeFootfall,
  prasadTotals, rosterGaps, rosterFillPct, readinessScore,
  checklistDonePct, overdueChecklistItems, blankPlan, festivalDayList,
  ROSTER_ROLES, ROSTER_SHIFTS, type WarFestival, type PrasadItem, type PrasadUnit,
} from '../../lib/festival';
import { deriveDayCounts } from '../../lib/festivalRsvp';
import { festivalConcluded } from '../../lib/festivalMemory';
import { FestivalMemoryCard } from './FestivalMemoryCard';
import { useLanguage } from '../../context/LanguageContext';
import { FestivalWarProvider, useFestivalWar, useWarPlan, useFestivalCloud } from './festivalWarStore';
import { RosterCard } from './RosterCard';
import { BudgetWarCard } from './BudgetWarCard';
import { ChecklistOps } from './ChecklistOps';
import { PublishPanel } from './PublishPanel';

/* Readiness ring — one calm number. */
const ReadinessRing: React.FC<{ score: number }> = ({ score }) => {
  const r = 34;
  const c = 2 * Math.PI * r;
  const tone = score >= 75 ? '#047857' : score >= 40 ? '#b45309' : '#b91c1c';
  return (
    <div className="relative w-24 h-24 shrink-0" role="img" aria-label={`Readiness ${score} percent`}>
      <svg viewBox="0 0 84 84" className="w-24 h-24 -rotate-90">
        <circle cx="42" cy="42" r={r} fill="none" stroke="#f5f0e8" strokeWidth="10" />
        <circle cx="42" cy="42" r={r} fill="none" stroke={tone} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * score) / 100} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black text-stone-800">{score}%</span>
        <span className="text-[10px] text-stone-500 font-semibold"><T en="ready" bn="প্রস্তুত" hi="तैयार" /></span>
      </div>
    </div>
  );
};

const WarRoomInner: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const { currentLang } = useLanguage();
  const lang = (currentLang || 'en').slice(0, 2);
  const { state: utsav } = useUtsav();
  // Mission control shows the live festival AND what's next — the trustee
  // plans the current celebration while preparing the upcoming one.
  const festivals: WarFestival[] = useMemo(() => pickWarFestivals(), []);
  const [selKey, setSelKey] = useState<string | null>(null);
  const wf: WarFestival | null = festivals.find((f) => f.key === selKey) || festivals[0] || null;
  const { plan, patch } = useWarPlan(wf);
  const { cloudStatus } = useFestivalWar();
  const [showAddPrasad, setShowAddPrasad] = useState(false);
  const [newPrasad, setNewPrasad] = useState({ name: '', qty: '100', unit: 'g' as PrasadUnit });

  const cloud = useFestivalCloud(activeWorkspace.id, wf?.key || '', { subscribeRsvps: true });

  if (!wf) {
    return <Card><Empty text="No major festival found in the Panjika database for the coming period." /></Card>;
  }
  const p = plan || blankPlan(activeWorkspace.id, wf);

  const template = warChecklistTemplate(wf);
  const proj = projectFootfall(p.footfall);
  const gaps = rosterGaps(ROSTER_ROLES, ROSTER_SHIFTS, p.roster, p.rosterNeeded);
  const fillPct = rosterFillPct(gaps);
  const checkPct = template ? checklistDonePct(template, p.checklist) : 0;
  const budgetPlanned = utsav.budget.some((b) => b.kind === 'expense' && b.planned > 0);
  const prasadPlanned = p.prasad.some((it) => it.perPersonQty > 0);
  const score = readinessScore({
    checklistDonePct: checkPct, rosterFillPct: fillPct,
    budgetPlanned, prasadPlanned, footfallSet: proj.assumptionsSet,
  });
  const overdueIds = template ? overdueChecklistItems(template, p.checklist) : [];
  const prasadRows = prasadTotals(p.prasad, proj.base);
  const perDay = distributeFootfall(proj.base, wf.days);
  const maxDay = Math.max(...perDay, 1);

  return (
    <div className="space-y-4">
      {/* ── Festival switcher: live + up next ─────────────────────── */}
      {festivals.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Festivals">
          {festivals.map((f) => {
            const active = wf && f.key === wf.key;
            const sub = f.phase === 'live'
              ? <T en="● Live now" bn="● চলছে" hi="● चल रहा है" />
              : <T en={`${f.daysUntil}d to go`} bn={`${f.daysUntil} দিন বাকি`} hi={`${f.daysUntil} दिन शेष`} />;
            return (
              <button key={f.key} role="tab" aria-selected={!!active}
                onClick={() => setSelKey(f.key)}
                className={`shrink-0 rounded-xl px-3.5 py-2.5 text-sm border transition min-h-[44px] text-left ${
                  active
                    ? 'bg-gradient-to-r from-orange-700 to-red-800 text-orange-50 border-orange-800 shadow'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-orange-300'
                }`}>
                <span className="block font-bold">{f.name.en}</span>
                <span className={`block text-[11px] font-semibold ${active ? 'text-orange-200' : 'text-stone-400'}`}>{sub}</span>
              </button>
            );
          })}
        </div>
      )}
      {/* ── Header: countdown + readiness ─────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-orange-900 via-red-900 to-stone-900 text-orange-50 p-5 shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 25% 15%, #fbbf24 0, transparent 45%), radial-gradient(circle at 80% 85%, #f97316 0, transparent 40%)' }} />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-widest text-orange-300/80">
              <T en="Festival war-room" bn="উৎসব ওয়ার-রুম" hi="उत्सव वॉर-रूम" />
            </div>
            <h2 className="text-2xl font-black mt-1">{wf.name.en}</h2>
            <div className="text-sm text-orange-200/90 mt-0.5">🪔 {wf.tithiLine}</div>
            <div className="text-xs text-orange-200/70 mt-1">
              {fmtDate(wf.dateISO)}{wf.days > 1 ? ` → ${fmtDate(wf.endDateISO)}` : ''}
            </div>
            {/* The demo moment: a big, calm countdown */}
            <div className="mt-3 flex items-end gap-3">
              {wf.phase === 'countdown' ? (
                <>
                  <span className="text-6xl font-black leading-none tracking-tight">{wf.daysUntil}</span>
                  <span className="pb-1.5 text-sm font-semibold text-orange-200/90">
                    <T en="days to go" bn="দিন বাকি" hi="दिन शेष" />
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-red-500/25 border border-red-300/40 px-4 py-2 text-sm font-black">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  <T en={`Live now · day ${Math.max(1, -wf.daysUntil + 1)} of ${wf.days}`} bn={`চলছে · ${wf.days} দিনের ${Math.max(1, -wf.daysUntil + 1)}তম দিন`} hi={`चल रहा है · ${wf.days} दिनों का ${Math.max(1, -wf.daysUntil + 1)}वां दिन`} />
                </span>
              )}
            </div>
            {cloudStatus !== 'local' && (
              <div className="text-[11px] text-orange-200/60 mt-2">
                {cloudStatus === 'syncing' ? '☁️ syncing…' : cloudStatus === 'synced' ? '☁️ shared with your team' : '📴 offline — plans stay on this device'}
              </div>
            )}
          </div>
          <ReadinessRing score={score} />
        </div>
        {overdueIds.length > 0 && (
          <div className="mt-3 rounded-xl bg-amber-400/15 border border-amber-300/30 px-3 py-2 text-xs text-amber-100">
            🪔 <T en={`${overdueIds.length} preparation task${overdueIds.length > 1 ? 's' : ''} would like attention — see the checklist below.`}
              bn={`${overdueIds.length}টি প্রস্তুতির কাজে মনোযোগ দরকার — নিচের তালিকা দেখুন।`}
              hi={`${overdueIds.length} तैयारी कार्यों पर ध्यान चाहिए — नीचे सूची देखें।`} />
          </div>
        )}
      </div>

      {/* ── Footfall planner ──────────────────────────────────────── */}
      <Card>
        <h3 className="font-extrabold text-stone-800 mb-1">
          <T en="Footfall planner" bn="ভিড় পরিকল্পনা" hi="भीड़ योजना" />
        </h3>
        <p className="text-xs text-stone-500 mb-3">
          <T en="An honest estimate: last year's crowd, adjusted for growth. Rounded — because no one can count a crowd to the person."
            bn="একটি সৎ অনুমান: গত বছরের ভিড়, প্রবৃদ্ধি অনুযায়ী সমন্বয়। মোটামুটি — কারণ ভিড় কেউ নিখুঁত গুনতে পারে না।"
            hi="एक ईमानदार अनुमान: पिछले वर्ष की भीड़, वृद्धि अनुसार समायोजित। मोटा-मोटा — क्योंकि भीड़ कोई ठीक-ठीक नहीं गिन सकता।" />
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label={<T en="Last year's footfall" bn="গত বছরের ভিড়" hi="पिछले वर्ष की भीड़" />}>
            <input type="number" min={0} inputMode="numeric" className={inputCls}
              value={p.footfall.lastYear || ''} placeholder="e.g. 5000"
              onChange={(e) => patch({ footfall: { ...p.footfall, lastYear: Math.max(0, parseInt(e.target.value || '0', 10)) } })} />
          </Field>
          <Field label={<T en="Expected growth %" bn="প্রত্যাশিত প্রবৃদ্ধি %" hi="अपेक्षित वृद्धि %" />}>
            <input type="number" inputMode="decimal" className={inputCls}
              value={p.footfall.growthPct}
              onChange={(e) => patch({ footfall: { ...p.footfall, growthPct: parseFloat(e.target.value || '0') } })} />
          </Field>
        </div>
        {proj.assumptionsSet ? (
          <div className="mt-3">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-black text-stone-900">{proj.base.toLocaleString('en-IN')}</div>
                <div className="text-xs text-stone-500">
                  <T en={`Planning range ${proj.low.toLocaleString('en-IN')} – ${proj.high.toLocaleString('en-IN')}`} bn={`পরিকল্পনা সীমা ${proj.low.toLocaleString('en-IN')} – ${proj.high.toLocaleString('en-IN')}`} hi={`योजना सीमा ${proj.low.toLocaleString('en-IN')} – ${proj.high.toLocaleString('en-IN')}`} />
                </div>
              </div>
              {cloud.rsvpHeadcount > 0 && (
                <div className="text-right">
                  <div className="text-xl font-extrabold text-emerald-700">+{cloud.rsvpHeadcount.toLocaleString('en-IN')}</div>
                  <div className="text-[11px] text-stone-500"><T en="devotees RSVP'd (live signal)" bn="ভক্ত RSVP করেছেন (লাইভ সংকেত)" hi="भक्तों ने RSVP किया (लाइव संकेत)" /></div>
                </div>
              )}
            </div>
            {/* per-day distribution */}
            <div className="mt-3 flex items-end gap-1.5 h-20" aria-hidden>
              {perDay.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <span className="text-[10px] text-stone-500 font-semibold">{v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}</span>
                  <div className="w-full rounded-t-md bg-gradient-to-t from-orange-600 to-amber-400"
                    style={{ height: `${Math.max(6, (v / maxDay) * 56)}px` }} />
                  <span className="text-[10px] text-stone-400"><T en={`Day ${i + 1}`} bn={`দিন ${i + 1}`} hi={`दिन ${i + 1}`} /></span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-xl bg-stone-50 border border-stone-200 px-3 py-2.5 text-xs text-stone-500">
            <T en="Enter last year's footfall to see the projection. Your count, your judgment — the app only does the arithmetic."
              bn="অনুমান দেখতে গত বছরের ভিড় লিখুন। আপনার গণনা, আপনার বিচার — অ্যাপ শুধু হিসাব করে।"
              hi="अनुमान देखने हेतु पिछले वर्ष की भीड़ लिखें। आपकी गिनती, आपका निर्णय — ऐप केवल गणना करता है।" />
          </div>
        )}
      </Card>

      {/* ── Who is coming (EVENTS P1) — the organiser's real RSVP
          list: expected vs arrived, per-day counts derived from the
          records, day-of check-in. Committee-only by surface: this
          tab exists only inside the org console. ─────────────────── */}
      {cloud.rsvps.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-extrabold text-stone-800">
              <T en="Who is coming" bn="কারা আসছেন" hi="कौन आ रहा है" />
            </h3>
            <div className="text-right">
              <span className="text-lg font-black text-emerald-700">{cloud.arrivedHeadcount.toLocaleString('en-IN')}</span>
              <span className="text-stone-400 font-bold"> / {cloud.rsvpHeadcount.toLocaleString('en-IN')} </span>
              <span className="text-[11px] text-stone-500">
                <T en="arrived / expected" bn="এসেছেন / প্রত্যাশিত" hi="आए / अपेक्षित" />
              </span>
            </div>
          </div>
          {(() => {
            const days = festivalDayList(wf.dateISO, wf.endDateISO);
            const dayCounts = deriveDayCounts(cloud.rsvps, days);
            const waitlisted = cloud.rsvps.filter((r) => (r.status || 'confirmed') === 'waitlisted');
            const confirmed = cloud.rsvps.filter((r) => (r.status || 'confirmed') === 'confirmed');
            return (
              <>
                {days.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {dayCounts.map((d) => (
                      <span key={d.date} className="text-[11px] font-bold bg-orange-50 border border-orange-100 text-orange-900 rounded-lg px-2 py-1">
                        {fmtDate(d.date)} · {d.heads} <T en="expected" bn="প্রত্যাশিত" hi="अपेक्षित" />
                      </span>
                    ))}
                  </div>
                )}
                <ul className="divide-y divide-stone-100">
                  {confirmed.map((r) => (
                    <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-stone-800">{r.name}</span>
                        <span className="text-xs text-stone-400"> · {r.headcount}</span>
                        {r.days && r.days.length > 0 && (
                          <span className="text-[11px] text-stone-400"> · {r.days.map((d) => d.slice(5)).join(', ')}</span>
                        )}
                      </div>
                      <button
                        onClick={() => void cloud.toggleCheckin(r.id, !r.checkedIn).catch(() => undefined)}
                        aria-pressed={!!r.checkedIn}
                        className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold min-h-[44px] border transition ${
                          r.checkedIn
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-white border-stone-200 text-stone-600 hover:border-emerald-400'
                        }`}
                      >
                        {r.checkedIn ? (
                          <T en="✓ Arrived" bn="✓ এসেছেন" hi="✓ आ गए" />
                        ) : (
                          <T en="Mark arrived" bn="এসেছেন বলে চিহ্নিত" hi="आगमन दर्ज करें" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
                {waitlisted.length > 0 && (
                  <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
                    <p className="text-xs font-bold text-amber-800">
                      {waitlisted.length}{' '}
                      <T en="on the waitlist" bn="অপেক্ষা-তালিকায়" hi="प्रतीक्षा सूची में" />
                      : {waitlisted.map((r) => `${r.name} (${r.headcount})`).join(' · ')}
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      <T
                        en="In the order they joined — when a place frees, the first in line confirms first."
                        bn="যোগ দেওয়ার ক্রমে — জায়গা খালি হলে লাইনের প্রথম জনই প্রথমে নিশ্চিত হবেন।"
                        hi="जुड़ने के क्रम में — स्थान खाली होने पर पंक्ति में पहला ही पहले पक्का होगा।" />
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </Card>
      )}

      {/* EVENTS P2 — the memory card, once the festival has passed. */}
      {cloud.event && festivalConcluded(cloud.event, Date.now()) && (
        <FestivalMemoryCard
          event={cloud.event}
          rsvps={cloud.rsvps}
          tr={(l) => (lang === 'bn' ? l.bn : lang === 'hi' ? l.hi : l.en)}
        />
      )}

      {/* ── Prasad planner ────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-extrabold text-stone-800"><T en="Prasad planner" bn="প্রসাদ পরিকল্পনা" hi="प्रसाद योजना" /></h3>
          <Btn variant="ghost" className="!min-h-[44px]" onClick={() => setShowAddPrasad((s) => !s)}>
            <T en={showAddPrasad ? 'Close' : '+ Add item'} bn={showAddPrasad ? 'বন্ধ' : '+ যোগ করুন'} hi={showAddPrasad ? 'बंद करें' : '+ जोड़ें'} />
          </Btn>
        </div>
        <p className="text-xs text-stone-500 mb-3">
          <T en={`Per-person quantity × ${proj.assumptionsSet ? proj.base.toLocaleString('en-IN') : 'projected'} footfall. Order a little extra — prasad should never run out.`}
            bn={`জনপ্রতি পরিমাণ × ${proj.assumptionsSet ? proj.base.toLocaleString('en-IN') : 'অনুমানিত'} ভিড়। একটু বেশি অর্ডার করুন — প্রসাদ কখনো শেষ হওয়া উচিত নয়।`}
            hi={`प्रति व्यक्ति मात्रा × ${proj.assumptionsSet ? proj.base.toLocaleString('en-IN') : 'अनुमानित'} भीड़। थोड़ा अधिक मंगवाएं — प्रसाद कभी समाप्त नहीं होना चाहिए।`} />
        </p>
        {showAddPrasad && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 p-3 rounded-xl bg-orange-50/60 border border-orange-100">
            <input className={`${inputCls} col-span-2`} placeholder="Item name"
              value={newPrasad.name} onChange={(e) => setNewPrasad({ ...newPrasad, name: e.target.value })} />
            <input type="number" min={0} className={inputCls} placeholder="Qty / person"
              value={newPrasad.qty} onChange={(e) => setNewPrasad({ ...newPrasad, qty: e.target.value })} />
            <select className={inputCls} value={newPrasad.unit}
              onChange={(e) => setNewPrasad({ ...newPrasad, unit: e.target.value as PrasadUnit })}>
              <option value="g">g</option><option value="ml">ml</option><option value="pc">pc</option>
            </select>
            <div className="col-span-2 sm:col-span-4">
              <Btn className="w-full" disabled={!newPrasad.name.trim()}
                onClick={() => {
                  const item: PrasadItem = {
                    id: `pr_${Date.now().toString(36)}`,
                    name: { en: newPrasad.name.trim(), bn: newPrasad.name.trim(), hi: newPrasad.name.trim() },
                    perPersonQty: Math.max(0, parseFloat(newPrasad.qty || '0')),
                    unit: newPrasad.unit,
                  };
                  patch({ prasad: [...p.prasad, item] });
                  setNewPrasad({ name: '', qty: '100', unit: 'g' });
                  setShowAddPrasad(false);
                }}>
                <T en="Add prasad item" bn="প্রসাদ যোগ করুন" hi="प्रसाद जोड़ें" />
              </Btn>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {prasadRows.map((row) => (
            <div key={row.id} className="rounded-xl border border-stone-100 bg-stone-50/60 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-bold text-stone-800 min-w-0">{row.name.en}</div>
                <button aria-label="Remove item"
                  className="w-11 h-11 -m-1 shrink-0 rounded-xl text-stone-300 hover:text-red-600 hover:bg-red-50 font-bold"
                  onClick={() => patch({ prasad: p.prasad.filter((it) => it.id !== row.id) })}>✕</button>
              </div>
              <div className="mt-1 flex items-end justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <input type="number" min={0} step="any" aria-label="per person quantity"
                    className="w-20 rounded-lg border border-stone-200 px-2 py-1.5 text-xs min-h-[44px]"
                    value={row.perPersonQty}
                    onChange={(e) => patch({ prasad: p.prasad.map((it) => it.id === row.id ? { ...it, perPersonQty: Math.max(0, parseFloat(e.target.value || '0')) } : it) })} />
                  <select aria-label="unit" className="rounded-lg border border-stone-200 px-1.5 py-1.5 text-xs min-h-[44px]"
                    value={row.unit}
                    onChange={(e) => patch({ prasad: p.prasad.map((it) => it.id === row.id ? { ...it, unit: e.target.value as PrasadUnit } : it) })}>
                    <option value="g">g</option><option value="ml">ml</option><option value="pc">pc</option>
                  </select>
                  <span className="text-[11px] text-stone-400 whitespace-nowrap"><T en="/ person" bn="/ জন" hi="/ व्यक्ति" /></span>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base font-black text-orange-800">{row.display}</div>
                  <div className="text-[10px] text-stone-400"><T en="to order" bn="অর্ডার" hi="ऑर्डर" /></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Roster / Budget / Checklist / Publish ─────────────────── */}
      <RosterCard wf={wf} plan={p} patch={patch} gaps={gaps} />
      <BudgetWarCard />
      {template && <ChecklistOps wf={wf} plan={p} patch={patch} template={template} />}
      <PublishPanel wf={wf} plan={p} />
    </div>
  );
};

export const WarRoomTab: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  return (
    <FestivalWarProvider workspaceId={activeWorkspace.id}>
      <WarRoomInner />
    </FestivalWarProvider>
  );
};

export default WarRoomTab;
