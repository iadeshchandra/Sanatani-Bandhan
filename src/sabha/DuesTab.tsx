import React, { useState } from 'react';
import { useSabha, uid, todayISO, thisYear, nextDuesReceipt, duesCollected, duesDefaulters, activeMembers } from './sabhaStore';
import { DuesEntry } from './types';
import { T, Card, Btn, Field, inputCls, Modal, StatusPill, fmtDate, Empty } from './ui';
import { useInr, useWorkspaceCurrency } from '../hooks/useWorkspaceInr';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';

/* ------------------------------------------------------------------ */
/* Membership dues — annual collection with receipts, posted to       */
/* treasury as income. Honest: 80G eligibility must be confirmed with  */
/* the CA — entries post as non-80G income and the UI says so.        */
/* ------------------------------------------------------------------ */

export const DuesTab: React.FC = () => {
  const inr = useInr();
  const wsCurrency = useWorkspaceCurrency();
  const { state, add, update, remove, setSettings } = useSabha();
  const { addTreasuryTransaction } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();
  const [year, setYear] = useState(thisYear());
  const [forming, setForming] = useState(false);
  const [form, setForm] = useState({ memberId: '', amount: '', date: todayISO() });
  const members = activeMembers(state);

  const years = Array.from(new Set([thisYear(), thisYear() - 1, ...state.dues.map((d) => d.year)])).sort((a, b) => b - a);
  const rows = state.dues.filter((d) => d.year === year).sort((a, b) => b.createdAt - a.createdAt);
  const defaulters = duesDefaulters(state, year);

  const save = () => {
    const amt = Number(form.amount);
    if (!form.memberId) { showToast('Please choose a member.', 'warning'); return; }
    if (!amt || amt <= 0) { showToast('Please enter a valid amount.', 'warning'); return; }
    if (state.dues.some((d) => d.memberId === form.memberId && d.year === year)) {
      showToast('This member already paid for this year.', 'warning');
      return;
    }
    const { receiptNo, seq } = nextDuesReceipt(state.settings);
    add('dues', {
      id: uid('du'), memberId: form.memberId, year,
      amount: amt, date: form.date, receiptNo, createdAt: Date.now(),
    });
    setSettings({ duesReceiptSeq: seq });
    showToast(`Dues recorded — receipt ${receiptNo}.`, 'success');
    setForming(false);
    setForm({ memberId: '', amount: '', date: todayISO() });
  };

  const postToTreasury = (d: DuesEntry) => {
    if (d.treasuryTxId) { showToast('Already posted to treasury.', 'warning'); return; }
    const who = state.members.find((m) => m.id === d.memberId)?.name || '';
    const ok = addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      date: new Date(d.date).toISOString(),
      type: 'Income', category: 'Membership Dues',
      subcategory: `Sabha One — ${d.year}`,
      amount: d.amount,
      handledBy: who || 'Sabha',
      paymentMode: 'Cash', referenceNo: d.receiptNo,
      purpose: `Sabha membership dues ${d.year} — ${who} (${d.receiptNo})`,
      // Honest: membership dues are generally not 80G-eligible.
      is80GEligible: false, taxReceiptIssued: false,
      devoteeName: who || 'Sabha member',
    });
    if (ok) {
      update('dues', d.id, { treasuryTxId: 'posted' });
      showToast('Posted to treasury as non-80G dues income.', 'success');
    } else {
      showToast('Treasury posting failed — entry kept locally, retry later.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <select className={inputCls} style={{ maxWidth: 140 }} value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <div>
              <div className="text-2xl font-extrabold text-amber-900">{inr(duesCollected(state, year))}</div>
              <div className="text-xs font-semibold text-stone-500">
                <T en={`collected · ${rows.length} paid · ${defaulters.length} pending`} bn={`সংগৃহীত · ${rows.length} পরিশোধিত · ${defaulters.length} বকেয়া`} hi={`संग्रहित · ${rows.length} भुगतान · ${defaulters.length} बकाया`} />
              </div>
            </div>
          </div>
          <Btn onClick={() => { setForm({ memberId: '', amount: String(state.settings.annualDues), date: todayISO() }); setForming(true); }} className="no-print">
            ＋ <T en="Collect dues" bn="চাঁদা সংগ্রহ" hi="शुल्क लें" />
          </Btn>
        </div>
      </Card>

      {rows.length === 0 && <Empty text={`No dues recorded for ${year} yet.`} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((d) => {
          const who = state.members.find((m) => m.id === d.memberId)?.name || '—';
          return (
            <Card key={d.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-extrabold text-stone-800">{who} · {inr(d.amount)}</div>
                  <div className="text-xs text-stone-500 font-mono">{d.receiptNo} · {fmtDate(d.date)}</div>
                </div>
                {d.treasuryTxId ? <StatusPill status="posted" /> : <StatusPill status="pending" />}
              </div>
              <div className="flex flex-wrap gap-2 mt-3 no-print">
                {!d.treasuryTxId && <Btn onClick={() => postToTreasury(d)}>💰 <T en="Post to treasury" bn="কোষাগারে পোস্ট" hi="कोषागार में दर्ज करें" /></Btn>}
                <Btn variant="danger" onClick={() => { if (window.confirm('Remove this dues entry?')) { remove('dues', d.id); showToast('Removed.', 'info'); } }}>
                  <T en="Remove" bn="মুছুন" hi="हटाएं" />
                </Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {defaulters.length > 0 && (
        <Card>
          <div className="text-sm font-bold text-red-700 mb-2">
            💰 <T en={`Pending · ${year} (${defaulters.length})`} bn={`${year} বকেয়া (${defaulters.length})`} hi={`${year} बकाया (${defaulters.length})`} />
          </div>
          <div className="text-xs text-stone-600">
            {defaulters.map((m) => m.name).join(', ')}
          </div>
        </Card>
      )}

      {forming && (
        <Modal title={<T en={`Collect dues · ${year}`} bn={`${year} চাঁদা সংগ্রহ`} hi={`${year} शुल्क लें`} />} onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Member" bn="সদস্য" hi="सदस्य" />} className="sm:col-span-2">
              <select className={inputCls} value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
                <option value="">—</option>
                {defaulters.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label={<T en={`Amount (${wsCurrency.symbol})`} bn={`টাকা (${wsCurrency.symbol})`} hi={`राशि (${wsCurrency.symbol})`} />}>
              <input type="number" min="1" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}>
              <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
          </div>
          <div className="text-xs text-stone-500 mt-3">
            <T en="Standard annual dues" bn="মানক বার্ষিক চাঁদা" hi="मानक वार्षिक शुल्क" />: {inr(state.settings.annualDues)}{' '}
            <button type="button" className="underline text-amber-700" onClick={() => {
              const v = window.prompt(`Set standard annual dues (${wsCurrency.symbol}):`, String(state.settings.annualDues));
              const n = Number(v);
              if (n > 0) { setSettings({ annualDues: n }); setForm((f) => ({ ...f, amount: String(n) })); }
            }}>
              <T en="change" bn="বদলান" hi="बदलें" />
            </button>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={save}><T en="Save" bn="সংরক্ষণ" hi="सहेजें" /></Btn>
            <Btn variant="ghost" onClick={() => setForming(false)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
