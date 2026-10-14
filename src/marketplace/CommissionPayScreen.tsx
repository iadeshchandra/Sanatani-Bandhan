/**
 * CommissionPayScreen — Path B: post-task direct payment, commission to platform.
 * The client/provider pays the 12% commission to the PLATFORM's geo-based
 * payment method. Order stays "awaiting_commission" (incomplete) until the
 * owner confirms the payment.
 */
import React, { useState, useEffect } from 'react';
import { Copy, ChevronLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Card, Btn, Field, inputCls } from '../solo/ui';
import { fileCommissionPayment, fmtWallet, type WalletCurrency } from '../lib/wallet';
import { detectPayRegion, type PayRegion } from '../lib/geoDetect';
import { getPaymentMethods, methodsForRegion, type PaymentMethodDoc } from '../lib/paymentMethods';

/** INTL: Payoneer primary, Wise fallback (BD founder Wise eligibility). */
const orderMethods = (list: PaymentMethodDoc[]): PaymentMethodDoc[] =>
  [...list].sort((a, b) => (a.id === 'intl_payoneer' ? -1 : b.id === 'intl_payoneer' ? 1 : 0));

interface Props {
  orderId: string;
  orderCode: string;
  commissionAmount: number;
  currency: WalletCurrency;
  onDone: () => void;
  onBack: () => void;
}

const btnG = 'px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold bg-stone-100 text-stone-700';

export const CommissionPayScreen: React.FC<Props> = ({ orderId, orderCode, commissionAmount, currency, onDone, onBack }) => {
  const { showToast } = useToast();
  const [region, setRegion] = useState<PayRegion>('BD');
  const [methods, setMethods] = useState<PaymentMethodDoc[]>([]);
  const [methodId, setMethodId] = useState('');
  const [trxId, setTrxId] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    detectPayRegion().then((r) => {
      setRegion(r);
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
  const copy = (t: string) => { navigator.clipboard?.writeText(t).catch(() => {}); showToast('Copied.', 'success'); };

  const submit = async () => {
    if (!methodId) { showToast('Choose a payment method.', 'error'); return; }
    if (!trxId.trim()) { showToast('Enter the transaction ID.', 'error'); return; }
    setWorking(true);
    try {
      await fileCommissionPayment({
        orderId, amount: commissionAmount, currency,
        paymentMethodId: methodId, trxId: trxId.trim(),
      });
      showToast('Seva contribution submitted! The seva completes after verification.', 'success');
      onDone();
    } catch (e: any) { showToast(e.message || 'Submission failed.', 'error'); }
    setWorking(false);
  };

  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className={btnG}><ChevronLeft className="w-4 h-4 inline" /> Back</button>

      <Card className="border-amber-300 bg-amber-50">
        <p className="text-xs font-black text-amber-900 flex items-center gap-1.5 mb-1">
          <AlertTriangle className="w-4 h-4" /> Seva contribution pending — seva incomplete
        </p>
        <p className="text-[11px] text-amber-800">
          Offer the seva contribution below. The seva completes and ashirvad unlock after verification.
        </p>
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-amber-200">
          <span className="text-xs font-bold text-amber-800">Seva contribution</span>
          <span className="text-xl font-black text-amber-900">{fmtWallet(commissionAmount, currency)}</span>
        </div>
        <button type="button" onClick={() => copy(orderCode)}
          className="mt-2 flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-amber-200 min-h-[44px]">
          <span className="text-[11px] text-stone-500">Order ref:</span>
          <span className="font-mono font-black text-stone-900">{orderCode}</span>
          <Copy className="w-4 h-4 text-stone-400" />
        </button>
        <p className="text-[10px] text-amber-700 mt-1">Enter this order reference in the payment note field.</p>
      </Card>

      <Card>
        <div className="flex gap-1.5 mb-3">
          {(['BD', 'IN', 'INTL'] as const).map((r) => (
            <button key={r} type="button" onClick={() => switchRegion(r)}
              className={`px-3 py-2 rounded-lg text-[11px] font-black min-h-[44px] ${region === r ? 'bg-amber-500 text-stone-950' : 'bg-stone-100 text-stone-600'}`}>
              {r === 'BD' ? '🇧🇩 BD' : r === 'IN' ? '🇮🇳 India' : '🌍 Intl'}
            </button>
          ))}
        </div>
        <Field label="Platform payment method">
          <select value={methodId} onChange={(e) => setMethodId(e.target.value)} className={inputCls}>
            {methods.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </Field>
      </Card>

      {method && (
        <Card>
          <p className="text-xs font-black text-stone-800 mb-2">{method.label}</p>
          {method.qrImageUrl && (
            <img src={method.qrImageUrl} alt="Platform payment QR" className="w-44 h-44 mx-auto rounded-xl border mb-2"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          {method.number && (
            <button type="button" onClick={() => copy(method.number!)} className="flex items-center gap-2 mx-auto mb-2 px-3 py-2 bg-stone-50 rounded-xl border min-h-[44px]">
              <span className="font-mono font-black">{method.number}</span><Copy className="w-4 h-4 text-stone-400" />
            </button>
          )}
          {method.upiId && (
            <button type="button" onClick={() => copy(method.upiId!)} className="flex items-center gap-2 mx-auto mb-2 px-3 py-2 bg-stone-50 rounded-xl border min-h-[44px]">
              <span className="font-mono font-black">{method.upiId}</span><Copy className="w-4 h-4 text-stone-400" />
            </button>
          )}
          {method.link && <a href={method.link} target="_blank" rel="noreferrer" className="block text-center text-xs font-black text-amber-700 underline py-3">Open {method.label} →</a>}
          <p className="text-[11px] text-stone-600 text-center">Pay exactly <b>{fmtWallet(commissionAmount, currency)}</b> and put <b className="font-mono">{orderCode}</b> in the reference/note.</p>
        </Card>
      )}

      <Card>
        <Field label="Transaction / reference ID*">
          <input value={trxId} onChange={(e) => setTrxId(e.target.value)} className={inputCls} placeholder="e.g. TRX9F8K2P" />
        </Field>
        <Btn variant="primary" className="w-full min-h-[48px]" disabled={working} onClick={submit}>
          <CheckCircle2 className="w-4 h-4 inline mr-1" /> {working ? 'Submitting…' : 'Submit seva contribution'}
        </Btn>
      </Card>
    </div>
  );
};
