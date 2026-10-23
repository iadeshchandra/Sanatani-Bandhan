/**
 * Rail2PaymentScreen — client pays a provider DIRECTLY (Rail 2).
 * ===============================================================
 * Shown when the provider uses their own approved QR / UPI / link.
 *
 * Layer 3: displays the UNIQUE payable amount ("Pay EXACTLY ৳1,007").
 * Layer 5: mandatory order-ID-in-reference instruction (SB-XXXXXX).
 * Layer 2: TrxID + amount proof form with format validation.
 *
 * Flow: create Rail-2 order → show payment instructions → client pays →
 * client submits proof → order becomes 'paid' → provider confirms.
 */
import React, { useState } from 'react';
import { Copy, CheckCircle2, AlertTriangle, QrCode, Link2, ChevronLeft, RefreshCw } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { createRail2Order, submitRail2Proof, validateTrxId } from '../lib/rail2';
import { safeExternalUrl } from '../lib/safeUrl';
import type { Gig } from '../lib/marketplace';
import { formatMoney } from '../lib/money';
import type { PriceChangeNote } from '../lib/rebook';

const inputCls = 'w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 min-h-[44px] text-sm outline-none focus:ring-2 focus:ring-amber-500';
const btnP = 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-amber-500 text-stone-950 hover:bg-amber-400 disabled:opacity-40';
const btnG = 'px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold bg-stone-100 text-stone-600';

interface Created {
  orderId: string; orderCode: string; payableAmount: number; display: string; providerMethod: any;
}

