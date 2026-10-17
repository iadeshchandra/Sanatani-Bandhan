/**
 * notifications/NT.tsx — trilingual text primitive for the center.
 * ================================================================
 * Mirrors the solo/ui `T` contract ({en, bn, hi}) but is safe to render
 * without a LanguageProvider (dev previews, standalone screenshots):
 * it falls back to English when no language context is mounted.
 *
 * `useNotifLang()` also exposes an optional `forceLang` for the
 * language-switcher in the settings preview — never in production.
 */

import React, { createContext, useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import type { TriText } from './types';

export type NotifLang = 'en' | 'bn' | 'hi';

const ForcedLangContext = createContext<NotifLang | null>(null);

/** DEV/preview-only: force a language for screenshots. */
export const ForcedLangProvider: React.FC<{ lang: NotifLang; children: React.ReactNode }> = ({
  lang,
  children,
}) => <ForcedLangContext.Provider value={lang}>{children}</ForcedLangContext.Provider>;

/** Current language: forced (preview) → app LanguageContext → 'en'. */
export function useNotifLang(): NotifLang {
  const forced = useContext(ForcedLangContext);
  if (forced) return forced;
  const appCtx = useContext(LanguageContext);
  const lang = appCtx?.currentLang;
  return lang === 'bn' || lang === 'hi' ? lang : 'en';
}

/** Pick the right string for the current language. */
export function pick(text: TriText, lang: NotifLang): string {
  if (lang === 'bn') return text.bn;
  if (lang === 'hi') return text.hi;
  return text.en;
}

/** Locale-aware label. Every string carries en/bn/hi — no exceptions. */
export const NT: React.FC<{ text: TriText; className?: string; as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' }> = ({
  text,
  className = '',
  as = 'span',
}) => {
  const lang = useNotifLang();
  const Tag = as as 'span';
  return <Tag className={className}>{pick(text, lang)}</Tag>;
};
