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
import { T, Card, Btn } from '../../utsav/ui';
import { db } from '../../lib/firebase';
import { formatMoney } from '../../lib/money';
import type { WarFestival, WarRoomPlan } from '../../lib/festival';
import { isLiveTicket, type EventTicket } from '../../lib/eventTickets';
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
  const { activeWorkspace, currentUser } = useAuthWorkspace();
  const { addTreasuryTransaction } = useData();
  const cloud = useFestivalCloud(activeWorkspace.id, wf.key);
  const [tickets, setTickets] = useState<EventTicket[]>([]);
  const [busyId, setBusyId] = useState('');
  const [posting, setPosting] = useState(false);
  const [note, setNote] = useState('');

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
