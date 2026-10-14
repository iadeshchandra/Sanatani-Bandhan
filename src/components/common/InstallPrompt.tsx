import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * InstallPrompt — captures the Android beforeinstallprompt event and shows
 * a tasteful "Install App" banner. On iOS, shows manual instructions since
 * Safari doesn't fire the event.
 * Dismissal is remembered in localStorage.
 */
export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('sb_install_dismissed') === '1') {
        setDismissed(true);
        return;
      }
    } catch { /* ignore */ }

    // Already installed — never show
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS: no beforeinstallprompt — show hint after 30s if not installed
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIOS && !(navigator as any).standalone) {
      iosTimer = setTimeout(() => setShowIOSHint(true), 30000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    setShowIOSHint(false);
    setDeferredPrompt(null);
    try { localStorage.setItem('sb_install_dismissed', '1'); } catch { /* ignore */ }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') dismiss();
    setDeferredPrompt(null);
  };

  if (dismissed) return null;

  // Android / Chrome install banner
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
        <div className="bg-slate-900 border border-saffron-500/30 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-saffron-500/15 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-saffron-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Install Sanatani Bandhan</p>
            <p className="text-xs text-slate-400">Full-screen app, works offline, faster access.</p>
          </div>
          <button
            onClick={handleInstall}
            className="px-4 py-2.5 min-h-[44px] rounded-xl bg-saffron-500 text-slate-950 text-sm font-bold hover:brightness-110 transition-all shrink-0"
          >
            Install
          </button>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl text-slate-500 hover:text-slate-300 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // iOS manual hint
  if (showIOSHint) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
        <div className="bg-slate-900 border border-saffron-500/30 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-saffron-500/15 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-saffron-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Add to Home Screen</p>
              <p className="text-xs text-slate-400 mt-1">
                Tap <span className="text-slate-200 font-medium">Share</span> →{' '}
                <span className="text-slate-200 font-medium">Add to Home Screen</span> for the full app experience.
              </p>
            </div>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl text-slate-500 hover:text-slate-300 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default InstallPrompt;
