/**
 * ChatFirstRun.tsx — Gentle first-run walkthroughs for Chat & P2P money.
 * ======================================================================
 * Three one-screen, dismissable overlays. Never nagging: each shows
 * exactly once per user (localStorage), then never again.
 *
 *   1. ChatFirstRunHint        — first time opening chat:
 *      "These are your conversations. Everyone here is verified by
 *      Sanatani ID."
 *   2. RequestFirstRunWatcher  — watches the user's money requests; when
 *      the FIRST request exists, shows RequestLifecycleWalkthrough once:
 *      request → accept → mark paid → confirm received.
 *   3. WalletFirstRunHint       — first time opening My Wallet:
 *      owed-to-me / I-owe / netting explained.
 *
 * ADDITIVE ONLY: these wrap around the chat core (Chat, PersonalWallet,
 * MoneyRequestCard) without modifying them. Mounted by consumers
 * (e.g. SoloHome) next to the chat surfaces.
 */
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { T } from '../solo/ui';
import { subscribeUserRequests } from './p2pService';

export const FIRST_RUN_KEYS = {
  chat: 'sb_firstrun_chat_v1',
  request: 'sb_firstrun_request_v1',
  wallet: 'sb_firstrun_wallet_v1',
} as const;

/** localStorage-backed "show once, dismiss forever" hook. Fail-open. */
export function useFirstRun(key: string): [boolean, () => void] {
  const [seen, setSeen] = useState(true); // default seen → never flashes
  useEffect(() => {
    let dismissed = true;
    try {
      dismissed = localStorage.getItem(key) === '1';
    } catch {
      dismissed = true;
    }
    setSeen(dismissed);
  }, [key]);
  const dismiss = () => {
    try {
      localStorage.setItem(key, '1');
    } catch {
      /* storage unavailable — overlay may reappear, harmless */
    }
    setSeen(true);
  };
  return [seen, dismiss];
}

