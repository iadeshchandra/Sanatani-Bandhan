/**
 * AdminTabsI — Console: Wallet top-ups, wallet lookup/adjust, commission payments.
 * =================================================================================
 * Spark-native (firestoreAdmin via adminApi fallback). All financial actions
 * are audit-logged with before/after balances.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Search, Wallet as WalletIcon, TrendingUp } from 'lucide-react';
import { adminApi } from '../../../lib/adminApi';
import { useToast } from '../../../context/ToastContext';

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-2xl bg-slate-950/70 border border-slate-800 p-4 ${className}`}>{children}</div>
);
const Empty: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-xs text-slate-500 py-6 text-center">{text}</p>
);
const inputCls = 'w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-sm text-slate-200 outline-none focus:ring-2 focus:ring-saffron-500';
const btnGhost = 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors';
const btnGreen = 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-500 transition-colors';
const btnRed = 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-red-600 text-white hover:bg-red-500 transition-colors';

const ConfirmDialog: React.FC<{ title: string; body: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }> = (
  { title, body, confirmLabel, onConfirm, onCancel }
) => (
  <div className="fixed inset-0 z-[70] bg-black/70 flex items-end sm:items-center justify-center" onClick={onCancel}>
    <div className="bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
      <h3 className="font-black text-slate-100 mb-2">{title}</h3>
      <p className="text-xs text-slate-400 mb-4 whitespace-pre-wrap">{body}</p>
      <div className="flex gap-2">
        <button type="button" onClick={onConfirm} className={`${btnRed} flex-1`}>{confirmLabel}</button>
        <button type="button" onClick={onCancel} className={`${btnGhost} flex-1`}>Cancel</button>
      </div>
    </div>
  </div>
);

/* ------------------------------ Top-ups ------------------------------ */

