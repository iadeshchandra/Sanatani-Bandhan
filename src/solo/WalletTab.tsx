/**
 * WalletTab — platform wallet for Solo users.
 * Balance + top-up (geo-based payment methods) + transaction history.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Wallet as WalletIcon, Plus, History, Copy, CheckCircle2, Clock, XCircle, RefreshCw, ChevronLeft } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Card, Btn, Field, inputCls, Empty, Modal } from './ui';
import {
  getWallet, getTransactions, fileTopupClaim, myTopupClaims, ensureWallet,
  currencyForRegion, fmtWallet, CURRENCY_SYMBOL,
  type Wallet, type WalletTransaction, type TopupClaim, type WalletCurrency,
} from '../lib/wallet';
import { detectPayRegion, type PayRegion } from '../lib/geoDetect';
import { getPaymentMethods, methodsForRegion, type PaymentMethodDoc } from '../lib/paymentMethods';
import { useLanguage } from '../context/LanguageContext';
import { mkt, type MktLang } from '../lib/marketplaceCopy';

/** INTL: Payoneer primary, Wise fallback (BD founder Wise eligibility). */
const orderMethods = (list: PaymentMethodDoc[]): PaymentMethodDoc[] =>
  [...list].sort((a, b) => (a.id === 'intl_payoneer' ? -1 : b.id === 'intl_payoneer' ? 1 : 0));

const btnG = 'px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold bg-stone-100 text-stone-700';

function TxnIcon({ type }: { type: string }) {
  if (type === 'topup') return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
  if (type === 'spend') return <WalletIcon className="w-4 h-4 text-amber-600" />;
  if (type === 'receive') return <CheckCircle2 className="w-4 h-4 text-sky-600" />;
  if (type === 'commission') return <WalletIcon className="w-4 h-4 text-purple-600" />;
  return <History className="w-4 h-4 text-stone-400" />;
}

const TXN_LABEL: Record<string, string> = {
  topup: 'Top-up', spend: 'Seva offering', receive: 'Dakshina received', commission: 'Seva contribution',
  refund: 'Refund', adjustment: 'Adjustment', topup_request: 'Top-up request',
};

