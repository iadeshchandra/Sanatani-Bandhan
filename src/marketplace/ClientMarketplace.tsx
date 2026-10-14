/**
 * ClientMarketplace — devotee-facing gig browse & booking.
 * ========================================================
 * Browse/search gigs → gig detail → pay via geo payment methods →
 * submit proof → order created → track status → confirm completion →
 * rate. Disputes if needed.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Star, Clock, X, CheckCircle2, RefreshCw, AlertTriangle, ChevronLeft } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import {
  listGigs, getGig, createOrder, myOrdersAsClient, orderTransition, openDispute,
  type Gig, type MarketplaceOrder,
} from '../lib/marketplace';
import { detectRail } from '../lib/rail2';
import { Rail2PaymentScreen } from './Rail2PaymentScreen';
import { CommissionPayScreen } from './CommissionPayScreen';
import { detectPayRegion } from '../lib/geoDetect';
import { getWallet, spendFromWallet, fmtWallet, type WalletCurrency } from '../lib/wallet';
import { useLanguage } from '../context/LanguageContext';
import { mkt, type MktLang } from '../lib/marketplaceCopy';

const inputCls = 'w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 min-h-[44px] text-sm outline-none focus:ring-2 focus:ring-amber-500';
const btnP = 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-amber-500 text-stone-950 hover:bg-amber-400 disabled:opacity-40';
const btnG = 'px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold bg-stone-100 text-stone-600';
const Empty: React.FC<{ text: string }> = ({ text }) => <p className="text-xs text-stone-500 py-8 text-center">{text}</p>;
const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const statusColor: Record<string, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-800', paid: 'bg-sky-100 text-sky-800',
  accepted: 'bg-indigo-100 text-indigo-800', in_progress: 'bg-violet-100 text-violet-800',
  completed: 'bg-emerald-100 text-emerald-800', cancelled: 'bg-stone-200 text-stone-500',
  disputed: 'bg-red-100 text-red-700', refunded: 'bg-orange-100 text-orange-800',
};

/* ------------------------------ Browse ------------------------------ */

