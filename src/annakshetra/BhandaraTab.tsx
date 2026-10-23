import React, { useMemo, useState } from 'react';
import { useAnnakshetra, uid, todayISO, estimateCost } from './annakshetraStore';
import { Card, Btn, Field, inputCls, Modal, T, useLocaleText, StatusPill } from './ui';
import { useInr, useWorkspaceCurrency } from '../hooks/useWorkspaceInr';
import { useData } from '../context/DataContext';
import { claimNextReceiptSeq } from '../context/data/receiptCounterSync';
import {
  formatProvisionalReceiptNumber,
  formatReceiptNumber,
  parseReceiptNumber,
} from '../utils/receiptNumbers';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useToast } from '../context/ToastContext';

/* Annakshetra One — bhandara events: sponsored community meals with
 * donor attribution, served counts, cost estimates, and treasury
 * postings. 80G path is honest: eligibility requires the institution's
 * own 80G registration — never assumed. */

export const BhandaraTab: React.FC = () => {
  const { state, add, update } = useAnnakshetra();
  const { addTreasuryTransaction, getNextReceiptNumber } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();
  const { tr } = useLocaleText();
  const [showNew, setShowNew] = useState(false);
  const [serveFor, setServeFor] = useState<string | null>(null);
  const [f, setF] = useState({
    name: '', occasion: '', date: todayISO(), sponsorName: '', sponsorPhone: '',
    expectedCount: 200, recipeIds: [] as string[], servingsPlanned: 200,
    donationAmount: 0, is80G: false, paymentMode: 'UPI',
  });
  const [served, setServed] = useState(0);

  const inr = useInr();
  const wsCurrency = useWorkspaceCurrency();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !f.sponsorName.trim()) { showToast(tr('anna.bh.need', 'Bhandara name and sponsor required', 'নাম ও পৃষ্ঠপোষক আবশ্যক', 'नाम और प्रायोजक आवश्यक'), 'warning'); return; }
    const yyyymm = f.date.slice(0, 7).replace('-', '');
    const seq = String(state.bhandaras.length + 1).padStart(4, '0');
    // SECURITY P1 (Finding 5): an 80G number is CLAIMED from the shared
    // receiptCounters doc (never issuable twice, on any device); when
    // the claim is impossible (offline) the record honestly carries a
    // marked PROVISIONAL number instead of a guess at the series.
    let receiptNo = `BHANDARA-${yyyymm}-${seq}`;
    if (f.is80G && getNextReceiptNumber) {
      const yr = new Date().getFullYear();
      const localParsed = parseReceiptNumber(getNextReceiptNumber('SB-80G'));
      const claimedSeq = await claimNextReceiptSeq(
        activeWorkspace.id,
        'SB-80G',
        yr,
        localParsed ? localParsed.seq - 1 : 0
      );
      receiptNo =
        claimedSeq != null
          ? formatReceiptNumber('SB-80G', yr, claimedSeq)
          : formatProvisionalReceiptNumber('SB-80G', yr, receiptNo);
    }
    const ok = f.donationAmount > 0 ? addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      date: new Date().toISOString(),
      type: 'Income',
      category: 'Bhandara (Donation)',
      subcategory: 'Annakshetra One — Bhandara sponsorship',
      amount: Number(f.donationAmount),
      handledBy: 'Annakshetra Karyalaya',
      paymentMode: f.paymentMode,
      referenceNo: receiptNo,
      // Honest 80G: marked only when the institution itself holds 80G.
      purpose: `Bhandara sponsorship — ${f.name.trim()} by ${f.sponsorName.trim()} (${receiptNo}).${f.is80G ? ' 80G receipt issued (institution 80G-registered).' : ' Not 80G-eligible.'}`,
      is80GEligible: f.is80G,
      taxReceiptIssued: f.is80G,
      taxReceiptNumber: f.is80G ? receiptNo : undefined,
      devoteeName: f.sponsorName.trim(),
    }) : true;
    add('bhandaras', {
      id: uid('bh'), name: f.name.trim(), occasion: f.occasion.trim() || '—', date: f.date,
      sponsorName: f.sponsorName.trim(), sponsorPhone: f.sponsorPhone.trim() || undefined,
      expectedCount: Math.max(1, Math.floor(f.expectedCount)),
      recipeIds: f.recipeIds, servingsPlanned: Math.max(1, Math.floor(f.servingsPlanned)),
      donationAmount: Number(f.donationAmount) || 0,
      is80GEligible: f.is80G, taxReceiptIssued: f.is80G,
      receiptNo, treasuryTxId: ok ? 'posted' : undefined, status: 'planned',
    });
    setShowNew(false);
    setF({ name: '', occasion: '', date: todayISO(), sponsorName: '', sponsorPhone: '', expectedCount: 200, recipeIds: [], servingsPlanned: 200, donationAmount: 0, is80G: false, paymentMode: 'UPI' });
    showToast(tr('anna.bh.added', 'Bhandara planned — sponsorship posted to treasury', 'ভাণ্ডারা পরিকল্পিত — কোষাগারে পোস্ট', 'भंडारा नियोजित — कोषागार में दर्ज'), 'success');
  };

  const complete = (id: string) => {
    update('bhandaras', id, { status: 'completed', servedCount: Math.max(0, Math.floor(served)) });
    setServeFor(null);
    showToast(tr('anna.bh.completed', 'Bhandara completed — dhanyavaad to the sponsor', 'ভাণ্ডারা সম্পন্ন', 'भंडारा संपन्न'), 'success');
  };

  const sorted = useMemo(() => [...state.bhandaras].sort((a, b) => b.date.localeCompare(a.date)), [state.bhandaras]);
  const board = useMemo(() => sorted.filter((b) => b.status === 'completed' && b.servedCount).slice(0, 6), [sorted]);

  return (
    <div className="space-y-4">
      {/* Thank-you board */}
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <h3 className="font-bold text-stone-800 mb-2">🙏 {tr('anna.bh.board', "Today's annadata — thank-you board", 'অন্নদাতা — কৃতজ্ঞতা', 'अन्नदाता — आभार')}</h3>
        {board.length === 0 && <p className="text-sm text-stone-500">{tr('anna.bh.noboard', 'Completed bhandaras appear here with their sponsors.', 'সম্পন্ন ভাণ্ডারা এখানে দেখাবে।', 'संपन्न भंडारे यहाँ दिखेंगे।')}</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {board.map((b) => (
            <div key={b.id} className="bg-white/80 rounded-xl border border-amber-200 p-3">
              <div className="text-sm font-bold text-amber-900">{b.name}</div>
              <div className="text-xs text-stone-600">{tr('anna.bh.sponsoredby', 'Sponsored by', 'পৃষ্ঠপোষক', 'प्रायोजक')}: <b>{b.sponsorName}</b></div>
              <div className="text-xs text-stone-500">{b.servedCount} {tr('anna.bh.served', 'served', 'পরিবেশিত', 'परोसे गए')} · {b.date}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-between no-print">
        <h3 className="font-bold text-stone-800"><T en="Bhandara events" bn="ভাণ্ডারা" hi="भंडारे" /></h3>
        <Btn onClick={() => setShowNew(true)}>+ <T en="Plan bhandara" bn="ভাণ্ডারা পরিকল্পনা" hi="भंडारा योजना" /></Btn>
      </div>

      {sorted.map((b) => (
        <Card key={b.id}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-stone-800">{b.name} <span className="font-normal text-stone-500 text-sm">· {b.occasion}</span></div>
              <div className="text-xs text-stone-500 mt-0.5">
                {b.date} · {tr('anna.bh.sponsor', 'Sponsor', 'পৃষ্ঠপোষক', 'प्रायोजक')}: <b>{b.sponsorName}</b>
                {' · '}{tr('anna.bh.expected', 'expected', 'প্রত্যাশিত', 'अपेक्षित')}: {b.expectedCount}
                {b.servedCount != null && <> · {tr('anna.bh.servedn', 'served', 'পরিবেশিত', 'परोसे')}: <b>{b.servedCount}</b></>}
              </div>
              <div className="text-xs text-stone-500">
                {tr('anna.bh.cost', 'Est. food cost', 'আনুমানিক খরচ', 'अनुमानित लागत')}: {inr(estimateCost(b.recipeIds, b.servingsPlanned, state))}
                {' · '}{tr('anna.bh.donation', 'Donation', 'দান', 'दान')}: {inr(b.donationAmount)}
                {b.is80GEligible && <span className="ml-1 text-emerald-700 font-bold">· 80G ✓</span>}
                {b.treasuryTxId && <span className="ml-1 text-emerald-700">· {tr('anna.bh.posted', 'posted to treasury', 'কোষাগারে পোস্ট', 'कोषागार में दर्ज')}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 no-print">
              <StatusPill status={b.status} />
              {b.status === 'planned' && (
                <>
                  <Btn variant="ghost" className="!min-h-0 !py-1.5 text-xs" onClick={() => { setServeFor(b.id); setServed(b.expectedCount); }}>
                    ✓ <T en="Complete" bn="সম্পন্ন" hi="संपन्न" />
                  </Btn>
                  <button onClick={() => update('bhandaras', b.id, { status: 'cancelled' })} className="text-xs px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200">✕</button>
                </>
              )}
            </div>
          </div>
        </Card>
      ))}
      {sorted.length === 0 && <Card><p className="text-sm text-stone-400 text-center py-6">{tr('anna.bh.empty', 'No bhandaras yet.', 'কোনো ভাণ্ডারা নেই।', 'कोई भंडारा नहीं।')}</p></Card>}

      {showNew && (
        <Modal wide title={tr('anna.bh.new', 'Plan bhandara', 'ভাণ্ডারা পরিকল্পনা', 'भंडारा योजना')} onClose={() => setShowNew(false)}>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={tr('anna.bh.name', 'Bhandara name', 'নাম', 'नाम')}><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Kartik Purnima Bhandara" /></Field>
              <Field label={tr('anna.bh.occasion', 'Occasion', 'উপলক্ষ্য', 'अवसर')}><input className={inputCls} value={f.occasion} onChange={(e) => setF({ ...f, occasion: e.target.value })} placeholder="e.g. Purnima" /></Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={tr('anna.bh.sname', 'Sponsor name', 'পৃষ্ঠপোষকের নাম', 'प्रायोजक का नाम')}><input className={inputCls} value={f.sponsorName} onChange={(e) => setF({ ...f, sponsorName: e.target.value })} /></Field>
              <Field label={tr('anna.bh.sphone', 'Sponsor phone (optional)', 'ফোন', 'फोन')}><input className={inputCls} value={f.sponsorPhone} onChange={(e) => setF({ ...f, sponsorPhone: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label={tr('anna.bh.date', 'Date', 'তারিখ', 'तिथि')}><input type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
              <Field label={tr('anna.bh.expected', 'Expected plates', 'প্রত্যাশিত থালা', 'अपेक्षित थाली')}><input type="number" min={1} className={inputCls} value={f.expectedCount} onChange={(e) => setF({ ...f, expectedCount: Number(e.target.value), servingsPlanned: Number(e.target.value) })} /></Field>
              <Field label={tr('anna.bh.donationn', `Donation (${wsCurrency.symbol})`, `দান (${wsCurrency.symbol})`, `दान (${wsCurrency.symbol})`)}><input type="number" min={0} step="any" className={inputCls} value={f.donationAmount} onChange={(e) => setF({ ...f, donationAmount: Number(e.target.value) })} /></Field>
              <Field label={tr('anna.bh.mode', 'Mode', 'মাধ্যম', 'माध्यम')}>
                <select className={inputCls} value={f.paymentMode} onChange={(e) => setF({ ...f, paymentMode: e.target.value })}>
                  {['UPI', 'Cash', 'Bank Transfer', 'Cheque'].map((m) => <option key={m}>{m}</option>)}
                </select>
              </Field>
            </div>
            <Field label={tr('anna.bh.recipes', 'Recipes', 'রেসিপি', 'रेसिपी')}>
              <div className="space-y-1.5 max-h-36 overflow-y-auto border border-stone-200 rounded-xl p-2">
                {state.recipes.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-sm text-stone-700">
                    <input type="checkbox" className="w-4 h-4 accent-amber-700" checked={f.recipeIds.includes(r.id)}
                      onChange={(e) => setF({ ...f, recipeIds: e.target.checked ? [...f.recipeIds, r.id] : f.recipeIds.filter((x) => x !== r.id) })} />
                    {r.name}
                  </label>
                ))}
              </div>
            </Field>
            {f.recipeIds.length > 0 && (
              <div className="text-xs text-stone-600 bg-amber-50 border border-amber-200 rounded-xl p-3">
                {tr('anna.bh.estcost', 'Estimated food cost', 'আনুমানিক খাদ্য খরচ', 'अनुमानित भोजन लागत')}: <b>{inr(estimateCost(f.recipeIds, Math.max(1, Math.floor(f.servingsPlanned)), state))}</b>
                {' '}{tr('anna.bh.for', 'for', 'জন্য', 'हेतु')} {f.servingsPlanned} {tr('anna.bh.plates', 'plates', 'থালা', 'थाली')}
              </div>
            )}
            <label className="flex items-start gap-2 text-sm text-stone-700">
              <input type="checkbox" className="w-4 h-4 accent-amber-700 mt-0.5" checked={f.is80G} onChange={(e) => setF({ ...f, is80G: e.target.checked })} />
              <span>
                {tr('anna.bh.80g', 'Issue 80G tax receipt', '80G রসিদ দিন', '80G रसीद जारी करें')}
                <span className="block text-[11px] text-stone-400">{tr('anna.bh.80ghonest', 'Tick only if your institution holds valid 80G registration. The ledger records this honestly.', 'কেবল যদি আপনার প্রতিষ্ঠানের বৈধ 80G নিবন্ধন থাকে।', 'केवल तभी टिक करें जब आपकी संस्था के पास वैध 80G पंजीकरण हो।')}</span>
              </span>
            </label>
            <Btn type="submit" className="w-full"><T en="Plan bhandara & post sponsorship" bn="পরিকল্পনা ও পোস্ট" hi="योजना और दर्ज करें" /></Btn>
          </form>
        </Modal>
      )}

      {serveFor && (
        <Modal title={tr('anna.bh.servedtitle', 'How many were served?', 'কতজন খেলেন?', 'कितनों ने खाया?')} onClose={() => setServeFor(null)}>
          <form onSubmit={(e) => { e.preventDefault(); complete(serveFor); }} className="space-y-3">
            <Field label={tr('anna.bh.servedcount', 'Plates served', 'পরিবেশিত থালা', 'परोसी थाली')}><input type="number" min={0} className={inputCls} value={served} onChange={(e) => setServed(Number(e.target.value))} autoFocus /></Field>
            <Btn type="submit" className="w-full"><T en="Mark completed" bn="সম্পন্ন করুন" hi="संपन्न करें" /></Btn>
          </form>
        </Modal>
      )}
    </div>
  );
};
