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
