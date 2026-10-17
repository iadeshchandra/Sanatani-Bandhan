/**
 * NotificationSettings.tsx — calm, per-category notification controls.
 * ===================================================================
 * Not a wall of toggles: sectioned cards with warm explanations.
 * Driven by Phase 1's NotificationPrefs — the engine already honours
 * every value here (decideRouting in engine.ts).
 *
 * Props: current prefs + onChange (parent persists via writePrefsDoc).
 */

import React from 'react';
import { X, HandCoins, MessageCircle, Sunrise, Sparkles, MoonStar, RotateCcw } from 'lucide-react';
import { NT, pick, useNotifLang } from './NT';
import type { NotificationPrefs, InstantPolicy, SuchanaPolicy } from './preferences';
import type { TriText } from './types';

/* ------------------------------------------------------------------ */

export interface NotificationSettingsProps {
  prefs: NotificationPrefs;
  onChange: (next: NotificationPrefs) => void;
  onClose: () => void;
  onReset?: () => void;
}

const segLabel = (v: 'instant' | 'digest' | 'off'): TriText =>
  v === 'instant'
    ? { en: 'Instant', bn: 'তাৎক্ষণিক', hi: 'तुरंत' }
    : v === 'digest'
      ? { en: 'Digest', bn: 'সারসংক্ষেপ', hi: 'सारांश' }
      : { en: 'Off', bn: 'বন্ধ', hi: 'बंद' };

const suchanaLabel = (v: SuchanaPolicy): TriText =>
  v === 'morning'
    ? { en: 'Morning', bn: 'সকাল', hi: 'सुबह' }
    : v === 'evening'
      ? { en: 'Evening', bn: 'সন্ধ্যা', hi: 'शाम' }
      : { en: 'Off', bn: 'বন্ধ', hi: 'बंद' };