const TopupFlow: React.FC<{ currency: WalletCurrency; onDone: () => void; onBack: () => void }> = ({ currency, onDone, onBack }) => {
  const { showToast } = useToast();
  const [region, setRegion] = useState<PayRegion>('BD');
  const [methods, setMethods] = useState<PaymentMethodDoc[]>([]);
  const [methodId, setMethodId] = useState('');
  const [amount, setAmount] = useState('');
  const [trxId, setTrxId] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    detectPayRegion().then((r) => {
      setRegion(r);
      setMethods([]); // refetch below
      getPaymentMethods().then((all) => {
        const list = orderMethods(methodsForRegion(all, r));
        setMethods(list);
        if (list[0]) setMethodId(list[0].id);
      });
    }).catch(() => {});
  }, []);

  const switchRegion = (r: PayRegion) => {
    setRegion(r);
    getPaymentMethods().then((all) => {
      const list = orderMethods(methodsForRegion(all, r));
      setMethods(list);
      if (list[0]) setMethodId(list[0].id);
    });
  };

  const method = methods.find((m) => m.id === methodId);
  const sym = CURRENCY_SYMBOL[currency];

  const submit = async () => {
    const amt = Math.round(Number(amount));
    if (!amt || amt <= 0) { showToast('Enter a valid amount.', 'error'); return; }
    if (!methodId) { showToast('Choose a payment method.', 'error'); return; }
    if (!trxId.trim()) { showToast('Enter the transaction ID from your payment app.', 'error'); return; }
    setWorking(true);
    try {
      await fileTopupClaim({ amount: amt, currency, paymentMethodId: methodId, trxId: trxId.trim() });
      showToast('Top-up request submitted! The owner will verify and credit your wallet.', 'success');
      onDone();
    } catch (e: any) { showToast(e.message || 'Submission failed.', 'error'); }
    setWorking(false);
  };

  const copy = (t: string) => { navigator.clipboard?.writeText(t).catch(() => {}); showToast('Copied.', 'success'); };

  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className={btnG}><ChevronLeft className="w-4 h-4 inline" /> Back</button>
      <Card>
        <p className="text-sm font-black text-stone-900 mb-3">Top up {sym} wallet</p>
        <div className="flex gap-1.5 mb-3">
          {(['BD', 'IN', 'INTL'] as const).map((r) => (
            <button key={r} type="button" onClick={() => switchRegion(r)}
              className={`px-3 py-2 rounded-lg text-[11px] font-black min-h-[44px] ${region === r ? 'bg-amber-500 text-stone-950' : 'bg-stone-100 text-stone-600'}`}>
              {r === 'BD' ? '🇧🇩 BD' : r === 'IN' ? '🇮🇳 India' : '🌍 Intl'}
            </button>
          ))}
        </div>
        <Field label="Amount">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-stone-500">{sym}</span>
            <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputCls} pl-8`} placeholder="500" />
          </div>
        </Field>
        <Field label="Payment method">
          <select value={methodId} onChange={(e) => setMethodId(e.target.value)} className={inputCls}>
            {methods.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </Field>
      </Card>
      {method && (
        <Card className="bg-amber-50/60 border-amber-200">
          <p className="text-xs font-black text-amber-900 mb-2">How to pay — {method.label}</p>
          {method.qrImageUrl && (
            <img src={method.qrImageUrl} alt="Payment QR" className="w-40 h-40 mx-auto rounded-xl border border-amber-200 mb-2"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          {method.number && (
            <button type="button" onClick={() => copy(method.number!)} className="flex items-center gap-2 mx-auto mb-2 px-3 py-2 bg-white rounded-xl border border-amber-200 min-h-[44px]">
              <span className="font-mono font-black text-stone-900">{method.number}</span><Copy className="w-4 h-4 text-stone-400" />
            </button>
          )}
          {method.upiId && (
            <button type="button" onClick={() => copy(method.upiId!)} className="flex items-center gap-2 mx-auto mb-2 px-3 py-2 bg-white rounded-xl border border-amber-200 min-h-[44px]">
              <span className="font-mono font-black text-stone-900">{method.upiId}</span><Copy className="w-4 h-4 text-stone-400" />
            </button>
          )}
          {method.link && (
            <a href={method.link} target="_blank" rel="noreferrer" className="block text-center text-xs font-black text-amber-700 underline mb-2 min-h-[44px] py-3">Open {method.label} →</a>
          )}
          <ol className="text-[11px] text-amber-900 space-y-1 list-decimal list-inside">
            {method.instructionsEn.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </Card>
      )}
      <Card>
        <Field label="Transaction / reference ID (from your payment app)*">
          <input value={trxId} onChange={(e) => setTrxId(e.target.value)} className={inputCls} placeholder="e.g. TRX9F8K2P" />
        </Field>
        <Btn variant="primary" className="w-full min-h-[48px]" disabled={working} onClick={submit}>
          {working ? 'Submitting…' : 'Submit top-up request'}
        </Btn>
        <p className="text-[10px] text-stone-400 mt-2 text-center">Your wallet is credited after the owner verifies the payment.</p>
      </Card>
    </div>
  );
};

export const WalletTab: React.FC = () => {
  const { showToast } = useToast();
  const { currentLang } = useLanguage();
  const L = (currentLang === 'bn' || currentLang === 'hi' ? currentLang : 'en') as MktLang;
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [claims, setClaims] = useState<TopupClaim[]>([]);
  const [region, setRegion] = useState<PayRegion>('BD');
  const [topping, setTopping] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await ensureWallet().catch(() => {});
      const [w, t, c, r] = await Promise.all([getWallet(), getTransactions(), myTopupClaims(), detectPayRegion().catch(() => 'BD' as PayRegion)]);
      setWallet(w); setTxns(t); setClaims(c); setRegion(r);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const currency: WalletCurrency = wallet && wallet.balance + wallet.totalToppedUp > 0 ? wallet.currency : currencyForRegion(region);

  if (topping) {
    return <TopupFlow currency={currency} onBack={() => setTopping(false)} onDone={() => { setTopping(false); load(); }} />;
  }

  return (
    <div className="space-y-3">
      <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-white/80 uppercase tracking-widest">{mkt(L, 'sevaWallet')}</p>
            <p className="text-3xl font-black mt-1">
              {loading ? '…' : fmtWallet(wallet?.balance || 0, currency)}
            </p>
            <p className="text-[11px] text-white/70 mt-1">
              {mkt(L, 'dakshinaBalance')}: {fmtWallet(wallet?.balance || 0, currency)}
            </p>
          </div>
          <WalletIcon className="w-10 h-10 text-white/60" />
        </div>
        <div className="flex gap-2 mt-4">
          <button type="button" onClick={() => setTopping(true)}
            className="flex-1 min-h-[48px] rounded-xl bg-white text-orange-700 font-black text-sm flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> {mkt(L, 'addToSevaWallet')}
          </button>
          <button type="button" onClick={load} className="min-h-[48px] px-4 rounded-xl bg-white/20 text-white font-bold">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </Card>

      {claims.filter((c) => c.status === 'pending').length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <p className="text-xs font-black text-amber-900 mb-2 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Pending top-ups</p>
          {claims.filter((c) => c.status === 'pending').map((c) => (
            <div key={c.id} className="flex justify-between text-xs py-1.5 border-t border-amber-100 first:border-0">
              <span className="font-bold text-stone-700">{fmtWallet(c.amount, c.currency)} · {c.trxId}</span>
              <span className="text-amber-700 font-bold">Awaiting verification</span>
            </div>
          ))}
        </Card>
      )}
      {claims.filter((c) => c.status === 'rejected').length > 0 && (
        <Card className="border-red-200 bg-red-50/60">
          <p className="text-xs font-black text-red-900 mb-1 flex items-center gap-1.5"><XCircle className="w-4 h-4" /> Rejected top-up</p>
          {claims.filter((c) => c.status === 'rejected').slice(0, 3).map((c) => (
            <p key={c.id} className="text-[11px] text-red-800">{fmtWallet(c.amount, c.currency)} — {c.rejectionReason || 'Not verified'}</p>
          ))}
        </Card>
      )}

      <Card>
        <p className="text-xs font-black text-stone-800 mb-2 uppercase tracking-widest">History</p>
        {txns.length === 0 ? <Empty text="No wallet activity yet." /> : (
          <div className="divide-y divide-stone-100">
            {txns.map((t) => (
              <div key={t.id} className="flex items-center gap-2.5 py-2.5">
                <TxnIcon type={t.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-stone-800 truncate">{TXN_LABEL[t.type] || t.type}{t.note ? ` · ${t.note}` : ''}</p>
                  <p className="text-[10px] text-stone-400">{t.topupClaimId ? 'Top-up claim' : t.orderId ? `Order ${String(t.orderId).slice(0, 8)}…` : ''}</p>
                </div>
                <p className={`text-xs font-black ${t.type === 'spend' || t.type === 'commission' ? 'text-red-600' : 'text-emerald-600'}`}>
                  {t.type === 'spend' || t.type === 'commission' ? '−' : '+'}{fmtWallet(t.amount, (t.currency as WalletCurrency) || currency)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
