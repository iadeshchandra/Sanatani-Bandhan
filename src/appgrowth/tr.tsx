/**
 * Tr — trilingual text primitive for the App Growth pages.
 * =======================================================
 * Mirrors the established <T> pattern from src/solo/ui.tsx (the same
 * component the Chat + P2P system uses): renders the visitor's language
 * via safeTranslate, with a soft English gloss when the primary text is
 * not English. Warm, never corporate.
 */
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { Tri } from './useAppGrowthConfig';

interface TrProps {
  en: string;
  bn: string;
  hi?: string;
  className?: string;
  /** Render the soft English gloss beside non-English text. Default true. */
  gloss?: boolean;
  /** Render as a block-level element instead of an inline span. */
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3';
}

export const Tr: React.FC<TrProps> = ({
  en,
  bn,
  hi,
  className = '',
  gloss = true,
  as = 'span',
}) => {
  const { safeTranslate, currentLang } = useLanguage();
  const primary = safeTranslate('appgrowth.label', en, bn, hi);
  const showGloss = gloss && currentLang !== 'en' && primary !== en;
  const Tag = as as 'span';
  return (
    <Tag className={className}>
      {primary}
      {showGloss && <span className="opacity-70 font-normal text-[0.85em]"> ({en})</span>}
    </Tag>
  );
};

export default Tr;

/**
 * TriText — render a `Tri` content object ({ en, bn, hi }) through the
 * landing's trilingual primitive. Missing bn/hi fall back to English so a
 * partially-translated admin override never renders a blank string.
 * (Phase 5: landing reads `config.content` from useAppGrowthConfig.)
 */
export const TriText: React.FC<{
  t: Tri;
  gloss?: boolean;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3';
  className?: string;
}> = ({ t, gloss = true, as, className }) => (
  <Tr en={t.en} bn={t.bn} hi={t.hi} gloss={gloss} as={as} className={className} />
);

/**
 * resolveTri — field-wise fallback of an admin override onto the hardcoded
 * copy. A partially-translated override (e.g. English only) keeps the
 * hardcoded bn/hi instead of rendering blank strings.
 */
export function resolveTri(t: Tri, fallback: Tri): Tri {
  return {
    en: t.en || fallback.en,
    bn: t.bn || fallback.bn,
    hi: t.hi || fallback.hi,
  };
}
