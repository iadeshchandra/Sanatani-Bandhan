/**
 * PillarHeader — the section label of the FOUR PILLARS inside
 * Personal (lib/pillars; owner decision 2026-11-24).
 * =====================================================================
 * House visual vocabulary only: the Day Band's small-caps label
 * idiom (text-[10px] uppercase, temple-600) with a hairline gold
 * rule running to the edge — a section divider in the sanctum
 * palette, never a corporate banner. It composes EXISTING remapped
 * token utilities (temple/brass), so it needs no new surface class
 * and no Sandhya registration of its own: at dusk it follows the
 * same token remap as the Day Band labels beside it.
 */
import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { pillarDef, type PillarId } from '../../lib/pillars';

export const PillarHeader: React.FC<{ pillar: PillarId; className?: string }> = ({
  pillar,
  className,
}) => {
  const { t } = useLanguage();
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ''}`} aria-hidden={false}>
      <span
        role="heading"
        aria-level={2}
        className="text-[10px] font-black uppercase tracking-widest text-temple-600 shrink-0"
      >
        {t(pillarDef(pillar).titleKey)}
      </span>
      <span aria-hidden className="h-px flex-1 bg-brass-200/80" />
    </div>
  );
};
