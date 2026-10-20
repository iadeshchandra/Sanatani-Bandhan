/**
 * ClientMarketplace — devotee-facing gig browse & booking.
 * ========================================================
 * Browse/search gigs → gig detail → pay via geo payment methods →
 * submit proof → order created → track status → confirm completion →
 * rate. Disputes if needed.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, Clock, X, CheckCircle2, RefreshCw, AlertTriangle, ChevronLeft, ShieldCheck } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import {
  listGigs, getGig, createOrder, myOrdersAsClient, orderTransition, openDispute,
  type Gig, type MarketplaceOrder,
} from '../lib/marketplace';
import { detectRail } from '../lib/rail2';
import { Rail2PaymentScreen } from './Rail2PaymentScreen';
import { CommissionPayScreen } from './CommissionPayScreen';
import { detectPayRegion, type PayRegion } from '../lib/geoDetect';
import { getPaymentMethods, indianPaymentsReady } from '../lib/paymentMethods';
import { getWallet, spendFromWallet, fmtWallet, type WalletCurrency } from '../lib/wallet';
import { formatMoney } from '../lib/money';
import { useLanguage } from '../context/LanguageContext';
import { mkt, type MktLang } from '../lib/marketplaceCopy';
import { GuideButton } from '../components/suchana/GuideButton';
import { SevaRails } from './SevaRails';
import { KritagyataPrompt } from './KritagyataPrompt';
import { RatingPrompt } from './RatingPrompt';
import { GigDetail } from './GigDetail';
import { OrderTimeline } from './OrderTimeline';
import { extractReferrer, resolveReferralAttribution } from '../sangam/referrals';
import { fetchOwnSanId, recordReferralClaim } from '../sangam/referralThanksService';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import type { AuthorInfo } from '../sangam/sangamStore';

const inputCls = 'w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 min-h-[44px] text-sm outline-none focus:ring-2 focus:ring-amber-500';
const btnP = 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-amber-500 text-stone-950 hover:bg-amber-400 disabled:opacity-40';
const btnG = 'px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold bg-stone-100 text-stone-600';
const Empty: React.FC<{ text: string }> = ({ text }) => <p className="text-xs text-stone-500 py-8 text-center">{text}</p>;

const statusColor: Record<string, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-800', paid: 'bg-sky-100 text-sky-800',
  accepted: 'bg-indigo-100 text-indigo-800', in_progress: 'bg-violet-100 text-violet-800',
  completed: 'bg-emerald-100 text-emerald-800', cancelled: 'bg-stone-200 text-stone-500',
  disputed: 'bg-red-100 text-red-700', refunded: 'bg-orange-100 text-orange-800',
};

/** Category → honest visual anchor (the Gig model carries no photos;
 *  a category tile beats a grey box, and never fakes a face). */
const CATEGORY_TILE: Record<string, string> = {
  Puja: '🪔', Havan: '🔥', Katha: '📖', Samskara: '🕉️', Vastu: '🏠',
  Kundli: '🔮', Horoscope: '✨', Remedy: '🌿', Consultation: '💬', Other: '🙏',
};

/** Order status → marketplaceCopy key (badges never show raw codes). */
const ORDER_STATUS_KEY: Record<string, string> = {
  pending_payment: 'bkStatusPendingPayment', paid: 'bkStatusPaid', accepted: 'bkStatusAccepted',
  in_progress: 'bkStatusInProgress', awaiting_commission: 'bkStatusAwaitingCommission',
  completed: 'bkStatusCompleted', cancelled: 'bkStatusCancelled', disputed: 'bkStatusDisputed',
};

/** Gig category → marketplaceCopy key (select options never stay English-only). */
const CATEGORY_KEY: Record<string, string> = {
  Puja: 'bkCatPuja', Havan: 'bkCatHavan', Katha: 'bkCatKatha', Samskara: 'bkCatSamskara',
  Vastu: 'bkCatVastu', Kundli: 'bkCatKundli', Horoscope: 'bkCatHoroscope',
  Remedy: 'bkCatRemedy', Consultation: 'bkCatConsultation', Other: 'bkCatOther',
};

/* ------------------------------ Browse ------------------------------ */

