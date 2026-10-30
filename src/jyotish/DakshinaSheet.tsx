/**
 * jyotish/DakshinaSheet.tsx — "Send dakshina 🙏" for completed consultations.
 * ============================================================================
 * Devotee taps → amount + currency sheet → confirm → a proper rail-1
 * marketplace order is created and linked to the consultation.
 *
 * Dakshina language throughout: gratitude, never a paywall.
 * Never auto-charges — the devotee always taps to send.
 * Dedupe: one consultation → one dakshina order (guarded in
 * dakshinaBridge.canSendDakshina + a live order query).
 */
import React, { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { formatMoney } from '../lib/money';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import type { Consultation } from '../types/jyotish';
import { friendlyErrorText } from '../lib/friendlyError';
import {
  canSendDakshina,
  defaultDakshinaAmount,
  validateDakshinaAmount,
  dakshinaSummary,
  DAKSHINA_COPY,
  toDakshinaLang,
} from './dakshinaBridge';
import {
  createConsultationDakshinaOrder,
  defaultDakshinaCurrency,
} from './dakshinaOrders';
import { Btn } from './ui';

const CURRENCIES = [
  { code: 'BDT', symbol: '৳', label: 'BDT (৳)' },
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
];

export const DakshinaButton: React.FC<{ consultation: Consultation }> = ({ consultation }) => {
  const { language } = useLanguage();
  const { showToast } = useToast();
  const copy = DAKSHINA_COPY[toDakshinaLang(language)];
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [busy, setBusy] = useState(false);
  const [sentOrderId, setSentOrderId] = useState<string | null>(null);
  const [elig, setElig] = useState(() =>
    canSendDakshina(consultation, auth.currentUser?.uid),
  );

  // Refresh eligibility when the sheet opens (consultation may have updated).
  useEffect(() => {
    if (open) {
      setElig(canSendDakshina(consultation, auth.currentUser?.uid));
      setAmount(defaultDakshinaAmount(consultation));
      defaultDakshinaCurrency().then(setCurrency).catch(() => {});
    }
  }, [open, consultation]);

  // Already has a dakshina order — show the recorded state.
  const alreadySent =
    (consultation as Consultation & { dakshinaOrderId?: string }).dakshinaOrderId || sentOrderId;
  if (alreadySent) {
    return (
      <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 min-h-[44px]">
        ✓ {copy.sent}
      </span>
    );
  }
  if (!elig.ok) return null;

  const validation = validateDakshinaAmount(amount);
  const canConfirm = validation.ok && !busy;

  const send = async () => {
    if (!canConfirm || !validation.amount) return;
    setBusy(true);
    try {
      const orderId = await createConsultationDakshinaOrder(consultation, validation.amount, currency);
      setSentOrderId(orderId);
      setOpen(false);
      showToast(`${copy.sent} ${copy.sentSub}`, 'success');
    } catch (e: any) {
      console.error(e);
      showToast(friendlyErrorText(e, language, 'save'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Btn onClick={() => setOpen(true)}>{copy.sendDakshina}</Btn>
      {open && (
        <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm"
            onClick={() => !busy && setOpen(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-black text-stone-900 text-lg">🙏 {copy.sheetTitle}</h3>
            <p className="text-sm text-stone-600">{copy.sheetSub}</p>

            <div>
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                {copy.amountLabel}
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="51"
                className="mt-1 w-full px-4 py-3 rounded-2xl border border-stone-300 text-lg font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                {copy.currencyLabel}
              </label>
              <div className="mt-1 flex gap-2">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setCurrency(c.code)}
                    className={`flex-1 px-3 py-3 rounded-2xl text-sm font-bold border min-h-[44px] transition ${
                      currency === c.code
                        ? 'bg-amber-100 border-amber-400 text-amber-900'
                        : 'bg-white border-stone-200 text-stone-600'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {validation.ok && validation.amount && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                <span className="text-xl font-black text-amber-900">
                  {dakshinaSummary(validation.amount, currency)}
                </span>
                <p className="text-[11px] text-amber-700 mt-1">
                  {consultation.assignedJyotishName
                    ? `for ${consultation.assignedJyotishName}`
                    : ''}{' '}
                  · {copy.directNote}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Btn onClick={send} disabled={!canConfirm} className="flex-1">
                {busy ? copy.sending : copy.confirm}
              </Btn>
              <Btn variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                {copy.cancel}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
