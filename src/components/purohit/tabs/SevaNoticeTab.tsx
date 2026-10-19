/* Seva Bazar — the seva-notice composer (Purohit/Jyotish desk only).
 * =====================================================================
 * The ONLY place a service_card can be created. A Purohit/Jyotishi shares
 * "a seva notice" into the Sangam community feed — a SEVA NOTICE, never an
 * ad. Devotee UI never gets this composer; without a verified purohit or
 * jyotish identity the desk renders a warm empty state instead.
 *
 * Editorial guards (mirrored from src/sangam/serviceCard.ts):
 * - 1 service_card per 72h per provider (client-side; Firestore rules
 *   enforce the same line server-side).
 * - Devotional text first (≥30 chars) — the human before the offer.
 * - Cheap-signal ban: no discount/deal language, no scarcity, no
 *   countdowns, no strikethroughs, no shouting.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuthWorkspace } from '../../../context/AuthWorkspaceContext';
import { useToast } from '../../../context/ToastContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useMyPurohitIdentity } from '../useMyPurohitIdentity';
import { useSangam } from '../../../sangam/sangamStore';
import type { AuthorInfo } from '../../../sangam/sangamStore';
import type { AuthorKind, VerificationTier, ServiceCardMode } from '../../../sangam/types';
import {
  buildServiceCardDetails,
  cooldownMessage,
  serviceCardCooldownRemainingMs,
  validateServiceCard,
} from '../../../sangam/serviceCard';
import type { ServiceCardDraft } from '../../../sangam/serviceCard';
import { purohitTierToSevaProTier } from '../../../lib/sevaPro/tierMapping';
import { validateDemoVideoUrl, demoVideoDoc, demoEmbedUrl } from '../../../sangam/sevaBazarVideo';
import { doc, setDoc } from 'firebase/firestore';
import { T } from '../../../solo/ui';
import type { PurohitIdentity, PurohitVerificationTier } from '../../../types/purohit';
import type { JyotishIdentity } from '../../../types/jyotish';

/* ------------------------------------------------------------------ */
/* Provider identity — purohit first, then jyotish.                    */
/* ------------------------------------------------------------------ */

interface ProviderLite {
  uid: string;
  name: string;
  roleId?: string; // PUR-XXXXXX / JYO-XXXXXX
  tier4: PurohitVerificationTier;
  kind: 'purohit' | 'jyotish';
  lineage?: string;
  yearsOfSeva?: number;
}

const fromPurohit = (p: PurohitIdentity): ProviderLite => ({
  uid: p.uid,
  name: p.displayName,
  roleId: p.id,
  tier4: p.verificationTier,
  kind: 'purohit',
  lineage: p.gurukulAffiliation,
  yearsOfSeva: p.experienceYears,
});

const fromJyotish = (j: JyotishIdentity): ProviderLite => ({
  uid: j.uid,
  name: j.displayName,
  roleId: j.id,
  tier4: j.verificationTier,
  kind: 'jyotish',
  lineage: j.parampara,
  yearsOfSeva: j.experienceYears,
});

const EMPTY_DRAFT: ServiceCardDraft = {
  devotionalText: '',
  serviceLine: '',
  dakshina: '',
  currency: 'INR',
  includes: '',
  modes: [],
  availability: '',
  lineage: '',
  photoUrl: '',
  demoVideoUrl: '',
};

const MODE_META: Array<{ id: ServiceCardMode; en: string; hi: string; bn: string; emoji: string }> = [
  { id: 'home', en: 'At your home', hi: 'आपके घर पर', bn: 'আপনার বাড়িতে', emoji: '🏠' },
  { id: 'temple', en: 'At the temple', hi: 'मंदिर में', bn: 'মন্দিরে', emoji: '🛕' },
  { id: 'video', en: 'Over video', hi: 'वीडियो पर', bn: 'ভিডিওতে', emoji: '📹' },
];

const CURRENCY_META: Array<{ id: ServiceCardDraft['currency']; symbol: string; label: string }> = [
  { id: 'INR', symbol: '₹', label: 'INR' },
  { id: 'BDT', symbol: '৳', label: 'BDT' },
  { id: 'USD', symbol: '$', label: 'USD' },
];