export const TopupsTab: React.FC = () => {
  const { showToast } = useToast();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ id: string; amount: number; currency: string } | null>(null);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const r = await adminApi.topupQueue('pending');
    if (r.ok) setClaims((r.data as any)?.claims || []);
    else showToast(r.error || 'Load failed.', 'error');
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const approve = async () => {
    if (!confirm) return;
    const r = await adminApi.topupApprove(confirm.id);
    setConfirm(null);
    if (r.ok) { showToast(`Wallet credited. New balance: ${(r.data as any)?.balanceAfter}`, 'success'); load(); }
    else showToast(r.error || 'Approve failed.', 'error');
  };
  const reject = async () => {
    if (!rejectFor || !rejectReason.trim()) { showToast('Give a reason.', 'error'); return; }
    const r = await adminApi.topupReject(rejectFor, rejectReason.trim());
    setRejectFor(null); setRejectReason('');
    if (r.ok) { showToast('Claim rejected.', 'success'); load(); }
    else showToast(r.error || 'Reject failed.', 'error');
  };

  if (loading) return <p className="text-xs text-slate-500 py-8 text-center"><RefreshCw className="w-4 h-4 animate-spin inline" /> Loading…</p>;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Pending top-ups ({claims.length})</p>
        <button type="button" onClick={load} className={btnGhost}><RefreshCw className="w-4 h-4" /></button>
      </div>
      {claims.length === 0 ? <Empty text="No pending top-up requests." /> : claims.map((c) => (
        <Card key={c.id}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-100">{c.currency} {Number(c.amount).toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-slate-400 font-mono truncate">TrxID: {c.trxId}</p>
              <p className="text-[11px] text-slate-500">via {c.paymentMethodId} · {c.createdAt?.slice(0, 10)}</p>
              <p className="text-[10px] text-slate-600 font-mono truncate">user: {c.uid}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => setConfirm({ id: c.id, amount: c.amount, currency: c.currency })}
              className={`${btnGreen} flex-1`}><CheckCircle2 className="w-4 h-4 inline mr-1" />Verify & credit</button>
            <button type="button" onClick={() => setRejectFor(c.id)} className={`${btnRed} flex-1`}><XCircle className="w-4 h-4 inline mr-1" />Reject</button>
          </div>
        </Card>
      ))}
      {confirm && (
        <ConfirmDialog title="Verify & credit wallet?"
          body={`Verify the ${confirm.currency} ${confirm.amount} payment in your bKash / bank / Wise app FIRST, then confirm.\n\nThis credits the user's wallet immediately and is audit-logged.`}
          confirmLabel="Verified — credit wallet" onConfirm={approve} onCancel={() => setConfirm(null)} />
      )}
      {rejectFor && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-end sm:items-center justify-center" onClick={() => setRejectFor(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black text-slate-100 mb-3">Reject top-up</h3>
            <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className={inputCls} placeholder="Reason (shown to user)" maxLength={500} />
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={reject} className={`${btnRed} flex-1`}>Reject</button>
              <button type="button" onClick={() => setRejectFor(null)} className={`${btnGhost} flex-1`}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------ Wallets ------------------------------ */

export const WalletsTab: React.FC = () => {
  const { showToast } = useToast();
  const [uid, setUid] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [confirmAdj, setConfirmAdj] = useState(false);

  const lookup = async () => {
    if (!uid.trim()) { showToast('Enter a user UID.', 'error'); return; }
    setLoading(true);
    const r = await adminApi.walletLookup(uid.trim());
    setLoading(false);
    if (r.ok) setResult((r.data as any));
    else showToast(r.error || 'Lookup failed.', 'error');
  };

  const adjust = async () => {
    const delta = Math.round(Number(adjAmount));
    if (!delta || !adjReason.trim()) { showToast('Amount and reason are required.', 'error'); return; }
    const r = await adminApi.walletAdjust(uid.trim(), delta, adjReason.trim());
    setConfirmAdj(false); setAdjAmount(''); setAdjReason('');
    if (r.ok) { showToast(`Adjusted. New balance: ${(r.data as any)?.balanceAfter}`, 'success'); lookup(); }
    else showToast(r.error || 'Adjustment failed.', 'error');
  };

  const w = result?.wallet;
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={uid} onChange={(e) => setUid(e.target.value)} className={inputCls} placeholder="User UID" />
        <button type="button" onClick={lookup} className={btnGhost}><Search className="w-4 h-4" /></button>
      </div>
      {loading && <p className="text-xs text-slate-500 text-center py-4"><RefreshCw className="w-4 h-4 animate-spin inline" /></p>}
      {result && (
        <>
          <Card>
            <p className="text-xs font-black text-slate-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <WalletIcon className="w-4 h-4" /> Wallet
            </p>
            {w ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><p className="text-slate-500">Balance</p><p className="font-black text-slate-100 text-base">{w.currency} {Number(w.balance || 0).toLocaleString('en-IN')}</p></div>
                <div><p className="text-slate-500">Topped up</p><p className="font-bold text-slate-200">{Number(w.totalToppedUp || 0).toLocaleString('en-IN')}</p></div>
                <div><p className="text-slate-500">Spent</p><p className="font-bold text-slate-200">{Number(w.totalSpent || 0).toLocaleString('en-IN')}</p></div>
                <div><p className="text-slate-500">Received</p><p className="font-bold text-slate-200">{Number(w.totalReceived || 0).toLocaleString('en-IN')}</p></div>
              </div>
            ) : <Empty text="No wallet yet (created on first approved top-up)." />}
            {result.user && <p className="text-[10px] text-slate-600 mt-2 font-mono">{result.user.email || result.user.displayName || ''}</p>}
          </Card>
          <Card>
            <p className="text-xs font-black text-slate-300 uppercase tracking-widest mb-2">Manual adjustment</p>
            <div className="flex gap-2">
              <input type="number" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} className={inputCls} placeholder="+500 / -200" />
            </div>
            <input value={adjReason} onChange={(e) => setAdjReason(e.target.value)} className={`${inputCls} mt-2`} placeholder="Reason (audit-logged)" maxLength={300} />
            <button type="button" onClick={() => setConfirmAdj(true)} className={`${btnGhost} w-full mt-2`}>Apply adjustment</button>
          </Card>
          <Card>
            <p className="text-xs font-black text-slate-300 uppercase tracking-widest mb-2">Ledger ({(result.txns || []).length})</p>
            {(result.txns || []).length === 0 ? <Empty text="No transactions." /> : (
              <div className="divide-y divide-slate-800">
                {(result.txns || []).map((t: any) => (
                  <div key={t.id} className="flex justify-between py-2 text-xs">
                    <div><p className="font-bold text-slate-200">{t.type}</p><p className="text-[10px] text-slate-500">{t.note || ''}</p></div>
                    <p className={`font-black ${['spend', 'commission'].includes(t.type) ? 'text-red-400' : 'text-emerald-400'}`}>
                      {['spend', 'commission'].includes(t.type) ? '−' : '+'}{Number(t.amount || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
      {confirmAdj && (
        <ConfirmDialog title="Apply wallet adjustment?"
          body={`Adjust ${uid} by ${adjAmount}.\nReason: ${adjReason}\n\nThis is audit-logged with before/after balances.`}
          confirmLabel="Apply" onConfirm={adjust} onCancel={() => setConfirmAdj(false)} />
      )}
    </div>
  );
};

/* --------------------------- Commissions (Path B) --------------------------- */

export const CommissionsTab: React.FC = () => {
  const { showToast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, r] = await Promise.all([adminApi.commissionPaymentsQueue('pending'), adminApi.platformRevenueStats()]);
    if (p.ok) setPayments((p.data as any)?.payments || []);
    if (r.ok) setRevenue((r.data as any));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const confirmPay = async () => {
    if (!confirm) return;
    const r = await adminApi.commissionPaymentConfirm(confirm.id);
    setConfirm(null);
    if (r.ok) { showToast('Commission confirmed — order completed.', 'success'); load(); }
    else showToast(r.error || 'Confirm failed.', 'error');
  };

  if (loading) return <p className="text-xs text-slate-500 py-8 text-center"><RefreshCw className="w-4 h-4 animate-spin inline" /> Loading…</p>;
  return (
    <div className="space-y-4">
      <Card className="border-saffron-500/30">
        <p className="text-xs font-black text-slate-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-saffron-400" /> Platform revenue
        </p>
        {revenue ? (
          <div className="flex flex-wrap gap-3">
            {Object.entries((revenue.totals || {}) as Record<string, number>).map(([c, v]) => (
              <div key={c}><p className="text-[10px] text-slate-500">{c}</p><p className="font-black text-slate-100">{Number(v).toLocaleString('en-IN')}</p></div>
            ))}
            {Object.keys(revenue.totals || {}).length === 0 && <p className="text-xs text-slate-500">No revenue recorded yet.</p>}
          </div>
        ) : <Empty text="Could not load revenue." />}
      </Card>

      <div>
        <p className="text-xs font-black text-slate-300 uppercase tracking-widest mb-2">Pending commission payments ({payments.length})</p>
        {payments.length === 0 ? <Empty text="No pending commission payments." /> : payments.map((p) => (
          <Card key={p.id} className="mb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-100">{p.currency} {Number(p.amount).toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-slate-400 font-mono truncate">TrxID: {p.trxId}</p>
                <p className="text-[11px] text-slate-500">via {p.paymentMethodId} · paid by {p.payerRole}</p>
                <p className="text-[10px] text-slate-600 font-mono truncate">order: {p.orderId}</p>
              </div>
            </div>
            <button type="button" onClick={() => setConfirm(p)} className={`${btnGreen} w-full mt-3`}>
              <CheckCircle2 className="w-4 h-4 inline mr-1" />Verify & confirm
            </button>
          </Card>
        ))}
      </div>
      {confirm && (
        <ConfirmDialog title="Verify & confirm commission?"
          body={`Verify the ${confirm.currency} ${confirm.amount} payment in your bKash / bank / Wise app FIRST.\n\nConfirming completes order ${confirm.orderId} and unlocks reviews.`}
          confirmLabel="Verified — complete order" onConfirm={confirmPay} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
};
