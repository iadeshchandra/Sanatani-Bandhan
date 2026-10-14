/**
 * WalletHistory — Transaction Records with full top-up lifecycle.
 * =================================================================
 * Shows every top-up claim with its lifecycle:
 *   Pending → Processing → Credited / Rejected (reason) / Expired
 * Each entry: date, amount, method, reference, masked TrxID, status pill.
 * Newest first. "Edit & resubmit" for pending claims (self-serve).
 *
 * Spark-native: expiry is computed client-side from expiresAt.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { History, Clock, CheckCircle2, XCircle, Copy, Pencil } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { Card, Empty, Modal, Btn, Field, inputCls } from '../../solo/ui';
import {
  myTopupClaims, updateTopupClaim, fmtWallet, CURRENCY_SYMBOL, TOPUP_LIMITS,
  claimDisplayStatus, maskTrxId,
  type TopupClaim, type WalletCurrency,
} from '../../lib/wallet';
import { getPaymentMethods, type PaymentMethodDoc } from '../../lib/paymentMethods';

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-stone-200 text-stone-600',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  approved: 'Credited',
  rejected: 'Rejected',
  expired: 'Expired',
};

function fmtDate(ts: any): string {
  try {
    const d = ts?.toDate?.();
    if (!d) return '—';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

const EditModal: React.FC<{ claim: TopupClaim; onClose: () => void; onSaved: () => void }> = ({ claim, onClose, onSaved }) => {
  const { showToast } = useToast();
  const [trxId, setTrxId] = useState(claim.trxId);
  const [amount, setAmount] = useState(String(claim.amount));
  const [working, setWorking] = useState(false);
  const limits = TOPUP_LIMITS[claim.currency];

  const save = async () => {
    setWorking(true);
    try {
      await updateTopupClaim(claim.id!, { trxId: trxId.trim(), amount: Math.round(Number(amount)) });
      showToast('Top-up request updated!', 'success');
      onSaved();
    } catch (e: any) { showToast(e.message || 'Update failed.', 'error'); }
    setWorking(false);
  };

  return (
    <Modal onClose={onClose}>
      <p className="text-sm font-black text-stone-900 mb-3">Edit &amp; resubmit</p>
      <div className="space-y-3">
        <Field label={`Amount (${fmtWallet(limits.min, claim.currency)} – ${fmtWallet(limits.max, claim.currency)})`}>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Transaction ID*">
          <input value={trxId} onChange={(e) => setTrxId(e.target.value)} className={inputCls} />
        </Field>
        <div className="flex gap-2">
          <Btn variant="secondary" className="flex-1" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" className="flex-1" disabled={working} onClick={save}>
            {working ? 'Saving…' : 'Resubmit'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};

export const WalletHistory: React.FC = () => {
  const { showToast } = useToast();
  const [claims, setClaims] = useState<TopupClaim[]>([]);
  const [methods, setMethods] = useState<Record<string, PaymentMethodDoc>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TopupClaim | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'expired'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, m] = await Promise.all([myTopupClaims(), getPaymentMethods().catch(() => [] as PaymentMethodDoc[])]);
      setClaims(c);
      const map: Record<string, PaymentMethodDoc> = {};
      for (const x of m) map[x.id] = x;
      setMethods(map);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const copy = (t: string) => {
    navigator.clipboard?.writeText(t).catch(() => {});
    showToast('Copied.', 'success');
  };

  const visible = claims.filter((c) => {
    if (filter === 'all') return true;
    return claimDisplayStatus(c) === filter;
  });

  const counts = {
    pending: claims.filter((c) => claimDisplayStatus(c) === 'pending').length,
    approved: claims.filter((c) => c.status === 'approved').length,
    rejected: claims.filter((c) => c.status === 'rejected').length,
    expired: claims.filter((c) => claimDisplayStatus(c) === 'expired').length,
  };

  if (loading) {
    return <Card><p className="text-xs text-stone-400 text-center py-6">Loading transaction records…</p></Card>;
  }

  return (
    <div className="space-y-3">
      <Card>
        <p className="text-xs font-black text-stone-800 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <History className="w-4 h-4" /> Transaction Records
        </p>

        {/* Filter pills */}
        <div className="flex gap-1.5 flex-wrap mb-3">
          {(['all', 'pending', 'approved', 'rejected', 'expired'] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-black min-h-[36px] ${filter === f ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'}`}>
              {f === 'all' ? `All (${claims.length})` : `${STATUS_LABEL[f]} (${counts[f]})`}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <Empty text={filter === 'all' ? 'No top-up requests yet.' : `No ${STATUS_LABEL[filter].toLowerCase()} requests.`} />
        ) : (
          <div className="divide-y divide-stone-100">
            {visible.map((c) => {
              const ds = claimDisplayStatus(c);
              const method = methods[c.paymentMethodId];
              const sym = CURRENCY_SYMBOL[c.currency as WalletCurrency] || '';
              return (
                <div key={c.id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-stone-900">
                          {sym}{Number(c.amount).toLocaleString('en-IN')}
                        </p>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${STATUS_STYLE[ds]}`}>
                          {STATUS_LABEL[ds]}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">{fmtDate(c.createdAt)}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <button type="button" onClick={() => c.reference && copy(c.reference)}
                          className="text-[11px] font-mono font-bold text-stone-700 bg-stone-100 rounded px-1.5 py-0.5 flex items-center gap-1 min-h-[28px]">
                          {c.reference || '—'} <Copy className="w-3 h-3 text-stone-400" />
                        </button>
                        <span className="text-[11px] text-stone-500">
                          TrxID {maskTrxId(c.trxId)}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {method?.label || c.paymentMethodId}
                      </p>
                      {c.status === 'rejected' && c.rejectionReason && (
                        <p className="text-[11px] text-red-600 mt-1 bg-red-50 rounded px-2 py-1">
                          Reason: {c.rejectionReason}
                        </p>
                      )}
                      {ds === 'expired' && (
                        <p className="text-[11px] text-stone-400 mt-1">
                          Expired — file a new top-up request.
                        </p>
                      )}
                    </div>
                    {ds === 'pending' && (
                      <button type="button" onClick={() => setEditing(c)}
                        className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 min-h-[40px]">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {editing && (
        <EditModal
          claim={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
};

export default WalletHistory;
