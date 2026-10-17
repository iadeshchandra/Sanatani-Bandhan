/**
 * guide/WhatsThis.tsx — "What's this?" term explainer.
 * =====================================================
 * Gentle inline explanations for Sanatani terms. Pattern: a
 * dotted-underline term → tap → a small warm popover with a 1–2 line
 * plain-words explanation. Sacred terms are never translated away —
 * the term itself stays, the meaning unfolds beneath it.
 *
 * Copy lives in i18n under `guide.terms.<term>`.
 */

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export type SanataniTerm =
  | 'gotra'
  | 'tithi'
  | 'dakshina'
  | 'sankalpa'
  | 'pravara'
  | 'nakshatra'
  | 'muhurat'
  | 'seva'
  | 'purohit'
  | 'jyotish'
  | 'chanda'
  | 'prasad';

export const SANATANI_TERMS: SanataniTerm[] = [
  'gotra',
  'tithi',
  'dakshina',
  'sankalpa',
  'pravara',
  'nakshatra',
  'muhurat',
  'seva',
  'purohit',
  'jyotish',
  'chanda',
  'prasad',
];

export interface WhatsThisProps {
  term: SanataniTerm;
  /** Visible label; defaults to the term itself. */
  label?: string;
  className?: string;
  /**
   * Compact mode for dense inline use (e.g. inside small form labels):
   * keeps a 32px target instead of 44px so the line doesn't stretch.
   * Prefer the default full-size target wherever layout allows.
   */
  compact?: boolean;
}

export const WhatsThis: React.FC<WhatsThisProps> = ({ term, label, className = '', compact = false }) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const place = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const popW = Math.min(vw - 32, 300);
    const left = Math.max(16, Math.min(r.left + r.width / 2 - popW / 2, vw - popW - 16));
    const below = r.bottom + 10;
    // Prefer below the term; flip above when there is no room.
    const top = below + 150 < window.innerHeight ? below : Math.max(16, r.top - 160);
    setPos({ left, top });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!btnRef.current?.contains(target) && !popRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const onResize = () => place();
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('resize', onResize);
    };
  }, [open ]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${label || term} — ${t('guide.whatsThis')}`}
        title={t('guide.whatsThis')}
        className={`underline decoration-dotted decoration-amber-600/70 underline-offset-[3px] text-inherit hover:text-amber-800 ${compact ? 'min-h-[32px]' : 'min-h-[44px]'} inline-flex items-center px-0.5 -mx-0.5 rounded ${className}`}
      >
        {label || term}
      </button>
      {open && (
        <div
          ref={popRef}
          role="dialog"
          aria-label={label || term}
          className="fixed z-[220] w-[min(calc(100vw-32px),300px)] bg-[#faf7f2] border border-amber-200/70 rounded-2xl shadow-xl p-4"
          style={pos ? { left: pos.left, top: pos.top } : { left: 16, top: 100 }}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-serif text-[15px] font-bold text-stone-900 capitalize">
              <span aria-hidden>🪔 </span>
              {label || term}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('guide.close')}
              className="w-11 h-11 -m-2 min-w-[44px] min-h-[44px] rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500 shrink-0"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>
          <p className="text-[13px] text-stone-600 leading-relaxed mt-1">{t(`guide.terms.${term}`)}</p>
        </div>
      )}
    </>
  );
};