/** Segmented control — min 44px targets, warm selected state. */
function Segmented<T extends string>({
  options,
  value,
  onPick,
  labelFor,
}: {
  options: readonly T[];
  value: T;
  onPick: (v: T) => void;
  labelFor: (v: T) => TriText;
}) {
  const lang = useNotifLang();
  return (
    <div role="radiogroup" className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-stone-100">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onPick(opt)}
            className={`min-h-[44px] rounded-xl text-[13px] font-bold transition-colors ${
              active ? 'bg-amber-700 text-amber-50 shadow' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {pick(labelFor(opt), lang)}
          </button>
        );
      })}
    </div>
  );
}

/** Warm toggle switch, 44px row. */
function Toggle({
  on,
  onFlip,
  label,
}: {
  on: boolean;
  onFlip: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onFlip}
      className="w-[52px] h-[32px] min-h-[32px] shrink-0 rounded-full bg-stone-200 data-[on=true]:bg-amber-600 transition-colors relative"
      data-on={on}
    >
      <span
        className={`absolute top-[3px] w-[26px] h-[26px] rounded-full bg-white shadow transition-all ${
          on ? 'left-[23px]' : 'left-[3px]'
        }`}
        aria-hidden
      />
    </button>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: TriText;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <h3 className="font-serif text-[15px] font-bold text-stone-800">
          <NT text={title} />
        </h3>
      </div>
      {children}
    </section>
  );
}

function Explain({ text }: { text: TriText }) {
  return (
    <p className="text-[13px] leading-relaxed text-stone-500">
      <NT text={text} />
    </p>
  );
}

/* ------------------------------------------------------------------ */

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  prefs,
  onChange,
  onClose,
  onReset,
}) => {
  const lang = useNotifLang();
  const set = (patch: Partial<NotificationPrefs>) => onChange({ ...prefs, ...patch });

  return (
    <div
      className="fixed inset-0 z-[120] bg-stone-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
      role="dialog"
      aria-label={pick({ en: 'Notification settings', bn: 'বিজ্ঞপ্তি সেটিংস', hi: 'सूचना सेटिंग' }, lang)}
      style={{ colorScheme: 'light' }}
    >
      <div className="bg-[#faf7f2] w-full sm:max-w-xl h-[100dvh] sm:h-[88vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-stone-200 bg-white/60">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <h2 className="font-serif text-xl font-bold text-stone-900">
                <NT text={{ en: 'Notification Settings', bn: 'বিজ্ঞপ্তি সেটিংস', hi: 'सूचना सेटिंग' }} />
              </h2>
              <p className="text-[12px] text-stone-500 mt-0.5">
                <NT
                  text={{
                    en: 'Calm, respectful, yours to control.',
                    bn: 'শান্ত, শ্রদ্ধাশীল, আপনার নিয়ন্ত্রণে।',
                    hi: 'शांत, सम्मानपूर्ण, आपके नियंत्रण में।',
                  }}
                />
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={pick({ en: 'Close settings', bn: 'সেটিংস বন্ধ করুন', hi: 'सेटिंग बंद करें' }, lang)}
              className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors"
            >
              <X className="w-5 h-5" aria-hidden />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar">
          {/* Needs your attention */}
          <Section
            icon={<HandCoins className="w-5 h-5" aria-hidden />}
            title={{ en: 'Money requests', bn: 'অর্থ অনুরোধ', hi: 'धन अनुरोध' }}
          >
            <Segmented
              options={['instant', 'digest', 'off'] as const}
              value={prefs.moneyRequests}
              onPick={(v: InstantPolicy) => set({ moneyRequests: v })}
              labelFor={segLabel}
            />
            <Explain
              text={{
                en: 'Money deserves your eyes quickly. Instant notifies right away; Digest holds requests for your morning Suchana.',
                bn: 'অর্থ দ্রুত আপনার নজর পাওয়ার যোগ্য। তাৎক্ষণিক সাথে সাথে জানায়; সারসংক্ষেপ অনুরোধগুলো সকালের সূচনার জন্য রাখে।',
                hi: 'धन पर आपकी नज़र जल्दी पड़नी चाहिए। तुरंत तुरंत सूचित करता है; सारांश अनुरोधों को सुबह की सूचना हेतु रखता है।',
              }}
            />
          </Section>

          <Section
            icon={<MessageCircle className="w-5 h-5" aria-hidden />}
            title={{ en: 'Chat messages', bn: 'বার্তা', hi: 'चैट संदेश' }}
          >
            <Segmented
              options={['instant', 'digest', 'off'] as const}
              value={prefs.chat}
              onPick={(v: InstantPolicy) => set({ chat: v })}
              labelFor={segLabel}
            />
            <Explain
              text={{
                en: 'Conversations stay warm either way — Digest simply gathers them quietly instead of interrupting.',
                bn: 'কথোপকথন যেকোনোভাবেই উষ্ণ থাকে — সারসংক্ষেপ শুধু ব্যাঘাত না করে শান্তভাবে জমা করে।',
                hi: 'बातचीत वैसे भी सौहार्दपूर्ण रहती है — सारांश बस बिना बाधा डाले चुपचाप इकट्ठा करता है।',
              }}
            />
          </Section>

          {/* Gentle updates */}
          <Section
            icon={<Sunrise className="w-5 h-5" aria-hidden />}
            title={{ en: 'Suchana digest', bn: 'সূচনা সারসংক্ষেপ', hi: 'सूचना सारांश' }}
          >
            <Segmented
              options={['morning', 'evening', 'off'] as const}
              value={prefs.suchana}
              onPick={(v: SuchanaPolicy) => set({ suchana: v })}
              labelFor={suchanaLabel}
            />
            <Explain
              text={{
                en: 'Gentle updates arrive in your morning Suchana, never as interruptions. Choose the rhythm that suits your day.',
                bn: 'মৃদু আপডেটগুলো আপনার সকালের সূচনায় আসে, ব্যাঘাত হিসেবে কখনো নয়। আপনার দিনের সাথে মানানসই ছন্দ বেছে নিন।',
                hi: 'सौम्य अपडेट आपकी सुबह की सूचना में आते हैं, बाधा बनकर कभी नहीं। अपने दिन के अनुकूल लय चुनें।',
              }}
            />
          </Section>

          <Section
            icon={<Sparkles className="w-5 h-5" aria-hidden />}
            title={{ en: 'Blessings', bn: 'আশীর্বাদ', hi: 'आशीर्वाद' }}
          >
            <div className="flex items-center justify-between gap-3 min-h-[44px]">
              <Explain
                text={{
                  en: 'Blessings from elders and acharyas, kept soft and occasional.',
                  bn: 'গুরুজন ও আচার্যদের আশীর্বাদ, কোমল ও মাঝে মাঝে।',
                  hi: 'बुज़ुर्गों और आचार्यों के आशीर्वाद, कोमल और कभी-कभार।',
                }}
              />
              <Toggle
                on={prefs.blessings}
                onFlip={() => set({ blessings: !prefs.blessings })}
                label={pick({ en: 'Blessings', bn: 'আশীর্বাদ', hi: 'आशीर्वाद' }, lang)}
              />
            </div>
          </Section>

          {/* Quiet hours */}
          <Section
            icon={<MoonStar className="w-5 h-5" aria-hidden />}
            title={{ en: 'Quiet hours', bn: 'শান্ত সময়', hi: 'शांत समय' }}
          >
            <div className="flex items-center justify-between gap-3 min-h-[44px]">
              <p className="text-[13px] text-stone-600 font-semibold">
                <NT text={{ en: 'Do not disturb', bn: 'বিরক্ত করবেন না', hi: 'परेशान न करें' }} />
              </p>
              <Toggle
                on={prefs.dnd}
                onFlip={() => set({ dnd: !prefs.dnd })}
                label={pick({ en: 'Do not disturb', bn: 'বিরক্ত করবেন না', hi: 'परेशान न करें' }, lang)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-[11px] font-black text-stone-500 uppercase tracking-widest mb-1.5">
                  <NT text={{ en: 'From', bn: 'থেকে', hi: 'से' }} />
                </span>
                <input
                  type="time"
                  value={prefs.quietHours.start}
                  onChange={(e) => set({ quietHours: { ...prefs.quietHours, start: e.target.value } })}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] font-black text-stone-500 uppercase tracking-widest mb-1.5">
                  <NT text={{ en: 'To', bn: 'পর্যন্ত', hi: 'तक' }} />
                </span>
                <input
                  type="time"
                  value={prefs.quietHours.end}
                  onChange={(e) => set({ quietHours: { ...prefs.quietHours, end: e.target.value } })}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </label>
            </div>
            <Explain
              text={{
                en: 'During these hours everything waits — except SOS, which always breaks through. Default is Brahma-muhurta, the stillest part of the day.',
                bn: 'এই সময়ে সব অপেক্ষা করে — SOS ছাড়া, যা সবসময় পৌঁছে যায়। ডিফল্ট ব্রহ্মমুহূর্ত, দিনের সবচেয়ে স্থির প্রহর।',
                hi: 'इन घंटों में सब कुछ प्रतीक्षा करता है — SOS को छोड़कर, जो हमेशा पहुँचता है। डिफ़ॉल्ट ब्रह्ममुहूर्त है, दिन का सबसे शांत प्रहर।',
              }}
            />
          </Section>

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="w-full min-h-[44px] rounded-xl text-[13px] font-bold text-stone-500 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-4 h-4" aria-hidden />
              <NT text={{ en: 'Restore calm defaults', bn: 'শান্ত ডিফল্ট ফিরিয়ে আনুন', hi: 'शांत डिफ़ॉल्ट पुनर्स्थापित करें' }} />
            </button>
          )}

          <p className="text-center text-[11px] text-stone-400 pb-4 px-6 leading-relaxed">
            <NT
              text={{
                en: 'SOS alerts always reach you — no setting here can silence an emergency.',
                bn: 'SOS সতর্কতা সবসময় আপনার কাছে পৌঁছাবে — এখানকার কোনো সেটিং জরুরি অবস্থা নীরব করতে পারে না।',
                hi: 'SOS चेतावनियां हमेशा आप तक पहुँचेंगी — यहाँ की कोई सेटिंग आपातकाल को मौन नहीं कर सकती।',
              }}
            />
          </p>
        </div>
      </div>
    </div>
  );
};
