import React, { useEffect, useMemo, useState } from 'react';
import { useSoloStore, uid, todayISO } from './soloStore';
import { T, Btn, Field, inputCls, useLocaleText } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { GUIDES, useGuide, TourPill, CoachMark } from '../components/guide';

/* ExpressDanaSheet — the fifteen-second dana.
 * =====================================================================
 * Two screens and done: (1) amount + temple + purpose + shradhā,
 * (2) how the offering travels. We COORDINATE, never hold custody —
 * money moves only through the devotee's own UPI app or the temple's
 * own QR. "Offer at the temple / record only" keeps the dana journal
 * honest when no payment rail is involved. Every completed offering
 * lands in the same device-local `add('giving', …)` ledger GivingTab
 * has always kept. No account, no extra fields.
 */

const PRESETS = [51, 101, 501, 1100];
const SHRADHA_STEPS = [0, 5, 10, 25];

type Screen = 'form' | 'pay' | 'done';
type DanaMethod = 'upi' | 'qr' | 'temple';

/** Temple UPI IDs the devotee has used before — remembered on THIS device only. */
const UPI_STORE_KEY = 'sb_dana_upi_v1';
const loadUpiMap = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(UPI_STORE_KEY) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
};
const saveUpiForOrg = (org: string, vpa: string) => {
  try {
    const map = loadUpiMap();
    map[org.trim().toLowerCase()] = vpa.trim();
    localStorage.setItem(UPI_STORE_KEY, JSON.stringify(map));
  } catch {
    /* private mode — the ID simply won't be remembered */
  }
};

interface LastDana {
  org: string;
  amount: number;
  purpose: string;
  method: DanaMethod;
}

/** Prefill for callers that open the sheet with intent — e.g. tangible seva
 * cards ("₹101 = one day's bhog") deep-linking into the express flow. */
export interface DanaPrefill {
  amount?: number;
  orgName?: string;
  purpose?: string;
}