const GigCard: React.FC<{ gig: Gig; onOpen: () => void }> = ({ gig, onOpen }) => {
  const { currentLang } = useLanguage();
  const L = (currentLang === 'bn' || currentLang === 'hi' ? currentLang : 'en') as MktLang;
  const hasRating = Number(gig.avgRating) > 0;
  return (
  <button type="button" onClick={onOpen} className="w-full text-left bg-white rounded-2xl border border-stone-200 p-4 hover:border-amber-300 transition-colors min-h-[44px] flex gap-3">
    {/* Thumbnail anchor — category tile (spec §3: cards lead with a visual) */}
    <div
      className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200/60 flex items-center justify-center text-2xl shrink-0"
      aria-hidden
    >
      {CATEGORY_TILE[gig.category] || '🙏'}
    </div>
    <div className="flex-1 min-w-0">
      <div>
        {gig.featured && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 mb-1 inline-block">{mkt(L, 'bkFeatured')}</span>}
        {(gig as any).providerVerified && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 mb-1 inline-block ml-1">✓ {L === 'en' ? 'VERIFIED' : L === 'bn' ? 'যাচাইকৃত' : 'सत्यापित'}</span>}
        <p className="text-sm font-black text-stone-900 truncate">{gig.title}</p>
        <p className="text-[11px] text-stone-500 truncate">{gig.providerName} · {gig.category}</p>
        {/* Rating row (spec §3): ★ + count; "🙏 N ashirvad" stays as the
            secondary social proof — counts convert, stars alone don't. */}
        <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
          {hasRating && (
            <span className="inline-flex items-center gap-0.5 font-bold text-amber-700">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" aria-hidden />{Number(gig.avgRating).toFixed(1)}
            </span>
          )}
          <span aria-hidden>🙏</span>{gig.totalOrders || 0} {mkt(L, 'ashirvad')}
          <span className="mx-1">·</span><Clock className="w-3 h-3" />{gig.durationMinutes}m
        </p>
      </div>
    </div>
    <div className="text-right shrink-0 self-center">
      <p className="text-[9px] text-stone-400 font-bold">{mkt(L, 'suggestedDakshina')}</p>
      <p className="text-sm font-black text-amber-700">{formatMoney(Number(gig.priceAmount), gig.priceCurrency)}</p>
    </div>
  </button>
  );
};

/* ------------------------------ Booking ------------------------------ */

const BookGig: React.FC<{ gig: Gig; onDone: () => void; onBack: () => void }> = ({ gig, onDone, onBack }) => {
  const { showToast } = useToast();
  const { firebaseUser } = useAuthWorkspace();
  const bookerUid = ((firebaseUser as { uid?: string } | null)?.uid || 'anon') as string;
  const { currentLang } = useLanguage();
  const L = (currentLang === 'bn' || currentLang === 'hi' ? currentLang : 'en') as MktLang;
  const [region, setRegion] = useState<PayRegion>('BD');
  /** IN fallback: until the owner configures the UPI QR, Indian users pay via the international rail. */
  const [inReady, setInReady] = useState(false);
  const [payRef, setPayRef] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [working, setWorking] = useState(false);
  const [payPath, setPayPath] = useState<'now' | 'wallet' | 'after'>('now');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletCurrency, setWalletCurrency] = useState<string>('BDT');

  useEffect(() => { detectPayRegion().then(setRegion).catch(() => {}); }, []);
  useEffect(() => { getPaymentMethods().then((all) => setInReady(indianPaymentsReady(all))).catch(() => {}); }, []);
  useEffect(() => { getWallet().then((w) => { setWalletBalance(w.balance); setWalletCurrency((w as any).currency || 'BDT'); }).catch(() => setWalletBalance(0)); }, []);

  const methodId = region === 'BD' ? 'bd_banglaqr' : region === 'IN' ? (inReady ? 'in_upi' : 'intl_payoneer') : 'intl_wise';

  const submit = async () => {
    setWorking(true);
    try {
      // Referral attribution: ?ref=SAN-XXXXXX from shared links.
      // QUEUED #25: the self-guard is wired — the booker's own SAN-ID is
      // resolved and resolveReferralAttribution drops self-referrals and
      // unverifiable attributions silently (booking proceeds untouched).
      const rawRef = extractReferrer(window.location.search);
      const referrer = rawRef
        ? resolveReferralAttribution(rawRef, await fetchOwnSanId(bookerUid))
        : null;
      const refField = referrer ? { referredBy: referrer } : {};
      let createdOrderId: string | null = null;
      if (payPath === 'wallet') {
        // 1. Create the wallet order, 2. deduct from wallet in a batched write (rules-validated).
        const orderId = await createOrder({
          gigId: gig.id as string, paymentMethodId: 'wallet', clientNotes: notes, scheduledAt, payWithWallet: true,
          ...refField,
        });
        createdOrderId = orderId;
        await spendFromWallet(orderId);
        showToast(mkt(L, 'bkSevaRequestedEscrow'), 'success');
        onDone();
      } else if (payPath === 'after') {
        // No upfront payment. Provider completes → client pays directly →
        // order waits for the platform commission (Path B gate).
        createdOrderId = await createOrder({
          gigId: gig.id as string, paymentMethodId: 'pay_after_task', clientNotes: notes, scheduledAt, payAfterTask: true,
          ...refField,
        });
        showToast(mkt(L, 'bkSevaRequestedDirect'), 'success');
        onDone();
      } else {
        if (!payRef.trim()) { showToast(mkt(L, 'bkEnterPayRef'), 'error'); setWorking(false); return; }
        createdOrderId = await createOrder({ gigId: gig.id as string, paymentMethodId: methodId, paymentRef: payRef.trim(), clientNotes: notes, scheduledAt, ...refField });
        showToast(mkt(L, 'bkBookingSubmitted'), 'success');
        onDone();
      }
      // Sharer thanks claim (QUEUED #25): the row the sharer's own
      // device self-listens for. Fire-and-forget — never fails a booking.
      if (referrer && createdOrderId) {
        void recordReferralClaim({
          orderId: createdOrderId,
          sharerSanId: referrer,
          providerName: gig.providerName || '',
          bookerUid,
        });
      }
    } catch (e: any) { showToast(e.message || mkt(L, 'bkBookingFailed'), 'error'); }
    setWorking(false);
  };

  const payHint = region === 'BD'
    ? mkt(L, 'bkPayHintBD')
    : region === 'IN'
    ? (inReady ? mkt(L, 'bkPayHintINReady') : mkt(L, 'bkPayHintINIntl'))
    : mkt(L, 'bkPayHintINTL');

  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className={btnG}><ChevronLeft className="w-4 h-4 inline" /> {mkt(L, 'bkBack')}</button>
      <div className="bg-white rounded-2xl border border-stone-200 p-4">
        <p className="text-sm font-black text-stone-900">{gig.title}</p>
        <p className="text-xs text-stone-500">{gig.providerName} · {gig.durationMinutes} min</p>
        <div className="flex justify-between mt-2 text-sm">
          <span className="text-stone-500">{mkt(L, 'suggestedDakshina')}</span><b>{formatMoney(Number(gig.priceAmount), gig.priceCurrency)}</b>
        </div>
        {/* Escrow trust line — directly under the price, before the Confirm
            CTA (spec §4: trust placed at the moment of money movement). */}
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1.5 mt-2">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden />{mkt(L, 'escrowNote')}
        </p>
        <p className="text-[10px] text-stone-400 mt-1">{L === 'en' ? 'Includes a small seva contribution that sustains Sanatani Bandhan — what you see is what you offer.' : L === 'bn' ? 'সনাতনী বন্ধনকে টিকিয়ে রাখে এমন একটি ছোট সেবা অবদান অন্তর্ভুক্ত — যা দেখছেন তাই অর্পণ করুন।' : 'सनातनी बंधन को बनाए रखने वाला एक छोटा सेवा योगदान शामिल — जो दिख रहा है वही अर्पित करें।'}</p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="text-xs font-bold text-amber-900 mb-2">{mkt(L, 'takeSankalp')} — {L === 'en' ? 'how would you like to offer' : L === 'bn' ? 'আপনি কীভাবে অর্পণ করতে চান' : 'आप कैसे अर्पित करना चाहेंगे'} {formatMoney(Number(gig.priceAmount), gig.priceCurrency)}?</p>
        <div className="space-y-2">
          <button type="button" onClick={() => setPayPath('wallet')}
            className={`w-full text-left px-3 py-3 rounded-xl border min-h-[56px] ${payPath === 'wallet' ? 'border-amber-500 bg-white shadow-sm' : 'border-amber-200 bg-white/60'}`}>
            <p className="text-xs font-black text-stone-900">🪔 {mkt(L, 'sevaWallet')} {walletBalance !== null && <span className="text-stone-500 font-bold">({formatMoney(walletBalance, walletCurrency)} {mkt(L, 'bkAvailable')})</span>}</p>
            <p className="text-[10px] text-stone-500">{L === 'en' ? 'Instant — held safely, released on completion. Recommended.' : L === 'bn' ? 'তাৎক্ষণিক — নিরাপদে রাখা হয়, সম্পন্ন হলে মুক্তি পায়।' : 'तुरंत — सुरक्षित रखा जाता है, पूर्ण होने पर जारी।'}</p>
          </button>
          <button type="button" onClick={() => setPayPath('now')}
            className={`w-full text-left px-3 py-3 rounded-xl border min-h-[56px] ${payPath === 'now' ? 'border-amber-500 bg-white shadow-sm' : 'border-amber-200 bg-white/60'}`}>
            <p className="text-xs font-black text-stone-900">💳 {L === 'en' ? 'Offer now (bKash / UPI / Wise)' : L === 'bn' ? 'এখনই অর্পণ করুন' : 'अभी अर्पित करें'}</p>
            <p className="text-[10px] text-stone-500">{L === 'en' ? 'Offer dakshina now, then share the transaction reference.' : L === 'bn' ? 'এখনই দক্ষিণা অর্পণ করুন।' : 'अभी दक्षिणा अर्पित करें।'}</p>
          </button>
          <button type="button" onClick={() => setPayPath('after')}
            className={`w-full text-left px-3 py-3 rounded-xl border min-h-[56px] ${payPath === 'after' ? 'border-amber-500 bg-white shadow-sm' : 'border-amber-200 bg-white/60'}`}>
            <p className="text-xs font-black text-stone-900">🤝 {L === 'en' ? 'Offer after the seva' : L === 'bn' ? 'সেবার পরে অর্পণ করুন' : 'सेवा के बाद अर्पित करें'}</p>
            <p className="text-[10px] text-stone-500">{L === 'en' ? 'Offer dakshina directly after completion, then the seva contribution.' : L === 'bn' ? 'সম্পন্ন হওয়ার পরে সরাসরি দক্ষিণা দিন।' : 'पूर्ण होने के बाद सीधे दक्षिणा दें।'}</p>
          </button>
        </div>
        {payPath === 'now' && (<>
        <p className="text-[11px] text-amber-800 mt-2">{payHint}</p>
        <div className="flex gap-1.5 mt-2">
          {(['BD', 'IN', 'INTL'] as const).map((r) => (
            <button key={r} type="button" onClick={() => setRegion(r)}
              className={`px-3 py-2 rounded-lg text-[11px] font-black min-h-[44px] ${region === r ? 'bg-amber-500 text-stone-950' : 'bg-white border border-amber-200 text-amber-800'}`}>
              {r === 'BD' ? mkt(L, 'bkRegionBD') : r === 'IN' ? mkt(L, 'bkRegionIN') : mkt(L, 'bkRegionINTL')}
            </button>
          ))}
        </div>
        </>)}
      </div>
      {payPath === 'now' && (
      <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
        <p className="text-xs font-bold text-stone-800">{mkt(L, 'bkStep2')}</p>
        <label className="text-[11px] font-bold text-stone-500">{mkt(L, 'bkPayRefLabel')}
          <input value={payRef} onChange={(e) => setPayRef(e.target.value)} className={inputCls} placeholder="e.g. TRX123ABC" /></label>
      </div>
      )}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
        <label className="text-[11px] font-bold text-stone-500">{mkt(L, 'bkDateLabel')}
          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputCls} /></label>
        <label className="text-[11px] font-bold text-stone-500">{mkt(L, 'bkNotesLabel')}
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} rows={2} maxLength={500} placeholder={mkt(L, 'bkNotesPh')} /></label>
        <button type="button" disabled={working} onClick={submit} className={`${btnP} w-full`}>
          {working ? mkt(L, 'bkSubmitting') : <><CheckCircle2 className="w-4 h-4 inline mr-1" /> {mkt(L, 'takeSankalp')}</>}
        </button>
      </div>
    </div>
  );
};

