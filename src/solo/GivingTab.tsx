import React, { useMemo, useState } from 'react';
import { useSoloStore, uid, todayISO, type GivingRecord } from './soloStore';
import { Card, Stat, T, Btn, Field, inputCls, useLocaleText } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { openDanaSheet } from '../lib/danaSheet';
import { ShareReceiptRow, ReceiptModal, RECEIPT_BLESSING, type ShareLang } from './ShareReceipt';
import { GUIDES, useGuide, TourPill, TourLink, CoachMark } from '../components/guide';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';

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
  const { rt } = useLanguage();
  // Regional temple word for the example org name — title-cased like the
  // proper name it completes; native scripts are caseless.
  const templeWordRaw = rt('temple');
  const templeTitle = templeWordRaw.charAt(0).toUpperCase() + templeWordRaw.slice(1);
  const { showToast } = useToast();
  const [form, setForm] = useState({ orgName: '', amount: '', purpose: '', receiptNo: '', date: todayISO() });
  // The ExpressDanaSheet instance is owned by DanaSheetHost (mounted once in
  // SoloWorkspaceShell), so openDanaSheet() works from every tab — this tab
  // just calls it. (QUEUED FIX #2: the old per-tab registration was the
  // reason Home's "Give" quick-action silently did nothing.)
  // Inline manual form lives behind a disclosure — the ExpressDanaSheet is
  // the primary path; this records offerings already made (offline/hundi).
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [againConfirm, setAgainConfirm] = useState(false);
  // Dana confirmation: the record just added, shown with its blessing +
  // multi-channel share row (dismissible; never auto-persists).
  const [justAdded, setJustAdded] = useState<GivingRecord | null>(null);
  // In-app receipt view for any history record (blessing + share row).
  const [viewReceipt, setViewReceipt] = useState<GivingRecord | null>(null);
  const shareLang: ShareLang = lang === 'bn' ? 'bn' : lang === 'hi' ? 'hi' : 'en';
  const { firebaseUser } = useAuthWorkspace();
  const guideUid = ((firebaseUser as { uid?: string } | null)?.uid || 'anon') as string;
  const devotionalGuide = useGuide('devotional', guideUid);

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

      <Btn onClick={() => openDanaSheet({})} className="w-full !py-3.5 !text-base shadow-sm">
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
              className="text-xs text-stone-400 hover:text-stone-700 px-2 py-1 min-h-[44px] min-w-[44px]"
              aria-label={tr('solo.giving.dismiss', 'Dismiss', 'বন্ধ করুন', 'बंद करें')}
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
        <button
          type="button"
          onClick={() => setOfflineOpen((o) => !o)}
          aria-expanded={offlineOpen}
          className="w-full flex items-center justify-between gap-3 text-left min-h-[44px]"
        >
          <span className="text-lg font-extrabold text-stone-900">
            {tr('solo.giving.offlineLabel', '📝 Record an offline offering', '📝 অফলাইন দান সংরক্ষণ করুন', '📝 ऑफ़लाइन भेंट दर्ज करें')}
          </span>
          <span className="text-amber-700 text-2xl font-black leading-none shrink-0" aria-hidden>
            {offlineOpen ? '−' : '+'}
          </span>
        </button>
        <p className="text-xs text-stone-500 mt-1">
          {tr(
            'solo.giving.offlineHint',
            'For offerings already made — hundi counter receipts, festival dana — keep your personal copy here.',
            'ইতিমধ্যে দেওয়া দানের জন্য — হুন্ডি কাউন্টারের রসিদ, উৎসবের দান — আপনার ব্যক্তিগত কপি এখানে রাখুন।',
            'पहले से दी गई भेंट हेतु — हुंडी काउंटर की रसीद, उत्सव दान — अपनी निजी प्रति यहाँ रखें।'
          )}
        </p>
        {offlineOpen && (
        <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3 mt-3">
          <Field label={<T en="Organisation" bn="সংগঠন" hi="संगठन" />}>
            <input className={inputCls} value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} placeholder={`Kashi Vishwanath ${templeTitle}`} />
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
        )}
      </Card>

      <Card>
        <div data-guide-anchor="giving-ledger">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="text-lg font-extrabold text-stone-900 mb-3">
            <T en="History" bn="ইতিহাস" hi="इतिहास" />
          </h2>
          <TourLink guide={GUIDES.devotional} onRestart={devotionalGuide.restart} />
        </div>
        {state.giving.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3" aria-hidden>🪔</div>
            <p className="text-sm font-bold text-stone-700">
              {tr('solo.giving.emptyTitle', 'Your dana ledger is waiting to be blessed.', 'আপনার দানের খাতা আশীর্বাদের অপেক্ষায় রয়েছে।', 'आपका दान-खाता आशीर्वाद की प्रतीक्षा में है।')}
            </p>
            <p className="text-xs text-stone-500 mt-1">
              {tr('solo.giving.emptySub', 'Every generous act is noted here — offer your first dana and light the way.', 'প্রতিটি উদার কাজ এখানে লিপিবদ্ধ হবে — আপনার প্রথম দান দিন, পথ আলোকিত করুন।', 'हर उदार कृत्य यहाँ दर्ज होगा — अपना पहला दान दें, पथ आलोकित करें।')}
            </p>
            <button
              type="button"
              onClick={() => openDanaSheet({})}
              className="mt-4 min-h-[48px] px-6 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white text-sm font-black shadow-sm"
            >
              🪔 <T en="Offer dana" bn="দান দিন" hi="दान दें" />
            </button>
          </div>
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
                    data-guide-anchor="giving-ledger-share"
                    className="text-xs font-bold text-amber-700 hover:underline px-2 py-1 min-h-[44px] min-w-[44px]"
                    aria-label={tr('solo.giving.share', 'Share receipt', 'রসিদ শেয়ার করুন', 'रसीद साझा करें')}
                  >
                    🪔
                  </button>
                  <button
                    onClick={() => remove('giving', g.id)}
                    className="text-xs text-red-500 hover:underline px-2 py-1 min-h-[44px] min-w-[44px]"
                    aria-label={tr('solo.giving.remove', 'Remove dana record', 'দানের রেকর্ড মুছুন', 'दान रिकॉर्ड हटाएँ')}
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        </div>
      </Card>

      {/* In-app receipt view — blessing + multi-channel share row. */}
      {viewReceipt && <ReceiptModal record={viewReceipt} onClose={() => setViewReceipt(null)} />}

      {/* Quick Guide: giving-as-sadhana — invitational only, never auto-plays. */}
      {devotionalGuide.pillVisible && (
        <TourPill guide={GUIDES.devotional} uid={guideUid} onStart={devotionalGuide.start} onDismiss={devotionalGuide.dismissPill} />
      )}
      {devotionalGuide.tourActive && <CoachMark guide={GUIDES.devotional} onFinish={devotionalGuide.finish} />}
    </div>
  );
};
