import React, { useMemo, useState } from 'react';
import { useCashCustody, denomTotal, emptyCounts } from './cashCustodyStore';
import { CountingSession, DenomKey, DENOMINATIONS, DENOM_LABEL } from './types';
import { T, Card, Btn, Field, inputCls, StatusPill, fmtDateTime, inr } from './ui';
import { useToast } from '../context/ToastContext';

/* ------------------------------------------------------------------ */
/* Counting session — denomination-wise entry with maker-checker.      */
/* One person counts (maker); a second person counts independently      */
/* (checker). Any discrepancy must be resolved — re-count or a signed  */
/* note — before the session can close.                                */
/*                                                                     */
/* 80G HONESTY: hundi cash is anonymous, so no 80G receipt can ever be */
/* issued for it — and cash above ₹2,000 kills the deduction by law.   */
/* The UI warns; it never promises.                                    */
/* ------------------------------------------------------------------ */

const DenomGrid: React.FC<{
  counts: Record<DenomKey, number>;
  onChange: (k: DenomKey, v: number) => void;
  disabled?: boolean;
  other?: Record<DenomKey, number>;
}> = ({ counts, onChange, disabled, other }) => (
  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
    {DENOMINATIONS.map((k) => {
      const mismatch = other && (Number(other[k]) || 0) !== (Number(counts[k]) || 0);
      return (
        <label key={k} className={`block rounded-xl border p-2 ${mismatch ? 'border-red-300 bg-red-50' : 'border-stone-200 bg-stone-50'}`}>
          <span className="text-[11px] font-bold text-stone-500">{DENOM_LABEL[k]}{k === 'coins' ? ' (₹)' : ' ×'}</span>
          <input
            type="number" min={0} disabled={disabled}
            className="w-full bg-transparent text-lg font-extrabold text-stone-800 focus:outline-none"
            value={counts[k] || ''}
            placeholder="0"
            onChange={(e) => onChange(k, Math.max(0, Math.floor(Number(e.target.value) || 0)))}
          />
          <span className="text-[11px] text-stone-400">{inr((Number(counts[k]) || 0) * (k === 'coins' ? 1 : Number(k)))}</span>
        </label>
      );
    })}
  </div>
);

