/**
 * TicketSalesPanel — the organiser's pass ledger (EVENTS E2).
 * =====================================================================
 * Lives in the War Room under the publish panel. Shows every pass
 * sold for this festival (tiers, amounts, payment states), lets
 * staff mark pay-at-venue money received at the desk, desk-refund a
 * received venue payment (a real treasury Expense through the
 * existing posting path), and post the collected pass income into
 * the treasury under the festival's 'Cultural tickets' head — the
 * same addTreasuryTransaction path the Utsav budget uses, with the
 * REAL treasury id stamped back onto each pass (the L7 honesty
 * pattern: a pass claims treasury posting only with its tx id).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, query, updateDoc, where, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useLanguage } from '../../context/LanguageContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { T, Card, Btn, Field, inputCls } from '../../utsav/ui';
import { db } from '../../lib/firebase';
import { formatMoney } from '../../lib/money';
import type { WarFestival, WarRoomPlan } from '../../lib/festival';
import { computeQuote, isLiveTicket, type EventTicket } from '../../lib/eventTickets';
import { sellPassAtDesk } from '../../lib/deskSales';
import { useFestivalCloud } from './festivalWarStore';

interface Props {
  wf: WarFestival;
  plan: WarRoomPlan;
}

const STATE_LABEL: Record<EventTicket['paymentState'], { en: string; bn: string; hi: string }> = {
  'paid-wallet': { en: 'Paid · Seva Wallet', bn: 'পরিশোধিত · সেবা ওয়ালেট', hi: 'भुगतान · सेवा वॉलेट' },
  'pay-at-venue': { en: 'Pay at venue', bn: 'স্থানে পরিশোধ', hi: 'स्थल पर भुगतान' },
  comp: { en: 'With blessings (free)', bn: 'আশীর্বাদসহ (বিনামূল্যে)', hi: 'आशीर्वाद सहित (निःशुल्क)' },
  refunded: { en: 'Refunded', bn: 'ফেরত হয়েছে', hi: 'वापस हुआ' },
  cancelled: { en: 'Cancelled', bn: 'বাতিল', hi: 'रद्द' },
};

export const TicketSalesPanel: React.FC<Props> = ({ wf, plan }) => {
  const { language } = useLanguage();
  const { activeWorkspace, currentUser, firebaseUser } = useAuthWorkspace();
  const { addTreasuryTransaction } = useData();
  const cloud = useFestivalCloud(activeWorkspace.id, wf.key);
  const [tickets, setTickets] = useState<EventTicket[]>([]);
  const [busyId, setBusyId] = useState('');
  const [posting, setPosting] = useState(false);
  const [note, setNote] = useState('');
  /* REAL-WORLD PACK — desk (counter) sale form state. */
  const [deskOpen, setDeskOpen] = useState(false);
  const [deskTierId, setDeskTierId] = useState('');
  const [deskBuyer, setDeskBuyer] = useState('');
  const [deskQty, setDeskQty] = useState(1);
  const [deskNames, setDeskNames] = useState<string[]>(['']);
  const [deskBusy, setDeskBusy] = useState(false);
  const [deskErr, setDeskErr] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'event_tickets'), where('festivalId', '==', plan.id));
    const unsub = onSnapshot(
      q,
      (snap) => setTickets(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EventTicket, 'id'>) }))),
      () => { /* staff-only read; offline keeps the last list */ }
    );
    return unsub;
  }, [plan.id]);

  const currency = tickets[0]?.currency ?? 'INR';
  const tierSold = cloud.event?.tierSold ?? {};
  const tiers = plan.ticketing?.tiers ?? [];

  const liveTotal = useMemo(
    () => tickets.filter(isLiveTicket).reduce((s, t) => s + t.amounts.total, 0),
    [tickets]
  );
  const unposted = useMemo(
    () => tickets.filter((t) => isLiveTicket(t) && !t.treasuryTxId && (t.paymentState === 'paid-wallet' || t.venueReceived === true)),
    [tickets]
  );
  const unpostedSum = unposted.reduce((s, t) => s + t.amounts.total, 0);

  if (!plan.ticketing || tiers.length === 0) return null;

  const flash = (msg: string) => {
    setNote(msg);
    setTimeout(() => setNote(''), 3500);
  };

  const markReceived = async (t: EventTicket) => {
    setBusyId(t.id);
    try {
      await updateDoc(doc(db, 'event_tickets', t.id), {
        venueReceived: true,
        receivedBy: currentUser?.name || 'Desk',
        receivedAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });
      flash('Marked received.');
    } finally {
      setBusyId('');
    }
  };

  const deskRefund = async (t: EventTicket) => {
    setBusyId(t.id);
    try {
      if (t.venueReceived === true) {
        // Cash actually changed hands — the refund leaves through
        // the treasury as an Expense, then the pass is stamped.
        await new Promise<void>((resolve) => {
          addTreasuryTransaction({
            workspaceId: activeWorkspace.id,
            date: new Date().toISOString().slice(0, 10),
            type: 'Expense',
            category: 'Festival Income',
            subcategory: `Utsav Refund — ${wf.name.en}`,
            amount: t.amounts.total,
            handledBy: currentUser?.name || 'Desk',
            paymentMode: 'Cash',
            purpose: `Venue refund of pass ${t.id} to ${t.buyerName} (paid at the desk).`,
            is80GEligible: false,
            taxReceiptIssued: false,
            devoteeName: t.buyerName,
          }, () => resolve());
        });
        await updateDoc(doc(db, 'event_tickets', t.id), {
          paymentState: 'refunded',
          refundAmount: t.amounts.total,
          refundedAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        });
        flash('Refunded at the desk — treasury expense posted.');
      } else {
        await updateDoc(doc(db, 'event_tickets', t.id), {
          paymentState: 'cancelled',
          updatedAt: serverTimestamp(),
        });
        flash('Pass cancelled — no money had been received.');
      }
    } finally {
      setBusyId('');
    }
  };

  const postToTreasury = async () => {
    if (unposted.length === 0) return;
    setPosting(true);
    const ids = unposted.map((t) => t.id);
    const sum = unpostedSum;
    addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      date: new Date().toISOString().slice(0, 10),
      type: 'Income',
      category: 'Festival Income',
      subcategory: `Utsav One — ${wf.name.en}`,
      amount: sum,
      handledBy: currentUser?.name || 'Desk',
      paymentMode: 'UPI',
      purpose: `Cultural tickets — ${ids.length} seva passes for ${wf.name.en} (${wf.dateISO}).`,
      is80GEligible: false,
      taxReceiptIssued: false,
    }, async (treasuryTxId) => {
      if (treasuryTxId) {
        const batch = writeBatch(db);
        const stamp = new Date().toISOString();
        for (const id of ids) {
          batch.update(doc(db, 'event_tickets', id), { treasuryTxId, treasuryPostedAt: stamp, updatedAt: serverTimestamp() });
        }
        await batch.commit();
        flash('Pass income posted to the treasury.');
      }
      setPosting(false);
    });
  };

  /* ── REAL-WORLD PACK — sell a pass at the desk ─────────────────
   * A walk-in with cash and possibly no account: the sale writes
   * the same ticket + party RSVP the devotee checkout writes
   * (lib/deskSales — one batch, rules-recomputed), under the
   * synthetic desk identity, attributed to the signed-in staff
   * member. Full payment only: the amount recorded is the quote
   * total, received at the desk. */
  const deskTier = tiers.find((x) => x.id === deskTierId) ?? tiers[0];
  const deskIsAddon = deskTier?.kind === 'addon';
  const deskMax = Math.min(20, Math.max(1, deskTier?.maxPerBooking ?? 6));
  const deskQuote = deskTier
    ? computeQuote({
        tier: deskTier,
        qty: deskQty,
        codeTerms: null,
        feeBearer: cloud.event?.ticketFeeBearer || 'organiser',
        currency,
        nowMs: Date.now(),
      })
    : null;
  const deskNamesOk = deskIsAddon
    || deskNames.slice(0, deskQty).every((n) => n.trim().length >= 2);
  const deskValid = !!cloud.event && !!deskTier && deskBuyer.trim().length >= 2 && deskNamesOk;

  const sellAtDesk = async () => {
    if (!cloud.event || !deskTier || !deskValid) return;
    setDeskBusy(true);
    setDeskErr('');
    try {
      await sellPassAtDesk(db, {
        event: cloud.event,
        tier: deskTier,
        buyerName: deskBuyer.trim(),
        attendees: deskIsAddon ? [] : deskNames.slice(0, deskQty).map((n) => ({ name: n.trim() })),
        qty: deskQty,
        staffUid: (firebaseUser as { uid?: string } | null)?.uid || '',
        staffName: currentUser?.name || 'Desk',
        currency,
        nowMs: Date.now(),
      });
      flash('Desk sale recorded — the party is on the gate list.');
      setDeskBuyer('');
      setDeskNames(['']);
      setDeskQty(1);
      setDeskOpen(false);
    } catch (e) {
      setDeskErr(
        e instanceof Error && e.message === 'passes-not-open'
          ? 'Passes have not opened yet for this festival.'
          : 'The sale could not be recorded — check the connection and try again.'
      );
    } finally {
      setDeskBusy(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-extrabold text-stone-800">
          <T en="Seva passes sold" bn="বিক্রিত সেবা পাস" hi="बिके सेवा पास" />
        </h3>
        <span className="text-sm font-black text-orange-800">{formatMoney(liveTotal, currency)}</span>
      </div>
      <p className="text-xs text-stone-500 mb-3">
        <T en="Every pass for this festival — who holds it, what was paid, and what is still to collect at the venue."
          bn="এই উৎসবের প্রতিটি পাস — কার কাছে, কত পরিশোধ হয়েছে, আর স্থানে কত বাকি।"
          hi="इस उत्सव का हर पास — किसके पास, कितना भुगतान हुआ, और स्थल पर कितना बाकी है।" />
      </p>

      {/* Per-tier sold counts — the anchored counter on the event doc */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {tiers.map((t) => (
          <span key={t.id} className="text-[11px] font-bold text-stone-600 bg-stone-50 border border-stone-200 rounded-full px-2.5 py-1">
            {t.name.en}: {tierSold[t.id] ?? 0}{t.capacity ? ` / ${t.capacity}` : ''} <T en="sold" bn="বিক্রিত" hi="बिके" />
          </span>
        ))}
      </div>

      {unposted.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 mb-3">
          <span className="text-xs font-bold text-amber-900 flex-1">
            <T en={`${unposted.length} collected passes (${formatMoney(unpostedSum, currency)}) are not in the treasury yet.`}
              bn={`${unposted.length}টি সংগৃহীত পাস (${formatMoney(unpostedSum, currency)}) এখনো কোষাগারে যায়নি।`}
              hi={`${unposted.length} संग्रहित पास (${formatMoney(unpostedSum, currency)}) अभी कोष में नहीं गए।`} />
          </span>
          <Btn disabled={posting} onClick={postToTreasury}>
            <T en={posting ? 'Posting…' : 'Post to treasury'} bn={posting ? 'যাচ্ছে…' : 'কোষাগারে পাঠান'} hi={posting ? 'जा रहा…' : 'कोष में डालें'} />
          </Btn>
        </div>
      )}
      {note && <div className="text-xs font-bold text-emerald-700 mb-2">{note}</div>}

      {/* ── REAL-WORLD PACK — desk (counter) sales ─────────────── */}
      <div className="rounded-xl border border-orange-200 bg-orange-50/50 px-3 py-2.5 mb-3">
        {!deskOpen ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-stone-700 flex-1">
              <T en="Someone at the desk with cash, maybe no account? Sell them a pass here — they join the gate list by name."
                bn="ডেস্কে কেউ নগদ নিয়ে এসেছেন, হয়তো অ্যাকাউন্ট নেই? এখানেই পাস বিক্রি করুন — নামে তিনি গেট তালিকায় যোগ হবেন।"
                hi="डेस्क पर कोई नकद लेकर आया है, शायद खाता नहीं? यहीं पास बेचें — नाम से वे गेट सूची में जुड़ेंगे।" />
            </span>
            <Btn className="!px-3" onClick={() => { setDeskTierId(deskTier?.id || ''); setDeskOpen(true); }}>
              <T en="Sell at the desk" bn="ডেস্কে বিক্রি" hi="डेस्क पर बेचें" />
            </Btn>
          </div>
        ) : !cloud.event ? (
          <p className="text-xs font-bold text-amber-800">
            <T en="Publish the devotee page first — passes and the gate list live on the published page."
              bn="আগে ভক্ত পৃষ্ঠা প্রকাশ করুন — পাস ও গেট তালিকা প্রকাশিত পৃষ্ঠাতেই থাকে।"
              hi="पहले भक्त पृष्ठ प्रकाशित करें — पास और गेट सूची प्रकाशित पृष्ठ पर ही रहती है।" />
          </p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Field label={<T en="Pass" bn="পাস" hi="पास" />}>
                <select className={inputCls} value={deskTier?.id || ''} aria-label="Pass"
                  onChange={(e) => { setDeskTierId(e.target.value); setDeskQty(1); }}>
                  {tiers.map((x) => (
                    <option key={x.id} value={x.id}>{x.name.en} · {formatMoney(x.price, currency)}</option>
                  ))}
                </select>
              </Field>
              <Field label={<T en="How many" bn="কতজন" hi="कितने" />}>
                <input type="number" min={1} max={deskMax} className={inputCls} value={deskQty} aria-label="How many"
                  onChange={(e) => {
                    const q = Math.min(deskMax, Math.max(1, parseInt(e.target.value || '1', 10) || 1));
                    setDeskQty(q);
                    setDeskNames((prev) => {
                      const next = [...prev];
                      while (next.length < q) next.push('');
                      return next;
                    });
                  }} />
              </Field>
            </div>
            <Field label={<T en="Buyer's name (the person paying)" bn="ক্রেতার নাম (যিনি পরিশোধ করছেন)" hi="क्रेता का नाम (जो भुगतान कर रहे हैं)" />}>
              <input className={inputCls} value={deskBuyer} aria-label="Buyer's name"
                onChange={(e) => setDeskBuyer(e.target.value)} />
            </Field>
            {!deskIsAddon && deskNames.slice(0, deskQty).map((n, i) => (
              <Field key={i} label={<T en={`Guest ${i + 1} — name for the gate list`} bn={`অতিথি ${i + 1} — গেট তালিকার নাম`} hi={`अतिथि ${i + 1} — गेट सूची का नाम`} />}>
                <input className={inputCls} value={n} aria-label={`Guest ${i + 1} name`}
                  onChange={(e) => setDeskNames((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))} />
              </Field>
            ))}
            {deskErr && (
              <div className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{deskErr}</div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Btn disabled={!deskValid || deskBusy} onClick={sellAtDesk}>
                {deskQuote && deskQuote.total > 0 ? (
                  <T en={`Record sale · collect ${formatMoney(deskQuote.total, currency)}`} bn={`বিক্রি লিখুন · নিন ${formatMoney(deskQuote.total, currency)}`} hi={`बिक्री लिखें · लें ${formatMoney(deskQuote.total, currency)}`} />
                ) : (
                  <T en="Record blessed pass (free)" bn="আশীর্বাদ পাস লিখুন (বিনামূল্যে)" hi="आशीर्वाद पास लिखें (निःशुल्क)" />
                )}
              </Btn>
              <Btn variant="ghost" className="!px-3" onClick={() => setDeskOpen(false)}>
                <T en="Close" bn="বন্ধ" hi="बंद करें" />
              </Btn>
              <span className="text-[11px] text-stone-500">
                <T en="Full payment at the desk. The party is found at the gate by name — no pass card is made."
                  bn="ডেস্কে পুরো পরিশোধ। গেটে নাম দিয়ে দলটিকে পাওয়া যাবে — কোনো পাস কার্ড তৈরি হয় না।"
                  hi="डेस्क पर पूरा भुगतान। गेट पर नाम से दल मिलेगा — कोई पास कार्ड नहीं बनता।" />
              </span>
            </div>
          </div>
        )}
      </div>

      {tickets.length === 0 ? (
        <p className="text-xs text-stone-400">
          <T en="No passes yet. When a devotee books from the festival page, their pass appears here."
            bn="এখনো কোনো পাস নেই। ভক্ত পৃষ্ঠা থেকে বুক করলেই তাঁর পাস এখানে আসবে।"
            hi="अभी कोई पास नहीं। भक्त पृष्ठ से बुक करते ही पास यहाँ आएगा।" />
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-96 overflow-y-auto">
          {tickets.map((t) => {
            const tier = tiers.find((x) => x.id === t.tierId);
            const received = t.venueReceived === true;
            return (
              <li key={t.id} className="rounded-xl border border-stone-100 bg-stone-50/60 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-stone-800 truncate">{t.buyerName}</div>
                    <div className="text-[11px] text-stone-500">
                      {tier?.name.en ?? t.tierId} · ×{t.qty}
                      {t.discountCode ? ` · ${t.discountCode}` : ''}
                      {t.treasuryTxId ? ' · ✓ treasury' : ''}
                      {t.deskSale ? ' · ' : ''}
                      {t.deskSale && (
                        <span className="font-bold text-orange-700">
                          <T en="desk sale" bn="ডেস্ক বিক্রি" hi="डेस्क बिक्री" />
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-500 truncate">
                      {t.attendees.map((a) => a.name).join(', ') || '—'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-stone-800">{formatMoney(t.amounts.total, t.currency)}</div>
                    <div className="text-[11px] font-bold text-stone-500">
                      {STATE_LABEL[t.paymentState][language === 'bn' ? 'bn' : language === 'hi' ? 'hi' : 'en']}
                      {t.paymentState === 'pay-at-venue' && (received ? ' · received' : ' · to collect')}
                      {t.paymentState === 'refunded' && t.refundAmount ? ` · ${formatMoney(t.refundAmount, t.currency)}` : ''}
                    </div>
                  </div>
                </div>
                {t.paymentState === 'pay-at-venue' && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {!received && (
                      <Btn className="!px-3" disabled={busyId === t.id} onClick={() => markReceived(t)}>
                        <T en="Mark received" bn="প্রাপ্তি চিহ্নিত" hi="प्राप्त चिह्नित करें" />
                      </Btn>
                    )}
                    <Btn variant="ghost" className="!px-3" disabled={busyId === t.id} onClick={() => deskRefund(t)}>
                      <T en={received ? 'Refund at desk' : 'Cancel pass'} bn={received ? 'ডেস্কে ফেরত' : 'পাস বাতিল'} hi={received ? 'डेस्क पर वापसी' : 'पास रद्द करें'} />
                    </Btn>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};

export default TicketSalesPanel;
