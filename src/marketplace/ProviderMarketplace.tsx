/**
 * ProviderMarketplace — Fiverr-like gig management for Purohit / Jyotishi.
 * ========================================================================
 * Embed in PurohitWorkspaceShell / JyotishWorkspaceShell as a tab.
 * Subtabs: My Services (gig CRUD) · Orders (accept/complete) · Earnings (payout).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Power, Star, Wallet, Send, RefreshCw, Package, CreditCard, HandCoins } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { ProviderPaymentSettings } from './ProviderPaymentSettings';
import { useLanguage } from '../context/LanguageContext';
import { mkt, contributionNote, type MktLang } from '../lib/marketplaceCopy';
import {
  listGigs, myGigs, saveGig, setGigActive,
  myOrdersAsProvider, orderTransition,
  providerEarningsSummary, requestPayout, listMyPayouts,
  type Gig, type MarketplaceOrder,
} from '../lib/marketplace';
import { confirmRail2Receipt, disputeRail2Amount, autoConfirmStaleProofs } from '../lib/rail2';
import { ProviderDues } from './ProviderDues';

export const GIG_CATEGORIES = ['Puja', 'Havan', 'Katha', 'Samskara', 'Vastu', 'Kundli', 'Horoscope', 'Remedy', 'Consultation', 'Other'];

const inputCls = 'w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 min-h-[44px] text-sm outline-none focus:ring-2 focus:ring-amber-500';
const btnP = 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-amber-500 text-stone-950 hover:bg-amber-400';
const btnG = 'px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold bg-stone-100 text-stone-600';
const Empty: React.FC<{ text: string }> = ({ text }) => <p className="text-xs text-stone-500 py-8 text-center">{text}</p>;

const statusColor: Record<string, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-800', paid: 'bg-sky-100 text-sky-800',
  accepted: 'bg-indigo-100 text-indigo-800', in_progress: 'bg-violet-100 text-violet-800',
  completed: 'bg-emerald-100 text-emerald-800', cancelled: 'bg-stone-200 text-stone-500',
  disputed: 'bg-red-100 text-red-700', refunded: 'bg-orange-100 text-orange-800',
};

function fmt(n: number) { return `₹${Math.round(n).toLocaleString('en-IN')}`; }

/* ------------------------------ My Services ------------------------------ */

