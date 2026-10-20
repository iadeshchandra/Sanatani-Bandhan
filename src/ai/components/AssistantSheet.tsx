import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, useLocaleText, Btn } from '../../solo/ui';
import { useLanguage } from '../../context/LanguageContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import {
  ask,
  type AssistantAction,
  type AssistantContext,
  type AssistantResponse,
} from '../assistantBridge';
import { loadThread, saveThread, clearThread, type ChatMessage } from '../assistantHistory';
import { openSosFlow } from '../../crisis/sosEntry';
import { openDanaSheet } from '../../lib/danaSheet';
import { GUIDES, getGuide, useGuide, TourPill, CoachMark } from '../../components/guide';
import { AiVoiceSettings } from '../voice/components/AiVoiceSettings';
import { probeVoiceCapability } from '../voice/capabilities';
import { findNearbyTemples } from '../tasks/nearby';
import { renderTemplate } from '../templates';
import { toAiRole } from '../rbac';
import {
  countAssistantUse,
  dismissNudgeForever,
  markNudgeShown,
  shouldShowNudge,
} from '../voice/storage';

/* ai/components/AssistantSheet.tsx — the devotee's chat with the assistant.
 * =====================================================================
 * Bottom-sheet chat (ExpressDanaSheet's sheet structure/animation). Renders
 * the assistant contract: answer / action / clarify / escalate / sos, with
 * follow-up suggestion chips and action CTAs.
 *
 * Routing rules (Phase 0 design laws):
 * - `action` → CTA button; navigate performs real react-router navigation.
 * - `sos` → the SAME SOS flow as the panic button (openSosFlow, no duplicates).
 * - `escalate` → the Purohitji booking deep link (/seva/journeys, verified route).
 * - History is per-user, device-local IndexedDB — NEVER uploaded (see
 *   assistantHistory.ts). The renderer never invents facts.
 */

const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

