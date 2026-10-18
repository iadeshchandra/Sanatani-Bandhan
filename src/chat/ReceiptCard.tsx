/* Seva Bazar Phase 2 — token-advance receipt card (chat message).
 * =====================================================================
 * The WhatsApp receipt-as-invoice, formalized: the devotee's advance
 * proof rendered as a calm card in the thread. The provider's
 * "Received ✓" is a human handshake — it sends a warm confirmation
 * message and moves the order paid → accepted (existing rail2
 * lifecycle). Chat messages are immutable by rules, so the card
 * itself never mutates; it reads the order's live status instead.
 */

import React from 'react';
import type { ReceiptMeta } from './types';
import { T } from '../solo/ui';
import { getSevaBazarOrder } from '../lib/sevaBazarOrders';

export interface ReceiptCardProps {
  receipt: ReceiptMeta;
  /** The viewing user's uid — the "Received" button is provider-only. */
  viewerUid: string;
  /** Called when the provider taps "Received ✓". */
  onConfirm?: (receipt: ReceiptMeta) => void;
  confirming?: boolean;
}

function formatAmount(amount: number, currency: string): string {
  const n = Math.round(amount).toLocaleString('en-IN');
  if (currency === 'BDT') return `৳${n}`;
  if (currency === 'USD') return `$${n}`;
  return `₹${n}`;
}

const RAIL_LABEL: Record<string, { en: string; hi: string; bn: string }> = {
  upi: { en: 'UPI', hi: 'यूपीआई', bn: 'ইউপিআই' },
  bkash: { en: 'bKash', hi: 'बीकैश', bn: 'বিকাশ' },
  nagad: { en: 'Nagad', hi: 'नगद', bn: 'নগদ' },
  other: { en: 'Other', hi: 'अन्य', bn: 'অন্য' },
};

export const ReceiptCard: React.FC<ReceiptCardProps> = ({
  receipt,
  viewerUid,
  onConfirm,
  confirming,
}) => {
  const [orderStatus, setOrderStatus] = React.useState<string | null>(null);
  const isProvider = viewerUid === receipt.providerUid;

  React.useEffect(() => {
    let alive = true;
    getSevaBazarOrder(receipt.orderId)
      .then((o) => {
        if (alive) setOrderStatus(o?.status ?? null);
      })
      .catch(() => {
        if (alive) setOrderStatus(null);
      });
    return () => {
      alive = false;
    };
  }, [receipt.orderId]);

  const rail = RAIL_LABEL[receipt.rail] ?? RAIL_LABEL.other;
  // The handshake is live only while the advance awaits the provider's eyes.
  const canConfirm = isProvider && orderStatus === 'paid' && !!onConfirm;
  const confirmed = orderStatus !== null && orderStatus !== 'pending_payment' && orderStatus !== 'paid';

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5">
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-xl">
          🧾
        </span>
        <p className="text-sm font-extrabold text-amber-900">
          <T en="Token advance receipt" hi="टोकन अग्रिम रसीद" bn="টোকেন অগ্রিম রসিদ" />
        </p>
      </div>

      <div className="mt-2.5 space-y-1 text-sm">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-stone-500 text-xs">
            <T en="Advance" hi="अग्रिम" bn="অগ্রিম" />
          </span>
          <span className="font-black text-stone-800 tabular-nums">
            {formatAmount(receipt.amount, receipt.currency)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-stone-500 text-xs">
            <T en="Via" hi="माध्यम" bn="মাধ্যম" />
          </span>
          <span className="font-bold text-stone-700">
            <T en={rail.en} hi={rail.hi} bn={rail.bn} />
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-stone-500 text-xs">
            <T en="Reference" hi="संदर्भ" bn="রেফারেন্স" />
          </span>
          <span className="font-mono text-xs font-bold text-stone-700 break-all text-right">
            {receipt.trxId}
          </span>
        </div>
      </div>

      {confirmed ? (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
          <span aria-hidden>✓</span>
          <T
            en="Received — muhurat held 🪔"
            hi="प्राप्त — मुहूर्त सुरक्षित 🪔"
            bn="গৃহীত — মুহূর্ত সংরক্ষিত 🪔"
          />
        </p>
      ) : canConfirm ? (
        <button
          type="button"
          onClick={() => onConfirm?.(receipt)}
          disabled={!!confirming}
          className="mt-3 w-full min-h-[44px] rounded-xl bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-600 disabled:opacity-50 transition-colors"
        >
          {confirming ? (
            <T en="Confirming…" hi="पुष्टि हो रही…" bn="নিশ্চিত হচ্ছে…" />
          ) : (
            <T en="✓ Received — hold the muhurat" hi="✓ प्राप्त — मुहूर्त सुरक्षित करें" bn="✓ গৃহীত — মুহূর্ত ধরে রাখুন" />
          )}
        </button>
      ) : (
        <p className="mt-2.5 text-[11px] text-stone-500 leading-relaxed">
          <T
            en="The provider confirms receipt here — your muhurat is held once they tap Received ✓."
            hi="प्रदाता यहाँ प्राप्ति की पुष्टि करते हैं — उनके Received ✓ दबाते ही आपका मुहूर्त सुरक्षित।"
            bn="প্রদানকারী এখানে প্রাপ্তি নিশ্চিত করেন — তিনি Received ✓ চাপলেই আপনার মুহূর্ত সংরক্ষিত।"
          />
        </p>
      )}
    </div>
  );
};

export default ReceiptCard;
