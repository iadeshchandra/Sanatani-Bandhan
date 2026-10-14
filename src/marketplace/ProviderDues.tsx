/**
 * ProviderDues — "Platform Dues" card in the provider Earnings tab.
 * ================================================================
 * Layer 6 of the Rail-2 stack: every completed Rail-2 order creates a
 * commission RECEIVABLE (platformDues doc). The provider sees what they
 * owe, per-order breakdown, and can settle via bKash.
 *
 * Auto-deduction also happens on Rail-1 payouts (see firestoreAdmin
 * payoutDecide): dues are subtracted first, line-by-line.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { HandCoins, RefreshCw, AlertTriangle, CheckCircle2, Copy } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { myPlatformDues, type PlatformDue } from '../lib/rail2';
import { contactOwner } from '../lib/providerPayments';

const btnP = 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-amber-500 text-stone-950 hover:bg-amber-400 disabled:opacity-40';
const btnG = 'px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold bg-stone-100 text-stone-600';

function fmt(n: number) { return `৳${Math.round(n).toLocaleString('bn-BD')}`; }

export const ProviderDues: React.FC<{ providerType: 'purohit' | 'jyotishi' }> = ({ providerType }) => {
  const { showToast } = useToast();
  const [dues, setDues] = useState<PlatformDue[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settling, setSettling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await myPlatformDues();
      setDues(r.dues); setTotal(r.totalPending);
    } catch (e: any) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const requestSettle = async () => {
    setSettling(true);
    try {
      await contactOwner({
        subject: `Settle platform dues — ${fmt(total)}`,
        message: `I have paid my outstanding platform dues of ${fmt(total)} via bKash to the platform number. Please verify and mark as settled.`,
        providerType,
      });
      showToast('Settlement request sent. The platform will verify your bKash payment.', 'success');
      setSettleOpen(false);
    } catch (e: any) { showToast(e.message, 'error'); }
    setSettling(false);
  };

  if (loading) return <p className="text-sm text-stone-500 py-6 text-center"><RefreshCw className="w-4 h-4 animate-spin inline" /> Loading dues…</p>;

  const pending = dues.filter((d) => d.status === 'pending');
  const history = dues.filter((d) => d.status !== 'pending');

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl border p-4 ${total > 0 ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-200'}`}>
        <div className="flex items-center gap-2">
          <HandCoins className={`w-5 h-5 ${total > 0 ? 'text-amber-700' : 'text-emerald-700'}`} />
          <p className="text-xs font-black uppercase tracking-widest text-stone-700">Platform dues</p>
        </div>
        <p className="text-2xl font-black mt-1 text-stone-950">{fmt(total)}</p>
        <p className="text-[11px] text-stone-500 mt-1">
          {total > 0
            ? 'Seva contribution owed on direct bookings. Settle to keep your sevas visible. 🙏'
            : 'All settled. Dhanyavaad for sustaining the dharmic mission! 🙏'}
        </p>
        {total > 0 && (
          <button type="button" onClick={() => setSettleOpen(true)} className={`${btnP} w-full mt-3`}>
            Settle via bKash
          </button>
        )}
      </div>

      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-black text-stone-500 uppercase">Outstanding</p>
          {pending.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-stone-200 px-3 py-2.5 flex justify-between items-center">
              <div>
                <p className="text-xs font-black">{fmt(d.amount)} <span className="font-normal text-stone-400">· {d.orderCode || d.orderId?.slice(0, 8)}</span></p>
                <p className="text-[10px] text-stone-500">Seva contribution · {String(d.createdAt?.toDate?.()?.toISOString?.() || '').slice(0, 10)}</p>
              </div>
              <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-amber-100 text-amber-800">PENDING</span>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-black text-stone-500 uppercase">History</p>
          {history.slice(0, 10).map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-stone-200 px-3 py-2.5 flex justify-between items-center opacity-70">
              <p className="text-xs font-black">{fmt(d.amount)} <span className="font-normal text-stone-400">· {d.orderCode || ''}</span></p>
              <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${d.status === 'settled' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-500'}`}>
                {d.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}

      {settleOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setSettleOpen(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black text-stone-900 mb-2">Settle {fmt(total)}</h3>
            <ol className="text-[11px] text-stone-600 space-y-1.5 list-decimal list-inside bg-stone-50 rounded-xl p-3 border border-stone-200">
              <li>Open bKash → <b>Send Money</b>.</li>
              <li>Send <b>{fmt(total)}</b> to the platform number (shown in Billing → Payment Methods).</li>
              <li>Note the TrxID from the success screen.</li>
              <li>Tap "I've paid" below — include the TrxID so we can verify.</li>
            </ol>
            <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2 mt-3 flex gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" /> Unpaid dues above the threshold auto-pause your sevas after the grace period.
            </p>
            <div className="flex gap-2 mt-3">
              <button type="button" disabled={settling} onClick={requestSettle} className={`${btnP} flex-1`}>
                <CheckCircle2 className="w-4 h-4 inline mr-1" />{settling ? 'Sending…' : "I've paid — notify platform"}
              </button>
              <button type="button" onClick={() => setSettleOpen(false)} className={`${btnG} flex-1`}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
