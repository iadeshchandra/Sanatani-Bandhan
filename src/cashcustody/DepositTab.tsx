import React, { useState } from 'react';
import { useCashCustody, uid, todayISO, nextSlipNo } from './cashCustodyStore';
import { CountingSession, DepositSlip, DENOMINATIONS, DENOM_LABEL } from './types';
import { T, Card, Btn, Field, inputCls, StatusPill, fmtDateTime } from './ui';
import { useInr } from '../hooks/useWorkspaceInr';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';

/* ------------------------------------------------------------------ */
/* Bank deposit slips — auto-generated from a closed counting session. */
/* Posting to treasury records hundi income in the cloud ledger; the   */
/* slip itself stays device-local. Anonymous hundi cash is never 80G-  */
/* eligible — posted honestly as non-80G income.                       */
/* ------------------------------------------------------------------ */

export const DepositTab: React.FC = () => {
  const inr = useInr();
  const { state, add, update, setSettings, logEvent } = useCashCustody();
  const { addTreasuryTransaction } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();
  const [forming, setForming] = useState<CountingSession | null>(null);
  const [bank, setBank] = useState({ name: state.settings.defaultBankName, branch: state.settings.defaultBankBranch, date: todayISO() });
  const [printing, setPrinting] = useState<string | null>(null);

  const closable = state.sessions.filter((s) => s.status === 'closed' && !s.depositId);

  const createSlip = (session: CountingSession) => {
    setBank({ name: state.settings.defaultBankName, branch: state.settings.defaultBankBranch, date: todayISO() });
    setForming(session);
  };

  const confirmSlip = () => {
    if (!forming) return;
    const { slipNo, seq } = nextSlipNo(state.settings);
    const box = state.boxes.find((b) => b.id === forming.boxId);
    const slip: DepositSlip = {
      id: uid('dp'), slipNo, sessionId: forming.id, boxId: forming.boxId,
      amount: forming.total, denominationMix: { ...forming.makerCounts },
      countedBy: forming.makerName, verifiedBy: forming.checkerName || '',
      createdAt: Date.now(), depositDate: bank.date,
      bankName: bank.name.trim() || undefined, bankBranch: bank.branch.trim() || undefined,
      status: 'pending',
    };
    add('deposits', slip);
    update('sessions', forming.id, { depositId: slip.id });
    setSettings({ slipSeq: seq, defaultBankName: bank.name.trim(), defaultBankBranch: bank.branch.trim() });
    logEvent('deposit_created', forming.checkerName || forming.makerName, `Slip ${slipNo} — ${box?.boxCode} ${inr(forming.total)} → ${bank.name.trim() || 'bank'}`);
    showToast(`Deposit slip ${slipNo} created.`, 'success');
    setForming(null);
  };

  const postToTreasury = (slip: DepositSlip) => {
    if (slip.treasuryTxId) { showToast('Already posted to treasury.', 'warning'); return; }
    const box = state.boxes.find((b) => b.id === slip.boxId);
    const ok = addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      date: new Date(slip.depositDate).toISOString(),
      type: 'Income', category: 'Hundi Collection',
      subcategory: `Cash Custody — ${box?.boxCode || ''} ${box?.name || ''}`.trim(),
      amount: slip.amount,
      handledBy: `${slip.countedBy} / ${slip.verifiedBy}`,
      paymentMode: 'Cash', referenceNo: slip.slipNo,
      purpose: `Hundi collection deposit — slip ${slip.slipNo} (${box?.boxCode})`,
      // Honest: anonymous hundi cash can never be 80G-eligible.
      is80GEligible: false, taxReceiptIssued: false,
      devoteeName: 'Hundi collection (anonymous)',
    });
    if (ok) {
      update('deposits', slip.id, { treasuryTxId: 'posted', status: 'deposited', depositedAt: Date.now() });
      update('sessions', slip.sessionId, { treasuryTxId: 'posted' });
      logEvent('deposit_confirmed', slip.countedBy, `Slip ${slip.slipNo} posted to treasury — ${inr(slip.amount)}`);
      showToast(`Posted to treasury as hundi income (non-80G, anonymous cash).`, 'success');
    } else {
      showToast('Treasury posting failed — slip kept locally, retry later.', 'error');
    }
  };

  const printSlip = (id: string) => {
    setPrinting(id);
    setTimeout(() => { window.print(); setPrinting(null); }, 150);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold text-stone-800">
        <T en="Bank deposit slips" bn="ব্যাংক জমা স্লিপ" hi="बैंक जमा पर्ची" />
      </h2>

      {closable.length > 0 && (
        <Card>
          <div className="text-sm font-bold text-stone-700 mb-2"><T en="Closed sessions awaiting a slip" bn="স্লিপের অপেক্ষায়" hi="पर्ची की प्रतीक्षा में" /></div>
          <div className="flex flex-wrap gap-2">
            {closable.map((s) => {
              const box = state.boxes.find((b) => b.id === s.boxId);
              return (
                <Btn key={s.id} onClick={() => createSlip(s)}>
                  🧾 {box?.boxCode} — {inr(s.total)}
                </Btn>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {state.deposits.slice().sort((a, b) => b.createdAt - a.createdAt).map((d) => {
          const box = state.boxes.find((b) => b.id === d.boxId);
          const isPrinting = printing === d.id;
          return (
            <Card key={d.id} className={isPrinting ? 'print-slip' : ''}>
              <div className={isPrinting ? '' : ''}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-extrabold text-stone-800 font-mono">{d.slipNo}</div>
                    <div className="text-xs text-stone-500">{box?.boxCode} — {box?.name} · created {fmtDateTime(d.createdAt)}</div>
                  </div>
                  <StatusPill status={d.status} />
                </div>
                <div className="mt-3 text-sm">
                  <div className="flex justify-between py-1 border-b border-stone-100"><span className="text-stone-500">Amount</span><span className="font-extrabold text-lg">{inr(d.amount)}</span></div>
                  <div className="flex justify-between py-1 border-b border-stone-100"><span className="text-stone-500">Counted by</span><span className="font-semibold">{d.countedBy}</span></div>
                  <div className="flex justify-between py-1 border-b border-stone-100"><span className="text-stone-500">Verified by</span><span className="font-semibold">{d.verifiedBy}</span></div>
                  <div className="flex justify-between py-1 border-b border-stone-100"><span className="text-stone-500">Bank</span><span className="font-semibold">{d.bankName || '—'}{d.bankBranch ? `, ${d.bankBranch}` : ''}</span></div>
                  <div className="flex justify-between py-1"><span className="text-stone-500">Deposit date</span><span className="font-semibold">{d.depositDate}</span></div>
                </div>
                <div className="mt-2 text-xs text-stone-500">
                  {DENOMINATIONS.filter((k) => (d.denominationMix[k] || 0) > 0).map((k) => `${DENOM_LABEL[k]}×${d.denominationMix[k]}`).join(' · ')}
                </div>
                <div className="flex flex-wrap gap-2 mt-3 no-print">
                  {!d.treasuryTxId && (
                    <Btn variant="emerald" onClick={() => postToTreasury(d)}>💰 <T en="Post to treasury" bn="কোষাগারে পোস্ট" hi="कोषागार में दर्ज करें" /></Btn>
                  )}
                  {d.treasuryTxId && <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">✓ treasury posted</span>}
                  <Btn variant="ghost" onClick={() => printSlip(d.id)}>🖨️ <T en="Print" bn="প্রিন্ট" hi="प्रिंट" /></Btn>
                </div>
              </div>
            </Card>
          );
        })}
        {state.deposits.length === 0 && (
          <Card><p className="text-sm text-stone-500"><T en="No deposit slips yet. Close a counting session first." bn="এখনও কোনো স্লিপ নেই।" hi="अभी कोई पर्ची नहीं।" /></p></Card>
        )}
      </div>

      {forming && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <h3 className="font-extrabold text-stone-800 text-lg">🧾 <T en="New deposit slip" bn="নতুন জমা স্লিপ" hi="नई जमा पर्ची" /></h3>
            <p className="text-sm text-stone-600 mt-1"><T en="Amount" bn="টাকা" hi="राशि" />: <span className="font-extrabold">{inr(forming.total)}</span></p>
            <div className="grid grid-cols-1 gap-3 mt-4">
              <Field label={<T en="Bank name" bn="ব্যাংকের নাম" hi="बैंक का नाम" />}>
                <input className={inputCls} value={bank.name} onChange={(e) => setBank({ ...bank, name: e.target.value })} placeholder="State Bank of India" />
              </Field>
              <Field label={<T en="Branch" bn="শাখা" hi="शाखा" />}>
                <input className={inputCls} value={bank.branch} onChange={(e) => setBank({ ...bank, branch: e.target.value })} placeholder="Main branch" />
              </Field>
              <Field label={<T en="Deposit date" bn="জমার তারিখ" hi="जमा तिथि" />}>
                <input type="date" className={inputCls} value={bank.date} onChange={(e) => setBank({ ...bank, date: e.target.value })} />
              </Field>
            </div>
            <div className="flex gap-2 mt-4">
              <Btn variant="emerald" onClick={confirmSlip}><T en="Create slip" bn="স্লিপ তৈরি" hi="पर्ची बनाएं" /></Btn>
              <Btn variant="ghost" onClick={() => setForming(null)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
