import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSoloStore, type GivingRecord } from './soloStore';
import { Card, Stat, T, Btn, useLocaleText } from './ui';
import { ReceiptModal } from './ShareReceipt';
import { openDanaSheet } from '../lib/danaSheet';
import {
  groupGivingByPeriod,
  receiptStatus,
  type PeriodMode,
} from './receipts';

/* ReceiptsView — "🧾 My giving & receipts" (QUEUED #30, solo Home door).
 * =====================================================================
 * The devotee's own giving, gathered for tax time and trustee proof.
 * TRUTHFUL SCOPE: this reads ONLY the personal solo ledger (per-uid,
 * on-device). Official 80G certificates are issued by each organisation's
 * treasury and are not addressable from a solo account — so a record with
 * a receipt number opens the devotee's personal receipt copy (ReceiptModal,
 * the same viewer GivingTab uses), and a record without one says so
 * plainly. Nothing here fabricates an 80G document.
 */

export const ReceiptsView: React.FC = () => {
  const { state } = useSoloStore();
  const { tr } = useLocaleText();
  const navigate = useNavigate();
  const [mode, setMode] = useState<PeriodMode>('fy');
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [viewReceipt, setViewReceipt] = useState<GivingRecord | null>(null);

  const periods = useMemo(() => groupGivingByPeriod(state.giving, mode), [state.giving, mode]);
  const active = periods.find((p) => p.key === selectedKey) || periods[0] || null;

  const pickMode = (m: PeriodMode) => {
    setMode(m);
    setSelectedKey('');
  };

  /* ---- Empty state: no giving recorded at all — warm, with doors. ---- */
  if (periods.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="text-center !py-10">
          <div className="text-5xl mb-3" aria-hidden>🧾</div>
          <h2 className="text-lg font-extrabold text-stone-900">
            <T en="Your dana will gather here" bn="আপনার দান এখানে জমা হবে" hi="आपका दान यहाँ एकत्र होगा" />
          </h2>
          <p className="text-sm text-stone-500 mt-2 max-w-md mx-auto">
            {tr(
              'solo.receipts.emptySub',
              'Every offering you make or record becomes your personal receipt — ready when tax time comes or a trustee asks for proof.',
              'আপনার প্রতিটি দান বা সংরক্ষিত অর্থ এখানে আপনার ব্যক্তিগত রসিদ হয়ে থাকবে — করের সময় বা ট্রাস্টি প্রমাণ চাইলে প্রস্তুত।',
              'आपकी हर भेंट या दर्ज दान यहाँ आपकी निजी रसीद बनेगा — कर के समय या ट्रस्टी के प्रमाण माँगने पर तैयार।'
            )}
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            <Btn onClick={() => openDanaSheet({})}>
              🪔 <T en="Offer dana" bn="দান দিন" hi="दान दें" />
            </Btn>
            <Btn variant="ghost" onClick={() => navigate('/app/orgs')}>
              🏛️ <T en="Explore organisations" bn="সংগঠন দেখুন" hi="संगठन देखें" />
            </Btn>
            <Btn variant="ghost" onClick={() => navigate('/app/home/marketplace')}>
              🪔 <T en="Browse sevas" bn="সেবা দেখুন" hi="सेवाएँ देखें" />
            </Btn>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Honest scope line — personal copies, org treasuries issue the 80G. */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-900">
        {tr(
          'solo.receipts.scope',
          '🧾 These are your personal giving records. Official 80G certificates are issued by each organisation’s treasury — where a receipt number is recorded below, it is the number that organisation gave you.',
          '🧾 এগুলি আপনার ব্যক্তিগত দানের রেকর্ড। অফিসিয়াল 80G সার্টিফিকেট প্রতিটি সংগঠনের কোষাগার থেকে দেওয়া হয় — নিচে যেখানে রসিদ নম্বর আছে, সেটি সেই সংগঠনের দেওয়া নম্বর।',
          '🧾 ये आपके निजी दान रिकॉर्ड हैं। आधिकारिक 80G प्रमाणपत्र प्रत्येक संगठन के कोषागार से जारी होता है — नीचे जहाँ रसीद संख्या दर्ज है, वह उसी संगठन की दी हुई संख्या है।'
        )}
      </div>

      {/* Period mode toggle — donors think in financial years at tax time. */}
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label={tr('solo.receipts.periodAria', 'Giving period', 'দানের সময়কাল', 'दान अवधि')}>
        {(
          [
            ['fy', 'Financial year (Apr–Mar)', 'আর্থিক বছর (এপ্রিল–মার্চ)', 'वित्तीय वर्ष (अप्रै–मार्च)'],
            ['cy', 'Calendar year', 'ক্যালেন্ডার বছর', 'कैलेंडर वर्ष'],
          ] as Array<[PeriodMode, string, string, string]>
        ).map(([m, en, bn, hi]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => pickMode(m)}
            className={`px-4 py-2 rounded-xl text-xs font-bold min-h-[44px] transition-colors ${
              mode === m ? 'bg-amber-500 text-white shadow-sm' : 'bg-white border border-amber-200 text-stone-600 hover:border-amber-400'
            }`}
          >
            <T en={en} bn={bn} hi={hi} />
          </button>
        ))}
      </div>

      {/* Period picker chips (only periods that actually have giving). */}
      {periods.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {periods.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setSelectedKey(p.key)}
              aria-current={active?.key === p.key ? 'true' : undefined}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap min-h-[44px] transition-colors ${
                active?.key === p.key ? 'bg-stone-800 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'
              }`}
            >
              {p.label} · ₹{p.total.toLocaleString('en-IN')}
            </button>
          ))}
        </div>
      )}

      {active && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat
              label={<T en="Given" bn="দান" hi="दान" />}
              value={`₹${active.total.toLocaleString('en-IN')}`}
              sub={active.label}
              tone="amber"
            />
            <Stat
              label={<T en="Offerings" bn="দানের সংখ্যা" hi="भेंटें" />}
              value={active.count}
              sub={
                active.withReceiptNo > 0 ? (
                  <T
                    en={`${active.withReceiptNo} with receipt no.`}
                    bn={`${active.withReceiptNo}টির রসিদ নং আছে`}
                    hi={`${active.withReceiptNo} पर रसीद सं.`}
                  />
                ) : (
                  <T en="no receipt numbers yet" bn="এখনও রসিদ নম্বর নেই" hi="अभी रसीद संख्या नहीं" />
                )
              }
              tone="emerald"
            />
          </div>

          <Card>
            <h2 className="text-lg font-extrabold text-stone-900 mb-3">
              <T en="Receipts" bn="রসিদ" hi="रसीदें" /> · {active.label}
            </h2>
            <ul className="space-y-1">
              {active.records.map((g) => {
                const status = receiptStatus(g);
                return (
                  <li key={g.id} className="py-3 border-b border-stone-50 last:border-b-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-11 h-11 bg-amber-50 border border-amber-100 flex flex-col items-center justify-center rounded-xl shrink-0">
                          <span className="text-[9px] font-bold text-amber-600 uppercase">
                            {new Date(`${g.date}T00:00:00`).toLocaleString('default', { month: 'short' })}
                          </span>
                          <span className="text-sm font-extrabold text-stone-900 leading-none">
                            {new Date(`${g.date}T00:00:00`).getDate()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-stone-800 truncate">{g.orgName}</p>
                          {g.purpose && <p className="text-xs text-stone-500 truncate">{g.purpose}</p>}
                          <p className="text-[11px] text-stone-400 mt-0.5">{g.date}</p>
                        </div>
                      </div>
                      <b className="text-amber-800 shrink-0">₹{g.amount.toLocaleString('en-IN')}</b>
                    </div>
                    {status === 'recorded' ? (
                      <div className="flex flex-wrap items-center gap-2 mt-2 pl-14">
                        <span className="inline-block text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                          {tr('solo.receipts.receiptNo', 'Receipt no.', 'রসিদ নং', 'रसीद सं.')} {g.receiptNo}
                        </span>
                        <button
                          type="button"
                          onClick={() => setViewReceipt(g)}
                          className="text-[11px] font-bold text-amber-700 hover:underline px-2 py-1 min-h-[44px]"
                        >
                          🧾 <T en="View my receipt copy" bn="আমার রসিদের কপি দেখুন" hi="मेरी रसीद प्रति देखें" />
                        </button>
                        <span className="text-[11px] text-stone-400">
                          {tr(
                            'solo.receipts.issuedNote',
                            'Official 80G certificate is issued by this organisation’s treasury.',
                            'অফিসিয়াল 80G সার্টিফিকেট এই সংগঠনের কোষাগার থেকে দেওয়া হয়।',
                            'आधिकारिक 80G प्रमाणपत्र इस संगठन के कोषागार से जारी होता है।'
                          )}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-stone-400 mt-2 pl-14">
                        {tr(
                          'solo.receipts.noReceipt',
                          'No receipt number recorded for this offering. If the organisation issued one, you can add its number from the Giving tab.',
                          'এই দানের জন্য রসিদ নম্বর সংরক্ষিত নেই। সংগঠন রসিদ দিয়ে থাকলে, Giving ট্যাব থেকে নম্বরটি যোগ করতে পারেন।',
                          'इस भेंट की रसीद संख्या दर्ज नहीं है। यदि संगठन ने रसीद दी हो, तो Giving टैब से उसकी संख्या जोड़ सकते हैं।'
                        )}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-2 mt-4">
              <Btn variant="ghost" onClick={() => navigate('/app/home/giving')}>
                🪔 <T en="Open my giving ledger" bn="আমার দানের খাতা খুলুন" hi="मेरा दान-खाता खोलें" />
              </Btn>
            </div>
          </Card>
        </>
      )}

      {/* Personal receipt copy — the existing in-app viewer (ShareReceipt). */}
      {viewReceipt && <ReceiptModal record={viewReceipt} onClose={() => setViewReceipt(null)} />}
    </div>
  );
};