const MyServices: React.FC<{ providerType: 'purohit' | 'jyotishi'; providerName: string }> = ({ providerType, providerName }) => {
  const { showToast } = useToast();
  const { currentLang } = useLanguage();
  const L = (currentLang === 'bn' || currentLang === 'hi' ? currentLang : 'en') as MktLang;
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Gig> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setGigs(await myGigs()); } catch (e: any) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing?.title?.trim() || !editing?.priceAmount) { showToast('Title and price are required.', 'error'); return; }
    try {
      await saveGig({ ...editing, providerType, providerName });
      showToast('Service saved.', 'success'); setEditing(null); load();
    } catch (e: any) { showToast(e.message || 'Save failed.', 'error'); }
  };
  const toggle = async (g: Gig) => {
    try { await setGigActive(g.id as string, !(g.active !== false)); load(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  if (loading) return <p className="text-sm text-stone-500 py-10 text-center"><RefreshCw className="w-4 h-4 animate-spin inline" /> Loading…</p>;
  return (
    <div className="space-y-3">
      {gigs.map((g) => (
        <div key={g.id} className={`bg-white rounded-2xl border p-4 ${g.active === false ? 'opacity-60 border-stone-200' : 'border-stone-200'}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-black text-stone-900 truncate">{g.title}</p>
              <p className="text-[11px] text-stone-500">{g.category} · {g.durationMinutes} min · ⭐ {Number(g.avgRating || 0).toFixed(1)} ({g.totalOrders || 0} orders)</p>
            </div>
            <p className="text-sm font-black text-amber-700 shrink-0">{fmt(Number(g.priceAmount))}</p>
          </div>
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => setEditing(g)} className={btnG}><Pencil className="w-3.5 h-3.5 inline mr-1" />Edit</button>
            <button type="button" onClick={() => toggle(g)} className={btnG}><Power className="w-3.5 h-3.5 inline mr-1" />{g.active === false ? 'Activate' : 'Pause'}</button>
          </div>
        </div>
      ))}
      {gigs.length === 0 && <Empty text={L === 'en' ? 'No sevas yet. Offer your first seva below.' : L === 'bn' ? 'এখনও কোনো সেবা নেই। নিচে আপনার প্রথম সেবা দিন।' : 'अभी कोई सेवा नहीं। नीचे अपनी पहली सेवा दें।'} />}
      <button type="button" onClick={() => setEditing({ title: '', description: '', priceAmount: 501, durationMinutes: 60, category: 'Puja', languages: [], active: true })} className={`${btnP} w-full`}>
        <Plus className="w-4 h-4 inline mr-1" /> {L === 'en' ? 'New seva' : L === 'bn' ? 'নতুন সেবা' : 'नई सेवा'}
      </button>

      {editing && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black text-stone-900 mb-3">{editing.id ? (L === 'en' ? 'Edit seva' : L === 'bn' ? 'সেবা সম্পাদনা' : 'सेवा संपादित करें') : (L === 'en' ? 'New seva' : L === 'bn' ? 'নতুন সেবা' : 'नई सेवा')}</h3>
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-stone-500">{L === 'en' ? 'Title*' : L === 'bn' ? 'শিরোনাম*' : 'शीर्षक*'}<input value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className={inputCls} placeholder="e.g. Satyanarayan Katha at home" maxLength={120} /></label>
              <label className="text-[11px] font-bold text-stone-500">{L === 'en' ? 'Description' : L === 'bn' ? 'বিবরণ' : 'विवरण'}<textarea value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className={inputCls} rows={3} maxLength={2000} placeholder="What's included, what to prepare…" /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] font-bold text-stone-500">{mkt(L, 'suggestedDakshina')}*<input type="number" value={editing.priceAmount || ''} onChange={(e) => setEditing({ ...editing, priceAmount: Number(e.target.value) })} className={inputCls} /></label>
                <label className="text-[11px] font-bold text-stone-500">{L === 'en' ? 'Duration (min)' : L === 'bn' ? 'সময়কাল (মিনিট)' : 'अवधि (मिनट)'}<input type="number" value={editing.durationMinutes || 60} onChange={(e) => setEditing({ ...editing, durationMinutes: Number(e.target.value) })} className={inputCls} /></label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] font-bold text-stone-500">Category
                  <select value={editing.category || 'Puja'} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className={inputCls}>
                    {GIG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select></label>
                <label className="text-[11px] font-bold text-stone-500">Languages (comma)<input value={(editing.languages || []).join(', ')} onChange={(e) => setEditing({ ...editing, languages: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} className={inputCls} placeholder="Hindi, Bengali" /></label>
              </div>
              <p className="text-[10px] text-stone-400">🪔 {contributionNote(L, 12)}</p>
              <div className="flex gap-2">
                <button type="button" onClick={save} className={`${btnP} flex-1`}>Save service</button>
                <button type="button" onClick={() => setEditing(null)} className={`${btnG} flex-1`}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------ Orders ------------------------------ */

const ProviderOrders: React.FC = () => {
  const { showToast } = useToast();
  const { currentLang } = useLanguage();
  const L = (currentLang === 'bn' || currentLang === 'hi' ? currentLang : 'en') as MktLang;
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [disputeNote, setDisputeNote] = useState('');
  const [disputing, setDisputing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [os] = await Promise.all([
        myOrdersAsProvider(),
        autoConfirmStaleProofs().then((n) => { if (n > 0) showToast(`${n} payment proof(s) auto-confirmed after 48h.`, 'info'); }).catch(() => {}),
      ]);
      setOrders(os);
    } catch (e: any) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const go = async (o: MarketplaceOrder, to: 'accepted' | 'cancelled' | 'in_progress' | 'completed') => {
    setWorking(o.id as string);
    try { await orderTransition(o.id as string, to); showToast('Order updated.', 'success'); load(); }
    catch (e: any) { showToast(e.message, 'error'); }
    setWorking(null);
  };

  const confirmReceipt = async (o: MarketplaceOrder) => {
    setWorking(o.id as string);
    try { await confirmRail2Receipt(o.id as string); showToast('Payment confirmed. You can start work.', 'success'); load(); }
    catch (e: any) { showToast(e.message, 'error'); }
    setWorking(null);
  };

  const disputeProof = async (o: MarketplaceOrder) => {
    if (!disputeNote.trim()) { showToast('Explain the issue with the payment.', 'error'); return; }
    setWorking(o.id as string);
    try { await disputeRail2Amount(o.id as string, disputeNote); showToast('Disputed. The client has been notified to re-submit.', 'success'); setDisputing(null); setDisputeNote(''); load(); }
    catch (e: any) { showToast(e.message, 'error'); }
    setWorking(null);
  };

  const nextActions: Record<string, { to: 'accepted' | 'cancelled' | 'in_progress' | 'completed'; label: string }[]> = {
    paid: [{ to: 'accepted', label: 'Accept' }, { to: 'cancelled', label: 'Decline' }],
    accepted: [{ to: 'in_progress', label: 'Start work' }, { to: 'cancelled', label: 'Cancel' }],
    in_progress: [{ to: 'completed', label: 'Mark complete' }],
  };

  if (loading) return <p className="text-sm text-stone-500 py-10 text-center"><RefreshCw className="w-4 h-4 animate-spin inline" /> Loading…</p>;
  return (
    <div className="space-y-3">
      {orders.length === 0 && <Empty text="No orders yet. Share your services to get bookings." />}
      {orders.map((o) => (
        <div key={o.id} className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-black text-stone-900 truncate">{o.gigTitle}</p>
              <p className="text-[11px] text-stone-500">{o.createdAt?.slice(0, 10)} · via {o.paymentMethodId}</p>
              {o.clientNotes && <p className="text-[11px] text-stone-600 mt-1 italic">"{o.clientNotes}"</p>}
            </div>
            <span className={`text-[10px] font-black px-2 py-1 rounded-lg shrink-0 ${statusColor[o.status] || ''}`}>{o.status.replace('_', ' ')}</span>
          </div>
          <div className="flex gap-3 mt-2 text-[11px]">
            <span className="text-stone-500">{L === 'en' ? 'Dakshina' : L === 'bn' ? 'দক্ষিণা' : 'दक्षिणा'} <b className="text-stone-800">{fmt(o.amountGross)}</b></span>
            <span className="text-stone-500">{mkt(L, 'sevaContribution')} <b className="text-amber-700">{fmt(o.commissionAmount)}</b></span>
            <span className="text-stone-500">{L === 'en' ? 'You receive' : L === 'bn' ? 'আপনি পান' : 'आपको मिलता है'} <b className="text-emerald-700">{fmt(o.providerNet)}</b></span>
          </div>
          {/* Rail-2: payment proof awaiting confirmation */}
          {(o as any).rail === 'rail2' && o.status === 'paid' && (o as any).rail2Proof && !(o as any).rail2Proof.confirmedAt && (
            <div className="mt-2 bg-sky-50 border border-sky-200 rounded-xl p-3">
              <p className="text-[11px] font-black text-sky-900">💰 Payment proof submitted</p>
              <p className="text-[11px] text-sky-800 mt-1">
                TrxID: <b className="font-mono">{(o as any).rail2Proof.trxId}</b> · Amount: <b>{fmt((o as any).rail2Proof.amount)}</b>
                {(o as any).rail2Proof.amountMismatch && <span className="text-amber-700 font-bold"> ⚠️ differs from payable amount</span>}
              </p>
              <div className="flex gap-2 mt-2">
                <button type="button" disabled={working === o.id} onClick={() => confirmReceipt(o)} className={`${btnP} flex-1`}>
                  {working === o.id ? '…' : '✓ Confirm receipt'}
                </button>
                <button type="button" onClick={() => setDisputing(disputing === o.id ? null : (o.id as string))} className={btnG}>
                  Dispute
                </button>
              </div>
              {disputing === o.id && (
                <div className="mt-2 space-y-2">
                  <textarea value={disputeNote} onChange={(e) => setDisputeNote(e.target.value)}
                    className={inputCls} rows={2} maxLength={500} placeholder="What's wrong? (wrong amount, invalid TrxID…)" />
                  <button type="button" disabled={working === o.id} onClick={() => disputeProof(o)} className={`${btnP} w-full`}>
                    Submit dispute
                  </button>
                </div>
              )}
            </div>
          )}
          {(o as any).rail === 'rail2' && (o as any).orderCode && (
            <p className="text-[10px] text-stone-400 mt-1.5">Order ref: <b className="font-mono">{(o as any).orderCode}</b> · payable was {fmt((o as any).payableAmount || o.amountGross)}</p>
          )}
          {o.status === 'awaiting_commission' && (
            <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-[11px] font-black text-amber-900">⏳ {L === 'en' ? 'Awaiting seva contribution' : L === 'bn' ? 'সেবা অবদানের অপেক্ষায়' : 'सेवा योगदान की प्रतीक्षा'}</p>
              <p className="text-[10px] text-amber-800 mt-0.5">
                The client pays you directly, then pays the {fmt(Number((o as any).commissionAmount || 0))} commission to the platform.
                The order completes after owner verification — then your review unlocks.
              </p>
            </div>
          )}
          {(nextActions[o.status] || []).length > 0 && (
            <div className="flex gap-2 mt-2">
              {nextActions[o.status].map((a) => (
                <button key={a.to} type="button" disabled={working === o.id} onClick={() => go(o, a.to)}
                  className={`${a.to === 'cancelled' ? btnG : btnP} flex-1`}>{working === o.id ? '…' : a.label}</button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/* ------------------------------ Earnings ------------------------------ */

const ProviderEarnings: React.FC = () => {
  const { showToast } = useToast();
  const [sum, setSum] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reqOpen, setReqOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'bkash' | 'nagad' | 'bank' | 'wise'>('bkash');
  const [acct, setAcct] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([providerEarningsSummary(), listMyPayouts()]);
      setSum(s); setPayouts(p);
    } catch (e: any) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    try {
      await requestPayout({ amount: Number(amount), method, accountDetails: acct });
      showToast('Payout requested.', 'success'); setReqOpen(false); setAmount(''); setAcct(''); load();
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  if (loading || !sum) return <p className="text-sm text-stone-500 py-10 text-center"><RefreshCw className="w-4 h-4 animate-spin inline" /> Loading…</p>;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3"><p className="text-[10px] text-emerald-700 font-bold">AVAILABLE</p><p className="text-lg font-black text-emerald-800">{fmt(sum.available)}</p></div>
        <div className="bg-white border border-stone-200 rounded-2xl p-3"><p className="text-[10px] text-stone-500 font-bold">LIFETIME EARNED</p><p className="text-lg font-black text-stone-900">{fmt(sum.earned)}</p></div>
        <div className="bg-white border border-stone-200 rounded-2xl p-3"><p className="text-[10px] text-stone-500 font-bold">IN PROGRESS</p><p className="text-lg font-black text-stone-900">{fmt(sum.pending)}</p></div>
        <div className="bg-white border border-stone-200 rounded-2xl p-3"><p className="text-[10px] text-stone-500 font-bold">PAID OUT</p><p className="text-lg font-black text-stone-900">{fmt(sum.paidOut)}</p></div>
      </div>
      <button type="button" disabled={sum.available <= 0} onClick={() => setReqOpen(true)} className={`${btnP} w-full disabled:opacity-40`}>
        <Wallet className="w-4 h-4 inline mr-1" /> Request payout
      </button>
      {payouts.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-black text-stone-500 uppercase">Payout history</p>
          {payouts.map((p: any) => (
            <div key={p.id} className="bg-white rounded-xl border border-stone-200 px-3 py-2.5 flex justify-between items-center">
              <div><p className="text-xs font-black">{fmt(p.amount)}</p><p className="text-[10px] text-stone-500">{p.method} · {p.requestedAt?.slice?.(0, 10) || ''}</p></div>
              <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-stone-100 text-stone-600">{p.status}</span>
            </div>
          ))}
        </div>
      )}
      {reqOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setReqOpen(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black mb-3">Request payout</h3>
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-stone-500">Amount (₹, max {fmt(sum.available)})<input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} /></label>
              <label className="text-[11px] font-bold text-stone-500">Method
                <select value={method} onChange={(e) => setMethod(e.target.value as any)} className={inputCls}>
                  <option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="bank">Bank transfer</option><option value="wise">Wise</option>
                </select></label>
              <label className="text-[11px] font-bold text-stone-500">Account details<input value={acct} onChange={(e) => setAcct(e.target.value)} className={inputCls} placeholder="bKash number / account no" /></label>
              <div className="flex gap-2">
                <button type="button" onClick={submit} className={`${btnP} flex-1`}><Send className="w-3.5 h-3.5 inline mr-1" />Submit request</button>
                <button type="button" onClick={() => setReqOpen(false)} className={`${btnG} flex-1`}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------ Main ------------------------------ */

export const ProviderMarketplace: React.FC<{ providerType: 'purohit' | 'jyotishi'; providerName?: string }> = ({ providerType, providerName }) => {
  const { currentLang } = useLanguage();
  const L = (currentLang === 'bn' || currentLang === 'hi' ? currentLang : 'en') as MktLang;
  const [tab, setTab] = useState<'services' | 'orders' | 'earnings' | 'dues' | 'payments'>('services');
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto">
        {([
          ['services', mkt(L, 'mySevas'), Package],
          ['orders', mkt(L, 'sevaBookings'), Star],
          ['earnings', mkt(L, 'dakshinaReceived'), Wallet],
          ['dues', L === 'en' ? 'Dues' : L === 'bn' ? 'বকেয়া' : 'बकाया', HandCoins],
          ['payments', L === 'en' ? 'Payments' : L === 'bn' ? 'পেমেন্ট' : 'भुगतान', CreditCard],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={`flex-1 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap ${tab === id ? 'bg-amber-500 text-stone-950' : 'bg-white border border-stone-200 text-stone-600'}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>
      {tab === 'services' && <MyServices providerType={providerType} providerName={providerName || ''} />}
      {tab === 'orders' && <ProviderOrders />}
      {tab === 'earnings' && <ProviderEarnings />}
      {tab === 'dues' && <ProviderDues providerType={providerType} />}
      {tab === 'payments' && <ProviderPaymentSettings providerType={providerType} providerName={providerName} />}
    </div>
  );
};