function Shell({
  onClose,
  header,
  children,
  z = 'z-[115]',
}: {
  onClose: () => void;
  header: React.ReactNode;
  children?: React.ReactNode;
  z?: string;
}) {
  return (
    <div
      className={`fixed inset-0 ${z} bg-stone-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4`}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-gradient-to-b from-amber-50 to-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="bg-gradient-to-br from-amber-700 via-orange-600 to-rose-700 text-amber-50 p-5 relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 w-11 h-11 min-h-[44px] rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="pr-12">{header}</div>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1. First time opening chat                                          */
/* ------------------------------------------------------------------ */

export const ChatFirstRunHint: React.FC = () => {
  const [seen, dismiss] = useFirstRun(FIRST_RUN_KEYS.chat);
  if (seen) return null;
  return (
    <Shell
      onClose={dismiss}
      header={
        <>
          <div className="text-3xl mb-2" aria-hidden>
            💬
          </div>
          <h2 className="text-lg font-extrabold">
            <T en="Your conversations" bn="আপনার কথোপকথন" hi="आपकी बातचीत" />
          </h2>
          <p className="text-sm text-amber-100/90 mt-2 leading-relaxed">
            <T
              en="These are your conversations. Everyone here is verified by Sanatani ID — talk freely, the way family talks."
              bn="এগুলো আপনার কথোপকথন। এখানে সবাই সনাতনী পরিচয়ে যাচাইকৃত — পরিবারের মতো মন খুলে কথা বলুন।"
              hi="ये आपकी बातचीत हैं। यहाँ हर कोई सनातनी पहचान से सत्यापित है — परिवार की तरह खुलकर बात करें।"
            />
          </p>
          <p className="text-xs text-amber-200/80 mt-3 leading-relaxed">
            <T
              en="Need money from a friend? Open any chat and send a request card — they'll see exactly what to do."
              bn="বন্ধুর কাছে টাকা দরকার? যেকোনো চ্যাট খুলে রিকোয়েস্ট কার্ড পাঠান — কী করতে হবে ওঁরা বুঝে যাবেন।"
              hi="मित्र से धन चाहिए? कोई भी चैट खोलकर अनुरोध कार्ड भेजें — उन्हें समझ आ जाएगा क्या करना है।"
            />
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="mt-4 w-full min-h-[44px] rounded-2xl bg-white/20 hover:bg-white/30 font-extrabold text-sm py-3 transition-colors"
          >
            <T en="Got it 🙏" bn="বুঝেছি 🙏" hi="समझ गया 🙏" />
          </button>
        </>
      }
    />
  );
};

/* ------------------------------------------------------------------ */
/* 2. First money request — card lifecycle walkthrough                 */
/* ------------------------------------------------------------------ */

const LIFECYCLE_STEPS: Array<{
  icon: string;
  en: string;
  bn: string;
  hi: string;
  subEn: string;
  subBn: string;
  subHi: string;
}> = [
  {
    icon: '📨',
    en: 'Request',
    bn: 'অনুরোধ',
    hi: 'अनुरोध',
    subEn: 'You send a card with amount & note',
    subBn: 'টাকা ও নোটসহ কার্ড পাঠান',
    subHi: 'राशि व नोट सहित कार्ड भेजें',
  },
  {
    icon: '🤝',
    en: 'Accept',
    bn: 'গ্রহণ',
    hi: 'स्वीकार',
    subEn: 'They agree — a promise is made',
    subBn: 'তাঁরা সম্মত হন — প্রতিশ্রুতি হয়',
    subHi: 'वे सहमत होते हैं — वचन बनता है',
  },
  {
    icon: '💸',
    en: 'Mark paid',
    bn: 'পরিশোধ চিহ্নিত',
    hi: 'भुगतान चिह्नित',
    subEn: 'Payer pays on bKash/Nagad/UPI, marks paid',
    subBn: 'প্রদানকারী বিকাশ/নগদ/UPI-তে দিয়ে চিহ্নিত করেন',
    subHi: 'भुगतानकर्ता bKash/Nagad/UPI से देकर चिह्नित करता है',
  },
  {
    icon: '✅',
    en: 'Confirm',
    bn: 'নিশ্চিত',
    hi: 'पुष्टि',
    subEn: 'Receiver confirms — record complete',
    subBn: 'গ্রহীতা নিশ্চিত করেন — হিসাব সম্পূর্ণ',
    subHi: 'प्राप्तकर्ता पुष्टि करता है — हिसाब पूर्ण',
  },
];

export const RequestLifecycleWalkthrough: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => (
  <Shell
    onClose={onClose}
    header={
      <>
        <div className="text-3xl mb-2" aria-hidden>
          💸
        </div>
        <h2 className="text-lg font-extrabold">
          <T en="How a money request works" bn="টাকার অনুরোধ কীভাবে কাজ করে" hi="धन-अनुरोध कैसे काम करता है" />
        </h2>
        <p className="text-xs text-amber-200/80 mt-1">
          <T
            en="Four small steps. The app never holds your money."
            bn="চারটি ছোট ধাপ। অ্যাপ কখনো আপনার টাকা রাখে না।"
            hi="चार छोटे चरण। ऐप कभी आपका धन नहीं रखता।"
          />
        </p>
      </>
    }
  >
    <div className="p-5">
      <ol className="space-y-3">
        {LIFECYCLE_STEPS.map((s, i) => (
          <li key={s.en} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <span className="w-11 h-11 min-h-[44px] rounded-2xl bg-amber-100 flex items-center justify-center text-xl shrink-0" aria-hidden>
                {s.icon}
              </span>
              {i < LIFECYCLE_STEPS.length - 1 && (
                <span className="w-0.5 h-4 bg-amber-200 my-0.5" aria-hidden />
              )}
            </div>
            <div className="pt-1">
              <div className="text-sm font-extrabold text-stone-800">
                <T en={`${i + 1}. ${s.en}`} bn={`${i + 1}. ${s.bn}`} hi={`${i + 1}. ${s.hi}`} />
              </div>
              <div className="text-xs text-stone-500 mt-0.5">
                <T en={s.subEn} bn={s.subBn} hi={s.subHi} />
              </div>
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full min-h-[44px] rounded-2xl bg-gradient-to-br from-amber-700 via-orange-600 to-rose-700 text-amber-50 font-extrabold text-sm py-3 shadow-sm"
      >
        <T en="Understood 🙏" bn="বুঝেছি 🙏" hi="समझ गया 🙏" />
      </button>
    </div>
  </Shell>
);

/**
 * Watches the user's money requests and shows the lifecycle
 * walkthrough exactly once — when the first request exists.
 * Mount anywhere (e.g. next to <Chat/>); renders nothing otherwise.
 */
export const RequestFirstRunWatcher: React.FC<{ uid: string }> = ({ uid }) => {
  const [seen, dismiss] = useFirstRun(FIRST_RUN_KEYS.request);
  const [hasRequest, setHasRequest] = useState(false);

  useEffect(() => {
    if (!uid || uid === 'anon' || seen) return;
    let live = true;
    let unsub: (() => void) | null = null;
    try {
      unsub = subscribeUserRequests(uid, (reqs) => {
        if (live && Array.isArray(reqs) && reqs.length > 0) setHasRequest(true);
      });
    } catch {
      /* fail-open */
    }
    return () => {
      live = false;
      try {
        unsub && unsub();
      } catch {
        /* ignore */
      }
    };
  }, [uid, seen]);

  if (seen || !hasRequest) return null;
  return <RequestLifecycleWalkthrough onClose={dismiss} />;
};

/* ------------------------------------------------------------------ */
/* 3. First time opening My Wallet                                     */
/* ------------------------------------------------------------------ */

export const WalletFirstRunHint: React.FC = () => {
  const [seen, dismiss] = useFirstRun(FIRST_RUN_KEYS.wallet);
  if (seen) return null;
  return (
    <Shell
      onClose={dismiss}
      z="z-[125]"
      header={
        <>
          <div className="text-3xl mb-2" aria-hidden>
            🪙
          </div>
          <h2 className="text-lg font-extrabold">
            <T en="Your private money map" bn="আপনার ব্যক্তিগত টাকার মানচিত্র" hi="आपका निजी धन-मानचित्र" />
          </h2>
          <div className="text-sm text-amber-100/90 mt-3 space-y-2.5 leading-relaxed">
            <p>
              <span className="font-extrabold">💚 <T en="Owed to me" bn="আমার পাওনা" hi="मुझे मिलने वाला" /></span>
              {' — '}
              <T
                en="money others promised you."
                bn="অন্যরা যে টাকা দেওয়ার প্রতিশ্রুতি দিয়েছে।"
                hi="जो धन दूसरों ने आपको देने का वचन दिया है।"
              />
            </p>
            <p>
              <span className="font-extrabold">🧡 <T en="I owe" bn="আমার দেনা" hi="मुझे देना है" /></span>
              {' — '}
              <T
                en="money you promised others."
                bn="আপনি অন্যদের যে টাকা দেওয়ার প্রতিশ্রুতি দিয়েছেন।"
                hi="जो धन आपने दूसरों को देने का वचन दिया है।"
              />
            </p>
            <p>
              <span className="font-extrabold">✨ <T en="Netting" bn="নেটিং" hi="नेटिंग" /></span>
              {' — '}
              <T
                en="when the wallet spots a shortcut (Rahim pays Karim directly), it gently suggests it. It never moves money itself."
                bn="ওয়ালেট সহজ পথ দেখলে (রহিম সরাসরি করিমকে দিলে) মৃদু পরামর্শ দেয়। নিজে কখনো টাকা নাড়ে না।"
                hi="जब वॉलेट आसान रास्ता देखता है (रहीम सीधे करीम को दे), तो मृदु सुझाव देता है। स्वयं कभी धन नहीं हिलाता।"
              />
            </p>
          </div>
          <p className="text-xs text-amber-200/80 mt-3">
            <T
              en="Only you can see this. Not the temple, not the platform — just you."
              bn="এটি শুধু আপনি দেখতে পাবেন। মন্দির নয়, প্ল্যাটফর্ম নয় — শুধু আপনি।"
              hi="इसे केवल आप देख सकते हैं। मंदिर नहीं, प्लेटफ़ॉर्म नहीं — केवल आप।"
            />
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="mt-4 w-full min-h-[44px] rounded-2xl bg-white/20 hover:bg-white/30 font-extrabold text-sm py-3 transition-colors"
          >
            <T en="Got it 🙏" bn="বুঝেছি 🙏" hi="समझ गया 🙏" />
          </button>
        </>
      }
    />
  );
};