const SessionCard: React.FC<{ session: CountingSession }> = ({ session }) => {
  const { state, update, logEvent } = useCashCustody();
  const { showToast } = useToast();
  const box = state.boxes.find((b) => b.id === session.boxId);
  const [makerCounts, setMakerCounts] = useState<Record<DenomKey, number>>({ ...session.makerCounts });
  const [makerName, setMakerName] = useState(session.makerName);
  const [checkerCounts, setCheckerCounts] = useState<Record<DenomKey, number>>({ ...(session.checkerCounts || emptyCounts()) });
  const [checkerName, setCheckerName] = useState(session.checkerName || '');
  const [note, setNote] = useState(session.discrepancyNote || '');

  const makerTotal = useMemo(() => denomTotal(makerCounts), [makerCounts]);
  const checkerTotal = useMemo(() => denomTotal(checkerCounts), [checkerCounts]);
  // NOTE: mismatch is derived from the live count state, never from the
  // (possibly stale) session prop — a stale gate once let a mismatched
  // verification through as "resolved". The checker-submitted flag comes
  // from fresh store state via `cur` below.
  const liveMismatch = makerTotal !== checkerTotal;

  const setMaker = (k: DenomKey, v: number) => setMakerCounts((c) => ({ ...c, [k]: v }));
  const setChecker = (k: DenomKey, v: number) => setCheckerCounts((c) => ({ ...c, [k]: v }));

  const cur = state.sessions.find((x) => x.id === session.id) || session;
  const checkerSubmitted = !!cur.checkerName;
  const mismatch = checkerSubmitted && liveMismatch;

  const submitMaker = () => {
    if (!makerName.trim()) { showToast('Enter the counter (maker) name.', 'warning'); return; }
    if (makerTotal <= 0) { showToast('Enter at least one denomination count.', 'warning'); return; }
    update('sessions', session.id, { makerCounts, makerName: makerName.trim(), total: makerTotal, status: 'counting' });
    update('boxes', session.boxId, { status: 'counting' });
    logEvent('count_started', makerName.trim(), `${box?.boxCode} counted by ${makerName.trim()} — ${inr(makerTotal)}`);
    showToast(`Count submitted: ${inr(makerTotal)}. Awaiting independent verification.`, 'success');
  };

  const submitChecker = () => {
    if (!checkerName.trim()) { showToast('Enter the verifier (checker) name.', 'warning'); return; }
    const makerN = (cur.makerName || makerName).trim();
    if (checkerName.trim().toLowerCase() === makerN.toLowerCase()) {
      showToast('Maker-checker needs TWO different persons — the counter cannot verify their own count.', 'error'); return;
    }
    // Compute from the just-entered values, not from render-closure flags.
    const isMismatch = denomTotal(makerCounts) !== denomTotal(checkerCounts);
    update('sessions', session.id, {
      checkerCounts, checkerName: checkerName.trim(),
      discrepancyNote: undefined,
      discrepancyResolved: !isMismatch,
      status: 'verified',
    });
    logEvent('count_verified', checkerName.trim(),
      `${box?.boxCode} verified by ${checkerName.trim()} — ${inr(denomTotal(checkerCounts))}${isMismatch ? ` (MISMATCH vs maker ${inr(denomTotal(makerCounts))})` : ' (matches maker)'}`);
    showToast(isMismatch ? 'Counts differ — resolve the discrepancy before closing.' : 'Verified — counts match.', isMismatch ? 'warning' : 'success');
  };

  const resolveDiscrepancy = () => {
    if (!note.trim()) { showToast('Write a signed resolution note first.', 'warning'); return; }
    update('sessions', session.id, { discrepancyNote: note.trim(), discrepancyResolved: true });
    logEvent('count_verified', cur.checkerName || 'checker', `${box?.boxCode} discrepancy resolved by note: ${note.trim()}`);
    showToast('Discrepancy resolved by note.', 'success');
  };

  const closeSession = () => {
    const s = state.sessions.find((x) => x.id === session.id);
    if (!s) return;
    if (s.status !== 'verified') { showToast('Verify the count before closing.', 'warning'); return; }
    if ((denomTotal(s.checkerCounts || emptyCounts()) !== denomTotal(s.makerCounts)) && !s.discrepancyResolved) {
      showToast('Unresolved discrepancy — resolve it before closing.', 'error'); return;
    }
    const finalTotal = denomTotal(s.makerCounts);
    update('sessions', session.id, { status: 'closed', total: finalTotal, closedAt: Date.now() });
    update('boxes', session.boxId, { status: 'closed' });
    logEvent('session_closed', s.checkerName || s.makerName, `${box?.boxCode} session closed — final ${inr(finalTotal)}`);
    showToast(`Session closed at ${inr(finalTotal)}. Create the deposit slip next.`, 'success');
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <div className="font-extrabold text-stone-800">{box?.boxCode} — {box?.name}</div>
          <div className="text-xs text-stone-500">Opened {fmtDateTime(cur.openedAt)} by {cur.openedBy1} + {cur.openedBy2} · seal {cur.sealNumberVerified}</div>
        </div>
        <StatusPill status={cur.status} />
      </div>

      {/* Maker */}
      <div className="mt-4">
        <div className="text-sm font-extrabold text-stone-700 mb-2">1️⃣ <T en="Counter (maker)" bn="গণনাকারী" hi="गणनाकर्ता" /></div>
        <DenomGrid counts={makerCounts} onChange={setMaker} disabled={cur.status !== 'open'} />
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <input className={`${inputCls} max-w-xs`} value={makerName} disabled={cur.status !== 'open'}
            onChange={(e) => setMakerName(e.target.value)} placeholder="Counter full name" />
          <span className="font-extrabold text-lg text-amber-800">{inr(makerTotal)}</span>
          {cur.status === 'open' && <Btn onClick={submitMaker}><T en="Submit count" bn="গণনা জমা" hi="गणना जमा करें" /></Btn>}
        </div>
      </div>

      {/* Checker */}
      {(cur.status === 'counting' || cur.status === 'verified' || cur.status === 'closed') && (
        <div className="mt-5 pt-4 border-t border-stone-100">
          <div className="text-sm font-extrabold text-stone-700 mb-2">2️⃣ <T en="Independent verifier (checker)" bn="স্বতন্ত্র যাচাইকারী" hi="स्वतंत्र सत्यापनकर्ता" /></div>
          <DenomGrid counts={checkerCounts} onChange={setChecker} disabled={cur.status !== 'counting'} other={cur.makerCounts} />
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <input className={`${inputCls} max-w-xs`} value={checkerName} disabled={cur.status !== 'counting'}
              onChange={(e) => setCheckerName(e.target.value)} placeholder="Verifier full name (not the counter)" />
            <span className="font-extrabold text-lg text-indigo-800">{inr(checkerTotal)}</span>
            {cur.status === 'counting' && <Btn variant="emerald" onClick={submitChecker}><T en="Submit verification" bn="যাচাই জমা" hi="सत्यापन जमा करें" /></Btn>}
          </div>
          {mismatch && !cur.discrepancyResolved && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
              <div className="text-sm font-bold text-red-700">
                ⚠️ <T en="Discrepancy" bn="অমিল" hi="अंतर" />: maker {inr(denomTotal(cur.makerCounts))} vs checker {inr(checkerTotal)}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <input className={`${inputCls} flex-1 min-w-[200px]`} value={note}
                  onChange={(e) => setNote(e.target.value)} placeholder="Signed resolution note — recount done, counter re-checked…" />
                <Btn variant="danger" onClick={resolveDiscrepancy}><T en="Resolve by note" bn="নোটে সমাধান" hi="नोट से समाधान" /></Btn>
              </div>
              <p className="text-xs text-red-600 mt-1"><T en="The session cannot close until this is resolved." bn="সমাধান না হওয়া পর্যন্ত সেশন বন্ধ হবে না।" hi="समाधान के बिना सत्र बंद नहीं होगा।" /></p>
            </div>
          )}
          {mismatch && cur.discrepancyResolved && (
            <p className="text-sm font-bold text-amber-700 mt-2">📝 <T en="Discrepancy resolved by signed note" bn="নোটে সমাধান হয়েছে" hi="नोट से समाधान हो गया" />: {cur.discrepancyNote}</p>
          )}
          {cur.status === 'verified' && checkerSubmitted && !mismatch && (
            <p className="text-sm font-bold text-emerald-700 mt-2">✓ <T en="Counts match — ready to close." bn="গণনা মিলেছে।" hi="गणना मिल गई।" /></p>
          )}
        </div>
      )}

      {cur.status === 'verified' && (
        <div className="mt-4 no-print">
          <Btn variant="emerald" onClick={closeSession}>🔒 <T en={`Close session — ${inr(denomTotal(cur.makerCounts))}`} bn="সেশন বন্ধ করুন" hi="सत्र बंद करें" /></Btn>
        </div>
      )}
    </Card>
  );
};

