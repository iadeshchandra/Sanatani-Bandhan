/**
 * GetAppPage — the /get-app smart link + landing page.
 * =====================================================
 * PHASE 1 (smart link):
 * - On mobile, probes the native app via the custom scheme
 *   (sanatanibandhan://home). If the OS claims it, the visitor leaves;
 *   otherwise the 1.5s timer fires and the landing content renders.
 *   Never a dead end.
 * - Reads ?c=, validates it against appGrowthCampaigns (fail-open), and
 *   personalises the hero when the campaign carries a temple name.
 * - Logs one anonymous scan per page load (StrictMode-safe).
 * - Fallback chain: store link → PWA → web app. "Coming soon" + one-tap
 *   "Notify me" when the Play listing isn't live yet.
 *
 * PHASE 2 (landing): hero above the fold with a device-appropriate
 * primary CTA; everything below the fold lazy-loads for a <2s first
 * paint. Trilingual EN/BN/HI with browser-language auto-detect on
 * first visit and a visible switcher.
 */
import React, { Suspense, useEffect, useState } from 'react';
import { Bell, Check, Download, Play, QrCode, Share, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '../context/LanguageContext';
import { Tr } from './tr';
import { IosPwaGuide } from './IosPwaGuide';
import { useAppGrowth } from './useAppGrowth';
import { attemptNativeAppOpen } from './deepLink';
import { buildSmartLinkUrl } from './deviceDetect';
import { addToWaitlist } from './growthService';
import type { GrowthPlatform } from './types';
import './appgrowth.css';

const GetAppSections = React.lazy(() => import('./GetAppSections'));

/* ------------------------------------------------------------------ */
/* Language switcher                                                   */
/* ------------------------------------------------------------------ */

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'bn', label: 'বাং' },
  { code: 'hi', label: 'हिं' },
];

