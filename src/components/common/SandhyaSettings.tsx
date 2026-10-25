/**
 * SandhyaSettings.tsx — VIBE B3: Sandhya Mode (dusk theme) controls.
 * ============================================================================
 * One self-contained section, mounted in the devotee Profile and in
 * Master Settings beside the classic theme switch. Three choices —
 * Off / On / Automatic at dusk — every one the user's, persisted on
 * the device via lib/sandhyaMode. "Automatic" only ever applies the
 * dusk window the copy names (17:30–21:00 local); it never overrides
 * a manual On/Off, and Off is the default.
 *
 * All strings come from the dictionary (`vibe.sandhya*`, authored in
 * all 10 languages) — no inline copy.
 *
 * `SandhyaApplier` is the root mount: it applies the persisted mode
 * on boot and re-checks on a slow tick so the Automatic window edges
 * (dusk arriving, 21:00 rest) land while the app is open.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  applySandhya,
  getSandhyaMode,
  isSandhyaActive,
  setSandhyaMode,
  SANDHYA_CHANGED_EVENT,
  type SandhyaMode,
} from '../../lib/sandhyaMode';

export function useSandhyaModeState(): {
  mode: SandhyaMode;
  active: boolean;
  choose: (m: SandhyaMode) => void;
} {
  const [mode, setMode] = useState<SandhyaMode>(() => getSandhyaMode());
  const [active, setActive] = useState<boolean>(() => isSandhyaActive(getSandhyaMode()));

  const refresh = useCallback(() => {
    const m = getSandhyaMode();
    setMode(m);
    setActive(applySandhya());
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 30000);
    window.addEventListener(SANDHYA_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(SANDHYA_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  const choose = useCallback((m: SandhyaMode) => {
    setSandhyaMode(m);
    setMode(m);
    setActive(isSandhyaActive(m));
  }, []);

  return { mode, active, choose };
}

/** Root mount — renders nothing, keeps <html data-sandhya> honest. */
export const SandhyaApplier: React.FC = () => {
  useSandhyaModeState();
  return null;
};

export const SandhyaSettings: React.FC = () => {
  const { t } = useLanguage();
  const { mode, active, choose } = useSandhyaModeState();

  const options: Array<{ id: SandhyaMode; label: string }> = [
    { id: 'off', label: t('vibe.sandhyaOff') },
    { id: 'on', label: t('vibe.sandhyaOn') },
    { id: 'auto', label: t('vibe.sandhyaAuto') },
  ];

  return (
    <section
      aria-label={t('vibe.sandhyaTitle')}
      className="rounded-3xl border border-amber-200/70 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0" aria-hidden>
          🪔
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold text-stone-900">{t('vibe.sandhyaTitle')}</h3>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">{t('vibe.sandhyaDesc')}</p>
        </div>
        {active && (
          <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2.5 py-1">
            🪔 {t('vibe.sandhyaOn')}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4" role="radiogroup" aria-label={t('vibe.sandhyaTitle')}>
        {options.map((o) => {
          const selected = mode === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => choose(o.id)}
              className={`min-h-[44px] rounded-xl px-3 py-2.5 text-xs font-black transition-colors cursor-pointer ${
                selected
                  ? 'bg-amber-500 text-temple-950 shadow-md shadow-amber-600/20'
                  : 'bg-stone-50 border border-stone-200 text-stone-600 hover:border-amber-300'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-stone-400 mt-3 leading-relaxed">{t('vibe.sandhyaAutoNote')}</p>
    </section>
  );
};

export default SandhyaSettings;