export const ExpressDanaSheet: React.FC<{ open: boolean; onClose: () => void; prefill?: DanaPrefill }> = ({
  open,
  onClose,
  prefill,
}) => {
  const { state, add } = useSoloStore();
  const { tr } = useLocaleText();
  const { rt } = useLanguage();
  // Regional temple word for standalone slots (label, placeholder) —
  // title-cased to match the label's look; native scripts are caseless.
  const templeWordRaw = rt('temple');
  const templeTitle = templeWordRaw.charAt(0).toUpperCase() + templeWordRaw.slice(1);
  const { showToast } = useToast();
  const { firebaseUser } = useAuthWorkspace();
  const guideUid = ((firebaseUser as { uid?: string } | null)?.uid || 'anon') as string;
  const danaGuide = useGuide('dana', guideUid);

  const [screen, setScreen] = useState<Screen>('form');
  const [preset, setPreset] = useState<number>(101);
  const [customAmt, setCustomAmt] = useState('');
  const [orgName, setOrgName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [shradhaIdx, setShradhaIdx] = useState(1);
  const [upiLaunched, setUpiLaunched] = useState(false);
  const [giveAgainConfirm, setGiveAgainConfirm] = useState(false);
  const [lastDana, setLastDana] = useState<LastDana | null>(null);

  // Fresh sheet every time it opens; the devotee's last choices stay warm.
  // A prefill (e.g. from a tangible seva card) lands amount/org/purpose.
  useEffect(() => {
    if (open) {
      setScreen('form');
      setUpiLaunched(false);
      setGiveAgainConfirm(false);
      setLastDana(null);
      if (prefill?.amount && prefill.amount > 0) {
        if (PRESETS.includes(prefill.amount)) {
          setPreset(prefill.amount);
          setCustomAmt('');
        } else {
          setCustomAmt(String(prefill.amount));
        }
      }
      if (prefill?.orgName?.trim()) pickOrg(prefill.orgName.trim());
      if (prefill?.purpose?.trim()) setPurpose(prefill.purpose.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  const recentOrgs = useMemo(() => {
    const seen = new Map<string, string>();
    [...state.giving]
      .sort((a, b) => b.createdAt - a.createdAt)
      .forEach((g) => {
        const key = g.orgName.trim().toLowerCase();
        if (key && !seen.has(key)) seen.set(key, g.orgName.trim());
      });
    return [...seen.values()].slice(0, 5);
  }, [state.giving]);

  const base = customAmt.trim() ? parseFloat(customAmt) : preset;
  const baseValid = base > 0 && Number.isFinite(base);
  const shradhaPct = SHRADHA_STEPS[shradhaIdx] ?? 0;
  const extra = baseValid ? Math.round(base * (shradhaPct / 100)) : 0;
  const total = baseValid ? base + extra : 0;
  const orgValid = orgName.trim().length > 0;

  const pickOrg = (name: string) => {
    setOrgName(name);
    const remembered = loadUpiMap()[name.trim().toLowerCase()];
    setUpiId(remembered || '');
  };

  const methodLabel = (m: DanaMethod) =>
    m === 'upi'
      ? tr('solo.dana.methodUpi', 'via your UPI app', 'আপনার ইউপিআই অ্যাপে', 'आपके यूपीआई ऐप से')
      : m === 'qr'
        ? tr('solo.dana.methodQr', 'via the temple QR', 'মন্দিরের কিউআরে', 'मंदिर के क्यूआर से')
        : tr('solo.dana.methodTemple', 'at the temple', 'মন্দিরে', 'मंदिर में');

  const recordDana = (method: DanaMethod) => {
    const purposeBits = [purpose.trim(), extra > 0 ? `+₹${extra.toLocaleString('en-IN')} shradhā 🪔` : '']
      .filter(Boolean)
      .join(' · ');
    const rec = {
      id: uid('g'),
      date: todayISO(),
      orgName: orgName.trim(),
      amount: total,
      purpose: purposeBits || undefined,
      createdAt: Date.now(),
    };
    add('giving', rec);
    setLastDana({ org: rec.orgName, amount: rec.amount, purpose: purposeBits, method });
    setScreen('done');
    setUpiLaunched(false);
    setGiveAgainConfirm(false);
    showToast(tr('solo.giving.added', 'Dana recorded — dhanyavaad', 'দান সংরক্ষিত — ধন্যবাদ', 'दान दर्ज — धन्यवाद'), 'success');
  };

  const launchUpi = () => {
    const vpa = upiId.trim();
    if (!vpa || !baseValid) return;
    saveUpiForOrg(orgName, vpa);
    const url =
      `upi://pay?pa=${encodeURIComponent(vpa)}` +
      `&pn=${encodeURIComponent(orgName.trim())}` +
      `&am=${total.toFixed(2)}&cu=INR` +
      `&tn=${encodeURIComponent(purpose.trim() || 'Dana')}`;
    window.location.href = url;
    setUpiLaunched(true);
  };

  const confirmGiveAgain = () => {
    if (!lastDana) return;
    add('giving', {
      id: uid('g'),
      date: todayISO(),
      orgName: lastDana.org,
      amount: lastDana.amount,
      purpose: lastDana.purpose || undefined,
      createdAt: Date.now(),
    });
    setGiveAgainConfirm(false);
    showToast(tr('solo.giving.added', 'Dana recorded — dhanyavaad', 'দান সংরক্ষিত — ধন্যবাদ', 'दान दर्ज — धन्यवाद'), 'success');
  };

  const goPay = () => {
    if (!orgValid || !baseValid) {
      showToast(
        tr('solo.giving.need', 'Enter organisation and amount', 'সংগঠন ও পরিমাণ দিন', 'संगठन और राशि दें'),
        'warning'
      );
      return;
    }
    setScreen('pay');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130]" role="dialog" aria-modal="true" aria-label="Offer dana">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 sm:mx-auto sm:max-w-lg max-h-[92dvh] overflow-y-auto bg-white rounded-t-3xl shadow-2xl animate-[danaSheetIn_0.28s_ease-out]">
        <div className="sticky top-0 bg-white/95 backdrop-blur rounded-t-3xl border-b border-amber-100 px-5 pt-4 pb-3 flex items-start justify-between z-10">
          <div>
            <h2 className="text-lg font-extrabold text-stone-900">
              {screen === 'form' && <T en="Offer dana 🪔" bn="দান দিন 🪔" hi="दान अर्पित करें 🪔" />}
              {screen === 'pay' && <T en="How will you offer?" bn="কীভাবে দেবেন?" hi="कैसे अर्पित करेंगे?" />}
              {screen === 'done' && <T en="Dhanyavaad 🙏" bn="ধন্যবাদ 🙏" hi="धन्यवाद 🙏" />}
            </h2>
            {screen !== 'done' && (
              <p className="text-xs text-stone-500 mt-0.5">
                <T en="Fifteen seconds, no account needed" bn="পনেরো সেকেন্ড, অ্যাকাউন্ট লাগে না" hi="पंद्रह सेकंड, खाता नहीं चाहिए" />
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-stone-400 hover:text-stone-700 rounded-full min-h-[44px] min-w-[44px]"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4">
          {screen === 'form' && (
            <div className="space-y-5">
              <div data-guide-anchor="dana-amount">
                <Field label={<T en="Amount" bn="পরিমাণ" hi="राशि" />}>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setPreset(p);
                          setCustomAmt('');
                        }}
                        aria-pressed={!customAmt.trim() && preset === p}
                        className={`min-h-[48px] rounded-xl border-2 text-base font-extrabold transition-colors ${
                          !customAmt.trim() && preset === p
                            ? 'border-amber-600 bg-amber-50 text-amber-900'
                            : 'border-stone-200 bg-white text-stone-600'
                        }`}
                      >
                        ₹{p}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    className={inputCls}
                    value={customAmt}
                    onChange={(e) => setCustomAmt(e.target.value)}
                    placeholder={tr('solo.dana.customAmt', 'Or your own amount…', 'অথবা নিজের পরিমাণ…', 'या अपनी राशि…')}
                  />
                </Field>
              </div>

              <Field label={<T en={`${templeTitle} / organisation`} bn="মন্দির / সংগঠন" hi="मंदिर / संगठन" />}>
                {recentOrgs.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {recentOrgs.map((o) => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => pickOrg(o)}
                        className={`min-h-[44px] px-3.5 rounded-full border text-sm font-bold transition-colors ${
                          orgName.trim() === o
                            ? 'border-amber-600 bg-amber-50 text-amber-900'
                            : 'border-stone-200 bg-stone-50 text-stone-600'
                        }`}
                      >
                        🛕 {o}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  className={inputCls}
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  onBlur={() => {
                    if (!upiId) {
                      const remembered = loadUpiMap()[orgName.trim().toLowerCase()];
                      if (remembered) setUpiId(remembered);
                    }
                  }}
                  placeholder={`Kashi Vishwanath ${templeTitle}`}
                />
              </Field>

              <Field label={<T en="Purpose (optional)" bn="উদ্দেশ্য (ঐচ্ছিক)" hi="उद्देश्य (वैकल्पिक)" />}>
                <input
                  className={inputCls}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder={tr('solo.dana.purposePh', 'Annadanam, deepdaan, bhog…', 'অন্নদান, দীপদান, ভোগ…', 'अन्नदान, दीपदान, भोग…')}
                />
              </Field>

              <Field label={<T en="Temple's UPI ID (optional)" bn="মন্দিরের ইউপিআই আইডি (ঐচ্ছিক)" hi="मंदिर की यूपीआई आईडी (वैकल्पिक)" />}>
                <input
                  className={inputCls}
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="mandir@upi"
                  autoComplete="off"
                />
                <p className="text-xs text-stone-500 mt-1.5">
                  <T
                    en="From the temple's board or QR — remembered on this device only, for your next offering."
                    bn="মন্দিরের বোর্ড বা কিউআর থেকে — শুধু এই ডিভাইসে মনে রাখা হবে, পরের দানের জন্য।"
                    hi="मंदिर के बोर्ड या क्यूआर से — केवल इसी डिवाइस पर याद रहेगा, अगली भेंट के लिए।"
                  />
                </p>
              </Field>

              <div data-guide-anchor="dana-shradha" className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm font-extrabold text-amber-900">
                    <T en="Add a little extra as shradhā" bn="শ্রদ্ধা হিসেবে একটু বাড়তি দিন" hi="श्रद्धा के रूप में थोड़ा अतिरिक्त दें" />
                  </span>
                  <span className="text-sm font-black text-amber-700">+{shradhaPct}%</span>
                </div>
                <p className="text-xs text-stone-600 mb-3">
                  <T
                    en="A little extra love for the temple's lamp oil 🪔 — more, never less, and always your choice."
                    bn="মন্দিরের প্রদীপের তেলের জন্য একটু বাড়তি ভালোবাসা 🪔 — বেশিই, কখনও কম নয়, আর সবসময় আপনার ইচ্ছা।"
                    hi="मंदिर के दीपक के तेल के लिए थोड़ा अतिरिक्त स्नेह 🪔 — अधिक ही, कभी कम नहीं, और हमेशा आपकी इच्छा।"
                  />
                </p>
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={1}
                  value={shradhaIdx}
                  onChange={(e) => setShradhaIdx(Number(e.target.value))}
                  className="w-full h-11 accent-amber-700 cursor-pointer"
                  aria-label={tr('solo.dana.shradha', 'Shradhā — extra offering percent', 'শ্রদ্ধা — বাড়তি শতাংশ', 'श्रद्धा — अतिरिक्त प्रतिशत')}
                />
                <div className="flex justify-between text-xs font-bold text-stone-500 -mt-1">
                  {SHRADHA_STEPS.map((s, i) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setShradhaIdx(i)}
                      className={`min-h-[44px] px-2 rounded-lg ${i === shradhaIdx ? 'text-amber-800' : ''}`}
                      aria-pressed={i === shradhaIdx}
                    >
                      {s}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-stone-900 text-amber-50 p-4 flex items-center justify-between">
                <span className="text-sm font-bold opacity-80">
                  <T en="Your offering" bn="আপনার দান" hi="आपकी भेंट" />
                </span>
                <span className="text-2xl font-black">
                  ₹{total.toLocaleString('en-IN')}
                  {extra > 0 && <span className="block text-[11px] font-bold opacity-70 text-right">₹{base.toLocaleString('en-IN')} + ₹{extra.toLocaleString('en-IN')} shradhā</span>}
                </span>
              </div>

              <Btn onClick={goPay} className="w-full !py-3.5 !text-base">
                <T en="Continue →" bn="এগিয়ে যান →" hi="आगे बढ़ें →" />
              </Btn>
            </div>
          )}

          {screen === 'pay' && (
            <div className="space-y-3">
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center">
                <div className="text-3xl font-black text-amber-900">₹{total.toLocaleString('en-IN')}</div>
                <div className="text-sm font-bold text-stone-600 mt-1">
                  {orgName.trim()}
                  {purpose.trim() && <span className="text-stone-400"> · {purpose.trim()}</span>}
                </div>
              </div>

              <p className="text-xs text-stone-500 text-center px-2">
                <T
                  en="We only coordinate — your money moves through your own app or the temple's own QR. We never hold a rupee of your dana."
                  bn="আমরা শুধু সমন্বয় করি — আপনার টাকা আপনার নিজের অ্যাপ বা মন্দিরের নিজস্ব কিউআর দিয়ে যায়। আপনার দানের এক টাকাও আমরা ধরি না।"
                  hi="हम केवल समन्वय करते हैं — आपका धन आपके अपने ऐप या मंदिर के अपने क्यूआर से जाता है। आपकी भेंट का एक रुपया भी हम नहीं रखते।"
                />
              </p>

              {/* (a) UPI intent — only when the temple's UPI ID is known */}
              <button
                type="button"
                disabled={!upiId.trim() || upiLaunched}
                onClick={launchUpi}
                className={`w-full min-h-[68px] rounded-2xl border-2 p-4 text-left transition-colors ${
                  upiId.trim()
                    ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100'
                    : 'border-stone-200 bg-stone-50 opacity-70'
                }`}
              >
                <div className="font-extrabold text-stone-900">📱 <T en="Pay in your UPI app" bn="আপনার ইউপিআই অ্যাপে দিন" hi="अपने यूपीआई ऐप में दें" /></div>
                <div className="text-xs text-stone-600 mt-1">
                  {upiId.trim() ? (
                    <T
                      en="Opens with the temple's ID and amount prefilled — zero typing."
                      bn="মন্দিরের আইডি ও পরিমাণ আগে থেকে ভরা — টাইপিং লাগে না।"
                      hi="मंदिर की आईडी और राशि पहले से भरी — टाइपिंग नहीं।"
                    />
                  ) : (
                    <T
                      en="Add the temple's UPI ID on the previous screen to use this — or offer another way below."
                      bn="এটি ব্যবহার করতে আগের স্ক্রিনে মন্দিরের ইউপিআই আইডি দিন — অথবা নিচে অন্য উপায়ে দিন।"
                      hi="इसे इस्तेमाल करने के लिए पिछली स्क्रीन पर मंदिर की यूपीआई आईडी डालें — या नीचे किसी और तरह से दें।"
                    />
                  )}
                </div>
              </button>

              {upiLaunched && (
                <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4">
                  <p className="text-sm font-bold text-emerald-900 mb-3">
                    <T
                      en="Did your offering go through in the UPI app?"
                      bn="ইউপিআই অ্যাপে আপনার দান সম্পন্ন হয়েছে?"
                      hi="क्या यूपीआई ऐप में आपकी भेंट पूरी हो गई?"
                    />
                  </p>
                  <div className="flex gap-2">
                    <Btn onClick={() => recordDana('upi')} className="flex-1">
                      <T en="Yes — record my dana 🙏" bn="হ্যাঁ — দান লিখুন 🙏" hi="हाँ — दान दर्ज करें 🙏" />
                    </Btn>
                    <Btn variant="ghost" onClick={() => setUpiLaunched(false)}>
                      <T en="Not yet" bn="এখনও না" hi="अभी नहीं" />
                    </Btn>
                  </div>
                </div>
              )}

              {/* (b) Temple's own QR — BD rails and beyond */}
              <button
                type="button"
                onClick={() => recordDana('qr')}
                className="w-full min-h-[68px] rounded-2xl border-2 border-sky-200 bg-sky-50 hover:bg-sky-100 p-4 text-left transition-colors"
              >
                <div className="font-extrabold text-stone-900">🔳 <T en="Scan the temple's own QR" bn="মন্দিরের নিজস্ব কিউআর স্ক্যান করুন" hi="मंदिर का अपना क्यूआर स्कैन करें" /></div>
                <div className="text-xs text-stone-600 mt-1">
                  <T
                    en="On the hundi or notice board — bKash, Nagad, UPI. Offer there, then tap to record."
                    bn="হুন্ডি বা নোটিশ বোর্ডে — বিকাশ, নগদ, ইউপিআই। সেখানে দিন, তারপর লিখতে ট্যাপ করুন।"
                    hi="हुंडी या नोटिस बोर्ड पर — bKash, Nagad, UPI। वहाँ दें, फिर दर्ज करने के लिए टैप करें।"
                  />
                </div>
              </button>

              {/* (c) Record only — the honest path */}
              <button
                type="button"
                onClick={() => recordDana('temple')}
                className="w-full min-h-[68px] rounded-2xl border-2 border-amber-200 bg-white hover:bg-amber-50 p-4 text-left transition-colors"
              >
                <div className="font-extrabold text-stone-900">🪔 <T en="Offered at the temple — record only" bn="মন্দিরে দিয়েছেন — শুধু লিখুন" hi="मंदिर में दिया — केवल दर्ज करें" /></div>
                <div className="text-xs text-stone-600 mt-1">
                  <T
                    en="Already gave in person? Keep your dana journal honest — no payment, just the record."
                    bn="সশরীরে ইতিমধ্যে দিয়েছেন? আপনার দান-পঞ্জি সৎ রাখুন — পেমেন্ট নয়, শুধু লেখা।"
                    hi="व्यक्तिगत रूप से पहले ही दे चुके? अपनी दान-पंजी ईमानदार रखें — कोई भुगतान नहीं, केवल रिकॉर्ड।"
                  />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScreen('form')}
                className="w-full min-h-[44px] text-sm font-bold text-stone-500 hover:text-stone-700"
              >
                ← <T en="Back" bn="পেছনে" hi="पीछे" />
              </button>
            </div>
          )}

          {screen === 'done' && lastDana && (
            <div className="space-y-4 text-center py-2">
              <div className="text-5xl">🙏</div>
              <p className="text-sm text-stone-600 max-w-xs mx-auto">
                <T
                  en="May your generosity return to you a hundredfold. The lamp you lit burns on."
                  bn="আপনার উদারতা শতগুণে ফিরে আসুক। আপনি যে প্রদীপ জ্বালালেন তা জ্বলতেই থাকুক।"
                  hi="आपकी उदारता सौ गुना लौटे। आपने जो दीप जलाया वह जलता रहे।"
                />
              </p>
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                <div className="text-3xl font-black text-amber-900">₹{lastDana.amount.toLocaleString('en-IN')}</div>
                <div className="text-sm font-bold text-stone-700 mt-1">
                  {lastDana.org} <span className="text-stone-400 font-normal">{methodLabel(lastDana.method)}</span>
                </div>
                {lastDana.purpose && <div className="text-xs text-stone-500 mt-1">{lastDana.purpose}</div>}
              </div>

              {!giveAgainConfirm ? (
                <Btn onClick={() => setGiveAgainConfirm(true)} className="w-full !py-3.5 !text-base">
                  🙏 <T en="Give again" bn="আবার দিন" hi="फिर से दें" />
                </Btn>
              ) : (
                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-left">
                  <p className="text-sm font-bold text-stone-800 mb-3">
                    {tr(
                      'solo.dana.giveAgainLine',
                      `Offer ₹${lastDana.amount.toLocaleString('en-IN')} to ${lastDana.org} again?`,
                      `আবার ${lastDana.org}-কে ₹${lastDana.amount.toLocaleString('en-IN')} দেবেন?`,
                      `फिर से ${lastDana.org} को ₹${lastDana.amount.toLocaleString('en-IN')} देंगे?`
                    )}
                  </p>
                  <div className="flex gap-2">
                    <Btn onClick={confirmGiveAgain} className="flex-1">
                      <T en="Yes, offer again 🙏" bn="হ্যাঁ, আবার দিন 🙏" hi="हाँ, फिर से दें 🙏" />
                    </Btn>
                    <Btn variant="ghost" onClick={() => setGiveAgainConfirm(false)}>
                      <T en="Not now" bn="এখন না" hi="अभी नहीं" />
                    </Btn>
                  </div>
                </div>
              )}

              <Btn variant="ghost" onClick={onClose} className="w-full">
                <T en="Done" bn="সম্পন্ন" hi="पूर्ण" />
              </Btn>
            </div>
          )}
        </div>
      </div>

      {danaGuide.pillVisible && (
        <TourPill guide={GUIDES.dana} uid={guideUid} onStart={danaGuide.start} onDismiss={danaGuide.dismissPill} />
      )}
      {danaGuide.tourActive && <CoachMark guide={GUIDES.dana} onFinish={danaGuide.finish} />}

      <style>{`@keyframes danaSheetIn { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};