const GigCard: React.FC<{ gig: Gig; onOpen: () => void }> = ({ gig, onOpen }) => {
  const { currentLang } = useLanguage();
  const L = (currentLang === 'bn' || currentLang === 'hi' ? currentLang : 'en') as MktLang;
  return (
  <button type="button" onClick={onOpen} className="w-full text-left bg-white rounded-2xl border border-stone-200 p-4 hover:border-amber-300 transition-colors min-h-[44px]">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        {gig.featured && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 mb-1 inline-block">FEATURED</span>}
        {(gig as any).providerVerified && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 mb-1 inline-block ml-1">✓ {L === 'en' ? 'VERIFIED' : L === 'bn' ? 'যাচাইকৃত' : 'सत्यापित'}</span>}
        <p className="text-sm font-black text-stone-900 truncate">{gig.title}</p>
        <p className="text-[11px] text-stone-500 truncate">{gig.providerName} · {gig.category}</p>
        <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
          <span aria-hidden>🙏</span>{gig.totalOrders || 0} {mkt(L, 'ashirvad')}
          <span className="mx-1">·</span><Clock className="w-3 h-3" />{gig.durationMinutes}m
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[9px] text-stone-400 font-bold">{mkt(L, 'suggestedDakshina')}</p>
        <p className="text-sm font-black text-amber-700">{fmt(Number(gig.priceAmount))}</p>
      </div>
    </div>
  </button>
  );
};

/* ------------------------------ Booking ------------------------------ */

const BookGig: React.FC<{ gig: Gig; onDone: () => void; onBack: () => void }> = ({ gig, onDone, onBack }) => {
  const { showToast } = useToast();
  const { currentLang } = useLanguage();
  const L = (currentLang === 'bn' || currentLang === 'hi' ? currentLang : 'en') as MktLang;
  const [region, setRegion] = useState<'BD' | 'IN' | 'INTL'>('BD');
  const [payRef, setPayRef] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [working, setWorking] = useState(false);
  const [payPath, setPayPath] = useState<'now' | 'wallet' | 'after'>('now');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => { detectPayRegion().then(setRegion).catch(() => {}); }, []);
  useEffect(() => { getWallet().then((w) => setWalletBalance(w.balance)).catch(() => setWalletBalance(0)); }, []);

  const methodId = region === 'BD' ? 'bd_banglaqr' : region === 'IN' ? 'in_upi' : 'intl_wise';

  const submit = async () => {
    setWorking(true);
    try {
      if (payPath === 'wallet') {
        // 1. Create the wallet order, 2. deduct from wallet in a batched write (rules-validated).
        const orderId = await createOrder({
          gigId: gig.id as string, paymentMethodId: 'wallet', clientNotes: notes, scheduledAt, payWithWallet: true,
        });
        await spendFromWallet(orderId);
        showToast('Seva requested! Dakshina held securely until completion.', 'success');
        onDone();
      } else if (payPath === 'after') {
        // No upfront payment. Provider completes → client pays directly →
        // order waits for the platform commission (Path B gate).
        await createOrder({
          gigId: gig.id as string, paymentMethodId: 'pay_after_task', clientNotes: notes, scheduledAt, payAfterTask: true,
        });
        showToast('Seva requested! Offer dakshina directly after completion, then the seva contribution.', 'success');
        onDone();
      } else {
        if (!payRef.trim()) { showToast('Enter your payment transaction/reference ID.', 'error'); setWorking(false); return; }
        await createOrder({ gigId: gig.id as string, paymentMethodId: methodId, paymentRef: payRef.trim(), clientNotes: notes, scheduledAt });
        showToast('Booking submitted! The provider will accept shortly.', 'success');
        onDone();
      }
    } catch (e: any) { showToast(e.message || 'Booking failed.', 'error'); }
    setWorking(false);
  };

  const payHint = region === 'BD'
    ? 'Pay with bKash / Nagad / Rocket or scan the Bangla QR in the Billing section, then paste the Transaction ID below.'
    : region === 'IN'
    ? 'Pay via UPI (see the Billing section for the UPI ID), then paste the UPI reference below.'
    : 'Pay via Wise / Payoneer (see the Billing section), then paste the transfer reference below.';

  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className={btnG}><ChevronLeft className="w-4 h-4 inline" /> Back</button>
      <div className="bg-white rounded-2xl border border-stone-200 p-4">
        <p className="text-sm font-black text-stone-900">{gig.title}</p>
        <p className="text-xs text-stone-500">{gig.providerName} · {gig.durationMinutes} min</p>
        <div className="flex justify-between mt-2 text-sm">
          <span className="text-stone-500">{mkt(L, 'suggestedDakshina')}</span><b>{fmt(Number(gig.priceAmount))}</b>
        </div>
        <p className="text-[10px] text-stone-400 mt-1">{L === 'en' ? 'Includes a small seva contribution that sustains Sanatani Bandhan — what you see is what you offer.' : L === 'bn' ? 'সনাতনী বন্ধনকে টিকিয়ে রাখে এমন একটি ছোট সেবা অবদান অন্তর্ভুক্ত — যা দেখছেন তাই অর্পণ করুন।' : 'सनातनी बंधन को बनाए रखने वाला एक छोटा सेवा योगदान शामिल — जो दिख रहा है वही अर्पित करें।'}</p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="text-xs font-bold text-amber-900 mb-2">{mkt(L, 'takeSankalp')} — {L === 'en' ? 'how would you like to offer' : L === 'bn' ? 'আপনি কীভাবে অর্পণ করতে চান' : 'आप कैसे अर्पित करना चाहेंगे'} {fmt(Number(gig.priceAmount))}?</p>
        <div className="space-y-2">
          <button type="button" onClick={() => setPayPath('wallet')}
            className={`w-full text-left px-3 py-3 rounded-xl border min-h-[56px] ${payPath === 'wallet' ? 'border-amber-500 bg-white shadow-sm' : 'border-amber-200 bg-white/60'}`}>
            <p className="text-xs font-black text-stone-900">🪔 {mkt(L, 'sevaWallet')} {walletBalance !== null && <span className="text-stone-500 font-bold">({fmt(walletBalance)} available)</span>}</p>
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
              {r === 'BD' ? '🇧🇩 BD' : r === 'IN' ? '🇮🇳 India' : '🌍 Intl'}
            </button>
          ))}
        </div>
        </>)}
      </div>
      {payPath === 'now' && (
      <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
        <p className="text-xs font-bold text-stone-800">Step 2 — Submit proof & book</p>
        <label className="text-[11px] font-bold text-stone-500">Payment transaction / reference ID*
          <input value={payRef} onChange={(e) => setPayRef(e.target.value)} className={inputCls} placeholder="e.g. TRX123ABC" /></label>
      </div>
      )}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
        <label className="text-[11px] font-bold text-stone-500">Preferred date/time (optional)
          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputCls} /></label>
        <label className="text-[11px] font-bold text-stone-500">Notes for provider (optional)
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} rows={2} maxLength={500} placeholder="Gotra, address, special requests…" /></label>
        <button type="button" disabled={working} onClick={submit} className={`${btnP} w-full`}>
          {working ? 'Submitting…' : <><CheckCircle2 className="w-4 h-4 inline mr-1" /> {mkt(L, 'takeSankalp')}</>}
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

  const load = useCallback(async () => {
    setLoading(true);
    try { setOrders(await myOrdersAsClient()); } catch (e: any) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const confirmDone = async (o: MarketplaceOrder) => {
    try { await orderTransition(o.id as string, 'completed'); showToast(L === 'en' ? 'Seva complete. Dhanyavaad! 🙏' : L === 'bn' ? 'সেবা সম্পূর্ণ। ধন্যবাদ! 🙏' : 'सेवा पूर्ण। धन्यवाद! 🙏', 'success'); load(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };
  const raise = async () => {
    if (!disputeFor || !reason.trim()) { showToast('Describe the issue.', 'error'); return; }
    try { await openDispute(disputeFor, reason, details); showToast('Dispute raised. Our team will review.', 'success'); setDisputeFor(null); setReason(''); setDetails(''); load(); }
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

  if (loading) return <p className="text-sm text-stone-500 py-10 text-center"><RefreshCw className="w-4 h-4 animate-spin inline" /> Loading…</p>;
  return (
    <div className="space-y-3">
      {orders.length === 0 && <Empty text={mkt(L, 'noSevasYet')} />}
      {orders.map((o) => (
        <div key={o.id} className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><p className="text-sm font-black truncate">{o.gigTitle}</p>
              <p className="text-[11px] text-stone-500">{fmt(o.amountGross)} · {o.createdAt?.slice(0, 10)}</p></div>
            <span className={`text-[10px] font-black px-2 py-1 rounded-lg shrink-0 ${statusColor[o.status] || ''}`}>{o.status.replace(/_/g, ' ')}</span>
          </div>
          {(o as any).walletPaid && (
            <p className="text-[10px] font-bold text-sky-700 bg-sky-50 rounded-lg px-2 py-1 mt-2">👛 Paid from wallet — held in escrow</p>
          )}
          {o.status === 'awaiting_commission' && (
            <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-[11px] font-black text-amber-900">⏳ {L === 'en' ? 'Incomplete — seva contribution pending' : L === 'bn' ? 'অসম্পূর্ণ — সেবা অবদান বাকি' : 'अपूर्ण — सेवा योगदान शेष'}</p>
              <p className="text-[10px] text-amber-800 mt-0.5">{L === 'en'
                ? `Offer the ${fmt(Number((o as any).commissionAmount || 0))} seva contribution to complete this seva and unlock ashirvad.`
                : L === 'bn'
                ? `এই সেবা সম্পূর্ণ করতে ${fmt(Number((o as any).commissionAmount || 0))} সেবা অবদান অর্পণ করুন।`
                : `इस सेवा को पूर्ण करने के लिए ${fmt(Number((o as any).commissionAmount || 0))} सेवा योगदान अर्पित करें।`}</p>
              <button type="button" onClick={() => setCommissionFor(o)} className={`${btnP} w-full mt-2`}>{L === 'en' ? 'Offer contribution' : L === 'bn' ? 'অবদান অর্পণ করুন' : 'योगदान अर्पित करें'}</button>
            </div>
          )}
          <div className="flex gap-2 mt-2">
            {['paid', 'accepted', 'in_progress'].includes(o.status) && (
              <button type="button" onClick={() => confirmDone(o)} className={`${btnP} flex-1`}>Confirm completion</button>
            )}
            {['paid', 'accepted', 'in_progress'].includes(o.status) && (
              <button type="button" onClick={() => setDisputeFor(o.id as string)} className={btnG}><AlertTriangle className="w-3.5 h-3.5 inline mr-1" />Dispute</button>
            )}
          </div>
        </div>
      ))}
      {disputeFor && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setDisputeFor(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black mb-3">Raise a dispute</h3>
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-stone-500">Reason*<input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} maxLength={120} placeholder="e.g. Provider never showed up" /></label>
              <label className="text-[11px] font-bold text-stone-500">Details<textarea value={details} onChange={(e) => setDetails(e.target.value)} className={inputCls} rows={3} maxLength={2000} /></label>
              <div className="flex gap-2">
                <button type="button" onClick={raise} className={`${btnP} flex-1`}>Submit dispute</button>
                <button type="button" onClick={() => setDisputeFor(null)} className={`${btnG} flex-1`}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
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
      <div className="flex gap-1.5">
        {([['browse', `🔍 ${mkt(L, 'browseSevas')}`], ['bookings', `📋 ${mkt(L, 'sevaBookings')}`]] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setView(id)}
            className={`flex-1 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-black ${view === id ? 'bg-amber-500 text-stone-950' : 'bg-white border border-stone-200 text-stone-600'}`}>{label}</button>
        ))}
      </div>
      {view === 'bookings' ? <MyBookings /> : (
        <>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search puja, kundli, havan…" className={`${inputCls} pl-9`} />
          </div>
          <div className="flex gap-2">
            <select value={cat} onChange={(e) => setCat(e.target.value)} className={`${inputCls} w-auto`}>
              <option value="all">All categories</option>
              {['Puja', 'Havan', 'Katha', 'Samskara', 'Vastu', 'Kundli', 'Horoscope', 'Remedy', 'Consultation', 'Other'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={ptype} onChange={(e) => setPtype(e.target.value)} className={`${inputCls} w-auto`}>
              <option value="all">Purohit + Jyotishi</option><option value="purohit">Purohit</option><option value="jyotishi">Jyotishi</option>
            </select>
          </div>
          {loading ? <p className="text-sm text-stone-500 py-10 text-center"><RefreshCw className="w-4 h-4 animate-spin inline" /> Loading…</p> : (
            <div className="space-y-2.5">
              {filtered.length === 0 && <Empty text="No services match. Try another search." />}
              {filtered.map((g) => <GigCard key={g.id} gig={g} onOpen={() => openBooking(g)} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
};
