import { useCallback, useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useLanguage } from '../../context/LanguageContext';
import {
  APP_VERSION,
  CHECK_INTERVAL_MS,
  dismissFor,
  fetchDeployedVersion,
  isUpdateAvailable,
  markChecked,
  shouldCheckNow,
  wasDismissedFor,
  type VersionManifest,
} from '../../lib/appVersion';

/**
 * Bulletproof PWA update prompt.
 *
 * Two independent update signals:
 *  1. Service worker `needRefresh` (vite-plugin-pwa, registerType 'prompt')
 *  2. Version handshake — /version.json (cache:'no-store') vs the baked-in
 *     __APP_VERSION__. Catches the Firebase CDN edge-inconsistency case
 *     where a stale index.html is served and the SW never notices.
 *
 * Normal updates: calm, dismissable bottom banner ("Suchana, not notification").
 * Critical updates (version.json critical:true): blocking modal until applied.
 * Offline: everything fails silently, app keeps working.
 */

type Lang = 'en' | 'bn' | 'hi';

const COPY: Record<Lang, {
  title: string; body: string; update: string; later: string;
  criticalTitle: string; criticalBody: string; updating: string;
}> = {
  en: {
    title: 'A new version is available',
    body: 'Update to receive the latest improvements and fixes.',
    update: 'Update now',
    later: 'Later',
    criticalTitle: 'Important update required',
    criticalBody: 'This update fixes an important issue. Please update to continue.',
    updating: 'Updating…',
  },
  bn: {
    title: 'নতুন সংস্করণ উপলব্ধ',
    body: 'সর্বশেষ উন্নতি ও সংশোধন পেতে আপডেট করুন।',
    update: 'এখনই আপডেট করুন',
    later: 'পরে',
    criticalTitle: 'গুরুত্বপূর্ণ আপডেট প্রয়োজন',
    criticalBody: 'এই আপডেট একটি গুরুত্বপূর্ণ সমস্যার সমাধান করে। চালিয়ে যেতে আপডেট করুন।',
    updating: 'আপডেট হচ্ছে…',
  },
  hi: {
    title: 'नया संस्करण उपलब्ध है',
    body: 'नवीनतम सुधार और समाधान पाने के लिए अपडेट करें।',
    update: 'अभी अपडेट करें',
    later: 'बाद में',
    criticalTitle: 'महत्वपूर्ण अपडेट आवश्यक',
    criticalBody: 'यह अपडेट एक महत्वपूर्ण समस्या का समाधान करता है। जारी रखने के लिए कृपया अपडेट करें।',
    updating: 'अपडेट हो रहा…',
  },
};

function pickLang(raw: string | undefined): Lang {
  const l = (raw || '').toLowerCase();
  if (l.startsWith('bn')) return 'bn';
  if (l.startsWith('hi')) return 'hi';
  return 'en';
}

export function UpdatePrompt() {
  const { currentLang } = useLanguage();
  const lang = pickLang(currentLang);
  const t = COPY[lang];

  const { needRefresh: [swNeedRefresh], updateServiceWorker } = useRegisterSW();
  const [manifest, setManifest] = useState<VersionManifest | null>(null);
  const [updating, setUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Version handshake — runs on mount and every CHECK_INTERVAL_MS.
  const checkVersion = useCallback(async () => {
    const m = await fetchDeployedVersion();
    markChecked();
    if (m && isUpdateAvailable(m)) {
      setManifest(m);
    }
  }, []);

  useEffect(() => {
    // Initial check (slight delay so startup isn't competing with auth).
    const initial = window.setTimeout(() => {
      if (shouldCheckNow()) void checkVersion();
    }, 8000);
    timerRef.current = window.setInterval(() => {
      void checkVersion();
    }, CHECK_INTERVAL_MS);
    // Re-check when the tab becomes visible again (user returns after deploy).
    const onVisible = () => {
      if (document.visibilityState === 'visible' && shouldCheckNow()) void checkVersion();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(initial);
      if (timerRef.current) window.clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [checkVersion]);

  const swUpdateAvailable = swNeedRefresh === true;
  const handshakeUpdateAvailable = manifest !== null && !wasDismissedFor(manifest.version);
  const showPrompt = !updating && !dismissed && (swUpdateAvailable || handshakeUpdateAvailable);
  const isCritical = manifest?.critical === true && handshakeUpdateAvailable;

  const applyUpdate = useCallback(async () => {
    setUpdating(true);
    try {
      // Activate the waiting service worker (if any) then reload onto the
      // fresh bundle. updateServiceWorker(true) skips waiting + reloads.
      await updateServiceWorker(true);
    } catch {
      // SW path failed (e.g. no SW, or handshake-only detection) — force a
      // hard reload bypassing HTTP cache to pick up the new bundle.
      window.location.reload();
    }
  }, [updateServiceWorker]);

  const onLater = useCallback(() => {
    if (manifest) dismissFor(manifest.version);
    setDismissed(true);
  }, [manifest]);

  if (!showPrompt) return null;

  // ── Critical: blocking modal ──────────────────────────────────────────
  if (isCritical) {
    return (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="sb-update-critical-title"
      >
        <div className="w-full max-w-sm rounded-3xl bg-stone-950 border border-amber-500/40 p-6 shadow-2xl text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center text-3xl">
            🪔
          </div>
          <h2 id="sb-update-critical-title" className="text-lg font-extrabold text-amber-100 mb-2">
            {t.criticalTitle}
          </h2>
          <p className="text-sm text-stone-300 mb-5 leading-relaxed">{t.criticalBody}</p>
          <button
            type="button"
            onClick={applyUpdate}
            disabled={updating}
            className="w-full min-h-[48px] rounded-2xl bg-amber-500 text-stone-950 text-base font-extrabold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {updating ? t.updating : t.update}
          </button>
          <p className="mt-3 text-[11px] text-stone-500">
            {APP_VERSION}
          </p>
        </div>
      </div>
    );
  }

  // ── Normal: calm dismissable banner ────────────────────────────────────
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto" role="status" aria-live="polite">
      <div className="bg-stone-950 border border-amber-500/30 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 text-xl">
          🪔
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-amber-100 leading-tight">{t.title}</p>
          <p className="text-xs text-stone-400 leading-snug mt-0.5">{t.body}</p>
        </div>
        <button
          type="button"
          onClick={applyUpdate}
          disabled={updating}
          className="px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-500 text-stone-950 text-sm font-bold hover:brightness-110 active:scale-[0.98] transition-all shrink-0 disabled:opacity-60"
        >
          {updating ? t.updating : t.update}
        </button>
        <button
          type="button"
          onClick={onLater}
          aria-label={t.later}
          className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl text-stone-500 hover:text-stone-300 shrink-0 text-lg leading-none"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
