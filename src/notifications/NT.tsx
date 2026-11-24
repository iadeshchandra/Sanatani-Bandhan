/**
 * notifications/NT.tsx — text primitive for the center.
 * ================================================================
 * Mirrors the solo/ui `T` contract but is safe to render without a
 * LanguageProvider (dev previews, standalone screenshots): it falls
 * back to English when no language context is mounted.
 *
 * WAVE 3 (2026-11-24): the centre speaks all ten app languages. Items
 * carry en/bn/hi always, plus any draft language the producing device
 * resolved from the dictionary (surfaces.notify); `pick` reads the
 * reader's language and falls back to English when the slot is absent.
 *
 * `useNotifLang()` also exposes an optional `forceLang` for the
 * language-switcher in the settings preview — never in production.
 */

import React, { createContext, useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import type { TriText } from './types';

export type NotifLang = 'en' | 'bn' | 'hi' | 'ta' | 'te' | 'mr' | 'gu' | 'kn' | 'ml' | 'sa';

const NOTIF_LANGS: readonly string[] = ['en', 'bn', 'hi', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'sa'];

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
  return lang && NOTIF_LANGS.includes(lang) ? (lang as NotifLang) : 'en';
}

/** Pick the right string for the language; English when the slot is absent. */
export function pick(text: TriText, lang: NotifLang): string {
  if (lang === 'en') return text.en;
  const v = text[lang];
  return v !== undefined && v !== '' ? v : text.en;
}

/** Locale-aware label. Every string carries en/bn/hi — no exceptions. */export const NT: React.FC<{ text: TriText; className?: string; as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' }> = ({
  text,
  className = '',
  as = 'span',
}) => {
  const lang = useNotifLang();
  const Tag = as as 'span';
  return <Tag className={className}>{pick(text, lang)}</Tag>;
};