/* ------------------------------ My bookings ------------------------------ */

const MyBookings: React.FC = () => {
  const { showToast } = useToast();
  const { currentLang } = useLanguage();
  const L = (currentLang === 'bn' || currentLang === 'hi' ? currentLang : 'en') as MktLang;
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [disputeFor, setDisputeFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [commissionFor, setCommissionFor] = useState<MarketplaceOrder | null>(null);
  const [gratitudeFor, setGratitudeFor] = useState<MarketplaceOrder | null>(null);
  const [ratingFor, setRatingFor] = useState<MarketplaceOrder | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setOrders(await myOrdersAsClient()); } catch (e: any) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const confirmDone = async (o: MarketplaceOrder) => {
    try {
      await orderTransition(o.id as string, 'completed');
      showToast(L === 'en' ? 'Seva complete. Dhanyavaad! 🙏' : L === 'bn' ? 'সেবা সম্পূর্ণ। ধন্যবাদ! 🙏' : 'सेवा पूर्ण। धन्यवाद! 🙏', 'success');
      load();
      setGratitudeFor({ ...o, status: 'completed' } as MarketplaceOrder);
    }
    catch (e: any) { showToast(e.message, 'error'); }
  };
  const raise = async () => {
    if (!disputeFor || !reason.trim()) { showToast(mkt(L, 'bkDescribeIssue'), 'error'); return; }
    try { await openDispute(disputeFor, reason, details); showToast(mkt(L, 'bkDisputeRaised'), 'success'); setDisputeFor(null); setReason(''); setDetails(''); load(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  if (commissionFor) {
    return (
      <CommissionPayScreen
        orderId={commissionFor.id as string}
        orderCode={`SB-${String(commissionFor.id).slice(0, 6).toUpperCase()}`}
        commissionAmount={Number((commissionFor as any).commissionAmount || 0)}
        currency={((commissionFor as any).currency || 'BDT') as WalletCurrency}
        onBack={() => setCommissionFor(null)}
        onDone={() => { setCommissionFor(null); load(); }}
      />
    );
  }

  if (loading) return <p className="text-sm text-stone-500 py-10 text-center"><RefreshCw className="w-4 h-4 animate-spin inline" /> {mkt(L, 'bkLoading')}</p>;
  return (
    <div className="space-y-3">
      {orders.length === 0 && <Empty text={mkt(L, 'noSevasYet')} />}
      {orders.map((o) => (
        <div key={o.id} className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><p className="text-sm font-black truncate">{o.gigTitle}</p>
              <p className="text-[11px] text-stone-500">{formatMoney(o.amountGross, o.currency)} · {o.createdAt?.slice(0, 10)}</p></div>
            <span className={`text-[10px] font-black px-2 py-1 rounded-lg shrink-0 ${statusColor[o.status] || ''}`}>{ORDER_STATUS_KEY[o.status] ? mkt(L, ORDER_STATUS_KEY[o.status]) : o.status.replace(/_/g, ' ')}</span>
          </div>
          {(o as any).walletPaid && (
            <p className="text-[10px] font-bold text-sky-700 bg-sky-50 rounded-lg px-2 py-1 mt-2">{mkt(L, 'bkPaidFromWallet')}</p>
          )}
          {/* AUDIT FIX #4: rail-1 pending_payment previously showed a dead card
              with no actions and no explanation. Now the client sees where the
              order stands. */}
          {o.status === 'pending_payment' && (o as any).rail === 'rail1' && !(o as any).payWithWallet && (
            <div className="mt-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
              <p className="text-[11px] font-black text-stone-700">{mkt(L, 'awaitingProviderConfirm')}</p>
              <p className="text-[10px] text-stone-500 mt-0.5">{mkt(L, 'awaitingProviderConfirmSub')}</p>
            </div>
          )}
          {o.status === 'awaiting_commission' && (
            <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-[11px] font-black text-amber-900">⏳ {L === 'en' ? 'Incomplete — seva contribution pending' : L === 'bn' ? 'অসম্পূর্ণ — সেবা অবদান বাকি' : 'अपूर्ण — सेवा योगदान शेष'}</p>
              <p className="text-[10px] text-amber-800 mt-0.5">{L === 'en'
                ? `Offer the ${formatMoney(Number((o as any).commissionAmount || 0), o.currency)} seva contribution to complete this seva and unlock ashirvad.`
                : L === 'bn'
                ? `এই সেবা সম্পূর্ণ করতে ${formatMoney(Number((o as any).commissionAmount || 0), o.currency)} সেবা অবদান অর্পণ করুন।`
                : `इस सेवा को पूर्ण करने के लिए ${formatMoney(Number((o as any).commissionAmount || 0), o.currency)} सेवा योगदान अर्पित करें।`}</p>
              <button type="button" onClick={() => setCommissionFor(o)} className={`${btnP} w-full mt-2`}>{L === 'en' ? 'Offer contribution' : L === 'bn' ? 'অবদান অর্পণ করুন' : 'योगदान अर्पित करें'}</button>
            </div>
          )}
          <div className="flex gap-2 mt-2">
            {['paid', 'accepted', 'in_progress'].includes(o.status) && (
              <button type="button" onClick={() => confirmDone(o)} className={`${btnP} flex-1`}>{mkt(L, 'bkConfirmCompletion')}</button>
            )}
            {['paid', 'accepted', 'in_progress'].includes(o.status) && (
              <button type="button" onClick={() => setDisputeFor(o.id as string)} className={btnG}><AlertTriangle className="w-3.5 h-3.5 inline mr-1" />{mkt(L, 'bkDispute')}</button>
            )}
          </div>
          {gratitudeFor && gratitudeFor.id === o.id && (
            <KritagyataPrompt order={gratitudeFor} onDone={() => { setGratitudeFor(null); setRatingFor({ ...gratitudeFor }); }} />
          )}
          {/* QUEUED #26: the seva journey — where this order stands, what
              happens next, and who acts. Same component the provider sees,
              with devotee-side words. */}
          <OrderTimeline order={o as any} perspective="client" />
        </div>
      ))}
      {disputeFor && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setDisputeFor(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black mb-3">{mkt(L, 'bkRaiseDispute')}</h3>
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-stone-500">{mkt(L, 'bkReason')}<input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} maxLength={120} placeholder={mkt(L, 'bkReasonPh')} /></label>
              <label className="text-[11px] font-bold text-stone-500">{mkt(L, 'bkDetails')}<textarea value={details} onChange={(e) => setDetails(e.target.value)} className={inputCls} rows={3} maxLength={2000} /></label>
              <div className="flex gap-2">
                <button type="button" onClick={raise} className={`${btnP} flex-1`}>{mkt(L, 'bkSubmitDispute')}</button>
                <button type="button" onClick={() => setDisputeFor(null)} className={`${btnG} flex-1`}>{mkt(L, 'bkCancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Step 7: Blessings prompt after gratitude */}
      {ratingFor && (
        <RatingPrompt order={ratingFor} onDone={() => setRatingFor(null)} />
      )}
    </div>
  );
};

/* ------------------------------ Main ------------------------------ */

export const ClientMarketplace: React.FC = () => {
  const { currentLang } = useLanguage();
  const L = (currentLang === 'bn' || currentLang === 'hi' ? currentLang : 'en') as MktLang;
  const [view, setView] = useState<'browse' | 'bookings'>('browse');
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [ptype, setPtype] = useState('all');
  const [booking, setBooking] = useState<Gig | null>(null);
  const [bookingRail, setBookingRail] = useState<'rail1' | 'rail2' | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detailGig, setDetailGig] = useState<Gig | null>(null);
  const { firebaseUser } = useAuthWorkspace();
  const railAuthor: AuthorInfo = {
    uid: ((firebaseUser as { uid?: string } | null)?.uid || 'anon') as string,
    name: ((firebaseUser as { displayName?: string | null } | null)?.displayName) || 'Sanatani',
    sanId: '',
    kind: 'devotee',
  };
  const handleRailCategory = (chipId: string) => {
    if (chipId === 'Kundli') { setCat('all'); setPtype('jyotishi'); }
    else { setCat(chipId); setPtype('all'); }
  };

  const openBooking = async (g: Gig) => {
    setDetecting(true);
    try {
      const { rail } = await detectRail(g.providerUid);
      setBookingRail(rail);
      setBooking(g);
    } catch {
      setBookingRail('rail1');
      setBooking(g);
    }
    setDetecting(false);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try { setGigs(await listGigs({})); } catch { /* offline etc — stay quiet, show empty */ }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = gigs.filter((g) => {
    if (cat !== 'all' && g.category !== cat) return false;
    if (ptype !== 'all' && g.providerType !== ptype) return false;
    if (q && !`${g.title} ${g.description} ${g.providerName}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  if (booking) {
    const closeBooking = () => { setBooking(null); setBookingRail(null); };
    const doneBooking = () => { setBooking(null); setBookingRail(null); setView('bookings'); };
    if (bookingRail === 'rail2') {
      return <Rail2PaymentScreen gig={booking} onBack={closeBooking} onDone={doneBooking} />;
    }
    return <BookGig gig={booking} onBack={closeBooking} onDone={doneBooking} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 items-center">
        {([['browse', `🔍 ${mkt(L, 'browseSevas')}`], ['bookings', `📋 ${mkt(L, 'sevaBookings')}`]] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setView(id)}
            className={`flex-1 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-black ${view === id ? 'bg-amber-500 text-stone-950' : 'bg-white border border-stone-200 text-stone-600'}`}>{label}</button>
        ))}
        <GuideButton moduleId="marketplace" />
      </div>
      {view === 'bookings' ? <MyBookings /> : (
        <>
          {/* 🪔 Seva discovery rails — occasion + community notices, never a product grid. */}
          <SevaRails author={railAuthor} onCategory={handleRailCategory} activeCategory={ptype === 'jyotishi' && cat === 'all' ? 'Kundli' : cat} />

          {/* Seva journey planner: occasion-first samskara bundles (counsel + ritual, one view). */}
          <Link
            to="/seva/journeys"
            className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 min-h-[44px] hover:border-amber-400 transition-colors"
          >
            <span className="text-2xl" aria-hidden="true">🪔</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-stone-900">
                {L === 'en' ? 'Planning a samskara or life event?' : L === 'bn' ? 'কোনো সংস্কার বা জীবনের অনুষ্ঠানের পরিকল্পনা?' : 'किसी संस्कार या जीवन-उत्सव की योजना?'}
              </span>
              <span className="block text-xs text-stone-600 mt-0.5">
                {L === 'en' ? 'Bundle jyotish counsel + the sacred rite in one guided journey.' : L === 'bn' ? 'এক নির্দেশিত যাত্রায় জ্যোতিষ পরামর্শ + পবিত্র বিধি একসাথে।' : 'एक निर्देशित यात्रा में ज्योतिष परामर्श + पवित्र विधि एक साथ।'}
              </span>
            </span>
            <ChevronLeft className="w-5 h-5 text-amber-600 rotate-180 shrink-0" aria-hidden="true" />
          </Link>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={mkt(L, 'bkSearchPh')} className={`${inputCls} pl-9`} />
          </div>
          <div className="flex gap-2">
            <select value={cat} onChange={(e) => setCat(e.target.value)} className={`${inputCls} w-auto`}>
              <option value="all">{mkt(L, 'bkAllCategories')}</option>
              {['Puja', 'Havan', 'Katha', 'Samskara', 'Vastu', 'Kundli', 'Horoscope', 'Remedy', 'Consultation', 'Other'].map((c) => <option key={c} value={c}>{mkt(L, CATEGORY_KEY[c])}</option>)}
            </select>
            <select value={ptype} onChange={(e) => setPtype(e.target.value)} className={`${inputCls} w-auto`}>
              <option value="all">{mkt(L, 'bkPtypeAll')}</option><option value="purohit">{mkt(L, 'bkPtypePurohit')}</option><option value="jyotishi">{mkt(L, 'bkPtypeJyotishi')}</option>
            </select>
          </div>
          {loading ? <p className="text-sm text-stone-500 py-10 text-center"><RefreshCw className="w-4 h-4 animate-spin inline" /> {mkt(L, 'bkLoading')}</p> : (
            <div className="space-y-2.5">
              {filtered.length === 0 && (
                <div className="text-center py-10">
                  <div className="text-4xl mb-3" aria-hidden>🪔</div>
                  <p className="text-sm font-bold text-stone-700">{mkt(L, 'marketEmptyTitle')}</p>
                  <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">{mkt(L, 'marketEmptySub')}</p>
                  <button
                    type="button"
                    onClick={() => { setQ(''); setCat('all'); setPtype('all'); }}
                    className="mt-4 min-h-[48px] px-6 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white text-sm font-black shadow-sm"
                  >
                    {mkt(L, 'browseAllSevas')}
                  </button>
                </div>
              )}
              {filtered.map((g) => <GigCard key={g.id} gig={g} onOpen={() => setDetailGig(g)} />)}
            </div>
          )}
        </>
      )}
      {/* Step 7: Gig detail (tap card → detail → book) */}
      {detailGig && !booking && (
        <GigDetail
          gig={detailGig}
          onBack={() => setDetailGig(null)}
          onBook={() => { const g = detailGig; setDetailGig(null); openBooking(g); }}
        />
      )}
    </div>
  );
};
