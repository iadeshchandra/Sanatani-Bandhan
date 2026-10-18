import React, { useMemo, useState } from 'react';
import { useSoloStore, uid, todayISO, type GivingRecord } from './soloStore';
import { Card, Stat, T, Btn, Field, inputCls, Empty, useLocaleText } from './ui';
import { useToast } from '../context/ToastContext';
import { ExpressDanaSheet } from './ExpressDanaSheet';
import { ShareReceiptRow, ReceiptModal, RECEIPT_BLESSING, type ShareLang } from './ShareReceipt';

/* GivingTab — personal dana history across organisations.
 * ============================================================
 * One honest ledger of the user's giving: organisation, amount,
 * purpose, receipt number. Receipts issued by the organisation's
 * treasury remain the source of truth; this is the devotee's
 * personal copy. Device-local.
 */

export const GivingTab: React.FC = () => {
  const { state, add, remove } = useSoloStore();
  const { tr, lang } = useLocaleText();
  const { showToast } = useToast();
  const [form, setForm] = useState({ orgName: '', amount: '', purpose: '', receiptNo: '', date: todayISO() });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [againConfirm, setAgainConfirm] = useState(false);
  // Dana confirmation: the record just added, shown with its blessing +
  // multi-channel share row (dismissible; never auto-persists).
  const [justAdded, setJustAdded] = useState<GivingRecord | null>(null);
  // In-app receipt view for any history record (blessing + share row).
  const [viewReceipt, setViewReceipt] = useState<GivingRecord | null>(null);
  const shareLang: ShareLang = lang === 'bn' ? 'bn' : lang === 'hi' ? 'hi' : 'en';

  const total = state.giving.reduce((s, g) => s + g.amount, 0);
  const thisYear = new Date().getFullYear().toString();
  const yearTotal = state.giving.filter((g) => g.date.startsWith(thisYear)).reduce((s, g) => s + g.amount, 0);

  const lastDana = useMemo(
    () => (state.giving.length ? [...state.giving].sort((a, b) => b.createdAt - a.createdAt)[0] : null),
    [state.giving]
  );

  const repeatLast = () => {
    if (!lastDana) return;
    const rec: GivingRecord = {
      id: uid('g'),
      date: todayISO(),
      orgName: lastDana.orgName,
      amount: lastDana.amount,
      purpose: lastDana.purpose,
      createdAt: Date.now(),
    };
    add('giving', rec);
    setJustAdded(rec);
    setAgainConfirm(false);
    showToast(tr('solo.giving.added', 'Dana recorded — dhanyavaad', 'দান সংরক্ষিত — ধন্যবাদ', 'दान दर्ज — धन्यवाद'), 'success');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.orgName.trim() || !(amount > 0)) {
      showToast(tr('solo.giving.need', 'Enter organisation and amount', 'সংগঠন ও পরিমাণ দিন', 'संगठन और राशि दें'), 'warning');
      return;
    }
    const rec: GivingRecord = {
      id: uid('g'),
      date: form.date,
      orgName: form.orgName.trim(),
      amount,
      purpose: form.purpose.trim() || undefined,
      receiptNo: form.receiptNo.trim() || undefined,
      createdAt: Date.now(),
    };
    add('giving', rec);
    setJustAdded(rec);
    setForm({ orgName: '', amount: '', purpose: '', receiptNo: '', date: todayISO() });
    showToast(tr('solo.giving.added', 'Dana recorded — dhanyavaad', 'দান সংরক্ষিত — ধন্যবাদ', 'दान दर्ज — धन्यवाद'), 'success');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat
          label={<T en="Total dana" bn="মোট দান" hi="कुल दान" />}
          value={`₹${total.toLocaleString('en-IN')}`}
          sub={<T en="all time" bn="সর্বকাল" hi="सदैव" />}
          tone="amber"
        />
        <Stat
          label={<T en="This year" bn="এই বছর" hi="इस वर्ष" />}
          value={`₹${yearTotal.toLocaleString('en-IN')}`}
          sub={<T en={thisYear} bn={thisYear} hi={thisYear} />}
          tone="emerald"
        />
      </div>

      <Btn onClick={() => setSheetOpen(true)} className="w-full !py-3.5 !text-base shadow-sm">
        🪔 <T en="Offer dana" bn="দান দিন" hi="दान दें" />
      </Btn>

      {/* Dana confirmation — blessing + multi-channel receipt share. */}
      {justAdded && (
        <Card className="!border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="text-lg font-extrabold text-stone-900">
                <T en="Dhanyavaad 🙏 — dana recorded" bn="ধন্যবাদ 🙏 — দান সংরক্ষিত" hi="धन्यवाद 🙏 — दान दर्ज" />
              </div>
              <div className="text-sm text-stone-600 mt-0.5">
                ₹{justAdded.amount.toLocaleString('en-IN')} · {justAdded.orgName}
                {justAdded.purpose && <span className="text-stone-500"> · {justAdded.purpose}</span>}
              </div>
              <p className="text-sm italic text-amber-800 mt-1.5">{RECEIPT_BLESSING[shareLang]}</p>
            </div>
            <button
              onClick={() => setJustAdded(null)}
              className="text-xs text-stone-400 hover:text-stone-700 px-2 py-1 min-h-[32px]"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
          <ShareReceiptRow record={justAdded} />
        </Card>
      )}

      {lastDana && (
        <Card className="!border-amber-300 bg-gradient-to-br from-amber-50 to-white">
          {!againConfirm ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-widest text-amber-700">
                  <T en="Your last offering" bn="আপনার শেষ দান" hi="आपकी पिछली भेंट" />
                </div>
                <div className="text-sm font-bold text-stone-800 truncate mt-1">
                  ₹{lastDana.amount.toLocaleString('en-IN')} · {lastDana.orgName}
                  <span className="text-stone-400 font-normal"> · {lastDana.date}</span>
                </div>
              </div>
              <Btn onClick={() => setAgainConfirm(true)} className="shrink-0">
                🙏 <T en="Give again" bn="আবার দিন" hi="फिर से दें" />
              </Btn>
            </div>
          ) : (
            <div>
              <p className="text-sm font-bold text-stone-800 mb-3">
                {tr(
                  'solo.dana.giveAgainLine',
                  `Offer ₹${lastDana.amount.toLocaleString('en-IN')} to ${lastDana.orgName} again?`,
                  `আবার ${lastDana.orgName}-কে ₹${lastDana.amount.toLocaleString('en-IN')} দেবেন?`,
                  `फिर से ${lastDana.orgName} को ₹${lastDana.amount.toLocaleString('en-IN')} देंगे?`
                )}
              </p>
              <div className="flex gap-2">
                <Btn onClick={repeatLast} className="flex-1">
                  <T en="Yes, offer again 🙏" bn="হ্যাঁ, আবার দিন 🙏" hi="हाँ, फिर से दें 🙏" />
                </Btn>
                <Btn variant="ghost" onClick={() => setAgainConfirm(false)}>
                  <T en="Not now" bn="এখন না" hi="अभी नहीं" />
                </Btn>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-extrabold text-stone-900 mb-3">
          <T en="Record dana" bn="দান লিখুন" hi="दान दर्ज करें" />
        </h2>
        <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3">
          <Field label={<T en="Organisation" bn="সংগঠন" hi="संगठन" />}>
            <input className={inputCls} value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} placeholder="Kashi Vishwanath Mandir" />
          </Field>
          <Field label={<T en="Amount (₹)" bn="পরিমাণ (₹)" hi="राशि (₹)" />}>
            <input type="number" min={1} className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="501" />
          </Field>
          <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}>
            <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label={<T en="Purpose" bn="উদ্দেশ্য" hi="उद्देश्य" />}>
            <input className={inputCls} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="Annadanam" />
          </Field>
          <Field label={<T en="Receipt no." bn="রসিদ নং" hi="रसीद सं." />}>
            <input className={inputCls} value={form.receiptNo} onChange={(e) => setForm({ ...form, receiptNo: e.target.value })} placeholder="SB-80G-…" />
          </Field>
          <div className="flex items-end">
            <Btn type="submit"><T en="Record" bn="সংরক্ষণ" hi="दर्ज करें" /></Btn>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-extrabold text-stone-900 mb-3">
          <T en="History" bn="ইতিহাস" hi="इतिहास" />
        </h2>
        {state.giving.length === 0 ? (
          <Empty text={tr('solo.giving.none', 'No dana recorded yet.', 'এখনও কোনো দান নেই।', 'अभी कोई दान नहीं।')} />
        ) : (
          <ul className="space-y-1">
            {[...state.giving].sort((a, b) => b.date.localeCompare(a.date)).map((g) => (
              <li key={g.id} className="flex items-center justify-between text-sm py-2 border-b border-stone-50">
                <span>
                  <b className="text-stone-800">{g.orgName}</b>
                  {g.purpose && <span className="text-stone-500"> · {g.purpose}</span>}
                  <span className="text-stone-400 text-xs"> · {g.date}</span>
                  {g.receiptNo && <span className="ml-1 text-xs font-mono text-emerald-700">{g.receiptNo}</span>}
                </span>
                <span className="flex items-center gap-1">
                  <b className="text-amber-800">₹{g.amount.toLocaleString('en-IN')}</b>
                  <button
                    onClick={() => setViewReceipt(g)}
                    className="text-xs font-bold text-amber-700 hover:underline px-2 py-1 min-h-[32px]"
                    aria-label="Share receipt"
                  >
                    🪔
                  </button>
                  <button onClick={() => remove('giving', g.id)} className="text-xs text-red-500 hover:underline px-2 py-1">✕</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ExpressDanaSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />

      {/* In-app receipt view — blessing + multi-channel share row. */}
      {viewReceipt && <ReceiptModal record={viewReceipt} onClose={() => setViewReceipt(null)} />}
    </div>
  );
};