export const CountingTab: React.FC = () => {
  const { state } = useCashCustody();
  const open = state.sessions.filter((s) => s.status !== 'closed').sort((a, b) => b.openedAt - a.openedAt);
  const closed = state.sessions.filter((s) => s.status === 'closed').sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 no-print">
        <span className="font-bold">80G — <T en="please note" bn="অনুগ্রহ করে নোট করুন" hi="कृपया ध्यान दें" />: </span>
        <T en="Hundi cash is anonymous — no 80G receipt can ever be issued for it. By law, cash donations above ₹2,000 also lose the 80G deduction. Donors who want 80G must give at the counter with PAN."
          bn="হুন্ডির নগদ বেনামি — এর জন্য 80G রসিদ দেওয়া যায় না। ₹2,000-এর বেশি নগদে 80G ছাড় বাতিল।"
          hi="हुंडी नकद गुमनाम है — इस पर 80G रसीद नहीं बन सकती। ₹2,000 से अधिक नकद पर 80G छूट समाप्त।" />
      </div>

      <h2 className="text-lg font-extrabold text-stone-800"><T en="Open sessions" bn="খোলা সেশন" hi="खुले सत्र" /> ({open.length})</h2>
      {open.map((s) => <SessionCard key={s.id} session={s} />)}
      {open.length === 0 && (
        <Card><p className="text-sm text-stone-500"><T en="No open sessions. Open a hundi box from the Hundi Boxes tab to start counting." bn="কোনো খোলা সেশন নেই।" hi="कोई खुला सत्र नहीं।" /></p></Card>
      )}

      {closed.length > 0 && (
        <>
          <h2 className="text-lg font-extrabold text-stone-800 pt-2"><T en="Recently closed" bn="সম্প্রতি বন্ধ" hi="हाल में बंद" /></h2>
          <Card>
            <div className="divide-y divide-stone-100">
              {closed.slice(0, 8).map((s) => {
                const box = state.boxes.find((b) => b.id === s.boxId);
                return (
                  <div key={s.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                    <span className="text-stone-600">{box?.boxCode} · {s.closedAt ? fmtDateTime(s.closedAt) : ''} · {s.makerName} / {s.checkerName}</span>
                    <span className="font-extrabold text-stone-800">{inr(s.total)}{s.treasuryTxId ? ' · treasury ✓' : ''}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