const LanguageSwitcher: React.FC = () => {
  const { currentLang, changeLanguage } = useLanguage();
  return (
    <div
      className="flex items-center gap-1 rounded-full border border-orange-200/60 bg-white/70 p-1 backdrop-blur"
      role="group"
      aria-label="Language"
    >
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => changeLanguage(l.code)}
          aria-pressed={currentLang === l.code}
          className={`min-h-[36px] min-w-[44px] rounded-full px-3 text-xs font-extrabold transition-all ${
            currentLang === l.code
              ? 'bg-stone-900 text-white shadow'
              : 'text-stone-600 hover:bg-orange-100'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Primary CTA cluster — device-appropriate, shared by hero + final CTA */
/* ------------------------------------------------------------------ */

interface CtaClusterProps {
  platform: GrowthPlatform;
  playStoreUrl: string;
  playStoreLive: boolean;
  hasInstallPrompt: boolean;
  onInstallPwa: () => void;
  onOpenIosGuide: () => void;
  loading: boolean;
  compact?: boolean;
}

const primaryBtn =
  'inline-flex min-h-[56px] items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 px-8 text-base font-black text-white shadow-xl shadow-orange-500/30 transition-transform active:scale-[0.98]';

const ghostBtn =
  'inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border-2 border-orange-200 bg-white/80 px-6 text-base font-extrabold text-stone-800 transition-colors hover:border-orange-300';

const CtaCluster: React.FC<CtaClusterProps> = ({
  platform,
  playStoreUrl,
  playStoreLive,
  hasInstallPrompt,
  onInstallPwa,
  onOpenIosGuide,
  loading,
  compact,
}) => {
  const [waitlist, setWaitlist] = useState<'idle' | 'sending' | 'done'>('idle');

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 sm:flex-row" aria-hidden="true">
        <div className="h-14 w-64 animate-pulse rounded-2xl bg-orange-200/60" />
        <div className="h-14 w-56 animate-pulse rounded-2xl bg-stone-200/60" />
      </div>
    );
  }

  const notifyMe = async () => {
    if (waitlist !== 'idle') return;
    setWaitlist('sending');
    await addToWaitlist(platform);
    // Fail-open: even if the write failed, thank them warmly — the
    // page must never punish the visitor for a backend hiccup.
    setWaitlist('done');
  };

  const webAppBtn = (
    <a key="webapp" href="/app" className={compact ? ghostBtn + ' text-sm px-5 min-h-[48px]' : ghostBtn}>
      <Smartphone className="h-5 w-5 text-orange-600" />
      <Tr
        en="Use instantly — no install needed"
        bn="সাথে সাথে ব্যবহার করুন — ইনস্টলের দরকার নেই"
        hi="तुरंत इस्तेमाल करें — इंस्टॉल की ज़रूरत नहीं"
      />
    </a>
  );

  // ---- Android: one-tap PWA install → Play badge → coming-soon/notify
  if (platform === 'android') {
    return (
      <div className="flex w-full flex-col items-center gap-3">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          {hasInstallPrompt && (
            <button key="install" type="button" onClick={onInstallPwa} className={primaryBtn}>
              <Download className="h-5 w-5" />
              <Tr en="Install in one tap" bn="এক ট্যাপে ইনস্টল করুন" hi="एक टैप में इंस्टॉल करें" />
            </button>
          )}
          {playStoreLive && playStoreUrl && (
            <a
              key="play"
              href={playStoreUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[56px] items-center gap-3 rounded-2xl bg-stone-900 px-6 text-white shadow-xl transition-transform active:scale-[0.98]"
            >
              <Play className="h-7 w-7 fill-current" />
              <span className="text-left leading-tight">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  <Tr en="Get it on" bn="ডাউনলোড করুন" hi="डाउनलोड करें" gloss={false} />
                </span>
                <span className="block text-lg font-black">Google Play</span>
              </span>
            </a>
          )}
          {!hasInstallPrompt && !(playStoreLive && playStoreUrl) && waitlist === 'idle' && (
            <button key="notify" type="button" onClick={notifyMe} className={primaryBtn}>
              <Bell className="h-5 w-5" />
              <span className="text-left leading-tight">
                <span className="block text-sm font-black">
                  <Tr en="Notify me when it launches" bn="চালু হলে আমাকে জানান" hi="लॉन्च होने पर मुझे बताएँ" />
                </span>
                <span className="block text-xs font-medium opacity-80">
                  <Tr en="Coming soon to the Play Store" bn="প্লে স্টোরে শীঘ্রই আসছে" hi="प्ले स्टोर पर जल्द आ रहा है" gloss={false} />
                </span>
              </span>
            </button>
          )}
          {!hasInstallPrompt && !(playStoreLive && playStoreUrl) && waitlist === 'sending' && (
            <div key="sending" className="inline-flex min-h-[56px] items-center gap-2 px-6 text-sm font-bold text-stone-600">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
              <Tr en="Saving…" bn="সংরক্ষণ হচ্ছে…" hi="सहेजा जा रहा है…" gloss={false} />
            </div>
          )}
          {!hasInstallPrompt && !(playStoreLive && playStoreUrl) && waitlist === 'done' && (
            <p key="done" className="inline-flex min-h-[56px] items-center gap-2 rounded-2xl bg-green-50 border border-green-200 px-6 text-sm font-extrabold text-green-800">
              <Check className="h-5 w-5" />
              <Tr
                en="Dhanyavaad! We'll tell you the moment it launches 🙏"
                bn="ধন্যবাদ! চালু হলেই জানিয়ে দেব 🙏"
                hi="धन्यवाद! लॉन्च होते ही बता देंगे 🙏"
                gloss={false}
              />
            </p>
          )}
          {webAppBtn}
        </div>
      </div>
    );
  }

  // ---- iOS: guided "Add to Home Screen" (no beforeinstallprompt on Safari)
  if (platform === 'ios') {
    return (
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <button type="button" onClick={onOpenIosGuide} className={primaryBtn}>
          <Share className="h-5 w-5" />
          <Tr en="Add to Home Screen" bn="হোম স্ক্রিনে যোগ করুন" hi="होम स्क्रीन पर जोड़ें" />
        </button>
        {webAppBtn}
      </div>
    );
  }

  // ---- Desktop: branded QR so the phone does the work
  if (platform === 'desktop') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-3xl border border-orange-200 bg-white p-5 shadow-xl">
          <QRCodeSVG
            value={buildSmartLinkUrl(null)}
            size={168}
            bgColor="#ffffff"
            fgColor="#1c0e05"
            level="M"
            aria-label="QR code linking to this page"
          />
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-extrabold text-stone-600">
            <QrCode className="h-4 w-4 text-orange-600" />
            <Tr en="Scan with your phone to begin" bn="শুরু করতে ফোন দিয়ে স্ক্যান করুন" hi="शुरू करने के लिए फ़ोन से स्कैन करें" />
          </p>
        </div>
        {webAppBtn}
      </div>
    );
  }

  // ---- Unknown: PWA prompt when available, otherwise the web app
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
      {hasInstallPrompt && (
        <button type="button" onClick={onInstallPwa} className={primaryBtn}>
          <Download className="h-5 w-5" />
          <Tr en="Install the app" bn="অ্যাপ ইনস্টল করুন" hi="ऐप इंस्टॉल करें" />
        </button>
      )}
      {webAppBtn}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* GetAppPage — smart-link orchestration + landing                     */
/* ------------------------------------------------------------------ */

export const GetAppPage: React.FC = () => {
  const { platform, config, campaign, loading, deferredPrompt, installPwa } =
    useAppGrowth();
  const { changeLanguage } = useLanguage();

  // The app boot splash ("Initializing Secure Environment…") is the wrong
  // context for a public landing page and would cover the hero for ~4s —
  // remove it as soon as this page mounts. main.tsx's delayed remover
  // no-ops when the element is already gone.
  useEffect(() => {
    try {
      document.getElementById('sb-splash-screen')?.remove();
    } catch {
      /* non-DOM environment — ignore */
    }
  }, []);

  // Phase 1: probe the native app on mobile. While probing we show a
  // calm interstitial; if the OS claims the scheme the visitor leaves
  // and this page never renders. Desktop/unknown render immediately.
  const [probing, setProbing] = useState(platform === 'android' || platform === 'ios');
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    if (platform !== 'android' && platform !== 'ios') {
      setProbing(false);
      return;
    }
    let cancelled = false;
    attemptNativeAppOpen().then(({ claimed }) => {
      // Claimed → stay on the interstitial; the OS is switching apps.
      if (!cancelled && !claimed) setProbing(false);
    });
    return () => {
      cancelled = true;
    };
  }, [platform]);

  // Auto-detect the browser language on first visit only — never
  // override an explicit choice stored from an earlier session.
  useEffect(() => {
    try {
      if (localStorage.getItem('sanatani_lang')) return;
      const nav = (navigator.language || '').toLowerCase();
      if (nav.startsWith('bn')) changeLanguage('bn');
      else if (nav.startsWith('hi')) changeLanguage('hi');
    } catch {
      /* storage unavailable — stay in English */
    }
  }, [changeLanguage]);

  const cta = (
    <CtaCluster
      platform={platform}
      playStoreUrl={config.playStoreUrl}
      playStoreLive={config.playStoreLive}
      hasInstallPrompt={deferredPrompt !== null}
      onInstallPwa={() => void installPwa()}
      onOpenIosGuide={() => setGuideOpen(true)}
      loading={loading}
    />
  );

  if (probing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#2b1408] px-6 text-center text-orange-50">
        <div className="ag-diya-glow mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/30 to-amber-400/10 text-5xl">
          🪔
        </div>
        <p className="text-lg font-extrabold">
          <Tr
            en="Opening Sanatani Bandhan…"
            bn="সনাতনী বন্ধন খুলছে…"
            hi="सनातनी बंधन खुल रहा है…"
            gloss={false}
          />
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] font-sans text-stone-900 selection:bg-orange-500 selection:text-white">
      {/* Header: brand + visible language switcher */}
      <header className="sticky top-0 z-40 border-b border-orange-100 bg-[#FFF8F0]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <a href="/" className="flex items-center gap-2.5" aria-label="Sanatani Bandhan home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 text-lg shadow-md shadow-orange-500/25">
              🪔
            </span>
            <span className="text-sm font-black tracking-wide sm:text-base">
              SANATANI BANDHAN
            </span>
          </a>
          <LanguageSwitcher />
        </div>
      </header>

      {/* 1. Hero */}
      <section className="relative overflow-hidden bg-[#2b1408] text-orange-50">
        {/* temple-gradient + diya glow backdrop */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, #4a1710 0%, #2b1408 60%, #1c0e05 100%)',
          }}
          aria-hidden="true"
        />
        <div
          className="ag-diya-glow pointer-events-none absolute left-1/2 top-24 h-[380px] w-[380px] -translate-x-1/2 rounded-full sm:h-[520px] sm:w-[520px]"
          style={{
            background:
              'radial-gradient(circle, rgba(251,191,36,0.35) 0%, rgba(251,191,36,0) 70%)',
          }}
          aria-hidden="true"
        />
        <div className="ag-flame pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 text-6xl sm:text-7xl" aria-hidden="true">
          🪔
        </div>

        <div className="relative mx-auto max-w-3xl px-5 pb-16 pt-24 text-center sm:pb-24 sm:pt-28">
          {/* Campaign personalization */}
          {campaign?.templeName && (
            <p className="mx-auto mb-5 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-amber-300/40 bg-amber-300/10 px-5 py-2 text-sm font-extrabold text-amber-200">
              <Tr
                en={`Welcome from ${campaign.templeName} 🪔`}
                bn={`${campaign.templeName}-এর পক্ষ থেকে স্বাগতম 🪔`}
                hi={`${campaign.templeName} की ओर से स्वागत है 🪔`}
                gloss={false}
              />
            </p>
          )}

          <p className="mb-4 text-[11px] font-extrabold uppercase tracking-[0.24em] text-amber-300/90">
            <Tr en="Sanatani Bandhan · The App" bn="সনাতনী বন্ধন · অ্যাপ" hi="सनातनी बंधन · ऐप" gloss={false} />
          </p>
          <h1 className="mx-auto mb-4 max-w-2xl text-4xl font-black leading-[1.08] tracking-tight sm:text-6xl">
            <Tr
              en="Your entire Sanatani life, in one app"
              bn="আপনার সম্পূর্ণ সনাতনী জীবন, এখন এক অ্যাপে"
              hi="आपका संपूर्ण सनातनी जीवन, अब एक ऐप में"
              gloss={false}
            />
          </h1>
          <p className="mx-auto mb-9 max-w-xl text-base font-medium text-orange-100/85 sm:text-lg">
            <Tr
              en="Temples, festivals, donations, community — begin your journey 🙏"
              bn="মন্দির, উৎসব, দান, সম্প্রদায় — আপনার যাত্রা শুরু করুন 🙏"
              hi="मंदिर, उत्सव, दान, समुदाय — अपनी यात्रा शुरू करें 🙏"
              gloss={false}
            />
          </p>

          {/* Primary CTA — above the fold */}
          <div className="flex justify-center">{cta}</div>

          <p className="mt-6 text-xs font-medium text-orange-100/60">
            <Tr
              en="Free for devotees · Works offline · English, हिन्दी, বাংলা"
              bn="ভক্তদের জন্য বিনামূল্যে · অফলাইনে চলে · English, हिन्दी, বাংলা"
              hi="भक्तों के लिए निःशुल्क · ऑफ़लाइन चलता है · English, हिन्दी, বাংলা"
              gloss={false}
            />
          </p>
        </div>
      </section>

      {/* 2. One-tap download / PWA advantage band */}
      <section className="border-b border-orange-100 bg-white px-5 py-10">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-500/25">
            <Smartphone className="h-8 w-8" />
          </span>
          <div className="flex-1">
            <h2 className="mb-1.5 text-xl font-black sm:text-2xl">
              <Tr
                en="Use instantly as a web app — no install needed"
                bn="ওয়েব অ্যাপ হিসেবে সাথে সাথে ব্যবহার করুন — ইনস্টলের দরকার নেই"
                hi="वेब ऐप के रूप में तुरंत इस्तेमाल करें — इंस्टॉल की ज़रूरत नहीं"
              />
            </h2>
            <p className="text-sm leading-relaxed text-stone-600 sm:text-[15px]">
              <Tr
                en="The PWA advantage: zero friction. Open it right now, use it offline after your first visit, and install it later whenever you like."
                bn="পিডব্লিউএ সুবিধা: কোনো ঝামেলা নেই। এখনই খুলুন, প্রথম ভিজিটের পর অফলাইনে ব্যবহার করুন, আর যখন খুশি ইনস্টল করুন।"
                hi="PWA की सुविधा: कोई झंझट नहीं। अभी खोलें, पहली विज़िट के बाद ऑफ़लाइन इस्तेमाल करें, और जब चाहें इंस्टॉल करें।"
                gloss={false}
              />
            </p>
          </div>
          <a
            href="/app"
            className="inline-flex min-h-[52px] shrink-0 items-center justify-center rounded-2xl bg-stone-900 px-7 text-sm font-black text-white transition-transform active:scale-[0.98]"
          >
            <Tr en="Open the web app" bn="ওয়েব অ্যাপ খুলুন" hi="वेब ऐप खोलें" />
          </a>
        </div>
      </section>

      {/* Below the fold — lazy chunk for a <2s first paint */}
      <Suspense
        fallback={
          <div className="bg-[#FFF8F0] px-5 py-16" aria-hidden="true">
            <div className="mx-auto max-w-5xl space-y-4">
              <div className="h-8 w-48 animate-pulse rounded-full bg-orange-100" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-44 animate-pulse rounded-3xl bg-orange-50" />
                ))}
              </div>
            </div>
          </div>
        }
      >
        <GetAppSections cta={cta} />
      </Suspense>

      <IosPwaGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
};

export default GetAppPage;