export const SevaNoticeTab: React.FC = () => {
  const { identity: purohitIdentity, loading: purohitLoading } = useMyPurohitIdentity();
  const { firebaseUser, soloProfile } = useAuthWorkspace();
  const { posts, createPost } = useSangam();
  const { showToast } = useToast();
  const { currentLang } = useLanguage();
  const msgLang: 'en' | 'hi' | 'bn' = currentLang === 'hi' ? 'hi' : currentLang === 'bn' ? 'bn' : 'en';
  const msg = (en: string, hi: string, bn: string) => (msgLang === 'hi' ? hi : msgLang === 'bn' ? bn : en);

  /* Jyotish identity — mirrors useMyPurohitIdentity against jyotishProfiles. */
  const [jyotishIdentity, setJyotishIdentity] = useState<JyotishIdentity | null>(null);
  const [jyotishLoading, setJyotishLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const uid = firebaseUser?.uid;
      if (!uid) {
        if (!cancelled) {
          setJyotishIdentity(null);
          setJyotishLoading(false);
        }
        return;
      }
      setJyotishLoading(true);
      try {
        const snap = await getDocs(
          query(collection(db, 'jyotishProfiles'), where('uid', '==', uid), limit(1))
        );
        if (!cancelled) {
          setJyotishIdentity(
            snap.empty
              ? null
              : ({ id: snap.docs[0].id, ...(snap.docs[0].data() as Record<string, unknown>) } as JyotishIdentity)
          );
        }
      } catch {
        if (!cancelled) setJyotishIdentity(null);
      } finally {
        if (!cancelled) setJyotishLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [firebaseUser?.uid]);

  const provider: ProviderLite | null = useMemo(() => {
    if (purohitIdentity) return fromPurohit(purohitIdentity);
    if (jyotishIdentity) return fromJyotish(jyotishIdentity);
    return null;
  }, [purohitIdentity, jyotishIdentity]);

  /* One seva notice per 72h per provider — refreshed from the feed posts. */
  const cooldownMs = useMemo(
    () => (provider ? serviceCardCooldownRemainingMs(posts, provider.uid) : 0),
    [posts, provider]
  );

  const [draft, setDraft] = useState<ServiceCardDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const setField = <K extends keyof ServiceCardDraft>(key: K, value: ServiceCardDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const toggleMode = (mode: ServiceCardMode) => {
    const has = draft.modes.includes(mode);
    setField('modes', has ? draft.modes.filter((m) => m !== mode) : [...draft.modes, mode]);
    setErrors((prev) => {
      if (!prev.modes) return prev;
      const next = { ...prev };
      delete next.modes;
      return next;
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || cooldownMs > 0 || submitting) return;

    const violations = validateServiceCard(draft);
    if (violations.length > 0) {
      const errMap: Record<string, string> = {};
      for (const v of violations) {
        if (!errMap[v.field]) errMap[v.field] = v.message;
      }
      setErrors(errMap);
      return;
    }

    const author: AuthorInfo = {
      uid: provider.uid,
      name: provider.name,
      sanId: soloProfile?.id || provider.roleId || provider.uid,
      kind: provider.kind as AuthorKind,
      roleId: provider.roleId,
      tier: provider.tier4 as VerificationTier,
    };

    setSubmitting(true);
    try {
      const created = await createPost(author, {
        kind: 'service_card',
        text: draft.devotionalText.trim().slice(0, 140),
        serviceCard: buildServiceCardDetails(draft, {
          uid: provider.uid,
          name: provider.name,
          tier: purohitTierToSevaProTier(provider.tier4),
          roleId: provider.roleId,
          lineage: provider.lineage,
          yearsOfSeva: provider.yearsOfSeva,
        }),
      });
      // Seva Bazar Phase 3: demo video → sangamVideos (Watch picks it up automatically).
      const { videoId } = validateDemoVideoUrl(draft.demoVideoUrl || '');
      if (videoId && created?.id) {
        try {
          await setDoc(
            doc(db, 'sangamVideos', `seva_demo_${created.id}`),
            demoVideoDoc({
              videoId,
              providerUid: provider.uid,
              providerName: provider.name,
              providerTier: purohitTierToSevaProTier(provider.tier4),
              sharedBy: provider.uid,
              sharedByName: provider.name,
              sharedBySanId: soloProfile?.id || provider.roleId || provider.uid,
              serviceLine: draft.serviceLine.trim(),
              postId: created.id,
            })
          );
        } catch {
          /* demo video write is best-effort — the card itself is live */
        }
      }
      setDraft(EMPTY_DRAFT);
      setErrors({});
      showToast(msg('Your seva notice is live in the community feed 🪔', 'आपकी सेवा सूचना समुदाय फ़ीड में प्रसारित हो गई 🪔', 'আপনার সেবা বিজ্ঞপ্তি সম্প্রদায়ের ফিডে প্রকাশিত হয়েছে 🪔'), 'success');
    } finally {
      setSubmitting(false);
    }
  };

  const devLen = draft.devotionalText.trim().length;
  const lineLen = draft.serviceLine.trim().length;

  /* ------------------------------------------------------------ */
  /* Identity gates — the desk is for verified providers only.      */
  /* ------------------------------------------------------------ */
  if (purohitLoading || jyotishLoading) {
    return (
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6 text-center">
        <p className="text-stone-500 text-sm">
          <T en="Preparing your desk…" hi="आपका डेस्क तैयार हो रहा है…" bn="আপনার ডেস্ক প্রস্তুত হচ্ছে…" />
        </p>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-8 text-center max-w-md mx-auto">
        <div className="text-4xl mb-3">🪔</div>
        <h2 className="text-lg font-black text-stone-900">
          <T en="This desk is for verified providers" hi="यह डेस्क सत्यापित प्रदाताओं के लिए है" bn="এই ডেস্কটি যাচাইকৃত প্রদানকারীদের জন্য" />
        </h2>
        <p className="text-sm text-stone-600 mt-2 leading-relaxed">
          <T
            en="Seva notices are shared by Purohitji and Jyotishji whose identity is verified. Once your provider profile is ready, this composer will open for you."
            hi="सेवा सूचनाएँ सत्यापित पुरोहितजी और ज्योतिषीजी द्वारा साझा की जाती हैं। आपका प्रदाता प्रोफ़ाइल तैयार होते ही यह लेखन-स्थल आपके लिए खुलेगा।"
            bn="সেবা বিজ্ঞপ্তিগুলি যাচাইকৃত পুরোহিতজি ও জ্যোতিষীজি শেয়ার করেন। আপনার প্রদানকারী প্রোফাইল প্রস্তুত হলে এই লেখার স্থান আপনার জন্য খুলবে।"
          />
        </p>
      </div>
    );
  }

  const fieldCls =
    'w-full rounded-xl border bg-stone-50 border-stone-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none px-4 text-sm text-stone-900 min-h-[44px] py-2.5 transition';
  const errCls = 'text-xs text-red-600 mt-1.5 font-medium';
  const labelCls = 'block text-sm font-bold text-stone-800 mb-1.5';

  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4 sm:p-6 max-w-2xl">
      <div className="mb-1">
        <h2 className="text-xl font-black text-stone-900">
          <T en="Share a seva notice 🪔" hi="एक सेवा सूचना साझा करें 🪔" bn="একটি সেবা বিজ্ঞপ্তি শেয়ার করুন 🪔" />
        </h2>
        <p className="text-sm text-stone-500 mt-1 leading-relaxed">
          <T
            en="A seva notice, not an ad. Speak from the heart first — the community will feel it."
            hi="एक सेवा सूचना, विज्ञापन नहीं। पहले दिल से बोलें — समुदाय इसे महसूस करेगा।"
            bn="একটি সেবা বিজ্ঞপ্তি, বিজ্ঞাপন নয়। প্রথমে হৃদয় থেকে বলুন — সম্প্রদায় তা অনুভব করবে।"
          />
        </p>
      </div>

      {cooldownMs > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900 leading-relaxed">
          {cooldownMessage(cooldownMs, msgLang)}
        </div>
      )}

      {errors.tone && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700 leading-relaxed">
          {errors.tone}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-5 space-y-5">
        {/* 1. Devotional text — the human before the offer */}
        <div>
          <label htmlFor="seva-devotional" className={labelCls}>
            <T
              en="First, a few heartfelt words — the human before the offer 🪔"
              hi="पहले कुछ स्नेह-भरे शब्द — प्रस्ताव से पहले मनुष्य 🪔"
              bn="প্রথমে কয়েকটি আন্তরিক কথা — অফারের আগে মানুষ 🪔"
            />
          </label>
          <textarea
            id="seva-devotional"
            rows={4}
            value={draft.devotionalText}
            onChange={(e) => setField('devotionalText', e.target.value)}
            placeholder={msg(
              'Why this seva matters to you, in your own words…',
              'यह सेवा आपके लिए क्यों मायने रखती है, अपने शब्दों में…',
              'এই সেবা আপনার কাছে কেন গুরুত্বপূর্ণ, আপনার নিজের ভাষায়…'
            )}
            className={`${fieldCls} resize-y`}
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className={`text-xs font-medium ${devLen >= 30 ? 'text-emerald-600' : 'text-stone-400'}`}>
              {msg(`${devLen} / 30 characters minimum`, `न्यूनतम ${devLen} / 30 अक्षर`, `সর্বনিম্ন ${devLen} / ৩০ অক্ষর`)}
            </span>
          </div>
          {errors.devotionalText && <p className={errCls}>{errors.devotionalText}</p>}
        </div>

        {/* 2. Service line */}
        <div>
          <label htmlFor="seva-line" className={labelCls}>
            <T en="One clear line: what is this seva?" hi="एक स्पष्ट पंक्ति: यह सेवा क्या है?" bn="একটি স্পষ্ট বাক্য: এই সেবাটি কী?" />
          </label>
          <input
            id="seva-line"
            type="text"
            value={draft.serviceLine}
            maxLength={160}
            onChange={(e) => setField('serviceLine', e.target.value)}
            placeholder={msg(
              'e.g. Rudrabhishek at your home, with full samagri',
              'जैसे — आपके घर पर रुद्राभिषेक, पूर्ण सामग्री सहित',
              'যেমন — আপনার বাড়িতে রুদ্রাভিষেক, সম্পূর্ণ সামগ্রীসহ'
            )}
            className={fieldCls}
          />
          <div className="flex items-center justify-end mt-1.5">
            <span className={`text-xs font-medium ${lineLen > 140 ? 'text-red-600' : 'text-stone-400'}`}>
              {msg(`${lineLen} / 140`, `${lineLen} / 140`, `${lineLen} / ১৪০`)}
            </span>
          </div>
          {errors.serviceLine && <p className={errCls}>{errors.serviceLine}</p>}
        </div>

        {/* 3. Dakshina + currency */}
        <div>
          <label htmlFor="seva-dakshina" className={labelCls}>
            <T en="Suggested dakshina" hi="सुझावित दक्षिणा" bn="প্রস্তাবিত দক্ষিণা" />
          </label>
          <div className="flex gap-2">
            <input
              id="seva-dakshina"
              type="number"
              min={1}
              inputMode="decimal"
              value={draft.dakshina}
              onChange={(e) => setField('dakshina', e.target.value)}
              placeholder={msg('Amount', 'राशि', 'পরিমাণ')}
              className={`${fieldCls} flex-1`}
            />
            <div role="group" aria-label="currency" className="flex rounded-xl border border-stone-200 bg-stone-50 overflow-hidden">
              {CURRENCY_META.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setField('currency', c.id)}
                  aria-pressed={draft.currency === c.id}
                  className={`min-h-[44px] min-w-[56px] px-3 text-sm font-bold transition ${
                    draft.currency === c.id
                      ? 'bg-amber-600 text-white'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {c.symbol}
                </button>
              ))}
            </div>
          </div>
          {errors.dakshina && <p className={errCls}>{errors.dakshina}</p>}
          <p className="text-xs text-stone-400 mt-1.5">
            <T
              en="🛡 Dakshina Suraksha — devotees pay after the seva, never before."
              hi="🛡 दक्षिणा सुरक्षा — श्रद्धालु सेवा के बाद भुगतान करते हैं, पहले कभी नहीं।"
              bn="🛡 দক্ষিণা সুরক্ষা — ভক্তরা সেবার পরে অর্থ প্রদান করেন, আগে কখনও নয়।"
            />
          </p>
        </div>

        {/* 4. What's included */}
        <div>
          <label htmlFor="seva-includes" className={labelCls}>
            <T en="What's included (optional)" hi="क्या-क्या शामिल है (वैकल्पिक)" bn="কী কী অন্তর্ভুক্ত (ঐচ্ছিক)" />
          </label>
          <input
            id="seva-includes"
            type="text"
            value={draft.includes}
            onChange={(e) => setField('includes', e.target.value)}
            placeholder={msg('e.g. includes samagri, prasad for 4', 'जैसे — सामग्री और 4 के लिए प्रसाद सहित', 'যেমন — সামগ্রী ও ৪ জনের প্রসাদসহ')}
            className={fieldCls}
          />
        </div>

        {/* 5. Modes */}
        <div>
          <span className={labelCls}>
            <T en="How is this seva offered?" hi="यह सेवा कैसे दी जाती है?" bn="এই সেবা কীভাবে দেওয়া হয়?" />
          </span>
          <div className="flex flex-wrap gap-2">
            {MODE_META.map((m) => {
              const active = draft.modes.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMode(m.id)}
                  aria-pressed={active}
                  className={`min-h-[44px] px-4 rounded-full border text-sm font-bold transition ${
                    active
                      ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-amber-300'
                  }`}
                >
                  <span className="mr-1.5">{m.emoji}</span>
                  {msgLang === 'hi' ? m.hi : msgLang === 'bn' ? m.bn : m.en}
                </button>
              );
            })}
          </div>
          {errors.modes && <p className={errCls}>{errors.modes}</p>}
        </div>

        {/* 6. Availability */}
        <div>
          <label htmlFor="seva-availability" className={labelCls}>
            <T en="Availability (optional)" hi="उपलब्धता (वैकल्पिक)" bn="উপলব্ধতা (ঐচ্ছিক)" />
          </label>
          <input
            id="seva-availability"
            type="text"
            value={draft.availability}
            onChange={(e) => setField('availability', e.target.value)}
            placeholder={msg('Tithi/muhurat availability, e.g. Ekadashi & weekends', 'तिथि/मुहूर्त उपलब्धता, जैसे — एकादशी और सप्ताहांत', 'তিথি/মুহূর্তের উপলব্ধতা, যেমন — একাদশী ও সপ্তাহান্ত')}
            className={fieldCls}
          />
        </div>

        {/* 7. Lineage */}
        <div>
          <label htmlFor="seva-lineage" className={labelCls}>
            <T en="Lineage (optional)" hi="परंपरा (वैकल्पिक)" bn="পরম্পরা (ঐচ্ছিক)" />
          </label>
          <input
            id="seva-lineage"
            type="text"
            value={draft.lineage}
            onChange={(e) => setField('lineage', e.target.value)}
            placeholder={
              provider.lineage
                ? msg(`Your parampara: ${provider.lineage}`, `आपकी परंपरा: ${provider.lineage}`, `আপনার পরম্পরা: ${provider.lineage}`)
                : msg('e.g. Kashi Shaiva parampara', 'जैसे — काशी शैव परंपरा', 'যেমন — কাশী শৈব পরম্পরা')
            }
            className={fieldCls}
          />
        </div>

        {/* 8. Photo URL */}
        <div>
          <label htmlFor="seva-photo" className={labelCls}>
            <T en="Photo (optional)" hi="फोटो (वैकल्पिक)" bn="ছবি (ঐচ্ছিক)" />
          </label>
          <input
            id="seva-photo"
            type="url"
            inputMode="url"
            value={draft.photoUrl}
            onChange={(e) => setField('photoUrl', e.target.value)}
            placeholder={msg('Paste an image link (https://…)', 'एक छवि लिंक डालें (https://…)', 'একটি ছবির লিঙ্ক দিন (https://…)')}
            className={fieldCls}
          />
        </div>

        {/* 9. Intro video (optional) — Seva Bazar Phase 3 */}
        <div>
          <label htmlFor="seva-video" className={labelCls}>
            <T en="🎬 Intro video (optional)" hi="🎬 परिचय वीडियो (वैकल्पिक)" bn="🎬 পরিচিতিমূলক ভিডিও (ঐচ্ছিক)" />
          </label>
          <input
            id="seva-video"
            type="url"
            inputMode="url"
            value={draft.demoVideoUrl || ''}
            onChange={(e) => setField('demoVideoUrl', e.target.value)}
            placeholder={msg('Paste a YouTube link (https://youtube.com/…)', 'एक YouTube लिंक डालें (https://youtube.com/…)', 'একটি YouTube লিঙ্ক দিন (https://youtube.com/…)')}
            className={fieldCls}
          />
          {(() => {
            const { videoId, error } = validateDemoVideoUrl(draft.demoVideoUrl || '');
            if (error) return <p className={errCls}>{error}</p>;
            if (errors.demoVideoUrl) return <p className={errCls}>{errors.demoVideoUrl}</p>;
            if (videoId) {
              return (
                <div className="mt-2 rounded-xl overflow-hidden border border-stone-200">
                  <img
                    src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                    alt="Video preview"
                    className="w-full aspect-video object-cover"
                    loading="lazy"
                  />
                  <p className="px-3 py-2 text-xs text-emerald-700 bg-emerald-50 font-medium">
                    <T en="✓ Video looks good — devotees will see this in your card and in Watch." hi="✓ वीडियो ठीक है — भक्त इसे आपके कार्ड और Watch में देखेंगे।" bn="✓ ভিডিও ঠিক আছে — ভক্তরা এটি আপনার কার্ডে ও Watch-এ দেখবেন।" />
                  </p>
                </div>
              );
            }
            return (
              <p className="text-xs text-stone-400 mt-1.5">
                <T
                  en="A short video introducing yourself — it appears on your card and in 🪔 Seva Demos."
                  hi="अपना परिचय देने वाला एक छोटा वीडियो — यह आपके कार्ड और 🪔 सेवा डेमो में दिखेगा।"
                  bn="আপনার পরিচয় দেওয়ার একটি ছোট ভিডিও — এটি আপনার কার্ডে ও 🪔 সেবা ডেমোতে দেখাবে।"
                />
              </p>
            );
          })()}
        </div>

        <button
          type="submit"
          disabled={submitting || cooldownMs > 0}
          className="w-full min-h-[48px] rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-base font-black shadow-md transition-all px-6"
        >
          {submitting
            ? msg('Sharing…', 'साझा हो रहा है…', 'শেয়ার হচ্ছে…')
            : cooldownMs > 0
              ? msg('In the sacred rhythm — please wait', 'पवित्र लय में — कृपया प्रतीक्षा करें', 'পবিত্র ছন্দে — অনুগ্রহ করে অপেক্ষা করুন')
              : (
                <T en="🪔 Share this seva notice" hi="🪔 यह सेवा सूचना साझा करें" bn="🪔 এই সেবা বিজ্ঞপ্তি শেয়ার করুন" />
              )}
        </button>

        <p className="text-center text-xs text-stone-400 leading-relaxed">
          <T
            en="One notice every 3 days keeps the feed sacred. Seva is never on sale here. 🙏"
            hi="हर 3 दिन में एक सूचना फ़ीड को पवित्र रखती है। यहाँ सेवा कभी बिक्री पर नहीं होती। 🙏"
            bn="প্রতি ৩ দিনে একটি বিজ্ঞপ্তি ফিডকে পবিত্র রাখে। এখানে সেবা কখনো বিক্রিতে থাকে না। 🙏"
          />
        </p>
      </form>
    </div>
  );
};

export default SevaNoticeTab;