/** Launches a registered guide tour from an assistant `openGuide` action. */
const GuideLauncher: React.FC<{ guideId: string; uid: string; onDone: () => void }> = ({
  guideId,
  uid,
  onDone,
}) => {
  const guide = useGuide(guideId, uid);
  useEffect(() => {
    guide.restart(); // explicit devotee request — always re-runnable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guideId]);
  const def = GUIDES[guideId as keyof typeof GUIDES];
  return (
    <>
      {guide.pillVisible && (
        <TourPill guide={def} uid={uid} onStart={guide.start} onDismiss={guide.dismissPill} />
      )}
      {guide.tourActive && (
        <CoachMark
          guide={def}
          onFinish={() => {
            guide.finish(true);
            onDone();
          }}
        />
      )}
    </>
  );
};

const ActionCta: React.FC<{
  action: AssistantAction;
  onRun: (action: AssistantAction) => void;
}> = ({ action, onRun }) => {
  const { tr } = useLocaleText();
  const label =
    action.label ||
    (action.kind === 'openGuide'
      ? tr('ai.cta.openGuide', 'Open guide →', 'গাইড খুলুন →', 'गाइड खोलें →')
      : action.kind === 'openSheet'
        ? tr('ai.cta.openSheet', 'Open →', 'খুলুন →', 'खोलें →')
        : tr('ai.cta.go', 'Go →', 'যান →', 'जाएँ →'));
  return (
    <button
      type="button"
      onClick={() => onRun(action)}
      className="mt-2.5 min-h-[48px] w-full rounded-2xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-sm font-extrabold px-4 transition-colors shadow-sm"
    >
      {label}
    </button>
  );
};

const SuggestionChips: React.FC<{ suggestions: string[]; onPick: (s: string) => void }> = ({
  suggestions,
  onPick,
}) => (
  <div className="mt-2.5 flex flex-wrap gap-2">
    {suggestions.map((s) => (
      <button
        key={s}
        type="button"
        onClick={() => onPick(s)}
        className="min-h-[44px] px-3.5 rounded-full border border-amber-300 bg-amber-50 text-amber-900 text-[13px] font-bold hover:bg-amber-100 transition-colors text-left"
      >
        {s}
      </button>
    ))}
  </div>
);

/**
 * LocationConsentCard — explicit one-time location permission.
 * =====================================================================
 * Rendered when the assistant returns type 'location_consent'. This is a
 * proper UI element (never a browser confirm dialog). Coordinates are
 * requested fresh per query, used once, then discarded — never stored.
 */
const LocationConsentCard: React.FC<{
  lang: string;
  onAllow: () => void;
  onDeny: () => void;
  locating: boolean;
}> = ({ lang, onAllow, onDeny, locating }) => {
  const lc = lang === 'bn' ? 'bn' : lang === 'hi' ? 'hi' : 'en';
  const allowLabel = lc === 'bn' ? 'অনুমতি দিন' : lc === 'hi' ? 'अनुमति दें' : 'Allow';
  const denyLabel = lc === 'bn' ? 'এখন নয়' : lc === 'hi' ? 'अभी नहीं' : 'Not now';
  const locatingLabel =
    lc === 'bn' ? 'অবস্থান খুঁজছি…' : lc === 'hi' ? 'स्थान खोज रहा हूँ…' : 'Locating…';
  return (
    <div className="mt-2.5 rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-4">
      <p className="text-sm font-extrabold text-stone-800 mb-1">
        🛕{' '}
        <T
          en="May I use your location?"
          bn="আপনার অবস্থান ব্যবহার করতে পারি?"
          hi="क्या मैं आपका स्थान उपयोग कर सकता हूँ?"
        />
      </p>
      <p className="text-xs text-stone-600 mb-3 leading-relaxed">
        <T
          en="Just this once, to find nearby temples. I won't store it — it lives only for this search, then it's gone."
          bn="শুধু এই একবার, কাছের মন্দির খুঁজতে। আমি এটি সংরক্ষণ করব না — শুধু এই খোঁজার জন্য, তারপর মুছে যাবে।"
          hi="सिर्फ इस बार, पास के मंदिर खोजने के लिए। मैं इसे सहेजूँगा नहीं — केवल इस खोज के लिए, फिर मिट जाएगा।"
        />
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAllow}
          disabled={locating}
          className="flex-1 min-h-[48px] rounded-2xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-60 text-white text-sm font-extrabold px-4 transition-colors shadow-sm"
        >
          {locating ? locatingLabel : `📍 ${allowLabel}`}
        </button>
        <button
          type="button"
          onClick={onDeny}
          disabled={locating}
          className="flex-1 min-h-[48px] rounded-2xl border border-stone-300 bg-white hover:bg-stone-50 disabled:opacity-60 text-stone-700 text-sm font-bold px-4 transition-colors"
        >
          {denyLabel}
        </button>
      </div>
    </div>
  );
};

export const AssistantSheet: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const navigate = useNavigate();
  const { tr } = useLocaleText();
  const { currentLang, region } = useLanguage();
  const { firebaseUser, role } = useAuthWorkspace();

  const uidKey = useMemo(() => {
    const u = (firebaseUser as { uid?: string } | null)?.uid;
    return u || 'anon';
  }, [firebaseUser]);

  const ctx: AssistantContext = useMemo(
    // H3 (QUEUED #32): the workspace role ('Trustee', 'SuperAdmin', …)
    // is normalised into the AI vocabulary at this boundary — and a
    // workspace SuperAdmin can never become the AI 'owner'.
    () => ({ uid: uidKey, lang: currentLang, region, role: role ? toAiRole(role) : null }),
    [uidKey, currentLang, region, role]
  );
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [activeGuide, setActiveGuide] = useState<string | null>(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [voiceNudge, setVoiceNudge] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Load this devotee's local thread each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadThread(uidKey).then((msgs) => {
      if (!cancelled) setMessages(msgs);
    });
    return () => {
      cancelled = true;
    };
  }, [open, uidKey]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending, open]);

  // Escape closes; body scroll is already locked by the fixed overlay pattern.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const pushAssistant = useCallback(
    (res: AssistantResponse) => {
      const msg: ChatMessage = {
        id: uid(),
        role: 'assistant',
        text: res.text,
        kind: res.type,
        suggestions: res.suggestions,
        action: res.action,
        createdAt: Date.now(),
      };
      setMessages((prev) => {
        const next = [...prev, msg];
        void saveThread(uidKey, next);
        return next;
      });
    },
    [uidKey]
  );

  const warmError = useCallback(() => {
    pushAssistant({
      type: 'answer',
      text: tr(
        'ai.error',
        '🙏 Forgive me — that question slipped through my fingers. Please try again.',
        '🙏 ক্ষমা করবেন — প্রশ্নটি আমার হাত ফসকে গেল। আবার চেষ্টা করুন।',
        '🙏 क्षमा करें — वह प्रश्न मेरे हाथ से फिसल गया। कृपया पुनः प्रयास करें।'
      ),
    });
  }, [pushAssistant, tr]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || sending) return;
      setSending(true);
      const userMsg: ChatMessage = { id: uid(), role: 'user', text, createdAt: Date.now() };
      setMessages((prev) => {
        const next = [...prev, userMsg];
        void saveThread(uidKey, next);
        return next;
      });
      setInput('');
      try {
        const res = await ask(text, ctxRef.current);
        pushAssistant(res);
        // Phase-1 voice: one gentle nudge after 3+ real uses — never on
        // first launch, never twice, never when the voice can't help.
        // Fire-and-forget: the answer is already on screen.
        void (async () => {
          try {
            const uses = countAssistantUse();
            if (uses < 3 || !shouldShowNudge()) return;
            const cap = await probeVoiceCapability();
            if (cap.status === 'available') {
              markNudgeShown();
              setVoiceNudge(true);
            }
          } catch {
            /* nudge is a courtesy — never an error */
          }
        })();
      } catch {
        warmError();
      } finally {
        setSending(false);
      }
    },
    [sending, uidKey, pushAssistant, warmError]
  );

  const runAction = useCallback(
    (action: AssistantAction) => {
      if (action.kind === 'navigate') {
        onClose();
        navigate(action.target);
      } else if (action.kind === 'openGuide') {
        if (getGuide(action.target)) {
          setActiveGuide(action.target);
        } else {
          pushAssistant({
            type: 'answer',
            text: tr(
              'ai.guideMissing',
              '🙏 That guide is still being written — it will appear here when it is ready.',
              '🙏 সেই গাইডটি এখনও লেখা হচ্ছে — প্রস্তুত হলে এখানেই আসবে।',
              '🙏 वह गाइड अभी लिखा जा रहा है — तैयार होते ही यहीं आएगा।'
            ),
          });
        }
      } else if (action.kind === 'openSheet') {
        if (action.target === 'dana') {
          onClose();
          openDanaSheet({});
        } else {
          pushAssistant({
            type: 'answer',
            text: tr(
              'ai.sheetMissing',
              '🙏 That sheet is still being prepared — please look for it on its own screen for now.',
              '🙏 সেই শিটটি এখনও তৈরি হচ্ছে — আপাতত নিজের স্ক্রিনে খুঁজুন।',
              '🙏 वह शीट अभी तैयार हो रही है — फिलहाल उसे उसकी अपनी स्क्रीन पर देखें।'
            ),
          });
        }
      }
    },
    [navigate, onClose, pushAssistant, tr]
  );

  const openSosNow = useCallback(() => {
    onClose();
    openSosFlow();
  }, [onClose]);

  /* Location consent flow — explicit, one-time, never stored. */
  const [locatingId, setLocatingId] = useState<string | null>(null);

  const handleLocationDeny = useCallback(() => {
    const lang = currentLang === 'bn' ? 'bn' : currentLang === 'hi' ? 'hi' : 'en';
    pushAssistant({
      type: 'answer',
      text: renderTemplate('nearby_temples', lang, {}, 'denied') as string,
    });
  }, [currentLang, pushAssistant]);

  const handleLocationAllow = useCallback((msgId: string) => {
    if (!('geolocation' in navigator)) {
      handleLocationDeny();
      return;
    }
    setLocatingId(msgId);
    const lang = currentLang === 'bn' ? 'bn' : currentLang === 'hi' ? 'hi' : 'en';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Coordinates live ONLY in this closure — used once, then discarded.
        const { latitude, longitude } = pos.coords;
        void (async () => {
          try {
            const result = await findNearbyTemples(latitude, longitude, lang);
            if (result.empty) {
              pushAssistant({
                type: 'answer',
                text: renderTemplate('nearby_temples', lang, {}, 'empty') as string,
              });
            } else {
              const header =
                lang === 'bn'
                  ? `🛕 ${result.temples.length}টি মন্দির পাওয়া গেছে:`
                  : lang === 'hi'
                    ? `🛕 ${result.temples.length} मंदिर मिले:`
                    : `🛕 Found ${result.temples.length} temple${result.temples.length === 1 ? '' : 's'} near you:`;
              const list = result.temples
                .map((t) => `• **${t.name}** — ${t.distanceLabel}`)
                .join('\n');
              const footer =
                lang === 'bn'
                  ? result.fromCurated
                    ? `প্রধান তীর্থস্থান (অফলাইন তালিকা)। 🪔`
                    : `আপনার সম্প্রদায়ের ক্যাম্পাস মানচিত্র থেকে। 🪔`
                  : lang === 'hi'
                    ? result.fromCurated
                      ? `प्रमुख तीर्थस्थल (ऑफ़लाइन सूची)। 🪔`
                      : `आपके समुदाय के परिसर मानचित्रों से। 🪔`
                    : result.fromCurated
                      ? `Major pilgrimage sites (offline list). 🪔`
                      : `From your community's campus maps. 🪔`;
              pushAssistant({
                type: 'answer',
                text: renderTemplate('nearby_temples', lang, { header, list, footer }, 'results') as string,
              });
            }
          } catch {
            pushAssistant({
              type: 'answer',
              text: renderTemplate('nearby_temples', lang, {}, 'empty') as string,
            });
          } finally {
            setLocatingId(null);
          }
        })();
      },
      () => {
        // Geolocation denied or failed → graceful fallback.
        setLocatingId(null);
        handleLocationDeny();
      },
      { timeout: 10000, enableHighAccuracy: false, maximumAge: 0 }
    );
  }, [currentLang, pushAssistant, handleLocationDeny]);

  const goToPurohitji = useCallback(() => {
    onClose();
    navigate('/seva/journeys');
  }, [navigate, onClose]);

  const clearHistory = useCallback(async () => {
    await clearThread(uidKey);
    setMessages([]);
  }, [uidKey]);

  if (!open) return null;

  const starters = [
    tr('ai.starter.where', 'Where is the dana section?', 'দান বিভাগ কোথায়?', 'दान अनुभाग कहाँ है?'),
    tr('ai.starter.tithi', "What's today's tithi?", 'আজকের তিথি কী?', 'आज की तिथि क्या है?'),
    tr('ai.starter.sos', 'How does SOS work?', 'SOS কীভাবে কাজ করে?', 'SOS कैसे काम करता है?'),
  ];

  return (
    <div className="fixed inset-0 z-[9000]" role="dialog" aria-modal="true" aria-label="Ask the assistant">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 sm:mx-auto sm:max-w-lg h-[86dvh] max-h-[86dvh] flex flex-col bg-white rounded-t-3xl shadow-2xl animate-[askSheetIn_0.28s_ease-out]">
        {/* Header */}
        <div className="shrink-0 bg-white/95 backdrop-blur rounded-t-3xl border-b border-amber-100 px-5 pt-4 pb-3 flex items-start justify-between z-10">
          <div>
            <h2 className="text-lg font-extrabold text-stone-900">
              🙏 <T en="Ask" bn="জিজ্ঞাসা করুন" hi="पूछें" />
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              <T
                en="Your Sanatani guide — private by design, your questions never leave this device"
                bn="আপনার সনাতনী পথপ্রদর্শক — সম্পূর্ণ ব্যক্তিগত, আপনার প্রশ্ন এই ডিভাইস ছাড়ে না"
                hi="आपका सनातनी मार्गदर्शक — पूरी तरह निजी, आपके प्रश्न इस डिवाइस को नहीं छोड़ते"
              />
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowVoiceSettings((v) => !v)}
              aria-label={tr('ai.voice.settings', 'Voice settings', 'ভয়েস সেটিংস', 'वाणी सेटिंग्स')}
              title={tr('ai.voice.settings', 'Voice settings', 'ভয়েস সেটিংস', 'वाणी सेटिंग्स')}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-full min-h-[44px] min-w-[44px] text-lg"
            >
              ⚙️
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2 text-stone-400 hover:text-stone-700 rounded-full min-h-[44px] min-w-[44px]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages — or the on-device voice settings panel */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {showVoiceSettings ? (
            <div>
              <button
                type="button"
                onClick={() => setShowVoiceSettings(false)}
                className="mb-3 min-h-[44px] px-2 text-sm font-bold text-amber-700 hover:text-amber-900"
              >
                ←{' '}
                {tr('ai.voice.back', 'Back to conversation', 'কথোপকথনে ফিরুন', 'वार्तालाप पर वापस जाएँ')}
              </button>
              <AiVoiceSettings />
            </div>
          ) : (
            <>
          {messages.length === 0 && !sending && (
            <div className="text-center pt-8 pb-4">
              <div className="text-5xl mb-4">🙏</div>
              <p className="text-[15px] font-bold text-stone-800 max-w-xs mx-auto leading-relaxed">
                <T
                  en="Ask me anything — where things are, how to do them, today's tithi."
                  bn="আমাকে যেকোনো কিছু জিজ্ঞাসা করুন — জিনিস কোথায়, কীভাবে করবেন, আজকের তিথি।"
                  hi="मुझसे कुछ भी पूछें — चीज़ें कहाँ हैं, उन्हें कैसे करें, आज की तिथि।"
                />
              </p>
              <div className="mt-4 flex flex-col gap-2 max-w-xs mx-auto">
                {starters.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="min-h-[48px] px-4 rounded-2xl border border-amber-200 bg-amber-50/70 text-amber-900 text-sm font-bold hover:bg-amber-100 transition-colors text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-amber-600 text-white px-4 py-2.5 text-[15px] font-medium leading-relaxed shadow-sm">
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex justify-start">
                <div className="max-w-[92%]">
                  <div className="rounded-2xl rounded-bl-md bg-stone-100 border border-stone-200/60 px-4 py-3 text-[15px] text-stone-800 leading-relaxed whitespace-pre-wrap">
                    {m.text}
                    {/* requestLocation is a hint, not a CTA — the
                        location_consent card below already owns that flow. */}
                    {m.action && m.action.kind !== 'requestLocation' && (
                      <ActionCta action={m.action} onRun={runAction} />
                    )}
                  </div>

                  {m.kind === 'sos' && (
                    <div className="mt-2.5 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4">
                      <p className="text-sm font-extrabold text-amber-900 mb-1">
                        🛟{' '}
                        <T
                          en="If this is urgent, open SOS now"
                          bn="জরুরি হলে এখনই SOS খুলুন"
                          hi="यदि यह जरूरी है, तो अभी SOS खोलें"
                        />
                      </p>
                      <p className="text-xs text-stone-600 mb-3">
                        <T
                          en="Your trusted circle and nearby responders will be alerted — calmly, step by step."
                          bn="আপনার বিশ্বস্ত বৃত্ত ও কাছের সহায়কদের সতর্ক করা হবে — শান্তভাবে, ধাপে ধাপে।"
                          hi="आपके विश्वस्त मंडल और निकट के सहायकों को सतर्क किया जाएगा — शांति से, चरणबद्ध।"
                        />
                      </p>
                      <Btn onClick={openSosNow} className="w-full !py-3">
                        <T en="Open SOS now 🛟" bn="এখনই SOS খুলুন 🛟" hi="अभी SOS खोलें 🛟" />
                      </Btn>
                    </div>
                  )}

                  {m.kind === 'escalate' && (
                    <div className="mt-2.5 rounded-2xl border border-orange-200 bg-orange-50/70 p-4">
                      <p className="text-sm font-extrabold text-stone-800 mb-1">
                        🪔{' '}
                        <T
                          en="This one deserves a human guide"
                          bn="এটির জন্য মানব পথপ্রদর্শক দরকার"
                          hi="इसके लिए मानव मार्गदर्शक चाहिए"
                        />
                      </p>
                      <p className="text-xs text-stone-600 mb-3">
                        <T
                          en="A Purohitji can walk you through it personally — with warmth and care."
                          bn="একজন পুরোহিতজি আপনাকে ব্যক্তিগতভাবে পথ দেখাতে পারেন — স্নেহ ও যত্নে।"
                          hi="एक पुरोहितजी आपको व्यक्तिगत रूप से मार्ग दिखा सकते हैं — स्नेह और देखभाल के साथ।"
                        />
                      </p>
                      <button
                        type="button"
                        onClick={goToPurohitji}
                        className="min-h-[48px] w-full rounded-2xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-sm font-extrabold px-4 transition-colors shadow-sm"
                      >
                        <T
                          en="Talk to Purohitji 🙏"
                          bn="পুরোহিতজির সাথে কথা বলুন 🙏"
                          hi="पुरोहितजी से बात करें 🙏"
                        />
                      </button>
                    </div>
                  )}

                  {m.kind === 'location_consent' && (
                    <LocationConsentCard
                      lang={currentLang}
                      locating={locatingId === m.id}
                      onAllow={() => handleLocationAllow(m.id)}
                      onDeny={handleLocationDeny}
                    />
                  )}

                  {m.suggestions && m.suggestions.length > 0 && (
                    <SuggestionChips suggestions={m.suggestions} onPick={(s) => void send(s)} />
                  )}
                </div>
              </div>
            )
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-stone-100 border border-stone-200/60 px-4 py-3 text-[15px] text-stone-600">
                <span className="inline-flex items-center gap-2">
                  <span className="flex gap-1" aria-hidden>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:120ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:240ms]" />
                  </span>
                  <T
                    en="Finding your answer… 🙏"
                    bn="আপনার উত্তর খুঁজছি… 🙏"
                    hi="आपका उत्तर खोज रहा हूँ… 🙏"
                  />
                </span>
              </div>
            </div>
          )}
            </>
          )}
        </div>

        {/* One-time gentle nudge for the warmer voice — never a nag */}
        {voiceNudge && !showVoiceSettings && (
          <div className="shrink-0 mx-4 mb-2 rounded-2xl border border-amber-300 bg-amber-50 p-3.5">
            <p className="text-[13px] font-bold text-stone-800">
              {tr(
                'ai.voice.nudgeTitle',
                '🙏 Want a warmer voice?',
                '🙏 উষ্ণতর কণ্ঠ চান?',
                '🙏 उष्ण वाणी चाहेंगे?'
              )}
            </p>
            <p className="mt-0.5 text-xs text-stone-600">
              {tr(
                'ai.voice.nudgeBody',
                'Your assistant can speak more warmly — entirely on your phone, no internet needed after. No pressure: it lives on in Profile → 🗣️ How we speak with you whenever you want it. 🙏',
                'আপনার সহকারী আরও উষ্ণভাবে বলতে পারে — সম্পূর্ণ আপনার ফোনে, পরে ইন্টারনেট ছাড়াই। চাপ নেই: যখনই চান, প্রোফাইল → 🗣️ আমরা আপনার সঙ্গে কীভাবে কথা বলি-তে এটি থাকবে। 🙏',
                'आपका सहायक और भी उष्णता से बोल सकता है — पूरी तरह आपके फ़ोन में, बाद में बिना इंटरनेट। कोई दबाव नहीं: जब चाहें, परिचय → 🗣️ हम आपसे कैसे बात करते हैं में यह रहेगा। 🙏'
              )}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setVoiceNudge(false);
                  setShowVoiceSettings(true);
                }}
                className="flex-1 min-h-[44px] rounded-xl bg-amber-600 text-white text-[13px] font-extrabold px-3"
              >
                {tr('ai.voice.nudgeYes', 'Tell me more', 'আরও জানুন', 'और जानें')}
              </button>
              <button
                type="button"
                onClick={() => {
                  dismissNudgeForever();
                  setVoiceNudge(false);
                }}
                className="flex-1 min-h-[44px] rounded-xl border border-stone-300 bg-white text-stone-600 text-[13px] font-bold px-3"
              >
                {tr('ai.voice.nudgeNo', 'Not now', 'এখন নয়', 'अभी नहीं')}
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="shrink-0 border-t border-amber-100 bg-white px-4 pt-3 rounded-b-3xl"
          style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
        >
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => void clearHistory()}
              className="mb-2 min-h-[44px] px-2 text-xs font-bold text-stone-400 hover:text-stone-600"
            >
              <T en="Clear this conversation" bn="কথোপকথন মুছুন" hi="वार्तालाप साफ़ करें" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              enterKeyHint="send"
              autoComplete="off"
              aria-label={tr('ai.inputLabel', 'Ask the assistant', 'সহকারীকে জিজ্ঞাসা করুন', 'सहायक से पूछें')}
              placeholder={tr(
                'ai.inputPh',
                'Ask… where, how, what 🙏',
                'জিজ্ঞাসা করুন… কোথায়, কীভাবে, কী 🙏',
                'पूछें… कहाँ, कैसे, क्या 🙏'
              )}
              className="flex-1 min-h-[52px] rounded-2xl border-2 border-stone-200 focus:border-amber-500 focus:outline-none px-4 text-[16px] text-stone-900 placeholder:text-stone-400 bg-stone-50"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label={tr('ai.send', 'Send', 'পাঠান', 'भेजें')}
              className="shrink-0 w-[52px] h-[52px] min-w-[52px] min-h-[52px] rounded-full bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-40 disabled:hover:bg-amber-600 text-white text-xl flex items-center justify-center shadow-md transition-colors"
            >
              ↑
            </button>
          </div>
        </form>
      </div>

      {activeGuide && (
        <GuideLauncher guideId={activeGuide} uid={uidKey} onDone={() => setActiveGuide(null)} />
      )}

      <style>{`@keyframes askSheetIn { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};