export const Rail2PaymentScreen: React.FC<{ gig: Gig; onDone: () => void; onBack: () => void; priceNote?: PriceChangeNote | null }> = ({ gig, onDone, onBack, priceNote }) => {
  const { showToast } = useToast();
  const [created, setCreated] = useState<Created | null>(null);
  const [creating, setCreating] = useState(false);
  const [notes, setNotes] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  // Proof form
  const [trxId, setTrxId] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const startOrder = async () => {
    setCreating(true);
    try {
      const c = await createRail2Order({ gigId: gig.id as string, clientNotes: notes, scheduledAt });
      setCreated(c);
      setAmount(String(c.payableAmount));
    } catch (e: any) { showToast(e.message || 'Could not start booking.', 'error'); }
    setCreating(false);
  };

  const copy = (t: string, label: string) => {
    try { navigator.clipboard.writeText(t); showToast(`${label} copied.`, 'success'); }
    catch { showToast('Copy failed — please copy manually.', 'error'); }
  };

  const submitProof = async () => {
    if (!created) return;
    const v = validateTrxId(trxId, created.providerMethod?.methodType || '');
    if (!v.ok) { showToast(v.error as string, 'error'); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { showToast('Enter the exact amount you paid.', 'error'); return; }
    setSubmitting(true);
    try {
      await submitRail2Proof(created.orderId, trxId, amt);
      showToast('Payment proof submitted! The provider will confirm receipt.', 'success');
      onDone();
    } catch (e: any) { showToast(e.message || 'Submission failed.', 'error'); }
    setSubmitting(false);
  };

  const pm = created?.providerMethod?.details || {};
  const pmType = created?.providerMethod?.methodType || '';

  /* ---- Step 1: create the order ---- */
  if (!created) {
    return (
      <div className="space-y-3">
        <button type="button" onClick={onBack} className={btnG}><ChevronLeft className="w-4 h-4 inline" /> Back</button>
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <p className="text-sm font-black text-stone-900">{gig.title}</p>
          <p className="text-xs text-stone-500">{gig.providerName} · {gig.durationMinutes} min</p>
          {/* QUEUED #27: a rebook always charges the CURRENT dakshina —
              when it moved since the last seva, say so before payment. */}
          {priceNote && (
            <p className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 mt-2">
              🪔 Dakshina updated since your last seva — was {formatMoney(priceNote.wasAmount, priceNote.wasCurrency)}, now {formatMoney(priceNote.nowAmount, priceNote.nowCurrency)}.
            </p>
          )}
          <p className="text-[11px] text-stone-500 mt-2">This provider accepts <b>direct payment</b>. You'll pay them via their own QR / UPI / link below, then submit proof here.</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
          <label className="text-[11px] font-bold text-stone-500">Preferred date/time (optional)
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputCls} /></label>
          <label className="text-[11px] font-bold text-stone-500">Notes for provider (optional)
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} rows={2} maxLength={500} /></label>
          <button type="button" disabled={creating} onClick={startOrder} className={`${btnP} w-full`}>
            {creating ? <><RefreshCw className="w-4 h-4 animate-spin inline" /> Creating booking…</> : 'Continue to payment'}
          </button>
        </div>
      </div>
    );
  }

  /* ---- Step 2: pay the provider directly ---- */
  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className={btnG}><ChevronLeft className="w-4 h-4 inline" /> Back</button>

      {/* Unique amount — Layer 3 */}
      <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 text-center">
        <p className="text-[11px] font-black text-amber-800 uppercase tracking-widest">Pay exactly</p>
        <div className="flex items-center justify-center gap-2 mt-1">
          <p className="text-3xl font-black text-stone-950">{created.display}</p>
          <button type="button" onClick={() => copy(String(created.payableAmount), 'Amount')} className="p-2.5 bg-white rounded-xl border border-amber-200 min-h-[44px] min-w-[44px]"><Copy className="w-4 h-4" /></button>
        </div>
        <p className="text-[10px] text-amber-700 mt-1">The odd amount identifies YOUR booking. Do not round it.</p>
      </div>

      {/* Provider's payment method */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4">
        {pmType === 'own_qr' && pm.qrImageUrl && (
          <div className="flex flex-col items-center">
            <img src={pm.qrImageUrl} alt="Provider QR" className="w-48 h-48 rounded-xl border border-stone-200" />
            {pm.accountLabel && <p className="text-xs font-bold text-stone-600 mt-2">{pm.accountLabel}</p>}
          </div>
        )}
        {pmType === 'own_upi' && pm.upiId && (
          <div className="flex items-center justify-between bg-stone-50 rounded-xl p-3 border border-stone-200">
            <div><p className="text-[10px] font-black text-stone-500 uppercase">UPI ID</p><p className="text-sm font-black font-mono">{pm.upiId}</p></div>
            <button type="button" onClick={() => copy(pm.upiId, 'UPI ID')} className="p-2.5 bg-white rounded-xl border min-h-[44px] min-w-[44px]"><Copy className="w-4 h-4" /></button>
          </div>
        )}
        {pmType === 'own_link' && safeExternalUrl(pm.paymentLink) && (
          <a href={safeExternalUrl(pm.paymentLink)!} target="_blank" rel="noreferrer" className={`${btnP} w-full text-center block`}>
            <Link2 className="w-4 h-4 inline mr-1" /> Open payment link
          </a>
        )}
        {!pm.qrImageUrl && !pm.upiId && !pm.paymentLink && (
          <p className="text-xs text-stone-500 text-center py-4"><QrCode className="w-5 h-5 inline mr-1" /> Provider payment details loading…</p>
        )}
      </div>

      {/* Layer 5: order ID in reference */}
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4">
        <p className="text-[11px] font-black text-sky-900 uppercase tracking-widest mb-1">⚠️ Important — payment reference</p>
        <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-sky-200">
          <p className="text-lg font-black font-mono tracking-widest text-sky-900">{created.orderCode}</p>
          <button type="button" onClick={() => copy(created.orderCode, 'Order code')} className="p-2.5 bg-sky-100 rounded-xl min-h-[44px] min-w-[44px]"><Copy className="w-4 h-4" /></button>
        </div>
        <ol className="text-[11px] text-sky-800 mt-2 space-y-1 list-decimal list-inside">
          <li>Pay <b>{created.display}</b> using the method above.</li>
          <li>In your bKash / Nagad / UPI app, enter <b>{created.orderCode}</b> in the <b>reference / note</b> field.</li>
          <li>Copy the Transaction ID from the success screen.</li>
        </ol>
      </div>

      {/* Layer 2: proof form */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
        <p className="text-xs font-black text-stone-800">Submit payment proof</p>
        <label className="text-[11px] font-bold text-stone-500">Transaction / reference ID*
          <input value={trxId} onChange={(e) => setTrxId(e.target.value.toUpperCase())} className={inputCls} placeholder="e.g. 9HXK2LM4PQ" maxLength={64} /></label>
        <label className="text-[11px] font-bold text-stone-500">Exact amount paid*
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder={String(created.payableAmount)} /></label>
        {Number(amount) > 0 && Math.abs(Number(amount) - created.payableAmount) > 0.01 && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2 flex gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" /> Amount differs from {created.display}. Double-check — mismatches delay confirmation.
          </p>
        )}
        <button type="button" disabled={submitting} onClick={submitProof} className={`${btnP} w-full`}>
          {submitting ? 'Submitting…' : <><CheckCircle2 className="w-4 h-4 inline mr-1" /> I've paid — submit proof</>}
        </button>
        <p className="text-[10px] text-stone-400 text-center">The provider confirms receipt. Auto-confirmed after 48h if undisputed.</p>
      </div>
    </div>
  );
};
