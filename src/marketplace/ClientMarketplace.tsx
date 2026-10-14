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
import { detectPayRegion } from '../lib/geoDetect';

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

const GigCard: React.FC<{ gig: Gig; onOpen: () => void }> = ({ gig, onOpen }) => (
  <button type="button" onClick={onOpen} className="w-full text-left bg-white rounded-2xl border border-stone-200 p-4 hover:border-amber-300 transition-colors min-h-[44px]">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        {gig.featured && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 mb-1 inline-block">FEATURED</span>}
        <p className="text-sm font-black text-stone-900 truncate">{gig.title}</p>
        <p className="text-[11px] text-stone-500 truncate">{gig.providerName} · {gig.category}</p>
        <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />{Number(gig.avgRating || 0).toFixed(1)} ({gig.totalOrders || 0})
          <span className="mx-1">·</span><Clock className="w-3 h-3" />{gig.durationMinutes}m
        </p>
      </div>
      <p className="text-sm font-black text-amber-700 shrink-0">{fmt(Number(gig.priceAmount))}</p>
    </div>
  </button>
);

/* ------------------------------ Booking ------------------------------ */

const BookGig: React.FC<{ gig: Gig; onDone: () => void; onBack: () => void }> = ({ gig, onDone, onBack }) => {
  const { showToast } = useToast();
  const [region, setRegion] = useState<'BD' | 'IN' | 'INTL'>('BD');
  const [payRef, setPayRef] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => { detectPayRegion().then(setRegion).catch(() => {}); }, []);

  const methodId = region === 'BD' ? 'bd_banglaqr' : region === 'IN' ? 'in_upi' : 'intl_wise';

  const submit = async () => {
    if (!payRef.trim()) { showToast('Enter your payment transaction/reference ID.', 'error'); return; }
    setWorking(true);
    try {
      await createOrder({ gigId: gig.id as string, paymentMethodId: methodId, paymentRef: payRef.trim(), clientNotes: notes, scheduledAt });
      showToast('Booking submitted! The provider will accept shortly.', 'success');
      onDone();
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
          <span className="text-stone-500">Service price</span><b>{fmt(Number(gig.priceAmount))}</b>
        </div>
        <p className="text-[10px] text-stone-400 mt-1">Includes platform fee — what you see is what you pay.</p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="text-xs font-bold text-amber-900 mb-1">Step 1 — Pay {fmt(Number(gig.priceAmount))}</p>
        <p className="text-[11px] text-amber-800">{payHint}</p>
        <div className="flex gap-1.5 mt-2">
          {(['BD', 'IN', 'INTL'] as const).map((r) => (
            <button key={r} type="button" onClick={() => setRegion(r)}
              className={`px-3 py-2 rounded-lg text-[11px] font-black min-h-[44px] ${region === r ? 'bg-amber-500 text-stone-950' : 'bg-white border border-amber-200 text-amber-800'}`}>
              {r === 'BD' ? '🇧🇩 BD' : r === 'IN' ? '🇮🇳 India' : '🌍 Intl'}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
        <p className="text-xs font-bold text-stone-800">Step 2 — Submit proof & book</p>
        <label className="text-[11px] font-bold text-stone-500">Payment transaction / reference ID*
          <input value={payRef} onChange={(e) => setPayRef(e.target.value)} className={inputCls} placeholder="e.g. TRX123ABC" /></label>
        <label className="text-[11px] font-bold text-stone-500">Preferred date/time (optional)
          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputCls} /></label>
        <label className="text-[11px] font-bold text-stone-500">Notes for provider (optional)
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} rows={2} maxLength={500} placeholder="Gotra, address, special requests…" /></label>
        <button type="button" disabled={working} onClick={submit} className={`${btnP} w-full`}>
          {working ? 'Submitting…' : <><CheckCircle2 className="w-4 h-4 inline mr-1" /> Confirm booking</>}
        </button>
      </div>
    </div>
  );
};

/* ------------------------------ My bookings ------------------------------ */

const MyBookings: React.FC = () => {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [disputeFor, setDisputeFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setOrders(await myOrdersAsClient()); } catch (e: any) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const confirmDone = async (o: MarketplaceOrder) => {
    try { await orderTransition(o.id as string, 'completed'); showToast('Marked complete. Thank you!', 'success'); load(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };
  const raise = async () => {
    if (!disputeFor || !reason.trim()) { showToast('Describe the issue.', 'error'); return; }
    try { await openDispute(disputeFor, reason, details); showToast('Dispute raised. Our team will review.', 'success'); setDisputeFor(null); setReason(''); setDetails(''); load(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  if (loading) return <p className="text-sm text-stone-500 py-10 text-center"><RefreshCw className="w-4 h-4 animate-spin inline" /> Loading…</p>;
  return (
    <div className="space-y-3">
      {orders.length === 0 && <Empty text="No bookings yet." />}
      {orders.map((o) => (
        <div key={o.id} className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><p className="text-sm font-black truncate">{o.gigTitle}</p>
              <p className="text-[11px] text-stone-500">{fmt(o.amountGross)} · {o.createdAt?.slice(0, 10)}</p></div>
            <span className={`text-[10px] font-black px-2 py-1 rounded-lg shrink-0 ${statusColor[o.status] || ''}`}>{o.status.replace('_', ' ')}</span>
          </div>
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
        {([['browse', '🔍 Browse services'], ['bookings', '📋 My bookings']] as const).map(([id, label]) => (
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
